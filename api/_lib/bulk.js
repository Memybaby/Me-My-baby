// Outils pour les envois en grand nombre (infolettre, menus de Léa, rappels).
// - sbGetAllRows : lit une table Supabase au complet, 1000 lignes à la fois (Supabase n'en donne
//   jamais plus de 1000 d'un coup — sans ça, les membres au-delà de 1000 seraient oubliés).
// - sendBatch : envoie jusqu'à 100 courriels en UN seul appel à Resend (au lieu d'un par un).
// - pause : respecte la limite de Resend (2 appels par seconde).
// Le préfixe "_" du dossier empêche Vercel d'en faire une adresse publique.

export const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
export const FROM = "Me My Baby <noreply@memybabyapp.com>";
export const REPLY_TO = "Memybaby.app@gmail.com";
export const BATCH_SIZE = 100;
export const BATCH_PAUSE_MS = 600;

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export function sbHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

// Lit toutes les lignes (path sans limit/offset, avec un order= pour un résultat stable).
export async function sbGetAllRows(path, { pageSize = 1000, max = 1000000 } = {}) {
  const out = [];
  for (let offset = 0; offset < max; offset += pageSize) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}${path.includes("?") ? "&" : "?"}limit=${pageSize}&offset=${offset}`, { headers: sbHeaders() });
    if (!r.ok) throw new Error(`Lecture Supabase ${path.split("?")[0]} : ${r.status}`);
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error(`Lecture Supabase ${path.split("?")[0]} : réponse inattendue`);
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

// Une page à la fois (pour les tables aux lignes lourdes, ex. les menus de Léa).
export async function sbGetPage(path, offset, pageSize) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}${path.includes("?") ? "&" : "?"}limit=${pageSize}&offset=${offset}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`Lecture Supabase ${path.split("?")[0]} : ${r.status}`);
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

// Mise à jour de plusieurs lignes d'un coup (même valeur), par paquets d'identifiants.
export async function sbPatchIds(table, ids, values, idCol = "id") {
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${idCol}=in.(${chunk.map(encodeURIComponent).join(",")})`, {
      method: "PATCH", headers: sbHeaders({ Prefer: "return=minimal" }), body: JSON.stringify(values),
    });
    if (!r.ok) throw new Error(`Mise à jour ${table} : ${r.status}`);
  }
}

// Envoie jusqu'à 100 courriels en un seul appel. emails = [{ to, subject, html }].
// Réessaie une fois si Resend demande de ralentir (429) ou a un problème passager (5xx).
export async function sendBatch(emails) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY manquante côté serveur.");
  if (!emails.length) return;
  if (emails.length > BATCH_SIZE) throw new Error("Maximum 100 courriels par envoi groupé.");
  const body = JSON.stringify(emails.map((e) => ({ from: FROM, reply_to: REPLY_TO, to: [e.to], subject: e.subject, html: e.html })));
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body,
    });
    if (r.ok) return;
    const data = await r.json().catch(() => ({}));
    if ((r.status === 429 || r.status >= 500) && attempt < 2) { await pause(1500 * (attempt + 1)); continue; }
    throw new Error(data?.message || `Échec de l'envoi groupé via Resend (${r.status}).`);
  }
}

// Exécute des tâches avec au plus « limit » en même temps.
export async function runLimited(items, limit, fn) {
  let i = 0;
  const worker = async () => { while (i < items.length) { const it = items[i++]; await fn(it); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
