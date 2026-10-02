// Construit les PAGES PUBLIQUES lisibles par Google, après la construction de l'appli (npm run build).
//
// L'appli elle-même vit à « / ». Ici, on fabrique en plus de vraies pages HTML, une par sujet et par
// langue, que Google peut lire et classer :
//   /fr  /en  /es                                   → pages d'accueil publiques
//   /fr/calculateur-grossesse  (+ en, es)           → calculateur de grossesse (fonctionne sans compte)
//   /fr/calculateur-ovulation  (+ en, es)           → calculateur d'ovulation
//   /fr/articles  /fr/articles/<sujet>  (+ en, es)  → articles publiés (même rythme que dans l'appli)
//   /fr/confidentialite, /fr/conditions (+ en, es)  → textes légaux (exigés par Google AdSense)
//   /sitemap.xml et /robots.txt                     → le plan du site pour Google
//
// Les articles et les textes légaux viennent directement de src/App.jsx : rien à recopier à la main.
// Les nouveaux articles de la semaine apparaissent à chaque nouvelle construction du site.

import { build } from "esbuild";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)); // ce fichier est à la racine du projet
const DIST = join(ROOT, "dist");
const SITE = "https://www.memybabyapp.com";
const LANGS = ["fr", "en", "es"];
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- 1. Charger les données de l'appli ----------
const tmpEntry = join(DIST, ".seo-entry.mjs");
const tmpOut = join(DIST, ".seo-data.mjs");
await writeFile(tmpEntry, `export { ARTICLES, ARTICLE_CATEGORIES, getPublishedArticles, LEGAL_TEXT } from ${JSON.stringify(join(ROOT, "src", "App.jsx"))};\n`);
await build({ entryPoints: [tmpEntry], bundle: true, platform: "node", format: "esm", jsx: "automatic", loader: { ".jsx": "jsx", ".js": "jsx" }, outfile: tmpOut, logLevel: "error" });
const { ARTICLES, ARTICLE_CATEGORIES, getPublishedArticles, LEGAL_TEXT } = await import(pathToFileURL(tmpOut).href);
await rm(tmpEntry, { force: true });
await rm(tmpOut, { force: true });

// ---------- 2. Outils ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-$/, "");
const write = async (path, html) => {
  const file = join(DIST, path.replace(/^\//, "") + ".html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
};
const LAUNCH = Date.parse("2026-09-25T00:00:00Z");
const publishedOn = (i) => new Date(LAUNCH + (i < 8 ? 0 : (Math.floor((i - 8) / 4) + 1) * 7 * 86400000)).toISOString().slice(0, 10);

// ---------- 3. Textes de l'interface publique ----------
const T = {
  fr: {
    locale: "fr_CA", tagline: "Grossesse, bébé et famille, de la conception à 5 ans",
    navPreg: "Calculateur de grossesse", navOv: "Calculateur d'ovulation", navArticles: "Articles", openApp: "Ouvrir l'appli",
    cta: "Suivez votre grossesse et votre bébé jour après jour", ctaText: "Suivis de bébé, rendez-vous, menus personnalisés de Léa, assistante Novaris et plus de 200 articles, en français, anglais et espagnol. Essai gratuit de 5 jours.",
    ctaBtn: "Essayer gratuitement", disclaimer: "Ces informations servent à vous informer. Elles ne remplacent jamais l'avis d'un professionnel de la santé. En cas d'urgence, appelez les services d'urgence.",
    privacy: "Politique de confidentialité", terms: "Conditions d'utilisation", home: "Accueil", sources: "Sources", related: "À lire aussi", allArticles: "Tous les articles", minRead: (n) => `${n} min de lecture`,
    homeTitle: "Me My Baby — Grossesse, bébé et famille, de la conception à 5 ans", homeDesc: "Calculateur de grossesse et d'ovulation gratuits, articles fiables et une appli pour suivre votre grossesse et votre bébé jusqu'à 5 ans.",
    homeH1: "Votre grossesse et votre enfant, de la conception à 5 ans", homeIntro: "Des outils gratuits et des articles fiables pour chaque étape, et une appli complète pour vous accompagner au quotidien.",
    freeTools: "Outils gratuits", latest: "Articles récents", articlesTitle: "Articles sur la grossesse, l'accouchement et bébé", articlesDesc: "Des articles fiables et faciles à lire sur la grossesse, l'accouchement, le sommeil et l'alimentation de bébé.",
    articlesH1: "Articles", articlesIntro: "Des réponses claires et appuyées sur des sources reconnues, pour chaque étape. De nouveaux articles chaque semaine.",
  },
  en: {
    locale: "en_CA", tagline: "Pregnancy, baby and family, from conception to age 5",
    navPreg: "Pregnancy calculator", navOv: "Ovulation calculator", navArticles: "Articles", openApp: "Open the app",
    cta: "Follow your pregnancy and your baby day by day", ctaText: "Baby tracking, appointments, personalized menus from Léa, the Novaris assistant and 200+ articles, in English, French and Spanish. 5-day free trial.",
    ctaBtn: "Try it free", disclaimer: "This information is for general knowledge only. It never replaces the advice of a health professional. In an emergency, call your local emergency services.",
    privacy: "Privacy policy", terms: "Terms of use", home: "Home", sources: "Sources", related: "Read next", allArticles: "All articles", minRead: (n) => `${n} min read`,
    homeTitle: "Me My Baby — Pregnancy, baby and family, from conception to age 5", homeDesc: "Free pregnancy and ovulation calculators, trustworthy articles and an app to follow your pregnancy and your baby up to age 5.",
    homeH1: "Your pregnancy and your child, from conception to age 5", homeIntro: "Free tools and trustworthy articles for every stage, plus a complete app to support you every day.",
    freeTools: "Free tools", latest: "Latest articles", articlesTitle: "Articles on pregnancy, birth and baby", articlesDesc: "Trustworthy, easy-to-read articles on pregnancy, labor and birth, baby sleep and feeding.",
    articlesH1: "Articles", articlesIntro: "Clear answers backed by recognized sources, for every stage. New articles every week.",
  },
  es: {
    locale: "es_MX", tagline: "Embarazo, bebé y familia, desde la concepción hasta los 5 años",
    navPreg: "Calculadora de embarazo", navOv: "Calculadora de ovulación", navArticles: "Artículos", openApp: "Abrir la app",
    cta: "Sigue tu embarazo y a tu bebé día a día", ctaText: "Seguimiento del bebé, citas, menús personalizados de Léa, la asistente Novaris y más de 200 artículos, en español, francés e inglés. Prueba gratuita de 5 días.",
    ctaBtn: "Probar gratis", disclaimer: "Esta información es solo informativa. Nunca sustituye el consejo de un profesional de la salud. En caso de emergencia, llama a los servicios de emergencia.",
    privacy: "Política de privacidad", terms: "Condiciones de uso", home: "Inicio", sources: "Fuentes", related: "Sigue leyendo", allArticles: "Todos los artículos", minRead: (n) => `${n} min de lectura`,
    homeTitle: "Me My Baby — Embarazo, bebé y familia, desde la concepción hasta los 5 años", homeDesc: "Calculadoras de embarazo y ovulación gratuitas, artículos confiables y una app para seguir tu embarazo y a tu bebé hasta los 5 años.",
    homeH1: "Tu embarazo y tu hijo, desde la concepción hasta los 5 años", homeIntro: "Herramientas gratuitas y artículos confiables para cada etapa, y una app completa para acompañarte cada día.",
    freeTools: "Herramientas gratuitas", latest: "Artículos recientes", articlesTitle: "Artículos sobre embarazo, parto y bebé", articlesDesc: "Artículos confiables y fáciles de leer sobre el embarazo, el parto, el sueño y la alimentación del bebé.",
    articlesH1: "Artículos", articlesIntro: "Respuestas claras basadas en fuentes reconocidas, para cada etapa. Nuevos artículos cada semana.",
  },
};

// Adresses de chaque page dans chaque langue (pour les liens entre les langues).
const PATHS = {
  home: { fr: "/fr", en: "/en", es: "/es" },
  preg: { fr: "/fr/calculateur-grossesse", en: "/en/pregnancy-calculator", es: "/es/calculadora-embarazo" },
  ov: { fr: "/fr/calculateur-ovulation", en: "/en/ovulation-calculator", es: "/es/calculadora-ovulacion" },
  articles: { fr: "/fr/articles", en: "/en/articles", es: "/es/articulos" },
  privacy: { fr: "/fr/confidentialite", en: "/en/privacy", es: "/es/privacidad" },
  terms: { fr: "/fr/conditions", en: "/en/terms", es: "/es/condiciones" },
};

// ---------- 4. Contenu des calculateurs ----------
const CALC = {
  preg: {
    fr: {
      title: "Calculateur de grossesse gratuit — date d'accouchement et semaine de grossesse", desc: "Calculez gratuitement votre date prévue d'accouchement, votre semaine de grossesse et votre trimestre à partir du premier jour de vos dernières règles.",
      h1: "Calculateur de grossesse", intro: "Entrez le premier jour de vos dernières règles pour connaître votre date prévue d'accouchement, votre semaine de grossesse et votre trimestre.",
      label: "Premier jour de vos dernières règles", button: "Calculer", due: "Date prévue d'accouchement", week: "Semaine de grossesse", tri: "Trimestre", left: "Jours restants",
      weekVal: "{w} semaines et {d} jour(s)", errFuture: "Choisissez une date dans le passé.", errOld: "Cette date semble trop ancienne pour une grossesse en cours.",
      sections: [
        ["Comment la date d'accouchement est-elle calculée ?", "On ajoute 280 jours (40 semaines) au premier jour des dernières règles. C'est la méthode utilisée par la plupart des professionnels de la santé, appelée règle de Naegele. Elle suppose un cycle d'environ 28 jours avec une ovulation vers le 14e jour."],
        ["Pourquoi parle-t-on de 40 semaines ?", "Une grossesse dure en moyenne 40 semaines à partir des dernières règles, soit environ 38 semaines après la conception. Une naissance entre 37 et 42 semaines est considérée comme à terme."],
        ["La date peut-elle changer ?", "Oui. L'échographie de datation du premier trimestre est généralement plus précise que le calcul selon les règles, surtout si vos cycles sont irréguliers. Votre professionnel de la santé pourra ajuster la date."],
        ["Les trimestres de la grossesse", "Le 1er trimestre va jusqu'à environ 13 semaines, le 2e de 14 à 27 semaines et le 3e de 28 semaines jusqu'à la naissance."],
      ],
    },
    en: {
      title: "Free pregnancy calculator — due date and how many weeks pregnant", desc: "Calculate your due date, how many weeks pregnant you are and your trimester for free, from the first day of your last period.",
      h1: "Pregnancy calculator", intro: "Enter the first day of your last period to find your estimated due date, how many weeks pregnant you are and your trimester.",
      label: "First day of your last period", button: "Calculate", due: "Estimated due date", week: "Weeks pregnant", tri: "Trimester", left: "Days left",
      weekVal: "{w} weeks and {d} day(s)", errFuture: "Choose a date in the past.", errOld: "This date seems too long ago for a current pregnancy.",
      sections: [
        ["How is the due date calculated?", "We add 280 days (40 weeks) to the first day of your last period. This is the method most health professionals use, known as Naegele's rule. It assumes a cycle of about 28 days with ovulation around day 14."],
        ["Why 40 weeks?", "A pregnancy lasts on average 40 weeks from the last period, or about 38 weeks after conception. A birth between 37 and 42 weeks is considered full term."],
        ["Can the due date change?", "Yes. A first-trimester dating ultrasound is generally more accurate than a calculation based on your period, especially if your cycles are irregular. Your health professional may adjust the date."],
        ["The trimesters of pregnancy", "The 1st trimester runs to about 13 weeks, the 2nd from 14 to 27 weeks and the 3rd from 28 weeks until birth."],
      ],
    },
    es: {
      title: "Calculadora de embarazo gratis — fecha de parto y semanas de embarazo", desc: "Calcula gratis tu fecha probable de parto, tus semanas de embarazo y tu trimestre a partir del primer día de tu última menstruación.",
      h1: "Calculadora de embarazo", intro: "Ingresa el primer día de tu última menstruación para conocer tu fecha probable de parto, tus semanas de embarazo y tu trimestre.",
      label: "Primer día de tu última menstruación", button: "Calcular", due: "Fecha probable de parto", week: "Semanas de embarazo", tri: "Trimestre", left: "Días restantes",
      weekVal: "{w} semanas y {d} día(s)", errFuture: "Elige una fecha en el pasado.", errOld: "Esta fecha parece demasiado antigua para un embarazo en curso.",
      sections: [
        ["¿Cómo se calcula la fecha de parto?", "Se suman 280 días (40 semanas) al primer día de la última menstruación. Es el método que usan la mayoría de los profesionales de la salud, llamado regla de Naegele. Supone un ciclo de unos 28 días con ovulación alrededor del día 14."],
        ["¿Por qué se habla de 40 semanas?", "Un embarazo dura en promedio 40 semanas desde la última menstruación, es decir, unas 38 semanas después de la concepción. Un nacimiento entre las semanas 37 y 42 se considera a término."],
        ["¿Puede cambiar la fecha?", "Sí. La ecografía de datación del primer trimestre suele ser más precisa que el cálculo según la menstruación, sobre todo si tus ciclos son irregulares. Tu profesional de la salud puede ajustar la fecha."],
        ["Los trimestres del embarazo", "El 1.er trimestre va hasta la semana 13 aproximadamente, el 2.º de la 14 a la 27 y el 3.º desde la semana 28 hasta el nacimiento."],
      ],
    },
  },
  ov: {
    fr: {
      title: "Calculateur d'ovulation gratuit — fenêtre de fertilité et jours fertiles", desc: "Calculez gratuitement votre jour d'ovulation, votre fenêtre de fertilité et la date de vos prochaines règles selon la durée de votre cycle.",
      h1: "Calculateur d'ovulation", intro: "Entrez le premier jour de vos dernières règles et la durée habituelle de votre cycle pour estimer vos jours les plus fertiles.",
      label: "Premier jour de vos dernières règles", cycle: "Durée habituelle du cycle (jours)", button: "Calculer", ov: "Jour d'ovulation estimé", fw: "Fenêtre de fertilité", np: "Prochaines règles prévues", to: "au",
      errFuture: "Choisissez une date dans le passé.",
      sections: [
        ["Comment l'ovulation est-elle estimée ?", "L'ovulation survient généralement environ 14 jours avant les règles suivantes. Pour un cycle de 28 jours, c'est autour du 14e jour; pour un cycle de 32 jours, autour du 18e jour."],
        ["Qu'est-ce que la fenêtre de fertilité ?", "Ce sont les jours où une relation peut mener à une grossesse : les 5 jours avant l'ovulation et le jour de l'ovulation, parce que les spermatozoïdes peuvent survivre quelques jours."],
        ["Et si mes cycles sont irréguliers ?", "Le calcul est alors moins précis. Les tests d'ovulation, la courbe de température et l'observation de la glaire cervicale peuvent aider. Parlez-en à votre professionnel de la santé si vous essayez de concevoir depuis plus de 12 mois (ou 6 mois à partir de 35 ans)."],
      ],
    },
    en: {
      title: "Free ovulation calculator — fertile window and most fertile days", desc: "Calculate your ovulation day, fertile window and next period for free, based on the length of your cycle.",
      h1: "Ovulation calculator", intro: "Enter the first day of your last period and your usual cycle length to estimate your most fertile days.",
      label: "First day of your last period", cycle: "Usual cycle length (days)", button: "Calculate", ov: "Estimated ovulation day", fw: "Fertile window", np: "Next period expected", to: "to",
      errFuture: "Choose a date in the past.",
      sections: [
        ["How is ovulation estimated?", "Ovulation usually happens about 14 days before your next period. For a 28-day cycle, that's around day 14; for a 32-day cycle, around day 18."],
        ["What is the fertile window?", "These are the days when sex can lead to pregnancy: the 5 days before ovulation and the day of ovulation, because sperm can survive for a few days."],
        ["What if my cycles are irregular?", "The calculation is then less precise. Ovulation tests, temperature charting and observing cervical mucus can help. Talk to your health professional if you've been trying to conceive for more than 12 months (or 6 months from age 35)."],
      ],
    },
    es: {
      title: "Calculadora de ovulación gratis — ventana fértil y días fértiles", desc: "Calcula gratis tu día de ovulación, tu ventana fértil y tu próxima menstruación según la duración de tu ciclo.",
      h1: "Calculadora de ovulación", intro: "Ingresa el primer día de tu última menstruación y la duración habitual de tu ciclo para estimar tus días más fértiles.",
      label: "Primer día de tu última menstruación", cycle: "Duración habitual del ciclo (días)", button: "Calcular", ov: "Día de ovulación estimado", fw: "Ventana fértil", np: "Próxima menstruación", to: "al",
      errFuture: "Elige una fecha en el pasado.",
      sections: [
        ["¿Cómo se estima la ovulación?", "La ovulación suele ocurrir unos 14 días antes de la siguiente menstruación. En un ciclo de 28 días, es alrededor del día 14; en uno de 32 días, alrededor del día 18."],
        ["¿Qué es la ventana fértil?", "Son los días en que una relación puede llevar a un embarazo: los 5 días antes de la ovulación y el día de la ovulación, porque los espermatozoides pueden sobrevivir algunos días."],
        ["¿Y si mis ciclos son irregulares?", "El cálculo es entonces menos preciso. Las pruebas de ovulación, la temperatura basal y la observación del moco cervical pueden ayudar. Consulta a tu profesional de la salud si llevas más de 12 meses intentando concebir (o 6 meses a partir de los 35 años)."],
      ],
    },
  },
};

// ---------- 5. Gabarit commun ----------
const CSS = `
@font-face{font-family:"Inter";src:url("/inter-v1.woff") format("woff");font-weight:400 800;font-display:swap}
@font-face{font-family:"Fraunces";src:url("/fraunces-v1.woff") format("woff");font-weight:400 700;font-display:swap}
*{box-sizing:border-box}body{margin:0;background:#FBF1E3;color:#3A3833;font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:#2F6F7E}.wrap{max-width:860px;margin:0 auto;padding:0 18px}
header{background:#fff;border-bottom:1px solid #EADFCB}header .wrap{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:#5B3A24;font-family:Fraunces,Georgia,serif;font-weight:700;font-size:19px}.logo img{width:38px;height:38px;border-radius:10px}
nav{display:flex;gap:6px;flex-wrap:wrap;flex:1}nav a{font-size:14px;text-decoration:none;color:#5B3A24;padding:6px 10px;border-radius:999px}nav a:hover{background:#FBF1E3}
.langs a{font-size:13px;font-weight:700;text-decoration:none;color:#7A7364;margin-left:6px}.langs a.on{color:#5B3A24;text-decoration:underline}
.btn{display:inline-block;background:#D4A54A;color:#fff!important;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:999px;border:0;font-size:15px;cursor:pointer;font-family:inherit}
h1,h2,h3{font-family:Fraunces,Georgia,serif;color:#5B3A24;line-height:1.25}h1{font-size:32px;margin:26px 0 10px}h2{font-size:22px;margin:28px 0 8px}h3{font-size:18px;margin:0 0 6px}
.lead{font-size:17px;color:#5A5548}.card{background:#fff;border:1px solid #EADFCB;border-radius:16px;padding:18px 20px;margin:14px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}.grid a.card{display:block;text-decoration:none;color:inherit;margin:0}.grid a.card:hover{border-color:#D4A54A}
.muted{color:#7A7364;font-size:14px}.cta{background:#F3E6CF;border-radius:18px;padding:22px;margin:30px 0;text-align:center}.cta h2{margin-top:0}
.calc label{display:block;font-weight:700;color:#5B3A24;margin:10px 0 4px}.calc input{font:inherit;padding:10px 12px;border:1px solid #D9CCB4;border-radius:10px;width:100%;max-width:280px;background:#fff}
.res{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:16px}.res div{background:#FBF6ED;border-radius:12px;padding:12px}.res b{display:block;font-family:Fraunces,Georgia,serif;font-size:19px;color:#5B3A24}
.err{color:#B3261E;font-weight:600}.hero-img{width:100%;max-height:380px;object-fit:cover;border-radius:16px;margin:8px 0 14px}
.crumbs{font-size:13px;color:#7A7364;margin-top:16px}.crumbs a{color:#7A7364}.legal p{white-space:pre-line}
footer{border-top:1px solid #EADFCB;margin-top:40px;padding:24px 0;font-size:13px;color:#7A7364}footer a{color:#7A7364;margin-right:14px}
@media(max-width:600px){h1{font-size:26px}nav{order:3;flex-basis:100%}}
`;

function page({ lang, key, path, title, desc, body, alternates, jsonld = [], extraHead = "" }) {
  const t = T[lang];
  const alts = alternates || {};
  const altLinks = Object.entries(alts).map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${p}">`).join("") + (alts.fr ? `<link rel="alternate" hreflang="x-default" href="${SITE}${alts.fr}">` : "");
  const langLinks = LANGS.map((l) => (alts[l] ? `<a href="${alts[l]}" hreflang="${l}" class="${l === lang ? "on" : ""}">${l.toUpperCase()}</a>` : "")).join("");
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${path}">${altLinks}
<meta property="og:type" content="${key === "article" ? "article" : "website"}"><meta property="og:site_name" content="Me My Baby"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${path}"><meta property="og:locale" content="${t.locale}"><meta property="og:image" content="${SITE}/logo.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/logo.png"><meta name="theme-color" content="#FBF1E3"><link rel="preload" href="/fraunces-v1.woff" as="font" type="font/woff" crossorigin>
<style>${CSS}</style>${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("")}${extraHead}
</head><body>
<header><div class="wrap"><a class="logo" href="${PATHS.home[lang]}"><img src="/logo.png" alt="Me My Baby" width="38" height="38">Me My Baby</a>
<nav><a href="${PATHS.preg[lang]}">${esc(t.navPreg)}</a><a href="${PATHS.ov[lang]}">${esc(t.navOv)}</a><a href="${PATHS.articles[lang]}">${esc(t.navArticles)}</a></nav>
<span class="langs">${langLinks}</span> <a class="btn" style="padding:8px 16px;font-size:14px" href="/?lang=${lang}">${esc(t.openApp)}</a></div></header>
<main class="wrap">${body}
<div class="cta"><h2>${esc(t.cta)}</h2><p>${esc(t.ctaText)}</p><a class="btn" href="/?lang=${lang}">${esc(t.ctaBtn)}</a></div>
<p class="muted">⚠️ ${esc(t.disclaimer)}</p></main>
<footer><div class="wrap"><a href="${PATHS.home[lang]}">Me My Baby</a><a href="${PATHS.privacy[lang]}">${esc(t.privacy)}</a><a href="${PATHS.terms[lang]}">${esc(t.terms)}</a><a href="/?lang=${lang}">${esc(t.openApp)}</a><br>© ${new Date().getFullYear()} Me My Baby — Québec (Canada)</div></footer>
</body></html>`;
}
const crumbs = (lang, items) => `<div class="crumbs">${items.map(([label, href]) => (href ? `<a href="${href}">${esc(label)}</a>` : esc(label))).join(" › ")}</div>`;
const crumbsLd = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, ...(href ? { item: SITE + href } : {}) })) });

// ---------- 6. Articles publiés ----------
// Sur Google, on publie au moins les 100 premiers articles (ou plus, si l'appli en a déjà débloqué
// davantage). Dans l'appli, le rythme reste de 4 nouveautés par semaine.
const PUBLIC_MIN_ARTICLES = 100;
const published = ARTICLES.slice(0, Math.max(getPublishedArticles(ARTICLES).length, Math.min(PUBLIC_MIN_ARTICLES, ARTICLES.length)));
const usedSlugs = { fr: new Set(), en: new Set(), es: new Set() };
const articleInfo = published.map((a, i) => {
  const slugs = {};
  for (const l of LANGS) {
    let s = l === "fr" ? slugify(a.id) : slugify(a.title[l]) || slugify(a.id);
    if (usedSlugs[l].has(s)) s = `${s}-${slugify(a.id)}`;
    usedSlugs[l].add(s);
    slugs[l] = `${PATHS.articles[l]}/${s}`;
  }
  const d = publishedOn(ARTICLES.indexOf(a));
  return { a, slugs, date: d > TODAY ? TODAY : d }; // jamais de date dans le futur
});
const catLabel = (id, lang) => ARTICLE_CATEGORIES.find((c) => c.id === id)?.label?.[lang] || id;
const minutes = (a, l) => Math.max(2, Math.round(a.body[l].join(" ").split(/\s+/).length / 200));
const articleCard = (x, lang) => `<a class="card" href="${x.slugs[lang]}"><span class="muted">${esc(catLabel(x.a.category, lang))} · ${esc(T[lang].minRead(minutes(x.a, lang)))}</span><h3>${esc(x.a.title[lang])}</h3><span class="muted">${esc(x.a.excerpt[lang])}</span></a>`;

const urls = []; // pour le sitemap : { alternates, lastmod }
const addUrl = (alternates, lastmod = TODAY) => urls.push({ alternates, lastmod });

for (const lang of LANGS) {
  const t = T[lang];

  // Accueil public
  const recent = [...articleInfo].reverse().slice(0, 6);
  await write(PATHS.home[lang], page({
    lang, key: "home", path: PATHS.home[lang], title: t.homeTitle, desc: t.homeDesc, alternates: PATHS.home,
    jsonld: [{ "@context": "https://schema.org", "@type": "WebSite", name: "Me My Baby", url: SITE + PATHS.home[lang], inLanguage: lang }, { "@context": "https://schema.org", "@type": "Organization", name: "Me My Baby", url: SITE, logo: `${SITE}/logo.png` }],
    body: `<h1>${esc(t.homeH1)}</h1><p class="lead">${esc(t.homeIntro)}</p>
<h2>${esc(t.freeTools)}</h2><div class="grid"><a class="card" href="${PATHS.preg[lang]}"><h3>🤰 ${esc(t.navPreg)}</h3><span class="muted">${esc(CALC.preg[lang].desc)}</span></a><a class="card" href="${PATHS.ov[lang]}"><h3>🌸 ${esc(t.navOv)}</h3><span class="muted">${esc(CALC.ov[lang].desc)}</span></a></div>
<h2>${esc(t.latest)}</h2><div class="grid">${recent.map((x) => articleCard(x, lang)).join("")}</div><p><a href="${PATHS.articles[lang]}">${esc(t.allArticles)} →</a></p>`,
  }));
  if (lang === "fr") addUrl(PATHS.home); // une seule fois : chaque entrée liste déjà les 3 langues

  // Calculateurs
  for (const k of ["preg", "ov"]) {
    const c = CALC[k][lang];
    const p = PATHS[k][lang];
    const fmtLocale = lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA";
    const form = k === "preg"
      ? `<form class="calc card" id="calc" onsubmit="return false"><label for="lmp">${esc(c.label)}</label><input type="date" id="lmp" required><div style="margin-top:12px"><button class="btn" id="go">${esc(c.button)}</button></div><p class="err" id="err"></p><div class="res" id="res" hidden><div>${esc(c.due)}<b id="r1"></b></div><div>${esc(c.week)}<b id="r2"></b></div><div>${esc(c.tri)}<b id="r3"></b></div><div>${esc(c.left)}<b id="r4"></b></div></div></form>
<script>(function(){var L=${JSON.stringify(fmtLocale)},W=${JSON.stringify(c.weekVal)},EF=${JSON.stringify(c.errFuture)},EO=${JSON.stringify(c.errOld)};
function f(d){return d.toLocaleDateString(L,{day:"numeric",month:"long",year:"numeric"})}
document.getElementById("go").onclick=function(){var v=document.getElementById("lmp").value,e=document.getElementById("err"),r=document.getElementById("res");e.textContent="";r.hidden=true;if(!v)return;
var s=new Date(v+"T00:00:00"),t=new Date();t.setHours(0,0,0,0);var diff=Math.floor((t-s)/864e5);if(diff<0){e.textContent=EF;return}if(diff>300){e.textContent=EO;return}
var due=new Date(s);due.setDate(s.getDate()+280);var w=Math.floor(diff/7),d=diff%7;
document.getElementById("r1").textContent=f(due);document.getElementById("r2").textContent=W.replace("{w}",w).replace("{d}",d);document.getElementById("r3").textContent=w>=27?"3":w>=13?"2":"1";document.getElementById("r4").textContent=Math.max(0,Math.floor((due-t)/864e5));r.hidden=false;}})();</script>`
      : `<form class="calc card" id="calc" onsubmit="return false"><label for="lmp">${esc(c.label)}</label><input type="date" id="lmp" required><label for="cyc">${esc(c.cycle)}</label><input type="number" id="cyc" min="21" max="40" value="28" style="max-width:120px"><div style="margin-top:12px"><button class="btn" id="go">${esc(c.button)}</button></div><p class="err" id="err"></p><div class="res" id="res" hidden><div>${esc(c.ov)}<b id="r1"></b></div><div>${esc(c.fw)}<b id="r2"></b></div><div>${esc(c.np)}<b id="r3"></b></div></div></form>
<script>(function(){var L=${JSON.stringify(fmtLocale)},TO=${JSON.stringify(c.to)},EF=${JSON.stringify(c.errFuture)};
function f(d){return d.toLocaleDateString(L,{day:"numeric",month:"long",year:"numeric"})}function add(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}
document.getElementById("go").onclick=function(){var v=document.getElementById("lmp").value,c=Math.min(40,Math.max(21,parseInt(document.getElementById("cyc").value,10)||28)),e=document.getElementById("err"),r=document.getElementById("res");e.textContent="";r.hidden=true;if(!v)return;
var s=new Date(v+"T00:00:00"),t=new Date();t.setHours(0,0,0,0);if(s>t){e.textContent=EF;return}
var ov=add(s,c-14);document.getElementById("r1").textContent=f(ov);document.getElementById("r2").textContent=f(add(ov,-5))+" "+TO+" "+f(add(ov,1));document.getElementById("r3").textContent=f(add(s,c));r.hidden=false;}})();</script>`;
    const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.sections.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
    const crumbItems = [[t.home, PATHS.home[lang]], [c.h1, null]];
    await write(p, page({
      lang, key: "calc", path: p, title: c.title, desc: c.desc, alternates: PATHS[k],
      jsonld: [{ "@context": "https://schema.org", "@type": "WebApplication", name: c.h1, url: SITE + p, applicationCategory: "HealthApplication", operatingSystem: "Web", inLanguage: lang, offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" } }, faqLd, crumbsLd(crumbItems)],
      body: `${crumbs(lang, crumbItems)}<h1>${esc(c.h1)}</h1><p class="lead">${esc(c.intro)}</p>${form}${c.sections.map(([h, txt]) => `<h2>${esc(h)}</h2><p>${esc(txt)}</p>`).join("")}`,
    }));
    if (lang === "fr") addUrl(PATHS[k]);
  }

  // Liste des articles
  const byCat = ARTICLE_CATEGORIES.map((cat) => ({ cat, items: articleInfo.filter((x) => x.a.category === cat.id) })).filter((g) => g.items.length);
  await write(PATHS.articles[lang], page({
    lang, key: "articles", path: PATHS.articles[lang], title: `${t.articlesTitle} — Me My Baby`, desc: t.articlesDesc, alternates: PATHS.articles,
    jsonld: [crumbsLd([[t.home, PATHS.home[lang]], [t.articlesH1, null]])],
    body: `${crumbs(lang, [[t.home, PATHS.home[lang]], [t.articlesH1, null]])}<h1>${esc(t.articlesH1)}</h1><p class="lead">${esc(t.articlesIntro)}</p>${byCat.map((g) => `<h2>${esc(g.cat.label[lang])}</h2><div class="grid">${g.items.map((x) => articleCard(x, lang)).join("")}</div>`).join("")}`,
  }));
  if (lang === "fr") addUrl(PATHS.articles);

  // Chaque article
  for (const x of articleInfo) {
    const a = x.a;
    const p = x.slugs[lang];
    const related = articleInfo.filter((y) => y !== x && y.a.category === a.category).slice(0, 3);
    const crumbItems = [[t.home, PATHS.home[lang]], [t.articlesH1, PATHS.articles[lang]], [a.title[lang], null]];
    const img = a.image?.url ? `<img class="hero-img" src="${esc(a.image.url)}" alt="${esc(a.image.alt?.[lang] || a.title[lang])}" loading="eager">` : "";
    await write(p, page({
      lang, key: "article", path: p, title: `${a.title[lang]} — Me My Baby`, desc: a.excerpt[lang], alternates: x.slugs,
      jsonld: [{ "@context": "https://schema.org", "@type": "Article", headline: a.title[lang], description: a.excerpt[lang], inLanguage: lang, datePublished: x.date, dateModified: x.date, ...(a.image?.url ? { image: [a.image.url] } : {}), author: { "@type": "Organization", name: "Me My Baby" }, publisher: { "@type": "Organization", name: "Me My Baby", logo: { "@type": "ImageObject", url: `${SITE}/logo.png` } }, mainEntityOfPage: SITE + p }, crumbsLd(crumbItems)],
      body: `${crumbs(lang, crumbItems)}<article><p class="muted">${esc(catLabel(a.category, lang))} · ${esc(t.minRead(minutes(a, lang)))}</p><h1>${esc(a.title[lang])}</h1><p class="lead">${esc(a.excerpt[lang])}</p>${img}${a.body[lang].map((para) => `<p>${esc(para)}</p>`).join("")}
${(a.sources || []).length ? `<h2>${esc(t.sources)}</h2><ul>${a.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.name)}</a>` : esc(s.name)}</li>`).join("")}</ul>` : ""}</article>
${related.length ? `<h2>${esc(t.related)}</h2><div class="grid">${related.map((y) => articleCard(y, lang)).join("")}</div>` : ""}`,
    }));
  }

  // Textes légaux
  for (const [k, doc] of [["privacy", "privacy"], ["terms", "terms"]]) {
    const text = LEGAL_TEXT[doc][lang];
    const [first, ...rest] = text.split(/\n\n/);
    const html = rest.map((block) => (/^\d+\.\s|^⚠️/.test(block) ? (() => { const [h, ...b] = block.split("\n"); return `<h2>${esc(h)}</h2>${b.length ? `<p>${esc(b.join("\n"))}</p>` : ""}`; })() : `<p>${esc(block)}</p>`)).join("");
    await write(PATHS[k][lang], page({
      lang, key: "legal", path: PATHS[k][lang], title: `${k === "privacy" ? t.privacy : t.terms} — Me My Baby`, desc: `${k === "privacy" ? t.privacy : t.terms} — Me My Baby`, alternates: PATHS[k],
      body: `<div class="legal"><h1>${esc(first)}</h1>${html}</div>`,
    }));
  }
}
for (const x of articleInfo) addUrl(x.slugs, x.date);
addUrl(PATHS.privacy); addUrl(PATHS.terms);

// ---------- 7. Plan du site et robots.txt ----------
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<url><loc>${SITE}/</loc><lastmod>${TODAY}</lastmod></url>
${urls.flatMap(({ alternates, lastmod }) => LANGS.map((l) => `<url><loc>${SITE}${alternates[l]}</loc><lastmod>${lastmod}</lastmod>${LANGS.map((m) => `<xhtml:link rel="alternate" hreflang="${m}" href="${SITE}${alternates[m]}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${alternates.fr}"/></url>`)).join("\n")}
</urlset>`;
await writeFile(join(DIST, "sitemap.xml"), sitemap);
await writeFile(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Pages publiques : ${urls.length * 3} pages (${articleInfo.length} articles × 3 langues) + sitemap.xml + robots.txt`);
