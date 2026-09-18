// api/stripe-webhook.js
// Reçoit les événements Stripe (paiement réussi, échoué, abonnement annulé, etc.) et met à jour
// Supabase en conséquence — c'est LA source de vérité pour le statut membre, jamais le navigateur.
// Vérification de signature faite à la main (HMAC SHA-256), sans le SDK Stripe, pour rester
// cohérent avec le reste du projet (aucune dépendance npm ajoutée).

import crypto from "crypto";
import { sendViaResend } from "./_lib/resend.js";

// Vercel doit nous donner le corps brut de la requête (non parsé) pour que la vérification de
// signature Stripe fonctionne — sinon la signature ne correspond jamais.
export const config = {
  api: { bodyParser: false },
};

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = {};
  for (const piece of signatureHeader.split(",")) {
    const [k, v] = piece.split("=");
    parts[k] = v;
  }
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

async function getProfile(filterField, filterValue, select) {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${SUPABASE_URL}/rest/v1/profiles?${filterField}=eq.${filterValue}&select=${select}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

function safeLang(lang) {
  return ["fr", "en", "es"].includes(lang) ? lang : "fr";
}

function formatDateLabel(dateObjOrStr, lang) {
  const d = dateObjOrStr instanceof Date ? dateObjOrStr : new Date(dateObjOrStr + "T00:00:00");
  return d.toLocaleDateString(lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA", { day: "numeric", month: "long", year: "numeric" });
}

// Courriel combiné bienvenue + reçu — copie exacte du gabarit qui existait côté front-end
// (sendWelcomeReceiptEmail dans App.jsx), envoyé maintenant depuis le webhook, donc seulement au
// moment où Stripe confirme réellement le début de l'abonnement.
function buildWelcomeReceiptEmail({ firstName, lang, billingCycle, priceDisplay, trialEndDate }) {
  const isAnnual = billingCycle === "annual";
  const L = lang === "fr" ? "fr" : lang === "es" ? "es" : "en";
  const T = {
    fr: {
      subject: "Bienvenue chez Me My Baby ! 🎉",
      greet: (n) => `Bienvenue${n ? " " + n : ""} !`,
      intro: "Vous êtes maintenant membre de Me My Baby et avez accès à toutes les fonctionnalités.",
      whatsIncluded: "Ce qui est inclus",
      included: ["Léa, votre diététicienne virtuelle, pour des menus personnalisés chaque semaine", "Novaris, votre assistante virtuelle, disponible à toute heure", "Le suivi complet de la grossesse et du développement de l'enfant jusqu'à 5 ans", "La communauté de parents"],
      paymentTitle: "Premier paiement",
      plan: isAnnual ? "Forfait annuel" : "Forfait mensuel",
      priceLine: `${priceDisplay} ${isAnnual ? "/ an" : "/ mois"}`,
      trialLine: `Aura lieu le ${trialEndDate}, à la fin de votre essai gratuit.`,
      stepsTitle: "Comment continuer",
      steps: ["Cliquez sur le bouton ci-dessous pour ouvrir l'application.", "Connectez-vous avec le courriel et le mot de passe utilisés à l'inscription.", "Profitez de votre accès complet dès maintenant !"],
      cta: "Explorer l'application",
      signoff: "On est vraiment contentes de vous compter parmi nous 💛",
    },
    es: {
      subject: "¡Bienvenida a Me My Baby! 🎉",
      greet: (n) => `¡Bienvenida${n ? " " + n : ""}!`,
      intro: "Ya eres miembro de Me My Baby y tienes acceso a todas las funcionalidades.",
      whatsIncluded: "Qué incluye",
      included: ["Léa, tu nutricionista virtual, con menús personalizados cada semana", "Novaris, tu asistente virtual, disponible a cualquier hora", "El seguimiento completo del embarazo y el desarrollo infantil hasta los 5 años", "La comunidad de padres"],
      paymentTitle: "Primer pago",
      plan: isAnnual ? "Plan anual" : "Plan mensual",
      priceLine: `${priceDisplay} ${isAnnual ? "/ año" : "/ mes"}`,
      trialLine: `Se realizará el ${trialEndDate}, al final de tu prueba gratuita.`,
      stepsTitle: "Cómo continuar",
      steps: ["Haz clic en el botón de abajo para abrir la aplicación.", "Inicia sesión con el correo y la contraseña que usaste al registrarte.", "¡Disfruta de tu acceso completo desde ahora!"],
      cta: "Explorar la aplicación",
      signoff: "Estamos muy felices de tenerte con nosotras 💛",
    },
    en: {
      subject: "Welcome to Me My Baby! 🎉",
      greet: (n) => `Welcome${n ? " " + n : ""}!`,
      intro: "You're now a Me My Baby member and have access to all features.",
      whatsIncluded: "What's included",
      included: ["Léa, your virtual dietitian, with personalized menus every week", "Novaris, your virtual assistant, available any time", "Full pregnancy and child development tracking up to age 5", "The parent community"],
      paymentTitle: "First payment",
      plan: isAnnual ? "Annual plan" : "Monthly plan",
      priceLine: `${priceDisplay} ${isAnnual ? "/ year" : "/ month"}`,
      trialLine: `Will take place on ${trialEndDate}, at the end of your free trial.`,
      stepsTitle: "How to continue",
      steps: ["Click the button below to open the app.", "Log in with the email and password you used to sign up.", "Enjoy your full access right away!"],
      cta: "Explore the app",
      signoff: "We're so glad to have you with us 💛",
    },
  }[L];

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:480px;margin:0 auto;line-height:1.6;">
    <h2 style="color:#2F4858;">${T.greet(firstName)}</h2>
    <p>${T.intro}</p>
    <div style="background:#FBF6ED;border-radius:14px;padding:16px 18px;margin:20px 0;">
      <p style="margin:0 0 10px;font-weight:700;color:#2F4858;">${T.whatsIncluded}</p>
      <ul style="margin:0;padding-left:18px;">${T.included.map((i) => `<li style="margin-bottom:6px;">${i}</li>`).join("")}</ul>
    </div>
    <div style="border:1px solid #E7E1D3;border-radius:14px;padding:16px 18px;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#7A7364;font-weight:700;">${T.paymentTitle}</p>
      <p style="margin:0 0 4px;font-weight:700;color:#2F4858;">Me My Baby — ${T.plan}</p>
      <p style="margin:0 0 8px;">${T.priceLine}</p>
      <p style="margin:0;font-size:13px;color:#7A7364;">${T.trialLine}</p>
    </div>
    <p style="margin:0 0 6px;font-weight:700;color:#2F4858;">${T.stepsTitle}</p>
    <ol style="margin:0 0 4px;padding-left:18px;">${T.steps.map((s) => `<li style="margin-bottom:6px;">${s}</li>`).join("")}</ol>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://me-my-baby.vercel.app" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
    </div>
    <p>${T.signoff}</p>
  </div>`;

  return { subject: T.subject, html };
}

// Copie exacte du gabarit sendPaymentFailedEmail — déclenché maintenant par le vrai événement
// Stripe invoice.payment_failed, plus seulement par le bouton de simulation dans l'app.
function buildPaymentFailedEmail({ firstName, lang, priceDisplay }) {
  const L = safeLang(lang);
  const T = {
    fr: {
      subject: "Problème avec votre paiement Me My Baby",
      greet: (n) => `Bonjour${n ? " " + n : ""},`,
      body: (p) => `Nous n'avons pas pu traiter votre paiement${p ? ` de <strong>${p}</strong>` : ""} pour votre abonnement Me My Baby. Votre accès est suspendu jusqu'à ce que le mode de paiement soit mis à jour.`,
      stepsTitle: "Comment régler ceci",
      steps: ["Cliquez sur le bouton ci-dessous pour ouvrir l'application.", "Allez dans la section « Mon abonnement ».", "Mettez à jour votre mode de paiement."],
      cta: "Mettre à jour mon paiement",
      note: "Une fois le paiement mis à jour, votre accès sera immédiatement rétabli et Stripe retentera automatiquement le prélèvement.",
    },
    es: {
      subject: "Problema con tu pago de Me My Baby",
      greet: (n) => `Hola${n ? " " + n : ""},`,
      body: (p) => `No pudimos procesar tu pago${p ? ` de <strong>${p}</strong>` : ""} de la suscripción a Me My Baby. Tu acceso está suspendido hasta que se actualice el método de pago.`,
      stepsTitle: "Cómo resolver esto",
      steps: ["Haz clic en el botón de abajo para abrir la aplicación.", "Ve a la sección « Mi suscripción ».", "Actualiza tu método de pago."],
      cta: "Actualizar mi pago",
      note: "Una vez actualizado el pago, tu acceso se restablecerá de inmediato y Stripe volverá a intentar el cobro automáticamente.",
    },
    en: {
      subject: "Issue with your Me My Baby payment",
      greet: (n) => `Hi${n ? " " + n : ""},`,
      body: (p) => `We weren't able to process your payment${p ? ` of <strong>${p}</strong>` : ""} for your Me My Baby subscription. Your access is on hold until your payment method is updated.`,
      stepsTitle: "How to fix this",
      steps: ["Click the button below to open the app.", "Go to the \"My subscription\" section.", "Update your payment method."],
      cta: "Update my payment",
      note: "Once your payment is updated, your access will be restored right away and Stripe will automatically retry the charge.",
    },
  }[L];

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:480px;margin:0 auto;line-height:1.6;">
    <h2 style="color:#B3261E;">${T.greet(firstName)}</h2>
    <p>${T.body(priceDisplay)}</p>
    <p style="margin:16px 0 6px;font-weight:700;color:#2F4858;">${T.stepsTitle}</p>
    <ol style="margin:0 0 4px;padding-left:18px;">${T.steps.map((s) => `<li style="margin-bottom:6px;">${s}</li>`).join("")}</ol>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://me-my-baby.vercel.app" style="background:#B3261E;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
    </div>
    <p style="font-size:13px;color:#7A7364;">${T.note}</p>
  </div>`;

  return { subject: T.subject, html };
}

// Nouveau — confirmation envoyée à chaque paiement MENSUEL réellement prélevé (pas pour l'annuel,
// qui a plutôt le rappel envoyé par payment-reminders.js avant le renouvellement).
// Confirmation envoyée à CHAQUE paiement réellement prélevé, mensuel ou annuel — remercie, détaille
// le montant et le forfait, indique jusqu'à quand l'accès est couvert, et rappelle le renouvellement
// automatique.
function buildPaymentReceivedEmail({ firstName, lang, priceDisplay, billingCycle, nextPaymentDate }) {
  const L = safeLang(lang);
  const isAnnual = billingCycle === "annual";
  const T = {
    fr: {
      subject: "Paiement reçu — Me My Baby",
      greet: (n) => `Merci${n ? " " + n : ""} !`,
      body: (p) => `Nous avons bien reçu votre paiement de <strong>${p}</strong> (${isAnnual ? "forfait annuel" : "forfait mensuel"}) pour votre abonnement Me My Baby.`,
      accessLine: (d) => `Votre accès complet est assuré jusqu'au <strong>${d}</strong>.`,
      renewLine: `Votre abonnement se renouvellera automatiquement à cette date avec le même mode de paiement, sauf annulation avant.`,
      cta: "Retourner à l'application",
    },
    es: {
      subject: "Pago recibido — Me My Baby",
      greet: (n) => `¡Gracias${n ? " " + n : ""}!`,
      body: (p) => `Hemos recibido tu pago de <strong>${p}</strong> (${isAnnual ? "plan anual" : "plan mensual"}) por tu suscripción a Me My Baby.`,
      accessLine: (d) => `Tu acceso completo está asegurado hasta el <strong>${d}</strong>.`,
      renewLine: `Tu suscripción se renovará automáticamente en esa fecha con el mismo método de pago, salvo cancelación antes.`,
      cta: "Volver a la aplicación",
    },
    en: {
      subject: "Payment received — Me My Baby",
      greet: (n) => `Thank you${n ? " " + n : ""}!`,
      body: (p) => `We've received your payment of <strong>${p}</strong> (${isAnnual ? "annual plan" : "monthly plan"}) for your Me My Baby subscription.`,
      accessLine: (d) => `Your full access is secured until <strong>${d}</strong>.`,
      renewLine: `Your subscription will automatically renew on that date with the same payment method, unless cancelled before then.`,
      cta: "Return to the app",
    },
  }[L];

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:480px;margin:0 auto;line-height:1.6;">
    <h2 style="color:#2F4858;">${T.greet(firstName)}</h2>
    <p>${T.body(priceDisplay)}</p>
    <div style="background:#FBF6ED;border-radius:14px;padding:16px 18px;margin:20px 0;">
      <p style="margin:0 0 6px;">${T.accessLine(nextPaymentDate)}</p>
      <p style="margin:0;font-size:13px;color:#7A7364;">${T.renewLine}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://me-my-baby.vercel.app" style="background:#2F4858;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
    </div>
  </div>`;

  return { subject: T.subject, html };
}

// Confirmation d'annulation — envoyée automatiquement dès que la personne annule via le Customer
// Portal (pas seulement affichée dans l'app). Explique jusqu'à quand l'accès reste actif et comment
// remettre l'abonnement en vigueur avant cette date.
function buildCancellationEmail({ firstName, lang, accessUntilDate }) {
  const L = safeLang(lang);
  const T = {
    fr: {
      subject: "Votre abonnement Me My Baby a été annulé",
      greet: (n) => `Bonjour${n ? " " + n : ""},`,
      body: (d) => `Votre abonnement Me My Baby a bien été annulé. Vous conservez l'accès à toutes les fonctionnalités jusqu'au <strong>${d}</strong> — après cette date, l'accès sera coupé.`,
      reactivateTitle: "Vous avez changé d'avis ?",
      reactivateBody: "Vous pouvez remettre votre abonnement en vigueur à tout moment avant cette date, sans perdre votre historique.",
      cta: "Remettre en vigueur",
    },
    es: {
      subject: "Tu suscripción a Me My Baby ha sido cancelada",
      greet: (n) => `Hola${n ? " " + n : ""},`,
      body: (d) => `Tu suscripción a Me My Baby ha sido cancelada. Conservas el acceso a todas las funciones hasta el <strong>${d}</strong> — después de esa fecha, el acceso se cortará.`,
      reactivateTitle: "¿Cambiaste de opinión?",
      reactivateBody: "Puedes reactivar tu suscripción en cualquier momento antes de esa fecha, sin perder tu historial.",
      cta: "Reactivar",
    },
    en: {
      subject: "Your Me My Baby subscription has been cancelled",
      greet: (n) => `Hi${n ? " " + n : ""},`,
      body: (d) => `Your Me My Baby subscription has been cancelled. You keep full access until <strong>${d}</strong> — after that date, access will be cut off.`,
      reactivateTitle: "Changed your mind?",
      reactivateBody: "You can reactivate your subscription at any time before that date, without losing your history.",
      cta: "Reactivate",
    },
  }[L];

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:480px;margin:0 auto;line-height:1.6;">
    <h2 style="color:#2F4858;">${T.greet(firstName)}</h2>
    <p>${T.body(accessUntilDate)}</p>
    <div style="background:#FBF6ED;border-radius:14px;padding:16px 18px;margin:20px 0;">
      <p style="margin:0 0 6px;font-weight:700;color:#2F4858;">${T.reactivateTitle}</p>
      <p style="margin:0;font-size:13px;color:#7A7364;">${T.reactivateBody}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://me-my-baby.vercel.app" style="background:#2F4858;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
    </div>
  </div>`;

  return { subject: T.subject, html };
}

// Confirmation de réactivation — envoyée quand la personne annule sa demande d'annulation
// (reprend son abonnement) via le Customer Portal avant la date de coupure.
function buildReactivationEmail({ firstName, lang, nextPaymentDate }) {
  const L = safeLang(lang);
  const T = {
    fr: {
      subject: "Votre abonnement Me My Baby est de nouveau actif",
      greet: (n) => `Bonjour${n ? " " + n : ""},`,
      body: (d) => `Bonne nouvelle : votre abonnement Me My Baby a été remis en vigueur. Votre prochain paiement aura lieu le <strong>${d}</strong>, comme prévu.`,
      cta: "Retourner à l'application",
    },
    es: {
      subject: "Tu suscripción a Me My Baby está activa de nuevo",
      greet: (n) => `Hola${n ? " " + n : ""},`,
      body: (d) => `Buenas noticias: tu suscripción a Me My Baby ha sido reactivada. Tu próximo pago será el <strong>${d}</strong>, según lo previsto.`,
      cta: "Volver a la aplicación",
    },
    en: {
      subject: "Your Me My Baby subscription is active again",
      greet: (n) => `Hi${n ? " " + n : ""},`,
      body: (d) => `Good news: your Me My Baby subscription has been reactivated. Your next payment will take place on <strong>${d}</strong>, as scheduled.`,
      cta: "Return to the app",
    },
  }[L];

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:480px;margin:0 auto;line-height:1.6;">
    <h2 style="color:#2F4858;">${T.greet(firstName)}</h2>
    <p>${T.body(nextPaymentDate)}</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://me-my-baby.vercel.app" style="background:#2F4858;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
    </div>
  </div>`;

  return { subject: T.subject, html };
}

async function updateProfile(filterField, filterValue, updates) {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${SUPABASE_URL}/rest/v1/profiles?${filterField}=eq.${filterValue}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
      // return=representation (au lieu de minimal) pour qu'on puisse voir dans les logs Vercel
      // combien de lignes ont réellement été touchées — sinon Supabase répond "succès" même quand
      // le filtre ne trouve aucune ligne, ce qui masque silencieusement les erreurs de userId.
      Prefer: "return=representation",
    },
    body: JSON.stringify(updates),
  });
  const bodyText = await res.text().catch(() => "");
  let rows = [];
  try { rows = JSON.parse(bodyText); } catch { /* réponse non-JSON, on garde bodyText tel quel */ }
  const matchedCount = Array.isArray(rows) ? rows.length : 0;
  console.log(`[stripe-webhook] PATCH profiles?${filterField}=eq.${filterValue} -> status ${res.status}, lignes touchées: ${matchedCount}`, updates);
  if (!res.ok || matchedCount === 0) {
    console.error(`[stripe-webhook] ÉCHEC ou AUCUNE LIGNE TROUVÉE pour ${filterField}=${filterValue}. Réponse Supabase:`, bodyText);
  }
  return matchedCount;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET manquant.");
    return res.status(500).send("Webhook not configured");
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers["stripe-signature"];

  if (!verifyStripeSignature(rawBody, signature, secret)) {
    return res.status(400).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).send("Invalid payload");
  }

  try {
    switch (event.type) {
      // Le paiement (ou l'entrée en essai gratuit) vient d'être confirmé sur Stripe : on active le
      // compte et on fixe la date d'ancrage de facturation à la fin de l'essai gratuit — exactement
      // comme le faisait l'ancienne simulation locale côté app.
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        const billingCycle = session.metadata?.billing_cycle || "monthly";
        console.log(`[stripe-webhook] checkout.session.completed — client_reference_id: ${session.client_reference_id}, metadata.supabase_user_id: ${session.metadata?.supabase_user_id}, customer: ${session.customer}, subscription: ${session.subscription}`);
        const TRIAL_DAYS = 5; // garder synchronisé avec create-checkout-session.js et App.jsx
        const anchorDate = new Date();
        anchorDate.setDate(anchorDate.getDate() + TRIAL_DAYS);
        const anchorDateStr = anchorDate.toISOString().slice(0, 10);

        if (userId) {
          const matched = await updateProfile("id", userId, {
            subscription_status: "active",
            billing_cycle: billingCycle,
            billing_anchor_date: anchorDateStr,
            subscription_access_until: null,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          });
          if (matched > 0) {
            try {
              const profile = await getProfile("id", userId, "email,first_name,language");
              if (profile?.email) {
                const trialEndLabel = formatDateLabel(anchorDateStr, safeLang(profile.language));
                const priceDisplay = billingCycle === "annual" ? "99,00 $ CAD" : "9,95 $ CAD";
                const { subject, html } = buildWelcomeReceiptEmail({
                  firstName: profile.first_name, lang: profile.language, billingCycle, priceDisplay, trialEndDate: trialEndLabel,
                });
                await sendViaResend({ to: profile.email, subject, html });
              }
            } catch (emailErr) {
              console.error("[stripe-webhook] échec de l'envoi du courriel de bienvenue:", emailErr);
            }
          }
        } else {
          console.error("[stripe-webhook] checkout.session.completed sans userId — client_reference_id et metadata.supabase_user_id sont tous les deux vides. Impossible de savoir quel profil mettre à jour.");
        }
        break;
      }

      // Changements de statut d'un abonnement existant (échec de paiement récupéré, passage en
      // souffrance, annulation programmée en fin de période, etc.)
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer;
        const prevCancelAtPeriodEnd = event.data.previous_attributes?.cancel_at_period_end;
        let status = "active";
        if (sub.status === "past_due" || sub.status === "unpaid") status = "payment_failed";
        else if (sub.status === "canceled") status = "cancelled";
        else if (sub.status === "active" || sub.status === "trialing") status = "active";

        const updates = { subscription_status: status };
        if (sub.cancel_at_period_end && sub.current_period_end) {
          updates.subscription_status = "cancelled";
          updates.subscription_access_until = new Date(sub.current_period_end * 1000).toISOString().slice(0, 10);
        } else if (status === "active") {
          updates.subscription_access_until = null;
        }

        const matched = await updateProfile("stripe_customer_id", customerId, updates);

        // On envoie le courriel seulement au vrai moment du changement (détecté via
        // previous_attributes), jamais à chaque fois que Stripe renvoie cet événement pour autre chose.
        if (matched > 0) {
          const justCancelled = sub.cancel_at_period_end === true && prevCancelAtPeriodEnd === false;
          const justReactivated = sub.cancel_at_period_end === false && prevCancelAtPeriodEnd === true;

          if (justCancelled || justReactivated) {
            try {
              const profile = await getProfile("stripe_customer_id", customerId, "email,first_name,language");
              if (profile?.email) {
                if (justCancelled) {
                  const accessUntilLabel = formatDateLabel(updates.subscription_access_until, safeLang(profile.language));
                  const { subject, html } = buildCancellationEmail({ firstName: profile.first_name, lang: profile.language, accessUntilDate: accessUntilLabel });
                  await sendViaResend({ to: profile.email, subject, html });
                } else {
                  const nextPaymentLabel = formatDateLabel(new Date(sub.current_period_end * 1000).toISOString().slice(0, 10), safeLang(profile.language));
                  const { subject, html } = buildReactivationEmail({ firstName: profile.first_name, lang: profile.language, nextPaymentDate: nextPaymentLabel });
                  await sendViaResend({ to: profile.email, subject, html });
                }
              }
            } catch (emailErr) {
              console.error("[stripe-webhook] échec de l'envoi du courriel d'annulation/réactivation:", emailErr);
            }
          }
        }
        break;
      }

      // L'abonnement est réellement terminé côté Stripe (fin de période après annulation, ou
      // annulation immédiate) : on coupe l'accès dès aujourd'hui.
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const today = new Date().toISOString().slice(0, 10);
        await updateProfile("stripe_customer_id", sub.customer, {
          subscription_status: "cancelled",
          subscription_access_until: today,
        });
        break;
      }

      // Échec d'un paiement récurrent réel : on bloque l'accès ET on envoie le vrai courriel
      // d'avertissement (avant, ce courriel ne partait que depuis le bouton de simulation dans l'app).
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.customer) {
          const matched = await updateProfile("stripe_customer_id", invoice.customer, {
            subscription_status: "payment_failed",
          });
          if (matched > 0) {
            try {
              const profile = await getProfile("stripe_customer_id", invoice.customer, "email,first_name,language");
              if (profile?.email) {
                const amount = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2).replace(".", ",") : null;
                const priceDisplay = amount ? `${amount} $ ${(invoice.currency || "cad").toUpperCase()}` : null;
                const { subject, html } = buildPaymentFailedEmail({ firstName: profile.first_name, lang: profile.language, priceDisplay });
                await sendViaResend({ to: profile.email, subject, html });
              }
            } catch (emailErr) {
              console.error("[stripe-webhook] échec de l'envoi du courriel de paiement échoué:", emailErr);
            }
          }
        }
        break;
      }

      // Paiement récurrent réellement prélevé avec succès. On ignore les factures à 0 $ (le tout
      // premier "paiement" au début d'un essai gratuit) et on ne confirme que pour le cycle MENSUEL
      // — l'annuel a plutôt son rappel envoyé avant coup par payment-reminders.js.
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.customer && invoice.amount_paid > 0) {
          try {
            const profile = await getProfile("stripe_customer_id", invoice.customer, "email,first_name,language,billing_cycle");
            if (profile?.email) {
              const amount = (invoice.amount_paid / 100).toFixed(2).replace(".", ",");
              const priceDisplay = `${amount} $ ${(invoice.currency || "cad").toUpperCase()}`;
              // La période couverte par cette facture (invoice.period_end) correspond à la date du
              // prochain paiement pour un abonnement récurrent — pas besoin d'aller rechercher
              // l'abonnement séparément.
              const nextPaymentLabel = invoice.period_end
                ? formatDateLabel(new Date(invoice.period_end * 1000).toISOString().slice(0, 10), safeLang(profile.language))
                : "";
              const { subject, html } = buildPaymentReceivedEmail({
                firstName: profile.first_name, lang: profile.language, priceDisplay,
                billingCycle: profile.billing_cycle, nextPaymentDate: nextPaymentLabel,
              });
              await sendViaResend({ to: profile.email, subject, html });
            }
          } catch (emailErr) {
            console.error("[stripe-webhook] échec de l'envoi du courriel de paiement reçu:", emailErr);
          }
        }
        break;
      }

      default:
        break; // événement non géré, on l'ignore volontairement
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("stripe-webhook handler error:", err);
    return res.status(500).send("Webhook handler error");
  }
}
