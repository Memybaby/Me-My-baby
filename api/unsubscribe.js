// Fonction serverless Vercel — désabonnement en un clic de l'infolettre hebdomadaire (grossesse /
// suivi enfant), sans connexion requise. Appelée depuis le lien tout en bas des courriels envoyés
// par weekly-digest.js.
//
// N'affecte JAMAIS les courriels transactionnels (statut de compte, échec de paiement, reçu) — ceux-là
// passent par send-email.js, qui ne consulte pas ce champ et continue de s'envoyer normalement.
//
// Appelée en GET simple (un clic sur un lien dans un courriel), donc pas de vérification de méthode
// stricte comme les autres routes — juste "uid" en paramètre d'URL.

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";

const PAGE_TEXT = {
  fr: { title: "Désabonnement confirmé", body: "Vous ne recevrez plus l'infolettre hebdomadaire (grossesse / suivi enfant). Vous continuerez de recevoir les courriels importants liés à votre compte et à vos paiements.", back: "Retourner à l'app", error: "Lien de désabonnement invalide ou expiré." },
  en: { title: "Unsubscribed", body: "You won't receive the weekly newsletter (pregnancy / child tracking) anymore. You'll still receive important emails about your account and payments.", back: "Back to the app", error: "This unsubscribe link is invalid or expired." },
  es: { title: "Baja confirmada", body: "Ya no recibirás el boletín semanal (embarazo / seguimiento del bebé). Seguirás recibiendo los correos importantes sobre tu cuenta y tus pagos.", back: "Volver a la app", error: "Este enlace para darte de baja no es válido o ha caducado." },
};

function renderPage(lang, ok) {
  const t = PAGE_TEXT[["fr", "en", "es"].includes(lang) ? lang : "fr"];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t.title}</title></head>
<body style="font-family:Georgia,serif;color:#3A3833;background:#FBF6ED;margin:0;padding:40px 20px;">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:32px 28px;text-align:center;">
    <h1 style="color:#2F4858;font-size:20px;margin:0 0 14px;">${ok ? t.title : t.error}</h1>
    ${ok ? `<p style="line-height:1.6;">${t.body}</p>` : ""}
    <a href="https://me-my-baby.vercel.app" style="display:inline-block;margin-top:16px;background:#D4A54A;color:#fff;text-decoration:none;padding:11px 24px;border-radius:999px;font-weight:700;">${t.back}</a>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  const uid = req.query?.uid;
  const lang = req.query?.lang || "fr";

  if (!uid) {
    res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(renderPage(lang, false));
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante côté serveur." });
    return;
  }

  try {
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json", Prefer: "return=minimal",
      },
      body: JSON.stringify({ newsletter: false }),
    });

    if (!updateRes.ok) {
      res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(renderPage(lang, false));
      return;
    }

    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(renderPage(lang, true));
  } catch (e) {
    res.status(500).setHeader("Content-Type", "text/html; charset=utf-8").send(renderPage(lang, false));
  }
}
