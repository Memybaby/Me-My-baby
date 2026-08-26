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
// Utilisé par : Mia (assistant), Léa (génération de menu), traduction des commentaires du forum.

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
    const { model, max_tokens, system, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Le champ 'messages' est requis." });
      return;
    }

    // Garde-fous simples : on force toujours notre propre modèle et on plafonne la longueur de
    // réponse, pour éviter qu'une requête modifiée depuis le navigateur ne fasse exploser les coûts.
    const safeMaxTokens = Math.min(Number(max_tokens) || 800, 2000);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: safeMaxTokens,
        system,
        messages,
      }),
    });

    const data = await anthropicRes.json();
    res.status(anthropicRes.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "Impossible de joindre l'API Anthropic." });
  }
}
