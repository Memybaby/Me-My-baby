// Fonction serverless Vercel — ESPACE CONCEPTRICE (réservé au compte de Marilyne).
//
// Actions (POST, corps JSON { action, ... }) :
//   - "stats"        : toutes les données du tableau de bord (comptes, membres, revenus, utilisation,
//                      codes promo), lues dans Supabase et Stripe ;
//   - "promo-create" : crée un code promo Stripe (rabais en % ou en montant, durée, forfait visé,
//                      nombre d'utilisations, date de fin, nouveaux clients seulement) ;
//   - "promo-toggle" : active ou désactive un code promo existant.
// Les clientes entrent le code sur la page de paiement Stripe (allow_promotion_codes, déjà activé
// dans create-checkout-session.js).
//
// Sécurité : la personne doit être connectée (jeton Supabase vérifié ici) ET son courriel doit être
// dans ADMIN_EMAILS ci-dessous. Toute autre personne reçoit « Accès refusé ». Rien n'est modifié dans
// les comptes des membres : on lit seulement (sauf la création / désactivation de codes promo).
//
// Variables Vercel utilisées : SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY,
// STRIPE_PRICE_ANNUAL.

import { stripeConfig, hasTestMode } from "./_lib/stripe-mode.js";

export const config = { maxDuration: 60 };

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const ADMIN_EMAILS = ["marilynemd@gmail.com"];
// Version de l'API Stripe fixée pour ce fichier : les champs lus ici gardent toujours la même forme,
// même si Stripe change sa version par défaut plus tard.
const STRIPE_VERSION = "2024-06-20";

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders() });
  if (!r.ok) return []; // table ou colonne absente : on continue sans cette donnée
  const j = await r.json().catch(() => []);
  return Array.isArray(j) ? j : [];
}

// Lit une table en entier, 1000 lignes à la fois.
async function sbGetAll(path) {
  const out = [];
  for (let offset = 0; offset < 200000; offset += 1000) {
    const rows = await sbGet(`${path}${path.includes("?") ? "&" : "?"}limit=1000&offset=${offset}`);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function sbTableExists(table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, { headers: sbHeaders() });
  return r.ok;
}

async function sbWrite(method, path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: { ...sbHeaders(), Prefer: "return=representation" }, body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 404 || /does not exist|relation|schema cache/i.test(JSON.stringify(j || ""))) {
      throw new Error(path.startsWith("admin_incidents") ? "Le registre des incidents n'est pas encore créé dans Supabase (fichier utilisation-supabase.sql)." : "La liste des dépenses n'est pas encore créée dans Supabase (fichier depenses-supabase.sql).");
    }
    throw new Error((j && (j.message || j.error)) || `Erreur Supabase ${r.status}`);
  }
  return Array.isArray(j) ? j[0] : j;
}

// ---------- Statistiques d'utilisation ----------
// Résume les événements (page ouverte, outil ouvert…) par élément et par période, en séparant vos
// comptes test. « u » = nombre de personnes différentes (compte, ou appareil si non connectée).
function torontoMonth(iso) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Toronto" }).slice(0, 7);
}
function lastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return new Set(out);
}
function summarizeUsage(rows, accounts) {
  const testIds = new Set(accounts.filter((a) => a.isTest).map((a) => a.id));
  const ranges = { "1": lastMonths(1), "3": lastMonths(3), "12": lastMonths(12), all: null };
  const blank = () => ({ n: 0, nT: 0, u: new Set(), uT: new Set() });
  const items = {};
  const monthly = {};
  const visitors = Object.fromEntries(Object.keys(ranges).map((r) => [r, blank()]));
  for (const e of rows) {
    const who = e.user_id || (e.visitor_id ? "v:" + e.visitor_id : null);
    const test = !!(e.user_id && testIds.has(e.user_id));
    const m = torontoMonth(e.created_at);
    const add = (b) => { if (test) { b.nT++; if (who) b.uT.add(who); } else { b.n++; if (who) b.u.add(who); } };
    const key = `${e.kind}|${e.item}|${e.sub || ""}`;
    const it = (items[key] ||= { kind: e.kind, item: e.item, sub: e.sub || "", r: Object.fromEntries(Object.keys(ranges).map((r) => [r, blank()])), m: {} });
    add((it.m[m] ||= blank())); // détail par mois de cet élément
    for (const [r, set] of Object.entries(ranges)) {
      if (set && !set.has(m)) continue;
      add(it.r[r]);
      add(visitors[r]);
    }
    add(((monthly[m] ||= {})[e.kind] ||= blank()));
    add((monthly[m]._all ||= blank()));
  }
  const out = (b) => ({ n: b.n, nT: b.nT, u: b.u.size, uT: b.uT.size });
  return {
    items: Object.values(items).map((it) => ({ kind: it.kind, item: it.item, sub: it.sub, r: Object.fromEntries(Object.entries(it.r).map(([k, b]) => [k, out(b)])), m: Object.fromEntries(Object.entries(it.m).map(([k, b]) => [k, out(b)])) })),
    monthly: Object.fromEntries(Object.entries(monthly).map(([m, kinds]) => [m, Object.fromEntries(Object.entries(kinds).map(([k, b]) => [k, out(b)]))])),
    visitors: Object.fromEntries(Object.entries(visitors).map(([r, b]) => [r, out(b)])),
  };
}

// ---------- Registre des incidents de confidentialité (Loi 25) ----------
const DAY_RE = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const INCIDENT_TEXT = ["description", "info_involved", "persons_note", "risk_assessment", "measures", "notes"];
function incidentOut(i) {
  return {
    id: i.id, createdAt: i.created_at, occurredFrom: i.occurred_from || "", occurredTo: i.occurred_to || "", discoveredAt: i.discovered_at || "",
    description: i.description || "", infoInvolved: i.info_involved || "", personsCount: i.persons_count ?? "", personsNote: i.persons_note || "",
    riskAssessment: i.risk_assessment || "", seriousRisk: !!i.serious_risk, caiNotifiedAt: i.cai_notified_at || "", personsNotifiedAt: i.persons_notified_at || "",
    publicNotice: !!i.public_notice, measures: i.measures || "", status: i.status || "ouvert", notes: i.notes || "",
  };
}
function cleanIncident(b) {
  const day = (v, label, required) => {
    const x = String(v || "").trim();
    if (!x) { if (required) throw new Error(`Indiquez ${label}.`); return null; }
    if (!DAY_RE.test(x)) throw new Error(`${label.charAt(0).toUpperCase() + label.slice(1)} n'est pas valide.`);
    return x;
  };
  const row = {
    occurred_from: day(b.occurredFrom, "la date de l'incident", true),
    occurred_to: day(b.occurredTo, "la date de fin de l'incident", false),
    discovered_at: day(b.discoveredAt, "la date où vous l'avez appris", true),
    serious_risk: !!b.seriousRisk,
    cai_notified_at: day(b.caiNotifiedAt, "la date d'avis à la Commission", false),
    persons_notified_at: day(b.personsNotifiedAt, "la date d'avis aux personnes", false),
    public_notice: !!b.publicNotice,
    status: b.status === "ferme" ? "ferme" : "ouvert",
  };
  for (const k of INCIDENT_TEXT) {
    const camel = k.replace(/_(\w)/g, (_, c) => c.toUpperCase());
    row[k] = String(b[camel] || "").trim().slice(0, 4000) || null;
  }
  if (!row.description) throw new Error("Décrivez ce qui s'est passé.");
  const n = String(b.personsCount ?? "").trim();
  row.persons_count = n === "" ? null : Math.max(0, Math.min(100000000, parseInt(n, 10) || 0));
  if (row.occurred_to && row.occurred_to < row.occurred_from) throw new Error("La date de fin doit venir après la date de début.");
  return row;
}

// ---------- Dépenses ----------
const EXP_FREQ = ["monthly", "annual", "once"];
const MONTH_RE = /^20\d\d-(0[1-9]|1[0-2])$/;
function expenseOut(e) {
  return {
    id: e.id, name: e.name || "", category: e.category || "", amount: e.amount_cents || 0,
    frequency: e.frequency || "monthly", start: e.start_month || "", end: e.end_month || "", note: e.note || "",
  };
}
function cleanExpense(b) {
  const name = String(b.name || "").trim().slice(0, 80);
  if (!name) throw new Error("Écrivez le nom de la dépense.");
  const amount = Math.round(Number(String(b.amount ?? "").replace(",", ".")) * 100);
  if (!(amount > 0) || amount > 100000000) throw new Error("Écrivez un montant valide (ex. 32 ou 32,50).");
  const frequency = EXP_FREQ.includes(b.frequency) ? b.frequency : "monthly";
  const start = String(b.start || "");
  if (!MONTH_RE.test(start)) throw new Error("Choisissez le mois de la dépense.");
  let end = String(b.end || "");
  if (frequency === "once" || !end) end = null;
  else if (!MONTH_RE.test(end)) throw new Error("Le dernier mois n'est pas valide.");
  else if (end < start) throw new Error("Le dernier mois doit venir après le premier mois.");
  return {
    name, category: String(b.category || "").trim().slice(0, 60) || null, amount_cents: amount, currency: "cad",
    frequency, start_month: start, end_month: end, note: String(b.note || "").trim().slice(0, 300) || null,
  };
}

async function getAuthUsers() {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: sbHeaders() });
    if (!r.ok) break;
    const j = await r.json().catch(() => ({}));
    const users = j.users || [];
    out.push(...users);
    if (users.length < 1000) break;
  }
  return out;
}

function stripeHeaders(cfg) {
  return {
    Authorization: `Bearer ${cfg.secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Stripe-Version": STRIPE_VERSION,
  };
}

// cfg = clés Stripe à utiliser (vrais paiements ou paiements test), voir _lib/stripe-mode.js.
async function stripe(cfg, path, params, method = "GET") {
  const qs = params ? new URLSearchParams(params).toString() : "";
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && qs ? `?${qs}` : ""}`;
  const r = await fetch(url, { method, headers: stripeHeaders(cfg), body: method === "GET" ? undefined : qs });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Stripe ${r.status}`);
  return j;
}

// Liste Stripe complète (pages de 100).
async function stripeAll(cfg, path, params = []) {
  const out = [];
  let after = null;
  for (let i = 0; i < 60; i++) {
    const p = [...params, ["limit", "100"]];
    if (after) p.push(["starting_after", after]);
    const j = await stripe(cfg, path, p);
    out.push(...(j.data || []));
    if (!j.has_more || !j.data?.length) break;
    after = j.data[j.data.length - 1].id;
  }
  return out;
}

const iso = (unix) => (unix ? new Date(unix * 1000).toISOString() : null);

// Étape de vie du compte (même logique que le courriel hebdomadaire).
function stageOf(profile, kids) {
  const now = Date.now();
  if (profile.due_date && Date.parse(profile.due_date) >= now - 86400000) return "grossesse";
  const ages = kids.map((k) => (now - Date.parse(k.birthdate)) / (365.25 * 86400000)).filter((a) => Number.isFinite(a) && a >= 0);
  if (ages.length) {
    const youngest = Math.min(...ages);
    if (youngest < 1) return "bebe";
    if (youngest <= 5) return "enfant";
  }
  return "conception";
}

function isTestEmail(email) {
  const e = (email || "").toLowerCase();
  const local = e.split("@")[0];
  // Comptes test : le compte de la conceptrice, ses adresses marilynemd+…@gmail.com, et toute adresse contenant « test ».
  return ADMIN_EMAILS.includes(e) || local.startsWith("marilynemd+") || local.includes("test");
}

async function buildStats(cfg) {
  // Tout depuis le lancement de l'appli (1er septembre 2026), pour pouvoir faire les rapports de chaque année.
  const since = Math.floor(Date.UTC(2026, 8, 1) / 1000);
  const hasStripe = !!cfg.secretKey;

  const [authUsers, profiles, kids, menus, posts, replies, partners, deletions, expenses, usageRaw, incidents] = await Promise.all([
    getAuthUsers(),
    sbGetAll("profiles?select=*"),
    sbGetAll("children?select=user_id,birthdate"),
    sbGetAll("tracker_entries?type=eq.lea_menu&select=user_id,created_at"),
    sbGetAll("forum_posts?select=user_id,created_at"),
    sbGetAll("forum_replies?select=user_id,created_at"),
    sbGetAll("partner_links?select=*"),
    sbGetAll("account_deletions?select=*&order=deleted_at.desc"),
    sbGetAll("admin_expenses?select=*&order=start_month.asc,name.asc"),
    sbGetAll("usage_events?select=user_id,visitor_id,kind,item,sub,created_at&created_at=gte.2026-09-01T00:00:00Z&order=id.asc"),
    sbGetAll("admin_incidents?select=*&order=discovered_at.desc,id.desc"),
  ]);
  const expensesReady = await sbTableExists("admin_expenses");

  const kidsByUser = {};
  for (const k of kids) (kidsByUser[k.user_id] ||= []).push(k);
  const authById = Object.fromEntries(authUsers.map((u) => [u.id, u]));
  const profileByCustomer = {};

  const accounts = profiles.map((p) => {
    const au = authById[p.id] || {};
    if (p.stripe_customer_id) profileByCustomer[p.stripe_customer_id] = p;
    const email = p.email || au.email || "";
    return {
      id: p.id,
      email,
      name: [p.first_name, p.last_name].filter(Boolean).join(" "),
      country: p.country || "",
      language: p.language || "fr",
      createdAt: au.created_at || p.created_at || null,
      lastSignIn: au.last_sign_in_at || null,
      newsletter: p.newsletter !== false,
      member: !!p.billing_anchor_date,
      memberSince: p.billing_anchor_date || null,
      plan: p.billing_cycle || "",
      status: p.subscription_status || "",
      accessUntil: p.subscription_access_until || null,
      customer: p.stripe_customer_id || null,
      stage: stageOf(p, kidsByUser[p.id] || []),
      kids: (kidsByUser[p.id] || []).length,
      isTest: isTestEmail(email),
    };
  });
  // Comptes de connexion sans profil (inscription commencée mais pas terminée).
  for (const au of authUsers) {
    if (!profiles.some((p) => p.id === au.id)) {
      accounts.push({ id: au.id, email: au.email || "", name: "", country: "", language: au.user_metadata?.lang || "", createdAt: au.created_at, lastSignIn: au.last_sign_in_at, newsletter: false, member: false, memberSince: null, plan: "", status: "", accessUntil: null, customer: null, stage: "", kids: 0, isTest: isTestEmail(au.email), noProfile: true });
    }
  }

  let subs = [], invoices = [], balance = [], promos = [], stripeError = null;
  if (hasStripe) {
    try {
      const [rawSubs, rawInvoices, rawBalance, rawPromos] = await Promise.all([
        stripeAll(cfg, "subscriptions", [["status", "all"]]),
        stripeAll(cfg, "invoices", [["created[gte]", String(since)], ["expand[]", "data.discounts"]]),
        stripeAll(cfg, "balance_transactions", [["created[gte]", String(since)]]),
        stripeAll(cfg, "promotion_codes", []),
      ]);
      const priceMonthly = cfg.priceMonthly;
      const priceAnnual = cfg.priceAnnual;
      const userOfCustomer = (c) => profileByCustomer[c]?.id || null;

      subs = rawSubs.map((s) => {
        const price = s.items?.data?.[0]?.price || {};
        const plan = price.id === priceAnnual || price.recurring?.interval === "year" ? "annual" : price.id === priceMonthly || price.recurring?.interval === "month" ? "monthly" : "";
        return {
          id: s.id, customer: s.customer, userId: s.metadata?.supabase_user_id || userOfCustomer(s.customer),
          status: s.status, plan, currency: s.currency,
          created: iso(s.created), trialEnd: iso(s.trial_end), canceledAt: iso(s.canceled_at), endedAt: iso(s.ended_at),
          cancelAtPeriodEnd: !!s.cancel_at_period_end, currentPeriodEnd: iso(s.current_period_end),
          // Raison du désabonnement : demandée par Stripe dans le portail client (voir le guide),
          // ou envoyée par l'appli quand la personne supprime son compte.
          cancelReason: s.cancellation_details?.reason || "", cancelFeedback: s.cancellation_details?.feedback || "",
          cancelComment: s.cancellation_details?.comment || "",
        };
      });
      const planOfSub = Object.fromEntries(subs.map((s) => [s.id, s.plan]));
      const promoById = Object.fromEntries(rawPromos.map((p) => [p.id, p.code]));

      invoices = rawInvoices.filter((i) => i.status !== "draft").map((i) => {
        const failed = (["open", "uncollectible"].includes(i.status) && i.attempted && i.amount_due > 0) || (i.status === "paid" && (i.attempt_count || 0) > 1);
        const disc = (i.discounts || []).find((d) => d && typeof d === "object");
        const code = disc?.promotion_code ? promoById[typeof disc.promotion_code === "string" ? disc.promotion_code : disc.promotion_code.id] || "" : "";
        const discountAmount = (i.total_discount_amounts || []).reduce((a, d) => a + (d.amount || 0), 0);
        const p = profileByCustomer[i.customer];
        return {
          id: i.id, customer: i.customer, userId: userOfCustomer(i.customer), subscription: i.subscription || null,
          plan: planOfSub[i.subscription] || "", status: i.status, currency: i.currency,
          created: iso(i.created), paidAt: iso(i.status_transitions?.paid_at),
          amountPaid: i.amount_paid || 0, amountDue: i.amount_due || 0,
          excludingTax: i.total_excluding_tax ?? i.subtotal ?? i.amount_paid ?? 0, tax: i.tax || 0,
          discount: discountAmount, code, failed, reason: i.billing_reason || "",
          country: p?.country || i.customer_address?.country || "",
          language: p?.language || "",
        };
      });

      balance = rawBalance.filter((b) => b.type !== "payout").map((b) => ({
        type: b.type, category: b.reporting_category || "", amount: b.amount, fee: b.fee, net: b.net, currency: b.currency, created: iso(b.created),
      }));

      promos = rawPromos.map((p) => ({
        id: p.id, code: p.code, active: p.active, created: iso(p.created), timesRedeemed: p.times_redeemed || 0,
        maxRedemptions: p.max_redemptions || null, expiresAt: iso(p.expires_at),
        firstTimeOnly: !!p.restrictions?.first_time_transaction,
        coupon: {
          id: p.coupon?.id, name: p.coupon?.name || "", percentOff: p.coupon?.percent_off || null,
          amountOff: p.coupon?.amount_off || null, currency: p.coupon?.currency || null,
          duration: p.coupon?.metadata?.display_duration === "once" ? "once" : p.coupon?.duration, months: p.coupon?.duration_in_months || null,
          appliesTo: p.coupon?.applies_to?.products || [], valid: p.coupon?.valid !== false,
        },
      }));
    } catch (e) {
      stripeError = e.message;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    stripeMode: cfg.mode,
    // Les deux modes existent (vrais paiements + paiements test) : la page peut passer de l'un à l'autre.
    canSwitchMode: hasTestMode() && stripeConfig("live").mode === "live",
    stripeError,
    products: await planProducts(cfg).catch(() => ({})),
    accounts,
    subs,
    invoices,
    balance,
    promos,
    // Comptes supprimés : fiches ANONYMES (aucun nom ni courriel), gardées pour les statistiques.
    deletions: deletions.map((d) => ({
      at: d.deleted_at, reason: d.reason || "", comment: d.comment || "", country: d.country || "", language: d.language || "",
      wasMember: !!d.was_member, plan: d.plan || "", memberDays: d.member_days ?? null, accountDays: d.account_days ?? null, stage: d.stage || "",
    })),
    // Dépenses de l'entreprise (inscrites à la main dans la page conceptrice), en $ CA.
    expensesReady,
    expenses: expenses.map(expenseOut),
    usageReady: await sbTableExists("usage_events"),
    // Registre des incidents de confidentialité (Loi 25).
    incidentsReady: await sbTableExists("admin_incidents"),
    incidents: incidents.map(incidentOut),
    usageStats: summarizeUsage(usageRaw, accounts),
    usage: {
      menus: menus.map((m) => ({ userId: m.user_id, at: m.created_at })),
      posts: posts.map((m) => ({ userId: m.user_id, at: m.created_at })),
      replies: replies.map((m) => ({ userId: m.user_id, at: m.created_at })),
      // Partages partenaire : chaque invitation, acceptée ou pas encore utilisée.
      partners: partners.map((l) => ({ owner: l.owner_user_id, partner: l.partner_user_id || null, accepted: l.status === "accepted" && !!l.partner_user_id, at: l.created_at })),
    },
  };
}

// Produits Stripe des deux forfaits (pour limiter un code à l'annuel ou au mensuel).
async function planProducts(cfg) {
  const [m, a] = await Promise.all([
    stripe(cfg, `prices/${cfg.priceMonthly}`),
    stripe(cfg, `prices/${cfg.priceAnnual}`),
  ]);
  return { monthly: m.product, annual: a.product, same: m.product === a.product };
}

function describeCoupon({ kind, value, currency, duration, months }) {
  const amount = kind === "percent" ? `${value} %` : `${value} ${currency.toUpperCase()}`;
  if (duration === "once") return `${amount} de rabais (1er paiement)`;
  if (duration === "forever") return `${amount} de rabais (toujours)`;
  return `${amount} de rabais pendant ${months} mois`;
}

async function createPromo(body, cfg) {
  const code = String(body.code || "").trim().toUpperCase();
  const kind = body.kind === "amount" ? "amount" : "percent";
  const value = Number(body.value);
  const currency = ["cad", "usd", "eur"].includes(String(body.currency || "").toLowerCase()) ? String(body.currency).toLowerCase() : "cad";
  const duration = ["once", "repeating", "forever"].includes(body.duration) ? body.duration : "once";
  const months = Math.round(Number(body.months) || 0);
  const appliesTo = ["both", "monthly", "annual"].includes(body.appliesTo) ? body.appliesTo : "both";
  const maxRedemptions = body.maxRedemptions ? Math.round(Number(body.maxRedemptions)) : null;
  const expiresAt = body.expiresAt ? Date.parse(`${body.expiresAt}T23:59:59-04:00`) : null;

  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new Error("Le code doit avoir de 3 à 30 caractères : lettres, chiffres, - ou _ (sans espace ni accent).");
  if (kind === "percent" && !(value > 0 && value <= 100)) throw new Error("Le pourcentage doit être entre 1 et 100.");
  if (kind === "amount" && !(value > 0 && value <= 1000)) throw new Error("Le montant doit être plus grand que 0.");
  if (duration === "repeating" && !(months >= 1 && months <= 36)) throw new Error("Choisissez un nombre de mois entre 1 et 36.");
  if (maxRedemptions !== null && !(maxRedemptions >= 1 && maxRedemptions <= 100000)) throw new Error("Le nombre d'utilisations doit être d'au moins 1.");
  if (expiresAt !== null && !(Number.isFinite(expiresAt) && expiresAt > Date.now())) throw new Error("La date de fin doit être dans le futur.");

  const cp = [
    ["name", String(body.name || describeCoupon({ kind, value, currency, duration, months })).slice(0, 40)],
    // Avec l'essai gratuit de 5 jours, un rabais « once » de Stripe se ferait « utiliser » sur la
    // facture d'essai à 0 $. On crée donc « une fois » comme « pendant 1 mois » : le rabais tombe
    // alors sur le premier VRAI paiement (mensuel ou annuel), et seulement celui-là.
    ["duration", duration === "once" ? "repeating" : duration],
    ["metadata[display_duration]", duration],
    ["metadata[created_from]", "espace-conceptrice"],
    ["metadata[applies_to_plan]", appliesTo],
  ];
  if (kind === "percent") cp.push(["percent_off", String(value)]);
  else { cp.push(["amount_off", String(Math.round(value * 100))]); cp.push(["currency", currency]); }
  if (duration === "repeating") cp.push(["duration_in_months", String(months)]);
  if (duration === "once") cp.push(["duration_in_months", "1"]);
  if (appliesTo !== "both") {
    const prods = await planProducts(cfg);
    if (prods.same) throw new Error("Vos prix mensuel et annuel sont dans le même produit Stripe : impossible de limiter ce code à un seul forfait. Choisissez « Les deux forfaits ».");
    cp.push(["applies_to[products][0]", appliesTo === "annual" ? prods.annual : prods.monthly]);
  }
  const coupon = await stripe(cfg, "coupons", cp, "POST");

  const pp = [["coupon", coupon.id], ["code", code], ["metadata[applies_to_plan]", appliesTo]];
  if (maxRedemptions) pp.push(["max_redemptions", String(maxRedemptions)]);
  if (expiresAt) pp.push(["expires_at", String(Math.floor(expiresAt / 1000))]);
  if (body.firstTimeOnly) pp.push(["restrictions[first_time_transaction]", "true"]);
  try {
    const promo = await stripe(cfg, "promotion_codes", pp, "POST");
    return { ok: true, id: promo.id, code: promo.code };
  } catch (e) {
    // Le code n'a pas pu être créé (ex. code déjà utilisé) : on retire le rabais créé pour rien.
    await stripe(cfg, `coupons/${coupon.id}`, null, "DELETE").catch(() => {});
    if (/already exists|exists/i.test(e.message)) throw new Error("Ce code existe déjà. Choisissez un autre nom de code.");
    throw e;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    res.status(500).json({ error: "Configuration serveur incomplète." });
    return;
  }
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) { res.status(401).json({ error: "Connexion requise." }); return; }
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: key } });
    if (!ures.ok) { res.status(401).json({ error: "Session invalide ou expirée." }); return; }
    const user = await ures.json();
    if (!ADMIN_EMAILS.includes((user.email || "").trim().toLowerCase())) {
      res.status(403).json({ error: "Accès refusé." });
      return;
    }

    const body = req.body || {};
    // « mode » choisi dans la page : vrais paiements (par défaut) ou paiements test.
    const cfg = stripeConfig(body.mode === "test" ? "test" : "live");
    if (body.action === "stats") {
      res.status(200).json(await buildStats(cfg));
      return;
    }
    if (body.action === "expense-save") {
      const row = cleanExpense(body);
      const id = body.id ? Number(body.id) : null;
      if (body.id && !(Number.isInteger(id) && id > 0)) { res.status(400).json({ error: "Dépense introuvable." }); return; }
      const saved = id ? await sbWrite("PATCH", `admin_expenses?id=eq.${id}`, row) : await sbWrite("POST", "admin_expenses", row);
      res.status(200).json({ ok: true, expense: saved ? expenseOut(saved) : null });
      return;
    }
    if (body.action === "incident-save") {
      const row = cleanIncident(body);
      const id = body.id ? Number(body.id) : null;
      if (body.id && !(Number.isInteger(id) && id > 0)) { res.status(400).json({ error: "Incident introuvable." }); return; }
      const saved = id ? await sbWrite("PATCH", `admin_incidents?id=eq.${id}`, row) : await sbWrite("POST", "admin_incidents", row);
      res.status(200).json({ ok: true, incident: saved ? incidentOut(saved) : null });
      return;
    }
    if (body.action === "incident-delete") {
      const id = Number(body.id);
      if (!(Number.isInteger(id) && id > 0)) { res.status(400).json({ error: "Incident introuvable." }); return; }
      await sbWrite("DELETE", `admin_incidents?id=eq.${id}`);
      res.status(200).json({ ok: true });
      return;
    }
    if (body.action === "expense-delete") {
      const id = Number(body.id);
      if (!(Number.isInteger(id) && id > 0)) { res.status(400).json({ error: "Dépense introuvable." }); return; }
      await sbWrite("DELETE", `admin_expenses?id=eq.${id}`);
      res.status(200).json({ ok: true });
      return;
    }
    if (!cfg.secretKey) {
      res.status(500).json({ error: "Stripe n'est pas configuré." });
      return;
    }
    if (body.action === "promo-create") {
      res.status(200).json(await createPromo(body, cfg));
      return;
    }
    if (body.action === "promo-toggle") {
      if (!/^promo_[A-Za-z0-9]+$/.test(String(body.id || ""))) { res.status(400).json({ error: "Code invalide." }); return; }
      await stripe(cfg, `promotion_codes/${body.id}`, [["active", body.active ? "true" : "false"]], "POST");
      res.status(200).json({ ok: true });
      return;
    }
    res.status(400).json({ error: "Action inconnue." });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur inattendue." });
  }
}
