// Fonction serverless Vercel — tâche planifiée (cron) qui envoie un rappel de paiement aux
// abonnées ANNUELLES dont le renouvellement approche (5 jours avant la date).
//
// Se déclenche automatiquement une fois par jour grâce à la configuration dans vercel.json — pas
// besoin d'y toucher au quotidien. Peut aussi être testée manuellement en visitant
// "https://tonsite.vercel.app/api/payment-reminders?secret=TON_CRON_SECRET" dans un navigateur.
//
// Mise en place requise sur Vercel (une seule fois), EN PLUS de RESEND_API_KEY (voir send-email.js) :
//   1. Sur supabase.com → le projet → Settings → API, copier la clé "service_role" tout en bas
//      (secrète — différente de la clé publique "anon" déjà utilisée ailleurs dans l'app; ne
//      JAMAIS mettre cette clé côté front-end)
//   2. Sur vercel.com → le projet → Settings → Environment Variables, ajouter
//      SUPABASE_SERVICE_ROLE_KEY avec cette valeur
//   3. Toujours dans Environment Variables, ajouter CRON_SECRET avec une valeur choisie au hasard
//      (par exemple générée sur https://generate-secret.vercel.app/32) — ça empêche n'importe qui
//      d'appeler cette fonction et de déclencher l'envoi de courriels
//   4. Redéployer le projet — Vercel active alors automatiquement le cron défini dans vercel.json

import { sendViaResend } from "./_lib/resend.js";

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const REMINDER_DAYS_BEFORE = 5;

function addOneYear(date) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

// Même logique que nextBillingDateFrom() côté front-end (App.jsx) — recalculée ici car les
// fonctions serverless n'ont pas accès au code du front-end.
function nextAnnualBillingDate(anchorDateStr) {
  if (!anchorDateStr) return null;
  let d = new Date(anchorDateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(new Date().toDateString());
  while (d < today) d = addOneYear(d);
  return d;
}

const REMINDER_EMAIL = {
  fr: (name, date, price) => ({
    subject: "Votre abonnement annuel Me My Baby se renouvelle bientôt",
    html: `<div style="font-family:Georgia,serif;color:#2F4858;max-width:480px;margin:0 auto;line-height:1.6;">
      <h2 style="color:#2F4858;">Bonjour${name ? " " + name : ""},</h2>
      <p>Un petit rappel : votre abonnement annuel <strong>Me My Baby</strong> sera renouvelé automatiquement le <strong>${date}</strong>, au montant de <strong>${price}</strong>.</p>
      <p>Aucune action n'est requise si vous souhaitez continuer — le même mode de paiement sera utilisé automatiquement.</p>
      <p>Si vous souhaitez annuler ou modifier votre abonnement, vous pouvez le faire à tout moment depuis la section « Mon abonnement » de l'application, avant la date de renouvellement.</p>
      <p style="margin-top:24px;">— L'équipe Me My Baby</p>
    </div>`,
  }),
  es: (name, date, price) => ({
    subject: "Tu suscripción anual de Me My Baby se renovará pronto",
    html: `<div style="font-family:Georgia,serif;color:#2F4858;max-width:480px;margin:0 auto;line-height:1.6;">
      <h2 style="color:#2F4858;">Hola${name ? " " + name : ""},</h2>
      <p>Un pequeño recordatorio: tu suscripción anual de <strong>Me My Baby</strong> se renovará automáticamente el <strong>${date}</strong>, por un monto de <strong>${price}</strong>.</p>
      <p>No se requiere ninguna acción si deseas continuar — se usará automáticamente el mismo método de pago.</p>
      <p>Si deseas cancelar o modificar tu suscripción, puedes hacerlo en cualquier momento desde la sección « Mi suscripción » de la aplicación, antes de la fecha de renovación.</p>
      <p style="margin-top:24px;">— El equipo de Me My Baby</p>
    </div>`,
  }),
  en: (name, date, price) => ({
    subject: "Your Me My Baby annual subscription renews soon",
    html: `<div style="font-family:Georgia,serif;color:#2F4858;max-width:480px;margin:0 auto;line-height:1.6;">
      <h2 style="color:#2F4858;">Hi${name ? " " + name : ""},</h2>
      <p>Just a heads up: your <strong>Me My Baby</strong> annual subscription will automatically renew on <strong>${date}</strong>, for <strong>${price}</strong>.</p>
      <p>No action is needed if you'd like to continue — the same payment method will be used automatically.</p>
      <p>If you'd like to cancel or change your subscription, you can do so anytime from the "My subscription" section of the app, before the renewal date.</p>
      <p style="margin-top:24px;">— The Me My Baby team</p>
    </div>`,
  }),
};

export default async function handler(req, res) {
  // Vercel ajoute automatiquement l'en-tête Authorization avec CRON_SECRET lors de ses propres
  // appels planifiés. Le paramètre ?secret= permet de tester manuellement depuis un navigateur,
  // où on ne peut pas ajouter d'en-tête personnalisé facilement.
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const queryToken = req.query?.secret;
  const authorized = !!expectedSecret && (authHeader === `Bearer ${expectedSecret}` || queryToken === expectedSecret);
  if (!authorized) {
    res.status(401).json({ error: "Non autorisé." });
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante côté serveur." });
    return;
  }

  try {
    // On ne récupère que les abonnées annuelles actives — un rappel pour le mensuel serait trop
    // fréquent (12 fois par an) et moins utile.
    const profilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?billing_cycle=eq.annual&subscription_status=eq.active&select=id,email,first_name,billing_anchor_date,language`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const profiles = await profilesRes.json();
    if (!Array.isArray(profiles)) {
      res.status(500).json({ error: "Impossible de récupérer les profils.", details: profiles });
      return;
    }

    const today = new Date(new Date().toDateString());
    let sent = 0;
    const errors = [];

    for (const profile of profiles) {
      if (!profile.email || !profile.billing_anchor_date) continue;
      const nextDate = nextAnnualBillingDate(profile.billing_anchor_date);
      if (!nextDate) continue;
      const daysUntil = Math.round((nextDate - today) / 86400000);
      if (daysUntil !== REMINDER_DAYS_BEFORE) continue;

      const lang = ["fr", "en", "es"].includes(profile.language) ? profile.language : "fr";
      const dateLabel = nextDate.toLocaleDateString(
        lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA",
        { day: "numeric", month: "long", year: "numeric" }
      );
      const { subject, html } = REMINDER_EMAIL[lang](profile.first_name, dateLabel, "99,00 $ CA");

      try {
        await sendViaResend({ to: profile.email, subject, html });
        sent += 1;
      } catch (e) {
        errors.push({ email: profile.email, error: e.message });
      }
    }

    res.status(200).json({ ok: true, checked: profiles.length, sent, errors });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur inattendue." });
  }
}
