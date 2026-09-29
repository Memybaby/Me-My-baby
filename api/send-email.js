// Fonction serverless Vercel — envoi de courriels transactionnels via Resend.
//
// Pourquoi ce fichier existe :
// Comme pour la clé API Anthropic (voir api/chat.js), la vraie clé Resend ne doit jamais se
// trouver dans le code front-end. Cette fonction tourne côté serveur, lit la clé depuis une
// variable d'environnement, et envoie le courriel demandé à sa place.
//
// SÉCURITÉ : cette adresse est publique, donc n'importe qui pourrait l'appeler. Pour empêcher
// qu'elle serve à envoyer des pourriels au nom de memybabyapp.com, on n'accepte que 2 cas :
//   1. Un courriel envoyé à l'adresse de Me My Baby (formulaire « Nous joindre », alertes
//      d'erreur) — le destinataire est toujours nous, donc aucun risque pour des inconnus.
//   2. Un courriel envoyé par une personne CONNECTÉE à SA PROPRE adresse (ex. menu de Léa) —
//      vérifié auprès de Supabase avec son jeton de connexion.
// Tout le reste est refusé.
//
// Variables d'environnement Vercel utilisées : RESEND_API_KEY (dans _lib/resend.js) et
// SUPABASE_SERVICE_ROLE_KEY (déjà utilisée par create-checkout-session.js).
//
// Utilisé par : le menu personnalisé de Léa, le formulaire "Nous joindre" (avec pièce jointe
// optionnelle) et les alertes d'erreur automatiques.

import { sendViaResend } from "./_lib/resend.js";

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const OWNER_EMAILS = ["memybaby.app@gmail.com"];

async function emailOfLoggedInUser(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !key) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: key },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return (user.email || "").trim().toLowerCase() || null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { to, subject, html, attachments } = req.body || {};
    if (!to || !subject || !html || typeof to !== "string") {
      res.status(400).json({ error: "Champs 'to', 'subject' et 'html' requis." });
      return;
    }
    const recipient = to.trim().toLowerCase();

    let allowed = OWNER_EMAILS.includes(recipient);
    if (!allowed) {
      const me = await emailOfLoggedInUser(req);
      allowed = !!me && me === recipient;
    }
    if (!allowed) {
      res.status(403).json({ error: "Envoi non autorisé." });
      return;
    }

    const data = await sendViaResend({ to, subject, html, attachments });
    res.status(200).json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message || "Impossible d'envoyer le courriel." });
  }
}
