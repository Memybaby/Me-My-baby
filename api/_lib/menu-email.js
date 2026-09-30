// Courriels du menu de Léa : UN courriel par jour pendant 7 jours, chaque matin, avec les repas de
// la journée et leurs recettes. Court et simple. (Le jour 1 part juste après la demande ; les jours
// 2 à 7 partent chaque matin grâce à _lib/lea-daily.js.)
// Le préfixe "_" du dossier empêche Vercel d'en faire une adresse publique.

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// slot ("breakfast"/"lunch"/"dinner"/"snack", toujours en anglais — voir MENU_JSON_SYSTEM_PROMPT) ->
// libellé affiché + couleurs pâles pour distinguer chaque repas.
export const MENU_SLOT_META = {
  breakfast: { fr: "Déjeuner", en: "Breakfast", es: "Desayuno", icon: "🌅", bg: "#FBF3E4", accent: "#C98A2E" },
  lunch: { fr: "Dîner", en: "Lunch", es: "Almuerzo", icon: "🥗", bg: "#E4EFDF", accent: "#5B8A5A" },
  dinner: { fr: "Souper", en: "Dinner", es: "Cena", icon: "🍽️", bg: "#EAF2F8", accent: "#2F7A93" },
  snack: { fr: "Collation", en: "Snack", es: "Merienda", icon: "🍎", bg: "#F3ECE0", accent: "#9A7444" },
};

const LOGIN_URL = "https://www.memybabyapp.com/?connexion=1";

// Courriel d'UNE journée (dayIndex 0 à 6).
export function buildDayEmail(menu, dayIndex, lang, nextRequestLabel = "") {
  const T = (fr, en, es) => (lang === "fr" ? fr : lang === "es" ? es : en);
  const days = menu.days || [];
  const day = days[dayIndex] || { meals: [] };
  const total = days.length || 7;
  const n = dayIndex + 1;
  const subject = n >= total && total > 1
    ? T(`Dernier jour de votre menu — jour ${n} de ${total} 🍽️`, `Last day of your menu — day ${n} of ${total} 🍽️`, `Último día de tu menú — día ${n} de ${total} 🍽️`)
    : n === 1 ? T(`Votre menu personnalisé est prêt — jour 1 de ${total} 🍽️`, `Your personalized menu is ready — day 1 of ${total} 🍽️`, `Tu menú personalizado está listo — día 1 de ${total} 🍽️`)
    : T(`Votre menu du jour — jour ${n} de ${total} 🍽️`, `Your menu for today — day ${n} of ${total} 🍽️`, `Tu menú del día — día ${n} de ${total} 🍽️`);
  const tip = (menu.tips || [])[dayIndex % Math.max(1, (menu.tips || []).length)];
  const prepWord = T("Prép.", "Prep", "Prep.");
  const cookWord = T("Cuisson", "Cook", "Cocción");

  const header = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6EADB;border-radius:16px;margin:0 0 14px;">
      <tr><td style="padding:16px 20px;color:#6B4A33;">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9A7444;">Me My Baby · Léa · ${escapeHtml(T(`Jour ${n} de ${total}`, `Day ${n} of ${total}`, `Día ${n} de ${total}`))}</div>
        <div style="font-size:20px;font-weight:700;margin:4px 0 2px;color:#5B3A24;">${escapeHtml(T("Votre menu du jour", "Your menu for today", "Tu menú del día"))} 🍽️</div>
        <div style="font-size:13.5px;">${escapeHtml(day.date || "")}</div>
      </td></tr>
    </table>`;

  // Jour 1 : on explique le fonctionnement (un courriel chaque matin pendant 7 jours).
  const introHtml = dayIndex === 0
    ? `<p style="margin:0 0 14px;font-size:14px;color:#3A3833;background:#FBF3E4;border-radius:12px;padding:12px 14px;line-height:1.55;">${escapeHtml(T(
        `Bonjour ! Votre menu personnalisé est prêt 💛 Il vous sera envoyé sur ${total} jours : chaque matin, vous recevrez un courriel avec les repas de la journée et leurs recettes. Voici le menu d'aujourd'hui.`,
        `Hello! Your personalized menu is ready 💛 It will be sent over ${total} days: every morning, you'll receive an email with that day's meals and their recipes. Here is today's menu.`,
        `¡Hola! Tu menú personalizado está listo 💛 Se enviará durante ${total} días: cada mañana recibirás un correo con las comidas del día y sus recetas. Aquí está el menú de hoy.`))}</p>`
    : "";

  const tipHtml = tip && dayIndex < 2
    ? `<p style="margin:0 0 14px;font-size:13px;color:#5A5548;background:#FBF6ED;border-radius:12px;padding:10px 14px;">💡 ${escapeHtml(tip)}</p>`
    : "";

  const meals = (day.meals || []).map((meal) => {
    const meta = MENU_SLOT_META[meal.slot] || MENU_SLOT_META.dinner;
    const times = [];
    if (meal.prep) times.push(`⏱️ ${prepWord} ${meal.prep} min`);
    if (meal.cook) times.push(`🔥 ${cookWord} ${meal.cook} min`);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #EFE4D4;border-top:3px solid ${meta.accent};border-radius:12px;margin:0 0 12px;">
        <tr><td style="padding:12px 14px;">
          <div style="font-size:11.5px;font-weight:700;color:${meta.accent};text-transform:uppercase;letter-spacing:0.5px;">${meta.icon} ${escapeHtml(meta[lang] || meta.en)}</div>
          <div style="font-size:16px;font-weight:700;color:#3A3833;margin:3px 0 4px;line-height:1.3;">${escapeHtml(meal.title || "")}</div>
          ${times.length ? `<div style="font-size:12px;color:#7A7364;margin-bottom:8px;">${times.join(" &nbsp;·&nbsp; ")}</div>` : ""}
          <div style="background:${meta.bg};border-radius:10px;padding:8px 12px;margin:0 0 10px;">
            <div style="font-size:11.5px;font-weight:800;color:${meta.accent};text-transform:uppercase;margin-bottom:3px;">${T("Ingrédients", "Ingredients", "Ingredientes")}</div>
            <ul style="margin:0;padding-left:18px;font-size:13.5px;color:#3A3833;line-height:1.5;">${(meal.ingredients || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
          </div>
          <div style="font-size:11.5px;font-weight:800;color:${meta.accent};text-transform:uppercase;margin-bottom:3px;">${T("Préparation", "Method", "Preparación")}</div>
          <ol style="margin:0;padding-left:20px;font-size:13.5px;color:#3A3833;line-height:1.5;">${(meal.steps || []).map((st) => `<li style="margin-bottom:5px;">${escapeHtml(String(st).replace(/^\s*\d+\s*[.)]\s*/, ""))}</li>`).join("")}</ol>
        </td></tr>
      </table>`;
  }).join("");

  const isLast = n >= total;
  const whenNew = nextRequestLabel
    ? T(`dès le ${nextRequestLabel}`, `from ${nextRequestLabel}`, `a partir del ${nextRequestLabel}`)
    : T("dès demain", "from tomorrow", "a partir de mañana");
  const nextNote = isLast
    ? T(`C'est la dernière journée de votre menu personnalisé ! Vous pourrez faire une nouvelle demande de menu personnalisé à Léa ${whenNew}, dans l'appli. Léa vous préparera 7 nouvelles journées de repas selon vos goûts.`,
        `This is the last day of your personalized menu! You can request a new personalized menu from Léa ${whenNew}, in the app. Léa will prepare 7 new days of meals to suit your tastes.`,
        `¡Este es el último día de tu menú personalizado! Podrás pedirle a Léa un nuevo menú personalizado ${whenNew}, en la app. Léa te preparará 7 nuevos días de comidas según tus gustos.`)
    : T(`Demain matin : le menu du jour ${n + 1}.`, `Tomorrow morning: the menu for day ${n + 1}.`, `Mañana por la mañana: el menú del día ${n + 1}.`);
  const nextHtml = isLast
    ? `<p style="margin:14px 0 0;font-size:14px;color:#3A3833;background:#E4EFDF;border-radius:12px;padding:12px 14px;line-height:1.55;">🎉 ${escapeHtml(nextNote)}</p>`
    : `<p style="margin:14px 0 0;font-size:13px;color:#7A7364;">${escapeHtml(nextNote)}</p>`;

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:560px;margin:0 auto;line-height:1.6;">
    ${header}${introHtml}${tipHtml}${meals}
    ${nextHtml}
    <div style="text-align:center;margin:18px 0 6px;">
      <a href="${LOGIN_URL}" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${T("Me connecter à Me My Baby", "Log in to Me My Baby", "Iniciar sesión en Me My Baby")}</a>
    </div>
    <p style="margin-top:14px;">${T("Bon appétit !", "Enjoy your meals!", "¡Buen provecho!")}<br>— Léa</p>
  </div>`;
  return { subject, html };
}

// Date à partir de laquelle une nouvelle demande de menu est permise (demande + 7 jours),
// écrite dans la langue de la personne, ex. « mardi 6 octobre ».
export function formatNextRequest(requestedAt, lang) {
  const t = new Date(requestedAt || "").getTime();
  if (!Number.isFinite(t)) return "";
  const locale = lang === "fr" ? "fr-CA" : lang === "es" ? "es-ES" : "en-CA";
  try {
    return new Date(t + 7 * 86400000).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "America/Toronto" });
  } catch (e) {
    return "";
  }
}
