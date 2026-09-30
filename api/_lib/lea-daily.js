// Envoie chaque matin le courriel du jour (jours 2 à 7) des menus personnalisés de Léa.
// Le jour 1 part tout de suite après la demande (api/lea-menu.js). Ici, on regarde les menus
// demandés depuis moins de 8 jours et on envoie la journée qui correspond à aujourd'hui, une
// seule fois (la liste « sent » garde les journées déjà envoyées).
// Appelé par la tâche quotidienne api/payment-reminders.js (tôt le matin).
// Le préfixe "_" du dossier empêche Vercel d'en faire une adresse publique.

import { sendViaResend } from "./resend.js";
import { buildDayEmail, formatNextRequest } from "./menu-email.js";

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";

// Date du jour (AAAA-MM-JJ) à l'heure de Toronto, pour compter les jours de calendrier.
function torontoDay(date) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}
function daysBetween(a, b) {
  return Math.round((Date.parse(torontoDay(b)) - Date.parse(torontoDay(a))) / 86400000);
}

export async function sendLeaDailyEmails(now = new Date()) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const since = new Date(now.getTime() - 8 * 86400000).toISOString();
  let sent = 0;
  const errors = [];

  const r = await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries?type=eq.lea_menu&created_at=gte.${encodeURIComponent(since)}&select=id,user_id,detail,created_at`, { headers });
  if (!r.ok) return { sent, errors: [`lecture des menus: ${r.status}`] };
  const rows = await r.json().catch(() => []);

  for (const row of rows || []) {
    try {
      const menu = JSON.parse(row.detail || "{}");
      const days = Array.isArray(menu.days) ? menu.days : [];
      const alreadySent = Array.isArray(menu.sent) ? menu.sent : [0];
      const dayIndex = daysBetween(menu.requestedAt || row.created_at, now);
      if (dayIndex < 1 || dayIndex >= days.length || alreadySent.includes(dayIndex)) continue;
      const isLast = dayIndex === days.length - 1;
      // Journée vide (préparation ratée) : on la saute, sauf la dernière qui annonce la fin du menu.
      if (!(days[dayIndex]?.meals || []).length && !isLast) continue;

      const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${row.user_id}&select=email`, { headers });
      const email = pr.ok ? (await pr.json().catch(() => []))?.[0]?.email : null;
      if (!email) continue;

      const lang = ["fr", "en", "es"].includes(menu.lang) ? menu.lang : "fr";
      const { subject, html } = buildDayEmail(menu, dayIndex, lang, formatNextRequest(menu.requestedAt || row.created_at, lang));
      // On note la journée comme envoyée AVANT l'envoi : jamais de doublon, même si la tâche repasse.
      const newDetail = JSON.stringify({ ...menu, sent: [...alreadySent, dayIndex] });
      const pres = await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries?id=eq.${row.id}`, {
        method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ detail: newDetail }),
      });
      if (!pres.ok) { errors.push(`menu ${row.id}: ${pres.status}`); continue; }
      await sendViaResend({ to: email, subject, html });
      sent += 1;
      await new Promise((res) => setTimeout(res, 550));
    } catch (e) {
      errors.push(`menu ${row.id}: ${e.message}`);
    }
  }
  return { sent, errors };
}
