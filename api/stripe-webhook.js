// api/stripe-webhook.js
// Reçoit les événements Stripe (paiement réussi, échoué, abonnement annulé, etc.) et met à jour
// Supabase en conséquence — c'est LA source de vérité pour le statut membre, jamais le navigateur.
// Vérification de signature faite à la main (HMAC SHA-256), sans le SDK Stripe, pour rester
// cohérent avec le reste du projet (aucune dépendance npm ajoutée).

import crypto from "crypto";
import { sendViaResend } from "./_lib/resend.js";
import { nextPaymentPreview } from "./_lib/stripe-preview.js";

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

// Protège le prénom inséré dans les courriels (un prénom contenant < ou & ne doit jamais casser
// la mise en page ni injecter du code).
// Fin de la période payée d'un abonnement. Les versions récentes de Stripe (2025 et +) l'ont
// déplacée de l'abonnement vers ses « items » : on lit les deux endroits.
function subPeriodEnd(sub) {
  return sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end || null;
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Montant écrit à la façon de chaque langue : « 9,95 $ CA » (fr), « $9.95 CAD » (en), « 9,95 $ CAD » (es).
function formatMoney(cents, currency, lang) {
  const cur = (currency || "cad").toUpperCase();
  const n = (cents / 100).toFixed(2);
  if (lang === "en") return `$${n} ${cur}`;
  return `${n.replace(".", ",")} $ ${cur === "CAD" && lang === "fr" ? "CA" : cur}`;
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
// Calcule le PREMIER vrai paiement d'un nouvel abonnement en lisant l'abonnement dans Stripe :
// fin de l'essai gratuit, rabais d'un code promo (ex. 1er mois gratuit, 50 % pendant 3 mois),
// montant et date réelle. Retourne null si Stripe ne répond pas (on garde alors l'ancien calcul).
async function firstPaymentInfo(event, subscriptionId) {
  if (!subscriptionId) return null;
  const key = event.livemode ? process.env.STRIPE_SECRET_KEY : (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY);
  if (!key) return null;
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": "2024-06-20" },
  });
  if (!r.ok) return null;
  const sub = await r.json();
  const price = sub.items?.data?.[0]?.price || {};
  const full = price.unit_amount;
  if (!Number.isFinite(full)) return null;
  const currency = sub.currency || price.currency || "cad";
  const yearly = price.recurring?.interval === "year";
  const start = sub.trial_end || sub.current_period_end;
  if (!start) return null;
  const disc = sub.discount || null;
  const c = disc?.coupon || null;
  const at = (k) => {
    const d = new Date(start * 1000);
    if (yearly) d.setUTCFullYear(d.getUTCFullYear() + k); else d.setUTCMonth(d.getUTCMonth() + k);
    return Math.floor(d.getTime() / 1000);
  };
  const applies = (k, t) => !!c && (c.duration === "forever" || (c.duration === "once" && k === 0) || (c.duration === "repeating" && disc.end && t < disc.end));
  const amountAt = (k, t) => {
    if (!applies(k, t)) return full;
    if (c.percent_off) return Math.max(0, Math.round((full * (100 - c.percent_off)) / 100));
    return Math.max(0, full - (c.currency === currency ? c.amount_off || 0 : 0));
  };
  for (let k = 0; k < 40; k++) {
    const t = at(k);
    const amount = amountAt(k, t);
    if (amount > 0) {
      return { date: t, amount, full, currency, yearly, discounted: amount < full, delayed: k > 0, trialEnd: sub.trial_end || null };
    }
  }
  return { date: null, amount: 0, full, currency, yearly, discounted: true, delayed: true, trialEnd: sub.trial_end || null };
}

// Date AAAA-MM-JJ à l'heure de Montréal (les dates Stripe sont en secondes, en heure universelle).
function torontoDay(unix) {
  return new Date(unix * 1000).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

function buildWelcomeReceiptEmail({ firstName, lang, billingCycle, priceDisplay, trialEndDate, firstPayDate, fullPriceDisplay, mode }) {
  // mode : "normal" (1er paiement à la fin de l'essai), "discounted" (1er paiement réduit par un
  // code promo) ou "delayed" (code promo : le ou les premiers mois sont gratuits).
  const isAnnual = billingCycle === "annual";
  const L = lang === "fr" ? "fr" : lang === "es" ? "es" : "en";
  const T = {
    fr: {
      subject: "Bienvenue chez Me My Baby ! 🎉",
      greet: (n) => `Bienvenue${n ? " " + esc(n) : ""} !`,
      intro: "Vous êtes maintenant membre de Me My Baby et avez accès à toutes les fonctionnalités.",
      whatsIncluded: "Ce qui est inclus",
      included: ["Léa, votre diététicienne virtuelle, pour des menus personnalisés chaque semaine", "Novaris, votre assistante virtuelle, disponible à toute heure", "Le suivi complet de la grossesse et du développement de l'enfant jusqu'à 5 ans", "La communauté de parents"],
      paymentTitle: "Premier paiement",
      plan: isAnnual ? "Forfait annuel" : "Forfait mensuel",
      priceLine: mode === "discounted"
        ? `${priceDisplay} au lieu de ${fullPriceDisplay}, grâce à votre code promo (taxes en sus)`
        : `${fullPriceDisplay || priceDisplay} ${isAnnual ? "/ an" : "/ mois"} (taxes en sus)`,
      trialLine: mode === "delayed"
        ? (firstPayDate ? `Votre essai gratuit se termine le ${trialEndDate}. Grâce à votre code promo, votre premier paiement aura lieu le ${firstPayDate}.` : `Grâce à votre code promo, vous n'avez rien à payer.`)
        : `Aura lieu le ${firstPayDate || trialEndDate}, à la fin de votre essai gratuit.`,
      stepsTitle: "Comment continuer",
      steps: ["Cliquez sur le bouton ci-dessous pour ouvrir l'application.", "Connectez-vous avec le courriel et le mot de passe utilisés à l'inscription.", "Profitez de votre accès complet dès maintenant !"],
      cta: "Explorer l'application",
      signoff: "On est vraiment contentes de vous compter parmi nous 💛",
    },
    es: {
      subject: "¡Bienvenida a Me My Baby! 🎉",
      greet: (n) => `¡Bienvenida${n ? " " + esc(n) : ""}!`,
      intro: "Ya eres miembro de Me My Baby y tienes acceso a todas las funcionalidades.",
      whatsIncluded: "Qué incluye",
      included: ["Léa, tu nutricionista virtual, con menús personalizados cada semana", "Novaris, tu asistente virtual, disponible a cualquier hora", "El seguimiento completo del embarazo y el desarrollo infantil hasta los 5 años", "La comunidad de padres"],
      paymentTitle: "Primer pago",
      plan: isAnnual ? "Plan anual" : "Plan mensual",
      priceLine: mode === "discounted"
        ? `${priceDisplay} en lugar de ${fullPriceDisplay}, gracias a tu código promocional (impuestos aparte)`
        : `${fullPriceDisplay || priceDisplay} ${isAnnual ? "/ año" : "/ mes"} (impuestos aparte)`,
      trialLine: mode === "delayed"
        ? (firstPayDate ? `Tu prueba gratuita termina el ${trialEndDate}. Gracias a tu código promocional, tu primer pago se realizará el ${firstPayDate}.` : `Gracias a tu código promocional, no tienes nada que pagar.`)
        : `Se realizará el ${firstPayDate || trialEndDate}, al final de tu prueba gratuita.`,
      stepsTitle: "Cómo continuar",
      steps: ["Haz clic en el botón de abajo para abrir la aplicación.", "Inicia sesión con el correo y la contraseña que usaste al registrarte.", "¡Disfruta de tu acceso completo desde ahora!"],
      cta: "Explorar la aplicación",
      signoff: "Estamos muy felices de tenerte con nosotras 💛",
    },
    en: {
      subject: "Welcome to Me My Baby! 🎉",
      greet: (n) => `Welcome${n ? " " + esc(n) : ""}!`,
      intro: "You're now a Me My Baby member and have access to all features.",
      whatsIncluded: "What's included",
      included: ["Léa, your virtual dietitian, with personalized menus every week", "Novaris, your virtual assistant, available any time", "Full pregnancy and child development tracking up to age 5", "The parent community"],
      paymentTitle: "First payment",
      plan: isAnnual ? "Annual plan" : "Monthly plan",
      priceLine: mode === "discounted"
        ? `${priceDisplay} instead of ${fullPriceDisplay}, thanks to your promo code (plus applicable taxes)`
        : `${fullPriceDisplay || priceDisplay} ${isAnnual ? "/ year" : "/ month"} (plus applicable taxes)`,
      trialLine: mode === "delayed"
        ? (firstPayDate ? `Your free trial ends on ${trialEndDate}. Thanks to your promo code, your first payment will be on ${firstPayDate}.` : `Thanks to your promo code, you have nothing to pay.`)
        : `Will take place on ${firstPayDate || trialEndDate}, at the end of your free trial.`,
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
      <a href="https://www.memybabyapp.com/?connexion=1" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
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
      greet: (n) => `Bonjour${n ? " " + esc(n) : ""},`,
      body: (p) => `Nous n'avons pas pu traiter votre paiement${p ? ` de <strong>${p}</strong>` : ""} pour votre abonnement Me My Baby. Votre accès est suspendu jusqu'à ce que le mode de paiement soit mis à jour.`,
      stepsTitle: "Comment régler ceci",
      steps: ["Cliquez sur le bouton ci-dessous pour ouvrir l'application.", "Allez dans la section « Mon abonnement ».", "Mettez à jour votre mode de paiement."],
      cta: "Mettre à jour mon paiement",
      note: "Une fois le paiement mis à jour, votre accès sera immédiatement rétabli et Stripe retentera automatiquement le prélèvement.",
    },
    es: {
      subject: "Problema con tu pago de Me My Baby",
      greet: (n) => `Hola${n ? " " + esc(n) : ""},`,
      body: (p) => `No pudimos procesar tu pago${p ? ` de <strong>${p}</strong>` : ""} de la suscripción a Me My Baby. Tu acceso está suspendido hasta que se actualice el método de pago.`,
      stepsTitle: "Cómo resolver esto",
      steps: ["Haz clic en el botón de abajo para abrir la aplicación.", "Ve a la sección « Mi suscripción ».", "Actualiza tu método de pago."],
      cta: "Actualizar mi pago",
      note: "Una vez actualizado el pago, tu acceso se restablecerá de inmediato y Stripe volverá a intentar el cobro automáticamente.",
    },
    en: {
      subject: "Issue with your Me My Baby payment",
      greet: (n) => `Hi${n ? " " + esc(n) : ""},`,
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
      <a href="https://www.memybabyapp.com" style="background:#B3261E;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
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
      greet: (n) => `Merci${n ? " " + esc(n) : ""} !`,
      body: (p) => `Nous avons bien reçu votre paiement de <strong>${p}</strong> (${isAnnual ? "forfait annuel" : "forfait mensuel"}) pour votre abonnement Me My Baby.`,
      accessLine: (d) => `Votre accès complet est assuré jusqu'au <strong>${d}</strong>.`,
      renewLine: `Votre abonnement se renouvellera automatiquement à cette date avec le même mode de paiement, sauf annulation avant.`,
      cta: "Retourner à l'application",
    },
    es: {
      subject: "Pago recibido — Me My Baby",
      greet: (n) => `¡Gracias${n ? " " + esc(n) : ""}!`,
      body: (p) => `Hemos recibido tu pago de <strong>${p}</strong> (${isAnnual ? "plan anual" : "plan mensual"}) por tu suscripción a Me My Baby.`,
      accessLine: (d) => `Tu acceso completo está asegurado hasta el <strong>${d}</strong>.`,
      renewLine: `Tu suscripción se renovará automáticamente en esa fecha con el mismo método de pago, salvo cancelación antes.`,
      cta: "Volver a la aplicación",
    },
    en: {
      subject: "Payment received — Me My Baby",
      greet: (n) => `Thank you${n ? " " + esc(n) : ""}!`,
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
      <a href="https://www.memybabyapp.com/?connexion=1" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
    </div>
  </div>`;

  return { subject: T.subject, html };
}

// Confirmation d'annulation — envoyée automatiquement dès que la personne annule via le Customer
// Portal (pas seulement affichée dans l'app). Explique jusqu'à quand l'accès reste actif et comment
// remettre l'abonnement en vigueur avant cette date.
// Bouton des courriels : mène seulement à la page de connexion de l'appli (sécurité).
const LOGIN_URL = "https://www.memybabyapp.com/?connexion=1";

function emailShell({ greet, paragraphs, boxTitle, boxLines, cta }) {
  return `<div style="font-family:Georgia,serif;color:#3A3833;max-width:500px;margin:0 auto;line-height:1.6;">
    <div style="background:#F6EADB;border-radius:16px;padding:14px 18px;margin:0 0 16px;">
      <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9A7444;">Me My Baby</div>
      <div style="font-size:19px;font-weight:700;color:#5B3A24;margin-top:2px;">${greet}</div>
    </div>
    ${paragraphs.map((x) => `<p style="margin:0 0 12px;">${x}</p>`).join("")}
    <div style="background:#FBF6ED;border-radius:14px;padding:14px 18px;margin:18px 0;">
      <p style="margin:0 0 6px;font-weight:700;color:#5B3A24;">${boxTitle}</p>
      <ol style="margin:0;padding-left:20px;font-size:14px;color:#3A3833;">${boxLines.map((x) => `<li style="margin-bottom:4px;">${x}</li>`).join("")}</ol>
    </div>
    <div style="text-align:center;margin:22px 0 8px;">
      <a href="${LOGIN_URL}" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${cta}</a>
    </div>
    <p style="margin-top:16px;">— Me My Baby 💛</p>
  </div>`;
}

// 1) Demande d'annulation reçue (l'abonnement reste actif jusqu'à la fin de la période payée ou de l'essai).
function buildCancellationEmail({ firstName, lang, accessUntilDate }) {
  const L = safeLang(lang);
  const n = firstName ? " " + esc(firstName) : "";
  const T = {
    fr: {
      subject: "Nous avons bien reçu votre demande d'annulation — Me My Baby",
      greet: `Bonjour${n},`,
      p: [
        "Vous venez de faire une demande d'annulation de votre abonnement à Me My Baby. Elle a bien été enregistrée.",
        `<strong>Votre compte reste actif</strong> : vous gardez l'accès à toutes les fonctionnalités jusqu'au <strong>${accessUntilDate}</strong>. Aucun autre paiement ne sera prélevé.`,
        "Après cette date, l'abonnement prendra fin et vous n'aurez plus accès aux fonctionnalités réservées aux membres. Vos informations restent enregistrées dans votre compte.",
      ],
      boxTitle: "Vous avez changé d'avis ? Pour garder votre abonnement :",
      box: ["Connectez-vous à Me My Baby.", "Allez dans <strong>Mon abonnement</strong>, puis <strong>Gérer mon abonnement</strong>.", "Touchez <strong>Renouveler l'abonnement</strong>. C'est tout !"],
      cta: "Me connecter à Me My Baby",
    },
    en: {
      subject: "We received your cancellation request — Me My Baby",
      greet: `Hi${n},`,
      p: [
        "You just requested to cancel your Me My Baby subscription. Your request has been recorded.",
        `<strong>Your account stays active</strong>: you keep access to every feature until <strong>${accessUntilDate}</strong>. No further payment will be charged.`,
        "After that date, your subscription will end and you'll no longer have access to member features. Your information stays saved in your account.",
      ],
      boxTitle: "Changed your mind? To keep your subscription:",
      box: ["Log in to Me My Baby.", "Go to <strong>My subscription</strong>, then <strong>Manage my subscription</strong>.", "Tap <strong>Renew subscription</strong>. That's it!"],
      cta: "Log in to Me My Baby",
    },
    es: {
      subject: "Recibimos tu solicitud de cancelación — Me My Baby",
      greet: `Hola${n},`,
      p: [
        "Acabas de solicitar la cancelación de tu suscripción a Me My Baby. Tu solicitud quedó registrada.",
        `<strong>Tu cuenta sigue activa</strong>: conservas el acceso a todas las funciones hasta el <strong>${accessUntilDate}</strong>. No se realizará ningún otro cobro.`,
        "Después de esa fecha, la suscripción terminará y ya no tendrás acceso a las funciones para miembros. Tu información sigue guardada en tu cuenta.",
      ],
      boxTitle: "¿Cambiaste de opinión? Para conservar tu suscripción:",
      box: ["Inicia sesión en Me My Baby.", "Ve a <strong>Mi suscripción</strong> y luego a <strong>Gestionar mi suscripción</strong>.", "Toca <strong>Renovar la suscripción</strong>. ¡Listo!"],
      cta: "Iniciar sesión en Me My Baby",
    },
  }[L];
  return { subject: T.subject, html: emailShell({ greet: T.greet, paragraphs: T.p, boxTitle: T.boxTitle, boxLines: T.box, cta: T.cta }) };
}

// 2) Abonnement réellement terminé (fin de l'essai ou de la période payée après une annulation).
function buildSubscriptionEndedEmail({ firstName, lang }) {
  const L = safeLang(lang);
  const n = firstName ? " " + esc(firstName) : "";
  const T = {
    fr: {
      subject: "Votre abonnement Me My Baby est maintenant terminé",
      greet: `Bonjour${n},`,
      p: [
        "Comme demandé, votre abonnement à Me My Baby est maintenant <strong>annulé</strong>. Aucun paiement ne sera prélevé.",
        "Vous n'avez plus accès aux fonctionnalités réservées aux membres. Votre compte et vos informations restent enregistrés : vous retrouverez tout si vous revenez.",
        "Merci d'avoir fait partie de Me My Baby. Vous serez toujours la bienvenue 💛",
      ],
      boxTitle: "Pour réactiver votre abonnement :",
      box: ["Connectez-vous à Me My Baby.", "Allez dans <strong>Devenir membre</strong>.", "Choisissez votre forfait (mensuel ou annuel) et confirmez le paiement."],
      cta: "Me connecter à Me My Baby",
    },
    en: {
      subject: "Your Me My Baby subscription has now ended",
      greet: `Hi${n},`,
      p: [
        "As requested, your Me My Baby subscription is now <strong>cancelled</strong>. No payment will be charged.",
        "You no longer have access to member features. Your account and information stay saved: you'll find everything again if you come back.",
        "Thank you for being part of Me My Baby. You'll always be welcome 💛",
      ],
      boxTitle: "To reactivate your subscription:",
      box: ["Log in to Me My Baby.", "Go to <strong>Become a member</strong>.", "Choose your plan (monthly or yearly) and confirm the payment."],
      cta: "Log in to Me My Baby",
    },
    es: {
      subject: "Tu suscripción a Me My Baby ha terminado",
      greet: `Hola${n},`,
      p: [
        "Como lo solicitaste, tu suscripción a Me My Baby ahora está <strong>cancelada</strong>. No se realizará ningún cobro.",
        "Ya no tienes acceso a las funciones para miembros. Tu cuenta y tu información siguen guardadas: encontrarás todo si regresas.",
        "Gracias por haber sido parte de Me My Baby. Siempre serás bienvenida 💛",
      ],
      boxTitle: "Para reactivar tu suscripción:",
      box: ["Inicia sesión en Me My Baby.", "Ve a <strong>Hacerme miembro</strong>.", "Elige tu plan (mensual o anual) y confirma el pago."],
      cta: "Iniciar sesión en Me My Baby",
    },
  }[L];
  return { subject: T.subject, html: emailShell({ greet: T.greet, paragraphs: T.p, boxTitle: T.boxTitle, boxLines: T.box, cta: T.cta }) };
}

// Confirmation de réactivation — envoyée quand la personne annule sa demande d'annulation
// (reprend son abonnement) via le Customer Portal avant la date de coupure.
function buildReactivationEmail({ firstName, lang, nextPaymentDate, amountDisplay }) {
  const L = safeLang(lang);
  const T = {
    fr: {
      subject: "Votre abonnement Me My Baby est de nouveau actif",
      greet: (n) => `Bonjour${n ? " " + esc(n) : ""},`,
      body: (d) => `Bonne nouvelle : votre abonnement Me My Baby a été remis en vigueur. Votre prochain paiement${amountDisplay ? ` de <strong>${amountDisplay}</strong> (taxes incluses)` : ""} aura lieu le <strong>${d}</strong>.`,
      cta: "Retourner à l'application",
    },
    es: {
      subject: "Tu suscripción a Me My Baby está activa de nuevo",
      greet: (n) => `Hola${n ? " " + esc(n) : ""},`,
      body: (d) => `Buenas noticias: tu suscripción a Me My Baby ha sido reactivada. Tu próximo pago${amountDisplay ? ` de <strong>${amountDisplay}</strong> (impuestos incluidos)` : ""} será el <strong>${d}</strong>.`,
      cta: "Volver a la aplicación",
    },
    en: {
      subject: "Your Me My Baby subscription is active again",
      greet: (n) => `Hi${n ? " " + esc(n) : ""},`,
      body: (d) => `Good news: your Me My Baby subscription has been reactivated. Your next payment${amountDisplay ? ` of <strong>${amountDisplay}</strong> (taxes included)` : ""} will take place on <strong>${d}</strong>.`,
      cta: "Return to the app",
    },
  }[L];

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:480px;margin:0 auto;line-height:1.6;">
    <h2 style="color:#2F4858;">${T.greet(firstName)}</h2>
    <p>${T.body(nextPaymentDate)}</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://www.memybabyapp.com/?connexion=1" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T.cta}</a>
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

  // Deux webhooks peuvent appeler cette adresse : celui des vrais paiements (STRIPE_WEBHOOK_SECRET)
  // et celui des paiements fictifs des comptes test (STRIPE_TEST_WEBHOOK_SECRET). On accepte
  // l'événement s'il est signé par l'un OU l'autre.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_TEST_WEBHOOK_SECRET].filter(Boolean);
  if (!secrets.length) {
    console.error("STRIPE_WEBHOOK_SECRET manquant.");
    return res.status(500).send("Webhook not configured");
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers["stripe-signature"];

  if (!secrets.some((secret) => verifyStripeSignature(rawBody, signature, secret))) {
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
        // Vraies dates et vrai montant lus dans Stripe (fin d'essai, code promo) ; sinon, ancien calcul.
        const payInfo = await firstPaymentInfo(event, session.subscription).catch(() => null);
        // trialEndStr = fin de l'essai gratuit ; anchorDateStr = date du PREMIER VRAI paiement
        // (repoussée si un code promo rend le ou les premiers mois gratuits). C'est cette date que
        // l'appli utilise pour afficher « Prochain renouvellement » dans Mon abonnement.
        let trialEndStr;
        if (payInfo?.trialEnd) {
          trialEndStr = torontoDay(payInfo.trialEnd);
        } else {
          const anchorDate = new Date();
          anchorDate.setDate(anchorDate.getDate() + TRIAL_DAYS);
          trialEndStr = anchorDate.toISOString().slice(0, 10);
        }
        const anchorDateStr = payInfo?.date ? torontoDay(payInfo.date) : trialEndStr;

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
              const profile = await getProfile("id", userId, "email,first_name,last_name,language");
              if (profile?.email) {
                const lg = safeLang(profile.language);
                const trialEndLabel = formatDateLabel(trialEndStr, lg);
                let priceDisplay = formatMoney(billingCycle === "annual" ? 9900 : 995, "cad", lg);
                let fullPriceDisplay = priceDisplay;
                let firstPayDate = "";
                let mode = "normal";
                if (payInfo) {
                  fullPriceDisplay = formatMoney(payInfo.full, payInfo.currency, lg);
                  priceDisplay = formatMoney(payInfo.amount, payInfo.currency, lg);
                  firstPayDate = payInfo.date ? formatDateLabel(torontoDay(payInfo.date), lg) : "";
                  mode = payInfo.delayed ? "delayed" : payInfo.discounted ? "discounted" : "normal";
                }
                const { subject, html } = buildWelcomeReceiptEmail({
                  firstName: fullName(profile), lang: profile.language, billingCycle, priceDisplay, trialEndDate: trialEndLabel,
                  firstPayDate, fullPriceDisplay, mode,
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
        // Annulation programmée : selon la version de Stripe, elle est indiquée par
        // cancel_at_period_end (anciennes versions) ou par une date cancel_at (versions récentes).
        const prev = event.data.previous_attributes || {};
        const isCancelling = (x) => !!(x?.cancel_at_period_end || x?.cancel_at);
        const cancellingNow = isCancelling(sub);
        const cancelFieldChanged = "cancel_at_period_end" in prev || "cancel_at" in prev;
        const cancellingBefore = cancelFieldChanged ? isCancelling({ ...sub, ...prev }) : cancellingNow;
        let status = "active";
        if (sub.status === "past_due" || sub.status === "unpaid") status = "payment_failed";
        else if (sub.status === "canceled") status = "cancelled";
        else if (sub.status === "active" || sub.status === "trialing") status = "active";

        const updates = { subscription_status: status };
        const accessEnd = sub.cancel_at || subPeriodEnd(sub);
        if (cancellingNow && accessEnd && sub.status !== "past_due" && sub.status !== "unpaid") {
          updates.subscription_status = "cancelled";
          updates.subscription_access_until = torontoDay(accessEnd);
        } else if (status === "active") {
          updates.subscription_access_until = null;
        }

        const matched = await updateProfile("stripe_customer_id", customerId, updates);

        // On envoie le courriel seulement au vrai moment du changement (détecté via
        // previous_attributes), jamais à chaque fois que Stripe renvoie cet événement pour autre chose.
        if (matched > 0) {
          const justCancelled = cancellingNow && !cancellingBefore;
          const justReactivated = !cancellingNow && cancellingBefore;

          if (justCancelled || justReactivated) {
            try {
              const profile = await getProfile("stripe_customer_id", customerId, "email,first_name,last_name,language");
              if (profile?.email) {
                if (justCancelled) {
                  const accessUntilLabel = formatDateLabel(updates.subscription_access_until, safeLang(profile.language));
                  const { subject, html } = buildCancellationEmail({ firstName: fullName(profile), lang: profile.language, accessUntilDate: accessUntilLabel });
                  await sendViaResend({ to: profile.email, subject, html });
                } else {
                  // Date et montant réels du prochain paiement (code promo et taxes compris), lus dans Stripe.
                  const key = event.livemode ? process.env.STRIPE_SECRET_KEY : (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY);
                  const prev = await nextPaymentPreview(key, customerId, sub.id).catch(() => null);
                  const lg = safeLang(profile.language);
                  const when = prev?.date || (sub.status === "trialing" ? sub.trial_end : subPeriodEnd(sub));
                  const nextPaymentLabel = formatDateLabel(torontoDay(when), lg);
                  const amountDisplay = prev && prev.amount !== null && prev.amount !== undefined ? formatMoney(prev.amount, prev.currency, lg) : "";
                  const { subject, html } = buildReactivationEmail({ firstName: fullName(profile), lang: profile.language, nextPaymentDate: nextPaymentLabel, amountDisplay });
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
        const today = torontoDay(Math.floor(Date.now() / 1000));
        const matched = await updateProfile("stripe_customer_id", sub.customer, {
          subscription_status: "cancelled",
          subscription_access_until: today,
        });
        // Courriel « abonnement terminé » — sauf si la personne a supprimé son compte (elle reçoit
        // déjà le courriel de confirmation de suppression, voir delete-account.js).
        const deletedAccount = /^Compte supprimé/.test(sub.cancellation_details?.comment || "");
        if (matched > 0 && !deletedAccount) {
          try {
            const profile = await getProfile("stripe_customer_id", sub.customer, "email,first_name,last_name,language");
            if (profile?.email) {
              const { subject, html } = buildSubscriptionEndedEmail({ firstName: fullName(profile), lang: profile.language });
              await sendViaResend({ to: profile.email, subject, html });
            }
          } catch (emailErr) {
            console.error("[stripe-webhook] échec de l'envoi du courriel de fin d'abonnement:", emailErr);
          }
        }
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
              const profile = await getProfile("stripe_customer_id", invoice.customer, "email,first_name,last_name,language");
              if (profile?.email) {
                const priceDisplay = invoice.amount_due ? formatMoney(invoice.amount_due, invoice.currency, safeLang(profile.language)) : null;
                const { subject, html } = buildPaymentFailedEmail({ firstName: fullName(profile), lang: profile.language, priceDisplay });
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
            const profile = await getProfile("stripe_customer_id", invoice.customer, "email,first_name,last_name,language,billing_cycle");
            if (profile?.email) {
              const priceDisplay = formatMoney(invoice.amount_paid, invoice.currency, safeLang(profile.language));
              // La période couverte par cette facture (invoice.period_end) correspond à la date du
              // prochain paiement pour un abonnement récurrent — pas besoin d'aller rechercher
              // l'abonnement séparément.
              // Fin de la période couverte par ce paiement = date du prochain paiement.
              const periodEnd = invoice.lines?.data?.[0]?.period?.end || invoice.period_end;
              const nextPaymentLabel = periodEnd
                ? formatDateLabel(torontoDay(periodEnd), safeLang(profile.language))
                : "";
              const { subject, html } = buildPaymentReceivedEmail({
                firstName: fullName(profile), lang: profile.language, priceDisplay,
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

// Nom complet tel qu'écrit dans le profil (prénom + nom, si la personne a mis un nom).
function fullName(p) {
  return `${p?.first_name || ""} ${p?.last_name || ""}`.replace(/\s+/g, " ").trim();
}
