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

    if (existingCustomerId) {
      params.append("customer", existingCustomerId);
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
