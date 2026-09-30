// Construit le courriel du menu de Léa (7 jours + recettes). Même gabarit que celui qui était
// construit dans l'appli, déplacé côté serveur pour que le menu soit préparé en arrière-plan :
// la personne n'a plus besoin de garder l'appli ouverte pendant la préparation.
// Le préfixe "_" du dossier empêche Vercel d'en faire une adresse publique.

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// slot ("breakfast"/"lunch"/"dinner"/"snack", toujours en anglais — voir MENU_JSON_SYSTEM_PROMPT) ->
// libellé affiché + couleurs, pour que chaque repas soit visuellement distinct dans le courriel
// (fond pâle + couleur d'accent), plutôt qu'un bloc de texte uniforme difficile à parcourir.
// "snack" est utilisé quand la personne a choisi une structure de repas avec collations ou petits
// repas multiples (voir MEALS_STRUCTURE_PLAN) — plusieurs collations dans la même journée partagent
// ce même style, ce qui est voulu.
export const MENU_SLOT_META = {
  breakfast: { fr: "Déjeuner", en: "Breakfast", es: "Desayuno", icon: "🌅", bg: "#FBF3E4", accent: "#C98A2E" },
  lunch: { fr: "Dîner", en: "Lunch", es: "Almuerzo", icon: "🥗", bg: "#E4EFDF", accent: "#5B8A5A" },
  dinner: { fr: "Souper", en: "Dinner", es: "Cena", icon: "🍽️", bg: "#EAF2F8", accent: "#2F7A93" },
  snack: { fr: "Collation", en: "Snack", es: "Merienda", icon: "🍎", bg: "#F3ECE0", accent: "#9A7444" },
};

// Construit le courriel HTML coloré à partir du menu structuré (menuData, voir
// MENU_JSON_SYSTEM_PROMPT) — un bloc distinct par repas avec sa propre couleur, les ingrédients et
// les étapes clairement séparés. Si le JSON n'a pas pu être analysé (rawText), on retombe sur un
// rendu texte simple plutôt que de ne rien envoyer.
export function buildMenuEmail(menuData, rawText, lang) {
  const subject = lang === "fr" ? "Votre menu personnalisé Me My Baby 🍽️" : lang === "es" ? "Tu menú personalizado de Me My Baby 🍽️" : "Your personalized Me My Baby menu 🍽️";
  const signoff = lang === "fr" ? "Bon appétit !" : lang === "es" ? "¡Buen provecho!" : "Enjoy your meals!";
  const closing = lang === "fr"
    ? "Envie d'un nouveau menu ou de modifier vos choix ? Connectez-vous à Me My Baby et rendez-vous à la page Léa, notre diététicienne virtuelle."
    : lang === "es"
    ? "¿Quieres un nuevo menú o modificar tus opciones? Inicia sesión en Me My Baby y ve a la página de Léa, nuestra nutricionista virtual."
    : "Want a new menu or to change your choices? Log in to Me My Baby and head to the Léa page, our virtual dietitian.";
  const cta = lang === "fr" ? "Aller à Léa" : lang === "es" ? "Ir a Léa" : "Go to Léa";
  const prepWord = lang === "fr" ? "Prép." : lang === "es" ? "Prep." : "Prep";
  const cookWord = lang === "fr" ? "Cuisson" : lang === "es" ? "Cocción" : "Cook";
  const minWord = lang === "fr" ? "min" : lang === "es" ? "min" : "min";

  let bodyHtml;
  // Courriel COURT : l'aperçu de la semaine seulement (les plats de chaque jour). Les recettes
  // complètes se consultent dans l'appli, après connexion (page Léa → « Mon menu personnalisé »),
  // où chaque plat s'ouvre d'un toucher. Couleurs pâles (plus de grands aplats brun foncé).
  const T = (fr, en, es) => (lang === "fr" ? fr : lang === "es" ? es : en);
  if (menuData && Array.isArray(menuData.days) && menuData.days.length > 0) {
    const days = menuData.days;
    const firstDate = days[0]?.date || "";
    const lastDate = days[days.length - 1]?.date || "";
    const withMeals = days.find((d) => (d.meals || []).length) || days[0];
    const count = (withMeals?.meals || []).length;
    const hasSnacks = days.some((d) => (d.meals || []).some((m) => m.slot === "snack"));
    const perDay = hasSnacks
      ? T(`${count} repas par jour, collations comprises`, `${count} meals a day, snacks included`, `${count} comidas al día, meriendas incluidas`)
      : T("3 repas par jour : déjeuner, dîner et souper", "3 meals a day: breakfast, lunch and dinner", "3 comidas al día: desayuno, almuerzo y cena");

    const header = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6EADB;border-radius:18px;margin:0 0 16px;">
        <tr><td style="padding:20px 22px;color:#6B4A33;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9A7444;">Me My Baby · Léa</div>
          <div style="font-size:22px;font-weight:700;margin:4px 0 6px;color:#5B3A24;">${escapeHtml(T("Votre menu de la semaine", "Your menu for the week", "Tu menú de la semana"))} 🍽️</div>
          <div style="font-size:13.5px;">${escapeHtml(firstDate)}${lastDate && lastDate !== firstDate ? " → " + escapeHtml(lastDate) : ""}</div>
          <div style="font-size:13px;color:#8A7260;margin-top:2px;">${escapeHtml(perDay)}</div>
        </td></tr>
      </table>`;

    const tips = Array.isArray(menuData.tips) ? menuData.tips.slice(0, 2) : [];
    const tipsHtml = tips.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6ED;border-radius:14px;margin:0 0 16px;"><tr><td style="padding:12px 16px;">
          <div style="font-size:12px;font-weight:700;color:#9A7444;text-transform:uppercase;margin-bottom:4px;">💡 ${escapeHtml(T("Les conseils de Léa", "Léa's tips", "Consejos de Léa"))}</div>
          ${tips.map((t) => `<div style="font-size:13px;color:#5A5548;line-height:1.55;margin:3px 0;">• ${escapeHtml(t)}</div>`).join("")}
        </td></tr></table>`
      : "";

    const dayBlocks = days.map((day) => {
      const meals = day.meals || [];
      const rows = meals.length
        ? meals.map((meal) => {
            const meta = MENU_SLOT_META[meal.slot] || MENU_SLOT_META.dinner;
            return `<tr>
              <td style="padding:4px 0;vertical-align:top;width:96px;"><span style="display:inline-block;background:${meta.bg};color:${meta.accent};font-size:11px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap;">${meta.icon} ${escapeHtml(meta[lang] || meta.en)}</span></td>
              <td style="padding:4px 0 4px 8px;vertical-align:top;font-size:14px;line-height:1.35;color:#3A3833;">${escapeHtml(meal.title || "")}</td>
            </tr>`;
          }).join("")
        : `<tr><td style="font-size:13px;color:#7A7364;padding:4px 0;">${escapeHtml(T("Cette journée n'a pas pu être préparée.", "This day couldn't be prepared.", "Este día no se pudo preparar."))}</td></tr>`;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F1;border-left:4px solid #E0CBAF;border-radius:12px;margin:0 0 8px;">
        <tr><td style="padding:10px 14px;">
          <div style="display:inline-block;background:#EFE1CE;color:#5B3A24;font-size:12px;font-weight:700;border-radius:999px;padding:3px 11px;margin-bottom:4px;">${escapeHtml(day.date || "")}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
      </table>`;
    }).join("");

    const recipesNote = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3ECE0;border-radius:14px;margin:16px 0 0;"><tr><td style="padding:14px 16px;text-align:center;">
        <div style="font-size:14px;color:#5B3A24;font-weight:700;margin-bottom:4px;">👩‍🍳 ${escapeHtml(T("Toutes les recettes vous attendent dans l'appli", "All the recipes are waiting for you in the app", "Todas las recetas te esperan en la app"))}</div>
        <div style="font-size:13px;color:#7A7364;line-height:1.5;">${escapeHtml(T("Connectez-vous, allez à la page Léa, puis touchez un plat dans « Mon menu personnalisé » pour voir les ingrédients et les étapes.", "Log in, go to the Léa page, then tap a dish in \"My personalized menu\" to see the ingredients and steps.", "Inicia sesión, ve a la página de Léa y toca un plato en «Mi menú personalizado» para ver los ingredientes y los pasos."))}</div>
      </td></tr></table>`;

    bodyHtml = header + tipsHtml + `<div style="font-size:17px;font-weight:700;color:#5B3A24;margin:0 0 10px;">📅 ${escapeHtml(T("Votre semaine en un coup d'œil", "Your week at a glance", "Tu semana de un vistazo"))}</div>` + dayBlocks + recipesNote;
  } else {
    // Repli : le JSON n'a pas pu être analysé — on envoie quand même le texte reçu.
    bodyHtml = `<div style="white-space:pre-wrap;">${escapeHtml(rawText || "")}</div>`;
  }

  const loginLabel = T("Me connecter pour voir les recettes", "Log in to see the recipes", "Iniciar sesión para ver las recetas");
  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:560px;margin:0 auto;line-height:1.6;">
    ${bodyHtml}
    <div style="text-align:center;margin:20px 0 6px;">
      <a href="https://www.memybabyapp.com" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${loginLabel}</a>
    </div>
    <p style="margin-top:16px;">${signoff}<br>— Léa</p>
  </div>`;
  return { subject, html };
}
