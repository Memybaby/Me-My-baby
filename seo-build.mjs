// Construit les PAGES PUBLIQUES lisibles par Google, après la construction de l'appli (npm run build).
//
// L'appli elle-même vit à « / ». Ici, on fabrique en plus de vraies pages HTML, une par sujet et par
// langue, que Google peut lire et classer :
//   /fr  /en  /es                                   → accueil public (le même accueil que dans l'appli)
//   /fr/calculateur-grossesse  (+ en, es)           → calculateur de grossesse (gratuit, sans compte)
//   /fr/calculateur-ovulation  (+ en, es)           → calculateur d'ovulation (gratuit, sans compte)
//   /fr/articles  /fr/articles/<sujet>  (+ en, es)  → articles publics
//   /fr/confidentialite, /fr/conditions (+ en, es)  → textes légaux
//   /sitemap.xml et /robots.txt                     → le plan du site pour Google
//
// Le visuel vient de src/PublicSite.jsx, qui réutilise les vrais morceaux de l'appli (src/App.jsx) :
// mêmes couleurs, mêmes textes, mêmes calculateurs, et des aperçus des vraies pages de l'appli.
// Chaque page est écrite en HTML complet (pour Google), puis l'appli « s'allume » dans le navigateur
// pour que les calculateurs et la recherche d'articles fonctionnent.

import { build } from "esbuild";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)); // ce fichier est à la racine du projet
const DIST = join(ROOT, "dist");
const SITE = "https://www.memybabyapp.com";
const LANGS = ["fr", "en", "es"];
const TODAY = new Date().toISOString().slice(0, 10);
const APP = JSON.stringify(join(ROOT, "src", "App.jsx"));
const PUB = JSON.stringify(join(ROOT, "src", "PublicSite.jsx"));
const esbuildBase = { bundle: true, jsx: "automatic", loader: { ".jsx": "jsx", ".js": "jsx" }, logLevel: "error", define: { "process.env.NODE_ENV": '"production"' } };

// ---------- 1. Charger l'appli (côté serveur, pour écrire le HTML) ----------
const tmpEntry = join(DIST, ".seo-entry.jsx");
const tmpOut = join(DIST, ".seo-server.mjs");
await writeFile(tmpEntry, `export { ARTICLES, ARTICLE_CATEGORIES, getPublishedArticles, LEGAL_TEXT, PregnancyCalculator, OvulationCalculator, SUPABASE_URL, SUPABASE_KEY } from ${APP};
export { PublicPage, ShowcaseStatic, PhoneFrame, screenElements, GLOBAL_CSS, PT } from ${PUB};
export { renderToString } from "react-dom/server";
export { createElement } from "react";
`);
await build({ ...esbuildBase, entryPoints: [tmpEntry], platform: "node", format: "esm", mainFields: ["module", "main"], external: ["react", "react/*", "react-dom", "react-dom/*"], outfile: tmpOut });
const S = await import(pathToFileURL(tmpOut).href);
const { ARTICLES, ARTICLE_CATEGORIES, getPublishedArticles, LEGAL_TEXT, PregnancyCalculator, OvulationCalculator, SUPABASE_URL, SUPABASE_KEY, PublicPage, ShowcaseStatic, PhoneFrame, screenElements, GLOBAL_CSS, PT, renderToString, createElement: h } = S;
await rm(tmpEntry, { force: true });
await rm(tmpOut, { force: true });

// ---------- 2. Le petit programme qui fait fonctionner les pages dans le navigateur ----------
// Très léger (quelques Ko) pour que les pages s'ouvrent vite : calculateurs, recherche d'articles,
// boutons. Les résultats des calculateurs utilisent exactement le même dessin que dans l'appli.
const pubDir = join(DIST, "pub");
await rm(pubDir, { recursive: true, force: true });
await mkdir(pubDir, { recursive: true });
const CLIENT_SRC = `(function(){
var lang=document.documentElement.lang||"fr",APP="/?lang="+lang,HOME="/"+lang;
var LOC={fr:"fr-CA",en:"en-CA",es:"es-MX"}[lang]||"fr-CA";
var SB=${JSON.stringify(SUPABASE_URL)},KEY=${JSON.stringify(SUPABASE_KEY)},seen={};
function fmt(d){return d.toLocaleDateString(LOC,{day:"numeric",month:"long",year:"numeric"})}
function track(kind,item){if(seen[kind+item])return;seen[kind+item]=1;try{fetch(SB+"/rest/v1/usage_events",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({kind:kind,item:String(item).slice(0,60),sub:"site public",lang:lang,user_id:null}),keepalive:true}).catch(function(){})}catch(e){}}
function weekVal(w,d){var s=d>1;return lang==="en"?w+" weeks and "+d+" day"+(s?"s":""):lang==="es"?w+" semanas y "+d+" día"+(s?"s":""):w+" semaines et "+d+" jour"+(s?"s":"")}
function add(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}
document.querySelectorAll("[data-calc]").forEach(function(box){
  var kind=box.getAttribute("data-calc"),card=box.children[1],tpl=document.getElementById("mmb-tpl-"+kind);if(!card||!tpl)return;
  var inputs=card.querySelectorAll("input"),disc=null,out=null;
  for(var k=0;k<card.children.length;k++){if(card.children[k].tagName==="P")disc=card.children[k]}
  function calc(){
    if(out){out.remove();out=null}
    var v=inputs[0].value;if(!v)return;var s=new Date(v+"T00:00:00");if(isNaN(s.getTime()))return;var vals;
    if(kind==="preg"){var t=new Date();t.setHours(0,0,0,0);var due=add(s,280),diff=Math.floor((t-s)/864e5),w=Math.floor(diff/7),d=diff%7;
      vals=[weekVal(w,d),String(w>=27?3:w>=13?2:1),fmt(due),String(Math.max(0,Math.floor((due-t)/864e5)))]}
    else{var c=Number(inputs[1]&&inputs[1].value)||28,ov=add(s,c-14);vals=[fmt(ov),fmt(add(ov,-5))+" – "+fmt(add(ov,1)),fmt(add(s,c))]}
    out=tpl.content.firstElementChild.cloneNode(true);
    for(var i=0;i<vals.length&&i<out.children.length;i++){var cell=out.children[i].children[1];if(cell)cell.textContent=vals[i]}
    card.insertBefore(out,disc);track("calculator",kind==="preg"?"grossesse":"ovulation");
  }
  inputs.forEach(function(inp){inp.addEventListener("input",calc);inp.addEventListener("change",calc)});
});
document.querySelectorAll("#root button").forEach(function(b){
  if(b.hasAttribute("data-art-cat"))return;
  if(b.closest("[data-calc]")){b.addEventListener("click",function(){location.href=HOME});return}
  b.addEventListener("click",function(){
    if(/Partager|Share|Compartir/i.test(b.textContent)){var u=location.href.split("#")[0];if(navigator.share){navigator.share({title:"Me My Baby",url:u}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(u)}return}
    location.href=APP;
  });
});
var search=document.querySelector("[data-art-search]");
if(search){
  var cat="",rows=[].slice.call(document.querySelectorAll("[data-art-row]")),feat=document.querySelector("[data-art-featured]"),none=document.querySelector("[data-art-none]"),btns=[].slice.call(document.querySelectorAll("[data-art-cat]"));
  var apply=function(){var q=search.value.trim().toLowerCase(),f=!!(q||cat),n=0;if(feat)feat.style.display=f?"none":"";
    rows.forEach(function(r){var ok=(!cat||r.getAttribute("data-cat")===cat)&&(!q||r.getAttribute("data-q").indexOf(q)>=0)&&(f||!r.hasAttribute("data-feat"));r.style.display=ok?"":"none";if(ok)n++});
    if(none)none.style.display=n||!f?"none":"";
    btns.forEach(function(b){var on=b.getAttribute("data-art-cat")===cat,col=b.getAttribute("data-color");b.style.background=on?col:"#fff";b.style.color=on?"#fff":"#3A3833";b.style.borderColor=on?col:"#E7E1D3"})};
  search.addEventListener("input",apply);
  btns.forEach(function(b){b.addEventListener("click",function(){var c=b.getAttribute("data-art-cat");cat=(c===cat&&c)?"":c;apply()})});
}
var art=document.querySelector("[data-art-id]");if(art)track("article",art.getAttribute("data-art-id"));
})();`;
const hash = (str) => { let x = 5381; for (let i = 0; i < str.length; i++) x = ((x * 33) ^ str.charCodeAt(i)) >>> 0; return x.toString(36); };
const CLIENT_JS = `/pub/site-${hash(CLIENT_SRC)}.js`;
await writeFile(join(DIST, CLIENT_JS.slice(1)), CLIENT_SRC);

// ---------- 3. Outils ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-$/, "");
const write = async (path, html) => {
  const file = join(DIST, path.replace(/^\//, "") + ".html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
};
const LAUNCH = Date.parse("2026-09-25T00:00:00Z");
const publishedOn = (i) => new Date(LAUNCH + (i < 8 ? 0 : (Math.floor((i - 8) / 4) + 1) * 7 * 86400000)).toISOString().slice(0, 10);
// Rend un morceau de l'appli en HTML; si un aperçu ne peut pas s'afficher hors de l'appli, on le saute.
const safeRender = (el) => { try { return renderToString(el); } catch (e) { console.warn("Aperçu sauté :", e.message); return ""; } };

// ---------- 4. Titres et descriptions pour Google ----------
const T = {
  fr: {
    locale: "fr_CA", tagline: "Grossesse, bébé et famille, de la conception à 5 ans",
    navPreg: "Calculateur de grossesse", navOv: "Calculateur d'ovulation", navArticles: "Articles", openApp: "Ouvrir l'appli",
    disclaimer: "Ces informations servent à vous informer. Elles ne remplacent jamais l'avis d'un professionnel de la santé. En cas d'urgence, appelez les services d'urgence.",
    privacy: "Politique de confidentialité", terms: "Conditions d'utilisation", home: "Accueil", sources: "Sources", related: "À lire aussi", allArticles: "Tous les articles", minRead: (n) => `${n} min de lecture`,
    homeTitle: "Me My Baby — Grossesse, bébé et famille, de la conception à 5 ans", homeDesc: "Calculateur de grossesse et d'ovulation gratuits, articles fiables et une appli pour suivre votre grossesse et votre bébé jusqu'à 5 ans.",
    homeH1: "Votre grossesse et votre enfant, de la conception à 5 ans", homeIntro: "Des outils gratuits et des articles fiables pour chaque étape, et une appli complète pour vous accompagner au quotidien.",
    freeTools: "Outils gratuits", latest: "Articles récents", articlesTitle: "Articles sur la grossesse, l'accouchement et bébé", articlesDesc: "Des articles fiables et faciles à lire sur la grossesse, l'accouchement, le sommeil et l'alimentation de bébé.",
    articlesH1: "Articles", articlesIntro: "Des réponses claires et appuyées sur des sources reconnues, pour chaque étape. De nouveaux articles chaque semaine.",
  },
  en: {
    locale: "en_CA", tagline: "Pregnancy, baby and family, from conception to age 5",
    navPreg: "Pregnancy calculator", navOv: "Ovulation calculator", navArticles: "Articles", openApp: "Open the app",
    disclaimer: "This information is for general knowledge only. It never replaces the advice of a health professional. In an emergency, call your local emergency services.",
    privacy: "Privacy policy", terms: "Terms of use", home: "Home", sources: "Sources", related: "Read next", allArticles: "All articles", minRead: (n) => `${n} min read`,
    homeTitle: "Me My Baby — Pregnancy, baby and family, from conception to age 5", homeDesc: "Free pregnancy and ovulation calculators, trustworthy articles and an app to follow your pregnancy and your baby up to age 5.",
    homeH1: "Your pregnancy and your child, from conception to age 5", homeIntro: "Free tools and trustworthy articles for every stage, plus a complete app to support you every day.",
    freeTools: "Free tools", latest: "Latest articles", articlesTitle: "Articles on pregnancy, birth and baby", articlesDesc: "Trustworthy, easy-to-read articles on pregnancy, labor and birth, baby sleep and feeding.",
    articlesH1: "Articles", articlesIntro: "Clear answers backed by recognized sources, for every stage. New articles every week.",
  },
  es: {
    locale: "es_MX", tagline: "Embarazo, bebé y familia, desde la concepción hasta los 5 años",
    navPreg: "Calculadora de embarazo", navOv: "Calculadora de ovulación", navArticles: "Artículos", openApp: "Abrir la app",
    disclaimer: "Esta información es solo informativa. Nunca sustituye el consejo de un profesional de la salud. En caso de emergencia, llama a los servicios de emergencia.",
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
const pathsFor = (lang) => Object.fromEntries(Object.entries(PATHS).map(([k, v]) => [k, v[lang]]));

// Contenu des calculateurs (textes pour Google)
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

// ---------- 5. Gabarit HTML (en-tête pour Google + page rendue avec les morceaux de l'appli) ----------
const FONTS = `@font-face{font-family:"Inter";src:url("/inter-v1.woff") format("woff");font-weight:400 800;font-style:normal;font-display:swap}
@font-face{font-family:"Fraunces";src:url("/fraunces-v1.woff") format("woff");font-weight:400 700;font-style:normal;font-display:swap}`;

function doc({ page, statics, title, desc, jsonld = [], hydrate }) {
  const { lang, path, alternates } = page;
  const t = T[lang];
  const alts = alternates || {};
  const altLinks = Object.entries(alts).map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${p}">`).join("") + (alts.fr ? `<link rel="alternate" hreflang="x-default" href="${SITE}${alts.fr}">` : "");
  const html = renderToString(h(PublicPage, { page, statics }));
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${path}">${altLinks}
<meta property="og:type" content="${page.kind === "article" ? "article" : "website"}"><meta property="og:site_name" content="Me My Baby"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${path}"><meta property="og:locale" content="${t.locale}"><meta property="og:image" content="${esc(page.art?.img || SITE + "/logo.png")}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/logo.png"><link rel="apple-touch-icon" href="/logo.png"><meta name="theme-color" content="#FBF1E3">
<link rel="preload" href="/inter-v1.woff" as="font" type="font/woff" crossorigin><link rel="preload" href="/fraunces-v1.woff" as="font" type="font/woff" crossorigin>
<style>${FONTS}${GLOBAL_CSS}</style>${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("")}
</head><body><div id="root">${html}</div>
${["home", "preg", "ov"].includes(page.kind) ? calcTpl[lang] : ""}<script src="${CLIENT_JS}" defer></script>
</body></html>`;
}
const crumbsLd = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, ...(href ? { item: SITE + href } : {}) })) });
const faqLd = (pairs) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: pairs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

// Aperçus des vraies pages de l'appli (rendus une fois par langue).
const showcaseHtml = {};
const previewHtml = {};
for (const lang of LANGS) {
  const screens = screenElements(lang);
  showcaseHtml[lang] = safeRender(h(ShowcaseStatic, { lang, renderScreen: (i) => safeRender(screens[i]) }));
  const home = safeRender(screens[0]);
  previewHtml[lang] = home ? renderToString(h(PhoneFrame, { scale: 0.58, height: 690 }, h("div", { dangerouslySetInnerHTML: { __html: home } }))) : "";
}

// Modèles des résultats des calculateurs (même dessin que dans l'appli), remplis par le petit programme.
const gridOf = (html) => {
  const at = html.indexOf("display:grid");
  if (at < 0) return "";
  const start = html.lastIndexOf("<div", at);
  let depth = 0, i = start;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  for (let m; (m = re.exec(html));) { depth += m[0] === "</div>" ? -1 : 1; if (depth === 0) { i = re.lastIndex; break; } }
  return html.slice(start, i);
};
const sampleDate = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
const calcTpl = {};
for (const lang of LANGS) {
  const preg = gridOf(renderToString(h(PregnancyCalculator, { lang, initialLmp: sampleDate(100) })));
  const ov = gridOf(renderToString(h(OvulationCalculator, { lang, initialLmp: sampleDate(10) })));
  calcTpl[lang] = `<template id="mmb-tpl-preg">${preg}</template><template id="mmb-tpl-ov">${ov}</template>`;
}

// ---------- 6. Articles publiés ----------
// Sur Google, on publie au moins les 100 premiers articles (ou plus, si l'appli en a déjà débloqué
// davantage). Dans l'appli, le rythme reste de 4 nouveautés par semaine.
const PUBLIC_MIN_ARTICLES = 100;
const published = ARTICLES.slice(0, Math.max(getPublishedArticles(ARTICLES).length, Math.min(PUBLIC_MIN_ARTICLES, ARTICLES.length)));
const usedSlugs = { fr: new Set(), en: new Set(), es: new Set() };
const articleInfo = published.map((a) => {
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
const catOf = (id) => ARTICLE_CATEGORIES.find((c) => c.id === id);
const minutes = (a, l) => Math.max(2, Math.round(a.body[l].join(" ").split(/\s+/).length / 200));
const card = (x, lang) => ({
  id: x.a.id, url: x.slugs[lang], title: x.a.title[lang], excerpt: x.a.excerpt[lang], img: x.a.image?.url || "",
  alt: x.a.image?.alt?.[lang] || x.a.title[lang], color: x.a.color || catOf(x.a.category)?.color || "#6B7F94", cat: x.a.category, min: minutes(x.a, lang),
});
const paras = (list) => list.map((p) => `<p style="font-size:15px;color:#3A3833;line-height:1.75;margin:0 0 15px">${esc(p)}</p>`).join("");

const urls = []; // pour le sitemap : { alternates, lastmod }
const addUrl = (alternates, lastmod = TODAY) => urls.push({ alternates, lastmod });

for (const lang of LANGS) {
  const t = T[lang];
  const P = PT[lang];
  const base = { lang, paths: pathsFor(lang) };

  // Accueil public — le même accueil que celui de l'appli pour une non-membre, avec en plus les aperçus.
  await write(PATHS.home[lang], doc({
    page: { ...base, kind: "home", section: "home", path: PATHS.home[lang], alternates: PATHS.home },
    statics: { showcase: showcaseHtml[lang] }, hydrate: true,
    title: t.homeTitle, desc: t.homeDesc,
    jsonld: [
      { "@context": "https://schema.org", "@type": "WebSite", name: "Me My Baby", url: SITE + PATHS.home[lang], inLanguage: lang },
      { "@context": "https://schema.org", "@type": "Organization", name: "Me My Baby", url: SITE, logo: `${SITE}/logo.png` },
      { "@context": "https://schema.org", "@type": "WebApplication", name: "Me My Baby", url: SITE, applicationCategory: "HealthApplication", operatingSystem: "Android, iOS, Web", inLanguage: ["fr", "en", "es"], description: t.homeDesc, offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" } },
      faqLd(P.faq),
    ],
  }));
  if (lang === "fr") addUrl(PATHS.home); // une seule fois : chaque entrée liste déjà les 3 langues

  // Calculateurs (gratuits, sans compte)
  for (const k of ["preg", "ov"]) {
    const c = CALC[k][lang];
    const p = PATHS[k][lang];
    const seo = `<h2 style="font-family:Fraunces,Georgia,serif;font-size:22px;color:#5B3A24;margin:20px 0 12px">${esc(P.moreInfo)}</h2>` +
      c.sections.map(([q, a]) => `<div style="background:#fff;border:1px solid #E7E1D3;border-radius:18px;padding:18px 20px;margin:0 0 12px;box-shadow:0 2px 14px rgba(91,58,36,0.06)"><h3 style="font-family:Fraunces,Georgia,serif;font-size:18px;color:#5B3A24;margin:0 0 6px">${esc(q)}</h3><p style="font-size:14.5px;line-height:1.7;margin:0;color:#3A3833">${esc(a)}</p></div>`).join("");
    const crumbItems = [[t.home, PATHS.home[lang]], [c.h1, null]];
    await write(p, doc({
      page: { ...base, kind: k, section: k, path: p, alternates: PATHS[k], calc: { h1: c.h1, intro: c.intro } },
      statics: { showcase: showcaseHtml[lang], seo, "mmb-calc-preview": previewHtml[lang] }, hydrate: true,
      title: c.title, desc: c.desc,
      jsonld: [{ "@context": "https://schema.org", "@type": "WebApplication", name: c.h1, url: SITE + p, applicationCategory: "HealthApplication", operatingSystem: "Web", inLanguage: lang, offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" } }, faqLd(c.sections), crumbsLd(crumbItems)],
    }));
    if (lang === "fr") addUrl(PATHS[k]);
  }

  // Liste des articles (recherche et filtres comme dans l'appli)
  const list = [...articleInfo].reverse().map((x) => card(x, lang));
  await write(PATHS.articles[lang], doc({
    page: { ...base, kind: "articles", section: "articles", path: PATHS.articles[lang], alternates: PATHS.articles, list, cats: ARTICLE_CATEGORIES.map((c) => ({ id: c.id, label: c.label[lang], color: c.color })) },
    hydrate: true, title: `${t.articlesTitle} — Me My Baby`, desc: t.articlesDesc,
    jsonld: [crumbsLd([[t.home, PATHS.home[lang]], [t.articlesH1, null]])],
  }));
  if (lang === "fr") addUrl(PATHS.articles);

  // Chaque article
  for (const x of articleInfo) {
    const a = x.a;
    const p = x.slugs[lang];
    const body = a.body[lang];
    const cut = body.length > 3 ? Math.ceil(body.length / 2) : body.length;
    const related = articleInfo.filter((y) => y !== x && y.a.category === a.category).slice(0, 3).map((y) => card(y, lang));
    const crumbItems = [[t.home, PATHS.home[lang]], [t.articlesH1, PATHS.articles[lang]], [a.title[lang], null]];
    await write(p, doc({
      page: { ...base, kind: "article", section: "articles", path: p, alternates: x.slugs, art: { ...card(x, lang), catLabel: catOf(a.category)?.label?.[lang] || "", sources: a.sources || [] }, related },
      statics: { body1: paras(body.slice(0, cut)), body2: paras(body.slice(cut)) }, hydrate: false,
      title: `${a.title[lang]} — Me My Baby`, desc: a.excerpt[lang],
      jsonld: [{ "@context": "https://schema.org", "@type": "Article", headline: a.title[lang], description: a.excerpt[lang], inLanguage: lang, datePublished: x.date, dateModified: x.date, ...(a.image?.url ? { image: [a.image.url] } : {}), author: { "@type": "Organization", name: "Me My Baby" }, publisher: { "@type": "Organization", name: "Me My Baby", logo: { "@type": "ImageObject", url: `${SITE}/logo.png` } }, mainEntityOfPage: SITE + p }, crumbsLd(crumbItems)],
    }));
  }

  // Textes légaux
  for (const k of ["privacy", "terms"]) {
    const text = LEGAL_TEXT[k][lang];
    const [first, ...blocks] = text.split(/\n\n/);
    const legal = `<h1 style="font-family:Fraunces,Georgia,serif;font-size:26px;color:#5B3A24;margin:0 0 14px">${esc(first)}</h1>` + blocks.map((block) => {
      if (/^\d+\.\s|^⚠️/.test(block)) { const [hd, ...b] = block.split("\n"); return `<h2 style="font-family:Fraunces,Georgia,serif;font-size:18px;color:#5B3A24;margin:20px 0 6px">${esc(hd)}</h2>${b.length ? `<p style="white-space:pre-line;font-size:14px;line-height:1.7;margin:0 0 10px">${esc(b.join("\n"))}</p>` : ""}`; }
      return `<p style="white-space:pre-line;font-size:14px;line-height:1.7;margin:0 0 10px">${esc(block)}</p>`;
    }).join("");
    await write(PATHS[k][lang], doc({
      page: { ...base, kind: "legal", section: k, path: PATHS[k][lang], alternates: PATHS[k] },
      statics: { legal }, hydrate: false, title: `${k === "privacy" ? t.privacy : t.terms} — Me My Baby`, desc: `${k === "privacy" ? t.privacy : t.terms} — Me My Baby`,
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

console.log(`Pages publiques : ${urls.length * 3} pages (${articleInfo.length} articles × 3 langues) + sitemap.xml + robots.txt — script ${CLIENT_JS}`);
