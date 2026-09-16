// api/stripe-webhook.js
// Reçoit les événements Stripe (paiement réussi, échoué, abonnement annulé, etc.) et met à jour
// Supabase en conséquence — c'est LA source de vérité pour le statut membre, jamais le navigateur.
// Vérification de signature faite à la main (HMAC SHA-256), sans le SDK Stripe, pour rester
// cohérent avec le reste du projet (aucune dépendance npm ajoutée).

import crypto from "crypto";

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

async function updateProfile(filterField, filterValue, updates) {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?${filterField}=eq.${filterValue}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(updates),
  });
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
        const TRIAL_DAYS = 5; // garder synchronisé avec create-checkout-session.js et App.jsx
        const anchorDate = new Date();
        anchorDate.setDate(anchorDate.getDate() + TRIAL_DAYS);
        const anchorDateStr = anchorDate.toISOString().slice(0, 10);

        if (userId) {
          await updateProfile("id", userId, {
            subscription_status: "active",
            billing_cycle: billingCycle,
            billing_anchor_date: anchorDateStr,
            subscription_access_until: null,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          });
        }
        break;
      }

      // Changements de statut d'un abonnement existant (échec de paiement récupéré, passage en
      // souffrance, annulation programmée en fin de période, etc.)
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer;
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

        await updateProfile("stripe_customer_id", customerId, updates);
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

      // Échec d'un paiement récurrent : l'app bloque déjà l'accès sur subscription_status ===
      // "payment_failed", et le cron payment-reminders.js existant s'occupe de l'email.
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.customer) {
          await updateProfile("stripe_customer_id", invoice.customer, {
            subscription_status: "payment_failed",
          });
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
