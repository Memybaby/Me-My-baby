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
  if (menuData && Array.isArray(menuData.days) && menuData.days.length > 0) {
    // UN SEUL courriel, organisé comme les menus de Léa dans l'appli :
    //  1) « Votre semaine en un coup d'œil » : une bande colorée par jour, avec chaque repas ;
    //     toucher un plat saute directement à sa recette plus bas dans le courriel.
    //  2) « Les recettes » : chaque recette complète (ingrédients + étapes), avec un lien pour
    //     remonter au menu de la semaine.
    // Mise en page en tableaux HTML (et non en flex/grid) : c'est ce que Gmail, Outlook et
    // Apple Mail affichent tous correctement.
    const T = (fr, en, es) => (lang === "fr" ? fr : lang === "es" ? es : en);
    const days = menuData.days;
    const firstDate = days[0]?.date || "";
    const lastDate = days[days.length - 1]?.date || "";
    const firstDayMealCount = (days.find((d) => (d.meals || []).length) || days[0])?.meals?.length || 0;
    const hasSnacks = days.some((d) => (d.meals || []).some((m) => m.slot === "snack"));
    const mealsPerDayText = hasSnacks
      ? T(`${firstDayMealCount} repas par jour, collations comprises`, `${firstDayMealCount} meals a day, snacks included`, `${firstDayMealCount} comidas al día, meriendas incluidas`)
      : T("3 repas par jour : déjeuner, dîner et souper", "3 meals a day: breakfast, lunch and dinner", "3 comidas al día: desayuno, almuerzo y cena");
    const anchor = (di, mi) => `mmb-r-${di}-${mi}`;
    const link = (id, label, color) => `<a href="#${id}" style="color:${color};text-decoration:none;">${label}</a>`;

    const headerHtml = `
      <a name="mmb-top" id="mmb-top"></a>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#5B3A24;border-radius:18px;margin:0 0 18px;">
        <tr><td style="padding:22px 22px 20px;color:#fff;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:0.85;">Me My Baby · Léa</div>
          <div style="font-size:24px;font-weight:700;margin:4px 0 6px;">${escapeHtml(T("Votre menu de la semaine", "Your menu for the week", "Tu menú de la semana"))} 🍽️</div>
          <div style="font-size:13.5px;opacity:0.92;">${escapeHtml(firstDate)}${lastDate && lastDate !== firstDate ? " → " + escapeHtml(lastDate) : ""}</div>
          <div style="font-size:13px;opacity:0.85;margin-top:2px;">${escapeHtml(mealsPerDayText)}</div>
        </td></tr>
      </table>`;

    const tipsHtml = Array.isArray(menuData.tips) && menuData.tips.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6ED;border-radius:14px;margin:0 0 20px;"><tr><td style="padding:12px 16px;">
          <div style="font-size:12px;font-weight:700;color:#9A7444;text-transform:uppercase;margin-bottom:4px;">💡 ${escapeHtml(T("Les conseils de Léa", "Léa's tips", "Consejos de Léa"))}</div>
          ${menuData.tips.map((t) => `<div style="font-size:13px;color:#5A5548;line-height:1.55;margin:2px 0;">• ${escapeHtml(t)}</div>`).join("")}
        </td></tr></table>`
      : "";

    // 1) La semaine en un coup d'œil
    const overviewRows = days.map((day, di) => {
      const meals = day.meals || [];
      const mealsHtml = meals.length
        ? meals.map((meal, mi) => {
            const meta = MENU_SLOT_META[meal.slot] || MENU_SLOT_META.dinner;
            return `<tr>
              <td style="padding:5px 0;vertical-align:top;width:92px;">
                <span style="display:inline-block;background:${meta.bg};color:${meta.accent};font-size:11px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap;">${meta.icon} ${escapeHtml(meta[lang] || meta.en)}</span>
              </td>
              <td style="padding:5px 0 5px 8px;vertical-align:top;font-size:14px;line-height:1.35;">
                ${link(anchor(di, mi), `<span style="color:#3A3833;font-weight:600;">${escapeHtml(meal.title || "")}</span><br><span style="font-size:11.5px;color:${meta.accent};font-weight:700;text-decoration:underline;">${escapeHtml(T("Voir la recette ↓", "View recipe ↓", "Ver la receta ↓"))}</span>`, meta.accent)}
              </td>
            </tr>`;
          }).join("")
        : `<tr><td style="font-size:13px;color:#7A7364;padding:4px 0;">${escapeHtml(T("Cette journée n'a pas pu être préparée. Vous pourrez redemander un menu à Léa.", "This day couldn't be prepared. You can ask Léa for a new menu.", "Este día no se pudo preparar. Podrás pedirle un nuevo menú a Léa."))}</td></tr>`;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3ECE0;border-left:5px solid #5B3A24;border-radius:14px;margin:0 0 10px;">
        <tr><td style="padding:12px 14px;">
          <div style="display:inline-block;background:#5B3A24;color:#fff;font-size:12.5px;font-weight:700;border-radius:999px;padding:4px 12px;margin-bottom:6px;">${escapeHtml(day.date || "")}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${mealsHtml}</table>
        </td></tr>
      </table>`;
    }).join("");

    const overviewHtml = `
      <div style="font-size:18px;font-weight:700;color:#5B3A24;margin:0 0 4px;">📅 ${escapeHtml(T("Votre semaine en un coup d'œil", "Your week at a glance", "Tu semana de un vistazo"))}</div>
      <div style="font-size:12.5px;color:#7A7364;margin:0 0 12px;line-height:1.5;">${escapeHtml(T(
        "Touchez un plat pour aller directement à sa recette. Si votre application de courriel ne se déplace pas toute seule, les recettes sont juste en dessous, dans le même ordre.",
        "Tap a dish to jump straight to its recipe. If your email app doesn't jump on its own, the recipes are just below, in the same order.",
        "Toca un plato para ir directamente a su receta. Si tu aplicación de correo no se desplaza sola, las recetas están justo debajo, en el mismo orden."))}</div>
      ${overviewRows}`;

    // 2) Les recettes complètes
    const recipesHtml = days.map((day, di) => {
      const meals = day.meals || [];
      if (!meals.length) return "";
      const cards = meals.map((meal, mi) => {
        const meta = MENU_SLOT_META[meal.slot] || MENU_SLOT_META.dinner;
        const timeParts = [];
        if (meal.prep) timeParts.push(`⏱️ ${prepWord} ${meal.prep} ${minWord}`);
        if (meal.cook) timeParts.push(`🔥 ${cookWord} ${meal.cook} ${minWord}`);
        const ingredientsHtml = (meal.ingredients || []).map((i) => `<li style="margin:0 0 4px;">${escapeHtml(i)}</li>`).join("");
        const stepsHtml = (meal.steps || []).map((st) => `<li style="margin:0 0 7px;">${escapeHtml(st)}</li>`).join("");
        return `<a name="${anchor(di, mi)}" id="${anchor(di, mi)}"></a>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${meta.accent}33;border-top:4px solid ${meta.accent};border-radius:14px;margin:0 0 14px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:11.5px;font-weight:700;color:${meta.accent};text-transform:uppercase;letter-spacing:0.5px;">${meta.icon} ${escapeHtml(meta[lang] || meta.en)} · ${escapeHtml(day.date || "")}</div>
            <div style="font-size:18px;font-weight:700;color:#3A3833;margin:4px 0 6px;line-height:1.3;">${escapeHtml(meal.title || "")}</div>
            ${timeParts.length ? `<div style="font-size:12px;color:#7A7364;margin-bottom:10px;">${timeParts.join(" &nbsp;·&nbsp; ")}</div>` : ""}
            <div style="background:${meta.bg};border-radius:10px;padding:10px 14px;margin:0 0 12px;">
              <div style="font-size:12px;font-weight:800;color:${meta.accent};text-transform:uppercase;margin-bottom:4px;">${lang === "fr" ? "Ingrédients" : lang === "es" ? "Ingredientes" : "Ingredients"}</div>
              <ul style="margin:0;padding-left:18px;font-size:13.5px;color:#3A3833;line-height:1.5;">${ingredientsHtml}</ul>
            </div>
            <div style="font-size:12px;font-weight:800;color:${meta.accent};text-transform:uppercase;margin-bottom:4px;">${lang === "fr" ? "Préparation" : lang === "es" ? "Preparación" : "Method"}</div>
            <ol style="margin:0 0 10px;padding-left:20px;font-size:13.5px;color:#3A3833;line-height:1.55;">${stepsHtml}</ol>
            <div style="text-align:right;">${link("mmb-top", `<span style="font-size:12px;font-weight:700;text-decoration:underline;">${escapeHtml(T("↑ Retour au menu de la semaine", "↑ Back to the week's menu", "↑ Volver al menú de la semana"))}</span>`, meta.accent)}</div>
          </td></tr>
        </table>`;
      }).join("");
      return `<div style="background:#5B3A24;color:#fff;font-weight:700;font-size:14px;padding:8px 14px;border-radius:10px;margin:18px 0 10px;">${escapeHtml(day.date || "")}</div>${cards}`;
    }).join("");

    bodyHtml = headerHtml + tipsHtml + overviewHtml +
      `<div style="font-size:18px;font-weight:700;color:#5B3A24;margin:26px 0 4px;">👩‍🍳 ${escapeHtml(T("Les recettes", "The recipes", "Las recetas"))}</div>` +
      recipesHtml;
  } else {
    // Repli : le JSON n'a pas pu être analysé — on affiche quand même le texte reçu plutôt que de
    // bloquer l'envoi, dans une mise en page simple.
    bodyHtml = `<div style="white-space:pre-wrap;">${escapeHtml(rawText || "")}</div>`;
  }

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:560px;margin:0 auto;line-height:1.6;">
    ${bodyHtml}
    <p style="margin-top:6px;">${signoff}<br>— Léa</p>
    <div style="background:#FBF6ED;border-radius:14px;padding:16px 18px;margin:24px 0 0;">
      <p style="margin:0;font-size:13px;color:#7A7364;">${closing}</p>
    </div>
    <div style="text-align:center;margin:20px 0 0;">
      <a href="https://www.memybabyapp.com" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${cta}</a>
    </div>
  </div>`;
  return { subject, html };
}
