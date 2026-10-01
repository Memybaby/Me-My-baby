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
// manuellement en visitant "https://www.memybabyapp.com/api/weekly-digest?secret=TON_CRON_SECRET".
//
// Réutilise les mêmes variables d'environnement que les autres cron : RESEND_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET. Rien de plus à configurer si ces trois-là sont déjà en place.
//
// Ce fichier remplace pregnancy-weekly-email.js (qui ne couvrait que la grossesse) — tu peux
// supprimer l'ancien fichier sur GitHub une fois celui-ci en place.

import { sendViaResend } from "./_lib/resend.js";

const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const APP_URL = "https://www.memybabyapp.com";

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
      { section: "Mes plannings", tip: "Imprimez la liste de la valise d'hôpital pour maman et bébé, pour ne rien oublier le jour J." },
      { section: "Rendez-vous", tip: "Vos visites prénatales sont plus fréquentes maintenant — gardez-les toutes au même endroit." },
      { section: "Ma grossesse", tip: "Passez en revue les signes du travail pour vous sentir prête le moment venu." },
    ],
    es: [
      { section: "Mis plannings", tip: "Imprime la lista de la maleta para el hospital de mamá y bebé, para no olvidar nada el gran día." },
      { section: "Citas", tip: "Tus visitas prenatales son más frecuentes ahora — mantenlas todas en un solo lugar." },
      { section: "Mi embarazo", tip: "Repasa las señales del trabajo de parto para sentirte lista cuando llegue el momento." },
    ],
    en: [
      { section: "My planners", tip: "Print the hospital bag checklist for mom and baby, so nothing gets forgotten on the big day." },
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

/* ==================== 3b. CONTENU — CONCEPTION (aucune grossesse ni enfant de 5 ans et moins) ==================== */
// Une astuce différente chaque semaine, en rotation.
const CONCEPTION_TIPS = [
  { fr: "Connaître sa fenêtre de fertilité aide beaucoup : elle dure environ 6 jours par cycle, soit les 5 jours avant l'ovulation et le jour même.", en: "Knowing your fertile window helps a lot: it lasts about 6 days per cycle — the 5 days before ovulation and the day itself.", es: "Conocer tu ventana fértil ayuda mucho: dura unos 6 días por ciclo, los 5 días antes de la ovulación y el mismo día." },
  { fr: "L'acide folique est recommandé dès que l'on pense à concevoir, idéalement au moins 3 mois avant la grossesse. Parlez-en à votre professionnel de la santé.", en: "Folic acid is recommended as soon as you start thinking about conceiving, ideally at least 3 months before pregnancy. Talk to your healthcare provider.", es: "El ácido fólico se recomienda desde que se piensa en concebir, idealmente al menos 3 meses antes del embarazo. Consulta a tu profesional de la salud." },
  { fr: "Un sommeil régulier, une alimentation variée et une activité physique modérée soutiennent la fertilité, chez vous comme chez votre partenaire.", en: "Regular sleep, a varied diet and moderate physical activity support fertility — for you and your partner.", es: "Un sueño regular, una alimentación variada y una actividad física moderada apoyan la fertilidad, tanto la tuya como la de tu pareja." },
  { fr: "Noter la durée de vos cycles quelques mois de suite permet de mieux prévoir votre ovulation et de repérer ce qui est normal pour vous.", en: "Tracking your cycle length for a few months helps predict ovulation and shows what's normal for you.", es: "Anotar la duración de tus ciclos durante unos meses ayuda a prever la ovulación y a conocer lo que es normal para ti." },
  { fr: "Le stress fait partie de la vie : prendre du temps pour soi et partager ses émotions avec son ou sa partenaire aide à traverser cette étape plus sereinement.", en: "Stress is part of life: taking time for yourself and sharing your feelings with your partner helps you go through this stage more calmly.", es: "El estrés es parte de la vida: tomar tiempo para ti y compartir tus emociones con tu pareja ayuda a vivir esta etapa con más calma." },
  { fr: "Un rendez-vous préconception avec un professionnel de la santé permet de faire le point sur vos vaccins, vos médicaments et votre santé générale.", en: "A preconception visit with a healthcare provider is a chance to review your vaccines, medications and overall health.", es: "Una consulta preconcepcional con un profesional de la salud permite revisar tus vacunas, medicamentos y salud general." },
];
// « À lire cette semaine » : les pages de la section Conception de l'appli, en rotation.
const CONCEPTION_READS = [
  { sub: "cycle", title: { fr: "Cycle & ovulation", en: "Cycle & ovulation", es: "Ciclo y ovulación" }, teaser: { fr: "Comprendre la durée de votre cycle et le moment de l'ovulation, même si vos cycles sont irréguliers.", en: "Understand your cycle length and when ovulation happens, even if your cycles are irregular.", es: "Entiende la duración de tu ciclo y el momento de la ovulación, incluso si tus ciclos son irregulares." } },
  { sub: "fenetre", title: { fr: "Journée féconde & signes", en: "Fertile window & signs", es: "Ventana fértil y señales" }, teaser: { fr: "Les signes du corps qui annoncent vos jours les plus fertiles, et comment les reconnaître.", en: "The body's signs that announce your most fertile days, and how to recognize them.", es: "Las señales del cuerpo que anuncian tus días más fértiles y cómo reconocerlas." } },
  { sub: "prepCorps", title: { fr: "Préparer son corps", en: "Getting your body ready", es: "Preparar tu cuerpo" }, teaser: { fr: "Aliments, suppléments, tisanes et habitudes qui préparent le corps à une grossesse en santé.", en: "Foods, supplements, teas and habits that get your body ready for a healthy pregnancy.", es: "Alimentos, suplementos, infusiones y hábitos que preparan el cuerpo para un embarazo saludable." } },
  { sub: "fertilite", title: { fr: "Facteurs de fertilité", en: "Fertility factors", es: "Factores de fertilidad" }, teaser: { fr: "Âge, sommeil, stress, alimentation : ce qui influence la fertilité, chez elle comme chez lui.", en: "Age, sleep, stress, diet: what affects fertility — for her and for him.", es: "Edad, sueño, estrés, alimentación: lo que influye en la fertilidad, en ella y en él." } },
];
// « Outil à essayer » : en rotation, avec un lien qui ouvre directement la bonne page.
const CONCEPTION_TOOLS = [
  { go: "conception", fr: { section: "🧮 Calculateur d'ovulation", tip: "Entrez la date de vos dernières règles pour voir vos jours les plus fertiles ce mois-ci." }, en: { section: "🧮 Ovulation calculator", tip: "Enter the date of your last period to see your most fertile days this month." }, es: { section: "🧮 Calculadora de ovulación", tip: "Ingresa la fecha de tu última regla para ver tus días más fértiles este mes." } },
  { go: "dietitian", fr: { section: "🥗 Léa, votre diététicienne", tip: "Demandez à Léa un menu de 7 jours riche en nutriments clés pour la préconception, avec toutes les recettes." }, en: { section: "🥗 Léa, your dietitian", tip: "Ask Léa for a 7-day menu rich in key preconception nutrients, with all the recipes." }, es: { section: "🥗 Léa, tu nutricionista", tip: "Pídele a Léa un menú de 7 días rico en nutrientes clave para la preconcepción, con todas las recetas." } },
  { go: "novaris", fr: { section: "💬 Novaris", tip: "Une question sur votre cycle ou la fertilité ? Posez-la à Novaris, elle répond à toute heure." }, en: { section: "💬 Novaris", tip: "A question about your cycle or fertility? Ask Novaris — she answers any time." }, es: { section: "💬 Novaris", tip: "¿Una pregunta sobre tu ciclo o la fertilidad? Pregúntale a Novaris, responde a cualquier hora." } },
  { go: "articles", fr: { section: "📰 Articles", tip: "De nouveaux articles vous attendent cette semaine dans l'appli." }, en: { section: "📰 Articles", tip: "New articles are waiting for you in the app this week." }, es: { section: "📰 Artículos", tip: "Nuevos artículos te esperan esta semana en la aplicación." } },
];

/* ==================== 4. CONTENU — GÉNÉRIQUE (rotation hebdomadaire) ==================== */
const GENERIC_TIPS = {
  fr: [
    { section: "Léa", tip: "Notre diététicienne virtuelle peut vous préparer un menu personnalisé pour la semaine, adapté à vos objectifs." },
    { section: "Novaris", tip: "Une question sur la grossesse, le sommeil ou le développement de l'enfant? Novaris répond à toute heure." },
    { section: "Communauté", tip: "Le forum est un espace pour échanger avec d'autres parents et partager vos petites victoires." },
    { section: "Vie de famille", tip: "Notre nouvelle section propose des trucs concrets pour la conciliation travail-famille, sauver du temps et lâcher-prise." },
    { section: "Rendez-vous", tip: "Gardez tous les rendez-vous de la famille au même endroit, pour ne plus rien oublier." },
  ],
  es: [
    { section: "Léa", tip: "Nuestra nutricionista virtual puede prepararte un menú personalizado para la semana, adaptado a tus objetivos." },
    { section: "Novaris", tip: "¿Una pregunta sobre el embarazo, el sueño o el desarrollo infantil? Novaris responde a cualquier hora." },
    { section: "Comunidad", tip: "El foro es un espacio para conectar con otros padres y compartir tus pequeñas victorias." },
    { section: "Vida familiar", tip: "Nuestra nueva sección ofrece trucos concretos para la conciliación trabajo-familia, ahorrar tiempo y soltar el control." },
    { section: "Citas", tip: "Mantén todas las citas de la familia en un solo lugar, para no olvidar nada." },
  ],
  en: [
    { section: "Léa", tip: "Our virtual dietitian can put together a personalized menu for the week, tailored to your goals." },
    { section: "Novaris", tip: "A question about pregnancy, sleep, or child development? Novaris answers any time." },
    { section: "Community", tip: "The forum is a space to connect with other parents and share your small wins." },
    { section: "Family life", tip: "Our new section offers concrete tips for work-life balance, saving time, and letting go." },
    { section: "Appointments", tip: "Keep all the family's appointments in one place, so nothing gets forgotten." },
  ],
};

/* ==================== 5. CONTENU NEUF CHAQUE SEMAINE (intelligence artificielle) ====================
   Pour qu'une membre abonnée pendant des années ne reçoive jamais deux fois le même texte, le
   cœur du courriel est rédigé à neuf chaque semaine, selon son stade (conception, semaine de
   grossesse, post-partum, âge de l'enfant), avec un THÈME différent chaque semaine. Un seul texte
   par stade et par langue est rédigé pour tout le monde (pas de prénom ni de donnée personnelle
   envoyés). Si l'intelligence artificielle ne répond pas, les textes fixes ci-dessus servent de secours. */
const THEMES = {
  conception: ["suivre son cycle au quotidien", "les signes de la fenêtre fertile", "l'acide folique et les vitamines prénatales", "le fer et l'alimentation préconception", "les oméga-3 et les bons gras", "la caféine et l'alcool avant la grossesse", "le sommeil et la fertilité", "gérer le stress pendant les essais", "l'activité physique qui aide", "la santé du partenaire et la fertilité masculine", "le rendez-vous préconception", "les vaccins à vérifier avant la grossesse", "la santé dentaire avant la grossesse", "le poids santé et la fertilité", "combien de temps il faut habituellement pour concevoir", "prendre soin de son moral", "communiquer en couple pendant les essais", "préparer son budget pour bébé", "les tests d'ovulation", "la glaire cervicale", "la température basale", "les mythes sur la fertilité", "quand consulter un professionnel de la fertilité", "l'hydratation et les habitudes simples", "cuisiner des repas fertilité faciles", "les produits du quotidien et l'environnement"],
  pregnancy: ["le développement de bébé cette semaine", "l'alimentation de cette étape", "les changements du corps", "les émotions et le moral", "le rôle du ou de la partenaire", "préparer l'arrivée de bébé", "le sommeil pendant la grossesse", "bouger en douceur", "les rendez-vous et examens de cette période", "les petits inconforts et comment les soulager", "prendre soin de soi", "la connexion avec bébé", "l'organisation de la maison", "les questions à poser au médecin ou à la sage-femme"],
  postpartum: ["le repos et la récupération", "l'alimentation après l'accouchement", "l'allaitement ou le biberon", "les émotions après la naissance", "demander et accepter de l'aide", "le sommeil de bébé", "le plancher pelvien", "le couple après bébé", "les signes qui demandent de consulter", "de petits moments pour soi", "l'organisation du quotidien", "le lien avec bébé"],
  child: ["le sommeil", "le jeu et l'éveil", "le langage", "l'alimentation", "les émotions", "la sécurité à la maison", "les routines", "les frères et sœurs", "les écrans", "la lecture", "les sorties à l'extérieur", "la motricité", "l'hygiène et les soins", "la socialisation", "les crises et la patience", "la propreté", "la garderie ou l'école", "le bien-être du parent"],
};
const LANG_NAME = { fr: "French (Quebec-friendly, warm, using 'vous')", en: "English", es: "Spanish (neutral, warm, using 'tú')" };

async function writeWeeklyText({ stage, detail, theme, lang, weekNumber }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const prompt = `Write the main section of this week's newsletter for a parenting app called Me My Baby.
Reader stage: ${detail}.
Theme of the week: ${theme}.
Newsletter issue number: ${weekNumber} (write a fresh angle, do not reuse generic phrasing).
Language: ${LANG_NAME[lang]}.
Rules: warm and encouraging, concrete and practical, 50 to 80 words for "text", general information only (no diagnosis, no dosages), suggest consulting a health professional only when truly relevant, at most one emoji. Do not greet the reader and do not sign.
Reply with ONLY a JSON object: {"title": "short catchy title (max 8 words)", "text": "the paragraph", "tip": "one practical tip for this week (max 20 words)"}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await r.json();
    if (!r.ok) return null;
    const raw = (data.content || []).map((b) => b.text || "").join("").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    const out = JSON.parse(m ? m[0] : raw);
    if (!out?.text) return null;
    return { title: String(out.title || ""), text: String(out.text), tip: String(out.tip || "") };
  } catch (e) {
    return null;
  }
}

function escHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function aiBox(ai, lang) {
  if (!ai) return "";
  const tipLabel = { fr: "💡 L'astuce de la semaine", en: "💡 Tip of the week", es: "💡 Consejo de la semana" }[lang];
  return `<div style="background:#F3ECE0;border-radius:14px;padding:14px 18px;margin:0 0 14px;">
      ${ai.title ? `<p style="margin:0 0 6px;font-weight:700;color:#5B3A24;font-size:16px;">${escHtml(ai.title)}</p>` : ""}
      <p style="margin:0 0 ${ai.tip ? "10px" : "0"};">${escHtml(ai.text)}</p>
      ${ai.tip ? `<p style="margin:0;font-size:14px;"><strong>${tipLabel} :</strong> ${escHtml(ai.tip)}</p>` : ""}
    </div>`;
}

// « À explorer dans l'app » : outils et pages de l'appli selon le stade, en rotation. Par sécurité,
// AUCUN lien ne mène directement à une page : le seul lien du courriel est le bouton de connexion.
const FEATURES = {
  pregnancy: [
    { go: "grossesse", fr: ["🤰 Ma grossesse", "Ce qui se passe chez vous et chez bébé, semaine par semaine."], en: ["🤰 My pregnancy", "What's happening with you and baby, week by week."], es: ["🤰 Mi embarazo", "Lo que pasa contigo y con el bebé, semana a semana."] },
    { go: "dietitian", fr: ["🥗 Léa", "Un menu de 7 jours adapté à votre grossesse, avec toutes les recettes, directement par courriel."], en: ["🥗 Léa", "A 7-day menu suited to your pregnancy, with all the recipes, straight to your inbox."], es: ["🥗 Léa", "Un menú de 7 días adaptado a tu embarazo, con todas las recetas, directo a tu correo."] },
    { go: "accueil", fr: ["🧳 Mes plannings", "Imprimez la liste de valise d'hôpital, le plan de naissance ou la liste de grossesse."], en: ["🧳 My planners", "Print the hospital bag checklist, birth plan or pregnancy to-do list."], es: ["🧳 Mis plannings", "Imprime la lista de la maleta, el plan de parto o la lista del embarazo."] },
    { go: "accueil", fr: ["👣 Coups de bébé", "Notez les mouvements de bébé et suivez-les au fil des jours dans Vos outils."], en: ["👣 Baby kicks", "Log baby's movements and follow them over the days in Your tools."], es: ["👣 Movimientos del bebé", "Anota los movimientos del bebé y síguelos en Tus herramientas."] },
    { go: "novaris", fr: ["💬 Novaris", "Une question qui vous trotte dans la tête ? Novaris répond à toute heure."], en: ["💬 Novaris", "A question on your mind? Novaris answers any time."], es: ["💬 Novaris", "¿Una pregunta en mente? Novaris responde a cualquier hora."] },
    { go: "forum", fr: ["👭 Forum", "Échangez avec d'autres parents qui vivent la même étape que vous."], en: ["👭 Forum", "Connect with other parents at the same stage as you."], es: ["👭 Foro", "Conversa con otros padres que viven la misma etapa."] },
    { go: "articles", fr: ["📰 Articles", "De nouveaux articles vous attendent cette semaine."], en: ["📰 Articles", "New articles are waiting for you this week."], es: ["📰 Artículos", "Nuevos artículos te esperan esta semana."] },
  ],
  postpartum: [
    { go: "postpartum", fr: ["💛 Post-partum", "Récupération, émotions, plancher pelvien : tout pour prendre soin de vous."], en: ["💛 Postpartum", "Recovery, emotions, pelvic floor: everything to take care of you."], es: ["💛 Posparto", "Recuperación, emociones, suelo pélvico: todo para cuidarte."] },
    { go: "accueil", fr: ["🍼 Suivi allaitement et sommeil", "Notez les boires et les dodos de bébé en un geste, dans Vos outils."], en: ["🍼 Feeding & sleep tracking", "Log baby's feeds and naps in one tap in Your tools."], es: ["🍼 Lactancia y sueño", "Anota tomas y siestas del bebé en un toque en Tus herramientas."] },
    { go: "dietitian", fr: ["🥗 Léa", "Un menu de récupération post-partum, riche en fer et en énergie."], en: ["🥗 Léa", "A postpartum recovery menu, rich in iron and energy."], es: ["🥗 Léa", "Un menú de recuperación posparto, rico en hierro y energía."] },
    { go: "novaris", fr: ["💬 Novaris", "Une question en pleine nuit ? Novaris répond à toute heure."], en: ["💬 Novaris", "A question in the middle of the night? Novaris answers any time."], es: ["💬 Novaris", "¿Una pregunta en plena noche? Novaris responde a cualquier hora."] },
    { go: "forum", fr: ["👭 Forum", "D'autres parents vivent les mêmes nuits que vous : venez échanger."], en: ["👭 Forum", "Other parents are living the same nights: come and chat."], es: ["👭 Foro", "Otros padres viven las mismas noches: ven a conversar."] },
    { go: "famille", fr: ["🏡 Vie de famille", "Des idées concrètes pour souffler et s'organiser."], en: ["🏡 Family life", "Concrete ideas to breathe and get organized."], es: ["🏡 Vida familiar", "Ideas concretas para respirar y organizarte."] },
  ],
  child: [
    { go: "dev01", fr: ["🌱 0 à 5 ans", "Les jalons de développement propres à l'âge de votre enfant."], en: ["🌱 0 to 5 years", "The developmental milestones for your child's age."], es: ["🌱 0 a 5 años", "Los hitos del desarrollo para la edad de tu hijo."] },
    { go: "alimentation", fr: ["🥕 Alimentation", "Recettes et idées de repas selon l'âge de votre enfant."], en: ["🥕 Feeding", "Recipes and meal ideas for your child's age."], es: ["🥕 Alimentación", "Recetas e ideas de comidas según la edad de tu hijo."] },
    { go: "accueil", fr: ["🗓️ Mes plannings", "Routine en images, petites tâches, propreté : des plannings à imprimer pour les enfants."], en: ["🗓️ My planners", "Picture routine, little chores, potty training: printable planners for kids."], es: ["🗓️ Mis plannings", "Rutina con imágenes, pequeñas tareas, dejar el pañal: plannings para niños."] },
    { go: "sante", fr: ["🩺 Santé", "Vaccins, fièvre, petits bobos : les repères pour savoir quoi faire."], en: ["🩺 Health", "Vaccines, fever, little bumps: guidance on what to do."], es: ["🩺 Salud", "Vacunas, fiebre, pequeñas heridas: referencias para saber qué hacer."] },
    { go: "accueil", fr: ["📏 Suivi de croissance", "Ajoutez la taille et le poids de votre enfant et suivez sa courbe."], en: ["📏 Growth tracker", "Add your child's height and weight and follow their curve."], es: ["📏 Seguimiento del crecimiento", "Agrega la talla y el peso de tu hijo y sigue su curva."] },
    { go: "famille", fr: ["🏡 Vie de famille", "Des trucs pour la routine, les crises et le temps en famille."], en: ["🏡 Family life", "Tips for routines, tantrums and family time."], es: ["🏡 Vida familiar", "Trucos para la rutina, las rabietas y el tiempo en familia."] },
    { go: "novaris", fr: ["💬 Novaris", "Une question sur le développement de votre enfant ? Novaris répond à toute heure."], en: ["💬 Novaris", "A question about your child's development? Novaris answers any time."], es: ["💬 Novaris", "¿Una pregunta sobre el desarrollo de tu hijo? Novaris responde a cualquier hora."] },
    { go: "forum", fr: ["👭 Forum", "Partagez vos petites victoires avec d'autres parents."], en: ["👭 Forum", "Share your small wins with other parents."], es: ["👭 Foro", "Comparte tus pequeñas victorias con otros padres."] },
  ],
};
function pickFeature(stage, lang, weekNumber) {
  const list = FEATURES[stage];
  const f = list[weekNumber % list.length];
  return { section: f[lang][0], tip: f[lang][1] };
}

/* ==================== TEXTES FIXES ==================== */
const SUBJECT = {
  pregnancy: { fr: (w) => `Semaine ${w} de grossesse 🤰 Votre résumé de la semaine !`, es: (w) => `Semana ${w} de embarazo 🤰 ¡Tu resumen de la semana!`, en: (w) => `Week ${w} of pregnancy 🤰 Your weekly recap!` },
  postpartum: { fr: () => "Votre résumé post-partum de la semaine 💛", es: () => "Tu resumen posparto de la semana 💛", en: () => "Your postpartum recap this week 💛" },
  child: { fr: (n) => `Le développement de ${n} cette semaine 🌱`, es: (n) => `El desarrollo de ${n} esta semana 🌱`, en: (n) => `${n}'s development this week 🌱` },
  conception: { fr: () => "Votre semaine conception 🌸", es: () => "Tu semana de concepción 🌸", en: () => "Your conception week 🌸" },
  generic: { fr: () => "Votre astuce de la semaine chez Me My Baby ✨", es: () => "Tu consejo de la semana en Me My Baby ✨", en: () => "Your tip of the week from Me My Baby ✨" },
};

const UI = {
  fr: { tryLink: "Essayer maintenant", exploreLabel: "✨ À explorer cette semaine dans l'app", ctaLabel: "Me connecter à Me My Baby", signoff: "On vous accompagne à chaque étape 💛",
    unsub: "Vous recevez ce courriel une fois par semaine parce que vous avez un profil actif sur Me My Baby.",
    unsubLink: "Se désabonner de l'infolettre",
    alsoLabel: "👨‍👩‍👧‍👦 Et pour le reste de la famille", greet: (n) => `Bonjour${n ? " " + esc(n) : ""} !` },
  es: { tryLink: "Probar ahora", exploreLabel: "✨ Para explorar esta semana en la app", ctaLabel: "Iniciar sesión en Me My Baby", signoff: "Te acompañamos en cada etapa 💛",
    unsub: "Recibes este correo una vez por semana porque tienes un perfil activo en Me My Baby.",
    unsubLink: "Darse de baja del boletín",
    alsoLabel: "👨‍👩‍👧‍👦 Y para el resto de la familia", greet: (n) => `¡Hola${n ? " " + esc(n) : ""}!` },
  en: { tryLink: "Try it now", exploreLabel: "✨ Worth exploring in the app this week", ctaLabel: "Log in to Me My Baby", signoff: "We're with you every step of the way 💛",
    unsub: "You're receiving this once-a-week email because you have an active Me My Baby profile.",
    unsubLink: "Unsubscribe from this newsletter",
    alsoLabel: "👨‍👩‍👧‍👦 And for the rest of the family", greet: (n) => `Hi${n ? " " + esc(n) : ""}!` },
};

/* ==================== LOGIQUE ==================== */
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
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
  const compareLabel = { fr: `Cette semaine, bébé a environ la taille ${/^(un|une)\s/.test(milestone.compare.fr) ? "d'" + milestone.compare.fr : "de " + milestone.compare.fr} 🌱`, es: `Esta semana, el bebé tiene aproximadamente el tamaño de ${milestone.compare.es} 🌱`, en: `This week, baby is about the size of ${milestone.compare.en} 🌱` }[lang];
  return `<p style="font-size:16px;">${compareLabel}</p><p>${milestone.short[lang]}</p>`;
}

function buildEmail(lang, firstName, subject, mainHtml, suggestion, extraChildren, unsubscribeUrl) {
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
    ${suggestion ? `<div style="background:#FBF6ED;border-radius:14px;padding:16px 18px;margin:20px 0;">
      <p style="margin:0 0 10px;font-weight:700;color:#2F4858;">${t.exploreLabel}</p>
      <p style="margin:0;"><strong>${suggestion.section}</strong> — ${suggestion.tip}</p>
    </div>` : ""}
    ${otherKidsHtml}
    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}" style="background:#D4A54A;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block;">${t.ctaLabel}</a>
    </div>
    <p>${t.signoff}</p>
    <p style="margin-top:28px;font-size:11px;color:#7A7364;">${t.unsub} <a href="${unsubscribeUrl}" style="color:#7A7364;">${t.unsubLink}</a></p>
  </div>`;

  return { subject, html };
}

// Construit une courte mention pour un enfant secondaire (non couvert par le contenu principal).
function childMentionLine(lang, name, weeks) {
  const months = Math.floor(weeks / 4.345);
  if (lang === "fr") return `<strong>${esc(name)}</strong> (${months < 1 ? `${weeks} sem.` : `${months} mois`}) — n'oubliez pas de jeter un œil à la section « 0 à 5 ans » pour son âge.`;
  if (lang === "es") return `<strong>${esc(name)}</strong> (${months < 1 ? `${weeks} sem.` : `${months} meses`}) — no olvides revisar la sección « 0 a 5 años » para su edad.`;
  return `<strong>${esc(name)}</strong> (${months < 1 ? `${weeks} wk` : `${months} mo`}) — don't forget to check the "0 to 5 years" section for their age.`;
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
    // donner envie de revenir dans l'app) et ayant un courriel valide — sauf celles et ceux qui ont
    // décoché l'infolettre dans leur profil (newsletter=false) ; ça ne touche jamais les courriels
    // transactionnels (statut de compte, paiement), qui passent par send-email.js, pas par ce cron.
    // Destinataires : les MEMBRES seulement (billing_anchor_date rempli par le webhook Stripe au
    // début de l'abonnement — même règle que dans l'appli), dont l'accès est encore valide :
    //   - statut « active » (essai gratuit compris) ;
    //   - ou « cancelled » avec des jours déjà payés qui restent ;
    //   - jamais « payment_failed » (accès bloqué).
    // Sauf les membres qui ont refusé l'infolettre (newsletter = false). Une case vide = « oui ».
    // Le contenu s'adapte au profil : grossesse (DPA), post-partum, enfant jusqu'à 5 ans, sinon conception.
    // Mode test : ?only=adresse@courriel.com n'envoie qu'à cette adresse.
    const onlyEmail = (req.query?.only || "").trim().toLowerCase();
    const selectCols = "select=id,email,first_name,last_name,due_date,language,newsletter,subscription_status,subscription_access_until";
    const profilesRes = await fetch(
      onlyEmail
        ? `${SUPABASE_URL}/rest/v1/profiles?email=ilike.${encodeURIComponent(onlyEmail)}&${selectCols}`
        : `${SUPABASE_URL}/rest/v1/profiles?email=not.is.null&billing_anchor_date=not.is.null&${selectCols}`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const allProfiles = await profilesRes.json();
    if (!Array.isArray(allProfiles)) {
      res.status(500).json({ error: "Impossible de récupérer les profils.", details: allProfiles });
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const profiles = allProfiles.filter((p) => {
      if (onlyEmail) return true;
      if (p.newsletter === false) return false;
      const st = p.subscription_status || "active";
      if (st === "payment_failed") return false;
      if (st === "cancelled") return !!p.subscription_access_until && p.subscription_access_until >= todayStr;
      return true;
    });

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
    const plans = []; // un courriel préparé par personne, rempli avant la rédaction des textes neufs

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
      var aiStage;

      if (pregnancyWeeks !== null) {
        // 1) PRIORITÉ — grossesse en cours
        const trimester = pregnancyWeeks <= 13 ? 1 : pregnancyWeeks <= 27 ? 2 : 3;
        const milestone = closestPregnancyMilestone(pregnancyWeeks);
        const pool = PREGNANCY_SUGGESTIONS[trimester][lang];
        suggestion = pool[pregnancyWeeks % pool.length];
        mainHtml = buildMainSection(lang, pregnancyWeeks, milestone);
        subject = SUBJECT.pregnancy[lang](pregnancyWeeks);
        suggestion = pickFeature("pregnancy", lang, weekNumber + pregnancyWeeks);
        var aiStage = { stage: "pregnancy", key: `preg-${pregnancyWeeks}`, detail: `pregnant, week ${pregnancyWeeks} of 40 (trimester ${trimester})` };
      } else {
        const newborn = kids.find((k) => k.weeks < 8);
        if (newborn) {
          // 2) Post-partum récent
          const phase = POSTPARTUM_PHASES.find((p) => newborn.weeks <= p.maxWeek) || POSTPARTUM_PHASES[POSTPARTUM_PHASES.length - 1];
          suggestion = phase.suggestion[lang];
          mainHtml = `<p>${phase.short[lang]}</p>`;
          subject = SUBJECT.postpartum[lang]();
          suggestion = pickFeature("postpartum", lang, weekNumber);
          var aiStage = { stage: "postpartum", key: `pp-${newborn.weeks}`, detail: `new parent, baby is ${newborn.weeks} weeks old (postpartum recovery)` };
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
            suggestion = pickFeature("child", lang, weekNumber + months);
            var aiStage = { stage: "child", key: `child-${months}`, detail: `parent of a child aged ${months} months` };
            focusChildId = youngest.name;
          } else {
            // 4) Aucune grossesse ni enfant de 5 ans et moins → contenu conception / fertilité :
            //    l'astuce de la semaine, une page de l'appli à lire et un outil à essayer, chacun
            //    avec un lien qui ouvre directement la bonne page.
            const tip = CONCEPTION_TIPS[weekNumber % CONCEPTION_TIPS.length];
            const read = CONCEPTION_READS[weekNumber % CONCEPTION_READS.length];
            const tool = CONCEPTION_TOOLS[weekNumber % CONCEPTION_TOOLS.length];
            const T = {
              fr: { intro: "Cette semaine dans votre parcours vers bébé 🌸", tipT: "💡 L'astuce de la semaine", readT: "📖 À lire cette semaine dans l'appli", readBtn: "Lire maintenant →" },
              en: { intro: "This week on your journey to baby 🌸", tipT: "💡 Tip of the week", readT: "📖 This week's read in the app", readBtn: "Read now →" },
              es: { intro: "Esta semana en tu camino hacia el bebé 🌸", tipT: "💡 Consejo de la semana", readT: "📖 Para leer esta semana en la app", readBtn: "Leer ahora →" },
            }[lang];
            mainHtml = `<p style="font-size:16px;margin:0 0 14px;">${T.intro}</p>
              <div style="background:#F3ECE0;border-radius:14px;padding:14px 18px;margin:0 0 14px;">
                <p style="margin:0 0 6px;font-weight:700;color:#9A7444;">${T.tipT}</p>
                <p style="margin:0;">${tip[lang]}</p>
              </div>
              <div style="border:1px solid #E7E1D3;border-radius:14px;padding:14px 18px;margin:0 0 6px;">
                <p style="margin:0 0 4px;font-weight:700;color:#2F4858;">${T.readT}</p>
                <p style="margin:0 0 2px;font-weight:700;">${read.title[lang]}</p>
                <p style="margin:0;font-size:14px;color:#5A5548;">${read.teaser[lang]}</p>
              </div>`;
            // Courriel court : une semaine sur deux une page à lire, l'autre semaine un outil à essayer.
            if (weekNumber % 2 === 0) {
              suggestion = null;
            } else {
              mainHtml = mainHtml.replace(/<div style="border:1px solid #E7E1D3;[\s\S]*?<\/div>/, "");
              suggestion = { ...tool[lang] };
            }
            subject = SUBJECT.conception[lang]();
            var aiStage = { stage: "conception", key: "conception", detail: "trying to conceive or thinking about having a baby (no pregnancy yet, no child under 5)" };
          }
        }
      }

      // Mention des autres enfants de 5 ans et moins non couverts par le contenu principal (max 2,
      // pour ne pas alourdir le courriel).
      const extraChildren = kids
        .filter((k) => k.name !== focusChildId)
        .slice(0, 2)
        .map((k) => childMentionLine(lang, k.name, k.weeks));

      plans.push({ profile, lang, subject, mainHtml, suggestion, extraChildren, aiStage, conceptionTipHtml: aiStage.stage === "conception" });
      aiStage = undefined;
    }

    // Rédaction des textes neufs de la semaine : UN texte par stade et par langue, partagé par
    // toutes les personnes au même stade (6 rédactions à la fois).
    const aiCache = new Map();
    const jobs = [];
    for (const pl of plans) {
      const k = `${pl.aiStage.key}|${pl.lang}`;
      if (!aiCache.has(k)) { aiCache.set(k, null); jobs.push({ k, ...pl.aiStage, lang: pl.lang }); }
    }
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const j = jobs[next++];
        const themes = THEMES[j.stage];
        const theme = themes[(weekNumber + j.k.length) % themes.length];
        aiCache.set(j.k, await writeWeeklyText({ stage: j.stage, detail: j.detail, theme, lang: j.lang, weekNumber }));
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));

    for (const pl of plans) {
      const ai = aiCache.get(`${pl.aiStage.key}|${pl.lang}`);
      let main = pl.mainHtml;
      if (ai) {
        // Conception : le texte neuf remplace l'astuce fixe ; ailleurs, il s'ajoute sous le repère de la semaine.
        main = pl.conceptionTipHtml
          ? main.replace(/<div style="background:#F3ECE0;[\s\S]*?<\/div>/, aiBox(ai, pl.lang))
          : main + aiBox(ai, pl.lang);
      }
      const { subject: finalSubject, html } = buildEmail(pl.lang, fullName(pl.profile), pl.subject, main, pl.suggestion, pl.extraChildren, `${APP_URL}/api/unsubscribe?uid=${pl.profile.id}&lang=${pl.lang}`);
      try {
        await sendViaResend({ to: pl.profile.email, subject: finalSubject, html });
        sent += 1;
      } catch (e) {
        errors.push({ email: pl.profile.email, error: e.message });
      }
      // Petite pause : le service d'envoi limite le nombre de courriels par seconde.
      await new Promise((r) => setTimeout(r, 550));
    }

    res.status(200).json({ ok: true, checked: profiles.length, sent, errors });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur inattendue." });
  }
}

// Nom complet tel qu'écrit dans le profil (prénom + nom, si la personne a mis un nom).
function fullName(p) {
  return `${p?.first_name || ""} ${p?.last_name || ""}`.replace(/\s+/g, " ").trim();
}
