// Envoie chaque matin le courriel du jour (jours 2 à 7) des menus personnalisés de Léa.
// Le jour 1 part tout de suite après la demande (api/lea-menu.js). Ici, on regarde les menus
// demandés depuis moins de 8 jours et on envoie la journée qui correspond à aujourd'hui, une
// seule fois (la liste « sent » garde les journées déjà envoyées).
// Appelé par la tâche quotidienne api/payment-reminders.js (tôt le matin).
// Le préfixe "_" du dossier empêche Vercel d'en faire une adresse publique.

import { SUPABASE_URL, sbHeaders, sbGetPage, sendBatch, runLimited, pause, BATCH_SIZE, BATCH_PAUSE_MS } from "./bulk.js";
import { buildDayEmail, formatNextRequest } from "./menu-email.js";


// Date du jour (AAAA-MM-JJ) à l'heure de Toronto, pour compter les jours de calendrier.
function torontoDay(date) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}
function daysBetween(a, b) {
  return Math.round((Date.parse(torontoDay(b)) - Date.parse(torontoDay(a))) / 86400000);
}

export async function sendLeaDailyEmails(now = new Date(), { deadline = Date.now() + 150000 } = {}) {
  const headers = sbHeaders();
  const since = new Date(now.getTime() - 8 * 86400000).toISOString();
  let sent = 0;
  const errors = [];
  const PAGE = 200; // les menus sont lourds : on les lit 200 à la fois

  // 1. Trouver les courriels à envoyer aujourd'hui (journée du menu = nombre de jours depuis la demande).
  const due = []; // { row, menu, dayIndex, alreadySent }
  for (let offset = 0; ; offset += PAGE) {
    let rows;
    try {
      rows = await sbGetPage(`tracker_entries?type=eq.lea_menu&created_at=gte.${encodeURIComponent(since)}&select=id,user_id,detail,created_at&order=id.asc`, offset, PAGE);
    } catch (e) { errors.push(`lecture des menus: ${e.message}`); break; }
    for (const row of rows) {
      try {
        const menu = JSON.parse(row.detail || "{}");
        const days = Array.isArray(menu.days) ? menu.days : [];
        const alreadySent = Array.isArray(menu.sent) ? menu.sent : [0];
        const dayIndex = daysBetween(menu.requestedAt || row.created_at, now);
        if (dayIndex < 1 || dayIndex >= days.length || alreadySent.includes(dayIndex)) continue;
        const isLast = dayIndex === days.length - 1;
        // Journée vide (préparation ratée) : on la saute, sauf la dernière qui annonce la fin du menu.
        if (!(days[dayIndex]?.meals || []).length && !isLast) continue;
        due.push({ row, menu, dayIndex, alreadySent });
      } catch (e) { errors.push(`menu ${row.id}: ${e.message}`); }
    }
    if (rows.length < PAGE) break;
  }
  if (!due.length) return { sent, errors };

  // 2. Courriels des personnes concernées, lus par paquets.
  const emailOf = {};
  const userIds = [...new Set(due.map((d) => d.row.user_id))];
  for (let i = 0; i < userIds.length; i += 150) {
    const ids = userIds.slice(i, i + 150);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=in.(${ids.join(",")})&select=id,email`, { headers });
    const list = r.ok ? await r.json().catch(() => []) : [];
    for (const p of list || []) emailOf[p.id] = p.email;
  }

  // 3. Envoi par paquets de 100. Chaque journée est notée « envoyée » AVANT l'envoi : jamais de doublon.
  for (let i = 0; i < due.length; i += BATCH_SIZE) {
    if (Date.now() > deadline) { errors.push(`temps écoulé : ${due.length - i} courriel(s) de Léa non envoyé(s)`); break; }
    const chunk = due.slice(i, i + BATCH_SIZE).filter((d) => emailOf[d.row.user_id]);
    const ready = [];
    await runLimited(chunk, 10, async (d) => {
      const newDetail = JSON.stringify({ ...d.menu, sent: [...d.alreadySent, d.dayIndex] });
      const pres = await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries?id=eq.${d.row.id}`, {
        method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ detail: newDetail }),
      }).catch(() => null);
      if (!pres || !pres.ok) { errors.push(`menu ${d.row.id}: ${pres ? pres.status : "réseau"}`); return; }
      const lang = ["fr", "en", "es"].includes(d.menu.lang) ? d.menu.lang : "fr";
      const { subject, html } = buildDayEmail(d.menu, d.dayIndex, lang, formatNextRequest(d.menu.requestedAt || d.row.created_at, lang));
      ready.push({ d, email: { to: emailOf[d.row.user_id], subject, html } });
    });
    if (!ready.length) continue;
    try {
      await sendBatch(ready.map((x) => x.email));
      sent += ready.length;
    } catch (e) {
      errors.push(`paquet de ${ready.length} menus: ${e.message}`);
      // On remet ces journées « à envoyer » pour la prochaine tentative.
      await runLimited(ready, 10, async ({ d }) => {
        await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries?id=eq.${d.row.id}`, {
          method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ detail: JSON.stringify({ ...d.menu, sent: d.alreadySent }) }),
        }).catch(() => {});
      });
    }
    await pause(BATCH_PAUSE_MS);
  }
  return { sent, errors };
}
