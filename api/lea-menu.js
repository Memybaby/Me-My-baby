// Fonction serverless Vercel — prépare le menu de Léa EN ARRIÈRE-PLAN puis l'envoie par courriel.
//
// Avant, l'appli préparait elle-même les 7 journées (une minute ou deux) et la personne devait
// garder la page ouverte. Maintenant :
//   1. l'appli envoie la demande ici ;
//   2. on répond tout de suite « c'est parti » (en 1 à 2 secondes) ;
//   3. le serveur continue seul : il prépare les 7 journées, puis envoie le courriel.
// La personne peut fermer l'appli, le menu arrive quand même.
//
// Sécurité : personne connectée obligatoire (jeton Supabase vérifié) ; le courriel part TOUJOURS
// à l'adresse du compte connecté (jamais à une adresse envoyée par le navigateur) ; une demande
// par semaine, vérifiée ici côté serveur.
//
// Variables Vercel utilisées : ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { waitUntil } from "@vercel/functions";
import { sendViaResend } from "./_lib/resend.js";
import { buildDayEmail, formatNextRequest } from "./_lib/menu-email.js";

export const config = { maxDuration: 300 };

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const MODEL = "claude-sonnet-4-6";
const WEEK_MS = 7 * 86400000;
// Compte principal de Marilyne (administratrice) : pas de limite d'une demande par semaine, pour pouvoir tester. Les comptes +test sont limités comme tout le monde.
const isTesterEmail = (email) => (email || "").trim().toLowerCase() === "marilynemd@gmail.com";

async function getUser(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !key) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: key } });
  if (!r.ok) return null;
  return r.json();
}

async function profileRequest(path, init = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

async function setLastRequest(userId, value) {
  await profileRequest(`profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_menu_request_at: value }),
  }).catch(() => {});
}

// Une journée = une demande à l'intelligence artificielle ; jusqu'à 3 essais.
async function generateDay({ system, prompt, maxTokens }) {
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data) throw new Error(`${r.status} ${data?.error?.message || ""}`.trim());
      const rawText = (data.content || []).map((b) => b.text || "").join("\n").trim();
      const m = rawText.match(/\{[\s\S]*\}/);
      const dayData = JSON.parse(m ? m[0] : rawText);
      if (!Array.isArray(dayData?.meals)) throw new Error("menu incomplet");
      return { dayData, rawText };
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 3000 * (attempt + 1)));
    }
  }
  console.error("[lea-menu] journée échouée:", lastErr?.message);
  return { dayData: null, rawText: "" };
}

// Un sujet de conseil DIFFÉRENT pour chaque jour — sinon Léa revenait presque toujours au
// « grand verre d'eau ». Seulement 2 conseils sont gardés dans le courriel et dans l'appli.
const TIP_THEMES = {
  fr: ["Si tu donnes un conseil dans \"tips\", il doit porter sur la préparation des repas à l'avance (jamais sur l'eau ou l'hydratation).", "Si tu donnes un conseil dans \"tips\", il doit porter sur les fibres et la satiété (jamais sur l'eau ou l'hydratation).", "Si tu donnes un conseil dans \"tips\", il doit porter sur les protéines (jamais sur l'eau ou l'hydratation).", "Si tu donnes un conseil dans \"tips\", il doit porter sur les collations intelligentes (jamais sur l'eau ou l'hydratation).", "Si tu donnes un conseil dans \"tips\", il doit porter sur l'épicerie et les économies (jamais sur l'eau ou l'hydratation).", "Si tu donnes un conseil dans \"tips\", il doit porter sur les restes et le zéro gaspillage (jamais sur l'eau ou l'hydratation).", "Si tu donnes un conseil dans \"tips\", il doit porter sur manger en pleine conscience (jamais sur l'eau ou l'hydratation)."],
  en: ["If you give a tip in \"tips\", it must be about meal prep ahead of time (never about water or hydration).", "If you give a tip in \"tips\", it must be about fibre and fullness (never about water or hydration).", "If you give a tip in \"tips\", it must be about protein (never about water or hydration).", "If you give a tip in \"tips\", it must be about smart snacks (never about water or hydration).", "If you give a tip in \"tips\", it must be about grocery shopping and saving money (never about water or hydration).", "If you give a tip in \"tips\", it must be about leftovers and zero waste (never about water or hydration).", "If you give a tip in \"tips\", it must be about mindful eating (never about water or hydration)."],
  es: ["Si das un consejo en \"tips\", debe tratar sobre preparar comidas con anticipación (nunca sobre el agua o la hidratación).", "Si das un consejo en \"tips\", debe tratar sobre la fibra y la saciedad (nunca sobre el agua o la hidratación).", "Si das un consejo en \"tips\", debe tratar sobre las proteínas (nunca sobre el agua o la hidratación).", "Si das un consejo en \"tips\", debe tratar sobre meriendas inteligentes (nunca sobre el agua o la hidratación).", "Si das un consejo en \"tips\", debe tratar sobre las compras y el ahorro (nunca sobre el agua o la hidratación).", "Si das un consejo en \"tips\", debe tratar sobre las sobras y el cero desperdicio (nunca sobre el agua o la hidratación).", "Si das un consejo en \"tips\", debe tratar sobre comer con atención plena (nunca sobre el agua o la hidratación)."],
};

// Enregistre le menu (table tracker_entries, type « lea_menu ») pour que les courriels des
// jours 2 à 7 puissent partir chaque matin. « sent » = journées déjà envoyées. On garde les 4
// derniers menus seulement.
async function saveMenu(userId, menuData, lang, requestedAt) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries`, {
      method: "POST", headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, type: "lea_menu", label: "menu", detail: JSON.stringify({ lang, requestedAt, sent: [0], ...menuData }) }),
    });
    if (!r.ok) { console.error("[lea-menu] menu non enregistré:", r.status, await r.text().catch(() => "")); return false; }
    const lr = await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries?user_id=eq.${userId}&type=eq.lea_menu&select=id&order=created_at.desc&offset=4`, { headers });
    const old = lr.ok ? await lr.json() : [];
    if (Array.isArray(old) && old.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries?id=in.(${old.map((o) => o.id).join(",")})`, { method: "DELETE", headers });
    }
    return true;
  } catch (e) {
    console.error("[lea-menu] menu non enregistré:", e.message);
    return false;
  }
}

const FAIL_EMAIL = {
  fr: { subject: "Votre menu Léa n'a pas pu être préparé", body: "Désolée, Léa n'a pas réussi à préparer votre menu cette fois-ci. Vous pouvez refaire la demande dès maintenant dans l'application, à la page Léa." },
  en: { subject: "Your Léa menu couldn't be prepared", body: "Sorry, Léa wasn't able to prepare your menu this time. You can request it again right now in the app, on the Léa page." },
  es: { subject: "Tu menú de Léa no se pudo preparar", body: "Lo sentimos, Léa no pudo preparar tu menú esta vez. Puedes volver a pedirlo ahora mismo en la aplicación, en la página de Léa." },
};

async function prepareAndSend({ email, userId, previousRequest, requestedAt, lang, system, dayPrompts, dayLabels, maxTokens }) {
  // 4 journées à la fois : le menu complet est prêt en 1 à 3 minutes, sans trop de demandes simultanées.
  const results = new Array(dayPrompts.length);
  let next = 0;
  const worker = async () => {
    while (next < dayPrompts.length) {
      const i = next++;
      results[i] = await generateDay({ system, prompt: `${dayPrompts[i]}\n\n${TIP_THEMES[lang][i % TIP_THEMES[lang].length]}`, maxTokens });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  const okCount = results.filter((r) => r.dayData).length;
  if (okCount === 0) {
    // Rien n'a fonctionné : on n'utilise pas la demande de la semaine et on prévient la personne.
    await setLastRequest(userId, previousRequest || null);
    const t = FAIL_EMAIL[lang] || FAIL_EMAIL.fr;
    await sendViaResend({ to: email, subject: t.subject, html: `<div style="font-family:Georgia,serif;color:#3A3833;max-width:520px;margin:0 auto;line-height:1.6;"><p>${t.body}</p><p style="text-align:center;margin:22px 0;"><a href="https://www.memybabyapp.com" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">Me My Baby</a></p></div>` }).catch(() => {});
    return;
  }

  const allTips = [];
  const cleanStep = (st) => String(st || "").replace(/^\s*\d+\s*[.)]\s*/, "");
  const days = results.map((r, i) => {
    if (r.dayData) {
      if (Array.isArray(r.dayData.tips)) allTips.push(...r.dayData.tips.filter(Boolean).map(String));
      const meals = (r.dayData.meals || []).map((m) => ({ ...m, steps: (m.steps || []).map(cleanStep) }));
      return { date: r.dayData.date || dayLabels[i], meals };
    }
    return { date: dayLabels[i], meals: [] };
  });
  // 2 conseils seulement, sans doublon (on compare les 25 premiers caractères).
  const tips = [];
  for (const t of allTips) {
    const k = t.toLowerCase().slice(0, 25);
    if (!tips.some((x) => x.toLowerCase().slice(0, 25) === k)) tips.push(t);
    if (tips.length === 2) break;
  }
  const menuData = { tips, days };
  // Enregistré AVANT d'envoyer le jour 1, pour que les jours 2 à 7 suivent chaque matin.
  await saveMenu(userId, menuData, lang, requestedAt);
  const { subject, html } = buildDayEmail(menuData, 0, lang, formatNextRequest(requestedAt, lang));
  await sendViaResend({ to: email, subject, html });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Configuration serveur incomplète." });
    return;
  }

  try {
    const user = await getUser(req);
    if (!user?.id || !user?.email) {
      res.status(401).json({ error: "Connexion requise." });
      return;
    }

    const { lang: rawLang, system, dayPrompts, dayLabels, maxTokens } = req.body || {};
    const lang = ["fr", "en", "es"].includes(rawLang) ? rawLang : "fr";
    const okStrings = (arr, max) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 7 && arr.every((x) => typeof x === "string" && x.length <= max);
    if (typeof system !== "string" || system.length > 12000 || !okStrings(dayPrompts, 6000) || !okStrings(dayLabels, 120) || dayLabels.length !== dayPrompts.length) {
      res.status(400).json({ error: "Demande invalide." });
      return;
    }

    // Une demande par semaine, vérifiée ici (et pas seulement dans l'appli).
    const pr = await profileRequest(`profiles?id=eq.${user.id}&select=last_menu_request_at`);
    const rows = pr.ok ? await pr.json().catch(() => []) : [];
    const previousRequest = rows?.[0]?.last_menu_request_at || null;
    if (previousRequest && !isTesterEmail(user.email)) {
      const nextAllowed = new Date(new Date(previousRequest).getTime() + WEEK_MS);
      if (nextAllowed > new Date()) {
        res.status(429).json({ error: "weekly_limit", nextAllowed: nextAllowed.toISOString() });
        return;
      }
    }

    const now = new Date().toISOString();
    await setLastRequest(user.id, now);

    // On répond TOUT DE SUITE, puis on continue le travail en arrière-plan.
    waitUntil(
      prepareAndSend({
        email: user.email, userId: user.id, previousRequest, requestedAt: now, lang, system, dayPrompts, dayLabels,
        maxTokens: Math.min(Number(maxTokens) || 3000, 4500),
      }).catch((e) => console.error("[lea-menu] erreur:", e))
    );
    res.status(202).json({ ok: true, requestedAt: now });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur inattendue." });
  }
}
