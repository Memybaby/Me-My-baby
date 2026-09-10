// Petit utilitaire partagé pour envoyer un courriel via Resend.
// Le préfixe "_" dans le nom du dossier dit à Vercel de NE PAS transformer ce fichier en point
// d'accès public — c'est seulement un module partagé entre les vraies fonctions serverless
// (send-email.js et payment-reminders.js), jamais appelé directement depuis le navigateur.

export async function sendViaResend({ to, subject, html, from, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquante côté serveur.");
  }

  const body = {
    from: from || "Me My Baby <noreply@memybabyapp.com>",
    to: [to],
    subject,
    html,
  };

  // Pièces jointes optionnelles — chacune doit avoir "filename" et "content" (le contenu du
  // fichier encodé en base64, sans le préfixe "data:...;base64,"). Resend accepte jusqu'à 40 Mo
  // au total par courriel.
  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachments = attachments
      .filter((a) => a && a.filename && a.content)
      .map((a) => ({ filename: a.filename, content: a.content }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Échec de l'envoi via Resend (${res.status}).`);
  }
  return data;
}
