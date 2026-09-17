// api/create-portal-session.js
// Crée une session vers le "Customer Portal" de Stripe — une page hébergée par Stripe où la
// personne peut annuler, réactiver, changer de mode de paiement et consulter ses factures, en toute
// sécurité, avec de vrais effets sur son vrai abonnement (contrairement à l'ancienne simulation
// locale qui ne touchait jamais réellement à Stripe).

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_SECRET_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Stripe n'est pas configuré correctement sur le serveur." });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return res.status(401).json({ error: "Session manquante." });
    }

    // Vérifie le jeton d'accès et récupère l'utilisateur Supabase authentifié.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: "Session invalide ou expirée." });
    }
    const user = await userRes.json();

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=stripe_customer_id`,
      { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY } }
    );
    const rows = await profileRes.json().catch(() => []);
    const customerId = rows?.[0]?.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: "Aucun abonnement Stripe trouvé pour ce compte." });
    }

    const origin = req.headers.origin || "https://me-my-baby.vercel.app";
    const params = new URLSearchParams();
    params.append("customer", customerId);
    params.append("return_url", `${origin}/?portal=return`);

    const stripeRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const portalSession = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error("Stripe create-portal-session error:", portalSession);
      return res.status(500).json({ error: portalSession.error?.message || "Erreur Stripe." });
    }

    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error("create-portal-session error:", err);
    return res.status(500).json({ error: "Erreur serveur inattendue." });
  }
}
