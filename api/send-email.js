// Fonction serverless Vercel — envoi de courriels transactionnels via Resend.
//
// Pourquoi ce fichier existe :
// Comme pour la clé API Anthropic (voir api/chat.js), la vraie clé Resend ne doit jamais se
// trouver dans le code front-end. Cette fonction tourne côté serveur, lit la clé depuis une
// variable d'environnement, et envoie le courriel demandé à sa place.
//
// Mise en place requise sur Vercel (une seule fois) :
//   1. Créer un compte sur resend.com (ou se connecter au compte existant)
//   2. Vérifier le domaine memybabyapp.com dans Resend (Domains → Add Domain), puis ajouter les
//      enregistrements DNS demandés chez le fournisseur du domaine
//   3. Créer une clé API sur resend.com → API Keys
//   4. Sur vercel.com → le projet → Settings → Environment Variables, ajouter RESEND_API_KEY
//   5. Redéployer le projet
//
// Utilisé par : le menu personnalisé de Léa, le reçu de paiement envoyé après un abonnement.

import { sendViaResend } from "./_lib/resend.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) {
      res.status(400).json({ error: "Champs 'to', 'subject' et 'html' requis." });
      return;
    }
    const data = await sendViaResend({ to, subject, html });
    res.status(200).json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message || "Impossible d'envoyer le courriel." });
  }
}
