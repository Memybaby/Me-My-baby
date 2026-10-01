// Fonction serverless Vercel — suppression DÉFINITIVE du compte de la personne connectée.
//
// Dans l'ordre :
//   1. vérifie la connexion (jeton Supabase) — on ne supprime jamais que SON PROPRE compte ;
//   2. annule immédiatement l'abonnement Stripe (plus aucun paiement) ;
//   3. supprime toutes ses données (enfants, suivis, rendez-vous, documents, journal, albums,
//      Forum, partage partenaire, photos) puis son profil ;
//   4. supprime le compte de connexion lui-même ;
//   5. envoie un courriel de confirmation dans sa langue.
// Avant d'effacer, on garde une fiche ANONYME (table account_deletions : raison du départ, pays,
// langue, durée comme membre — aucun nom ni courriel) pour les statistiques de l'Espace conceptrice.
// Exigé par Apple et Google pour publier l'appli, et par les lois sur la vie privée (Loi 25, RGPD).
//
// Variables Vercel utilisées : SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY.

import { sendViaResend } from "./_lib/resend.js";
import { stripeConfigForEmail } from "./_lib/stripe-mode.js";

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";

// Tables avec une colonne user_id (données de la personne).
const USER_TABLES = [
  "forum_reactions", "forum_reports", "forum_replies", "forum_posts",
  "tracker_entries", "appointments", "documents", "family_tasks", "growth_entries",
  "journal_entries", "journal_albums", "children",
];

const DONE_EMAIL = {
  fr: { cta: "Visiter Me My Baby", subject: "Votre compte Me My Baby a été supprimé", body: (n) => `Bonjour${n ? " " + n : ""},<br><br>Votre compte Me My Baby et toutes les données qui y étaient associées ont été supprimés définitivement, comme demandé. Votre abonnement a été annulé : aucun autre paiement ne sera prélevé.<br><br>Merci d'avoir fait partie de Me My Baby. Si un jour vous souhaitez revenir, vous serez toujours la bienvenue 💛` },
  en: { cta: "Visit Me My Baby", subject: "Your Me My Baby account has been deleted", body: (n) => `Hi${n ? " " + n : ""},<br><br>Your Me My Baby account and all the data linked to it have been permanently deleted, as requested. Your subscription has been cancelled: no further payment will be charged.<br><br>Thank you for being part of Me My Baby. If you ever want to come back, you'll always be welcome 💛` },
  es: { cta: "Visitar Me My Baby", subject: "Tu cuenta de Me My Baby ha sido eliminada", body: (n) => `Hola${n ? " " + n : ""},<br><br>Tu cuenta de Me My Baby y todos los datos asociados han sido eliminados definitivamente, como lo solicitaste. Tu suscripción fue cancelada: no se realizará ningún otro cobro.<br><br>Gracias por haber sido parte de Me My Baby. Si algún día quieres volver, siempre serás bienvenida 💛` },
};

// Raisons proposées dans l'appli -> raison équivalente reconnue par Stripe (cancellation_details).
const REASONS = {
  no_longer_needed: "unused", too_expensive: "too_expensive", missing_features: "missing_features",
  switched_service: "switched_service", too_complex: "too_complex", technical_problems: "low_quality",
  privacy: "other", other: "other",
};

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    res.status(500).json({ error: "Configuration serveur incomplète." });
    return;
  }
  const admin = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    // 1. Qui est connecté ?
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) { res.status(401).json({ error: "Connexion requise." }); return; }
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: key } });
    if (!ures.ok) { res.status(401).json({ error: "Session invalide ou expirée." }); return; }
    const user = await ures.json();
    const uid = user.id;

    const pres = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=*`, { headers: admin });
    const profile = (pres.ok ? (await pres.json().catch(() => []))[0] : null) || {};
    const lang = ["fr", "en", "es"].includes(profile.language) ? profile.language : "fr";
    const reason = Object.prototype.hasOwnProperty.call(REASONS, req.body?.reason) ? req.body.reason : "";
    const comment = String(req.body?.comment || "").trim().slice(0, 500);
    let subStart = null; // début de l'abonnement Stripe le plus ancien (pour la durée comme membre)

    // 2. Annuler l'abonnement Stripe tout de suite (sinon la personne continuerait de payer).
    const stripeKey = stripeConfigForEmail(user.email).secretKey; // clés de test pour les comptes test de la conceptrice
    if (stripeKey && profile.stripe_customer_id) {
      const sres = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(profile.stripe_customer_id)}&status=all&limit=20`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const subs = sres.ok ? (await sres.json()).data || [] : [];
      if (!sres.ok) {
        res.status(502).json({ error: "Impossible de vérifier l'abonnement. Réessayez dans un instant." });
        return;
      }
      for (const sub of subs) {
        if (sub.created && (!subStart || sub.created < subStart)) subStart = sub.created;
        if (["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(sub.status)) {
          // La raison du départ est aussi notée dans Stripe, avec l'abonnement annulé.
          const cd = new URLSearchParams();
          cd.append("cancellation_details[comment]", `Compte supprimé${reason ? ` (${reason})` : ""}${comment ? ` : ${comment}` : ""}`.slice(0, 500));
          if (reason) cd.append("cancellation_details[feedback]", REASONS[reason]);
          const cres = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}?${cd.toString()}`, { method: "DELETE", headers: { Authorization: `Bearer ${stripeKey}` } });
          if (!cres.ok) {
            res.status(502).json({ error: "Impossible d'annuler l'abonnement. Réessayez dans un instant." });
            return;
          }
        }
      }
    }

    // 3. Fiche anonyme du départ (avant d'effacer : on a encore besoin des enfants et du profil).
    try {
      const kres = await fetch(`${SUPABASE_URL}/rest/v1/children?user_id=eq.${uid}&select=birthdate`, { headers: admin });
      const kids = kres.ok ? await kres.json().catch(() => []) : [];
      const now = Date.now();
      let stage = "conception";
      if (profile.due_date && Date.parse(profile.due_date) >= now - 86400000) stage = "grossesse";
      else {
        const ages = (kids || []).map((k) => (now - Date.parse(k.birthdate)) / (365.25 * 86400000)).filter((a) => Number.isFinite(a) && a >= 0);
        if (ages.length) { const y = Math.min(...ages); stage = y < 1 ? "bebe" : y <= 5 ? "enfant" : "conception"; }
      }
      const memberStart = subStart ? subStart * 1000 : (profile.billing_anchor_date ? Date.parse(profile.billing_anchor_date) : null);
      const days = (t) => (t && Number.isFinite(t) ? Math.max(0, Math.round((now - t) / 86400000)) : null);
      await fetch(`${SUPABASE_URL}/rest/v1/account_deletions`, {
        method: "POST", headers: { ...admin, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          reason: reason || null, comment: comment || null, country: profile.country || null, language: lang,
          was_member: !!profile.billing_anchor_date, plan: profile.billing_anchor_date ? (profile.billing_cycle || null) : null,
          member_days: profile.billing_anchor_date || subStart ? days(memberStart) : null,
          account_days: days(user.created_at ? Date.parse(user.created_at) : null), stage,
        }),
      });
    } catch (e) { /* la statistique n'empêche jamais la suppression */ }

    // 4. Supprimer toutes les données.
    const failures = [];
    const del = async (path) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method: "DELETE", headers: { ...admin, Prefer: "return=minimal" } });
      // 404 = la table n'existe pas (encore) : rien à supprimer.
      if (!r.ok && r.status !== 404) failures.push(`${path.split("?")[0]} ${r.status}`);
    };
    await del(`partner_links?owner_user_id=eq.${uid}`);
    await del(`partner_links?partner_user_id=eq.${uid}`);
    for (const table of USER_TABLES) {
      await del(`${table}?${table === "forum_reports" ? "reporter_id" : "user_id"}=eq.${uid}`);
    }

    // Photos (dossier de la personne dans le stockage « photos »).
    try {
      const lres = await fetch(`${SUPABASE_URL}/storage/v1/object/list/photos`, {
        method: "POST", headers: { ...admin, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: uid, limit: 1000, offset: 0 }),
      });
      const files = lres.ok ? await lres.json() : [];
      const names = (files || []).filter((f) => f?.name).map((f) => `${uid}/${f.name}`);
      if (names.length) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/photos`, {
          method: "DELETE", headers: { ...admin, "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: names }),
        });
      }
    } catch (e) { failures.push("photos"); }

    await del(`profiles?id=eq.${uid}`);

    // 5. Supprimer le compte de connexion.
    const ares = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    if (!ares.ok) {
      console.error("[delete-account] suppression du compte de connexion échouée", ares.status, await ares.text().catch(() => ""), failures);
      res.status(500).json({ error: "La suppression n'a pas pu être terminée. Écrivez-nous à Memybaby.app@gmail.com et nous la terminerons pour vous." });
      return;
    }
    if (failures.length) console.error("[delete-account] tables non vidées:", failures);

    // 6. Courriel de confirmation.
    if (user.email) {
      const t = DONE_EMAIL[lang];
      await sendViaResend({
        to: user.email, subject: t.subject,
        html: `<div style="font-family:Georgia,serif;color:#3A3833;max-width:520px;margin:0 auto;line-height:1.6;"><p>${t.body(esc(fullName(profile)))}</p><p style="text-align:center;margin:24px 0;"><a href="https://www.memybabyapp.com" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${t.cta}</a></p><p>— Me My Baby</p></div>`,
      }).catch(() => {});
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur inattendue." });
  }
}

// Nom complet tel qu'écrit dans le profil (prénom + nom, si la personne a mis un nom).
function fullName(p) {
  return `${p?.first_name || ""} ${p?.last_name || ""}`.replace(/\s+/g, " ").trim();
}
