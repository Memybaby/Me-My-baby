// Fonction serverless Vercel — tâche planifiée (cron) qui envoie UN SEUL courriel hebdomadaire par
// personne, dont le contenu s'adapte automatiquement à sa situation :
//
//   1. Grossesse en cours (DPA renseignée)         → résumé de grossesse par semaine (priorité)
//   2. Post-partum récent (enfant né < 8 semaines)  → résumé de récupération post-partum
//   3. Enfant de 8 semaines à 5 ans                 → résumé de développement selon l'âge
//   4. Aucun des cas ci-dessus                      → contenu générique (astuces, mise en valeur
//                                                      de l'app), en rotation chaque semaine
//
// Peu importe le cas, si la personne a D'AUTRES enfants de 5 ans et moins non couverts par le
// contenu principal (ex. enceinte ET déjà maman d'un enfant de 2 ans), une petite mention leur est
// ajoutée en bas du courriel — pour ne jamais oublier le reste de la famille.
//
// Chaque personne reçoit EXACTEMENT un courriel par semaine, jamais deux.
//
// Se déclenche automatiquement chaque semaine grâce à vercel.json. Peut aussi être testée
// manuellement en visitant "https://tonsite.vercel.app/api/weekly-digest?secret=TON_CRON_SECRET".
//
// Réutilise les mêmes variables d'environnement que les autres cron : RESEND_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET. Rien de plus à configurer si ces trois-là sont déjà en place.
//
// Ce fichier remplace pregnancy-weekly-email.js (qui ne couvrait que la grossesse) — tu peux
// supprimer l'ancien fichier sur GitHub une fois celui-ci en place.

import { sendViaResend } from "./_lib/resend.js";

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const APP_URL = "https://me-my-baby.vercel.app";

/* ==================== 1. CONTENU — GROSSESSE ==================== */
const PREGNANCY_MILESTONES = [
  { w: 4, compare: { fr: "une graine de pavot", en: "a poppy seed", es: "una semilla de amapola" }, short: { fr: "L'implantation vient de se compléter; cœur, cerveau et colonne commencent à se former.", en: "Implantation just completed; heart, brain, and spine are starting to form.", es: "La implantación acaba de completarse; el corazón, el cerebro y la columna empiezan a formarse." } },
  { w: 8, compare: { fr: "une framboise", en: "a raspberry", es: "una frambuesa" }, short: { fr: "Le cœur bat à un rythme régulier; bras, jambes et traits du visage se dessinent.", en: "The heart beats at a regular rhythm; arms, legs, and facial features are emerging.", es: "El corazón late con un ritmo regular; brazos, piernas y rasgos faciales están emergiendo." } },
  { w: 12, compare: { fr: "une prune", en: "a plum", es: "una ciruela" }, short: { fr: "Les réflexes apparaissent; c'est la fin du premier trimestre, un cap important.", en: "Reflexes are appearing; you've reached the end of the first trimester, an important milestone.", es: "Aparecen los reflejos; has llegado al final del primer trimestre, un hito importante." } },
  { w: 16, compare: { fr: "un avocat", en: "an avocado", es: "un aguacate" }, short: { fr: "Le squelette se solidifie; le sexe est souvent visible à l'échographie à cette étape.", en: "The skeleton is hardening; sex is often visible on ultrasound at this stage.", es: "El esqueleto se endurece; el sexo suele verse en la ecografía en esta etapa." } },
  { w: 20, compare: { fr: "une banane", en: "a banana", es: "un plátano" }, short: { fr: "Mi-parcours de la grossesse! Les premiers mouvements deviennent souvent perceptibles.", en: "The halfway point of pregnancy! First movements often become noticeable.", es: "¡Punto medio del embarazo! Los primeros movimientos suelen sentirse." } },
  { w: 24, compare: { fr: "un épi de maïs", en: "an ear of corn", es: "una mazorca de maíz" }, short: { fr: "Les poumons se développent activement; bébé réagit maintenant aux sons extérieurs.", en: "The lungs are developing actively; baby now reacts to outside sounds.", es: "Los pulmones se desarrollan activamente; el bebé ahora reacciona a sonidos externos." } },
  { w: 28, compare: { fr: "une aubergine", en: "an eggplant", es: "una berenjena" }, short: { fr: "Bienvenue au 3e trimestre! Les yeux s'ouvrent et se ferment, et bébé prend du poids.", en: "Welcome to the 3rd trimester! Eyes open and close, and baby is gaining weight.", es: "¡Bienvenida al 3er trimestre! Los ojos se abren y cierran, y el bebé aumenta de peso." } },
  { w: 32, compare: { fr: "une noix de coco", en: "a coconut", es: "un coco" }, short: { fr: "Prise de poids rapide; les os se durcissent, sauf ceux du crâne qui restent souples.", en: "Rapid weight gain; bones are hardening, except the skull bones which stay flexible.", es: "Aumento de peso rápido; los huesos se endurecen, excepto los del cráneo, que permanecen flexibles." } },
  { w: 36, compare: { fr: "une laitue romaine", en: "a head of romaine lettuce", es: "una lechuga romana" }, short: { fr: "Les poumons approchent de leur pleine maturité; bébé se positionne pour la naissance.", en: "The lungs are nearing full maturity; baby is getting into position for birth.", es: "Los pulmones se acercan a la madurez completa; el bebé se coloca en posición para nacer." } },
  { w: 40, compare: { fr: "une petite pastèque", en: "a small watermelon", es: "una sandía pequeña" }, short: { fr: "Terme atteint! Bébé est prêt à naître, avec des organes pleinement fonctionnels.", en: "Full term reached! Baby is ready to be born, with fully functional organs.", es: "¡Término alcanzado! El bebé está listo para nacer, con órganos totalmente funcionales." } },
];

const PREGNANCY_SUGGESTIONS = {
  1: {
    fr: [
      { section: "Alimentation", tip: "Léa peut vous préparer un menu personnalisé adapté aux besoins du premier trimestre — quelques clics suffisent." },
      { section: "Ma grossesse", tip: "Retrouvez les symptômes normaux du premier trimestre et des façons concrètes de les soulager." },
      { section: "Rendez-vous", tip: "C'est le bon moment pour noter vos premiers rendez-vous prénataux dans l'app, tous au même endroit." },
    ],
    es: [
      { section: "Alimentación", tip: "Léa puede prepararte un menú personalizado adaptado a las necesidades del primer trimestre — solo toma unos clics." },
      { section: "Mi embarazo", tip: "Encuentra los síntomas normales del primer trimestre y formas concretas de aliviarlos." },
      { section: "Citas", tip: "Es un buen momento para anotar tus primeras citas prenatales en la app, todas en un solo lugar." },
    ],
    en: [
      { section: "Feeding", tip: "Léa can put together a personalized menu suited to your first-trimester needs — just a few taps." },
      { section: "My Pregnancy", tip: "Check out the normal first-trimester symptoms and concrete ways to ease them." },
      { section: "Appointments", tip: "A great time to start logging your prenatal visits in the app, all in one place." },
    ],
  },
  2: {
    fr: [
      { section: "Ma grossesse", tip: "La section grossesse détaille ce qui se passe chez vous et bébé, semaine par semaine." },
      { section: "Soins", tip: "Des conseils concrets pour le confort physique (mal de dos, sommeil) du deuxième trimestre." },
      { section: "Alimentation", tip: "Ajustez votre menu avec Léa selon vos besoins qui évoluent — un nouveau menu chaque semaine." },
    ],
    es: [
      { section: "Mi embarazo", tip: "La sección de embarazo detalla lo que sucede contigo y con el bebé, semana a semana." },
      { section: "Cuidados", tip: "Consejos concretos para la comodidad física (dolor de espalda, sueño) del segundo trimestre." },
      { section: "Alimentación", tip: "Ajusta tu menú con Léa según tus necesidades cambiantes — un nuevo menú cada semana." },
    ],
    en: [
      { section: "My Pregnancy", tip: "The pregnancy section covers what's happening with you and baby, week by week." },
      { section: "Care", tip: "Concrete tips for second-trimester physical comfort (back pain, sleep)." },
      { section: "Feeding", tip: "Adjust your menu with Léa as your needs evolve — a fresh menu every week." },
    ],
  },
  3: {
    fr: [
      { section: "Alimentation", tip: "Consultez les listes pour la valise de maternité et la valise de bébé, pour ne rien oublier." },
      { section: "Rendez-vous", tip: "Vos visites prénatales sont plus fréquentes maintenant — gardez-les toutes au même endroit." },
      { section: "Ma grossesse", tip: "Passez en revue les signes du travail pour vous sentir prête le moment venu." },
    ],
    es: [
      { section: "Alimentación", tip: "Consulta las listas para la maleta de maternidad y la del bebé, para no olvidar nada." },
      { section: "Citas", tip: "Tus visitas prenatales son más frecuentes ahora — mantenlas todas en un solo lugar." },
      { section: "Mi embarazo", tip: "Repasa las señales del trabajo de parto para sentirte lista cuando llegue el momento." },
    ],
    en: [
      { section: "Feeding", tip: "Check out the maternity bag and baby bag checklists, so nothing gets forgotten." },
      { section: "Appointments", tip: "Your prenatal visits are more frequent now — keep them all in one place." },
      { section: "My Pregnancy", tip: "Review the signs of labor so you feel ready when the time comes." },
    ],
  },
};

/* ==================== 2. CONTENU — POST-PARTUM ==================== */
const POSTPARTUM_PHASES = [
  {
    maxWeek: 2,
    short: { fr: "Les toutes premières semaines sont intenses : votre corps récupère physiquement pendant que vous apprenez à connaître votre bébé. Le repos, même fragmenté, est essentiel.", en: "The very first weeks are intense: your body is physically recovering while you're getting to know your baby. Rest, even in fragments, is essential.", es: "Las primeras semanas son intensas: tu cuerpo se recupera físicamente mientras conoces a tu bebé. El descanso, aunque sea fragmentado, es esencial." },
    suggestion: {
      fr: { section: "Post-partum", tip: "Consultez la section Post-partum pour connaître les signes normaux de récupération et savoir quand consulter." },
      en: { section: "Postpartum", tip: "Check out the Postpartum section for normal recovery signs and when to seek care." },
      es: { section: "Posparto", tip: "Consulta la sección Posparto para conocer las señales normales de recuperación y cuándo consultar." },
    },
  },
  {
    maxWeek: 4,
    short: { fr: "Votre corps continue de guérir; les saignements post-partum diminuent généralement à cette étape. Les montagnes russes émotionnelles sont fréquentes et normales.", en: "Your body keeps healing; postpartum bleeding usually decreases around now. Emotional ups and downs are common and normal.", es: "Tu cuerpo sigue sanando; el sangrado posparto suele disminuir en esta etapa. Las montañas rusas emocionales son frecuentes y normales." },
    suggestion: {
      fr: { section: "Alimentation", tip: "Léa peut vous préparer un menu axé sur la récupération post-partum, riche en fer et en énergie." },
      en: { section: "Feeding", tip: "Léa can put together a menu focused on postpartum recovery, rich in iron and energy." },
      es: { section: "Alimentación", tip: "Léa puede prepararte un menú enfocado en la recuperación posparto, rico en hierro y energía." },
    },
  },
  {
    maxWeek: 6,
    short: { fr: "Le rendez-vous de suivi post-partum a souvent lieu autour de cette période — bon moment pour noter vos questions.", en: "The postpartum check-up appointment often happens around now — a good time to jot down your questions.", es: "La consulta de seguimiento posparto suele ocurrir por esta época — buen momento para anotar tus preguntas." },
    suggestion: {
      fr: { section: "Rendez-vous", tip: "Ajoutez ce rendez-vous de suivi dans l'app pour ne rien manquer." },
      en: { section: "Appointments", tip: "Add this check-up to the app so nothing gets missed." },
      es: { section: "Citas", tip: "Añade esta cita de seguimiento en la app para no perdértela." },
    },
  },
  {
    maxWeek: 8,
    short: { fr: "La récupération officielle des 6 semaines est souvent citée, mais la guérison complète prend parfois plusieurs mois — soyez patiente avec vous-même.", en: "The official 6-week recovery mark is often cited, but full healing can take several months — be patient with yourself.", es: "La marca oficial de recuperación de 6 semanas se menciona a menudo, pero la curación completa puede tardar varios meses — sé paciente contigo misma." },
    suggestion: {
      fr: { section: "Vie de famille", tip: "La section Vie de famille propose des pistes concrètes pour le lâcher-prise et la santé mentale à cette étape." },
      en: { section: "Family life", tip: "The Family life section offers concrete ideas for letting go and mental health at this stage." },
      es: { section: "Vida familiar", tip: "La sección Vida familiar ofrece ideas concretas para soltar el control y cuidar la salud mental en esta etapa." },
    },
  },
];

/* ==================== 3. CONTENU — DÉVELOPPEMENT DE L'ENFANT (0-5 ans) ==================== */
const CHILD_STAGES = [
  {
    maxMonths: 6,
    short: { fr: "Entre 0 et 6 mois, bébé développe rapidement sa vision, le contrôle de sa tête et ses premiers sourires sociaux.", en: "Between 0 and 6 months, baby is rapidly developing vision, head control, and first social smiles.", es: "Entre 0 y 6 meses, el bebé desarrolla rápidamente la visión, el control de la cabeza y las primeras sonrisas sociales." },
    suggestion: {
      fr: { section: "0 à 5 ans", tip: "Le tableau des jalons vous montre où en est votre enfant par rapport à son âge." },
      en: { section: "0 to 5 years", tip: "The milestone chart shows you where your child is at for their age." },
      es: { section: "0 a 5 años", tip: "El cuadro de hitos te muestra en qué punto está tu hijo según su edad." },
    },
  },
  {
    maxMonths: 12,
    short: { fr: "Entre 6 et 12 mois, l'alimentation solide débute et bébé commence souvent à s'asseoir, ramper, puis se mettre debout.", en: "Between 6 and 12 months, solid foods begin and baby often starts sitting, crawling, then standing.", es: "Entre 6 y 12 meses, comienza la alimentación sólida y el bebé suele empezar a sentarse, gatear y luego pararse." },
    suggestion: {
      fr: { section: "Alimentation", tip: "Découvrez les recettes par âge pour accompagner la diversification alimentaire." },
      en: { section: "Feeding", tip: "Check out the recipes by age to support starting solids." },
      es: { section: "Alimentación", tip: "Descubre las recetas por edad para acompañar la introducción de alimentos sólidos." },
    },
  },
  {
    maxMonths: 24,
    short: { fr: "Entre 1 et 2 ans, le langage explose et les premiers pas deviennent une vraie démarche assurée.", en: "Between 1 and 2 years, language explodes and first steps become a confident stride.", es: "Entre 1 y 2 años, el lenguaje se dispara y los primeros pasos se convierten en una marcha segura." },
    suggestion: {
      fr: { section: "0 à 5 ans", tip: "Suivez les jalons moteurs et langagiers propres à cet âge charnière." },
      en: { section: "0 to 5 years", tip: "Track the motor and language milestones specific to this pivotal age." },
      es: { section: "0 a 5 años", tip: "Sigue los hitos motores y del lenguaje propios de esta edad clave." },
    },
  },
  {
    maxMonths: 36,
    short: { fr: "Entre 2 et 3 ans, l'autonomie grandit et les fameuses crises (« terrible twos ») font partie du développement normal.", en: "Between 2 and 3 years, independence grows and the famous \"terrible twos\" tantrums are part of normal development.", es: "Entre 2 y 3 años, crece la autonomía y las famosas rabietas de los « terrible twos » son parte del desarrollo normal." },
    suggestion: {
      fr: { section: "Vie de famille", tip: "La section Vie de famille propose des astuces concrètes pour traverser cette étape avec plus de sérénité." },
      en: { section: "Family life", tip: "The Family life section offers concrete tips to get through this stage with more ease." },
      es: { section: "Vida familiar", tip: "La sección Vida familiar ofrece trucos concretos para atravesar esta etapa con más tranquilidad." },
    },
  },
  {
    maxMonths: 60,
    short: { fr: "Entre 3 et 5 ans, le jeu symbolique et les amitiés prennent une place grandissante — la préparation à l'école approche.", en: "Between 3 and 5 years, pretend play and friendships take on a bigger role — school readiness is on the horizon.", es: "Entre 3 y 5 años, el juego simbólico y las amistades ganan protagonismo — se acerca la preparación para la escuela." },
    suggestion: {
      fr: { section: "0 à 5 ans", tip: "Explorez les jalons de propreté, de jeu et de socialisation propres à cet âge." },
      en: { section: "0 to 5 years", tip: "Explore the potty training, play, and socializing milestones for this age." },
      es: { section: "0 a 5 años", tip: "Explora los hitos de control de esfínteres, juego y socialización para esta edad." },
    },
  },
];

/* ==================== 4. CONTENU — GÉNÉRIQUE (rotation hebdomadaire) ==================== */
const GENERIC_TIPS = {
  fr: [
    { section: "Léa", tip: "Notre diététicienne virtuelle peut vous préparer un menu personnalisé pour la semaine, adapté à vos objectifs." },
    { section: "Mia", tip: "Une question sur la grossesse, le sommeil ou le développement de l'enfant? Mia répond à toute heure." },
    { section: "Communauté", tip: "Le forum est un espace pour échanger avec d'autres parents et partager vos petites victoires." },
    { section: "Vie de famille", tip: "Notre nouvelle section propose des trucs concrets pour la conciliation travail-famille, sauver du temps et lâcher-prise." },
    { section: "Rendez-vous", tip: "Gardez tous les rendez-vous de la famille au même endroit, pour ne plus rien oublier." },
  ],
  es: [
    { section: "Léa", tip: "Nuestra nutricionista virtual puede prepararte un menú personalizado para la semana, adaptado a tus objetivos." },
    { section: "Mia", tip: "¿Una pregunta sobre el embarazo, el sueño o el desarrollo infantil? Mia responde a cualquier hora." },
    { section: "Comunidad", tip: "El foro es un espacio para conectar con otros padres y compartir tus pequeñas victorias." },
    { section: "Vida familiar", tip: "Nuestra nueva sección ofrece trucos concretos para la conciliación trabajo-familia, ahorrar tiempo y soltar el control." },
    { section: "Citas", tip: "Mantén todas las citas de la familia en un solo lugar, para no olvidar nada." },
  ],
  en: [
    { section: "Léa", tip: "Our virtual dietitian can put together a personalized menu for the week, tailored to your goals." },
    { section: "Mia", tip: "A question about pregnancy, sleep, or child development? Mia answers any time." },
    { section: "Community", tip: "The forum is a space to connect with other parents and share your small wins." },
    { section: "Family life", tip: "Our new section offers concrete tips for work-life balance, saving time, and letting go." },
    { section: "Appointments", tip: "Keep all the family's appointments in one place, so nothing gets forgotten." },
  ],
};

/* ==================== TEXTES FIXES ==================== */
const SUBJECT = {
  pregnancy: { fr: (w) => `Semaine ${w} de grossesse 🤰 Votre résumé de la semaine !`, es: (w) => `Semana ${w} de embarazo 🤰 ¡Tu resumen de la semana!`, en: (w) => `Week ${w} of pregnancy 🤰 Your weekly recap!` },
  postpartum: { fr: () => "Votre résumé post-partum de la semaine 💛", es: () => "Tu resumen posparto de la semana 💛", en: () => "Your postpartum recap this week 💛" },
  child: { fr: (n) => `Le développement de ${n} cette semaine 🌱`, es: (n) => `El desarrollo de ${n} esta semana 🌱`, en: (n) => `${n}'s development this week 🌱` },
  generic: { fr: () => "Votre astuce de la semaine chez Me My Baby ✨", es: () => "Tu consejo de la semana en Me My Baby ✨", en: () => "Your tip of the week from Me My Baby ✨" },
};

const UI = {
  fr: { exploreLabel: "✨ À explorer cette semaine dans l'app", ctaLabel: "Ouvrir Me My Baby", signoff: "On vous accompagne à chaque étape 💛",
    unsub: "Vous recevez ce courriel une fois par semaine parce que vous avez un profil actif sur Me My Baby. Vous pouvez ajuster vos préférences depuis votre profil.",
    alsoLabel: "👨‍👩‍👧‍👦 Et pour le reste de la famille", greet: (n) => `Bonjour${n ? " " + n : ""} !` },
  es: { exploreLabel: "✨ Para explorar esta semana en la app", ctaLabel: "Abrir Me My Baby", signoff: "Te acompañamos en cada etapa 💛",
    unsub: "Recibes este correo una vez por semana porque tienes un perfil activo en Me My Baby. Puedes ajustar tus preferencias desde tu perfil.",
    alsoLabel: "👨‍👩‍👧‍👦 Y para el resto de la familia", greet: (n) => `¡Hola${n ? " " + n : ""}!` },
  en: { exploreLabel: "✨ Worth exploring in the app this week", ctaLabel: "Open Me My Baby", signoff: "We're with you every step of the way 💛",
    unsub: "You're receiving this once-a-week email because you have an active Me My Baby profile. You can adjust your preferences from your profile.",
    alsoLabel: "👨‍👩‍👧‍👦 And for the rest of the family", greet: (n) => `Hi${n ? " " + n : ""}!` },
};

/* ==================== LOGIQUE ==================== */
function closestPregnancyMilestone(weeks) {
  let best = PREGNANCY_MILESTONES[0];
  for (const m of PREGNANCY_MILESTONES) {
    if (m.w <= weeks) best = m; else break;
  }
  return best;
}

function ageInWeeks(birthdateStr) {
  const bd = new Date(birthdateStr + "T00:00:00");
  if (isNaN(bd.getTime())) return null;
  return Math.floor((new Date() - bd) / (7 * 86400000));
}

function buildMainSection(lang, weeks, milestone) {
  const compareLabel = { fr: `Cette semaine, bébé a environ la taille de ${milestone.compare.fr} 🌱`, es: `Esta semana, el bebé tiene aproximadamente el tamaño de ${milestone.compare.es} 🌱`, en: `This week, baby is about the size of ${milestone.compare.en} 🌱` }[lang];
  return `<p style="font-size:16px;">${compareLabel}</p><p>${milestone.short[lang]}</p>`;
}

function buildEmail(lang, firstName, subject, mainHtml, suggestion, extraChildren) {
  const t = UI[lang];
  const otherKidsHtml = extraChildren.length
    ? `<div style="background:#F0F5EC;border-radius:14px;padding:14px 18px;margin:16px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:#2F4858;">${t.alsoLabel}</p>
        ${extraChildren.map((c) => `<p style="margin:0 0 4px;font-size:13px;">${c}</p>`).join("")}
      </div>`
    : "";

  const html = `<div style="font-family:Georgia,serif;color:#3A3833;max-width:480px;margin:0 auto;line-height:1.6;">
    <h2 style="color:#2F4858;margin:0 0 14px;">${t.greet(firstName)}</h2>
    ${mainHtml}
    <div style="background:#FBF6ED;border-radius:14px;padding:16px 18px;margin:20px 0;">
      <p style="margin:0 0 10px;font-weight:700;color:#2F4858;">${t.exploreLabel}</p>
      <p style="margin:0;"><strong>${suggestion.section}</strong> — ${suggestion.tip}</p>
    </div>
    ${otherKidsHtml}
    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${t.ctaLabel}</a>
    </div>
    <p>${t.signoff}</p>
    <p style="margin-top:28px;font-size:11px;color:#7A7364;">${t.unsub}</p>
  </div>`;

  return { subject, html };
}

// Construit une courte mention pour un enfant secondaire (non couvert par le contenu principal).
function childMentionLine(lang, name, weeks) {
  const months = Math.floor(weeks / 4.345);
  if (lang === "fr") return `<strong>${name}</strong> (${months < 1 ? `${weeks} sem.` : `${months} mois`}) — n'oubliez pas de jeter un œil à la section « 0 à 5 ans » pour son âge.`;
  if (lang === "es") return `<strong>${name}</strong> (${months < 1 ? `${weeks} sem.` : `${months} meses`}) — no olvides revisar la sección « 0 a 5 años » para su edad.`;
  return `<strong>${name}</strong> (${months < 1 ? `${weeks} wk` : `${months} mo`}) — don't forget to check the "0 to 5 years" section for their age.`;
}

export default async function handler(req, res) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const queryToken = req.query?.secret;
  const authorized = !!expectedSecret && (authHeader === `Bearer ${expectedSecret}` || queryToken === expectedSecret);
  if (!authorized) {
    res.status(401).json({ error: "Non autorisé." });
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante côté serveur." });
    return;
  }

  try {
    // On envoie à tout profil actif (peu importe le statut d'abonnement, puisque ce courriel sert à
    // donner envie de revenir dans l'app) et ayant un courriel valide.
    const profilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=not.is.null&subscription_status=neq.cancelled&select=id,email,first_name,due_date,language`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const profiles = await profilesRes.json();
    if (!Array.isArray(profiles)) {
      res.status(500).json({ error: "Impossible de récupérer les profils.", details: profiles });
      return;
    }

    // Tous les enfants de tous les profils, récupérés en un seul appel puis regroupés par user_id —
    // plus efficace que d'interroger Supabase une fois par personne.
    const childrenRes = await fetch(
      `${SUPABASE_URL}/rest/v1/children?select=user_id,name,birthdate`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const allChildren = await childrenRes.json();
    const childrenByUser = {};
    if (Array.isArray(allChildren)) {
      for (const c of allChildren) {
        if (!c.birthdate) continue;
        (childrenByUser[c.user_id] = childrenByUser[c.user_id] || []).push(c);
      }
    }

    const weekNumber = Math.floor(Date.now() / (7 * 86400000)); // pour faire tourner le contenu générique

    let sent = 0;
    const errors = [];

    for (const profile of profiles) {
      if (!profile.email) continue;
      const lang = ["fr", "en", "es"].includes(profile.language) ? profile.language : "fr";
      const kids = (childrenByUser[profile.id] || [])
        .map((c) => ({ name: c.name, weeks: ageInWeeks(c.birthdate) }))
        .filter((c) => c.weeks !== null && c.weeks >= 0 && c.weeks <= 260); // jusqu'à ~5 ans

      let pregnancyWeeks = null;
      if (profile.due_date) {
        const dueDateObj = new Date(profile.due_date + "T00:00:00");
        if (!isNaN(dueDateObj.getTime())) {
          const conceptionStart = new Date(dueDateObj);
          conceptionStart.setDate(conceptionStart.getDate() - 280);
          const diffDays = Math.floor((new Date() - conceptionStart) / 86400000);
          const w = Math.floor(diffDays / 7);
          if (w >= 4 && w <= 40) pregnancyWeeks = w;
        }
      }

      let subject, mainHtml, suggestion, focusChildId = null;

      if (pregnancyWeeks !== null) {
        // 1) PRIORITÉ — grossesse en cours
        const trimester = pregnancyWeeks <= 13 ? 1 : pregnancyWeeks <= 27 ? 2 : 3;
        const milestone = closestPregnancyMilestone(pregnancyWeeks);
        const pool = PREGNANCY_SUGGESTIONS[trimester][lang];
        suggestion = pool[pregnancyWeeks % pool.length];
        mainHtml = buildMainSection(lang, pregnancyWeeks, milestone);
        subject = SUBJECT.pregnancy[lang](pregnancyWeeks);
      } else {
        const newborn = kids.find((k) => k.weeks < 8);
        if (newborn) {
          // 2) Post-partum récent
          const phase = POSTPARTUM_PHASES.find((p) => newborn.weeks <= p.maxWeek) || POSTPARTUM_PHASES[POSTPARTUM_PHASES.length - 1];
          suggestion = phase.suggestion[lang];
          mainHtml = `<p>${phase.short[lang]}</p>`;
          subject = SUBJECT.postpartum[lang]();
          focusChildId = newborn.name;
        } else {
          const youngest = kids.filter((k) => k.weeks >= 8).sort((a, b) => a.weeks - b.weeks)[0];
          if (youngest) {
            // 3) Développement de l'enfant (le plus jeune de 8 sem. à 5 ans)
            const months = Math.floor(youngest.weeks / 4.345);
            const stage = CHILD_STAGES.find((s) => months <= s.maxMonths) || CHILD_STAGES[CHILD_STAGES.length - 1];
            suggestion = stage.suggestion[lang];
            mainHtml = `<p>${stage.short[lang]}</p>`;
            subject = SUBJECT.child[lang](youngest.name);
            focusChildId = youngest.name;
          } else {
            // 4) Générique
            const pool = GENERIC_TIPS[lang];
            suggestion = pool[weekNumber % pool.length];
            mainHtml = "";
            subject = SUBJECT.generic[lang]();
          }
        }
      }

      // Mention des autres enfants de 5 ans et moins non couverts par le contenu principal (max 2,
      // pour ne pas alourdir le courriel).
      const extraChildren = kids
        .filter((k) => k.name !== focusChildId)
        .slice(0, 2)
        .map((k) => childMentionLine(lang, k.name, k.weeks));

      const { subject: finalSubject, html } = buildEmail(lang, profile.first_name, subject, mainHtml, suggestion, extraChildren);

      try {
        await sendViaResend({ to: profile.email, subject: finalSubject, html });
        sent += 1;
      } catch (e) {
        errors.push({ email: profile.email, error: e.message });
      }
    }

    res.status(200).json({ ok: true, checked: profiles.length, sent, errors });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur inattendue." });
  }
}
