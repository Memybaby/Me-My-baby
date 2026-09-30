// Deux modes Stripe en même temps :
//   - VRAIS paiements (clés principales) pour toutes les clientes ;
//   - paiements FICTIFS (clés « TEST ») pour les comptes test de la conceptrice, c'est-à-dire les
//     adresses marilynemd+quelquechose@gmail.com (ex. marilynemd+test0088@gmail.com). Seule
//     Marilyne reçoit les courriels de ces adresses, donc personne d'autre ne peut s'en servir pour
//     s'abonner gratuitement.
//
// Variables Vercel :
//   STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_WEBHOOK_SECRET  -> vrais paiements
//   STRIPE_TEST_SECRET_KEY, STRIPE_TEST_PRICE_MONTHLY, STRIPE_TEST_PRICE_ANNUAL,
//   STRIPE_TEST_WEBHOOK_SECRET                                                          -> paiements fictifs
// Tant que les variables TEST n'existent pas, tout le monde utilise les clés principales.

export function isStripeTester(email) {
  return /^marilynemd\+[^@\s]+@gmail\.com$/.test(String(email || "").trim().toLowerCase());
}

export function hasTestMode() {
  return !!process.env.STRIPE_TEST_SECRET_KEY;
}

// mode : "live" (clés principales) ou "test" (clés TEST, si elles existent).
export function stripeConfig(mode) {
  if (mode === "test" && hasTestMode()) {
    return {
      mode: "test",
      secretKey: process.env.STRIPE_TEST_SECRET_KEY,
      priceMonthly: process.env.STRIPE_TEST_PRICE_MONTHLY,
      priceAnnual: process.env.STRIPE_TEST_PRICE_ANNUAL,
    };
  }
  const key = process.env.STRIPE_SECRET_KEY || "";
  return {
    mode: key.startsWith("sk_live") || key.startsWith("rk_live") ? "live" : "test",
    secretKey: key,
    priceMonthly: process.env.STRIPE_PRICE_MONTHLY,
    priceAnnual: process.env.STRIPE_PRICE_ANNUAL,
  };
}

// Configuration à utiliser pour une personne donnée (d'après son courriel de connexion).
export function stripeConfigForEmail(email) {
  return stripeConfig(isStripeTester(email) ? "test" : "live");
}
