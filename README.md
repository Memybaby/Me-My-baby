# Me My Baby

Application de grossesse et de parentalité (conception → 5 ans), trilingue FR/EN/ES.

## Déploiement (GitHub + Vercel, sans installation locale)

1. Crée un nouveau dépôt sur GitHub (public ou privé, au choix).
2. Ajoute tous les fichiers de ce dossier dans le dépôt (via l'interface web GitHub :
   "Add file" → "Upload files", glisser-déposer tous les fichiers en conservant
   la structure des dossiers, notamment `src/`).
3. Va sur vercel.com, connecte-toi avec ton compte GitHub.
4. "Add New Project" → sélectionne le dépôt que tu viens de créer.
5. Vercel détecte automatiquement Vite — ne change rien aux réglages, clique "Deploy".
6. Après 1-2 minutes, ton app est en ligne sur une adresse du type
   `me-my-baby.vercel.app`.

Chaque fois que tu mets à jour `src/App.jsx` sur GitHub, Vercel redéploie
automatiquement la nouvelle version en quelques minutes.

## Structure du projet

```
index.html          → page HTML de base
src/main.jsx         → point d'entrée React
src/App.jsx           → toute l'application (fourni par Claude)
package.json         → dépendances (React, lucide-react, Vite)
vite.config.js        → configuration du bundler
```
