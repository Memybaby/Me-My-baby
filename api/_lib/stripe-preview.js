// Prochain paiement d'un abonnement, tel que Stripe le calculera vraiment : date + montant
// (code promo et taxes compris). Utilisé par la page « Mon abonnement » (create-portal-session.js)
// et par les courriels (stripe-webhook.js), pour que l'appli, les courriels et Stripe disent
// toujours la même chose.
// Le préfixe "_" du dossier empêche Vercel d'en faire une adresse publique.

export async function nextPaymentPreview(key, customerId, subscriptionId) {
  if (!key || !customerId || !subscriptionId) return null;
  const auth = { Authorization: `Bearer ${key}` };

  // L'abonnement (version d'API fixée : les champs trial_end / current_period_end restent au même endroit).
  const sr = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { ...auth, "Stripe-Version": "2024-06-20" },
  });
  const sub = sr.ok ? await sr.json().catch(() => null) : null;
  const date = sub ? (sub.status === "trialing" ? sub.trial_end : sub.current_period_end) || null : null;

  // Aperçu de la prochaine facture (méthode récente de Stripe, puis l'ancienne en secours).
  let inv = null;
  const body = new URLSearchParams({ customer: customerId, subscription: subscriptionId }).toString();
  const pr = await fetch("https://api.stripe.com/v1/invoices/create_preview", {
    method: "POST", headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" }, body,
  });
  if (pr.ok) inv = await pr.json().catch(() => null);
  if (!inv) {
    const ur = await fetch(`https://api.stripe.com/v1/invoices/upcoming?customer=${encodeURIComponent(customerId)}&subscription=${encodeURIComponent(subscriptionId)}`, {
      headers: { ...auth, "Stripe-Version": "2024-06-20" },
    });
    if (ur.ok) inv = await ur.json().catch(() => null);
  }

  return {
    sub,
    date,
    amount: inv ? (inv.amount_due ?? inv.total ?? null) : null,
    currency: inv?.currency || sub?.currency || "cad",
  };
}

// Date AAAA-MM-JJ à l'heure de Montréal (les dates Stripe sont en secondes, en heure universelle).
export function torontoDay(unix) {
  return new Date(unix * 1000).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}
