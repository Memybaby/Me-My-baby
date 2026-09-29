// Fonction serverless Vercel — relais sécurisé vers l'API Anthropic.
//
// Pourquoi ce fichier existe :
// Le front-end (App.jsx) ne doit JAMAIS contenir la vraie clé API Anthropic, sinon n'importe qui
// pourrait l'extraire en inspectant le code de la page et l'utiliser à nos frais. Ce fichier tourne
// côté serveur (sur Vercel, jamais envoyé au navigateur) et lui seul connaît la vraie clé, lue depuis
// une variable d'environnement. Le front-end appelle "/api/chat" au lieu d'appeler Anthropic
// directement; cette fonction relaie la demande et renvoie la réponse.
//
// Mise en place requise sur Vercel (une seule fois) :
//   1. Aller dans le projet sur vercel.com → Settings → Environment Variables
//   2. Ajouter une variable nommée ANTHROPIC_API_KEY, avec ta clé (obtenue sur console.anthropic.com)
//   3. Redéployer le projet (ou le prochain push GitHub redéploiera automatiquement)
//
// Utilisé par : Mia (assistant, en mode streaming), Léa (génération de menu), traduction des
// commentaires du forum.
//
// Le mode streaming (quand le front-end envoie { stream: true }) relaie les évènements de l'API
// Anthropic au fur et à mesure qu'ils arrivent, plutôt que d'attendre la réponse complète — c'est ce
// qui permet à Mia d'afficher sa réponse en train de s'écrire, comme dans une vraie conversation.

// SÉCURITÉ : cette adresse est publique. Sans vérification, n'importe qui sur Internet pourrait
// s'en servir pour utiliser l'intelligence artificielle à nos frais. On exige donc une personne
// CONNECTÉE à Me My Baby (jeton Supabase vérifié), un modèle autorisé seulement, et une taille
// de demande raisonnable.
// Un menu complet d'une journée peut prendre 30 à 60 secondes à écrire : on donne à cette
// fonction jusqu'à 60 secondes (la limite par défaut de Vercel peut être seulement de 10 s,
// ce qui coupait la préparation des menus de Léa en plein milieu).
export const config = { maxDuration: 60 };

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const ALLOWED_MODELS = ["claude-sonnet-4-6"];
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 100000;

async function isLoggedIn(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !key) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: key },
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Clé API manquante côté serveur (ANTHROPIC_API_KEY non configurée sur Vercel)." });
    return;
  }

  try {
    const { model, max_tokens, system, messages, stream } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Le champ 'messages' est requis." });
      return;
    }

    if (!(await isLoggedIn(req))) {
      res.status(401).json({ error: "Connexion requise." });
      return;
    }
    // Longue conversation avec Novaris : on garde seulement les derniers messages (le début
    // doit rester une question de la personne, comme l'exige l'API).
    let trimmed = messages.slice(-MAX_MESSAGES);
    while (trimmed.length > 1 && trimmed[0]?.role !== "user") trimmed = trimmed.slice(1);
    const totalChars = JSON.stringify(trimmed).length + (typeof system === "string" ? system.length : JSON.stringify(system || "").length);
    if (totalChars > MAX_TOTAL_CHARS) {
      res.status(413).json({ error: "Demande trop longue." });
      return;
    }
    const safeModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    // Garde-fous simples : seul un modèle de la liste ALLOWED_MODELS est accepté, et on plafonne la longueur de
    // réponse, pour éviter qu'une requête modifiée depuis le navigateur ne fasse exploser les coûts.
    const safeMaxTokens = Math.min(Number(max_tokens) || 800, 4500); // Léa demande jusqu'à 4200 pour un menu complet
    const wantsStream = !!stream;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: safeModel,
        max_tokens: safeMaxTokens,
        system,
        messages: trimmed,
        stream: wantsStream,
      }),
    });

    // Mode normal (réponse complète d'un coup) — utilisé par Léa et la traduction du forum.
    if (!wantsStream) {
      const data = await anthropicRes.json();
      res.status(anthropicRes.status).json(data);
      return;
    }

    // Mode streaming — utilisé par Mia. On relaie tel quel le flux d'évènements SSE d'Anthropic.
    if (!anthropicRes.ok || !anthropicRes.body) {
      const errData = await anthropicRes.json().catch(() => ({}));
      res.status(anthropicRes.status || 500).json(errData);
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const reader = anthropicRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Impossible de joindre l'API Anthropic." });
    } else {
      res.end();
    }
  }
}
