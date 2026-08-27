// Petit utilitaire partagé pour envoyer un courriel via Resend.
// Le préfixe "_" dans le nom du dossier dit à Vercel de NE PAS transformer ce fichier en point
// d'accès public — c'est seulement un module partagé entre les vraies fonctions serverless
// (send-email.js et payment-reminders.js), jamais appelé directement depuis le navigateur.

export async function sendViaResend({ to, subject, html, from }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquante côté serveur.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: from || "Me My Baby <noreply@memybabyapp.com>",
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Échec de l'envoi via Resend (${res.status}).`);
  }
  return data;
}
