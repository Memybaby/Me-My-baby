// =====================================================================================
// SITE PUBLIC (pages pour Google) — www.memybabyapp.com/fr, /en, /es, calculateurs, articles
// -------------------------------------------------------------------------------------
// Ce fichier reprend TELS QUELS les morceaux de l'appli (même accueil, mêmes textes, mêmes
// couleurs, mêmes calculateurs, mêmes bulles d'essai gratuit) pour que le site soit à l'image de
// l'appli. Il est utilisé seulement par seo-build.mjs (au moment de la mise en ligne) : l'appli
// elle-même ne le charge jamais.
//
// Ce qui est offert gratuitement ici : les 2 calculateurs et les articles publics.
// Tout le reste (suivi semaine par semaine, outils, Léa, Novaris…) reste réservé aux membres :
// le site en montre seulement des APERÇUS (images des vraies pages) pour donner envie.
// =====================================================================================
import React from "react";
import {
  Globe, ChevronRight, Lock, Check, Sparkles, Search, ClipboardList, Baby, Heart, Moon, Apple, Gift,
  ArrowLeft, Stethoscope, Footprints, Camera,
} from "lucide-react";
import {
  Home, PregnancyCalculator, OvulationCalculator, Card, Logo, COLORS, UI_FONT,
  ToyDivider, PLANS, T as APP_T,
  AIAssistant, SleepTracker, PlanningsTool, GrowthTracker, KickTracker, QuickTrackerLinks, BumpAlbumTool, QuickAccessBar, GlobalSearch,
  WeeklyMenuTable, ForumSection,
} from "./App.jsx";

const FRAUNCES = "Fraunces, Georgia, serif";
const GRADIENT = `linear-gradient(120deg, ${COLORS.pink} 0%, ${COLORS.ochre} 100%)`;
export const appUrl = (lang) => `/?lang=${lang}`;

// ---------------------------------------------------------------- Textes du site public
export const PT = {
  fr: {
    navPreg: "Calculateur de grossesse", navOv: "Calculateur d'ovulation", navArticles: "Articles", home: "Accueil",
    download: "Télécharger l'appli gratuitement", downloadShort: "Télécharger", signIn: "Se connecter",
    trialNote: "✨ Gratuite à télécharger — sur téléphone, tablette et ordinateur.",
    barTitle: "L'appli Me My Baby", barSub: "Gratuite à télécharger",
    showH: "Découvrez l'appli de l'intérieur",
    showSub: "Voici quelques pages de Me My Baby, telles que vous les verrez une fois membre.",
    swipe: "Glissez pour voir la suite →", example: "Aperçu",
    inclH: "Tout ce que contient l'appli", inclSub: "De la conception à 5 ans, tout est réuni au même endroit.", inclMore: "Voir tout le reste",
    faqH: "Questions fréquentes",
    faq: [
      ["Comment obtenir l'appli Me My Baby ?", "Touchez « Télécharger l'appli gratuitement » : l'appli s'ouvre aussitôt sur votre téléphone, votre tablette ou votre ordinateur. Créez votre compte gratuit, puis ajoutez l'appli à votre écran d'accueil pour la retrouver en un geste."],
      ["L'appli est-elle gratuite ?", "Oui, Me My Baby est gratuite à télécharger, et plusieurs sections sont gratuites pour tous, comme le calculateur de grossesse, le calculateur d'ovulation et les articles. En devenant membre, vous débloquez tout le reste de l'appli."],
      ["Est-ce que Me My Baby remplace mon médecin ?", "Non. L'appli vous informe et vous accompagne au quotidien, mais elle ne remplace jamais l'avis d'un professionnel de la santé."],
      ["Mes données sont-elles protégées ?", "Oui. Vos renseignements de santé sont hébergés au Canada, ne sont jamais vendus ni utilisés pour de la publicité, et vous pouvez les supprimer en tout temps."],
      ["Dans quelles langues l'appli est-elle offerte ?", "En français, en anglais et en espagnol. Vous pouvez changer de langue en tout temps."],
    ],
    screens: [
      ["Votre grossesse, semaine après semaine", "La taille de bébé, votre trimestre et les jours restants, toujours à jour."],
      ["Léa, votre diététicienne virtuelle", "Des menus pour toute la semaine, avec les recettes et la liste d'épicerie."],
      ["Novaris répond à vos questions", "Une assistante disponible jour et nuit, pour chaque étape."],
      ["Le sommeil de bébé, en douceur", "Notez siestes et nuits, et apaisez bébé avec des berceuses."],
      ["Sa croissance, suivie de près", "Poids et taille selon les courbes de l'OMS."],
      ["Compte-coups de bébé", "Bébé bouge ? Un seul geste pour compter ses mouvements."],
      ["Ma bedaine", "Une photo par semaine pour voir votre bedaine grandir, du début à la fin."],
      ["Des plannings prêts à imprimer", "Ménage, routines, épicerie, budget, valise d'hôpital…"],
      ["Et bien plus encore…", "Tous vos outils réunis sur une seule page — et toutes les sections, de la conception à 5 ans."],
    ],
    moreH: "Et bien plus encore…", toolLabels: ["Sommeil", "Suivi de croissance", "Coups de bébé", "Mes plannings", "Ma bedaine"],
    lockPregH: "La suite de votre grossesse, dans l'appli",
    lockPreg: ["Ce qui se développe chez bébé chaque semaine, et sa taille", "Vos symptômes possibles et quoi faire", "Vos rendez-vous et examens à prévoir", "Des menus adaptés à votre trimestre, créés par Léa"],
    lockOvH: "Mettez toutes les chances de votre côté",
    lockOv: ["Votre suivi de cycle, mois après mois", "Préparer votre corps à la grossesse", "Des menus pour soutenir la fertilité", "Dès le test positif : votre grossesse suivie semaine après semaine"],
    unlock: "Devenir membre",
    alsoTry: "Essayez aussi", moreInfo: "Bon à savoir",
    artTitle: "Articles", artIntro: "Des articles fiables pour chaque étape, de la grossesse aux 5 ans de votre enfant.", artSub: "4 nouveaux articles chaque semaine.",
    searchPh: "Rechercher un article (ex. sommeil, nausées...)", allCats: "Tous", readMore: "Lire l'article",
    minRead: (n) => `${n} min de lecture`, sources: "Sources", noResults: "Aucun article ne correspond à votre recherche.",
    latest: "Les plus récents", allArticles: "Tous les articles", related: "À lire aussi", backArticles: "← Tous les articles",
    photo: "Photo : Unsplash",
    privacy: "Politique de confidentialité", terms: "Conditions d'utilisation",
    footer: "Me My Baby — de la conception à 5 ans. Le contenu de cette application est informatif et ne remplace pas l'avis d'un professionnel de la santé.",
    promoH: "Plus de contenu vous attend dans l'appli",
    promo: {
      grossesse: ["Suivez votre grossesse semaine par semaine", "Votre semaine, la taille de bébé, vos symptômes, vos rendez-vous et des menus adaptés, dans une seule appli."],
      accouchement: ["Préparez votre accouchement en toute sérénité", "Plan de naissance, valise d'hôpital, minuteur de contractions et réponses à vos questions."],
      sommeil: ["Suivez le sommeil de bébé en un geste", "Notez les siestes et les nuits, et trouvez des conseils adaptés à son âge."],
      alimentation: ["Simplifiez l'alimentation de bébé", "Suivi de l'allaitement et des biberons, introduction des aliments et menus pour toute la famille."],
    },
  },
  en: {
    navPreg: "Pregnancy calculator", navOv: "Ovulation calculator", navArticles: "Articles", home: "Home",
    download: "Download the app for free", downloadShort: "Download", signIn: "Sign in",
    trialNote: "✨ Free to download — on phone, tablet and computer.",
    barTitle: "The Me My Baby app", barSub: "Free to download",
    showH: "Take a look inside the app",
    showSub: "Here are a few pages of Me My Baby, just as you'll see them as a member.",
    swipe: "Swipe to see more →", example: "Preview",
    inclH: "Everything inside the app", inclSub: "From conception to age 5, everything in one place.", inclMore: "See everything else",
    faqH: "Frequently asked questions",
    faq: [
      ["How do I get the Me My Baby app?", "Tap \"Download the app for free\": the app opens right away on your phone, tablet or computer. Create your free account, then add the app to your home screen to open it in one tap."],
      ["Is the app free?", "Yes, Me My Baby is free to download, and several sections are free for everyone, like the pregnancy calculator, the ovulation calculator and the articles. By becoming a member, you unlock the rest of the app."],
      ["Does Me My Baby replace my doctor?", "No. The app informs and supports you every day, but it never replaces advice from a healthcare professional."],
      ["Is my data protected?", "Yes. Your health information is hosted in Canada, never sold or used for advertising, and you can delete it at any time."],
      ["Which languages is the app available in?", "English, French and Spanish. You can switch languages at any time."],
    ],
    screens: [
      ["Your pregnancy, week by week", "Baby's size, your trimester and the days to go, always up to date."],
      ["Léa, your virtual dietitian", "Menus for the whole week, with recipes and a grocery list."],
      ["Novaris answers your questions", "An assistant available day and night, for every stage."],
      ["Gentle sleep for baby", "Log naps and nights, and soothe baby with lullabies."],
      ["Growth, closely followed", "Weight and height on the WHO growth charts."],
      ["Baby kick counter", "Baby's moving? One tap to count each movement."],
      ["My bump", "One photo a week to watch your bump grow, from start to finish."],
      ["Printable planners", "Cleaning, routines, groceries, budget, hospital bag…"],
      ["And so much more…", "All your tools gathered on one page — plus every section, from conception to age 5."],
    ],
    moreH: "And so much more…", toolLabels: ["Sleep", "Growth tracker", "Baby kicks", "My planners", "My bump"],
    lockPregH: "The rest of your pregnancy, in the app",
    lockPreg: ["What's developing in baby each week, and their size", "Your possible symptoms and what to do", "Upcoming appointments and tests", "Menus adapted to your trimester, created by Léa"],
    lockOvH: "Give yourself every chance",
    lockOv: ["Your cycle tracker, month after month", "Prepare your body for pregnancy", "Menus to support fertility", "From the positive test: your pregnancy followed week by week"],
    unlock: "Become a member",
    alsoTry: "Also try", moreInfo: "Good to know",
    artTitle: "Articles", artIntro: "Trustworthy articles for every stage, from pregnancy to your child's 5th birthday.", artSub: "4 new articles every week.",
    searchPh: "Search articles (e.g. sleep, nausea...)", allCats: "All", readMore: "Read the article",
    minRead: (n) => `${n} min read`, sources: "Sources", noResults: "No articles match your search.",
    latest: "Latest", allArticles: "All articles", related: "Read next", backArticles: "← All articles",
    photo: "Photo: Unsplash",
    privacy: "Privacy policy", terms: "Terms of use",
    footer: "Me My Baby — from conception to age 5. Content in this app is informational and does not replace advice from a healthcare professional.",
    promoH: "More is waiting for you in the app",
    promo: {
      grossesse: ["Follow your pregnancy week by week", "Your week, baby's size, your symptoms, your appointments and adapted menus, all in one app."],
      accouchement: ["Prepare for birth with peace of mind", "Birth plan, hospital bag, contraction timer and answers to your questions."],
      sommeil: ["Track baby's sleep in one tap", "Log naps and nights, and find tips adapted to their age."],
      alimentation: ["Make feeding baby simpler", "Breastfeeding and bottle tracking, starting solids and menus for the whole family."],
    },
  },
  es: {
    navPreg: "Calculadora de embarazo", navOv: "Calculadora de ovulación", navArticles: "Artículos", home: "Inicio",
    download: "Descarga la app gratis", downloadShort: "Descargar", signIn: "Iniciar sesión",
    trialNote: "✨ Gratis para descargar — en teléfono, tableta y computadora.",
    barTitle: "La app Me My Baby", barSub: "Gratis para descargar",
    showH: "Descubre la app por dentro",
    showSub: "Estas son algunas páginas de Me My Baby, tal como las verás como miembro.",
    swipe: "Desliza para ver más →", example: "Vista previa",
    inclH: "Todo lo que contiene la app", inclSub: "De la concepción a los 5 años, todo reunido en un solo lugar.", inclMore: "Ver todo lo demás",
    faqH: "Preguntas frecuentes",
    faq: [
      ["¿Cómo obtengo la app Me My Baby?", "Toca «Descarga la app gratis»: la app se abre de inmediato en tu teléfono, tableta o computadora. Crea tu cuenta gratuita y agrega la app a tu pantalla de inicio para abrirla con un toque."],
      ["¿La app es gratis?", "Sí, Me My Baby es gratis para descargar, y varias secciones son gratuitas para todas, como la calculadora de embarazo, la calculadora de ovulación y los artículos. Al hacerte miembro, desbloqueas todo el resto de la app."],
      ["¿Me My Baby reemplaza a mi médico?", "No. La app te informa y te acompaña cada día, pero nunca sustituye el consejo de un profesional de la salud."],
      ["¿Mis datos están protegidos?", "Sí. Tu información de salud se aloja en Canadá, nunca se vende ni se usa para publicidad, y puedes eliminarla en cualquier momento."],
      ["¿En qué idiomas está disponible la app?", "En español, francés e inglés. Puedes cambiar de idioma cuando quieras."],
    ],
    screens: [
      ["Tu embarazo, semana a semana", "El tamaño del bebé, tu trimestre y los días restantes, siempre al día."],
      ["Léa, tu nutricionista virtual", "Menús para toda la semana, con recetas y lista de compras."],
      ["Novaris responde tus preguntas", "Una asistente disponible día y noche, en cada etapa."],
      ["El sueño del bebé, con dulzura", "Anota siestas y noches, y calma al bebé con canciones de cuna."],
      ["Su crecimiento, de cerca", "Peso y talla según las curvas de la OMS."],
      ["Contador de patadas", "¿El bebé se mueve? Un toque para contar cada movimiento."],
      ["Mi pancita", "Una foto por semana para ver crecer tu pancita, de principio a fin."],
      ["Plannings listos para imprimir", "Limpieza, rutinas, compras, presupuesto, maleta del hospital…"],
      ["Y mucho más…", "Todas tus herramientas reunidas en una sola página — y todas las secciones, de la concepción a los 5 años."],
    ],
    moreH: "Y mucho más…", toolLabels: ["Sueño", "Seguimiento del crecimiento", "Movimientos del bebé", "Mis plannings", "Mi pancita"],
    lockPregH: "El resto de tu embarazo, en la app",
    lockPreg: ["Lo que se desarrolla en tu bebé cada semana, y su tamaño", "Tus posibles síntomas y qué hacer", "Tus citas y exámenes por venir", "Menús adaptados a tu trimestre, creados por Léa"],
    lockOvH: "Pon todas las posibilidades de tu lado",
    lockOv: ["Tu seguimiento del ciclo, mes a mes", "Preparar tu cuerpo para el embarazo", "Menús para apoyar la fertilidad", "Desde la prueba positiva: tu embarazo seguido semana a semana"],
    unlock: "Hazte miembro",
    alsoTry: "Prueba también", moreInfo: "Bueno saber",
    artTitle: "Artículos", artIntro: "Artículos confiables para cada etapa, del embarazo a los 5 años de tu hijo.", artSub: "4 artículos nuevos cada semana.",
    searchPh: "Buscar un artículo (ej. sueño, náuseas...)", allCats: "Todos", readMore: "Leer el artículo",
    minRead: (n) => `${n} min de lectura`, sources: "Fuentes", noResults: "Ningún artículo coincide con tu búsqueda.",
    latest: "Los más recientes", allArticles: "Todos los artículos", related: "Para leer también", backArticles: "← Todos los artículos",
    photo: "Foto: Unsplash",
    privacy: "Política de privacidad", terms: "Términos de uso",
    footer: "Me My Baby — de la concepción a los 5 años. El contenido de esta aplicación es informativo y no sustituye el consejo de un profesional de la salud.",
    promoH: "Más contenido te espera en la app",
    promo: {
      grossesse: ["Sigue tu embarazo semana a semana", "Tu semana, el tamaño del bebé, tus síntomas, tus citas y menús adaptados, en una sola app."],
      accouchement: ["Prepara tu parto con tranquilidad", "Plan de parto, maleta del hospital, temporizador de contracciones y respuestas a tus preguntas."],
      sommeil: ["Sigue el sueño del bebé con un toque", "Anota siestas y noches, y encuentra consejos adaptados a su edad."],
      alimentation: ["Simplifica la alimentación del bebé", "Seguimiento de la lactancia y los biberones, introducción de alimentos y menús para toda la familia."],
    },
  },
};

// ---------------------------------------------------------------- Petits morceaux réutilisés
// Bloc HTML déjà rendu au moment de la mise en ligne (aperçus, texte d'article…) : React le
// garde tel quel dans le navigateur au lieu de le recalculer.
function Static({ id, html, style }) {
  const h = html !== undefined ? html : (typeof document !== "undefined" ? (document.getElementById(id)?.innerHTML ?? "") : "");
  return <div id={id} style={style} dangerouslySetInnerHTML={{ __html: h }} />;
}

export function DownloadButton({ lang, big, full, label }) {
  return (
    <a href={appUrl(lang)} style={{
      display: full ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: GRADIENT, color: "#fff", textDecoration: "none", border: "none",
      padding: big ? "13px 22px" : "11px 18px", borderRadius: 999, fontSize: big ? 15 : 13.5, fontWeight: 800, whiteSpace: "nowrap", maxWidth: "100%",
      boxShadow: "0 8px 20px rgba(217,139,164,0.35)", letterSpacing: "0.01em", textAlign: "center",
    }}>
      <DownloadIcon size={big ? 18 : 16} /> {label || PT[lang].download}
    </a>
  );
}

// Flèche de téléchargement dessinée ici (pour ne dépendre d'aucune icône absente de l'appli).
function DownloadIcon({ size = 16, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  );
}

function SectionTitle({ children, sub, center }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", marginBottom: 14 }}>
      <h2 style={{ fontFamily: FRAUNCES, fontSize: 24, color: COLORS.teal, margin: "0 0 6px", lineHeight: 1.2 }}>{children}</h2>
      {sub && <p style={{ color: COLORS.muted, fontSize: 14.5, margin: center ? "0 auto" : 0, maxWidth: 560, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Aperçus « comme dans un magasin d'applis »
// Chaque aperçu est une VRAIE page de l'appli (mêmes composants), affichée en petit dans un
// cadre de téléphone, avec des données d'exemple. Rien n'est cliquable : c'est une image.
const SCREEN_COLORS = [COLORS.pink, COLORS.ochre, COLORS.sage, COLORS.blue, COLORS.sky, COLORS.mint, COLORS.coral, COLORS.lavender, COLORS.yellow];

export function PhoneFrame({ children, scale = 0.58, height = 780, fade = true }) {
  const w = Math.round(390 * scale);
  return (
    <div style={{
      width: w + 16, background: "#3B2A20", borderRadius: 34, padding: 8, margin: "0 auto",
      boxShadow: "0 18px 40px rgba(91,58,36,0.28)", position: "relative",
    }}>
      <div style={{ position: "absolute", top: 13, left: "50%", transform: "translateX(-50%)", width: 64, height: 6, borderRadius: 999, background: "#5A4334", zIndex: 2 }} />
      <div style={{ width: w, height: Math.round(height * scale), overflow: "hidden", borderRadius: 26, background: COLORS.cream, position: "relative" }}>
        <div style={{ width: 390, transform: `scale(${scale})`, transformOrigin: "top left", padding: "26px 14px 14px", fontFamily: UI_FONT, color: COLORS.text, pointerEvents: "none" }} aria-hidden="true">
          {children}
        </div>
        {fade && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 60, background: `linear-gradient(180deg, ${COLORS.cream}00 0%, ${COLORS.cream} 100%)` }} />}
      </div>
    </div>
  );
}

// Profil d'exemple pour les aperçus (aucune vraie personne).
function demoProfile() {
  const due = new Date(Date.now() + 112 * 86400000).toISOString().slice(0, 10);
  return { firstName: "Sophie", dueDate: due, children: 1 };
}
const noop = () => {};
const demoKids = [{ id: "demo", name: "Léo" }];

// Page d'un outil telle qu'elle s'ouvre dans l'appli : en-tête de couleur, icône, titre et petite vague.
function ToolScreen({ color, Icon, label, children }) {
  return (
    <div style={{ margin: "-26px -14px 0", background: COLORS.cream }}>
      <div style={{ position: "relative", overflow: "hidden", padding: "34px 20px 34px", background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)` }}>
        <div style={{ background: "rgba(255,255,255,0.28)", borderRadius: 999, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <ArrowLeft size={18} color="#fff" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={22} color="#fff" />
          </div>
          <div style={{ fontFamily: FRAUNCES, fontSize: 21, color: "#fff", fontWeight: 700 }}>{label}</div>
        </div>
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: -1, width: "100%", height: 24 }}>
          <path d="M0,24 L0,10 C60,22 140,0 200,8 C260,16 340,22 400,6 L400,24 Z" fill={COLORS.cream} />
        </svg>
      </div>
      <div style={{ padding: "16px 18px 48px" }}>{children}</div>
    </div>
  );
}

// L'écran complet de l'appli : en-tête (logo, recherche, langue), la page, et la barre
// Novaris · Forum · Léa · Articles en bas — exactement comme sur le téléphone.
const CHROME_H = 728;
function AppChrome({ lang, children }) {
  return (
    <div style={{ margin: "-26px -14px 0", height: CHROME_H, position: "relative", overflow: "hidden", transform: "translateZ(0)", background: COLORS.cream }}>
      <div style={{ background: "rgba(247,244,238,0.82)", borderBottom: `1px solid ${COLORS.line}`, padding: "30px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ background: COLORS.line, padding: "8px 14px", borderRadius: 14, display: "flex", alignItems: "center" }}><Logo height={30} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GlobalSearch lang={lang} goTo={noop} compact />
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: COLORS.muted }}>
            <Globe size={15} />{lang.toUpperCase()}
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 16px 0" }}>{children}</div>
      <QuickAccessBar lang={lang} active="accueil" goTo={noop} isMember />
    </div>
  );
}
const LAST_SCREEN_PHONE = { height: CHROME_H, fade: false };

export function screenElements(lang) {
  const prof = demoProfile();
  const [sleep, growth, kicks, plannings, bump] = PT[lang].toolLabels;
  return [
    <Home lang={lang} goTo={noop} isMember userProfile={prof} children={[]} />,
    <WeeklyMenuTable menuKey="breastfeeding" lang={lang} onSelectRecipe={noop} />,
    <AIAssistant lang={lang} isMember goTo={noop} />,
    <ToolScreen color={COLORS.sky} Icon={Moon} label={sleep}><SleepTracker lang={lang} children={demoKids} goTo={noop} /></ToolScreen>,
    <ToolScreen color={COLORS.sage} Icon={Stethoscope} label={growth}><GrowthTracker lang={lang} children={demoKids} goTo={noop} /></ToolScreen>,
    <ToolScreen color={COLORS.ochre} Icon={Footprints} label={kicks}><KickTracker lang={lang} goTo={noop} /></ToolScreen>,
    <ToolScreen color={COLORS.plum} Icon={Camera} label={bump}><BumpAlbumTool lang={lang} userProfile={prof} goTo={noop} /></ToolScreen>,
    <ToolScreen color={COLORS.sage} Icon={ClipboardList} label={plannings}><PlanningsTool lang={lang} goTo={noop} userProfile={prof} /></ToolScreen>,
    <AppChrome lang={lang}><QuickTrackerLinks lang={lang} isMember goTo={noop} children={demoKids} userProfile={prof} /></AppChrome>,
  ];
}

// Le carrousel complet (rendu une seule fois au moment de la mise en ligne).
export function ShowcaseStatic({ lang, renderScreen }) {
  const P = PT[lang];
  return (
    <div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory", padding: "4px 2px 14px", WebkitOverflowScrolling: "touch" }}>
        {P.screens.map(([title, text], i) => {
          const c = SCREEN_COLORS[i % SCREEN_COLORS.length];
          const html = renderScreen(i);
          if (!html) return null;
          return (
            <div key={i} style={{
              flex: "0 0 auto", width: 268, scrollSnapAlign: "start", borderRadius: 24, overflow: "hidden",
              background: `linear-gradient(170deg, ${c}38 0%, ${COLORS.cream} 70%)`, border: `1px solid ${c}40`,
              padding: "18px 14px 0", display: "flex", flexDirection: "column",
            }}>
              <div style={{ fontFamily: FRAUNCES, fontSize: 18, fontWeight: 700, color: COLORS.teal, lineHeight: 1.25, marginBottom: 5, minHeight: 45 }}>{title}</div>
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 14px", lineHeight: 1.45, minHeight: 36 }}>{text}</p>
              <div style={{ marginTop: "auto", height: 440, overflow: "hidden" }}>
                <PhoneFrame {...(i === P.screens.length - 1 ? LAST_SCREEN_PHONE : {})}><div dangerouslySetInnerHTML={{ __html: html }} /></PhoneFrame>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: COLORS.muted, textAlign: "right", margin: "0 4px", fontWeight: 600 }}>{P.swipe}</p>
    </div>
  );
}

function Showcase({ lang, statics }) {
  const P = PT[lang];
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle sub={P.showSub}>{P.showH}</SectionTitle>
      <Static id="mmb-showcase" html={statics?.showcase} />
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <DownloadButton lang={lang} big />
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "10px 0 0", fontWeight: 600 }}>{P.trialNote}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Ce que contient l'appli
// Même liste que « Tout ce qui est inclus » dans l'appli, présentée sans aucun prix.
function Included({ lang }) {
  const P = PT[lang];
  const plan = PLANS[lang].find((p) => p.id === "premium") || PLANS[lang][0];
  const colors = [COLORS.sage, COLORS.ochre, COLORS.pink, COLORS.blue];
  const Item = ({ f, i }) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fff", border: `1px solid ${colors[i % 4]}25`, borderRadius: 12, padding: "10px 12px", boxShadow: `0 3px 10px ${colors[i % 4]}18` }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: colors[i % 4], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <Check size={12} color="#fff" strokeWidth={3} />
      </div>
      <span style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.5 }}>{f}</span>
    </div>
  );
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 };
  return (
    <Card style={{ marginBottom: 28, border: `1px solid ${COLORS.ochre}30`, position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${COLORS.ochre}1c 0%, ${COLORS.cream} 55%, ${COLORS.sage}16 100%)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.yellow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Check size={16} color={COLORS.teal} strokeWidth={3} />
        </div>
        <h2 style={{ fontWeight: 800, color: COLORS.teal, fontFamily: FRAUNCES, fontSize: 21, margin: 0 }}>{P.inclH}</h2>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 16px", lineHeight: 1.5 }}>{P.inclSub}</p>
      <div style={grid}>{plan.features.slice(0, 6).map((f, i) => <Item key={i} f={f} i={i} />)}</div>
      <p style={{ textAlign: "center", fontFamily: FRAUNCES, fontSize: 17, fontWeight: 700, color: COLORS.teal, margin: "16px 0 0" }}>✨ {P.moreH}</p>
      <div style={{ textAlign: "center", marginTop: 18 }}><DownloadButton lang={lang} big /></div>
    </Card>
  );
}

function Faq({ lang }) {
  const P = PT[lang];
  return (
    <div style={{ marginBottom: 28 }}>
      <SectionTitle>{P.faqH}</SectionTitle>
      {P.faq.map(([q, a], i) => (
        <details key={i} style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "13px 16px", marginBottom: 8 }}>
          <summary style={{ fontWeight: 700, color: COLORS.teal, cursor: "pointer", fontSize: 14.5 }}>{q}</summary>
          <p style={{ margin: "10px 0 2px", fontSize: 14, color: COLORS.text, lineHeight: 1.65 }}>{a}</p>
        </details>
      ))}
    </div>
  );
}

// Grande invitation finale — même bulle que « Prête à faire vos premiers pas » de l'accueil.
function Closing({ lang }) {
  const h = APP_T[lang].home;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${COLORS.pink}22 0%, ${COLORS.cream} 55%, ${COLORS.ochre}1c 100%)`,
      border: `1px solid ${COLORS.pink}30`, borderRadius: 24, padding: "34px 26px", textAlign: "center", margin: "30px 0 10px",
    }}>
      <h2 style={{ fontFamily: FRAUNCES, fontSize: 25, margin: "0 0 8px", color: COLORS.teal }}>{h.closingTitle}</h2>
      <p style={{ fontSize: 14.5, color: COLORS.muted, margin: "0 auto 20px", maxWidth: 440 }}>{h.closingDesc}</p>
      <DownloadButton lang={lang} big />
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "12px 0 0", fontWeight: 600 }}>{PT[lang].trialNote}</p>
    </div>
  );
}

// Bulle « réservé aux membres », dans le style du cadenas de l'appli, avec la liste de ce qu'on débloque.
function MemberTeaser({ lang, title, items, statics, previewId }) {
  const P = PT[lang];
  return (
    <Card style={{ marginBottom: 28, background: `linear-gradient(135deg, ${COLORS.ochre}1c 0%, ${COLORS.cream} 55%, ${COLORS.sage}16 100%)`, border: `1px solid ${COLORS.ochre}30` }}>
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Lock size={19} color="#fff" />
          </div>
          <h2 style={{ fontFamily: FRAUNCES, fontSize: 22, color: COLORS.teal, margin: "0 0 12px", lineHeight: 1.25 }}>{title}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fff", borderRadius: 12, padding: "9px 12px", border: `1px solid ${COLORS.line}` }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: [COLORS.sage, COLORS.ochre, COLORS.pink, COLORS.blue][i % 4], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
                <span style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.45 }}>{it}</span>
              </div>
            ))}
          </div>
          <a href={appUrl(lang)} style={{ display: "inline-block", background: COLORS.ochre, color: "#fff", textDecoration: "none", padding: "11px 22px", borderRadius: 999, fontSize: 14, fontWeight: 700 }}>{P.unlock}</a>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: "10px 0 0", fontWeight: 600 }}>{P.trialNote}</p>
        </div>
        {previewId && (
          <div style={{ flex: "0 0 auto", margin: "0 auto", height: 400, overflow: "hidden" }}>
            <Static id={previewId} html={statics?.[previewId]} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Gabarit commun (en-tête de l'appli)
function Header({ page }) {
  const { lang, paths, alternates } = page;
  const P = PT[lang];
  return (
    <header style={{
      background: "rgba(247,244,238,0.82)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      borderBottom: `1px solid ${COLORS.line}`, position: "sticky", top: 0, zIndex: 30,
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <a href={paths.home} aria-label="Me My Baby" style={{ background: COLORS.line, padding: "8px 14px", borderRadius: 14, display: "flex", alignItems: "center" }}>
          <Logo height={30} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, color: COLORS.muted }}>
            <Globe size={14} />
            {["fr", "en", "es"].map((l) => (alternates?.[l]
              ? <a key={l} href={alternates[l]} hrefLang={l} style={{ color: l === lang ? COLORS.teal : COLORS.muted, textDecoration: l === lang ? "underline" : "none" }}>{l.toUpperCase()}</a>
              : null))}
          </div>
          <a href={appUrl(lang)} className="hdr-dl" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: GRADIENT, color: "#fff", textDecoration: "none", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800, boxShadow: "0 4px 12px rgba(217,139,164,0.3)" }}>
            <DownloadIcon size={14} /> <span>{P.downloadShort}</span>
          </a>
        </div>
      </div>
      <nav style={{ maxWidth: 880, margin: "0 auto", padding: "0 16px 10px", display: "flex", gap: 8, overflowX: "auto" }}>
        {[["preg", "🤰 " + P.navPreg], ["ov", "🌸 " + P.navOv], ["articles", "📖 " + P.navArticles]].map(([k, label]) => {
          const on = page.section === k;
          return (
            <a key={k} href={paths[k]} style={{
              flex: "0 0 auto", padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, textDecoration: "none",
              border: `1px solid ${on ? COLORS.teal : COLORS.line}`, background: on ? COLORS.teal : "#fff", color: on ? "#fff" : COLORS.text,
            }}>{label}</a>
          );
        })}
      </nav>
    </header>
  );
}

function Footer({ page }) {
  const { lang, paths } = page;
  const P = PT[lang];
  const a = { color: COLORS.muted, fontSize: 12.5, margin: "0 8px", textDecoration: "underline" };
  return (
    <footer style={{ borderTop: `1px solid ${COLORS.line}`, padding: "24px 20px 30px", textAlign: "center" }}>
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><Logo height={26} /></div>
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 auto 12px", maxWidth: 620 }}>{P.footer}</p>
      <div style={{ marginBottom: 10 }}>
        <a href={paths.preg} style={a}>{P.navPreg}</a><a href={paths.ov} style={a}>{P.navOv}</a><a href={paths.articles} style={a}>{P.navArticles}</a>
      </div>
      <div style={{ marginBottom: 10 }}>
        <a href={paths.privacy} style={a}>{P.privacy}</a><a href={paths.terms} style={a}>{P.terms}</a><a href={appUrl(lang)} style={a}>{P.signIn}</a>
      </div>
      <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>© {new Date().getFullYear()} Me My Baby — Québec (Canada)</p>
    </footer>
  );
}

// Barre fixe en bas de l'écran (même esprit que la barre de raccourcis de l'appli).
function DownloadBar({ lang }) {
  const P = PT[lang];
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
      background: `linear-gradient(180deg, ${COLORS.cream}F2 0%, ${COLORS.cream} 100%)`,
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      borderTop: `1px solid ${COLORS.ochre}30`, boxShadow: "0 -6px 20px rgba(91,58,36,0.10)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 14px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FRAUNCES, fontWeight: 700, color: COLORS.teal, fontSize: 14.5, lineHeight: 1.2 }}>{P.barTitle}</div>
          <div style={{ fontSize: 11.5, color: COLORS.muted, fontWeight: 600 }}>{P.barSub}</div>
        </div>
        <a href={appUrl(lang)} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, background: GRADIENT, color: "#fff", textDecoration: "none", padding: "10px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: 800, boxShadow: "0 6px 16px rgba(217,139,164,0.32)" }}>
          <DownloadIcon size={15} /> {P.downloadShort}
        </a>
      </div>
    </div>
  );
}

export const GLOBAL_CSS = `
* { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
body { margin: 0; background: ${COLORS.cream}; }
button { font-family: inherit; }
a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid ${COLORS.ochre}; outline-offset: 2px; }
.page-shell { max-width: 880px; margin: 0 auto; padding: 22px 24px 64px; }
summary::marker { color: ${COLORS.ochre}; }
@media (max-width: 900px) { .page-shell { padding: 14px 16px 40px; } }
@media (max-width: 560px) { .hero-illu { display: none; } }
@media (max-width: 360px) { .hdr-dl span { display: none; } }
`;

function Crumbs({ items }) {
  return (
    <div style={{ fontSize: 12.5, color: COLORS.muted, margin: "2px 0 14px" }}>
      {items.map(([label, href], i) => (
        <span key={i}>{i > 0 && " › "}{href ? <a href={href} style={{ color: COLORS.muted }}>{label}</a> : label}</span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Pages
function HomePage({ page, statics }) {
  const { lang } = page;
  const goTo = (id) => { window.location.href = id === "articles" ? page.paths.articles : id === "accueil" ? page.paths.home : appUrl(lang); };
  return (
    <Home
      lang={lang} goTo={goTo} isMember={false} hideTools
      heroExtra={(
        <a href={appUrl(lang)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: COLORS.teal, textDecoration: "none", border: `2px solid ${COLORS.teal}`, padding: "9px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 700 }}>
          <DownloadIcon size={15} color={COLORS.teal} /> {PT[lang].download}
        </a>
      )}
      publicExtra={(
        <>
          <Showcase lang={lang} statics={statics} />
          <div style={{ marginBottom: 28 }}><ForumSection lang={lang} isMember={false} goTo={goTo} /></div>
          <Included lang={lang} />
          <Faq lang={lang} />
        </>
      )}
    />
  );
}

function CalcPage({ page, statics }) {
  const { lang, calc, kind } = page;
  const P = PT[lang];
  const goTo = (id) => { window.location.href = id === "accueil" ? page.paths.home : appUrl(lang); };
  const isPreg = kind === "preg";
  const other = isPreg ? ["ov", P.navOv, "🌸"] : ["preg", P.navPreg, "🤰"];
  return (
    <div>
      <Crumbs items={[[P.home, page.paths.home], [calc.h1, null]]} />
      <h1 style={{ fontFamily: FRAUNCES, fontSize: 28, color: COLORS.teal, margin: "0 0 8px", lineHeight: 1.2 }}>{calc.h1}</h1>
      <p style={{ color: COLORS.muted, fontSize: 15, lineHeight: 1.6, margin: "0 0 18px", maxWidth: 620 }}>{calc.intro}</p>
      <div data-calc={kind}>{isPreg ? <PregnancyCalculator lang={lang} goTo={goTo} /> : <OvulationCalculator lang={lang} goTo={goTo} />}</div>
      <MemberTeaser lang={lang} title={isPreg ? P.lockPregH : P.lockOvH} items={isPreg ? P.lockPreg : P.lockOv} statics={statics} previewId="mmb-calc-preview" />
      <ToyDivider />
      <Static id="mmb-calc-seo" html={statics?.seo} />
      <a href={page.paths[other[0]]} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 18, padding: "16px 18px", margin: "20px 0" }}>
        <span style={{ fontSize: 26 }}>{other[2]}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 11.5, fontWeight: 800, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{P.alsoTry}</span>
          <span style={{ fontFamily: FRAUNCES, fontSize: 18, fontWeight: 700, color: COLORS.teal }}>{other[1]}</span>
        </span>
        <ChevronRight size={20} color={COLORS.ochre} />
      </a>
      <Showcase lang={lang} statics={statics} />
      <Closing lang={lang} />
    </div>
  );
}

const CAT_ICON = { grossesse: Baby, accouchement: Heart, sommeil: Moon, alimentation: Apple };

function ArticleChip({ a, lang }) {
  const Icon = CAT_ICON[a.cat] || ClipboardList;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.92)", borderRadius: 999, padding: "5px 11px 5px 6px" }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: a.color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={12} color="#fff" strokeWidth={2.5} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.teal }}>{PT[lang].minRead(a.min)}</span>
    </span>
  );
}

function FeaturedArticleCard({ a, lang }) {
  return (
    <a href={a.url} style={{ textDecoration: "none", color: "inherit", display: "block", background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 3px 12px rgba(91,58,36,0.07)" }}>
      <div style={{ position: "relative", height: 150, background: `${a.color}22` }}>
        {a.img && <img src={a.img} alt={a.alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
        <div style={{ position: "absolute", bottom: 10, left: 12 }}><ArticleChip a={a} lang={lang} /></div>
      </div>
      <div style={{ padding: "16px 18px 18px" }}>
        <h3 style={{ fontFamily: FRAUNCES, fontSize: 18, fontWeight: 700, color: COLORS.teal, margin: "0 0 5px", lineHeight: 1.3 }}>{a.title}</h3>
        <p style={{ fontSize: 13.5, color: COLORS.muted, margin: 0, lineHeight: 1.55 }}>{a.excerpt}</p>
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: a.color, display: "flex", alignItems: "center", gap: 4 }}>{PT[lang].readMore} <ChevronRight size={14} /></div>
      </div>
    </a>
  );
}

function ArticleRowLink({ a, lang }) {
  const Icon = CAT_ICON[a.cat] || ClipboardList;
  return (
    <a href={a.url} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 18, boxShadow: "0 2px 8px rgba(91,58,36,0.06)" }}>
      <div style={{ width: 54, height: 54, borderRadius: 12, flexShrink: 0, overflow: "hidden", background: `${a.color}22` }}>
        {a.img && <img src={a.img} alt={a.alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: a.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={9} color="#fff" strokeWidth={3} />
          </div>
          <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>{PT[lang].minRead(a.min)}</span>
        </div>
        <div style={{ fontFamily: FRAUNCES, fontSize: 14.5, fontWeight: 700, color: COLORS.teal, lineHeight: 1.3 }}>{a.title}</div>
      </div>
      <ChevronRight size={18} color={a.color} style={{ flexShrink: 0 }} />
    </a>
  );
}

function AppPromo({ lang, cat }) {
  const P = PT[lang];
  const [h, t] = P.promo[cat] || [P.promoH, APP_T[lang].home.hero2];
  return (
    <div style={{
      background: `radial-gradient(circle at 12% 6%, ${COLORS.pink}30, transparent 42%), radial-gradient(circle at 92% 16%, ${COLORS.ochre}28, transparent 40%), ${COLORS.cream}`,
      border: `1px solid ${COLORS.pink}25`, borderRadius: 20, padding: "20px 20px", margin: "22px 0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Sparkles size={16} color={COLORS.ochre} />
        <span style={{ fontSize: 11.5, fontWeight: 800, color: COLORS.ochre, textTransform: "uppercase", letterSpacing: "0.04em" }}>Me My Baby</span>
      </div>
      <div style={{ fontFamily: FRAUNCES, fontSize: 19, fontWeight: 700, color: COLORS.teal, marginBottom: 6, lineHeight: 1.25 }}>{h}</div>
      <p style={{ fontSize: 14, color: COLORS.muted, margin: "0 0 14px", lineHeight: 1.55 }}>{t}</p>
      <DownloadButton lang={lang} />
      <p style={{ fontSize: 12, color: COLORS.muted, margin: "10px 0 0", fontWeight: 600 }}>{P.trialNote}</p>
    </div>
  );
}

// Liste des articles : recherche et filtres comme dans l'appli (le petit programme /pub/site-….js
// s'en occupe dans le navigateur; Google voit tous les liens).
function ArticlesPage({ page }) {
  const { lang, list, cats } = page;
  const P = PT[lang];
  const featured = list.slice(0, 6);
  return (
    <div>
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(135deg, ${COLORS.slate}22 0%, ${COLORS.cream} 58%, ${COLORS.slate}14 100%)`,
        border: `1px solid ${COLORS.slate}30`, borderRadius: 22, padding: "24px 24px", marginBottom: 18,
        boxShadow: `0 12px 30px ${COLORS.slate}26`, display: "flex", alignItems: "center", gap: 18,
      }}>
        <div style={{ position: "absolute", top: -34, right: -22, width: 130, height: 130, borderRadius: "50%", background: COLORS.slate, opacity: 0.1 }} />
        <div style={{ position: "relative", width: 64, height: 64, borderRadius: 20, flexShrink: 0, background: `linear-gradient(135deg, ${COLORS.slate} 0%, ${COLORS.slate}CC 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 18px ${COLORS.slate}45` }}>
          <ClipboardList size={28} color="#fff" />
        </div>
        <div style={{ position: "relative" }}>
          <h1 style={{ margin: "0 0 5px", fontFamily: FRAUNCES, fontSize: 25, color: COLORS.teal }}>{P.artTitle}</h1>
          <p style={{ margin: "0 0 6px", color: COLORS.text, fontSize: 14.5, lineHeight: 1.55 }}>{P.artIntro}</p>
          <p style={{ margin: 0, color: COLORS.text, opacity: 0.82, fontSize: 13, fontStyle: "italic" }}>{P.artSub}</p>
        </div>
      </div>
      <ToyDivider />
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={17} color={COLORS.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
        <input data-art-search="" type="search" placeholder={P.searchPh} aria-label={P.searchPh}
          style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 14, border: `1px solid ${COLORS.line}`, fontSize: 14, background: "#fff", fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[["", P.allCats, COLORS.teal], ...cats.map((c) => [c.id, c.label, c.color])].map(([id, label, color]) => {
          const on = id === "";
          return (
            <button key={id || "all"} type="button" data-art-cat={id} data-color={color} style={{
              padding: "7px 15px", borderRadius: 999, border: `1px solid ${on ? color : COLORS.line}`,
              background: on ? color : "#fff", color: on ? "#fff" : COLORS.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}>{label}</button>
          );
        })}
      </div>
      <div data-art-featured="">
        <h2 style={{ fontSize: 13, fontWeight: 800, color: COLORS.slate, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px" }}>✨ {P.latest}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 10 }}>
          {featured.map((a) => <FeaturedArticleCard key={a.id} a={a} lang={lang} />)}
        </div>
        <AppPromo lang={lang} />
        <h2 style={{ fontSize: 13, fontWeight: 800, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px" }}>{P.allArticles}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((a, i) => (
          <div key={a.id} data-art-row="" data-cat={a.cat} data-q={`${a.title} ${a.excerpt}`.toLowerCase()} data-feat={i < 6 ? "1" : undefined} style={i < 6 ? { display: "none" } : undefined}>
            <ArticleRowLink a={a} lang={lang} />
          </div>
        ))}
      </div>
      <p data-art-none="" style={{ display: "none", textAlign: "center", color: COLORS.muted, fontSize: 14, padding: "30px 0" }}>{P.noResults}</p>
      <Closing lang={lang} />
    </div>
  );
}

function ArticlePage({ page, statics }) {
  const { lang, art, related } = page;
  const P = PT[lang];
  return (
    <div>
      <Crumbs items={[[P.home, page.paths.home], [P.artTitle, page.paths.articles], [art.title, null]]} />
      <article data-art-id={art.id} style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 18, overflow: "hidden", boxShadow: `0 14px 34px ${art.color}30` }}>
        <div style={{ position: "relative", height: 230, background: `${art.color}22` }}>
          {art.img && <img src={art.img} alt={art.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
          <div style={{ position: "absolute", bottom: 12, left: 14 }}><ArticleChip a={art} lang={lang} /></div>
        </div>
        <div style={{ padding: "20px 20px 22px", maxWidth: 680 }}>
          <span style={{ display: "inline-block", fontSize: 11.5, fontWeight: 800, color: art.color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{art.catLabel}</span>
          <h1 style={{ fontFamily: FRAUNCES, fontSize: 27, fontWeight: 700, color: COLORS.teal, margin: "0 0 10px", lineHeight: 1.25 }}>{art.title}</h1>
          <p style={{ fontSize: 15, color: COLORS.muted, margin: "0 0 16px", fontStyle: "italic", lineHeight: 1.6 }}>{art.excerpt}</p>
          <Static id="mmb-art-1" html={statics?.body1} />
          <AppPromo lang={lang} cat={art.cat} />
          <Static id="mmb-art-2" html={statics?.body2} />
          {art.sources?.length > 0 && (
            <div style={{ marginTop: 4, paddingTop: 14, borderTop: `1px dashed ${COLORS.line}` }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px", fontFamily: UI_FONT }}>{P.sources}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {art.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer nofollow" style={{ fontSize: 12, color: art.color, textDecoration: "none", fontWeight: 700, background: `${art.color}14`, border: `1px solid ${art.color}30`, borderRadius: 999, padding: "5px 12px" }}>{s.name}</a>
                ))}
              </div>
              <p style={{ fontSize: 10.5, color: COLORS.muted, margin: "12px 0 0" }}>{P.photo}</p>
            </div>
          )}
        </div>
      </article>
      {related?.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px" }}>{P.related}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{related.map((a) => <ArticleRowLink key={a.id} a={a} lang={lang} />)}</div>
        </div>
      )}
      <p style={{ margin: "18px 0 0" }}><a href={page.paths.articles} style={{ color: COLORS.teal, fontWeight: 700, fontSize: 14 }}>{P.backArticles}</a></p>
      <Closing lang={lang} />
    </div>
  );
}

function LegalPage({ statics }) {
  return (
    <Card style={{ padding: "24px 22px" }}>
      <Static id="mmb-legal" html={statics?.legal} />
    </Card>
  );
}

// ---------------------------------------------------------------- Page complète
export function PublicPage({ page, statics }) {
  const body = page.kind === "home" ? <HomePage page={page} statics={statics} />
    : page.kind === "preg" || page.kind === "ov" ? <CalcPage page={page} statics={statics} />
    : page.kind === "articles" ? <ArticlesPage page={page} />
    : page.kind === "article" ? <ArticlePage page={page} statics={statics} />
    : <LegalPage statics={statics} />;
  return (
    <div style={{ fontFamily: UI_FONT, background: COLORS.cream, minHeight: "100vh", color: COLORS.text, paddingBottom: 76 }}>
      <Header page={page} />
      <main className="page-shell">{body}</main>
      <Footer page={page} />
      <DownloadBar lang={page.lang} />
    </div>
  );
}
