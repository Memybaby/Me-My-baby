// api/create-checkout-session.js
// Crée une session Stripe Checkout pour un abonnement (mensuel ou annuel), avec l'essai gratuit
// de TRIAL_DAYS jours déjà configuré côté app. Aucune dépendance npm : appels directs à l'API
// Stripe via fetch, dans le même style que le reste du projet (connexion Supabase sans SDK).

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const TRIAL_DAYS = 5; // Doit rester synchronisé avec TRIAL_DAYS dans src/App.jsx

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;
  const PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_SECRET_KEY || !PRICE_MONTHLY || !PRICE_ANNUAL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Stripe n'est pas configuré correctement sur le serveur." });
  }

  try {
    const { billingCycle, lang } = req.body || {};
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return res.status(401).json({ error: "Session manquante." });
    }
    if (billingCycle !== "monthly" && billingCycle !== "annual") {
      return res.status(400).json({ error: "Cycle de facturation invalide." });
    }

    // Vérifie le jeton d'accès et récupère l'utilisateur Supabase authentifié — on ne fait jamais
    // confiance à un userId envoyé par le client, seulement à ce que Supabase confirme via le token.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: "Session invalide ou expirée." });
    }
    const user = await userRes.json();
    const userId = user.id;
    const email = user.email;

    // Réutilise le client Stripe existant si cette personne en a déjà un (ex. abonnement précédent
    // annulé), pour garder un seul historique de facturation côté Stripe.
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`,
      { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY } }
    );
    const profileRows = profileRes.ok ? await profileRes.json() : [];
    const existingCustomerId = profileRows?.[0]?.stripe_customer_id || null;

    // Langue des courriels Stripe (reçus, factures, rappels de fin d'essai) : Stripe utilise la
    // langue préférée enregistrée sur le client (preferred_locales). On la fixe à la langue de l'appli.
    const stripeLocale = lang === "fr" ? "fr-CA" : lang === "es" ? "es" : "en";
    const stripeHeaders = {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
    let customerId = existingCustomerId;
    try {
      if (customerId) {
        // Client existant : met à jour sa langue (ex. elle a changé la langue de l'appli).
        const up = new URLSearchParams();
        up.append("preferred_locales[0]", stripeLocale);
        await fetch(`https://api.stripe.com/v1/customers/${customerId}`, { method: "POST", headers: stripeHeaders, body: up.toString() });
      } else if (email) {
        // Nouveau client : on le crée nous-mêmes avec la bonne langue, puis on le garde dans le profil.
        const cp = new URLSearchParams();
        cp.append("email", email);
        cp.append("preferred_locales[0]", stripeLocale);
        cp.append("metadata[supabase_user_id]", userId);
        const cRes = await fetch("https://api.stripe.com/v1/customers", { method: "POST", headers: stripeHeaders, body: cp.toString() });
        const customer = await cRes.json();
        if (cRes.ok && customer.id) {
          customerId = customer.id;
          await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ stripe_customer_id: customer.id }),
          });
        }
      }
    } catch (e) {
      // Si ça échoue, le paiement continue quand même (la page de paiement reste dans la bonne langue).
      console.error("preferred_locales error:", e);
    }

    const priceId = billingCycle === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;
    const origin = req.headers.origin || "https://me-my-baby.vercel.app";

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("subscription_data[trial_period_days]", String(TRIAL_DAYS));
    params.append("client_reference_id", userId);
    params.append("metadata[supabase_user_id]", userId);
    params.append("metadata[billing_cycle]", billingCycle);
    params.append("subscription_data[metadata][supabase_user_id]", userId);
    params.append("subscription_data[metadata][billing_cycle]", billingCycle);
    params.append("success_url", `${origin}/?checkout=success`);
    params.append("cancel_url", `${origin}/?checkout=cancelled`);
    params.append("allow_promotion_codes", "true");
    params.append("locale", lang === "fr" ? "fr" : lang === "es" ? "es" : "en");
    // Carte uniquement (Apple Pay / Google Pay restent disponibles automatiquement via la carte,
    // sur les appareils compatibles) — retire Link, donc aussi son offre "Enregistrer mes
    // informations pour régler plus rapidement", ainsi que la collecte de numéro de taxe entreprise.
    // Note : Managed Payments (activé sur ce compte) gère lui-même les modes de paiement proposés
    // (carte, Link, Apple Pay, Google Pay) et la collecte de numéro de taxe entreprise — Stripe
    // refuse ces deux paramètres tant que Managed Payments est actif, donc on ne les envoie pas ici.

    if (customerId) {
      params.append("customer", customerId);
    } else if (email) {
      params.append("customer_email", email);
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe create-checkout-session error:", session);
      return res.status(500).json({ error: session.error?.message || "Erreur Stripe." });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return res.status(500).json({ error: "Erreur serveur inattendue." });
  }
}
