import React, { useState, useMemo, useRef, useEffect, useId } from "react";
import {
  Sun, Heart, Calculator, Calendar, Baby, Apple, Droplet, Stethoscope,
  Sparkles, Mail, UserPlus, Menu, X, ChevronRight, Check, Star, Moon,
  Bath, Scissors, ThermometerSun, ShieldAlert, BookOpen, Users, Globe,
  User, CreditCard, MessageCircle, MessageSquare, Send, Lock, Share2, Bot,
  ThumbsUp, ThumbsDown, Cloud, UtensilsCrossed, Egg,
  Shirt, Car, FileText, Smartphone, Milk, Footprints, Snowflake, CloudSun
} from "lucide-react";

/* ---------------- SUPABASE (connexion directe via requêtes web, sans npm) ---------------- */
const SUPABASE_URL = "https://mojvmjgprcbivamxejdp.supabase.co";
const SUPABASE_KEY = "sb_publishable_0B7hZQm8ePFg9HALogVm5A_bAQabO9k";
const SESSION_STORAGE_KEY = "mmb_session";

async function supabaseSignUp(email, password, profileData) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ email, password, data: profileData }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "Erreur d'inscription");
  return data;
}

// Confirme l'inscription avec le code à 6 chiffres envoyé par courriel — renvoie une session valide.
async function supabaseVerifyOtp(email, token, type = "signup") {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ email, token, type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "Code de vérification invalide ou expiré");
  return data;
}

// Renvoie un nouveau code de vérification par courriel.
async function supabaseResendOtp(email, type = "signup") {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ email, type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "Impossible de renvoyer le code");
  return data;
}

async function supabaseSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "Courriel ou mot de passe incorrect");
  return data; // { access_token, refresh_token, expires_at, user, ... }
}

async function supabaseRefreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || "Session expirée");
  return data;
}

async function supabaseGetUser(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Session invalide");
  return data;
}

async function supabaseSignOut(accessToken) {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
    });
  } catch (e) { /* déconnexion locale même si l'appel réseau échoue */ }
}

async function supabaseFetchProfile(userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer le profil");
  return data[0] || null;
}

async function supabaseUpdateProfile(userId, updates, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Impossible de mettre à jour le profil");
}

/* ---------------- ENFANTS (table Supabase "children") ---------------- */
async function supabaseFetchChildren(userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/children?user_id=eq.${userId}&select=*&order=created_at.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer les enfants");
  return data;
}

async function supabaseAddChild(child, userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/children`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId, name: child.name, birthdate: child.birthdate || null, photo_data: child.photo || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible d'ajouter l'enfant");
  return data[0];
}

async function supabaseDeleteChild(id, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/children?id=eq.${id}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Impossible de retirer l'enfant");
}

function mapChildRow(row) {
  return { id: row.id, name: row.name, birthdate: row.birthdate || "", photo: row.photo_data || null };
}

/* ---------------- SUIVI DE CROISSANCE (table Supabase "growth_entries") ---------------- */
async function supabaseFetchGrowthEntries(userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/growth_entries?user_id=eq.${userId}&select=*&order=date.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer le suivi de croissance");
  return data;
}

async function supabaseAddGrowthEntry(entry, userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/growth_entries`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId, child_id: entry.childId, date: entry.date,
      weight_kg: entry.weight, height_cm: entry.height ?? null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible d'ajouter la mesure");
  return data[0];
}

function mapGrowthRow(row) {
  return { id: row.id, childId: row.child_id, date: row.date, weight: Number(row.weight_kg), height: row.height_cm != null ? Number(row.height_cm) : null };
}

/* ---------------- RENDEZ-VOUS (table Supabase "appointments") ---------------- */
async function supabaseFetchAppointments(userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?user_id=eq.${userId}&select=*&order=date.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer les rendez-vous");
  return data;
}
async function supabaseAddAppointment(appt, userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId, person: appt.person, child_name: appt.childName || null, title: appt.title,
      date: appt.date, time: appt.time || null, location: appt.location || null, notes: appt.notes || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible d'ajouter le rendez-vous");
  return data[0];
}
async function supabaseDeleteAppointment(id, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`, {
    method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Impossible de retirer le rendez-vous");
}
function mapAppointmentRow(row) {
  return { id: row.id, person: row.person, childName: row.child_name || "", title: row.title, date: row.date, time: row.time || "", location: row.location || "", notes: row.notes || "" };
}

/* ---------------- JOURNAL DE SOUVENIRS (table Supabase "journal_entries") ---------------- */
async function supabaseFetchJournalEntries(userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/journal_entries?user_id=eq.${userId}&select=*&order=entry_date.desc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer le journal");
  return data;
}
async function supabaseAddJournalEntry(entry, userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/journal_entries`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ user_id: userId, text: entry.text, photo_data: entry.photo || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible d'ajouter le souvenir");
  return data[0];
}
function mapJournalRow(row) {
  return { id: row.id, text: row.text, photo: row.photo_data || null, date: new Date(row.entry_date) };
}

/* ---------------- MES DOCUMENTS (table Supabase "documents") ---------------- */
async function supabaseFetchDocuments(userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents?user_id=eq.${userId}&select=*&order=created_at.desc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer les documents");
  return data;
}
async function supabaseAddDocument(doc, userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId, label: doc.label, category: doc.category, note: doc.note || null,
      reminder_date: doc.reminderDate || null, photo_data: doc.photo || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible d'ajouter le document");
  return data[0];
}
async function supabaseDeleteDocument(id, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${id}`, {
    method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Impossible de retirer le document");
}
function mapDocumentRow(row) {
  return { id: row.id, label: row.label, category: row.category, note: row.note || "", reminderDate: row.reminder_date || "", photo: row.photo_data || "", date: new Date(row.created_at) };
}

/* ---------------- TÂCHES FAMILIALES (table Supabase "family_tasks") ---------------- */
async function supabaseFetchFamilyTasks(userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/family_tasks?user_id=eq.${userId}&select=*&order=created_at.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer les tâches");
  return data;
}
async function supabaseAddFamilyTask(task, userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/family_tasks`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ user_id: userId, task: task.task, person: task.person, done: false }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible d'ajouter la tâche");
  return data[0];
}
async function supabaseUpdateFamilyTask(id, done, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/family_tasks?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  if (!res.ok) throw new Error("Impossible de mettre à jour la tâche");
}
async function supabaseDeleteFamilyTask(id, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/family_tasks?id=eq.${id}`, {
    method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Impossible de retirer la tâche");
}
function mapFamilyTaskRow(row) {
  return { id: row.id, task: row.task, person: row.person, done: row.done };
}

/* ---------------- ALBUM SOUVENIR (table Supabase "album_data" — une ligne par enfant) ---------------- */
async function supabaseFetchAlbum(childId, userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/album_data?child_id=eq.${childId}&user_id=eq.${userId}&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer l'album");
  return data[0] || null;
}
async function supabaseUpsertAlbum(childId, userId, theme, answers, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/album_data?on_conflict=user_id,child_id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ user_id: userId, child_id: childId, theme, answers }),
  });
  if (!res.ok) throw new Error("Impossible d'enregistrer l'album");
}

/* ---------------- TRACKERS RAPIDES (table Supabase "tracker_entries", partagée par type) ---------------- */
async function supabaseFetchTrackerEntries(userId, type, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries?user_id=eq.${userId}&type=eq.${type}&select=*&order=created_at.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible de récupérer l'historique");
  return data;
}
async function supabaseAddTrackerEntry(type, entry, userId, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracker_entries`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId, type, label: entry.label, detail: entry.detail || null,
      entry_start: entry.start ? entry.start.toISOString() : null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Impossible d'ajouter l'entrée");
  return data[0];
}
function mapTrackerEntryRow(row) {
  return { id: row.id, label: row.label, detail: row.detail || "", start: row.entry_start ? new Date(row.entry_start) : undefined };
}

/* ---------------- PHOTOS (Supabase Storage, bucket "photos") ---------------- */
// Redimensionne et compresse une photo avant de la garder en mémoire ou de l'envoyer au serveur.
// Les photos prises directement avec l'appareil photo d'un téléphone (ex. 40 mégapixels sur certains Android)
// peuvent faire planter la page en mémoire dès le CHARGEMENT, avant même la compression, si on les décode à pleine résolution.
// On utilise donc createImageBitmap avec redimensionnement natif (beaucoup plus économe en mémoire) quand le navigateur le supporte,
// et on ne se rabat sur la méthode Image+canvas (plus gourmande) que si nécessaire.
async function resizeImageForUpload(file, maxDim = 640, quality = 0.75) {
  if (!file || !file.type?.startsWith("image/")) return { dataUrl: null, file };

  const toResult = async (bitmapLike, width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmapLike, 0, 0, width, height);
    if (bitmapLike.close) bitmapLike.close(); // libère la mémoire du bitmap dès que possible
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve({ dataUrl, file }); return; }
        const resizedFile = new File([blob], (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
        resolve({ dataUrl, file: resizedFile });
      }, "image/jpeg", quality);
    });
  };

  // Méthode économe en mémoire : le navigateur redimensionne PENDANT le décodage, sans jamais
  // allouer la pleine résolution d'origine. Seul le paramètre de largeur est fourni pour que
  // la hauteur soit calculée automatiquement en conservant les proportions.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { resizeWidth: maxDim, resizeQuality: "medium" });
      const result = await toResult(bitmap, bitmap.width, bitmap.height);
      return result;
    } catch (e) { /* on retombe sur la méthode classique ci-dessous si non supportée */ }
  }

  // Méthode de secours (navigateurs plus anciens) — décode à pleine résolution puis redimensionne.
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        resolve(await toResult(img, width, height));
      };
      img.onerror = () => resolve({ dataUrl: null, file });
      img.src = reader.result;
    };
    reader.onerror = () => resolve({ dataUrl: null, file });
    reader.readAsDataURL(file);
  });
}

async function supabaseUploadPhoto(file, userId, accessToken) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) throw new Error("Impossible de téléverser la photo");
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}

// Stocke la session localement pour rester connecté d'une visite à l'autre.
function saveLocalSession(session) {
  try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); } catch (e) { /* stockage indisponible */ }
}
function loadLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearLocalSession() {
  try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch (e) { /* rien à faire */ }
}

// TODO: à connecter à un vrai service d'envoi de courriel (ex. EmailJS ou une
// fonction Supabase Edge + Resend) — pour l'instant cette fonction ne fait que
// simuler l'envoi, le temps de brancher le service réel.
async function sendPersonalizedMenuEmail(email, menuText, lang) {
  console.log("[Simulation d'envoi courriel]", { to: email, menuText });
  return true;
}

/* ---------------------------------------------------------------
   HAPPY BABY — from conception to age 5 / de la conception à 5 ans
   Single-file React prototype. Front-end only: the sign-up form,
   payment field and newsletter consent are captured in local state
   for demonstration; no real account, charge or email is created.
----------------------------------------------------------------*/

const T = {
  fr: {
    brandTag: "de la conception à 5 ans",
    nav: {
      accueil: "Accueil", conception: "Conception", grossesse: "Ma grossesse",
      postpartum: "Post-partum", dev01: "0 à 5 ans", suivi: "Suivi quotidien", rdv: "Rendez-vous",
      alimentation: "Alimentation", soins: "Soins", sante: "Santé",
      mission: "Notre mission", abonnement: "Abonnement",
      profil: "Profil", dietitian: "Diététicienne", assistant: "Posez votre question", contact: "Nous joindre",
    },
    home: {
      hero1: "Bienvenue aux mamans et futures mamans.",
      heroTagline: "Ma grossesse, mon enfant",
      hero2: "Suivez chaque étape de votre grossesse ainsi que le développement de votre enfant jusqu'à l'âge de 5 ans.",
      cta: "Essai gratuit de 5 jours",
      ctaSecondary: "ou devenir membre",
      whyTitle: "Me My Baby est l'outil incontournable des mamans",
      whySummary: "Grâce à Léa, notre diététicienne virtuelle, obtenez un menu personnalisé selon vos besoins — ou choisissez parmi nos menus généraux proposés pour l'allaitement, la perte de poids ou un apport en protéines, renouvelés chaque semaine.",
      communityTitle: "Rejoignez une communauté de mamans",
      communityDesc: "En devenant membre, vous rejoignez une communauté de mamans et de futures mamans où on échange des trucs, des astuces et du soutien, à chaque étape.",
      communityCta: "Voir la communauté",
      testimonials: [
        { name: "Camille", quote: "J'ai enfin trouvé d'autres mamans qui comprennent exactement ce que je vis en ce moment." },
        { name: "Marie-Ève", quote: "Les astuces partagées par la communauté valent à elles seules l'abonnement." },
        { name: "Sarah", quote: "C'est rassurant de pouvoir poser une question et d'avoir des réponses de vraies mamans." },
      ],
      tryTitle: "Essayez-le tout de suite",
      tryDesc: "Voici un aperçu du calculateur de grossesse — un outil parmi des dizaines qui vous attendent une fois membre.",
      tryCta: "Essai gratuit de 5 jours",
      closingTitle: "Prête à faire vos premiers pas avec Me My Baby ?",
      closingDesc: "Rejoignez les parents qui avancent avec un peu plus de confiance, une étape à la fois.",
      closingCta: "Essai gratuit de 5 jours",
      closingCtaSecondary: "ou devenir membre",
    },
  },
  en: {
    brandTag: "from conception to age 5",
    nav: {
      accueil: "Home", conception: "Conception", grossesse: "My Pregnancy",
      postpartum: "Postpartum", dev01: "0 to 5 years", suivi: "Daily tracking", rdv: "Appointments",
      alimentation: "Feeding", soins: "Care", sante: "Health",
      mission: "Our mission", abonnement: "Membership",
      profil: "Profile", dietitian: "Dietitian", assistant: "Ask your question", contact: "Contact us",
    },
    home: {
      hero1: "Welcome, moms and moms-to-be.",
      heroTagline: "My pregnancy, my child",
      hero2: "Follow every step of your pregnancy and your child's development up to age 5.",
      cta: "5-day free trial",
      ctaSecondary: "or become a member",
      whyTitle: "Me My Baby is the must-have tool for moms",
      whySummary: "With Léa, our virtual dietitian, get a menu personalized to your needs — or choose from our general menus for breastfeeding, weight loss, or protein intake, refreshed every week.",
      communityTitle: "Join a community of moms",
      communityDesc: "By becoming a member, you join a community of moms and moms-to-be where tips, tricks, and support are shared at every stage.",
      communityCta: "See the community",
      testimonials: [
        { name: "Camille", quote: "I finally found other moms who get exactly what I'm going through right now." },
        { name: "Marie-Ève", quote: "The tips shared by the community alone are worth the membership." },
        { name: "Sarah", quote: "It's so reassuring to ask a question and get answers from real moms." },
      ],
      tryTitle: "Try it right now",
      tryDesc: "Here's a preview of the pregnancy calculator — one tool among dozens waiting for you as a member.",
      tryCta: "5-day free trial",
      closingTitle: "Ready to take your first steps with Me My Baby?",
      closingDesc: "Join the parents moving forward with a little more confidence, one stage at a time.",
      closingCta: "5-day free trial",
      closingCtaSecondary: "or become a member",
    },
  },
  es: {
    brandTag: "de la concepción a los 5 años",
    nav: {
      accueil: "Inicio", conception: "Concepción", grossesse: "Mi embarazo",
      postpartum: "Posparto", dev01: "0 a 5 años", suivi: "Seguimiento diario", rdv: "Citas",
      alimentation: "Alimentación", soins: "Cuidados", sante: "Salud",
      mission: "Nuestra misión", abonnement: "Membresía",
      profil: "Perfil", dietitian: "Nutricionista", assistant: "Haz tu pregunta", contact: "Contáctanos",
    },
    home: {
      hero1: "Bienvenidas, mamás y futuras mamás.",
      heroTagline: "Mi embarazo, mi hijo",
      hero2: "Sigue cada etapa de tu embarazo y el desarrollo de tu hijo hasta los 5 años.",
      cta: "Prueba gratuita de 5 días",
      ctaSecondary: "o hazte miembro",
      whyTitle: "Me My Baby es la herramienta indispensable para las mamás",
      whySummary: "Con Léa, nuestra nutricionista virtual, obtén un menú personalizado según tus necesidades — o elige entre nuestros menús generales para lactancia, pérdida de peso o aporte de proteínas, renovados cada semana.",
      communityTitle: "Únete a una comunidad de mamás",
      communityDesc: "Al hacerte miembro, te unes a una comunidad de mamás y futuras mamás donde se comparten consejos, trucos y apoyo, en cada etapa.",
      communityCta: "Ver la comunidad",
      testimonials: [
        { name: "Camille", quote: "Por fin encontré otras mamás que entienden exactamente lo que estoy viviendo ahora mismo." },
        { name: "Marie-Ève", quote: "Los consejos que comparte la comunidad ya valen la membresía por sí solos." },
        { name: "Sarah", quote: "Es un alivio poder hacer una pregunta y recibir respuestas de mamás reales." },
      ],
      tryTitle: "Pruébalo ahora mismo",
      tryDesc: "Aquí tienes un adelanto de la calculadora de embarazo — una de las decenas de herramientas que te esperan como miembro.",
      tryCta: "Prueba gratuita de 5 días",
      closingTitle: "¿Lista para dar tus primeros pasos con Me My Baby?",
      closingDesc: "Únete a los padres que avanzan con un poco más de confianza, una etapa a la vez.",
      closingCta: "Prueba gratuita de 5 días",
      closingCtaSecondary: "o hazte miembro",
    },
  },
};

const COLORS = {
  cream: "#FBF6ED",
  card: "#FFFFFF",
  teal: "#2F4858",
  sage: "#8FA68E",
  ochre: "#D4A54A",
  pink: "#D98BA4",
  blue: "#6E9BC0",
  yellow: "#E3C24B",
  text: "#3A3833",
  muted: "#7A7364",
  line: "#E7E1D3",
};


/* ---------------- CONCEPTION DATA ---------------- */
const CONCEPTION = {
  cycle: {
    title: { fr: "Cycle & ovulation", en: "Cycle & ovulation", es: "Ciclo y ovulación" },
    intro: {
      fr: "Le cycle menstruel dure en moyenne 28 jours, mais un cycle normal peut varier entre 21 et 35 jours. L'ovulation survient généralement 14 jours avant le début des prochaines règles, peu importe la longueur du cycle. Comprendre les 4 phases du cycle aide à mieux cibler la période propice à la conception.",
      en: "The menstrual cycle averages 28 days, but a normal cycle can range from 21 to 35 days. Ovulation usually happens 14 days before the next period starts, regardless of cycle length. Understanding the 4 phases of the cycle helps target the window most favorable to conception.",
      es: "El ciclo menstrual dura en promedio 28 días, pero un ciclo normal puede variar entre 21 y 35 días. La ovulación suele ocurrir 14 días antes del inicio de la siguiente menstruación, sin importar la duración del ciclo. Entender las 4 fases del ciclo ayuda a identificar mejor el período propicio para la concepción.",
    },
    groups: [
      {
        title: { fr: "Les 4 phases du cycle", en: "The 4 cycle phases", es: "Las 4 fases del ciclo" },
        color: COLORS.pink,
        illu: "cycleDiagram",
        items: {
          fr: [
            "Phase menstruelle (jours 1-5) : la muqueuse utérine se détache, début du décompte du cycle",
            "Phase folliculaire (jours 1-13 environ) : plusieurs follicules se développent dans l'ovaire sous l'effet de la FSH, un seul devient dominant",
            "Ovulation (autour du jour 14) : libération de l'ovule mature, viable seulement 12 à 24 heures",
            "Phase lutéale (jours 15-28 environ) : le corps jaune produit de la progestérone; cette phase dure environ 12 à 16 jours et varie peu d'un cycle à l'autre chez une même personne",
          ],
          en: [
            "Menstrual phase (days 1-5): the uterine lining sheds, marks day 1 of the cycle",
            "Follicular phase (roughly days 1-13): several follicles develop in the ovary under FSH, one becomes dominant",
            "Ovulation (around day 14): the mature egg is released, viable for only 12 to 24 hours",
            "Luteal phase (roughly days 15-28): the corpus luteum produces progesterone; this phase lasts about 12 to 16 days and varies little from cycle to cycle for a given person",
          ],
          es: [
            "Fase menstrual (días 1-5): se desprende el revestimiento uterino, marca el inicio del ciclo",
            "Fase folicular (días 1-13 aprox.): varios folículos se desarrollan en el ovario por efecto de la FSH, uno se vuelve dominante",
            "Ovulación (alrededor del día 14): liberación del óvulo maduro, viable solo entre 12 y 24 horas",
            "Fase lútea (días 15-28 aprox.): el cuerpo lúteo produce progesterona; esta fase dura entre 12 y 16 días y varía poco de un ciclo a otro en una misma persona",
          ],
        },
      },
      {
        title: { fr: "Fécondation & régularité", en: "Fertilization & regularity", es: "Fecundación y regularidad" },
        color: COLORS.sage,
        illu: "fertileCalendar",
        items: {
          fr: [
            "Les spermatozoïdes peuvent survivre jusqu'à 5 jours dans les voies génitales féminines dans une glaire cervicale favorable",
            "Un cycle est considéré régulier s'il varie de moins de 7 à 9 jours d'un mois à l'autre",
            "La longueur du cycle est déterminée par la phase folliculaire (variable), pas par la phase lutéale (stable)",
          ],
          en: [
            "Sperm can survive up to 5 days in the female reproductive tract in favorable cervical mucus",
            "A cycle is considered regular if it varies by less than 7-9 days month to month",
            "Cycle length is driven by the follicular phase (variable), not the luteal phase (stable)",
          ],
          es: [
            "Los espermatozoides pueden sobrevivir hasta 5 días en las vías genitales femeninas si el moco cervical es favorable",
            "Un ciclo se considera regular si varía menos de 7 a 9 días de un mes a otro",
            "La duración del ciclo está determinada por la fase folicular (variable), no por la fase lútea (estable)",
          ],
        },
      },
      {
        title: { fr: "Suivre son cycle", en: "Tracking your cycle", es: "Registrar tu ciclo" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Utiliser l'outil calculateur d'ovulation de cette application pendant 2-3 cycles aide à repérer son propre rythme avant d'essayer de concevoir",
            "Les hormones clés : FSH (stimule les follicules), LH (déclenche l'ovulation), œstrogène (épaissit la muqueuse), progestérone (prépare à l'implantation)",
          ],
          en: [
            "Using this app's ovulation calculator for 2-3 cycles helps you learn your own rhythm before trying to conceive",
            "Key hormones: FSH (stimulates follicles), LH (triggers ovulation), estrogen (thickens the lining), progesterone (prepares for implantation)",
          ],
          es: [
            "Usar la calculadora de ovulación de esta aplicación durante 2-3 ciclos ayuda a conocer tu propio ritmo antes de intentar concebir",
            "Hormonas clave: FSH (estimula los folículos), LH (desencadena la ovulación), estrógeno (engrosa el revestimiento), progesterona (prepara para la implantación)",
          ],
        },
      },
    ],
  },
  fenetre: {
    title: { fr: "Journée féconde & signes", en: "Fertile window & signs", es: "Ventana fértil y señales" },
    intro: {
      fr: "La fenêtre fertile correspond à la période du cycle où une relation sexuelle peut mener à une grossesse. La reconnaître, grâce à plusieurs signes combinés, augmente les chances de concevoir chaque mois.",
      en: "The fertile window is the part of the cycle when intercourse can lead to pregnancy. Recognizing it, using several combined signs, increases the chances of conceiving each month.",
      es: "La ventana fértil corresponde al período del ciclo en el que las relaciones sexuales pueden derivar en un embarazo. Reconocerla, combinando varias señales, aumenta las probabilidades de concebir cada mes.",
    },
    groups: [
      {
        title: { fr: "Repérer sa fenêtre fertile", en: "Spotting your fertile window", es: "Identificar tu ventana fértil" },
        color: COLORS.ochre,
        illu: "fertileCalendar",
        items: {
          fr: [
            "La fenêtre fertile s'étend sur environ 6 jours : les 5 jours avant l'ovulation et le jour même",
            "Les 2-3 jours précédant l'ovulation sont les plus propices à une conception",
          ],
          en: [
            "The fertile window spans about 6 days: the 5 days before ovulation plus the day itself",
            "The 2-3 days right before ovulation are the most favorable for conception",
          ],
          es: [
            "La ventana fértil abarca unos 6 días: los 5 días previos a la ovulación más el día mismo",
            "Los 2-3 días previos a la ovulación son los más propicios para la concepción",
          ],
        },
      },
      {
        title: { fr: "Signes physiques", en: "Physical signs", es: "Señales físicas" },
        color: COLORS.pink,
        illu: "thermometer",
        items: {
          fr: [
            "Glaire cervicale : sèche ou absente après les règles, puis crémeuse, puis claire/filante et élastique (comme un blanc d'œuf) juste avant l'ovulation — signe de fertilité maximale",
            "Méthode de la température basale : prise chaque matin avant de se lever; hausse de 0,3 à 0,5 °C après l'ovulation confirme qu'elle a eu lieu",
            "Position et ouverture du col utérin : plus haut, plus mou et légèrement ouvert pendant la période fertile",
            "Certaines personnes ressentent une douleur légère et brève d'un côté du bas-ventre au moment de l'ovulation (mittelschmerz)",
            "Sensibilité des seins, libido accrue et léger ballonnement sont des signes secondaires possibles",
          ],
          en: [
            "Cervical mucus: dry or absent right after your period, then creamy, then clear/stretchy and elastic (egg-white-like) just before ovulation — a sign of peak fertility",
            "Basal body temperature method: taken each morning before getting up; a rise of 0.3-0.5 °C after ovulation confirms it occurred",
            "Cervix position and openness: higher, softer, and slightly open during the fertile period",
            "Some people feel brief, mild one-sided lower abdominal pain at ovulation (mittelschmerz)",
            "Breast tenderness, increased libido, and mild bloating are possible secondary signs",
          ],
          es: [
            "Moco cervical: seco o ausente justo después de la menstruación, luego cremoso, y finalmente claro/elástico (como clara de huevo) justo antes de la ovulación — señal de fertilidad máxima",
            "Método de la temperatura basal: se toma cada mañana antes de levantarse; un aumento de 0,3 a 0,5 °C tras la ovulación confirma que ya ocurrió",
            "Posición y apertura del cuello uterino: más alto, más suave y ligeramente abierto durante el período fértil",
            "Algunas personas sienten un dolor leve y breve a un lado del bajo vientre en el momento de la ovulación (mittelschmerz)",
            "Sensibilidad en los senos, mayor libido y una leve hinchazón son posibles señales secundarias",
          ],
        },
      },
      {
        title: { fr: "Outils & stratégie", en: "Tools & strategy", es: "Herramientas y estrategia" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Les tests d'ovulation en pharmacie détectent la hausse de l'hormone LH dans l'urine, 24 à 36 h avant l'ovulation — commencer les tests quelques jours avant la date prévue",
            "Combiner plusieurs méthodes (glaire, température, tests LH) donne une image plus fiable qu'une seule méthode utilisée seule",
            "Pour optimiser les chances, avoir des relations sexuelles tous les 1-2 jours pendant toute la fenêtre fertile, pas seulement le jour de l'ovulation",
          ],
          en: [
            "Drugstore ovulation tests detect the LH surge in urine, 24-36 h before ovulation — start testing a few days before the expected date",
            "Combining several methods (mucus, temperature, LH tests) gives a more reliable picture than any one method alone",
            "To optimize your chances, have intercourse every 1-2 days throughout the whole fertile window, not just on ovulation day",
          ],
          es: [
            "Las pruebas de ovulación de farmacia detectan el aumento de la hormona LH en la orina, entre 24 y 36 h antes de la ovulación — comienza las pruebas unos días antes de la fecha prevista",
            "Combinar varios métodos (moco, temperatura, pruebas de LH) da una imagen más confiable que usar un solo método",
            "Para optimizar las probabilidades, ten relaciones sexuales cada 1-2 días durante toda la ventana fértil, no solo el día de la ovulación",
          ],
        },
      },
    ],
  },
  prepCorps: {
    title: { fr: "Préparer son corps", en: "Getting your body ready", es: "Preparar tu cuerpo" },
    illu: "conception",
    intro: {
      fr: "Les semaines qui précèdent une grossesse sont une belle occasion d'optimiser sa santé, celle de son ou sa partenaire, et de réduire certains risques dès la conception — mode de vie, alimentation et suppléments compris. Toujours discuter avec un professionnel de la santé avant de commencer un nouveau supplément ou une tisane.",
      en: "The weeks before pregnancy are a great opportunity to optimize your health and your partner's, and to reduce certain risks from conception onward — lifestyle, diet, and supplements included. Always discuss with a healthcare provider before starting a new supplement or herbal tea.",
      es: "Las semanas previas a un embarazo son una excelente oportunidad para optimizar tu salud y la de tu pareja, y para reducir ciertos riesgos desde la concepción — estilo de vida, alimentación y suplementos incluidos. Habla siempre con un profesional de la salud antes de comenzar un nuevo suplemento o infusión.",
    },
    groups: [
      {
        title: { fr: "Bilan de santé", en: "Health check-up", es: "Evaluación de salud" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Faire un bilan de santé préconception avec un professionnel : tension artérielle, glycémie, poids, médicaments actuels",
            "Faire le point sur les vaccins avant la grossesse (rubéole, varicelle, coqueluche) — certains vaccins vivants doivent être administrés au moins 1 mois avant la grossesse",
            "Réviser les médicaments actuels avec un pharmacien ou médecin : certains ne sont pas recommandés en grossesse",
            "Consulter un dentiste : la santé buccodentaire est liée à la santé de la grossesse",
          ],
          en: [
            "Get a preconception check-up with a provider: blood pressure, blood sugar, weight, current medications",
            "Check your vaccination status before pregnancy (rubella, chickenpox, pertussis) — some live vaccines need to be given at least 1 month before pregnancy",
            "Review current medications with a pharmacist or doctor: some are not recommended during pregnancy",
            "See a dentist: oral health is linked to pregnancy health",
          ],
          es: [
            "Hacerse una evaluación de salud preconcepcional con un profesional: presión arterial, glucosa, peso, medicamentos actuales",
            "Revisar el estado de vacunación antes del embarazo (rubéola, varicela, tos ferina) — algunas vacunas vivas deben aplicarse al menos 1 mes antes del embarazo",
            "Revisar los medicamentos actuales con un farmacéutico o médico: algunos no se recomiendan durante el embarazo",
            "Visitar al dentista: la salud bucal está vinculada a la salud del embarazo",
          ],
        },
      },
      {
        title: { fr: "Mode de vie", en: "Lifestyle", es: "Estilo de vida" },
        color: COLORS.sage,
        illu: "stretchFigureIllu",
        items: {
          fr: [
            "Viser un poids santé : un IMC très bas ou très élevé peut affecter la fertilité et le déroulement de la grossesse",
            "Intégrer une activité physique régulière (150 minutes/semaine) adaptée à sa condition",
            "Réduire ou cesser l'alcool, cesser de fumer (tabac et cannabis), et limiter la caféine à environ 200-300 mg/jour",
          ],
          en: [
            "Aim for a healthy weight: a very low or very high BMI can affect fertility and how pregnancy unfolds",
            "Build in regular physical activity (150 minutes/week) suited to your fitness level",
            "Reduce or stop alcohol, quit smoking (tobacco and cannabis), and limit caffeine to roughly 200-300 mg/day",
          ],
          es: [
            "Buscar un peso saludable: un IMC muy bajo o muy alto puede afectar la fertilidad y el curso del embarazo",
            "Incorporar actividad física regular (150 minutos/semana) adaptada a tu condición",
            "Reducir o dejar el alcohol, dejar de fumar (tabaco y cannabis), y limitar la cafeína a unos 200-300 mg/día",
          ],
        },
      },
      {
        title: { fr: "Partenaire & suivi", en: "Partner & follow-up", es: "Pareja y seguimiento" },
        color: COLORS.pink,
        illu: "coupleIllu",
        items: {
          fr: [
            "Le partenaire masculin peut aussi optimiser sa fertilité : alimentation saine, réduction de l'alcool et du tabac, éviter la chaleur excessive (bains chauds, sauna) pendant les 3 mois précédant l'essai",
            "Consulter si prise de médicaments chroniques, maladie chronique (diabète, hypertension, troubles thyroïdiens), ou irrégularités menstruelles importantes",
          ],
          en: [
            "Male partners can also optimize their fertility: healthy diet, less alcohol and tobacco, avoiding excess heat (hot tubs, saunas) for the 3 months before trying",
            "See a provider if you're on chronic medication, managing a chronic condition (diabetes, high blood pressure, thyroid disorders), or have significant menstrual irregularities",
          ],
          es: [
            "La pareja masculina también puede optimizar su fertilidad: alimentación saludable, reducir alcohol y tabaco, evitar el calor excesivo (jacuzzis, sauna) durante los 3 meses previos al intento",
            "Consultar si se toman medicamentos crónicos, hay una condición crónica (diabetes, hipertensión, trastornos tiroideos), o irregularidades menstruales importantes",
          ],
        },
      },
    ],
    note: {
      fr: "Sources générales : Société des obstétriciens et gynécologues du Canada (SOGC), American Society for Reproductive Medicine (ASRM), Mayo Clinic, Harvard T.H. Chan School of Public Health (étude Nurses' Health Study sur l'alimentation et la fertilité), National Institutes of Health (NIH) — Office of Dietary Supplements. Ce contenu est informatif et général; il ne remplace pas l'avis d'un professionnel de la santé, particulièrement avant de commencer un supplément ou une tisane.",
      en: "General sources: Society of Obstetricians and Gynaecologists of Canada (SOGC), American Society for Reproductive Medicine (ASRM), Mayo Clinic, Harvard T.H. Chan School of Public Health (Nurses' Health Study on diet and fertility), National Institutes of Health (NIH) — Office of Dietary Supplements. This content is general and informational; it doesn't replace advice from a healthcare professional, especially before starting a supplement or herbal tea.",
      es: "Fuentes generales: Sociedad de Obstetras y Ginecólogos de Canadá (SOGC), American Society for Reproductive Medicine (ASRM), Clínica Mayo, Harvard T.H. Chan School of Public Health (estudio Nurses' Health Study sobre alimentación y fertilidad), Institutos Nacionales de Salud (NIH) — Oficina de Suplementos Dietéticos. Este contenido es informativo y general; no reemplaza el consejo de un profesional de la salud, especialmente antes de comenzar un suplemento o infusión.",
    },
  },
  fertilite: {
    title: { fr: "Facteurs de fertilité", en: "Fertility factors", es: "Factores de fertilidad" },
    illu: "conception",
    intro: {
      fr: "La fertilité dépend de nombreux facteurs, chez les deux partenaires. La comprendre aide à savoir quand s'inquiéter et quand simplement se donner du temps.",
      en: "Fertility depends on many factors, in both partners. Understanding it helps you know when to worry and when to simply give it more time.",
      es: "La fertilidad depende de muchos factores, en ambos miembros de la pareja. Entenderla ayuda a saber cuándo preocuparse y cuándo simplemente darse más tiempo.",
    },
    groups: [
      {
        title: { fr: "Facteurs biologiques", en: "Biological factors", es: "Factores biológicos" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "L'âge influence fortement la fertilité féminine : la réserve ovarienne diminue graduellement, avec une baisse plus marquée après 35 ans et encore plus après 40 ans",
            "La fertilité masculine décline aussi avec l'âge, mais plus graduellement",
            "Le poids (IMC trop faible ou trop élevé) peut perturber l'ovulation et réduire les chances de conception",
            "Le stress chronique peut affecter le cycle, sans nécessairement empêcher la conception à lui seul",
          ],
          en: [
            "Age strongly affects female fertility: ovarian reserve declines gradually, with a sharper drop after 35 and an even steeper one after 40",
            "Male fertility also declines with age, but more gradually",
            "Weight (BMI too low or too high) can disrupt ovulation and reduce the chances of conception",
            "Chronic stress can affect the cycle, without necessarily preventing conception on its own",
          ],
          es: [
            "La edad influye fuertemente en la fertilidad femenina: la reserva ovárica disminuye gradualmente, con una baja más marcada después de los 35 años y aún mayor después de los 40",
            "La fertilidad masculina también declina con la edad, pero de forma más gradual",
            "El peso (IMC demasiado bajo o alto) puede alterar la ovulación y reducir las probabilidades de concepción",
            "El estrés crónico puede afectar el ciclo, sin necesariamente impedir la concepción por sí solo",
          ],
        },
      },
      {
        title: { fr: "Habitudes & santé", en: "Habits & health", es: "Hábitos y salud" },
        color: COLORS.ochre,
        illu: "allergyWarning",
        items: {
          fr: [
            "Le tabagisme (actif et passif) réduit la fertilité chez les deux partenaires et accélère le vieillissement ovarien",
            "L'alcool et certaines drogues récréatives peuvent nuire à la fertilité et au développement embryonnaire précoce",
            "Certaines conditions médicales affectent la fertilité : syndrome des ovaires polykystiques (SOPK), endométriose, troubles thyroïdiens, obstruction des trompes",
            "Les infections transmissibles sexuellement non traitées peuvent causer des cicatrices tubaires et affecter la fertilité",
          ],
          en: [
            "Smoking (active and secondhand) reduces fertility in both partners and speeds up ovarian aging",
            "Alcohol and certain recreational drugs can harm fertility and early embryo development",
            "Certain medical conditions affect fertility: polycystic ovary syndrome (PCOS), endometriosis, thyroid disorders, blocked fallopian tubes",
            "Untreated sexually transmitted infections can cause tubal scarring and affect fertility",
          ],
          es: [
            "El tabaquismo (activo y pasivo) reduce la fertilidad en ambos miembros de la pareja y acelera el envejecimiento ovárico",
            "El alcohol y ciertas drogas recreativas pueden dañar la fertilidad y el desarrollo embrionario temprano",
            "Ciertas condiciones médicas afectan la fertilidad: síndrome de ovario poliquístico (SOP), endometriosis, trastornos tiroideos, obstrucción de las trompas",
            "Las infecciones de transmisión sexual no tratadas pueden causar cicatrices en las trompas y afectar la fertilidad",
          ],
        },
      },
      {
        title: { fr: "Statistiques & quand consulter", en: "Statistics & when to see a provider", es: "Estadísticas y cuándo consultar" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "80 % des couples conçoivent dans la première année d'essais réguliers (rapports 2-3 fois par semaine sans contraception)",
            "Environ 15 % des couples au Canada et au Québec vivent de l'infertilité, définie comme l'absence de grossesse après 12 mois d'essais",
            "Consulter après 12 mois d'essais infructueux (ou 6 mois si 35 ans et plus, ou immédiatement si irrégularités menstruelles marquées, antécédents connus, ou âge de 40 ans et plus)",
            "Un bilan de fertilité de base inclut souvent : suivi de l'ovulation, analyse de sperme, évaluation de la perméabilité des trompes",
          ],
          en: [
            "80% of couples conceive within the first year of trying regularly (intercourse 2-3 times a week without contraception)",
            "About 15% of couples in Canada experience infertility, defined as no pregnancy after 12 months of trying",
            "See a provider after 12 months of trying (or 6 months if 35 or older, or right away with marked menstrual irregularities, known history, or age 40+)",
            "A basic fertility work-up often includes: ovulation tracking, semen analysis, and evaluation of tubal patency",
          ],
          es: [
            "El 80 % de las parejas conciben dentro del primer año de intentos regulares (relaciones 2-3 veces por semana sin anticoncepción)",
            "Cerca del 15 % de las parejas en Canadá viven infertilidad, definida como la ausencia de embarazo después de 12 meses de intentos",
            "Consultar después de 12 meses de intentos sin éxito (o 6 meses si tienes 35 años o más, o de inmediato si hay irregularidades menstruales marcadas, antecedentes conocidos, o edad de 40 años o más)",
            "Una evaluación básica de fertilidad suele incluir: seguimiento de la ovulación, análisis de semen, evaluación de la permeabilidad de las trompas",
          ],
        },
      },
    ],
  },
};


/* ---------------- PREGNANCY DATA ---------------- */
const PREGNANCY_WEEKS = [
  {
    w: 4, icon: "poppySeed",
    compare: { fr: "une graine de pavot", en: "a poppy seed" },
    length: { fr: "≈ 2 mm", en: "≈ 0.08 in" }, weight: { fr: "< 1 g", en: "< 1 g" },
    desc: {
      fr: "L'implantation dans la paroi utérine vient tout juste de se compléter. Les cellules qui formeront le cœur, le cerveau et la colonne vertébrale commencent à se différencier.",
      en: "Implantation in the uterine wall has just been completed. The cells that will form the heart, brain, and spine are just beginning to differentiate.",
    },
    short: { fr: "Implantation complétée; cœur, cerveau et colonne commencent à se former.", en: "Implantation complete; heart, brain, and spine start forming." },
  },
  {
    w: 8, icon: "raspberryFruit",
    compare: { fr: "une framboise", en: "a raspberry" },
    length: { fr: "≈ 1,6 cm", en: "≈ 0.6 in" }, weight: { fr: "≈ 1 g", en: "≈ 1 g" },
    desc: {
      fr: "Le cœur bat maintenant à un rythme régulier et peut parfois être détecté à l'échographie. Les bras et les jambes commencent à apparaître, et les traits du visage se dessinent graduellement.",
      en: "The heart now beats at a regular rhythm and can sometimes be detected on ultrasound. Arms and legs are starting to appear, and facial features are gradually taking shape.",
    },
    short: { fr: "Cœur régulier, bras et jambes apparaissent, visage se dessine.", en: "Regular heartbeat; arms, legs, and facial features emerging." },
  },
  {
    w: 12, icon: "plumFruit",
    compare: { fr: "une prune", en: "a plum" },
    length: { fr: "≈ 5,4 cm", en: "≈ 2.1 in" }, weight: { fr: "≈ 14 g", en: "≈ 0.5 oz" },
    desc: {
      fr: "Les réflexes apparaissent : bébé peut bouger les doigts et avaler. Les organes principaux sont formés et continueront de mûrir. C'est la fin du premier trimestre, un cap important.",
      en: "Reflexes appear: baby can move their fingers and swallow. The major organs are formed and will keep maturing. This marks the end of the first trimester, an important milestone.",
    },
    short: { fr: "Réflexes apparaissent; organes formés. Fin du 1er trimestre.", en: "Reflexes appear; organs formed. End of 1st trimester." },
  },
  {
    w: 16, icon: "avocado",
    compare: { fr: "un avocat", en: "an avocado" },
    length: { fr: "≈ 11,6 cm", en: "≈ 4.6 in" }, weight: { fr: "≈ 100 g", en: "≈ 3.5 oz" },
    desc: {
      fr: "Le squelette continue de se solidifier. Bébé peut faire des mouvements que la maman ne ressent pas encore. Le sexe est souvent visible à l'échographie à cette étape.",
      en: "The skeleton keeps hardening. Baby may be making movements the mother can't feel yet. Sex is often visible on ultrasound at this stage.",
    },
    short: { fr: "Squelette se solidifie; sexe souvent visible à l'échographie.", en: "Skeleton hardening; sex often visible on ultrasound." },
  },
  {
    w: 20, icon: "bananaFruit",
    compare: { fr: "une banane", en: "a banana" },
    length: { fr: "≈ 25,6 cm", en: "≈ 10.1 in" }, weight: { fr: "≈ 300 g", en: "≈ 10.6 oz" },
    desc: {
      fr: "Mi-parcours de la grossesse. Bébé développe des cycles de sommeil et d'éveil, et ses mouvements deviennent souvent perceptibles pour la première fois — un moment marquant.",
      en: "The halfway point of pregnancy. Baby develops sleep and wake cycles, and their movements often become noticeable for the first time — a memorable moment.",
    },
    short: { fr: "Mi-parcours; premiers mouvements souvent ressentis.", en: "Halfway point; first movements often felt." },
  },
  {
    w: 24, icon: "cornCob",
    compare: { fr: "un épi de maïs", en: "an ear of corn" },
    length: { fr: "≈ 30 cm", en: "≈ 11.8 in" }, weight: { fr: "≈ 600 g", en: "≈ 1.3 lb" },
    desc: {
      fr: "Les poumons continuent de se développer activement. L'ouïe s'affine : bébé peut réagir aux sons extérieurs. C'est aussi le moment du dépistage du diabète de grossesse.",
      en: "The lungs keep developing actively. Hearing is refining: baby may react to outside sounds. This is also when gestational diabetes screening usually happens.",
    },
    short: { fr: "Poumons se développent; bébé réagit aux sons.", en: "Lungs developing; baby reacts to sounds." },
  },
  {
    w: 28, icon: "eggplantFruit",
    compare: { fr: "une aubergine", en: "an eggplant" },
    length: { fr: "≈ 37,6 cm", en: "≈ 14.8 in" }, weight: { fr: "≈ 1 kg", en: "≈ 2.2 lb" },
    desc: {
      fr: "Début du troisième trimestre. Les yeux peuvent s'ouvrir et se fermer, et bébé accumule davantage de graisse sous la peau, ce qui l'aide à réguler sa température après la naissance.",
      en: "The start of the third trimester. Eyes can open and close, and baby is building up more fat under the skin, which helps with temperature regulation after birth.",
    },
    short: { fr: "Début 3e trimestre; yeux s'ouvrent, graisse s'accumule.", en: "3rd trimester begins; eyes open, fat builds up." },
  },
  {
    w: 32, icon: "coconutFruit",
    compare: { fr: "une noix de coco", en: "a coconut" },
    length: { fr: "≈ 42,4 cm", en: "≈ 16.7 in" }, weight: { fr: "≈ 1,7 kg", en: "≈ 3.7 lb" },
    desc: {
      fr: "Prise de poids rapide. Les os se durcissent, sauf ceux du crâne qui restent souples pour faciliter le passage à la naissance. Bébé bouge de plus en plus dans un espace restreint.",
      en: "Rapid weight gain. Bones are hardening, except the skull bones, which stay flexible to help with delivery. Baby moves more within an increasingly tight space.",
    },
    short: { fr: "Prise de poids rapide; os se durcissent.", en: "Rapid weight gain; bones hardening." },
  },
  {
    w: 36, icon: "lettuceLeaf",
    compare: { fr: "une laitue romaine", en: "a head of romaine lettuce" },
    length: { fr: "≈ 47,4 cm", en: "≈ 18.7 in" }, weight: { fr: "≈ 2,6 kg", en: "≈ 5.8 lb" },
    desc: {
      fr: "Les poumons approchent de leur pleine maturité. Bébé se positionne généralement la tête vers le bas, en prévision de la naissance, s'il ne l'a pas déjà fait.",
      en: "The lungs are nearing full maturity. Baby is usually settling into a head-down position in preparation for birth, if they haven't already.",
    },
    short: { fr: "Poumons presque matures; bébé se tourne tête en bas.", en: "Lungs nearly mature; baby turns head-down." },
  },
  {
    w: 40, icon: "watermelonFruit",
    compare: { fr: "une petite pastèque", en: "a small watermelon" },
    length: { fr: "≈ 51 cm", en: "≈ 20.1 in" }, weight: { fr: "≈ 3,4 kg", en: "≈ 7.5 lb" },
    desc: {
      fr: "Terme atteint. Bébé est prêt à naître, avec des organes pleinement fonctionnels et une bonne réserve de graisse pour réguler sa température dans les premiers jours de vie.",
      en: "Full term reached. Baby is ready to be born, with fully functional organs and a good fat reserve to help regulate their temperature in the first days of life.",
    },
    short: { fr: "Terme atteint; bébé prêt à naître.", en: "Full term; baby ready to be born." },
  },
];

const PREGNANCY = {
  t1: {
    title: { fr: "1er trimestre (semaines 1-13)", en: "1st trimester (weeks 1-13)", es: "1er trimestre (semanas 1-13)" },
    intro: {
      fr: "Le premier trimestre est celui de la formation : en 13 semaines, un amas de cellules devient un fœtus avec tous ses organes en place. C'est aussi souvent le plus exigeant physiquement et émotionnellement.",
      en: "The first trimester is when formation happens: in 13 weeks, a cluster of cells becomes a fetus with every organ in place. It's also often the most demanding physically and emotionally.",
      es: "El primer trimestre es el de la formación: en 13 semanas, un grupo de células se convierte en un feto con todos sus órganos en su lugar. También suele ser el más exigente física y emocionalmente.",
    },
    groups: [
      {
        title: { fr: "Symptômes du 1er trimestre", en: "1st trimester symptoms", es: "Síntomas del 1er trimestre" },
        color: COLORS.pink,
        illu: "gingerRootIllu",
        items: {
          fr: [
            "Fatigue intense, nausées (souvent appelées à tort « du matin », elles peuvent survenir à tout moment), seins sensibles et gonflés",
            "Aversions et fringales alimentaires, odorat plus sensible, goût métallique en bouche possible",
            "Sautes d'humeur fréquentes, liées aux bouleversements hormonaux rapides (œstrogène et progestérone en forte hausse)",
            "Mictions fréquentes dès le début, causées par l'utérus qui grossit et appuie sur la vessie",
          ],
          en: [
            "Intense fatigue, nausea (often mislabeled as only 'morning', it can strike any time of day), tender and swollen breasts",
            "Food aversions and cravings, heightened sense of smell, a possible metallic taste in the mouth",
            "Frequent mood swings, tied to rapid hormonal shifts (rising estrogen and progesterone)",
            "Frequent urination from early on, as the growing uterus presses on the bladder",
          ],
          es: [
            "Fatiga intensa, náuseas (a menudo mal llamadas « matutinas », pueden aparecer en cualquier momento), senos sensibles e hinchados",
            "Aversiones y antojos alimentarios, olfato más sensible, posible sabor metálico en la boca",
            "Cambios de humor frecuentes, ligados a los rápidos cambios hormonales (fuerte aumento de estrógeno y progesterona)",
            "Micción frecuente desde el inicio, causada por el útero que crece y presiona la vejiga",
          ],
        },
      },
      {
        title: { fr: "Développement du bébé", en: "Baby's development", es: "Desarrollo del bebé" },
        color: COLORS.blue,
        illu: "bellySmall",
        items: {
          fr: [
            "Premier rendez-vous prénatal généralement entre 8 et 10 semaines : confirmation de la grossesse, calcul de la date prévue, historique de santé complet",
            "Formation des organes principaux (organogenèse) entre les semaines 3 et 8 : c'est la période la plus sensible aux tératogènes (médicaments, alcool, certaines infections)",
            "Le risque de fausse couche diminue significativement après 12 semaines, une fois le cœur fœtal confirmé actif",
          ],
          en: [
            "First prenatal visit usually between weeks 8 and 10: pregnancy confirmation, due-date calculation, full health history",
            "Major organs form (organogenesis) between weeks 3 and 8: the most sensitive period for teratogens (medications, alcohol, certain infections)",
            "Miscarriage risk drops significantly after week 12, once fetal heart activity is confirmed",
          ],
          es: [
            "Primera cita prenatal generalmente entre las semanas 8 y 10: confirmación del embarazo, cálculo de la fecha probable de parto, historial de salud completo",
            "Formación de los órganos principales (organogénesis) entre las semanas 3 y 8: el período más sensible a los teratógenos (medicamentos, alcohol, ciertas infecciones)",
            "El riesgo de aborto espontáneo disminuye significativamente después de la semana 12, una vez confirmada la actividad cardíaca fetal",
          ],
        },
      },
    ],
  },
  t2: {
    title: { fr: "2e trimestre (semaines 14-27)", en: "2nd trimester (weeks 14-27)", es: "2º trimestre (semanas 14-27)" },
    intro: {
      fr: "Souvent surnommé la « lune de miel » de la grossesse : l'énergie revient, les nausées s'estompent, et le ventre commence à bien se voir.",
      en: "Often called pregnancy's 'honeymoon phase': energy returns, nausea eases, and the belly really starts to show.",
      es: "A menudo llamado la « luna de miel » del embarazo: la energía regresa, las náuseas disminuyen y el vientre empieza a notarse claramente.",
    },
    groups: [
      {
        title: { fr: "Le corps qui change", en: "The changing body", es: "El cuerpo que cambia" },
        color: COLORS.pink,
        illu: "bellyMedium",
        items: {
          fr: [
            "Souvent le trimestre le plus confortable : regain d'énergie, nausées qui s'estompent généralement vers 12-14 semaines",
            "Le corps change visiblement : ventre qui s'arrondit, centre de gravité qui se déplace, posture qui s'ajuste",
            "Apparition possible de vergetures, de la ligne brune (linea nigra) et du masque de grossesse (chloasma)",
            "Congestion nasale et saignements de gencives plus fréquents, liés à l'augmentation du volume sanguin",
            "Crampes aux jambes, surtout la nuit, souvent liées aux changements circulatoires",
          ],
          en: [
            "Often the most comfortable trimester: energy returns, nausea usually eases around weeks 12-14",
            "The body changes visibly: a rounding belly, a shifting center of gravity, adjusting posture",
            "Stretch marks, the linea nigra (dark line), and chloasma (pregnancy mask) may appear",
            "Nasal congestion and more frequent gum bleeding, linked to increased blood volume",
            "Leg cramps, especially at night, often related to circulation changes",
          ],
          es: [
            "A menudo el trimestre más cómodo: la energía regresa, las náuseas suelen disminuir hacia las semanas 12-14",
            "El cuerpo cambia visiblemente: el vientre se redondea, el centro de gravedad se desplaza, la postura se ajusta",
            "Pueden aparecer estrías, la línea alba oscura (linea nigra) y el paño del embarazo (cloasma)",
            "Congestión nasal y sangrado de encías más frecuentes, ligados al aumento del volumen sanguíneo",
            "Calambres en las piernas, sobre todo por la noche, a menudo relacionados con cambios circulatorios",
          ],
        },
      },
      {
        title: { fr: "Premiers mouvements & poids", en: "First movements & weight", es: "Primeros movimientos y peso" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Premiers mouvements du bébé (« quickening ») ressentis entre 16 et 22 semaines, plus tôt lors d'une 2e grossesse",
            "Prise de poids généralement plus régulière durant ce trimestre, environ 0,5 kg par semaine en moyenne",
            "Le lait de grossesse (colostrum) peut commencer à apparaître dans certains cas, sans être systématique",
          ],
          en: [
            "First fetal movements ('quickening') felt between weeks 16 and 22, often earlier in a second pregnancy",
            "Weight gain is usually steadier this trimester, about 0.5 kg (1 lb) per week on average",
            "Colostrum (pregnancy milk) may start to appear in some cases, though not for everyone",
          ],
          es: [
            "Primeros movimientos del bebé (« quickening ») sentidos entre las semanas 16 y 22, a menudo antes en un segundo embarazo",
            "El aumento de peso suele ser más constante durante este trimestre, en promedio unos 0,5 kg por semana",
            "El calostro (leche del embarazo) puede empezar a aparecer en algunos casos, aunque no en todas las personas",
          ],
        },
      },
      {
        title: { fr: "Bien se préparer", en: "Getting ready", es: "Prepararse bien" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: ["Bonne période pour les cours prénataux, la planification de la chambre du bébé et les discussions sur le plan de naissance"],
          en: ["A good time for prenatal classes, nursery planning, and birth-plan discussions"],
          es: ["Buen momento para las clases prenatales, planificar la habitación del bebé y hablar sobre el plan de parto"],
        },
      },
    ],
  },
  t3: {
    title: { fr: "3e trimestre (semaines 28-40)", en: "3rd trimester (weeks 28-40)", es: "3er trimestre (semanas 28-40)" },
    intro: {
      fr: "La dernière ligne droite : bébé prend rapidement du poids, le corps se prépare activement à l'accouchement, et le suivi médical s'intensifie.",
      en: "The final stretch: baby gains weight quickly, the body actively prepares for labor, and medical follow-up becomes more frequent.",
      es: "La recta final: el bebé aumenta de peso rápidamente, el cuerpo se prepara activamente para el parto y el seguimiento médico se intensifica.",
    },
    groups: [
      {
        title: { fr: "Le corps se prépare", en: "The body gets ready", es: "El cuerpo se prepara" },
        color: COLORS.pink,
        illu: "bellyLarge",
        items: {
          fr: [
            "Rendez-vous prénataux plus fréquents : aux 2 à 3 semaines jusqu'à 36 semaines, puis chaque semaine jusqu'à l'accouchement",
            "Contractions de Braxton Hicks (fausses contractions) possibles dès 28 semaines : irrégulières et généralement non douloureuses",
            "Essoufflement, brûlures d'estomac et difficulté à dormir fréquents à mesure que l'utérus prend de la place",
            "Bébé descend dans le bassin (allègement) souvent dans les 2 à 4 semaines précédant l'accouchement chez une 1re grossesse",
          ],
          en: [
            "Prenatal visits become more frequent: every 2-3 weeks until week 36, then weekly until delivery",
            "Braxton Hicks (practice) contractions may start around week 28: irregular and usually painless",
            "Shortness of breath, heartburn, and trouble sleeping become common as the uterus takes up more room",
            "Baby drops into the pelvis (lightening), often 2-4 weeks before delivery in a first pregnancy",
          ],
          es: [
            "Las citas prenatales se vuelven más frecuentes: cada 2-3 semanas hasta la semana 36, luego cada semana hasta el parto",
            "Pueden comenzar las contracciones de Braxton Hicks (falsas contracciones) alrededor de la semana 28: irregulares y generalmente indoloras",
            "Falta de aire, acidez estomacal y dificultad para dormir se vuelven comunes a medida que el útero ocupa más espacio",
            "El bebé desciende hacia la pelvis (aligeramiento), a menudo 2-4 semanas antes del parto en un primer embarazo",
          ],
        },
      },
      {
        title: { fr: "Se préparer à l'accouchement", en: "Getting ready for birth", es: "Prepararse para el parto" },
        color: COLORS.ochre,
        illu: "hospitalBag",
        items: {
          fr: [
            "Préparer la trousse de naissance et le plan de transport vers l'hôpital ou la maison de naissance dès 36 semaines",
            "Discuter du plan de naissance avec l'équipe soignante : préférences pour la gestion de la douleur, positions, présence du partenaire",
            "Reconnaître les signes du travail : contractions régulières et de plus en plus rapprochées, perte du bouchon muqueux, rupture des membranes (perte des eaux)",
            "Bébé est considéré à terme entre 37 et 42 semaines; « à terme précoce » 37-38 sem., « à terme complet » 39-40 sem., « terme tardif » 41 sem., « post-terme » 42 sem. et plus",
          ],
          en: [
            "Pack the hospital or birth-center bag and plan transportation starting around week 36",
            "Discuss the birth plan with your care team: pain-management preferences, positions, having your partner present",
            "Recognize the signs of labor: contractions that are regular and getting closer together, losing the mucus plug, water breaking",
            "Baby is considered full term between weeks 37 and 42; 'early term' 37-38 wks, 'full term' 39-40 wks, 'late term' 41 wks, 'post-term' 42+ wks",
          ],
          es: [
            "Preparar la maleta para el hospital o casa de parto y planear el transporte a partir de la semana 36",
            "Hablar del plan de parto con el equipo de salud: preferencias para el manejo del dolor, posiciones, presencia de la pareja",
            "Reconocer las señales de trabajo de parto: contracciones regulares y cada vez más seguidas, pérdida del tapón mucoso, ruptura de membranas (rotura de fuente)",
            "El bebé se considera a término entre las semanas 37 y 42; « término temprano » 37-38 sem., « término completo » 39-40 sem., « término tardío » 41 sem., « postérmino » 42 sem. o más",
          ],
        },
      },
      {
        title: { fr: "Signes à surveiller", en: "Signs to watch for", es: "Señales a vigilar" },
        color: COLORS.teal,
        illu: "emergency",
        items: {
          fr: [
            "Surveiller les mouvements du bébé quotidiennement; consulter si diminution marquée des mouvements perçus",
            "Signes nécessitant une consultation rapide : maux de tête sévères, vision trouble, gonflement soudain du visage/mains, douleur abdominale intense",
          ],
          en: [
            "Track baby's movements daily; see a provider for a marked decrease in movement",
            "Signs needing urgent attention: severe headaches, blurred vision, sudden swelling of face/hands, intense abdominal pain",
          ],
          es: [
            "Vigilar los movimientos del bebé a diario; consultar si hay una disminución marcada de los movimientos percibidos",
            "Señales que requieren consulta rápida: dolores de cabeza intensos, visión borrosa, hinchazón repentina de cara/manos, dolor abdominal intenso",
          ],
        },
      },
    ],
  },
  alimentation: {
    title: { fr: "Alimentation durant la grossesse", en: "Nutrition during pregnancy", es: "Alimentación durante el embarazo" },
    illu: "alimentation",
    intro: {
      fr: "Manger « pour deux » est un mythe : les besoins caloriques augmentent peu, mais les besoins en certains nutriments spécifiques augmentent, eux, de façon importante.",
      en: "Eating 'for two' is a myth: calorie needs increase only slightly, but the need for certain specific nutrients rises significantly.",
      es: "Comer « por dos » es un mito: las necesidades calóricas aumentan poco, pero las necesidades de ciertos nutrientes específicos sí aumentan de forma importante.",
    },
    groups: [
      {
        title: { fr: "Besoins accrus", en: "Increased needs", es: "Necesidades aumentadas" },
        color: COLORS.ochre,
        illu: "foodPlate",
        items: {
          fr: [
            "Besoins caloriques : environ +0 kcal au 1er trimestre, +340 kcal/jour au 2e, +450 kcal/jour au 3e — bien loin du mythe de « manger pour deux »",
            "Acide folique : essentiel dès la préconception et tout au long du 1er trimestre pour prévenir les anomalies du tube neural",
            "Fer : les besoins doublent presque, pour soutenir l'augmentation du volume sanguin; les légumineuses, la viande rouge et les légumes verts en sont de bonnes sources",
            "Calcium et vitamine D : essentiels au développement du squelette du bébé; produits laitiers, boissons enrichies, poissons gras",
            "Oméga-3 (DHA) : soutient le développement du cerveau et des yeux du bébé; poissons gras faibles en mercure (saumon, sardines) ou supplément au besoin",
          ],
          en: [
            "Calorie needs: about +0 kcal in the 1st trimester, +340 kcal/day in the 2nd, +450 kcal/day in the 3rd — far from the 'eating for two' myth",
            "Folic acid: essential from preconception through the 1st trimester to help prevent neural tube defects",
            "Iron: needs nearly double, to support the rise in blood volume; legumes, red meat, and leafy greens are good sources",
            "Calcium and vitamin D: essential for baby's skeletal development; dairy, fortified drinks, fatty fish",
            "Omega-3 (DHA): supports baby's brain and eye development; low-mercury fatty fish (salmon, sardines) or a supplement if needed",
          ],
          es: [
            "Necesidades calóricas: aproximadamente +0 kcal en el 1er trimestre, +340 kcal/día en el 2º, +450 kcal/día en el 3º — muy lejos del mito de « comer por dos »",
            "Ácido fólico: esencial desde la preconcepción y durante todo el 1er trimestre para ayudar a prevenir defectos del tubo neural",
            "Hierro: las necesidades casi se duplican, para sostener el aumento del volumen sanguíneo; las legumbres, la carne roja y los vegetales de hoja verde son buenas fuentes",
            "Calcio y vitamina D: esenciales para el desarrollo del esqueleto del bebé; lácteos, bebidas fortificadas, pescados grasos",
            "Omega-3 (DHA): apoya el desarrollo del cerebro y los ojos del bebé; pescados grasos bajos en mercurio (salmón, sardinas) o un suplemento si es necesario",
          ],
        },
      },
      {
        title: { fr: "Hydratation & prise de poids", en: "Hydration & weight gain", es: "Hidratación y aumento de peso" },
        color: COLORS.blue,
        illu: "hydration",
        items: {
          fr: [
            "Boire environ 2 à 2,5 litres de liquide par jour (eau principalement), un peu plus si l'activité physique ou la chaleur sont importantes",
            "La prise de poids recommandée varie selon l'IMC de départ : plus élevée pour un IMC bas, plus modérée pour un IMC élevé — en discuter avec son professionnel de la santé",
            "Un supplément prénatal quotidien (avec acide folique, fer, vitamine D) est généralement recommandé en complément d'une alimentation variée, pas à sa place",
          ],
          en: [
            "Drink about 2 to 2.5 liters of fluid a day (mainly water), a bit more with significant physical activity or heat",
            "Recommended weight gain varies based on starting BMI: higher for a lower BMI, more moderate for a higher BMI — discuss with your provider",
            "A daily prenatal supplement (with folic acid, iron, vitamin D) is generally recommended alongside a varied diet, not instead of it",
          ],
          es: [
            "Beber entre 2 y 2,5 litros de líquido al día (principalmente agua), un poco más si hay mucha actividad física o calor",
            "El aumento de peso recomendado varía según el IMC inicial: mayor para un IMC bajo, más moderado para un IMC alto — hablarlo con tu profesional de la salud",
            "Se recomienda generalmente un suplemento prenatal diario (con ácido fólico, hierro, vitamina D) como complemento de una alimentación variada, no en su lugar",
          ],
        },
      },
    ],
  },
  symptomes: {
    title: { fr: "Symptômes courants", en: "Common symptoms", es: "Síntomas comunes" },
    illu: "grossesse",
    intro: {
      fr: "La plupart des inconforts de grossesse sont normaux et gérables. Voici les plus fréquents, avec des pistes concrètes pour les soulager.",
      en: "Most pregnancy discomforts are normal and manageable. Here are the most common ones, with concrete ways to ease them.",
      es: "La mayoría de las molestias del embarazo son normales y manejables. Aquí están las más frecuentes, con formas concretas de aliviarlas.",
    },
    groups: [
      {
        title: { fr: "Digestion", en: "Digestion", es: "Digestión" },
        color: COLORS.ochre,
        illu: "gingerRootIllu",
        items: {
          fr: [
            "Nausées et vomissements : privilégier de petits repas fréquents, gingembre, biscuits secs au réveil, éviter le ventre vide",
            "Brûlures d'estomac : éviter les repas copieux et épicés le soir, surélever la tête du lit, manger lentement",
            "Constipation : hydratation accrue, fibres alimentaires, activité physique douce",
          ],
          en: [
            "Nausea and vomiting: small frequent meals, ginger, dry crackers upon waking, avoid an empty stomach",
            "Heartburn: avoid heavy, spicy evening meals, raise the head of the bed, eat slowly",
            "Constipation: more fluids, dietary fiber, gentle activity",
          ],
          es: [
            "Náuseas y vómitos: preferir comidas pequeñas y frecuentes, jengibre, galletas secas al despertar, evitar el estómago vacío",
            "Acidez estomacal: evitar comidas abundantes y picantes en la noche, elevar la cabecera de la cama, comer despacio",
            "Estreñimiento: mayor hidratación, fibra alimentaria, actividad física suave",
          ],
        },
      },
      {
        title: { fr: "Circulation & jambes", en: "Circulation & legs", es: "Circulación y piernas" },
        color: COLORS.blue,
        illu: "legCareIllu",
        items: {
          fr: [
            "Œdème des jambes et des pieds : surélever les pieds, bouger régulièrement, éviter les stations debout prolongées, bas de compression",
            "Varices : bas de contention, élever les jambes, éviter de croiser les jambes en position assise",
            "Étourdissements : se lever lentement, éviter les longues stations debout, bien s'hydrater",
          ],
          en: [
            "Leg and foot swelling: elevate feet, move regularly, avoid long periods standing, compression stockings",
            "Varicose veins: compression stockings, elevate legs, avoid crossing legs while sitting",
            "Dizziness: rise slowly, avoid long periods standing, stay well hydrated",
          ],
          es: [
            "Hinchazón de piernas y pies: elevar los pies, moverse con regularidad, evitar estar de pie por mucho tiempo, medias de compresión",
            "Várices: medias de compresión, elevar las piernas, evitar cruzar las piernas al estar sentada",
            "Mareos: levantarse despacio, evitar estar de pie por mucho tiempo, mantenerse bien hidratada",
          ],
        },
      },
      {
        title: { fr: "Confort & sommeil", en: "Comfort & sleep", es: "Comodidad y sueño" },
        color: COLORS.sage,
        illu: "stretchFigureIllu",
        items: {
          fr: [
            "Maux de dos : bonne posture, chaussures adaptées, étirements doux, ceinture de soutien abdominal au besoin",
            "Insomnie et difficulté à trouver une position confortable : coussin de grossesse, routine de sommeil régulière, dormir sur le côté gauche à partir du 2e trimestre",
            "Syndrome du canal carpien (engourdissement des mains) : lié à la rétention d'eau, souvent temporaire",
          ],
          en: [
            "Back pain: good posture, supportive shoes, gentle stretching, a maternity support belt if needed",
            "Insomnia and trouble finding a comfortable position: pregnancy pillow, a steady sleep routine, sleeping on the left side from the 2nd trimester on",
            "Carpal tunnel syndrome (hand numbness): linked to fluid retention, usually temporary",
          ],
          es: [
            "Dolor de espalda: buena postura, calzado adecuado, estiramientos suaves, faja de soporte abdominal si es necesario",
            "Insomnio y dificultad para encontrar una posición cómoda: almohada de embarazo, rutina de sueño regular, dormir del lado izquierdo desde el 2º trimestre",
            "Síndrome del túnel carpiano (entumecimiento de las manos): ligado a la retención de líquidos, generalmente temporal",
          ],
        },
      },
      {
        title: { fr: "Autres inconforts", en: "Other discomforts", es: "Otras molestias" },
        color: COLORS.pink,
        illu: "bathtubIllu",
        items: {
          fr: [
            "Hémorroïdes : éviter la constipation, bains de siège tièdes, éviter de rester assise trop longtemps",
            "Contractions de Braxton Hicks : normales si peu fréquentes et non douloureuses; consulter si régulières et rapprochées avant 37 semaines",
          ],
          en: [
            "Hemorrhoids: avoid constipation, warm sitz baths, avoid sitting too long",
            "Braxton Hicks contractions: normal if infrequent and painless; see a provider if regular and close together before 37 weeks",
          ],
          es: [
            "Hemorroides: evitar el estreñimiento, baños de asiento tibios, evitar permanecer sentada demasiado tiempo",
            "Contracciones de Braxton Hicks: normales si son poco frecuentes e indoloras; consultar si son regulares y seguidas antes de la semana 37",
          ],
        },
      },
    ],
  },
  suivis: {
    title: { fr: "Examens & suivis", en: "Check-ups & tests", es: "Exámenes y seguimiento" },
    illu: "grossesse",
    intro: {
      fr: "Le suivi prénatal ponctue toute la grossesse d'examens réguliers pour surveiller la santé de la mère et du bébé et dépister rapidement toute complication.",
      en: "Prenatal follow-up punctuates the whole pregnancy with regular checks to monitor the health of mother and baby and catch any complication early.",
      es: "El seguimiento prenatal marca todo el embarazo con exámenes regulares para vigilar la salud de la madre y el bebé, y detectar rápidamente cualquier complicación.",
    },
    groups: [
      {
        title: { fr: "Analyses & dépistages", en: "Bloodwork & screening", es: "Análisis y pruebas de detección" },
        color: COLORS.blue,
        illu: "docIcon",
        items: {
          fr: [
            "Prise de sang initiale : groupe sanguin et facteur Rh, formule sanguine complète (anémie), immunité (rubéole, varicelle), dépistage d'infections",
            "Dépistage prénatal (1er ou 2e trimestre) : évalue le risque de trisomie 21, 18 et d'anomalies du tube neural; le test génétique non invasif (ADNlf) est une option plus précise",
            "Test de dépistage du diabète de grossesse (24-28 sem.) : test de tolérance au glucose d'une ou deux étapes selon la région",
            "Dépistage du streptocoque B (35-37 sem.) : culture vaginale et rectale",
          ],
          en: [
            "Initial bloodwork: blood type and Rh factor, complete blood count (anemia), immunity (rubella, chickenpox), infection screening",
            "Prenatal screening (1st or 2nd trimester): estimates risk of trisomy 21, 18, and neural tube defects; non-invasive prenatal testing (NIPT) is a more precise option",
            "Gestational diabetes screening (weeks 24-28): one- or two-step glucose tolerance test depending on the region",
            "Group B strep screening (weeks 35-37): vaginal and rectal swab",
          ],
          es: [
            "Análisis de sangre inicial: grupo sanguíneo y factor Rh, hemograma completo (anemia), inmunidad (rubéola, varicela), detección de infecciones",
            "Cribado prenatal (1er o 2º trimestre): evalúa el riesgo de trisomía 21, 18 y defectos del tubo neural; la prueba genética no invasiva (ADNlf) es una opción más precisa",
            "Prueba de detección de diabetes gestacional (semanas 24-28): prueba de tolerancia a la glucosa de una o dos etapas según la región",
            "Detección de estreptococo del grupo B (semanas 35-37): cultivo vaginal y rectal",
          ],
        },
      },
      {
        title: { fr: "Échographies & suivi de routine", en: "Ultrasounds & routine checks", es: "Ecografías y seguimiento de rutina" },
        color: COLORS.pink,
        illu: "grossesse",
        items: {
          fr: [
            "Échographies : datation (vers 8-12 sem.), morphologique détaillée (vers 20 sem.), échographies de croissance additionnelles au besoin",
            "Surveillance de la tension artérielle et des protéines urinaires à chaque visite, pour dépister la prééclampsie",
            "Mesure de la hauteur utérine à chaque visite dès le 2e trimestre, pour suivre la croissance du bébé",
            "Écoute du cœur fœtal à chaque visite à partir d'environ 10-12 semaines (doppler portatif)",
          ],
          en: [
            "Ultrasounds: dating (around weeks 8-12), detailed anatomy scan (around week 20), extra growth scans as needed",
            "Blood pressure and urine protein checked at every visit, to screen for preeclampsia",
            "Fundal height measured at every visit from the 2nd trimester on, to track baby's growth",
            "Fetal heart rate checked at every visit from about weeks 10-12 (handheld doppler)",
          ],
          es: [
            "Ecografías: de datación (hacia las semanas 8-12), morfológica detallada (hacia la semana 20), ecografías de crecimiento adicionales si es necesario",
            "Control de la presión arterial y proteínas en orina en cada visita, para detectar preeclampsia",
            "Medición de la altura uterina en cada visita desde el 2º trimestre, para seguir el crecimiento del bebé",
            "Auscultación del corazón fetal en cada visita a partir de las semanas 10-12 (doppler portátil)",
          ],
        },
      },
      {
        title: { fr: "Vaccins & Rh", en: "Vaccines & Rh", es: "Vacunas y Rh" },
        color: COLORS.ochre,
        illu: "vaccine",
        items: {
          fr: [
            "Vaccin contre la coqueluche (dcaT) recommandé entre 27 et 32 semaines à chaque grossesse",
            "Vaccin contre la grippe recommandé à tout moment de la grossesse durant la saison grippale",
            "Discuter des injections d'immunoglobuline Rh si la mère est Rh négatif, généralement vers 28 semaines",
          ],
          en: [
            "Tdap (whooping cough) vaccine recommended between weeks 27 and 32 in every pregnancy",
            "Flu vaccine recommended at any point during pregnancy during flu season",
            "Rh immunoglobulin injections discussed if the mother is Rh negative, usually around week 28",
          ],
          es: [
            "Vacuna contra la tos ferina (Tdap) recomendada entre las semanas 27 y 32 en cada embarazo",
            "Vacuna contra la gripe recomendada en cualquier momento del embarazo durante la temporada de gripe",
            "Se conversa sobre las inyecciones de inmunoglobulina Rh si la madre es Rh negativo, generalmente hacia la semana 28",
          ],
        },
      },
    ],
  },
  trousse: {
    title: { fr: "Sac pour l'hôpital", en: "Hospital bag", es: "Maleta para el hospital" },
    illu: "hospitalBag",
    intro: {
      fr: "Préparer son sac dès 36 semaines évite le stress de dernière minute. Un sac pour maman, un sac pour bébé — voici tout ce qu'il faut y mettre.",
      en: "Packing your bag by week 36 avoids last-minute stress. One bag for mom, one for baby — here's everything to pack.",
      es: "Preparar la maleta desde la semana 36 evita el estrés de último momento. Una maleta para mamá, una para el bebé — aquí está todo lo que hay que llevar.",
    },
  },
  jumeaux: {
    title: { fr: "Grossesse gémellaire (jumeaux)", en: "Twin pregnancy", es: "Embarazo gemelar (mellizos)" },
    illu: "twinsIcon",
    intro: {
      fr: "Une grossesse gémellaire ne se déroule pas tout à fait comme une grossesse simple : elle comporte ses propres mécanismes biologiques, un suivi médical plus rapproché, et quelques particularités à connaître.",
      en: "A twin pregnancy doesn't unfold quite like a singleton pregnancy: it has its own biological mechanisms, closer medical follow-up, and a few things worth knowing.",
      es: "Un embarazo gemelar no se desarrolla exactamente como un embarazo único: tiene sus propios mecanismos biológicos, un seguimiento médico más cercano, y algunas particularidades que vale la pena conocer.",
    },
    groups: [
      {
        title: { fr: "Faux jumeaux vs vrais jumeaux", en: "Fraternal vs identical twins", es: "Mellizos vs gemelos idénticos" },
        color: COLORS.pink,
        illu: "twinsIcon",
        items: {
          fr: [
            "Faux jumeaux (dizygotes, environ 2/3 des grossesses gémellaires) : deux ovules libérés au même cycle sont fécondés chacun par un spermatozoïde différent — deux grossesses distinctes qui se développent en même temps, chacune avec son propre placenta",
            "Vrais jumeaux (monozygotes, environ 1/3 des cas) : un seul ovule fécondé se divise en deux embryons génétiquement identiques peu après la conception — même bagage génétique, toujours du même sexe",
            "La division peut survenir à différents moments après la fécondation, ce qui détermine si les jumeaux identiques partagent ou non le même placenta et la même poche amniotique",
            "Génétique : la tendance aux faux jumeaux (hyperovulation) peut être héréditaire, surtout du côté maternel — les vrais jumeaux résultent d'un événement aléatoire, généralement non héréditaire",
            "Différences physiques : les faux jumeaux se ressemblent comme des frères et sœurs ordinaires et peuvent être de sexes différents; les vrais jumeaux se ressemblent fortement et sont toujours du même sexe",
          ],
          en: [
            "Fraternal (dizygotic) twins, about 2/3 of twin pregnancies: two eggs released in the same cycle are each fertilized by a different sperm — two distinct pregnancies developing at once, each with its own placenta",
            "Identical (monozygotic) twins, about 1/3 of cases: a single fertilized egg splits into two genetically identical embryos shortly after conception — same genetic makeup, always the same sex",
            "The split can happen at different points after fertilization, which determines whether identical twins share a placenta and amniotic sac or not",
            "Genetics: a tendency toward fraternal twins (hyperovulation) can run in families, especially on the mother's side — identical twins result from a random event and generally aren't hereditary",
            "Physical differences: fraternal twins look like typical siblings and can be different sexes; identical twins look very much alike and are always the same sex",
          ],
          es: [
            "Mellizos (dicigóticos, cerca de 2/3 de los embarazos gemelares): dos óvulos liberados en el mismo ciclo son fecundados cada uno por un espermatozoide diferente — dos embarazos distintos que se desarrollan al mismo tiempo, cada uno con su propia placenta",
            "Gemelos idénticos (monocigóticos, cerca de 1/3 de los casos): un solo óvulo fecundado se divide en dos embriones genéticamente idénticos poco después de la concepción — mismo material genético, siempre del mismo sexo",
            "La división puede ocurrir en distintos momentos después de la fecundación, lo que determina si los gemelos idénticos comparten o no la misma placenta y bolsa amniótica",
            "Genética: la tendencia a tener mellizos (hiperovulación) puede ser hereditaria, sobre todo por el lado materno — los gemelos idénticos resultan de un evento aleatorio, generalmente no hereditario",
            "Diferencias físicas: los mellizos se parecen como hermanos comunes y pueden ser de sexos diferentes; los gemelos idénticos se parecen mucho entre sí y siempre son del mismo sexo",
          ],
        },
      },
      {
        title: { fr: "Suivi médical & risques", en: "Medical follow-up & risks", es: "Seguimiento médico y riesgos" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Chorionicité et amnionicité : les grossesses bichoriales-biamniotiques (chacun son placenta et sa poche) sont les moins à risque; les monochoriales (placenta partagé) demandent une surveillance plus étroite",
            "Suivi médical plus fréquent : échographies plus rapprochées pour suivre la croissance de chaque bébé, souvent une référence en médecine fœto-maternelle",
            "Risques à surveiller de plus près : accouchement prématuré (âge gestationnel moyen ≈ 36 semaines), diabète de grossesse, prééclampsie, retard de croissance",
          ],
          en: [
            "Chorionicity and amnionicity: dichorionic-diamniotic pregnancies (each twin with their own placenta and sac) carry the lowest risk; monochorionic pregnancies (shared placenta) need closer monitoring",
            "More frequent medical follow-up: closer-spaced ultrasounds to track each baby's growth, often a referral to maternal-fetal medicine",
            "Risks to watch more closely: preterm birth (average gestational age ≈ 36 weeks), gestational diabetes, preeclampsia, growth restriction",
          ],
          es: [
            "Corionicidad y amnionicidad: los embarazos bicoriales-biamnióticos (cada bebé con su propia placenta y bolsa) son los de menor riesgo; los monocoriales (placenta compartida) requieren una vigilancia más estrecha",
            "Seguimiento médico más frecuente: ecografías más seguidas para vigilar el crecimiento de cada bebé, a menudo con referencia a medicina materno-fetal",
            "Riesgos a vigilar más de cerca: parto prematuro (edad gestacional promedio ≈ 36 semanas), diabetes gestacional, preeclampsia, restricción del crecimiento",
          ],
        },
      },
      {
        title: { fr: "Besoins & facteurs", en: "Needs & factors", es: "Necesidades y factores" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Besoins nutritionnels accrus : apport calorique plus élevé, suppléments de fer et d'acide folique souvent ajustés, prise de poids généralement plus importante",
            "Facteurs associés à une probabilité plus élevée de jumeaux : antécédents familiaux, âge maternel plus avancé (35+), traitements de fertilité, origine ethnique, IMC ou taille plus élevés",
            "Chaque grossesse gémellaire est unique; discuter du plan de suivi personnalisé avec son équipe soignante dès la confirmation de jumeaux est essentiel",
          ],
          en: [
            "Higher nutritional needs: increased calorie intake, iron and folic acid supplements are often adjusted, and weight gain is generally higher",
            "Factors associated with a higher chance of twins: family history, older maternal age (35+), fertility treatments, ethnicity, higher BMI or height",
            "Every twin pregnancy is unique; discussing a personalized care plan with your care team as soon as twins are confirmed is essential",
          ],
          es: [
            "Mayores necesidades nutricionales: mayor ingesta calórica, los suplementos de hierro y ácido fólico suelen ajustarse, y el aumento de peso generalmente es mayor",
            "Factores asociados a una mayor probabilidad de mellizos: antecedentes familiares, edad materna más avanzada (35+), tratamientos de fertilidad, origen étnico, IMC o estatura más altos",
            "Cada embarazo gemelar es único; es esencial hablar de un plan de seguimiento personalizado con tu equipo de salud tan pronto se confirmen los gemelos",
          ],
        },
      },
    ],
  },
  grossesse35plus: {
    title: { fr: "Grossesse après 35 ans", en: "Pregnancy after 35", es: "Embarazo después de los 35 años" },
    illu: "heartCareIllu",
    intro: {
      fr: "L'âge de 35 ans est un seuil clinique historique (parfois appelé « grossesse gériatrique »), mais les protocoles ont évolué : depuis 2026, une femme de 35 ans en bonne santé n'est plus automatiquement étiquetée « grossesse à risque » — le suivi est individualisé selon votre histoire médicale, et non seulement votre âge.",
      en: "Age 35 is a historical clinical threshold (sometimes called \"geriatric pregnancy\"), but protocols have evolved: as of 2026, a healthy 35-year-old is no longer automatically labeled \"high-risk\" — care is individualized based on your medical history, not age alone.",
      es: "Los 35 años son un umbral clínico histórico (a veces llamado « embarazo geriátrico »), pero los protocolos han evolucionado: desde 2026, una mujer sana de 35 años ya no se etiqueta automáticamente como « embarazo de alto riesgo » — el seguimiento se individualiza según tu historial médico, no solo tu edad.",
    },
    groups: [
      {
        title: { fr: "Ce qui change vraiment avec l'âge", en: "What actually changes with age", es: "Lo que realmente cambia con la edad" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Les complications réellement liées à l'âge (comme la prééclampsie) augmentent surtout à partir de 40 ans, pas de façon marquée à 35 ans",
            "Le risque de fausse couche, de grossesse multiple et de diabète de grossesse augmente progressivement avec l'âge maternel — d'où un dépistage du diabète gestationnel proposé systématiquement dès 35 ans",
            "Le taux de césarienne est plus élevé, mais un accouchement vaginal reste tout à fait possible et fréquent",
            "Le taux de fécondité par cycle diminue avec l'âge, mais la grande majorité des grossesses après 35 ans se déroulent bien et donnent naissance à des bébés en bonne santé",
          ],
          en: [
            "Complications truly linked to age (like preeclampsia) mainly increase from age 40 onward, not sharply at 35",
            "The risk of miscarriage, multiple pregnancy, and gestational diabetes rises gradually with maternal age — which is why gestational diabetes screening is routinely offered from age 35",
            "C-section rates are higher, but vaginal birth remains entirely possible and common",
            "Fertility per cycle declines with age, but the large majority of pregnancies after 35 go well and result in healthy babies",
          ],
          es: [
            "Las complicaciones realmente ligadas a la edad (como la preeclampsia) aumentan sobre todo a partir de los 40 años, no de forma marcada a los 35",
            "El riesgo de aborto espontáneo, embarazo múltiple y diabetes gestacional aumenta gradualmente con la edad materna — por eso se ofrece sistemáticamente la prueba de diabetes gestacional desde los 35 años",
            "La tasa de cesáreas es más alta, pero el parto vaginal sigue siendo totalmente posible y frecuente",
            "La tasa de fecundidad por ciclo disminuye con la edad, pero la gran mayoría de los embarazos después de los 35 años transcurren bien y dan lugar a bebés sanos",
          ],
        },
      },
      {
        title: { fr: "Suivi et dépistage", en: "Follow-up and screening", es: "Seguimiento y detección" },
        color: COLORS.sage,
        illu: "stretchFigureIllu",
        items: {
          fr: [
            "Une consultation préconceptionnelle est recommandée pour faire le point sur les antécédents, les traitements en cours et débuter l'acide folique au moins 3 mois avant la conception",
            "Le dépistage prénatal non invasif (DPNI/ADNlf), sans risque pour la grossesse, occupe une place centrale et évite le recours à des tests invasifs (amniocentèse) dans la grande majorité des cas",
            "Un bilan complet en début de grossesse (tension, glycémie, thyroïde) permet d'établir un point de départ personnalisé",
            "Un suivi rapproché n'est proposé qu'en présence d'un facteur associé (hypertension, diabète, antécédents obstétricaux, surpoids important) — pas automatiquement pour l'âge seul",
            "Une vigilance renforcée pour la prééclampsie est surtout de mise à partir de 40 ans",
          ],
          en: [
            "A preconception visit is recommended to review your history, current medications, and start folic acid at least 3 months before conceiving",
            "Non-invasive prenatal testing (NIPT), which carries no risk to the pregnancy, plays a central role and avoids invasive tests (amniocentesis) in the large majority of cases",
            "A full check-up early in pregnancy (blood pressure, blood sugar, thyroid) establishes a personalized starting point",
            "Closer follow-up is only offered when an associated factor is present (high blood pressure, diabetes, obstetric history, significant overweight) — not automatically for age alone",
            "Heightened vigilance for preeclampsia mainly applies from age 40 onward",
          ],
          es: [
            "Se recomienda una consulta preconcepcional para revisar antecedentes, medicamentos actuales y comenzar el ácido fólico al menos 3 meses antes de intentar concebir",
            "La prueba prenatal no invasiva (NIPT/ADNlf), sin riesgo para el embarazo, ocupa un lugar central y evita recurrir a pruebas invasivas (amniocentesis) en la gran mayoría de los casos",
            "Una evaluación completa al inicio del embarazo (presión, glucosa, tiroides) permite establecer un punto de partida personalizado",
            "Un seguimiento más cercano solo se ofrece si hay un factor asociado (hipertensión, diabetes, antecedentes obstétricos, sobrepeso importante) — no automáticamente solo por la edad",
            "Una vigilancia reforzada para la preeclampsia aplica sobre todo a partir de los 40 años",
          ],
        },
      },
    ],
  },
  grossesseRisque: {
    title: { fr: "Grossesse à risque", en: "High-risk pregnancy", es: "Embarazo de alto riesgo" },
    illu: "emergency",
    intro: {
      fr: "« Grossesse à risque » ne veut pas dire que quelque chose va mal se passer — ça signifie qu'un ou plusieurs facteurs demandent une surveillance plus étroite. La grande majorité de ces grossesses se déroulent bien, avec un suivi adapté.",
      en: "\"High-risk pregnancy\" doesn't mean something will go wrong — it means one or more factors call for closer monitoring. The large majority of these pregnancies go well with the right follow-up.",
      es: "« Embarazo de alto riesgo » no significa que algo va a salir mal — significa que uno o varios factores requieren una vigilancia más estrecha. La gran mayoría de estos embarazos transcurren bien con un seguimiento adecuado.",
    },
    groups: [
      {
        title: { fr: "Facteurs qui peuvent mener à ce suivi", en: "Factors that can lead to this follow-up", es: "Factores que pueden llevar a este seguimiento" },
        color: COLORS.ochre,
        illu: "checklistIllu",
        items: {
          fr: [
            "Conditions de santé préexistantes : hypertension, diabète, maladie auto-immune, problèmes de thyroïde ou cardiaques",
            "Complications propres à la grossesse en cours : diabète gestationnel, hypertension gestationnelle ou prééclampsie, placenta prævia, retard de croissance intra-utérin",
            "Antécédents obstétricaux : fausse couche à répétition, accouchement prématuré antérieur, césarienne antérieure, complications lors d'une grossesse précédente",
            "Grossesse multiple (jumeaux ou plus) — voir la section dédiée aux jumeaux",
            "Autres facteurs : IMC très élevé ou très faible, tabagisme, âge maternel avancé combiné à d'autres facteurs",
          ],
          en: [
            "Pre-existing health conditions: high blood pressure, diabetes, autoimmune disease, thyroid or heart issues",
            "Complications specific to the current pregnancy: gestational diabetes, gestational hypertension or preeclampsia, placenta previa, intrauterine growth restriction",
            "Obstetric history: recurrent miscarriage, prior preterm birth, prior C-section, complications in a previous pregnancy",
            "Multiple pregnancy (twins or more) — see the dedicated twins section",
            "Other factors: very high or very low BMI, smoking, advanced maternal age combined with other factors",
          ],
          es: [
            "Condiciones de salud preexistentes: hipertensión, diabetes, enfermedad autoinmune, problemas de tiroides o cardíacos",
            "Complicaciones propias del embarazo actual: diabetes gestacional, hipertensión gestacional o preeclampsia, placenta previa, restricción del crecimiento intrauterino",
            "Antecedentes obstétricos: aborto espontáneo recurrente, parto prematuro anterior, cesárea anterior, complicaciones en un embarazo previo",
            "Embarazo múltiple (mellizos o más) — ver la sección dedicada a los mellizos",
            "Otros factores: IMC muy alto o muy bajo, tabaquismo, edad materna avanzada combinada con otros factores",
          ],
        },
      },
      {
        title: { fr: "À quoi s'attendre", en: "What to expect", es: "Qué esperar" },
        color: COLORS.blue,
        illu: "stretchFigureIllu",
        items: {
          fr: [
            "Rendez-vous plus fréquents, souvent avec une référence en médecine fœto-maternelle ou un obstétricien spécialisé",
            "Échographies supplémentaires pour suivre de plus près la croissance du bébé et le bien-être placentaire",
            "Un plan de naissance discuté à l'avance, incluant le lieu d'accouchement le mieux adapté à votre situation",
            "Poser toutes vos questions à votre équipe soignante — comprendre pourquoi un suivi rapproché est proposé aide à vivre la grossesse plus sereinement",
          ],
          en: [
            "More frequent appointments, often with a referral to maternal-fetal medicine or a specialized obstetrician",
            "Additional ultrasounds to more closely track baby's growth and placental wellbeing",
            "A birth plan discussed in advance, including the birth location best suited to your situation",
            "Ask your care team all your questions — understanding why closer follow-up is recommended helps you experience the pregnancy with more peace of mind",
          ],
          es: [
            "Citas más frecuentes, a menudo con referencia a medicina materno-fetal o a un obstetra especializado",
            "Ecografías adicionales para vigilar más de cerca el crecimiento del bebé y el bienestar de la placenta",
            "Un plan de parto conversado con anticipación, incluyendo el lugar de parto mejor adaptado a tu situación",
            "Hacer todas tus preguntas a tu equipo de salud — entender por qué se propone un seguimiento más cercano ayuda a vivir el embarazo con más tranquilidad",
          ],
        },
      },
      {
        title: { fr: "Quand consulter rapidement", en: "When to seek care promptly", es: "Cuándo consultar rápidamente" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: [
            "Saignement vaginal, douleur abdominale intense, maux de tête sévères ou troubles visuels, gonflement soudain du visage ou des mains",
            "Diminution marquée des mouvements du bébé",
            "Fièvre, ou tout symptôme qui vous inquiète — mieux vaut appeler que d'attendre",
          ],
          en: [
            "Vaginal bleeding, severe abdominal pain, severe headaches or vision changes, sudden swelling of the face or hands",
            "A marked decrease in baby's movements",
            "Fever, or any symptom that worries you — better to call than to wait",
          ],
          es: [
            "Sangrado vaginal, dolor abdominal intenso, dolores de cabeza severos o cambios en la visión, hinchazón repentina de la cara o las manos",
            "Una disminución marcada de los movimientos del bebé",
            "Fiebre, o cualquier síntoma que te preocupe — mejor llamar que esperar",
          ],
        },
      },
    ],
  },
  grossesse40plus: {
    title: { fr: "Grossesse après 40 ans", en: "Pregnancy after 40", es: "Embarazo después de los 40 años" },
    illu: "emergency",
    intro: {
      fr: "Contrairement à 35 ans, le cap des 40 ans correspond à une augmentation plus marquée et mieux documentée des risques. Ça ne veut pas dire qu'une grossesse en santé est impossible — de plus en plus de femmes ont des grossesses réussies après 40 ans — mais un suivi plus rapproché est généralement recommandé dès le départ.",
      en: "Unlike age 35, the age-40 mark comes with a more pronounced and better-documented rise in risk. That doesn't mean a healthy pregnancy is out of reach — more and more women have successful pregnancies after 40 — but closer follow-up is generally recommended from the start.",
      es: "A diferencia de los 35 años, los 40 años representan un aumento más marcado y mejor documentado de los riesgos. Eso no significa que un embarazo saludable sea imposible — cada vez más mujeres tienen embarazos exitosos después de los 40 — pero generalmente se recomienda un seguimiento más cercano desde el inicio.",
    },
    groups: [
      {
        title: { fr: "Ce que montrent les données", en: "What the data shows", es: "Lo que muestran los datos" },
        color: COLORS.pink,
        illu: "checklistIllu",
        items: {
          fr: [
            "Fausse couche : le risque grimpe à environ 1 grossesse sur 3 autour de 40 ans, et dépasse 1 sur 2 après 45 ans (comparativement à environ 15 % avant 35 ans)",
            "Anomalies chromosomiques : le risque de trisomie 21 passe d'environ 1 sur 85 à 40 ans à environ 1 sur 35 à 45 ans — d'où l'importance du dépistage prénatal",
            "Hypertension et prééclampsie, diabète gestationnel, et retard de croissance du bébé sont plus fréquents qu'à 35 ans",
            "Le risque de mortinaissance après terme est plus élevé, ce qui amène souvent à proposer un déclenchement autour de la 39e semaine plutôt que d'attendre",
            "Le taux de césarienne est plus élevé, notamment en raison d'un poids de naissance parfois plus élevé (macrosomie) ou d'un placenta prævia plus fréquent",
          ],
          en: [
            "Miscarriage: the risk climbs to roughly 1 in 3 pregnancies around age 40, and passes 1 in 2 after age 45 (compared to about 15% before 35)",
            "Chromosomal differences: the risk of Down syndrome goes from about 1 in 85 at 40 to about 1 in 35 at 45 — which is why prenatal screening matters",
            "High blood pressure and preeclampsia, gestational diabetes, and fetal growth restriction are more common than at 35",
            "The risk of stillbirth past the due date is higher, which is why induction around 39 weeks is often offered rather than waiting",
            "C-section rates are higher, partly due to higher birth weight (macrosomia) or a more frequent placenta previa",
          ],
          es: [
            "Aborto espontáneo: el riesgo sube a cerca de 1 de cada 3 embarazos alrededor de los 40 años, y supera 1 de cada 2 después de los 45 (comparado con cerca del 15 % antes de los 35)",
            "Diferencias cromosómicas: el riesgo de síndrome de Down pasa de cerca de 1 en 85 a los 40 años a cerca de 1 en 35 a los 45 — de ahí la importancia del cribado prenatal",
            "La hipertensión y preeclampsia, la diabetes gestacional y la restricción del crecimiento fetal son más frecuentes que a los 35 años",
            "El riesgo de muerte fetal después de la fecha probable de parto es más alto, por lo que a menudo se propone la inducción alrededor de la semana 39 en lugar de esperar",
            "La tasa de cesáreas es más alta, en parte debido a un peso al nacer a veces mayor (macrosomía) o a una placenta previa más frecuente",
          ],
        },
      },
      {
        title: { fr: "Comment bien vous entourer", en: "How to be well supported", es: "Cómo rodearte bien" },
        color: COLORS.blue,
        illu: "stretchFigureIllu",
        items: {
          fr: [
            "Une consultation avant même la conception est fortement recommandée, pour faire le point sur votre santé et discuter de vos options",
            "Un suivi plus rapproché dès le début (échographies, prises de sang, surveillance de la tension) est généralement proposé d'emblée, pas seulement en cas de complication",
            "Le dépistage prénatal (DPNI/ADNlf, voire amniocentèse selon les résultats) permet de détecter tôt les anomalies chromosomiques",
            "Si une fécondation in vitro avec don d'ovocytes est envisagée, sachez que le risque d'hypertension et de prééclampsie est un peu plus élevé qu'avec une FIV classique — à discuter avec votre clinique",
            "Chaque grossesse après 40 ans est différente : plusieurs se déroulent sans complication majeure avec un bon accompagnement",
          ],
          en: [
            "A visit before conceiving is strongly recommended, to review your health and discuss your options",
            "Closer follow-up from the start (ultrasounds, blood work, blood pressure monitoring) is generally offered upfront, not only if a complication arises",
            "Prenatal screening (NIPT, or amniocentesis depending on results) helps detect chromosomal differences early",
            "If IVF with donor eggs is being considered, note that the risk of high blood pressure and preeclampsia is somewhat higher than with standard IVF — worth discussing with your clinic",
            "Every pregnancy after 40 is different: many go without major complications with the right support",
          ],
          es: [
            "Se recomienda firmemente una consulta antes de concebir, para revisar tu salud y hablar de tus opciones",
            "Generalmente se ofrece desde el inicio un seguimiento más cercano (ecografías, análisis de sangre, control de presión) y no solo si surge una complicación",
            "El cribado prenatal (NIPT/ADNlf, o incluso amniocentesis según los resultados) ayuda a detectar tempranamente diferencias cromosómicas",
            "Si se considera la fecundación in vitro con óvulos donados, ten en cuenta que el riesgo de hipertensión y preeclampsia es un poco más alto que con una FIV estándar — vale la pena hablarlo con tu clínica",
            "Cada embarazo después de los 40 es diferente: muchos transcurren sin complicaciones mayores con un buen acompañamiento",
          ],
        },
      },
    ],
  },
};


/* ---------------- POSTPARTUM DATA ---------------- */
const POSTPARTUM = {
  retourCouches: {
    title: { fr: "Retour de couches", en: "Return of periods", es: "Regreso de la menstruación" },
    illu: "postpartum",
    intro: {
      fr: "Le retour des menstruations après l'accouchement varie énormément d'une personne à l'autre, principalement selon le mode d'allaitement.",
      en: "The return of periods after birth varies a lot from person to person, mainly depending on how you're feeding your baby.",
      es: "El regreso de la menstruación después del parto varía mucho de una persona a otra, principalmente según el tipo de lactancia.",
    },
    groups: [
      {
        title: { fr: "Retour des règles", en: "Return of periods", es: "Regreso de la menstruación" },
        color: COLORS.pink,
        illu: "cycleDiagram",
        items: {
          fr: [
            "Le retour des règles varie beaucoup : dès 6 à 8 semaines si pas d'allaitement, souvent retardé de plusieurs mois si allaitement exclusif",
            "Le premier cycle après l'accouchement est parfois irrégulier ou plus abondant que d'habitude",
          ],
          en: [
            "Periods return at very different times: as early as 6-8 weeks without breastfeeding, often delayed several months with exclusive breastfeeding",
            "The first cycle after birth is sometimes irregular or heavier than usual",
          ],
          es: [
            "El regreso de la menstruación varía mucho: desde las 6-8 semanas sin lactancia, a menudo retrasado varios meses con lactancia exclusiva",
            "El primer ciclo después del parto a veces es irregular o más abundante de lo habitual",
          ],
        },
      },
      {
        title: { fr: "Fertilité & contraception", en: "Fertility & contraception", es: "Fertilidad y anticoncepción" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "L'aménorrhée lactationnelle (absence de règles due à l'allaitement) peut offrir une protection contraceptive partielle si l'allaitement est exclusif, fréquent et que les règles ne sont pas revenues, mais seulement pendant les 6 premiers mois",
            "L'ovulation peut revenir avant les premières règles : une grossesse est possible même en allaitant et avant le retour des menstruations",
            "Une contraception est recommandée dès la reprise des relations sexuelles si une nouvelle grossesse n'est pas souhaitée à court terme",
            "Discuter des options contraceptives compatibles avec l'allaitement lors du rendez-vous postnatal",
          ],
          en: [
            "Lactational amenorrhea (no periods due to breastfeeding) can offer partial contraceptive protection if breastfeeding is exclusive, frequent, and periods haven't returned — but only for the first 6 months",
            "Ovulation can return before the first period: pregnancy is possible even while breastfeeding and before periods resume",
            "Contraception is recommended as soon as you resume intercourse if you don't want another pregnancy soon",
            "Discuss contraceptive options compatible with breastfeeding at your postnatal appointment",
          ],
          es: [
            "La amenorrea de lactancia (ausencia de menstruación por la lactancia) puede ofrecer una protección anticonceptiva parcial si la lactancia es exclusiva, frecuente y la menstruación no ha regresado — pero solo durante los primeros 6 meses",
            "La ovulación puede regresar antes que la primera menstruación: un embarazo es posible incluso amamantando y antes del regreso de la menstruación",
            "Se recomienda usar anticoncepción desde que se reanudan las relaciones sexuales si no se desea un nuevo embarazo a corto plazo",
            "Hablar de las opciones anticonceptivas compatibles con la lactancia en la cita posnatal",
          ],
        },
      },
    ],
  },
  emotions: {
    title: { fr: "Émotions & baby blues", en: "Emotions & baby blues", es: "Emociones y baby blues" },
    illu: "postpartum",
    intro: {
      fr: "Les bouleversements hormonaux, le manque de sommeil et l'adaptation à la vie avec bébé font des premières semaines une période émotionnellement intense. Savoir distinguer le baby blues d'une dépression post-partum est essentiel.",
      en: "Hormonal shifts, sleep deprivation, and adjusting to life with a baby make the first weeks an emotionally intense time. Knowing how to tell baby blues apart from postpartum depression matters.",
      es: "Los cambios hormonales, la falta de sueño y la adaptación a la vida con el bebé hacen de las primeras semanas un período emocionalmente intenso. Saber distinguir el baby blues de una depresión posparto es esencial.",
    },
    groups: [
      {
        title: { fr: "Reconnaître ce qui se passe", en: "Recognizing what's happening", es: "Reconocer lo que está pasando" },
        color: COLORS.sage,
        illu: "mindCareIllu",
        items: {
          fr: [
            "Le baby blues touche jusqu'à 80 % des mères : pleurs soudains, irritabilité, sensibilité accrue, anxiété légère, vers le 3e-5e jour après l'accouchement — il se résorbe généralement en 2 semaines sans traitement",
            "La dépression post-partum touche environ 1 mère sur 7 : elle dure plus longtemps et est plus intense — tristesse persistante, perte d'intérêt, sentiment de culpabilité, anxiété importante",
            "L'anxiété post-partum peut survenir seule ou avec la dépression : inquiétudes envahissantes, pensées intrusives, tension physique constante",
            "La psychose post-partum est rare mais grave : hallucinations, confusion, pensées désorganisées",
          ],
          en: [
            "Baby blues affects up to 80% of mothers: sudden tearfulness, irritability, heightened sensitivity, mild anxiety, around day 3-5 after birth — it usually resolves within 2 weeks without treatment",
            "Postpartum depression affects about 1 in 7 mothers: it lasts longer and is more intense — persistent sadness, loss of interest, feelings of guilt, significant anxiety",
            "Postpartum anxiety can occur alone or alongside depression: overwhelming worry, intrusive thoughts, constant physical tension",
            "Postpartum psychosis is rare but serious: hallucinations, confusion, disorganized thoughts",
          ],
          es: [
            "El baby blues afecta hasta el 80 % de las madres: llanto repentino, irritabilidad, mayor sensibilidad, ansiedad leve, hacia el día 3-5 después del parto — generalmente se resuelve en 2 semanas sin tratamiento",
            "La depresión posparto afecta a cerca de 1 de cada 7 madres: dura más tiempo y es más intensa — tristeza persistente, pérdida de interés, sentimiento de culpa, ansiedad importante",
            "La ansiedad posparto puede aparecer sola o junto con la depresión: preocupaciones abrumadoras, pensamientos intrusivos, tensión física constante",
            "La psicosis posparto es rara pero grave: alucinaciones, confusión, pensamientos desorganizados",
          ],
        },
      },
      {
        title: { fr: "Quand consulter", en: "When to seek help", es: "Cuándo consultar" },
        color: COLORS.ochre,
        illu: "emergency",
        items: {
          fr: [
            "Si les symptômes persistent au-delà de 2 semaines, s'aggravent, ou incluent des pensées de faire du mal à soi-même ou au bébé, consulter un professionnel de la santé sans délai",
            "La psychose post-partum nécessite une consultation médicale immédiate",
          ],
          en: [
            "If symptoms last beyond 2 weeks, worsen, or include thoughts of harming yourself or the baby, see a healthcare provider without delay",
            "Postpartum psychosis needs immediate medical attention",
          ],
          es: [
            "Si los síntomas duran más de 2 semanas, empeoran, o incluyen pensamientos de hacerte daño a ti misma o al bebé, consulta a un profesional de la salud sin demora",
            "La psicosis posparto requiere atención médica inmediata",
          ],
        },
      },
      {
        title: { fr: "Soutien & rétablissement", en: "Support & recovery", es: "Apoyo y recuperación" },
        color: COLORS.pink,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Le soutien du réseau (partenaire, famille, amis) fait une réelle différence dans la prévention et le rétablissement",
            "Les pères et partenaires peuvent aussi vivre une dépression post-partum : environ 1 sur 10",
            "Des groupes de soutien pour nouveaux parents existent dans la plupart des régions et peuvent réduire le sentiment d'isolement",
            "Se rappeler qu'il n'y a aucune honte à demander de l'aide : la dépression post-partum est une condition médicale reconnue, pas un échec personnel",
          ],
          en: [
            "Support from a partner, family and friends makes a real difference in both prevention and recovery",
            "Fathers and partners can also experience postpartum depression: about 1 in 10",
            "Support groups for new parents exist in most areas and can reduce feelings of isolation",
            "Remember there's no shame in asking for help: postpartum depression is a recognized medical condition, not a personal failure",
          ],
          es: [
            "El apoyo de la red (pareja, familia, amigos) marca una verdadera diferencia en la prevención y la recuperación",
            "Los padres y parejas también pueden vivir una depresión posparto: cerca de 1 de cada 10",
            "Existen grupos de apoyo para nuevos padres en la mayoría de las regiones y pueden reducir la sensación de aislamiento",
            "Recordar que no hay ninguna vergüenza en pedir ayuda: la depresión posparto es una condición médica reconocida, no un fracaso personal",
          ],
        },
      },
    ],
  },
  allaitement: {
    title: { fr: "Allaitement", en: "Breastfeeding", es: "Lactancia materna" },
    intro: {
      fr: "L'allaitement est un apprentissage pour la mère et le bébé. Il est normal que ça prenne quelques semaines à bien fonctionner, et un accompagnement fait toute la différence en cas de difficulté.",
      en: "Breastfeeding is a learning process for both mother and baby. It's normal for it to take a few weeks to click, and support makes all the difference when there are difficulties.",
      es: "La lactancia es un aprendizaje para la madre y el bebé. Es normal que tome algunas semanas funcionar bien, y contar con apoyo marca toda la diferencia si hay dificultades.",
    },
    groups: [
      {
        title: { fr: "Débuter l'allaitement", en: "Getting started", es: "Comenzar la lactancia" },
        color: COLORS.pink,
        illu: "nursing",
        items: {
          fr: [
            "La montée laiteuse survient généralement 2 à 4 jours après l'accouchement; le colostrum (premier lait, riche et concentré) suffit dans les premiers jours",
            "Un bébé bien positionné et bien mis au sein (bouche grande ouverte, lèvres retroussées, plus d'aréole visible au-dessus qu'en dessous) prévient la plupart des douleurs aux mamelons",
            "Nourrir à la demande : environ 8 à 12 tétées par 24 heures chez le nouveau-né, sans horaire fixe",
            "Signes qu'un bébé boit assez : prise de poids régulière après la perte initiale normale, au moins 6 couches mouillées et 3-4 selles par jour après le 5e jour",
          ],
          en: [
            "Milk typically comes in 2 to 4 days after birth; colostrum (the first milk, rich and concentrated) is enough in the early days",
            "A good latch and positioning (mouth wide open, lips flanged out, more areola visible above than below) prevents most nipple pain",
            "Feed on demand: about 8 to 12 feeds per 24 hours for a newborn, with no fixed schedule",
            "Signs baby is getting enough: steady weight gain after the normal initial loss, at least 6 wet diapers and 3-4 stools a day after day 5",
          ],
          es: [
            "La subida de la leche suele ocurrir 2 a 4 días después del parto; el calostro (la primera leche, rica y concentrada) es suficiente en los primeros días",
            "Un bebé bien colocado y bien prendido al pecho (boca bien abierta, labios evertidos, más areola visible arriba que abajo) previene la mayoría de los dolores en los pezones",
            "Alimentar a demanda: alrededor de 8 a 12 tomas por 24 horas en el recién nacido, sin horario fijo",
            "Señales de que el bebé toma suficiente: aumento de peso constante después de la pérdida inicial normal, al menos 6 pañales mojados y 3-4 deposiciones al día después del 5º día",
          ],
        },
      },
      {
        title: { fr: "Inconforts courants", en: "Common discomforts", es: "Molestias comunes" },
        color: COLORS.ochre,
        illu: "heartCareIllu",
        items: {
          fr: [
            "L'engorgement mammaire est fréquent dans les premiers jours : tétées fréquentes, compresses tièdes avant la tétée et froides après",
            "Les canaux bloqués et la mastite se manifestent par une zone rouge, chaude et douloureuse, parfois avec de la fièvre : vidanger le sein, appliquer de la chaleur, consulter si fièvre ou symptômes qui persistent",
            "Le réflexe d'éjection peut causer une sensation de picotement ou un léger inconfort en début de tétée, c'est normal",
          ],
          en: [
            "Breast engorgement is common in the early days: frequent feeds, warm compresses before nursing and cold ones after",
            "Blocked ducts and mastitis show up as a red, warm, painful area, sometimes with fever: drain the breast, apply heat, see a provider if fever or symptoms persist",
            "The let-down reflex can cause a tingling sensation or mild discomfort at the start of a feed, which is normal",
          ],
          es: [
            "La congestión mamaria es frecuente en los primeros días: tomas frecuentes, compresas tibias antes de la toma y frías después",
            "Los conductos obstruidos y la mastitis se manifiestan con una zona roja, caliente y dolorosa, a veces con fiebre: vaciar el pecho, aplicar calor, consultar si hay fiebre o los síntomas persisten",
            "El reflejo de eyección puede causar una sensación de hormigueo o una leve molestia al inicio de la toma, es normal",
          ],
        },
      },
      {
        title: { fr: "Tire-lait & soutien", en: "Pumping & support", es: "Extractor de leche y apoyo" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Un tire-lait peut être utile pour stimuler la production, constituer une réserve, ou permettre à d'autres personnes de nourrir le bébé",
            "L'alimentation de la mère n'a généralement pas besoin d'être très restrictive; une alimentation variée et une bonne hydratation suffisent dans la majorité des cas",
            "Une consultante en lactation certifiée (IBCLC) peut aider en cas de douleur persistante, de faible prise de poids, d'engorgement ou de questions sur la succion du bébé",
            "L'allaitement mixte (sein et biberon) est une option valable si elle convient mieux à la famille — le mode d'alimentation n'est jamais une mesure de la valeur d'un parent",
          ],
          en: [
            "A breast pump can help build supply, store a reserve, or let others feed the baby",
            "A mother's diet usually doesn't need to be very restrictive; a varied diet and good hydration are enough in most cases",
            "A certified lactation consultant (IBCLC) can help with persistent pain, slow weight gain, engorgement, or questions about baby's latch",
            "Combination feeding (breast and bottle) is a valid choice if it works better for the family — how you feed your baby is never a measure of your worth as a parent",
          ],
          es: [
            "Un extractor de leche puede ser útil para estimular la producción, formar una reserva, o permitir que otras personas alimenten al bebé",
            "La alimentación de la madre generalmente no necesita ser muy restrictiva; una dieta variada y buena hidratación son suficientes en la mayoría de los casos",
            "Una consultora de lactancia certificada (IBCLC) puede ayudar en caso de dolor persistente, poco aumento de peso, congestión, o dudas sobre el agarre del bebé",
            "La lactancia mixta (pecho y biberón) es una opción válida si conviene mejor a la familia — la forma de alimentar nunca es una medida del valor de un padre o madre",
          ],
        },
      },
    ],
  },
  biberon: {
    title: { fr: "Alimentation au biberon", en: "Bottle feeding", es: "Alimentación con biberón" },
    intro: {
      fr: "Que ce soit avec du lait maternel ou une préparation commerciale, l'alimentation au biberon peut se faire en toute confiance en suivant quelques repères simples.",
      en: "Whether with breast milk or commercial formula, bottle feeding can be done confidently by following a few simple guidelines.",
      es: "Ya sea con leche materna o fórmula comercial, la alimentación con biberón puede hacerse con confianza siguiendo algunas pautas simples.",
    },
    groups: [
      {
        title: { fr: "Préparer & donner le biberon", en: "Preparing & giving the bottle", es: "Preparar y dar el biberón" },
        color: COLORS.blue,
        illu: "babyBottle",
        items: {
          fr: [
            "Préparer les biberons de préparation commerciale selon les instructions exactes du fabricant, avec de l'eau à la bonne température, sans diluer ni concentrer",
            "Un nouveau-né boit environ 60 à 90 ml par boire au départ, à augmenter graduellement jusqu'à environ 90-120 ml vers 1 mois",
            "Nourrir au rythme du bébé, en position semi-assise, en faisant des pauses pour les rots, sans forcer à terminer le biberon",
            "Reconnaître les signes de satiété : bébé détourne la tête, ralentit, ferme la bouche — respecter ces signaux plutôt que de finir le biberon à tout prix",
            "Alterner les bras pour donner le biberon, comme au sein, favorise le lien et stimule le développement visuel des deux côtés",
          ],
          en: [
            "Prepare commercial formula bottles exactly per the manufacturer's instructions, with water at the right temperature, never diluted or concentrated",
            "A newborn drinks about 60-90 ml per feed at first, gradually increasing to about 90-120 ml around 1 month",
            "Feed at baby's pace, in a semi-upright position, pausing for burps, without forcing the bottle to be finished",
            "Recognize fullness cues: baby turns their head away, slows down, closes their mouth — honor these signals rather than finishing the bottle no matter what",
            "Alternate arms while bottle feeding, just like at the breast, to support bonding and even visual development on both sides",
          ],
          es: [
            "Preparar los biberones de fórmula comercial siguiendo exactamente las instrucciones del fabricante, con agua a la temperatura correcta, sin diluir ni concentrar",
            "Un recién nacido toma cerca de 60 a 90 ml por toma al principio, aumentando gradualmente hasta unos 90-120 ml hacia el mes de edad",
            "Alimentar al ritmo del bebé, en posición semisentada, haciendo pausas para los eructos, sin forzar a terminar el biberón",
            "Reconocer las señales de saciedad: el bebé aparta la cabeza, disminuye el ritmo, cierra la boca — respetar estas señales en lugar de terminar el biberón a toda costa",
            "Alternar los brazos al dar el biberón, igual que al pecho, favorece el vínculo y estimula el desarrollo visual de ambos lados",
          ],
        },
      },
      {
        title: { fr: "Hygiène & conservation", en: "Hygiene & storage", es: "Higiene y conservación" },
        color: COLORS.sage,
        illu: "checklistIllu",
        items: {
          fr: [
            "Stériliser le matériel (biberons, tétines) avant la première utilisation et régulièrement les premiers mois, puis un lavage à l'eau chaude savonneuse suffit habituellement",
            "La préparation commerciale ouverte se conserve au réfrigérateur environ 24 à 48 heures selon le type; un biberon entamé doit être utilisé dans l'heure",
            "Ne jamais réchauffer un biberon au four à micro-ondes (chauffe inégale, risque de brûlure) : privilégier un bain-marie ou un chauffe-biberon",
            "Le lait maternel congelé se conserve plusieurs mois au congélateur et doit être décongelé au réfrigérateur ou sous l'eau tiède, jamais recongelé",
          ],
          en: [
            "Sterilize equipment (bottles, nipples) before first use and regularly in the early months, then hot soapy water is usually enough",
            "Opened commercial formula keeps in the fridge for about 24-48 hours depending on the type; a started bottle should be used within an hour",
            "Never warm a bottle in the microwave (uneven heating, burn risk): use a warm water bath or a bottle warmer instead",
            "Frozen breast milk keeps for several months in the freezer and should be thawed in the fridge or under warm water, never refrozen",
          ],
          es: [
            "Esterilizar el equipo (biberones, tetinas) antes del primer uso y regularmente en los primeros meses; después, suele bastar con lavar con agua caliente y jabón",
            "La fórmula comercial abierta se conserva en el refrigerador entre 24 y 48 horas según el tipo; un biberón ya iniciado debe usarse dentro de la hora",
            "Nunca calentar un biberón en el microondas (calentamiento desigual, riesgo de quemadura): usar un baño de agua tibia o un calienta biberones",
            "La leche materna congelada se conserva varios meses en el congelador y debe descongelarse en el refrigerador o bajo agua tibia, nunca volver a congelarse",
          ],
        },
      },
    ],
  },
  sommeilNaissance: {
    title: { fr: "Sommeil du nouveau-né", en: "Newborn sleep", es: "Sueño del recién nacido" },
    illu: "cribIllu",
    intro: {
      fr: "Le sommeil du nouveau-né suit un rythme très différent de celui des adultes. Comprendre ce qui est normal aide à traverser les nuits plus sereinement.",
      en: "Newborn sleep follows a very different rhythm from adult sleep. Understanding what's normal helps you get through the nights with more peace of mind.",
      es: "El sueño del recién nacido sigue un ritmo muy diferente al de los adultos. Entender lo que es normal ayuda a pasar las noches con más tranquilidad.",
    },
    groups: [
      {
        title: { fr: "Combien & comment bébé dort", en: "How much & how baby sleeps", es: "Cuánto y cómo duerme el bebé" },
        color: COLORS.blue,
        illu: "teddyBearIllu",
        items: {
          fr: [
            "Un nouveau-né dort de 14 à 17 heures par jour, en courtes périodes de 2 à 4 heures, entrecoupées de réveils pour se nourrir",
            "Aucune distinction jour/nuit avant plusieurs semaines : c'est normal et lié à l'immaturité de l'horloge biologique",
            "Les cycles de sommeil sont plus courts que ceux des adultes (environ 50-60 minutes), avec plus de sommeil actif (paradoxal)",
          ],
          en: [
            "A newborn sleeps 14 to 17 hours a day, in short 2-4 hour stretches, interrupted by wake-ups to feed",
            "No day/night distinction for the first several weeks: this is normal and related to an immature internal clock",
            "Sleep cycles are shorter than adult ones (about 50-60 minutes), with more active (REM) sleep",
          ],
          es: [
            "Un recién nacido duerme de 14 a 17 horas al día, en períodos cortos de 2 a 4 horas, interrumpidos por despertares para alimentarse",
            "No hay distinción día/noche antes de varias semanas: es normal y está ligado a la inmadurez del reloj biológico",
            "Los ciclos de sueño son más cortos que los de los adultos (unos 50-60 minutos), con más sueño activo (REM)",
          ],
        },
      },
      {
        title: { fr: "Sommeil sécuritaire", en: "Safe sleep", es: "Sueño seguro" },
        color: COLORS.teal,
        illu: "cribIllu",
        items: {
          fr: [
            "Toujours coucher bébé sur le dos, dans un lit sécuritaire (matelas ferme, ajusté), sans objets mous, oreillers, couvertures ou tours de lit",
            "Le partage de chambre (bébé dans la même pièce, dans son propre lit) est recommandé pour les 6 à 12 premiers mois : il réduit le risque de mort subite du nourrisson",
          ],
          en: [
            "Always place baby on their back, in a safe crib (firm, well-fitted mattress), with no soft objects, pillows, blankets, or bumpers",
            "Room-sharing (baby in the same room, in their own crib) is recommended for the first 6 to 12 months: it reduces the risk of sudden infant death syndrome",
          ],
          es: [
            "Siempre acostar al bebé boca arriba, en una cuna segura (colchón firme y bien ajustado), sin objetos blandos, almohadas, cobijas o protectores de cuna",
            "Compartir habitación (el bebé en la misma habitación, en su propia cuna) se recomienda durante los primeros 6 a 12 meses: reduce el riesgo de muerte súbita del lactante",
          ],
        },
      },
      {
        title: { fr: "Trucs & routine", en: "Tips & routine", es: "Trucos y rutina" },
        color: COLORS.ochre,
        illu: "swaddledBabyIllu",
        items: {
          fr: [
            "Des bruits, mouvements et grognements pendant le sommeil sont normaux; attendre un peu avant d'intervenir permet parfois au bébé de se rendormir seul",
            "L'emmaillotage peut aider certains nouveau-nés à mieux dormir en limitant le réflexe de sursaut (Moro), à cesser dès que bébé montre des signes de rouler",
            "Une routine simple et cohérente (bain, tétée, chanson) peut commencer à s'installer dès quelques semaines pour signaler que c'est l'heure de dormir",
          ],
          en: [
            "Noises, movements, and grunting during sleep are normal; waiting a bit before stepping in sometimes lets baby settle back to sleep on their own",
            "Swaddling can help some newborns sleep better by limiting the startle (Moro) reflex, and should stop as soon as baby shows signs of rolling",
            "A simple, consistent routine (bath, feed, song) can start being introduced within the first few weeks to signal it's time to sleep",
          ],
          es: [
            "Los ruidos, movimientos y gruñidos durante el sueño son normales; esperar un poco antes de intervenir a veces permite que el bebé se vuelva a dormir solo",
            "El swaddle (envolver al bebé) puede ayudar a algunos recién nacidos a dormir mejor al limitar el reflejo de sobresalto (Moro), y debe suspenderse en cuanto el bebé muestre señales de darse vuelta",
            "Una rutina simple y constante (baño, toma, canción) puede empezar a establecerse desde las primeras semanas para indicar que es hora de dormir",
          ],
        },
      },
      {
        title: { fr: "L'évolution du sommeil", en: "How sleep evolves", es: "La evolución del sueño" },
        color: COLORS.pink,
        illu: "safeSleep",
        items: {
          fr: [
            "Le sommeil se consolide graduellement : périodes plus longues la nuit vers 3 à 4 mois, régularisation plus marquée vers 6 mois",
            "La régression du sommeil vers 4 mois est fréquente et normale, liée à une maturation des cycles de sommeil",
          ],
          en: [
            "Sleep gradually consolidates: longer nighttime stretches around 3-4 months, more marked regularity around 6 months",
            "The 4-month sleep regression is common and normal, linked to sleep-cycle maturation",
          ],
          es: [
            "El sueño se consolida gradualmente: períodos más largos por la noche hacia los 3-4 meses, una regularidad más marcada hacia los 6 meses",
            "La regresión del sueño hacia los 4 meses es frecuente y normal, ligada a la maduración de los ciclos de sueño",
          ],
        },
      },
    ],
  },
  couple: {
    title: { fr: "Soutien du couple & de la famille", en: "Couple & family support", es: "Apoyo de la pareja y la familia" },
    illu: "postpartum",
    intro: {
      fr: "L'arrivée d'un enfant transforme la dynamique du couple et de la famille. Anticiper ces changements aide à traverser cette période de transition avec plus de douceur.",
      en: "A new baby transforms the dynamic of a couple and a family. Anticipating these changes helps you move through this transition with more ease.",
      es: "La llegada de un hijo transforma la dinámica de la pareja y la familia. Anticipar estos cambios ayuda a atravesar esta transición con más calma.",
    },
    groups: [
      {
        title: { fr: "Prendre soin du couple", en: "Nurturing the relationship", es: "Cuidar la relación de pareja" },
        color: COLORS.pink,
        illu: "coupleIllu",
        items: {
          fr: [
            "La communication ouverte sur la fatigue et le partage des tâches réduit les tensions et prévient le ressentiment",
            "Prévoir des moments de répit, même courts, pour chaque parent — même 20-30 minutes peuvent faire une différence",
            "Une baisse de la satisfaction conjugale est fréquente la première année suivant une naissance; en parler ouvertement aide à normaliser l'expérience",
            "La reprise de l'intimité se fait au rythme du couple, généralement après l'accord du professionnel de la santé (souvent vers 4-6 semaines), sans pression",
            "Prendre soin de la relation par de petits gestes (messages, moments à deux même brefs) même dans le chaos du quotidien",
            "Impliquer activement le partenaire dans les soins dès le début favorise l'attachement et allège la charge de la mère",
          ],
          en: [
            "Open communication about fatigue and sharing tasks reduces tension and prevents resentment from building up",
            "Plan for breaks, even short ones, for each parent — even 20-30 minutes can make a difference",
            "A dip in relationship satisfaction is common in the first year after a birth; talking about it openly helps normalize the experience",
            "Resuming intimacy happens at the couple's own pace, usually after a provider's clearance (often around 4-6 weeks), with no pressure",
            "Nurture the relationship with small gestures (texts, brief moments together) even amid the daily chaos",
            "Actively involving the partner in caregiving from the start supports bonding and lightens the mother's load",
          ],
          es: [
            "La comunicación abierta sobre el cansancio y el reparto de tareas reduce las tensiones y previene el resentimiento",
            "Planificar momentos de descanso, aunque sean cortos, para cada padre/madre — incluso 20-30 minutos pueden marcar la diferencia",
            "Una baja en la satisfacción conyugal es frecuente el primer año después de un nacimiento; hablar de ello abiertamente ayuda a normalizar la experiencia",
            "La reanudación de la intimidad se hace al ritmo de la pareja, generalmente después de la autorización del profesional de la salud (a menudo hacia las 4-6 semanas), sin presión",
            "Cuidar la relación con pequeños gestos (mensajes, momentos juntos aunque sean breves) incluso en medio del caos diario",
            "Involucrar activamente a la pareja en los cuidados desde el inicio favorece el vínculo y alivia la carga de la madre",
          ],
        },
      },
      {
        title: { fr: "La famille & la fratrie", en: "Family & siblings", es: "La familia y los hermanos" },
        color: COLORS.sage,
        illu: "playing",
        items: {
          fr: [
            "Accepter l'aide offerte par l'entourage pour les repas, le ménage, la fratrie : ce n'est pas un signe de faiblesse",
            "Préparer la fratrie à l'arrivée du bébé et prévoir du temps individuel avec les enfants plus âgés aide à limiter la jalousie",
          ],
          en: [
            "Accept help offered for meals, housework, or looking after siblings: it isn't a sign of weakness",
            "Preparing siblings for the baby's arrival and setting aside one-on-one time with older kids helps limit jealousy",
          ],
          es: [
            "Aceptar la ayuda que ofrecen los cercanos para las comidas, la limpieza, los hermanos: no es una señal de debilidad",
            "Preparar a los hermanos para la llegada del bebé y reservar tiempo individual con los hijos mayores ayuda a limitar los celos",
          ],
        },
      },
      {
        title: { fr: "Quand consulter", en: "When to seek support", es: "Cuándo buscar apoyo" },
        color: COLORS.blue,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Envisager une thérapie de couple ou familiale si les tensions persistent : ce n'est pas réservé aux couples « en crise »",
            "Se rappeler que la première année est souvent la plus exigeante, et que la dynamique familiale continue d'évoluer et de s'ajuster avec le temps",
          ],
          en: [
            "Consider couples or family therapy if tensions persist: it isn't just for couples 'in crisis'",
            "Remember the first year is often the most demanding, and family dynamics keep evolving and adjusting over time",
          ],
          es: [
            "Considerar terapia de pareja o familiar si las tensiones persisten: no es solo para parejas « en crisis »",
            "Recordar que el primer año suele ser el más exigente, y que la dinámica familiar sigue evolucionando y ajustándose con el tiempo",
          ],
        },
      },
    ],
  },
  recuperation: {
    title: { fr: "Récupération physique", en: "Physical recovery", es: "Recuperación física" },
    illu: "postpartum",
    intro: {
      fr: "Le corps a besoin de temps pour guérir après l'accouchement, qu'il ait été vaginal ou par césarienne. La récupération complète peut prendre plusieurs mois, bien au-delà des 6 semaines officielles.",
      en: "The body needs time to heal after birth, whether vaginal or by C-section. Full recovery can take several months, well beyond the official 6-week mark.",
      es: "El cuerpo necesita tiempo para sanar después del parto, ya sea vaginal o por cesárea. La recuperación completa puede tomar varios meses, mucho más allá de las 6 semanas oficiales.",
    },
    groups: [
      {
        title: { fr: "Guérison physique", en: "Physical healing", es: "Sanación física" },
        color: COLORS.pink,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Les saignements post-accouchement (lochies) durent généralement 4 à 6 semaines, passant du rouge vif au brun puis au jaunâtre",
            "Douleurs périnéales ou déchirures : compresses froides les premiers jours, bains de siège tièdes, coussin en forme d'anneau pour s'asseoir",
            "Après une césarienne : garder la cicatrice propre et sèche, éviter de soulever des charges lourdes pendant 6 semaines, surveiller les signes d'infection",
            "Les contractions utérines post-partum (tranchées) aident l'utérus à retrouver sa taille normale, plus marquées lors des tétées",
            "Transpiration nocturne abondante dans les jours suivant l'accouchement : le corps élimine le surplus de liquide accumulé",
          ],
          en: [
            "Postpartum bleeding (lochia) usually lasts 4 to 6 weeks, moving from bright red to brown to yellowish",
            "Perineal pain or tears: cold compresses in the first days, warm sitz baths, a ring-shaped cushion for sitting",
            "After a C-section: keep the incision clean and dry, avoid lifting heavy loads for 6 weeks, watch for signs of infection",
            "Postpartum uterine cramps (afterpains) help the uterus shrink back down, often stronger while nursing",
            "Heavy night sweats in the days after birth: the body is shedding excess fluid built up during pregnancy",
          ],
          es: [
            "El sangrado posparto (loquios) suele durar de 4 a 6 semanas, pasando de rojo vivo a café y luego amarillento",
            "Dolor perineal o desgarros: compresas frías los primeros días, baños de asiento tibios, un cojín en forma de anillo para sentarse",
            "Después de una cesárea: mantener la cicatriz limpia y seca, evitar levantar cargas pesadas durante 6 semanas, vigilar señales de infección",
            "Las contracciones uterinas posparto (entuertos) ayudan al útero a recuperar su tamaño normal, más marcadas durante las tomas",
            "Sudoración nocturna abundante en los días después del parto: el cuerpo elimina el exceso de líquido acumulado",
          ],
        },
      },
      {
        title: { fr: "Reprendre son corps", en: "Reclaiming your body", es: "Recuperar tu cuerpo" },
        color: COLORS.sage,
        illu: "stretchFigureIllu",
        items: {
          fr: [
            "La période officielle des relevailles est d'environ 6 semaines, mais la récupération complète peut prendre plusieurs mois",
            "Reprise progressive de l'activité physique, en commençant par de courtes marches dès que possible, en écoutant son corps",
            "La rééducation du plancher pelvien (exercices de Kegel ou physiothérapie périnéale) aide à prévenir l'incontinence à long terme",
            "Constipation fréquente après l'accouchement : hydratation, fibres, mouvement doux",
          ],
          en: [
            "The official postpartum recovery period is about 6 weeks, but full healing can take several months",
            "Gradually resume activity, starting with short walks as soon as you're able, listening to your body",
            "Pelvic floor rehab (Kegel exercises or pelvic physiotherapy) helps prevent long-term incontinence",
            "Constipation is common after birth: fluids, fiber, and gentle movement help",
          ],
          es: [
            "El período oficial de recuperación posparto es de unas 6 semanas, pero la sanación completa puede tomar varios meses",
            "Retomar la actividad física de forma gradual, comenzando con caminatas cortas tan pronto como sea posible, escuchando tu cuerpo",
            "La rehabilitación del suelo pélvico (ejercicios de Kegel o fisioterapia perineal) ayuda a prevenir la incontinencia a largo plazo",
            "El estreñimiento es frecuente después del parto: hidratación, fibra, movimiento suave",
          ],
        },
      },
      {
        title: { fr: "Quand consulter", en: "When to seek help", es: "Cuándo consultar" },
        color: COLORS.ochre,
        illu: "emergency",
        items: {
          fr: [
            "Consulter rapidement si fièvre, saignement abondant (plus d'une serviette par heure), douleur intense, rougeur ou écoulement d'une plaie, ou douleur au mollet",
            "Le rendez-vous postnatal officiel a généralement lieu entre 4 et 8 semaines après l'accouchement",
          ],
          en: [
            "See a provider promptly for fever, heavy bleeding (more than one pad per hour), severe pain, redness or discharge from a wound, or calf pain",
            "The official postpartum check-up usually happens between 4 and 8 weeks after birth",
          ],
          es: [
            "Consultar rápidamente si hay fiebre, sangrado abundante (más de una toalla por hora), dolor intenso, enrojecimiento o secreción de una herida, o dolor en la pantorrilla",
            "La cita posnatal oficial suele ocurrir entre las semanas 4 y 8 después del parto",
          ],
        },
      },
    ],
  },
  exercicesPostpartum: {
    title: { fr: "Tableau d'exercices post-accouchement", en: "Postpartum exercise chart", es: "Tabla de ejercicios posparto" },
    illu: "stretchFigureIllu",
    intro: {
      fr: "Un programme progressif en 3 étapes pour se remettre en forme après l'accouchement, à commencer seulement après le feu vert de votre médecin ou sage-femme.",
      en: "A progressive 3-stage program to get back in shape after birth, to start only after your doctor's or midwife's clearance.",
      es: "Un programa progresivo de 3 etapas para recuperar la forma física después del parto, a comenzar solo con la autorización de tu médico o partera.",
    },
    groups: [
      {
        title: { fr: "Avant de commencer un programme d'exercices", en: "Before starting an exercise program", es: "Antes de comenzar un programa de ejercicios" },
        color: COLORS.blue,
        illu: "stretchFigureIllu",
        items: {
          fr: [
            "Attendez impérativement l'accord de votre médecin ou sage-femme, généralement au rendez-vous postnatal (6 à 8 semaines), avant de débuter le programme d'exercices ci-dessous",
            "Ce programme progressif en 3 étapes s'inspire des repères reconnus par la Société canadienne de physiologie de l'exercice et l'ACOG (American College of Obstetricians and Gynecologists)",
            "Arrêtez et consultez si vous ressentez une douleur, une pression pelvienne, des fuites urinaires ou un bombement au niveau du ventre pendant l'effort",
            "Une consultation en physiothérapie périnéale et pelvienne permet d'évaluer votre diastase (écart entre les grands droits de l'abdomen) et d'adapter la progression à votre rythme",
            "Progressez à votre rythme : les délais indiqués dans le programme ci-dessous sont des repères généraux, pas une obligation — chaque récupération est différente",
          ],
          en: [
            "Always wait for your doctor's or midwife's clearance, usually at the postnatal check-up (6 to 8 weeks), before starting the exercise program below",
            "This progressive 3-stage program draws on benchmarks recognized by the Canadian Society for Exercise Physiology and ACOG (American College of Obstetricians and Gynecologists)",
            "Stop and consult if you feel pain, pelvic pressure, urinary leakage, or abdominal doming during effort",
            "A pelvic floor physiotherapy assessment can check your diastasis (the gap between the abdominal muscles) and tailor your progression",
            "Progress at your own pace: the timelines in the program below are general guideposts, not a requirement — every recovery is different",
          ],
          es: [
            "Espera siempre la autorización de tu médico o partera, generalmente en la cita posnatal (6 a 8 semanas), antes de comenzar el programa de ejercicios a continuación",
            "Este programa progresivo de 3 etapas se basa en referencias reconocidas por la Sociedad Canadiense de Fisiología del Ejercicio y el ACOG (American College of Obstetricians and Gynecologists)",
            "Detente y consulta si sientes dolor, presión pélvica, fugas de orina o un abultamiento en el abdomen durante el esfuerzo",
            "Una consulta de fisioterapia perineal y pélvica permite evaluar tu diástasis (separación entre los músculos rectos del abdomen) y adaptar la progresión a tu ritmo",
            "Avanza a tu propio ritmo: los plazos indicados en el programa a continuación son referencias generales, no una obligación — cada recuperación es diferente",
          ],
        },
      },
    ],
  },
};


/* ---------------- DEVELOPMENT 0-1 DATA ---------------- */
const DEV01 = {
  m03: {
    title: { fr: "0 à 3 mois", en: "0 to 3 months", es: "0 a 3 meses" },
    illu: "dev01",
    intro: {
      fr: "Les trois premiers mois sont marqués par l'adaptation à la vie hors de l'utérus : bébé apprend à réguler ses états (sommeil, éveil, pleurs) et construit ses premiers liens d'attachement.",
      en: "The first three months are all about adjusting to life outside the womb: baby learns to regulate their states (sleep, wake, crying) and starts building early attachment bonds.",
      es: "Los primeros tres meses están marcados por la adaptación a la vida fuera del útero: el bebé aprende a regular sus estados (sueño, vigilia, llanto) y construye sus primeros vínculos de apego.",
    },
    groups: [
      {
        title: { fr: "Motricité & sens", en: "Motor skills & senses", es: "Motricidad y sentidos" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: [
            "Moteur : lève brièvement la tête en position ventrale, mouvements encore dominés par les réflexes archaïques (Moro, agrippement, marche automatique)",
            "Vision : distingue les visages de près (20-30 cm), suit un objet des yeux, préfère les contrastes marqués et les visages humains",
            "Audition : sursaute aux bruits forts, se calme au son d'une voix familière, tourne la tête vers les sons dès quelques semaines",
            "Vers 2-3 mois, début du contrôle de la tête en position assise avec soutien",
            "Le temps sur le ventre supervisé (« tummy time »), dès les premiers jours en courtes périodes, renforce les muscles du cou et du dos",
          ],
          en: [
            "Motor: briefly lifts head during tummy time, movements still dominated by primitive reflexes (Moro, grasping, stepping)",
            "Vision: recognizes faces up close (8-12 inches), tracks an object with the eyes, prefers high-contrast patterns and human faces",
            "Hearing: startles at loud noises, calms to a familiar voice, turns toward sounds within a few weeks",
            "Around 2-3 months, head control in a supported sitting position begins to develop",
            "Supervised tummy time, started in short spells from the first days, builds neck and back strength",
          ],
          es: [
            "Motor: levanta brevemente la cabeza boca abajo, movimientos aún dominados por reflejos primitivos (Moro, agarre, marcha automática)",
            "Visión: distingue los rostros de cerca (20-30 cm), sigue un objeto con la mirada, prefiere los contrastes marcados y los rostros humanos",
            "Audición: se sobresalta con ruidos fuertes, se calma con una voz familiar, gira la cabeza hacia los sonidos desde las primeras semanas",
            "Hacia los 2-3 meses, comienza el control de la cabeza en posición sentada con apoyo",
            "El tiempo boca abajo supervisado (« tummy time »), desde los primeros días en períodos cortos, fortalece los músculos del cuello y la espalda",
          ],
        },
      },
      {
        title: { fr: "Langage & social", en: "Language & social", es: "Lenguaje y social" },
        color: COLORS.ochre,
        illu: "playing",
        items: {
          fr: [
            "Langage : pleure pour communiquer (faim, inconfort, fatigue), commence à faire de petits sons gutturaux vers 6-8 semaines",
            "Social : premier sourire social (en réponse, pas seulement réflexe) vers 6-8 semaines, moment marquant pour les parents",
            "Les périodes d'éveil calme (idéales pour l'interaction) sont courtes mais augmentent graduellement",
          ],
          en: [
            "Language: cries to communicate (hunger, discomfort, tiredness), starts making small throaty sounds around 6-8 weeks",
            "Social: first true social smile (in response, not just reflexive) around 6-8 weeks — a milestone moment for parents",
            "Quiet-alert periods (ideal for interaction) are brief at first but gradually increase",
          ],
          es: [
            "Lenguaje: llora para comunicarse (hambre, incomodidad, cansancio), comienza a hacer pequeños sonidos guturales hacia las 6-8 semanas",
            "Social: primera sonrisa social (en respuesta, no solo refleja) hacia las 6-8 semanas, un momento significativo para los padres",
            "Los períodos de alerta tranquila (ideales para la interacción) son cortos pero aumentan gradualmente",
          ],
        },
      },
      {
        title: { fr: "Sommeil & alimentation", en: "Sleep & feeding", es: "Sueño y alimentación" },
        color: COLORS.sage,
        illu: "cribIllu",
        items: {
          fr: [
            "Sommeil : 14-17 h par jour, en cycles courts de 2-4 h, sans distinction jour/nuit",
            "Le réflexe des points cardinaux et de succion permet l'alimentation dès la naissance",
          ],
          en: [
            "Sleep: 14-17 hours a day, in short 2-4 hour cycles, with no day/night distinction yet",
            "The rooting and sucking reflexes allow feeding from birth",
          ],
          es: [
            "Sueño: 14-17 horas al día, en ciclos cortos de 2-4 horas, sin distinción entre día y noche",
            "El reflejo de búsqueda y succión permite la alimentación desde el nacimiento",
          ],
        },
      },
    ],
  },
  m46: {
    title: { fr: "4 à 6 mois", en: "4 to 6 months", es: "4 a 6 meses" },
    illu: "dev01",
    intro: {
      fr: "Une période charnière : bébé devient de plus en plus actif, curieux, et commence à interagir intentionnellement avec son environnement.",
      en: "A pivotal stretch: baby becomes increasingly active, curious, and starts interacting with the world on purpose.",
      es: "Un período clave: el bebé se vuelve cada vez más activo, curioso, y comienza a interactuar intencionalmente con su entorno.",
    },
    groups: [
      {
        title: { fr: "Motricité & vision", en: "Motor skills & vision", es: "Motricidad y visión" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: [
            "Moteur : tient sa tête fermement, roule sur le ventre puis sur le dos, commence à s'asseoir avec appui vers 5-6 mois",
            "Mains : attrape volontairement les objets, les porte à la bouche pour les explorer, transfère parfois un objet d'une main à l'autre",
            "Vision : perception de la profondeur qui s'améliore, suit des objets en mouvement rapide sur 180 degrés",
            "Développement des réflexes archaïques qui s'estompent (Moro disparaît généralement vers 4-6 mois)",
          ],
          en: [
            "Motor: holds head firmly, rolls tummy-to-back and back-to-tummy, begins sitting with support around 5-6 months",
            "Hands: reaches for and grabs objects on purpose, brings them to the mouth to explore, sometimes passes an object hand to hand",
            "Vision: depth perception improves, tracks fast-moving objects across a full 180 degrees",
            "Primitive reflexes continue to fade (the Moro reflex usually disappears around 4-6 months)",
          ],
          es: [
            "Motor: sostiene la cabeza con firmeza, rueda de boca abajo a boca arriba y viceversa, comienza a sentarse con apoyo hacia los 5-6 meses",
            "Manos: agarra objetos voluntariamente, los lleva a la boca para explorarlos, a veces pasa un objeto de una mano a la otra",
            "Visión: la percepción de profundidad mejora, sigue objetos en movimiento rápido a lo largo de 180 grados",
            "Los reflejos primitivos siguen desapareciendo (el reflejo de Moro generalmente desaparece hacia los 4-6 meses)",
          ],
        },
      },
      {
        title: { fr: "Langage & social", en: "Language & social", es: "Lenguaje y social" },
        color: COLORS.ochre,
        illu: "playing",
        items: {
          fr: [
            "Langage : babille de façon plus élaborée, rit aux éclats, varie l'intonation de ses vocalisations",
            "Social : reconnaît les proches, réagit à son nom, sourit spontanément aux visages familiers, peut manifester une préférence claire pour un parent",
            "Bébé commence à anticiper certains événements familiers (le biberon qui approche, le bain)",
          ],
          en: [
            "Language: babbles in a more elaborate way, laughs out loud, varies the tone of vocalizations",
            "Social: recognizes familiar people, responds to their name, smiles spontaneously at familiar faces, may show a clear preference for one parent",
            "Baby starts anticipating familiar events (a bottle approaching, bath time)",
          ],
          es: [
            "Lenguaje: balbucea de forma más elaborada, ríe a carcajadas, varía la entonación de sus vocalizaciones",
            "Social: reconoce a las personas cercanas, reacciona a su nombre, sonríe espontáneamente a rostros familiares, puede mostrar una clara preferencia por un padre o madre",
            "El bebé comienza a anticipar ciertos eventos familiares (el biberón que se acerca, el baño)",
          ],
        },
      },
      {
        title: { fr: "Sommeil & alimentation", en: "Sleep & feeding", es: "Sueño y alimentación" },
        color: COLORS.sage,
        illu: "babyBottle",
        items: {
          fr: [
            "Alimentation : signes de préparation aux aliments solides vers 6 mois — tient sa tête, s'assoit avec soutien, montre de l'intérêt pour la nourriture, perte du réflexe d'extrusion",
            "Sommeil : les siestes se structurent davantage (2-3 par jour), certaines nuits plus longues apparaissent mais les réveils restent fréquents",
            "Poussée dentaire possible dès 4 mois chez certains bébés : salivation accrue, irritabilité, envie de mordiller",
          ],
          en: [
            "Feeding: signs of readiness for solids around 6 months — holds head up, sits with support, shows interest in food, tongue-thrust reflex fades",
            "Sleep: naps become more structured (2-3 a day), some longer night stretches appear but wake-ups are still frequent",
            "Teething may start as early as 4 months for some babies: extra drooling, irritability, wanting to chew on things",
          ],
          es: [
            "Alimentación: señales de estar listo para sólidos hacia los 6 meses — sostiene la cabeza, se sienta con apoyo, muestra interés por la comida, pierde el reflejo de extrusión",
            "Sueño: las siestas se estructuran más (2-3 al día), aparecen algunas noches más largas pero los despertares siguen siendo frecuentes",
            "La dentición puede comenzar desde los 4 meses en algunos bebés: más salivación, irritabilidad, ganas de morder cosas",
          ],
        },
      },
    ],
  },
  m79: {
    title: { fr: "7 à 9 mois", en: "7 to 9 months", es: "7 a 9 meses" },
    illu: "dev01",
    intro: {
      fr: "Bébé gagne rapidement en mobilité et en compréhension du monde qui l'entoure — c'est souvent la période où les parents doivent « bébé-proofer » la maison.",
      en: "Baby quickly gains mobility and a growing understanding of the world around them — often the stage when parents need to baby-proof the house.",
      es: "El bebé gana rápidamente movilidad y comprensión del mundo que lo rodea — a menudo es el momento en que los padres deben « a prueba de bebés » la casa.",
    },
    groups: [
      {
        title: { fr: "Motricité & mains", en: "Motor skills & hands", es: "Motricidad y manos" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: [
            "Moteur : s'assoit sans appui de façon stable, commence à se déplacer (reptation, quatre pattes, ou d'autres méthodes tout aussi normales)",
            "Mains : développe la pince pouce-index (préhension fine) vers 9 mois, transfère les objets d'une main à l'autre, tape des mains",
            "Peut se tenir debout en s'agrippant à un meuble vers 8-9 mois",
            "Explore activement son environnement : ouvre des tiroirs, tire sur les objets, met tout à la bouche",
          ],
          en: [
            "Motor: sits steadily without support, starts moving around (crawling, scooting, or other equally normal methods)",
            "Hands: develops the pincer grasp (fine motor skill) around 9 months, passes objects hand to hand, claps",
            "May pull to stand holding onto furniture around 8-9 months",
            "Actively explores their environment: opens drawers, pulls on objects, puts everything in their mouth",
          ],
          es: [
            "Motor: se sienta sin apoyo de forma estable, comienza a desplazarse (gateo, arrastre, u otros métodos igualmente normales)",
            "Manos: desarrolla la pinza pulgar-índice (motricidad fina) hacia los 9 meses, pasa objetos de una mano a otra, aplaude",
            "Puede pararse sujetándose de un mueble hacia los 8-9 meses",
            "Explora activamente su entorno: abre cajones, jala objetos, se lleva todo a la boca",
          ],
        },
      },
      {
        title: { fr: "Langage & social", en: "Language & social", es: "Lenguaje y social" },
        color: COLORS.ochre,
        illu: "playing",
        items: {
          fr: [
            "Langage : imite des sons et des intonations, comprend « non » et certains mots familiers, babillage qui commence à ressembler à du langage (« mamama », « dadada »)",
            "Social : anxiété de séparation possible et normale à partir de 7-8 mois, adore le jeu de coucou, commence l'attachement sélectif plus marqué",
            "Développe la permanence de l'objet : comprend qu'un objet caché continue d'exister",
            "Comprend le ton de la voix et les expressions faciales des adultes, réagit différemment selon l'humeur perçue",
            "Bonne période pour introduire des jeux de cause à effet (boîtes à surprise, jouets qui font du bruit)",
          ],
          en: [
            "Language: imitates sounds and intonation, understands 'no' and some familiar words, babbling starts to resemble language ('mamama', 'dadada')",
            "Social: separation anxiety may appear and is normal from 7-8 months on, loves peekaboo, more selective attachment begins",
            "Develops object permanence: understands that a hidden object still exists",
            "Understands tone of voice and adults' facial expressions, reacts differently based on perceived mood",
            "A good time to introduce cause-and-effect toys (pop-up boxes, toys that make sounds)",
          ],
          es: [
            "Lenguaje: imita sonidos y entonaciones, entiende « no » y algunas palabras familiares, el balbuceo empieza a parecerse al lenguaje (« mamama », « dadada »)",
            "Social: la ansiedad de separación puede aparecer y es normal desde los 7-8 meses, le encanta el juego de las escondidas, comienza un apego más selectivo",
            "Desarrolla la permanencia del objeto: entiende que un objeto escondido sigue existiendo",
            "Comprende el tono de voz y las expresiones faciales de los adultos, reacciona de forma diferente según el estado de ánimo percibido",
            "Buen momento para introducir juguetes de causa y efecto (cajas sorpresa, juguetes que hacen ruido)",
          ],
        },
      },
      {
        title: { fr: "Alimentation", en: "Feeding", es: "Alimentación" },
        color: COLORS.sage,
        illu: "babyBottle",
        items: {
          fr: ["Alimentation : passe des purées lisses aux textures plus grumeleuses, commence à manger des morceaux mous avec les doigts"],
          en: ["Feeding: moves from smooth purées to lumpier textures, starts eating soft finger foods"],
          es: ["Alimentación: pasa de purés lisos a texturas más grumosas, comienza a comer trocitos blandos con los dedos"],
        },
      },
    ],
  },
  m1012: {
    title: { fr: "10 à 12 mois", en: "10 to 12 months", es: "10 a 12 meses" },
    illu: "dev01",
    intro: {
      fr: "Le premier anniversaire approche : bébé se rapproche de la marche autonome et de ses premiers vrais mots, deux étapes symboliques pour les parents.",
      en: "The first birthday is approaching: baby is getting close to walking independently and saying real first words, two milestones that feel especially symbolic for parents.",
      es: "Se acerca el primer cumpleaños: el bebé está cada vez más cerca de caminar de forma independiente y decir sus primeras palabras reales, dos hitos especialmente simbólicos para los padres.",
    },
    groups: [
      {
        title: { fr: "Motricité", en: "Motor skills", es: "Motricidad" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: ["Moteur : se déplace en marchant le long des meubles (« croisière »), certains font leurs premiers pas autonomes entre 9 et 15 mois — une large fourchette normale"],
          en: ["Motor: cruises along furniture, some take first independent steps between 9 and 15 months — a wide, normal range"],
          es: ["Motor: camina sujetándose de los muebles (« cruising »), algunos dan sus primeros pasos independientes entre los 9 y 15 meses — un rango amplio y normal"],
        },
      },
      {
        title: { fr: "Langage & social", en: "Language & social", es: "Lenguaje y social" },
        color: COLORS.ochre,
        illu: "playing",
        items: {
          fr: [
            "Langage : dit 1 à 3 mots avec sens (« maman », « papa »), comprend beaucoup plus de mots qu'il n'en dit",
            "Social : imite les gestes des adultes, fait au revoir de la main, pointe pour montrer ou demander quelque chose",
            "Comprend des consignes simples à une étape (« donne-moi », « viens ici »)",
            "Développe des préférences claires pour certains jouets, personnes et activités",
          ],
          en: [
            "Language: says 1 to 3 meaningful words ('mama', 'dada'), understands far more words than they say",
            "Social: imitates adults' gestures, waves bye-bye, points to show or ask for something",
            "Understands simple one-step instructions ('give it to me', 'come here')",
            "Develops clear preferences for certain toys, people, and activities",
          ],
          es: [
            "Lenguaje: dice de 1 a 3 palabras con significado (« mamá », « papá »), entiende muchas más palabras de las que dice",
            "Social: imita los gestos de los adultos, se despide con la mano, señala para mostrar o pedir algo",
            "Comprende instrucciones simples de un paso (« dámelo », « ven aquí »)",
            "Desarrolla preferencias claras por ciertos juguetes, personas y actividades",
          ],
        },
      },
      {
        title: { fr: "Alimentation, sommeil & bilan", en: "Feeding, sleep & check-up", es: "Alimentación, sueño y evaluación" },
        color: COLORS.sage,
        illu: "checklistIllu",
        items: {
          fr: [
            "Alimentation : mange de plus en plus d'aliments de la table en morceaux, commence à utiliser une cuillère (maladroitement)",
            "Peut boire au verre ou à la tasse à bec avec de l'aide",
            "Le sommeil se stabilise souvent davantage, avec 1 à 2 siestes par jour",
            "Premier anniversaire : bon moment pour un bilan de développement avec le professionnel de la santé, incluant les vaccins prévus à cet âge",
            "Chaque enfant progresse à son rythme; un léger retard dans un domaine n'est pas automatiquement préoccupant, mais en discuter avec un professionnel rassure",
          ],
          en: [
            "Feeding: eats more and more table food in pieces, starts using a spoon (clumsily)",
            "May drink from a cup or sippy cup with help",
            "Sleep often becomes more stable, with 1 to 2 naps a day",
            "First birthday: a good time for a developmental check-in with a provider, including age-appropriate vaccines",
            "Every child progresses at their own pace; a mild delay in one area isn't automatically concerning, but discussing it with a provider brings peace of mind",
          ],
          es: [
            "Alimentación: come cada vez más comida de mesa en trozos, comienza a usar una cuchara (con torpeza)",
            "Puede beber de un vaso o taza con pico con ayuda",
            "El sueño suele estabilizarse más, con 1 a 2 siestas al día",
            "Primer cumpleaños: buen momento para una evaluación del desarrollo con el profesional de la salud, incluyendo las vacunas correspondientes a esta edad",
            "Cada niño progresa a su propio ritmo; un ligero retraso en un área no es automáticamente preocupante, pero hablarlo con un profesional da tranquilidad",
          ],
        },
      },
    ],
  },
};

/* ---------------- COMPREHENSIVE MILESTONE TABLE (illustrated, 4 domains x age band, shown above the DEV01 subtabs) ---------------- */
const DEV_MILESTONES = [
  {
    age: { fr: "0-1 mois", en: "0-1 month", es: "0-1 mes" }, color: COLORS.sage, bg: "#F0F5EC",
    motor: { illu: "tummyTimeIllu", items: { fr: ["Lève brièvement la tête sur le ventre", "Bouge bras et jambes"], en: ["Lifts head briefly on tummy", "Moves arms and legs"], es: ["Levanta brevemente la cabeza boca abajo", "Mueve brazos y piernas"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Mains habituellement en poings", "Réflexe d'agrippement"], en: ["Hands usually in fists", "Grasp reflex"], es: ["Manos generalmente en puños", "Reflejo de agarre"] } },
    comm: { illu: "cryIllu", items: { fr: ["Sursaute aux bruits forts", "Pleure pour communiquer"], en: ["Startles at loud noises", "Cries to communicate"], es: ["Se sobresalta con ruidos fuertes", "Llora para comunicarse"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Regarde les visages", "Se calme aux voix familières"], en: ["Looks at faces", "Calms to familiar voices"], es: ["Mira los rostros", "Se calma con voces familiares"] } },
  },
  {
    age: { fr: "1-2 mois", en: "1-2 months", es: "1-2 meses" }, color: COLORS.blue, bg: "#EAF2F8",
    motor: { illu: "tummyTimeIllu", items: { fr: ["Lève la tête plus haut sur le ventre", "Commence à pousser légèrement"], en: ["Lifts head higher on tummy", "Begins to push up slightly"], es: ["Levanta la cabeza más alto boca abajo", "Comienza a empujar ligeramente"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Ouvre les mains plus souvent", "Tient un hochet brièvement"], en: ["Opens hands more often", "Briefly holds a rattle"], es: ["Abre las manos con más frecuencia", "Sostiene un sonajero brevemente"] } },
    comm: { illu: "cooIllu", items: { fr: ["Gazouille, fait des sons", "Tourne la tête vers les sons"], en: ["Coos and makes sounds", "Turns head toward sounds"], es: ["Balbucea, hace sonidos", "Gira la cabeza hacia los sonidos"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Commence à sourire", "Aime regarder les visages"], en: ["Begins to smile", "Enjoys looking at faces"], es: ["Comienza a sonreír", "Le gusta mirar los rostros"] } },
  },
  {
    age: { fr: "3-4 mois", en: "3-4 months", es: "3-4 meses" }, color: COLORS.ochre, bg: "#FBF3E4",
    motor: { illu: "rollSitIllu", items: { fr: ["Tient sa tête bien droite", "Prend appui sur les avant-bras"], en: ["Holds head steady", "Pushes up on forearms"], es: ["Sostiene la cabeza firme", "Se apoya en los antebrazos"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Rapproche ses mains", "Tend les bras vers les jouets"], en: ["Brings hands together", "Reaches for toys"], es: ["Junta las manos", "Extiende los brazos hacia los juguetes"] } },
    comm: { illu: "babbleIllu", items: { fr: ["Babille", "Rit aux éclats"], en: ["Babbles", "Laughs out loud"], es: ["Balbucea", "Ríe a carcajadas"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Reconnaît ses parents", "Sourit spontanément"], en: ["Recognizes parents", "Smiles spontaneously"], es: ["Reconoce a sus padres", "Sonríe espontáneamente"] } },
  },
  {
    age: { fr: "5-6 mois", en: "5-6 months", es: "5-6 meses" }, color: COLORS.pink, bg: "#FDF0F3",
    motor: { illu: "rollSitIllu", items: { fr: ["Se retourne dans les deux sens", "S'assoit avec appui"], en: ["Rolls over both directions", "Sits with support"], es: ["Se voltea en ambos sentidos", "Se sienta con apoyo"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Transfère les jouets d'une main à l'autre", "Ratisse les petits objets"], en: ["Transfers toys hand to hand", "Rakes small objects"], es: ["Pasa juguetes de una mano a otra", "Rastrilla objetos pequeños"] } },
    comm: { illu: "babbleIllu", items: { fr: ["Babillage plus varié", "Répond à son prénom"], en: ["Babbles more consonant sounds", "Responds to own name"], es: ["Balbuceo más variado", "Responde a su nombre"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["S'intéresse à son entourage", "Peut montrer une peur de l'étranger"], en: ["Shows interest in surroundings", "May show stranger anxiety"], es: ["Se interesa por su entorno", "Puede mostrar temor a extraños"] } },
  },
  {
    age: { fr: "7-8 mois", en: "7-8 months", es: "7-8 meses" }, color: COLORS.sage, bg: "#F0F5EC",
    motor: { illu: "crawlingBabyIllu", items: { fr: ["S'assoit sans aide", "Commence à ramper"], en: ["Sits without support", "Begins to crawl"], es: ["Se sienta sin ayuda", "Comienza a gatear"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Ramasse de petits objets (pince pouce-index)", "Cogne les jouets ensemble"], en: ["Picks up small objects with thumb & finger", "Bangs toys together"], es: ["Recoge objetos pequeños (pinza pulgar-índice)", "Golpea juguetes entre sí"] } },
    comm: { illu: "babbleIllu", items: { fr: ["Dit « ba », « da », « ma »", "Imite des sons"], en: ["Says 'ba', 'da', 'ma'", "Imitates sounds"], es: ["Dice « ba », « da », « ma »", "Imita sonidos"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Aime le jeu de coucou", "Montre de l'attachement aux proches"], en: ["Enjoys peek-a-boo", "Shows attachment to caregivers"], es: ["Le gusta el juego de las escondidas", "Muestra apego a sus cuidadores"] } },
  },
  {
    age: { fr: "9-10 mois", en: "9-10 months", es: "9-10 meses" }, color: COLORS.blue, bg: "#EAF2F8",
    motor: { illu: "standCruiseIllu", items: { fr: ["Rampe bien", "Se met debout avec appui"], en: ["Crawls well", "Pulls to stand"], es: ["Gatea bien", "Se pone de pie con apoyo"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Ramasse de tout petits objets", "Pointe avec l'index"], en: ["Picks up tiny objects", "Points with index finger"], es: ["Recoge objetos muy pequeños", "Señala con el índice"] } },
    comm: { illu: "wordsIllu", items: { fr: ["Comprend « non »", "Fait au revoir de la main"], en: ["Understands 'no'", "Waves 'bye-bye'"], es: ["Entiende « no »", "Se despide con la mano"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Participe à des jeux interactifs", "Exprime des émotions variées"], en: ["Plays interactive games", "Shows varied emotions"], es: ["Participa en juegos interactivos", "Expresa emociones variadas"] } },
  },
  {
    age: { fr: "11-12 mois", en: "11-12 months", es: "11-12 meses" }, color: COLORS.ochre, bg: "#FBF3E4",
    motor: { illu: "walkIllu", items: { fr: ["Se tient debout seul brièvement", "Fait ses premiers pas"], en: ["Stands alone briefly", "Takes first steps"], es: ["Se para solo brevemente", "Da sus primeros pasos"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Met des objets dans un contenant", "Mange seul avec les doigts"], en: ["Puts objects in a container", "Feeds self with fingers"], es: ["Pone objetos en un recipiente", "Come solo con los dedos"] } },
    comm: { illu: "talkIllu", items: { fr: ["Dit 1-2 mots en plus de « maman »/« papa »", "Suit des consignes simples"], en: ["Says 1-2 words besides 'mama'/'dada'", "Follows simple instructions"], es: ["Dice 1-2 palabras además de « mamá »/« papá »", "Sigue instrucciones simples"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Imite des actions", "Montre de l'indépendance"], en: ["Imitates actions", "Shows independence"], es: ["Imita acciones", "Muestra independencia"] } },
  },
];

// Maps each DEV01 sub-tab to the relevant, non-overlapping slice of DEV_MILESTONES rows
const DEV_MILESTONE_MAP = {
  m03: [0, 1, 2],   // 0-1, 1-2, 3-4 months
  m46: [3],          // 5-6 months
  m79: [4, 5],       // 7-8, 9-10 months
  m1012: [6],        // 11-12 months
};

const DEV15_MILESTONES = [
  {
    age: { fr: "1-2 ans", en: "1-2 years" }, color: COLORS.blue, bg: "#EAF2F8",
    motor: { illu: "walkIllu", items: { fr: ["Marche seule, commence à courir vers 18 mois"], en: ["Walks alone, starts running around 18 months"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Empile 2-4 blocs, gribouille avec un crayon"], en: ["Stacks 2-4 blocks, scribbles with a crayon"] } },
    comm: { illu: "talkIllu", items: { fr: ["Vocabulaire qui explose, combine 2 mots vers 18-24 mois"], en: ["Vocabulary explodes, combines 2 words around 18-24 months"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Jeu parallèle, imite les activités des adultes"], en: ["Parallel play, imitates adult activities"] } },
  },
  {
    age: { fr: "2-3 ans", en: "2-3 years" }, color: COLORS.ochre, bg: "#FBF3E4",
    motor: { illu: "walkIllu", items: { fr: ["Court bien, saute à deux pieds, pédale un tricycle"], en: ["Runs well, jumps with both feet, pedals a tricycle"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Empile 6+ blocs, tourne les pages d'un livre"], en: ["Stacks 6+ blocks, turns book pages"] } },
    comm: { illu: "talkIllu", items: { fr: ["Phrases de 3+ mots, vocabulaire de 200+ mots"], en: ["3+ word sentences, vocabulary of 200+ words"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Début du jeu associatif; crises liées à la frustration"], en: ["Early associative play; frustration-driven meltdowns"] } },
  },
  {
    age: { fr: "3-4 ans", en: "3-4 years" }, color: COLORS.pink, bg: "#FDF0F3",
    motor: { illu: "walkIllu", items: { fr: ["Alterne les pieds dans les escaliers, saute sur un pied"], en: ["Alternates feet on stairs, hops on one foot"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Tour de 9-10 blocs, prise du crayon plus mature"], en: ["9-10 block tower, more mature crayon grip"] } },
    comm: { illu: "talkIllu", items: { fr: ["Raconte de courtes histoires, vocabulaire de 1000+ mots"], en: ["Tells short stories, vocabulary of 1000+ words"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Joue avec d'autres enfants; propreté de jour acquise"], en: ["Plays with other children; daytime potty trained"] } },
  },
  {
    age: { fr: "4-5 ans", en: "4-5 years" }, color: COLORS.sage, bg: "#F0F5EC",
    motor: { illu: "walkIllu", items: { fr: ["Lance et attrape un ballon, fait du vélo à roulettes"], en: ["Throws and catches a ball, rides a bike with training wheels"] } },
    fine: { illu: "handGraspIllu", items: { fr: ["Dessine une personne, commence à écrire son prénom"], en: ["Draws a person, starts writing their first name"] } },
    comm: { illu: "talkIllu", items: { fr: ["Phrases complexes, comprend les concepts de temps"], en: ["Complex sentences, understands time concepts"] } },
    social: { illu: "smileFaceIllu", items: { fr: ["Amitiés plus stables; meilleure régulation émotionnelle"], en: ["More stable friendships; better emotional regulation"] } },
  },
];

const DEV15_MILESTONE_MAP = {
  a12: [0],
  a23: [1],
  a34: [2],
  a45: [3],
};

/* ---------------- BIG COLORFUL MILESTONE CHART (0 to 5 years, shown at the very top of the page) ---------------- */
const MILESTONE_CHART = [
  {
    age: { fr: "0-3 mois", en: "0-3 months" }, color: COLORS.teal, bg: "#E4EAEE",
    items: [
      { illu: "tummyTimeIllu", label: { fr: "Lève la tête (tummy time)", en: "Lifts head (tummy time)" } },
      { illu: "smileFaceIllu", label: { fr: "Sourit", en: "Smiling" } },
      { illu: "cooIllu", label: { fr: "Gazouille", en: "Cooing" } },
      { illu: "eyesTrackIllu", label: { fr: "Suit des objets", en: "Follows objects" } },
    ],
  },
  {
    age: { fr: "4-6 mois", en: "4-6 months" }, color: COLORS.sage, bg: "#F0F5EC",
    items: [
      { illu: "rollOverIllu", label: { fr: "Se retourne", en: "Rolling over" } },
      { illu: "reachArmsIllu", label: { fr: "Tend les bras", en: "Reaching for toys" } },
      { illu: "spoonIllu", label: { fr: "Débute les solides", en: "Starts solids" } },
      { illu: "babbleIllu", label: { fr: "Babille", en: "Babbling" } },
    ],
  },
  {
    age: { fr: "7-9 mois", en: "7-9 months" }, color: COLORS.ochre, bg: "#FBF3E4",
    items: [
      { illu: "rollSitIllu", label: { fr: "S'assoit seul", en: "Sitting unsupported" } },
      { illu: "crawlingBabyIllu", label: { fr: "Rampe", en: "Crawling" } },
      { illu: "waveHandIllu", label: { fr: "Joue à coucou", en: "Plays peek-a-boo" } },
      { illu: "wordsIllu", label: { fr: "Dit « mama »", en: "Says simple syllables" } },
    ],
  },
  {
    age: { fr: "10-12 mois", en: "10-12 months" }, color: COLORS.blue, bg: "#EAF2F8",
    items: [
      { illu: "standSofaIllu", label: { fr: "Se met debout", en: "Pulls up to stand" } },
      { illu: "standCruiseIllu", label: { fr: "Se déplace (croisière)", en: "Cruising" } },
      { illu: "pinchIllu", label: { fr: "Pince pouce-index", en: "Pincer grasp" } },
      { illu: "waveHandIllu", label: { fr: "Fait au revoir", en: "Waving goodbye" } },
    ],
  },
  {
    age: { fr: "18 mois", en: "18 months" }, color: COLORS.pink, bg: "#FDF0F3",
    items: [
      { illu: "walkIllu", label: { fr: "Marche seul", en: "Walking alone" } },
      { illu: "ladderIllu", label: { fr: "Grimpe", en: "Climbing" } },
      { illu: "talkIllu", label: { fr: "Dit plusieurs mots", en: "Says several words" } },
      { illu: "pointHandIllu", label: { fr: "Pointe une partie du corps", en: "Points to a body part" } },
    ],
  },
  {
    age: { fr: "2 ans", en: "2 years" }, color: COLORS.teal, bg: "#E4EAEE",
    items: [
      { illu: "talkIllu", label: { fr: "Combine 2 mots", en: "Combines 2 words" } },
      { illu: "ballIllu", label: { fr: "Botte un ballon", en: "Kicks a ball" } },
      { illu: "smileFaceIllu", label: { fr: "Montre son indépendance", en: "Shows independence" } },
      { illu: "playing", label: { fr: "Jeu de rôle simple", en: "Simple pretend play" } },
    ],
  },
  {
    age: { fr: "3 ans", en: "3 years" }, color: COLORS.ochre, bg: "#FBF3E4",
    items: [
      { illu: "spoonIllu", label: { fr: "Utilise une cuillère", en: "Uses a spoon" } },
      { illu: "stairsIllu", label: { fr: "Monte les escaliers", en: "Climbs stairs" } },
      { illu: "checklistIllu", label: { fr: "Suit 2 consignes", en: "Follows 2-step instructions" } },
      { illu: "superheroIllu", label: { fr: "Jeu imaginaire", en: "Imaginative play" } },
    ],
  },
  {
    age: { fr: "4 ans", en: "4 years" }, color: "#8F6BAE", bg: "#EFE7F3",
    items: [
      { illu: "walkIllu", label: { fr: "Saute sur un pied", en: "Hopping on one foot" } },
      { illu: "ballIllu", label: { fr: "Attrape/lance un ballon", en: "Catch & throw" } },
      { illu: "colorWheelIllu", label: { fr: "Nomme couleurs & chiffres", en: "Names colors & numbers" } },
      { illu: "talkIllu", label: { fr: "Jeu coopératif", en: "Cooperative play" } },
    ],
  },
  {
    age: { fr: "5 ans", en: "5 years" }, color: "#4A7BA6", bg: "#E4EDF5",
    items: [
      { illu: "bookIllu", label: { fr: "Raconte des histoires", en: "Tells stories" } },
      { illu: "writingIllu", label: { fr: "Écrit son prénom", en: "Writing name" } },
      { illu: "abcLettersIllu", label: { fr: "Reconnaît des lettres", en: "Printed letters" } },
      { illu: "talkIllu", label: { fr: "Parle clairement", en: "Speaking clearly" } },
    ],
  },
];

function MilestoneChartCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Jalons du développement de l'enfant", subtitle: "Un guide pour les parents, de la naissance à 5 ans.", note: "Chaque enfant est unique ! Ce sont des repères généraux." }
    : lang === "es"
    ? { title: "Hitos del desarrollo del niño", subtitle: "Una guía para padres, del nacimiento a los 5 años.", note: "¡Cada niño es único! Estas son pautas generales." }
    : { title: "Child development milestone chart", subtitle: "A guide for parents, birth to 5 years.", note: "Every child is unique! These are general guidelines." };
  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.muted }}>{L.subtitle}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {MILESTONE_CHART.map((group, gi) => {
          const isLast = gi === MILESTONE_CHART.length - 1;
          return (
          <div key={gi} style={{
            background: group.bg, border: `2px solid ${group.color}`, borderRadius: 16, padding: "8px 6px 10px",
            gridColumn: isLast ? "1 / -1" : undefined,
          }}>
            <span style={{
              display: "block", textAlign: "center", background: group.color, color: "#fff", fontSize: 10.5, fontWeight: 800,
              padding: "4px 8px", borderRadius: 999, marginBottom: 8,
            }}>{group.age[lang]}</span>
            <div style={{ display: "grid", gridTemplateColumns: isLast ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 5 }}>
              {group.items.map((it, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: "#fff", marginBottom: 3,
                    display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(47,72,88,0.10)",
                  }}>
                    <Illustration type={it.illu} size={25} />
                  </div>
                  <span style={{ fontSize: 6.8, color: COLORS.text, textAlign: "center", lineHeight: 1.15 }}>{it.label[lang]}</span>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 12, textAlign: "center", fontStyle: "italic" }}>{L.note}</p>
    </Card>
  );
}

function DevMilestonesTable({ lang, rows }) {
  const L = lang === "fr"
    ? {
        title: "Jalons du développement", subtitle: "Un guide rapide — chaque bébé grandit à son propre rythme.",
        age: "Âge", motor: "Motricité", commSocial: "Communication & social",
      }
    : lang === "es"
    ? {
        title: "Hitos del desarrollo", subtitle: "Una guía rápida — cada bebé crece a su propio ritmo.",
        age: "Edad", motor: "Motricidad", commSocial: "Comunicación y social",
      }
    : {
        title: "Developmental milestones", subtitle: "A quick guide — every baby grows at their own pace.",
        age: "Age", motor: "Motor skills", commSocial: "Communication & social",
      };
  const domains = [
    { key: "motor", label: L.motor },
    { key: "commSocial", label: L.commSocial },
  ];
  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.muted }}>{L.subtitle}</p>
      <table style={{ borderCollapse: "separate", borderSpacing: "0 6px", width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "17%" }} />
          <col style={{ width: "41%" }} />
          <col style={{ width: "42%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{
              padding: "0 4px 6px", textAlign: "left", fontSize: 8.5, color: COLORS.muted,
              textTransform: "uppercase", fontWeight: 700,
            }}>{L.age}</th>
            {domains.map((d) => (
              <th key={d.key} style={{
                padding: "0 4px 6px", textAlign: "left", fontSize: 9.5, fontWeight: 800, color: COLORS.teal,
                textTransform: "uppercase", lineHeight: 1.2, whiteSpace: "normal",
              }}>{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td style={{ padding: "10px 4px", verticalAlign: "top", background: `${row.color}26`, borderLeft: `4px solid ${row.color}` }}>
                <span style={{
                  display: "inline-block", background: row.color, color: "#fff", fontSize: 9.5, fontWeight: 800,
                  padding: "3px 6px", borderRadius: 999, lineHeight: 1.2,
                }}>{row.age[lang]}</span>
              </td>
              {domains.map((d) => {
                const cell = d.key === "motor"
                  ? { illu: row.motor.illu, items: { fr: [...row.motor.items.fr, ...row.fine.items.fr], en: [...row.motor.items.en, ...row.fine.items.en] } }
                  : { illu: row.comm.illu, items: { fr: [...row.comm.items.fr, ...row.social.items.fr], en: [...row.comm.items.en, ...row.social.items.en] } };
                return (
                  <td key={d.key} style={{
                    padding: "10px 6px", verticalAlign: "top", background: `${row.color}26`,
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, background: "#fff", display: "flex",
                      alignItems: "center", justifyContent: "center", marginBottom: 4, boxShadow: "0 1px 4px rgba(47,72,88,0.12)",
                    }}>
                      <Illustration type={cell.illu} size={18} />
                    </div>
                    <ul style={{ margin: 0, padding: 0 }}>
                      {cell.items[lang].map((it, i) => (
                        <li key={i} style={{ display: "flex", gap: 3, alignItems: "flex-start", listStyle: "none", marginBottom: 2 }}>
                          <span style={{ width: 3, height: 3, borderRadius: "50%", background: row.color, marginTop: 5, flexShrink: 0 }} />
                          <span style={{ fontSize: 9.5, color: COLORS.text, lineHeight: 1.25 }}>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}


/* ---------------- DEVELOPMENT 1-5 DATA ---------------- */
const DEV15 = {
  a12: {
    title: { fr: "1 à 2 ans", en: "1 to 2 years", es: "1 a 2 años" },
    illu: "dev15",
    intro: {
      fr: "La deuxième année est marquée par une explosion d'autonomie : l'enfant marche, explore, communique de plus en plus et commence à affirmer sa volonté propre.",
      en: "The second year brings a burst of independence: the child walks, explores, communicates more and more, and starts asserting their own will.",
      es: "El segundo año está marcado por una explosión de autonomía: el niño camina, explora, se comunica cada vez más y comienza a afirmar su propia voluntad.",
    },
    groups: [
      {
        title: { fr: "Motricité", en: "Motor skills", es: "Motricidad" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: [
            "Moteur : marche seul dès 12-15 mois (large fourchette normale), commence à courir vers 18 mois, monte les escaliers avec aide en tenant la rampe",
            "Peut faire une tour de 2 à 4 blocs vers 18 mois, gribouille spontanément avec un crayon",
          ],
          en: [
            "Motor: walks alone by 12-15 months (a wide normal range), starts running around 18 months, climbs stairs with help holding the rail",
            "Can stack 2 to 4 blocks around 18 months, scribbles spontaneously with a crayon",
          ],
          es: [
            "Motor: camina solo desde los 12-15 meses (rango normal amplio), comienza a correr hacia los 18 meses, sube escaleras con ayuda sujetando el pasamanos",
            "Puede apilar de 2 a 4 bloques hacia los 18 meses, garabatea espontáneamente con un lápiz",
          ],
        },
      },
      {
        title: { fr: "Langage & social", en: "Language & social", es: "Lenguaje y social" },
        color: COLORS.ochre,
        illu: "playing",
        items: {
          fr: [
            "Langage : vocabulaire qui explose entre 12 et 24 mois (de quelques mots à 50+ mots), combine 2 mots vers 18-24 mois (« veux lait », « papa parti »)",
            "Social : jeu parallèle (joue à côté des autres enfants, pas encore vraiment avec eux), imite les activités des adultes (balayer, parler au téléphone)",
            "Comprend beaucoup plus de mots qu'il n'en dit; suit des consignes simples en 2 étapes vers 2 ans",
            "Développe la permanence de l'objet plus solidement, aime chercher des objets cachés",
            "Vers 18-24 mois, début du jeu symbolique simple (faire semblant de nourrir une poupée)",
          ],
          en: [
            "Language: vocabulary explodes between 12 and 24 months (from a few words to 50+ words), combines 2 words around 18-24 months ('want milk', 'daddy gone')",
            "Social: parallel play (plays near other children, not yet really with them), imitates adult activities (sweeping, talking on the phone)",
            "Understands far more words than they say; follows simple 2-step instructions by age 2",
            "Develops object permanence more solidly, enjoys looking for hidden objects",
            "Around 18-24 months, simple pretend play begins (feeding a doll)",
          ],
          es: [
            "Lenguaje: el vocabulario explota entre los 12 y 24 meses (de unas pocas palabras a 50+ palabras), combina 2 palabras hacia los 18-24 meses (« quiero leche », « papá se fue »)",
            "Social: juego paralelo (juega cerca de otros niños, aún no realmente con ellos), imita actividades de los adultos (barrer, hablar por teléfono)",
            "Entiende muchas más palabras de las que dice; sigue instrucciones simples de 2 pasos hacia los 2 años",
            "Desarrolla la permanencia del objeto de forma más sólida, le gusta buscar objetos escondidos",
            "Hacia los 18-24 meses, comienza el juego simbólico simple (fingir alimentar a una muñeca)",
          ],
        },
      },
      {
        title: { fr: "Autonomie & émotions", en: "Independence & emotions", es: "Autonomía y emociones" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Autonomie : mange seul avec les doigts puis une cuillère (maladroitement), boit au verre avec un peu d'aide, commence à retirer certains vêtements",
            "L'angoisse de séparation peut culminer autour de 12-18 mois puis diminuer progressivement",
            "Les crises émotionnelles commencent à apparaître à mesure que le désir d'autonomie dépasse les capacités de communication",
          ],
          en: [
            "Independence: self-feeds with fingers then a spoon (messily), drinks from a cup with a bit of help, starts taking off some clothing",
            "Separation anxiety may peak around 12-18 months, then gradually ease",
            "Emotional meltdowns start to appear as the drive for independence outpaces communication skills",
          ],
          es: [
            "Autonomía: se alimenta solo con los dedos y luego con cuchara (con torpeza), bebe de un vaso con algo de ayuda, comienza a quitarse algunas prendas",
            "La ansiedad de separación puede alcanzar su punto máximo hacia los 12-18 meses y luego disminuir gradualmente",
            "Las crisis emocionales comienzan a aparecer a medida que el deseo de autonomía supera las capacidades de comunicación",
          ],
        },
      },
    ],
  },
  a23: {
    title: { fr: "2 à 3 ans", en: "2 to 3 years", es: "2 a 3 años" },
    illu: "dev15",
    intro: {
      fr: "L'âge des « terrible twos » : l'enfant affirme fortement sa volonté tout en développant rapidement son langage et sa motricité. La frustration fait partie normale de cette étape.",
      en: "The 'terrible twos': the child strongly asserts their will while quickly building language and motor skills. Frustration is a normal part of this stage.",
      es: "La edad de los « terribles dos »: el niño afirma fuertemente su voluntad mientras desarrolla rápidamente su lenguaje y motricidad. La frustración es una parte normal de esta etapa.",
    },
    groups: [
      {
        title: { fr: "Motricité", en: "Motor skills", es: "Motricidad" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: [
            "Moteur : court bien, saute à deux pieds, pédale un tricycle, monte et descend les escaliers en tenant la rampe (un pied à la fois)",
            "Motricité fine : empile 6 blocs ou plus, tourne les pages d'un livre une à la fois, commence à utiliser des ciseaux à bouts ronds avec supervision",
          ],
          en: [
            "Motor: runs well, jumps with both feet, pedals a tricycle, goes up and down stairs holding the rail (one foot at a time)",
            "Fine motor: stacks 6+ blocks, turns book pages one at a time, starts using round-tipped scissors with supervision",
          ],
          es: [
            "Motor: corre bien, salta con ambos pies, pedalea un triciclo, sube y baja escaleras sujetando el pasamanos (un pie a la vez)",
            "Motricidad fina: apila 6 o más bloques, pasa las páginas de un libro una por una, comienza a usar tijeras de punta redonda con supervisión",
          ],
        },
      },
      {
        title: { fr: "Langage & social", en: "Language & social", es: "Lenguaje y social" },
        color: COLORS.ochre,
        illu: "playing",
        items: {
          fr: [
            "Langage : phrases de 3 mots et plus, vocabulaire de 200 mots et plus vers 3 ans, utilise des pronoms (« je », « moi », « toi »)",
            "Social : début du jeu associatif (interagit brièvement avec d'autres enfants), imite les adultes de façon plus élaborée, jeu symbolique qui se développe",
            "Pose de plus en plus de questions, curiosité grandissante pour le pourquoi et le comment des choses",
            "Le jeu en parallèle évolue progressivement vers de courtes interactions coopératives",
            "Peut nommer des parties du corps, des couleurs de base et des objets familiers dans des livres d'images",
          ],
          en: [
            "Language: 3+ word sentences, vocabulary of 200+ words by age 3, uses pronouns ('I', 'me', 'you')",
            "Social: early associative play (brief interactions with other children), imitates adults in more elaborate ways, pretend play develops",
            "Asks more and more questions, growing curiosity about the why and how of things",
            "Parallel play gradually evolves into brief cooperative interactions",
            "Can name body parts, basic colors, and familiar objects in picture books",
          ],
          es: [
            "Lenguaje: frases de 3 palabras o más, vocabulario de 200 palabras o más hacia los 3 años, usa pronombres (« yo », « mí », « tú »)",
            "Social: comienza el juego asociativo (interactúa brevemente con otros niños), imita a los adultos de forma más elaborada, el juego simbólico se desarrolla",
            "Hace cada vez más preguntas, curiosidad creciente por el porqué y el cómo de las cosas",
            "El juego paralelo evoluciona gradualmente hacia interacciones cooperativas breves",
            "Puede nombrar partes del cuerpo, colores básicos y objetos familiares en libros ilustrados",
          ],
        },
      },
      {
        title: { fr: "Autonomie & émotions", en: "Independence & emotions", es: "Autonomía y emociones" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Autonomie : commence l'apprentissage de la propreté, s'habille partiellement seul, lave et sèche ses mains avec de l'aide",
            "Émotions : peut vivre des crises intenses liées à la frustration (« terrible twos ») — normal, lié à l'écart entre les désirs et les capacités de régulation",
            "Développe le concept de « à moi » et peut avoir de la difficulté à partager",
          ],
          en: [
            "Independence: begins potty training, partially dresses self, washes and dries hands with help",
            "Emotions: may have intense frustration-driven meltdowns ('terrible twos') — normal, tied to the gap between wants and self-regulation skills",
            "Develops the concept of 'mine' and may struggle with sharing",
          ],
          es: [
            "Autonomía: comienza el aprendizaje del control de esfínteres, se viste parcialmente solo, se lava y seca las manos con ayuda",
            "Emociones: puede tener crisis intensas ligadas a la frustración (« terribles dos ») — normal, ligado a la brecha entre los deseos y las capacidades de autorregulación",
            "Desarrolla el concepto de « mío » y puede tener dificultad para compartir",
          ],
        },
      },
    ],
  },
  a34: {
    title: { fr: "3 à 4 ans", en: "3 to 4 years", es: "3 a 4 años" },
    illu: "dev15",
    intro: {
      fr: "L'enfant devient un vrai petit conversationniste, joue davantage avec les autres, et acquiert souvent la propreté de jour durant cette année charnière.",
      en: "The child becomes a real little conversationalist, plays more with others, and often achieves daytime potty training during this pivotal year.",
      es: "El niño se convierte en un verdadero pequeño conversador, juega más con otros, y a menudo logra el control de esfínteres de día durante este año clave.",
    },
    groups: [
      {
        title: { fr: "Motricité", en: "Motor skills", es: "Motricidad" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: [
            "Moteur : monte les escaliers en alternant les pieds, saute sur un pied, lance une balle par-dessus l'épaule avec plus de précision",
            "Dessine des formes reconnaissables (cercle, croix), commence à dessiner une personne simplifiée (« tétard »)",
            "Motricité fine : construit une tour de 9-10 blocs, tient un crayon avec une prise plus mature (prise en trépied)",
          ],
          en: [
            "Motor: alternates feet on stairs, hops on one foot, throws a ball overhand with more accuracy",
            "Draws recognizable shapes (circle, cross), starts drawing a simplified person ('tadpole' figure)",
            "Fine motor: builds a tower of 9-10 blocks, holds a crayon with a more mature (tripod) grip",
          ],
          es: [
            "Motor: sube escaleras alternando los pies, salta en un pie, lanza una pelota por encima del hombro con mayor precisión",
            "Dibuja formas reconocibles (círculo, cruz), comienza a dibujar una persona simplificada (figura « renacuajo »)",
            "Motricidad fina: construye una torre de 9-10 bloques, sostiene un lápiz con un agarre más maduro (agarre en trípode)",
          ],
        },
      },
      {
        title: { fr: "Langage & social", en: "Language & social", es: "Lenguaje y social" },
        color: COLORS.ochre,
        illu: "playing",
        items: {
          fr: [
            "Langage : raconte de courtes histoires, pose beaucoup de « pourquoi », phrases de 4-5 mots, vocabulaire de 1000+ mots",
            "Social : joue avec d'autres enfants de façon plus soutenue, partage parfois spontanément, comprend et suit des règles simples de jeu",
            "Comprend les concepts de quantité simples (un, plusieurs, plus/moins) et certaines notions spatiales (dessus, dessous, dedans)",
            "Peut suivre une conversation simple avec un adulte et répondre à des questions sur des événements récents",
            "Développe l'imagination de façon marquée : jeux de rôle élaborés, amis imaginaires possibles",
            "Certains enfants peuvent commencer à reconnaître leur prénom écrit et quelques lettres",
          ],
          en: [
            "Language: tells short stories, asks many 'why' questions, 4-5 word sentences, vocabulary of 1000+ words",
            "Social: plays with other children more consistently, sometimes shares spontaneously, understands and follows simple game rules",
            "Understands simple quantity concepts (one, many, more/less) and some spatial notions (on, under, inside)",
            "Can follow a simple conversation with an adult and answer questions about recent events",
            "Imagination develops markedly: elaborate pretend play, possible imaginary friends",
            "Some children may start recognizing their written name and a few letters",
          ],
          es: [
            "Lenguaje: cuenta historias cortas, hace muchos « por qué », frases de 4-5 palabras, vocabulario de 1000+ palabras",
            "Social: juega con otros niños de forma más sostenida, a veces comparte espontáneamente, comprende y sigue reglas simples de juego",
            "Comprende conceptos simples de cantidad (uno, varios, más/menos) y algunas nociones espaciales (encima, debajo, dentro)",
            "Puede seguir una conversación simple con un adulto y responder preguntas sobre eventos recientes",
            "Desarrolla la imaginación de forma marcada: juegos de roles elaborados, posibles amigos imaginarios",
            "Algunos niños pueden empezar a reconocer su nombre escrito y algunas letras",
          ],
        },
      },
      {
        title: { fr: "Autonomie & émotions", en: "Independence & emotions", es: "Autonomía y emociones" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Autonomie : la propreté de jour est généralement acquise (la nuit peut suivre plus tard), commence à s'habiller avec supervision minimale",
            "Les peurs (noir, monstres, séparation) peuvent apparaître ou s'intensifier — normal à cet âge",
          ],
          en: [
            "Independence: daytime potty training is usually complete (nighttime may follow later), starts dressing with minimal supervision",
            "Fears (the dark, monsters, separation) may appear or intensify — normal at this age",
          ],
          es: [
            "Autonomía: el control de esfínteres de día generalmente está logrado (el de noche puede seguir más tarde), comienza a vestirse con supervisión mínima",
            "Los miedos (oscuridad, monstruos, separación) pueden aparecer o intensificarse — normal a esta edad",
          ],
        },
      },
    ],
  },
  a45: {
    title: { fr: "4 à 5 ans", en: "4 to 5 years", es: "4 a 5 años" },
    illu: "dev15",
    intro: {
      fr: "La dernière année avant l'entrée scolaire : l'enfant gagne en autonomie, en habiletés sociales et développe les bases nécessaires aux apprentissages scolaires.",
      en: "The last year before starting school: the child gains independence and social skills, and builds the foundations needed for school-based learning.",
      es: "El último año antes de empezar la escuela: el niño gana autonomía, habilidades sociales y desarrolla las bases necesarias para el aprendizaje escolar.",
    },
    groups: [
      {
        title: { fr: "Motricité", en: "Motor skills", es: "Motricidad" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: [
            "Moteur : lance et attrape un ballon avec assez de précision, fait du vélo avec roues stabilisatrices, saute à la corde de façon rudimentaire",
            "Motricité fine plus précise : dessine une personne avec plusieurs parties du corps, commence à écrire son prénom",
            "Prêt pour les apprentissages préscolaires : reconnaît plusieurs lettres et chiffres, découpe le long d'une ligne avec des ciseaux, copie des formes simples",
          ],
          en: [
            "Motor: throws and catches a ball with decent accuracy, rides a bike with training wheels, attempts basic rope jumping",
            "Finer motor skills: draws a person with several body parts, starts writing their first name",
            "Ready for preschool skills: recognizes several letters and numbers, cuts along a line with scissors, copies simple shapes",
          ],
          es: [
            "Motor: lanza y atrapa una pelota con bastante precisión, anda en bicicleta con ruedas de entrenamiento, salta la cuerda de forma rudimentaria",
            "Motricidad fina más precisa: dibuja una persona con varias partes del cuerpo, comienza a escribir su nombre",
            "Listo para los aprendizajes preescolares: reconoce varias letras y números, corta a lo largo de una línea con tijeras, copia formas simples",
          ],
        },
      },
      {
        title: { fr: "Langage & social", en: "Language & social", es: "Lenguaje y social" },
        color: COLORS.ochre,
        illu: "playing",
        items: {
          fr: [
            "Langage : phrases complexes et bien structurées, comprend les concepts de temps de base (hier, demain, plus tard), raconte des histoires avec un début et une fin",
            "Social : amitiés plus stables et significatives, jeu coopératif avec règles, négocie avec les pairs, commence à comprendre le point de vue des autres",
            "Comprend et suit des consignes en plusieurs étapes, développe la capacité de planifier une activité simple",
            "Curiosité marquée pour les concepts abstraits : le temps qui passe, la mort, l'espace, les grandes questions existentielles",
          ],
          en: [
            "Language: complex, well-structured sentences, understands basic time concepts (yesterday, tomorrow, later), tells stories with a beginning and an end",
            "Social: friendships become more stable and meaningful, cooperative play with rules, negotiates with peers, begins to understand others' points of view",
            "Understands and follows multi-step instructions, develops the ability to plan a simple activity",
            "Marked curiosity about abstract concepts: the passage of time, death, space, big existential questions",
          ],
          es: [
            "Lenguaje: frases complejas y bien estructuradas, comprende conceptos básicos de tiempo (ayer, mañana, más tarde), cuenta historias con principio y fin",
            "Social: las amistades se vuelven más estables y significativas, juego cooperativo con reglas, negocia con sus pares, comienza a comprender el punto de vista de otros",
            "Comprende y sigue instrucciones de varios pasos, desarrolla la capacidad de planificar una actividad simple",
            "Curiosidad marcada por conceptos abstractos: el paso del tiempo, la muerte, el espacio, las grandes preguntas existenciales",
          ],
        },
      },
      {
        title: { fr: "Autonomie & bilan", en: "Independence & check-up", es: "Autonomía y evaluación" },
        color: COLORS.sage,
        illu: "checklistIllu",
        items: {
          fr: [
            "Autonomie : s'habille seul (y compris les boutons et fermetures simples), se lave les mains sans aide, propreté nocturne en cours d'acquisition chez la majorité",
            "Meilleure régulation émotionnelle : peut nommer ses émotions et commence à utiliser des stratégies simples pour se calmer",
            "Bilan de santé préscolaire recommandé, incluant vision, audition et mise à jour vaccinale avant l'entrée à l'école",
          ],
          en: [
            "Independence: dresses self (including simple buttons and zippers), washes hands unaided, nighttime potty training is developing in most children",
            "Better emotional regulation: can name their emotions and starts using simple calming strategies",
            "A preschool check-up is recommended, including vision, hearing, and vaccine updates before starting school",
          ],
          es: [
            "Autonomía: se viste solo (incluyendo botones y cierres simples), se lava las manos sin ayuda, el control nocturno se está desarrollando en la mayoría",
            "Mejor regulación emocional: puede nombrar sus emociones y comienza a usar estrategias simples para calmarse",
            "Se recomienda una evaluación de salud preescolar, incluyendo visión, audición y actualización de vacunas antes de empezar la escuela",
          ],
        },
      },
    ],
  },
  proprete: {
    title: { fr: "Apprentissage de la propreté", en: "Potty training", es: "Aprendizaje del control de esfínteres" },
    illu: "potty",
    intro: {
      fr: "L'apprentissage de la propreté est un processus, pas un événement ponctuel. Le rythme de chaque enfant est différent, et la pression n'accélère généralement pas les choses.",
      en: "Potty training is a process, not a single event. Every child's pace is different, and pressure usually doesn't speed things up.",
      es: "El aprendizaje del control de esfínteres es un proceso, no un evento puntual. El ritmo de cada niño es diferente, y la presión generalmente no acelera las cosas.",
    },
    groups: [
      {
        title: { fr: "Signes de préparation", en: "Readiness signs", es: "Señales de preparación" },
        color: COLORS.sage,
        illu: "potty",
        items: {
          fr: [
            "La majorité des enfants sont prêts entre 2 et 3 ans, rarement avant 18 mois; les filles sont parfois prêtes un peu plus tôt que les garçons, en moyenne",
            "Signes de préparation physique : couche sèche plus de 2 heures, selles prévisibles, capacité à monter et descendre un escalier",
            "Signes de préparation psychologique : exprime l'inconfort d'une couche souillée, imite les parents, montre de l'intérêt pour la toilette, peut suivre des consignes simples",
          ],
          en: [
            "Most children are ready between 2 and 3 years old, rarely before 18 months; girls are sometimes ready a bit earlier than boys, on average",
            "Physical readiness signs: stays dry for 2+ hours, predictable bowel movements, able to go up and down stairs",
            "Psychological readiness signs: expresses discomfort with a soiled diaper, imitates parents, shows interest in the toilet, can follow simple instructions",
          ],
          es: [
            "La mayoría de los niños están listos entre los 2 y 3 años, rara vez antes de los 18 meses; en promedio, las niñas a veces están listas un poco antes que los niños",
            "Señales de preparación física: permanece seco más de 2 horas, deposiciones predecibles, capacidad de subir y bajar escaleras",
            "Señales de preparación psicológica: expresa incomodidad por un pañal sucio, imita a los padres, muestra interés por el baño, puede seguir instrucciones simples",
          ],
        },
      },
      {
        title: { fr: "Bonne approche", en: "Getting it right", es: "Un buen enfoque" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Approche positive : encouragements, régularité, sans pression ni punition en cas d'accident — l'humiliation ralentit l'apprentissage",
            "Choisir un moment stable dans la vie de l'enfant (pas pendant un déménagement, l'arrivée d'un nouveau bébé, ou un changement de garderie)",
            "Un pot ou un siège adapté sur la toilette, avec un marchepied, aide l'enfant à se sentir en sécurité et à pousser efficacement",
            "La propreté de jour est habituellement acquise avant la propreté nocturne, parfois par plusieurs mois, voire années d'écart",
          ],
          en: [
            "Positive approach: encouragement, consistency, no pressure or punishment for accidents — shaming slows down the learning process",
            "Choose a stable period in the child's life to start (not during a move, a new sibling's arrival, or a daycare change)",
            "A potty or an adapted toilet seat with a step stool helps the child feel secure and push effectively",
            "Daytime training is usually achieved before nighttime training, sometimes months or even years apart",
          ],
          es: [
            "Enfoque positivo: aliento, regularidad, sin presión ni castigo en caso de accidente — la humillación ralentiza el aprendizaje",
            "Elegir un momento estable en la vida del niño para comenzar (no durante una mudanza, la llegada de un nuevo bebé, o un cambio de guardería)",
            "Una bacinica o un asiento adaptado para el inodoro, con un banquito, ayuda al niño a sentirse seguro y a pujar eficazmente",
            "El control diurno generalmente se logra antes que el nocturno, a veces con meses o incluso años de diferencia",
          ],
        },
      },
      {
        title: { fr: "Accidents & régressions normales", en: "Normal accidents & setbacks", es: "Accidentes y retrocesos normales" },
        color: COLORS.pink,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Les accidents sont normaux et fréquents durant tout l'apprentissage, particulièrement en période d'excitation ou de jeu intense",
            "Les régressions sont fréquentes lors de changements de vie (nouvel enfant, déménagement, stress) et ne signifient pas un échec",
            "L'énurésie nocturne (pipi au lit) reste normale jusqu'à 5-7 ans; consulter si elle persiste au-delà ou si elle réapparaît après une longue période de propreté",
            "Certains enfants apprennent en quelques jours, d'autres prennent plusieurs mois — les deux sont normaux",
          ],
          en: [
            "Accidents are normal and common throughout the learning process, especially during excitement or intense play",
            "Setbacks are common during life changes (a new sibling, moving, stress) and don't mean training has failed",
            "Bedwetting remains normal up to ages 5-7; see a provider if it persists beyond that or reappears after a long dry period",
            "Some children learn in a few days, others take several months — both are normal",
          ],
          es: [
            "Los accidentes son normales y frecuentes durante todo el aprendizaje, especialmente en momentos de excitación o juego intenso",
            "Los retrocesos son frecuentes durante cambios de vida (un nuevo hijo, una mudanza, estrés) y no significan un fracaso",
            "La enuresis nocturna (orinarse en la cama) sigue siendo normal hasta los 5-7 años; consultar si persiste más allá o reaparece después de un largo período de control",
            "Algunos niños aprenden en pocos días, otros tardan varios meses — ambos son normales",
          ],
        },
      },
    ],
  },
  jeu: {
    title: { fr: "Socialisation & jeu", en: "Socializing & play" },
    illu: "playing",
    intro: {
      fr: "Le jeu n'est pas qu'un divertissement : c'est le principal moteur du développement cognitif, social et émotionnel de l'enfant entre 1 et 5 ans.",
      en: "Play isn't just entertainment: it's the main engine driving a child's cognitive, social, and emotional development between ages 1 and 5.",
    },
    groups: [
      {
        title: { fr: "Le pouvoir du jeu", en: "The power of play" },
        color: COLORS.pink,
        illu: "playing",
        items: {
          fr: [
            "Le jeu libre (non dirigé par un adulte) favorise la créativité, la résolution de problèmes et la régulation émotionnelle",
            "Évolution du jeu social : solitaire (0-2 ans) → parallèle (2-3 ans) → associatif (3-4 ans) → coopératif (4-5 ans et plus)",
            "Le jeu symbolique (faire semblant) se développe fortement entre 2 et 5 ans et soutient le développement du langage et de l'empathie",
            "Les amis imaginaires sont fréquents et sains entre 3 et 5 ans : ils soutiennent l'imagination et parfois la gestion des émotions",
          ],
          en: [
            "Free play (not adult-directed) builds creativity, problem-solving, and emotional regulation",
            "Social play evolves: solitary (0-2 years) → parallel (2-3 years) → associative (3-4 years) → cooperative (4-5+ years)",
            "Pretend play develops strongly between ages 2 and 5 and supports both language development and empathy",
            "Imaginary friends are common and healthy between ages 3 and 5: they support imagination and sometimes emotion management",
          ],
        },
      },
      {
        title: { fr: "Jeu actif & construction", en: "Active & building play" },
        color: COLORS.blue,
        illu: "crawling",
        items: {
          fr: [
            "Le jeu physique actif (courir, grimper, sauter) est essentiel au développement moteur et à la régulation de l'énergie et des émotions",
            "Les jeux de construction (blocs, casse-têtes) développent la pensée logique et la motricité fine",
            "Le jeu extérieur, même par mauvais temps adapté, favorise la santé physique et l'exploration sensorielle",
          ],
          en: [
            "Active physical play (running, climbing, jumping) is essential for motor development and regulating energy and emotions",
            "Building/construction play (blocks, puzzles) develops logical thinking and fine motor skills",
            "Outdoor play, even in adapted bad-weather gear, supports physical health and sensory exploration",
          ],
        },
      },
      {
        title: { fr: "Vie sociale, écrans & lecture", en: "Social life, screens & reading" },
        color: COLORS.sage,
        illu: "checklistIllu",
        items: {
          fr: [
            "Les activités de groupe (garderie, halte-garderie, cours parent-enfant) soutiennent le développement des habiletés sociales : partage, tour de rôle, résolution de conflits",
            "Limiter les écrans : aucun écran recommandé avant 18-24 mois (sauf appels vidéo), maximum 1 heure par jour de contenu de qualité entre 2 et 5 ans",
            "La lecture partagée quotidienne, même de quelques minutes, stimule le langage, l'attention et le lien affectif",
            "L'ennui occasionnel n'est pas négatif : il pousse l'enfant à développer sa créativité et son autonomie de jeu",
          ],
          en: [
            "Group activities (daycare, playgroups, parent-child classes) support social skills: sharing, taking turns, resolving conflict",
            "Limit screen time: no screens recommended before 18-24 months (except video calls), a maximum of 1 hour a day of quality content between ages 2 and 5",
            "Daily shared reading, even for a few minutes, boosts language, attention, and the parent-child bond",
            "Occasional boredom isn't a bad thing: it pushes the child to build their own creativity and play independence",
          ],
        },
      },
    ],
  },
};


/* ---------------- FEEDING DATA ---------------- */
const FEEDING = {
  intro: {
    title: { fr: "Introduction des aliments (dès 6 mois)", en: "Starting solids (from 6 months)", es: "Introducción de alimentos (desde los 6 meses)" },
    intro: {
      fr: "Le passage aux aliments solides est une étape excitante, mais qui suscite souvent des questions. Voici les repères essentiels pour démarrer en confiance.",
      en: "Starting solids is an exciting milestone that often raises a lot of questions. Here are the essential guidelines to get started with confidence.",
      es: "El paso a los alimentos sólidos es una etapa emocionante, pero que suele generar muchas preguntas. Aquí están las pautas esenciales para comenzar con confianza.",
    },
    groups: [
      {
        title: { fr: "Signes & timing", en: "Signs & timing", es: "Señales y momento" },
        color: COLORS.ochre,
        illu: "alimentation",
        items: {
          fr: [
            "Signes de préparation : tient sa tête fermement, s'assoit avec soutien, montre de l'intérêt pour la nourriture, perte du réflexe d'extrusion",
            "L'âge recommandé pour commencer est autour de 6 mois, ni trop tôt (système digestif encore immature) ni trop tard (besoins nutritionnels et moteurs)",
          ],
          en: [
            "Signs of readiness: holds head steady, sits with support, shows interest in food, tongue-thrust reflex has faded",
            "The recommended age to start is around 6 months, not too early (digestive system still immature) nor too late (nutritional and motor needs)",
          ],
          es: [
            "Señales de preparación: sostiene la cabeza con firmeza, se sienta con apoyo, muestra interés por la comida, ha perdido el reflejo de extrusión",
            "La edad recomendada para comenzar es alrededor de los 6 meses, ni muy temprano (sistema digestivo aún inmaduro) ni muy tarde (necesidades nutricionales y motoras)",
          ],
        },
      },
      {
        title: { fr: "Comment introduire", en: "How to introduce solids", es: "Cómo introducir los alimentos" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Deux approches possibles, souvent combinées : les purées à la cuillère, ou l'alimentation autonome dirigée par l'enfant (DME/baby-led weaning)",
            "Commencer par des purées lisses puis épaissir la texture graduellement sur plusieurs semaines, en ajoutant de petits morceaux mous vers 8-9 mois",
            "Introduire un nouvel aliment à la fois, en espaçant de 2 à 3 jours, pour repérer facilement une réaction allergique ou une intolérance",
            "Offrir de l'eau en petite quantité dans une tasse ouverte ou à bec dès 6 mois, en complément (pas en remplacement) du lait",
            "Commencer par des aliments riches en fer dès les premiers repas (viande, légumineuses, céréales enrichies)",
          ],
          en: [
            "Two possible approaches, often combined: spoon-fed purées, or baby-led weaning with soft, appropriately sized pieces",
            "Start with smooth purées, then thicken texture gradually over several weeks, adding small soft lumps around 8-9 months",
            "Introduce one new food at a time, 2-3 days apart, to easily spot an allergic reaction or intolerance",
            "Offer small amounts of water in an open or spouted cup from 6 months on, in addition to (not instead of) milk",
            "Start with iron-rich foods from the very first meals (meat, legumes, fortified cereals)",
          ],
          es: [
            "Dos enfoques posibles, a menudo combinados: purés con cuchara, o alimentación autodirigida por el bebé (baby-led weaning)",
            "Comenzar con purés lisos y luego espesar la textura gradualmente durante varias semanas, agregando pequeños trocitos blandos hacia los 8-9 meses",
            "Introducir un nuevo alimento a la vez, con 2 a 3 días de diferencia, para identificar fácilmente una reacción alérgica o intolerancia",
            "Ofrecer agua en pequeña cantidad en una taza abierta o con pico desde los 6 meses, como complemento (no en reemplazo) de la leche",
            "Comenzar con alimentos ricos en hierro desde las primeras comidas (carne, legumbres, cereales fortificados)",
          ],
        },
      },
      {
        title: { fr: "Bon à savoir", en: "Good to know", es: "Bueno saber" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Le lait maternel ou la préparation commerciale reste la principale source de nutrition jusqu'à 12 mois, les solides sont complémentaires au début",
            "Respecter l'appétit de l'enfant : ne jamais forcer à finir une portion, les besoins varient d'un repas à l'autre",
            "S'attendre à ce que bébé mange peu au début : les premiers repas sont surtout une découverte sensorielle",
            "Toujours superviser les repas et connaître les manœuvres de premiers soins en cas d'étouffement",
          ],
          en: [
            "Breast milk or commercial formula remains the main source of nutrition until 12 months; solids are complementary at first",
            "Respect the child's appetite: never force finishing a portion, needs vary from meal to meal",
            "Expect baby to eat little at first: early meals are mostly sensory discovery",
            "Always supervise meals and know basic first-aid steps for choking",
          ],
          es: [
            "La leche materna o la fórmula comercial sigue siendo la principal fuente de nutrición hasta los 12 meses; los sólidos son complementarios al inicio",
            "Respetar el apetito del niño: nunca forzar a terminar una porción, las necesidades varían de una comida a otra",
            "Esperar que el bebé coma poco al principio: las primeras comidas son sobre todo un descubrimiento sensorial",
            "Siempre supervisar las comidas y conocer las maniobras básicas de primeros auxilios en caso de atragantamiento",
          ],
        },
      },
    ],
  },
  allergenes: {
    title: { fr: "Allergènes alimentaires", en: "Food allergens", es: "Alérgenos alimentarios" },
    intro: {
      fr: "L'introduction des allergènes fait souvent peur aux parents, mais les recommandations actuelles ont évolué : introduire tôt est maintenant privilégié pour réduire le risque d'allergie.",
      en: "Introducing allergens often worries parents, but current guidance has changed: introducing them early is now favored to help reduce allergy risk.",
      es: "La introducción de alérgenos suele preocupar a los padres, pero las recomendaciones actuales han evolucionado: ahora se prefiere introducirlos temprano para reducir el riesgo de alergia.",
    },
    groups: [
      {
        title: { fr: "Les 9 allergènes & comment introduire", en: "The 9 allergens & how to introduce them", es: "Los 9 alérgenos y cómo introducirlos" },
        color: COLORS.ochre,
        illu: "allergyWarning",
        foodList: [
          { icon: "peanutIllu", name: { fr: "Arachides", en: "Peanuts", es: "Cacahuates" } },
          { icon: "treeNutIllu", name: { fr: "Noix", en: "Tree nuts", es: "Nueces" } },
          { icon: "eggsDish", name: { fr: "Œufs", en: "Eggs", es: "Huevos" } },
          { icon: "milkCartonIllu", name: { fr: "Lait", en: "Milk", es: "Leche" } },
          { icon: "fishIllu", name: { fr: "Poisson", en: "Fish", es: "Pescado" } },
          { icon: "shellfishIllu", name: { fr: "Crustacés & mollusques", en: "Shellfish & mollusks", es: "Mariscos y moluscos" } },
          { icon: "soyPodIllu", name: { fr: "Soya", en: "Soy", es: "Soya" } },
          { icon: "wheatIllu", name: { fr: "Blé", en: "Wheat", es: "Trigo" } },
          { icon: "sesameIllu", name: { fr: "Sésame", en: "Sesame", es: "Sésamo" } },
        ],
        items: {
          fr: [
            "Il est recommandé d'introduire les allergènes courants tôt (dès 6 mois) plutôt que de les retarder, surtout pour l'arachide et l'œuf",
            "Introduire un allergène à la fois, idéalement le matin ou tôt en journée, pour surveiller une réaction pendant plusieurs heures",
            "Une fois un allergène toléré, continuer à l'offrir régulièrement (2-3 fois par semaine) pour maintenir la tolérance",
            "Adapter la texture pour réduire les risques d'étouffement : beurre d'arachide dilué, œuf bien cuit et écrasé",
          ],
          en: [
            "Current guidance favors introducing common allergens early (from 6 months) rather than delaying, especially peanut and egg",
            "Introduce one allergen at a time, ideally in the morning or early in the day, to watch for a reaction over several hours",
            "Once an allergen is tolerated, keep offering it regularly (2-3 times a week) to help maintain tolerance",
            "Adapt the texture to reduce choking risk: thinned peanut butter, well-cooked and mashed egg",
          ],
          es: [
            "Se recomienda introducir los alérgenos comunes temprano (desde los 6 meses) en lugar de retrasarlos, especialmente el cacahuate y el huevo",
            "Introducir un alérgeno a la vez, idealmente por la mañana o temprano en el día, para vigilar una reacción durante varias horas",
            "Una vez que se tolera un alérgeno, seguir ofreciéndolo con regularidad (2-3 veces por semana) para mantener la tolerancia",
            "Adaptar la textura para reducir el riesgo de atragantamiento: mantequilla de maní diluida, huevo bien cocido y triturado",
          ],
        },
      },
      {
        title: { fr: "Reconnaître une réaction", en: "Recognizing a reaction", es: "Reconocer una reacción" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: [
            "Signes de réaction allergique légère à modérée : urticaire, rougeurs, enflure légère, vomissements, diarrhée, agitation",
            "Signes de réaction sévère (anaphylaxie) : difficulté à respirer, enflure du visage/de la gorge, vomissements répétés, changement de couleur de la peau, perte de conscience",
            "En cas de réaction sévère, consulter les urgences immédiatement (appeler les services d'urgence)",
          ],
          en: [
            "Signs of a mild to moderate allergic reaction: hives, redness, mild swelling, vomiting, diarrhea, fussiness",
            "Signs of a severe reaction (anaphylaxis): trouble breathing, swelling of the face/throat, repeated vomiting, skin color change, loss of consciousness",
            "For a severe reaction, seek emergency care immediately (call emergency services)",
          ],
          es: [
            "Señales de reacción alérgica leve a moderada: urticaria, enrojecimiento, hinchazón leve, vómitos, diarrea, irritabilidad",
            "Señales de reacción severa (anafilaxia): dificultad para respirar, hinchazón de la cara/garganta, vómitos repetidos, cambio de color de la piel, pérdida de conciencia",
            "En caso de reacción severa, buscar atención de emergencia de inmediato (llamar a los servicios de emergencia)",
          ],
        },
      },
      {
        title: { fr: "Précautions & cas particuliers", en: "Precautions & special cases", es: "Precauciones y casos particulares" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Les familles avec des antécédents d'allergies, d'eczéma sévère ou d'asthme devraient discuter du moment et de la méthode d'introduction avec un professionnel de la santé avant de commencer",
            "Une réaction cutanée légère autour de la bouche après un aliment acide (agrumes, tomate) n'est pas nécessairement une allergie — c'est souvent une irritation de contact",
          ],
          en: [
            "Families with a history of allergies, severe eczema, or asthma should discuss the timing and method of introduction with a provider before starting",
            "A mild skin reaction around the mouth after an acidic food (citrus, tomato) isn't necessarily an allergy — it's often just contact irritation",
          ],
          es: [
            "Las familias con antecedentes de alergias, eccema severo o asma deberían hablar del momento y método de introducción con un profesional de la salud antes de comenzar",
            "Una reacción cutánea leve alrededor de la boca después de un alimento ácido (cítricos, tomate) no es necesariamente una alergia — a menudo es solo irritación por contacto",
          ],
        },
      },
    ],
  },
  menu612: {
    title: { fr: "Horaire d'une journée repas — 6 à 12 mois", en: "Sample meal-day schedule — 6 to 12 months", es: "Horario de un día de comidas — 6 a 12 meses" },
  },
  menu15: {
    title: { fr: "Horaire d'une journée repas — 1 à 5 ans", en: "Sample meal-day schedule — 1 to 5 years", es: "Horario de un día de comidas — 1 a 5 años" },
    illu: "alimentation",
    intro: {
      fr: "Après 1 an, l'enfant se rapproche progressivement des repas familiaux, avec des portions adaptées à sa taille et à son appétit fluctuant.",
      en: "After age 1, the child gradually moves toward family meals, with portions matched to their size and their naturally fluctuating appetite.",
      es: "Después del año, el niño se acerca gradualmente a las comidas familiares, con porciones adaptadas a su tamaño y a su apetito fluctuante.",
    },
    groups: [
      {
        title: { fr: "Structure des repas", en: "Meal structure", es: "Estructura de las comidas" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "3 repas et 2-3 collations par jour, à heures régulières, pour soutenir l'énergie tout au long de la journée",
            "Une portion pour un jeune enfant est petite : environ 1/4 de la portion adulte, à ajuster selon l'appétit",
            "Offrir des aliments des 4 groupes chaque jour : légumes et fruits, produits céréaliers, protéines, produits laitiers",
            "Laisser l'enfant décider de la quantité qu'il mange : les parents choisissent le quoi, le quand et le où, l'enfant choisit le combien",
          ],
          en: [
            "3 meals and 2-3 snacks a day, at regular times, to support energy throughout the day",
            "A toddler portion is small: roughly 1/4 of an adult portion, adjusted to appetite",
            "Offer foods from all 4 groups daily: fruits and vegetables, grains, protein, dairy",
            "Let the child decide how much to eat: parents choose the what, when and where, the child chooses the how much",
          ],
          es: [
            "3 comidas y 2-3 refrigerios al día, a horas regulares, para sostener la energía durante todo el día",
            "Una porción para un niño pequeño es pequeña: aproximadamente 1/4 de la porción de un adulto, a ajustar según el apetito",
            "Ofrecer alimentos de los 4 grupos cada día: frutas y verduras, cereales, proteínas, lácteos",
            "Dejar que el niño decida cuánto come: los padres eligen el qué, el cuándo y el dónde, el niño elige el cuánto",
          ],
        },
      },
      {
        title: { fr: "Appétit & nouveaux aliments", en: "Appetite & new foods", es: "Apetito y nuevos alimentos" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "L'appétit fluctue beaucoup d'un jour à l'autre, particulièrement lors des poussées de croissance ou des périodes de maladie — c'est normal",
            "Offrir de nouveaux aliments à répétition (parfois 10-15 expositions) avant de conclure qu'un enfant n'aime pas un aliment — la néophobie alimentaire est normale entre 2 et 5 ans",
          ],
          en: [
            "Appetite fluctuates a lot day to day, especially during growth spurts or illness — this is normal",
            "Offer new foods repeatedly (sometimes 10-15 exposures) before concluding a child dislikes it — food neophobia is normal between ages 2 and 5",
          ],
          es: [
            "El apetito fluctúa mucho de un día a otro, especialmente durante los brotes de crecimiento o períodos de enfermedad — es normal",
            "Ofrecer alimentos nuevos repetidamente (a veces 10-15 exposiciones) antes de concluir que a un niño no le gusta — la neofobia alimentaria es normal entre los 2 y 5 años",
          ],
        },
      },
      {
        title: { fr: "Sécurité & habitudes", en: "Safety & habits", es: "Seguridad y hábitos" },
        color: COLORS.ochre,
        illu: "allergyWarning",
        items: {
          fr: [
            "Limiter le jus (max. 125 ml/jour si offert), les boissons sucrées et les aliments ultra-transformés",
            "Éviter les aliments à risque élevé d'étouffement tels quels : raisins entiers, noix entières, saucisses en rondelles — toujours couper en petits morceaux",
            "Manger en famille aussi souvent que possible favorise de meilleures habitudes alimentaires à long terme",
            "Éviter d'utiliser la nourriture comme récompense ou punition, ce qui peut créer une relation compliquée avec certains aliments",
            "Le lait de vache entier (3,25 %) est recommandé jusqu'à 2 ans, puis un lait partiellement écrémé peut être introduit",
          ],
          en: [
            "Limit juice (max 125 ml/day if offered), sugary drinks, and ultra-processed foods",
            "Avoid high choking-risk foods as-is: whole grapes, whole nuts, hot dog rounds — always cut into small pieces",
            "Eating together as a family as often as possible supports better long-term eating habits",
            "Avoid using food as a reward or punishment, which can create a complicated relationship with certain foods",
            "Whole cow's milk (3.25%) is recommended until age 2, after which a lower-fat milk can be introduced",
          ],
          es: [
            "Limitar el jugo (máx. 125 ml/día si se ofrece), las bebidas azucaradas y los alimentos ultraprocesados",
            "Evitar alimentos de alto riesgo de atragantamiento tal cual: uvas enteras, nueces enteras, salchichas en rodajas — siempre cortar en trozos pequeños",
            "Comer en familia tan a menudo como sea posible favorece mejores hábitos alimentarios a largo plazo",
            "Evitar usar la comida como recompensa o castigo, lo que puede crear una relación complicada con ciertos alimentos",
            "La leche entera de vaca (3,25 %) se recomienda hasta los 2 años, después se puede introducir una leche parcialmente descremada",
          ],
        },
      },
    ],
  },
};


/* ---------------- CARE DATA ---------------- */
const CARE = {
  bain: {
    title: { fr: "Le bain", en: "Bath time", es: "El baño" },
    titleIcon: "bathtubIllu",
    illu: "duckIllu",
    intro: {
      fr: "Le bain est un moment de soin, mais aussi une belle occasion de lien affectif. La peau du nouveau-né est fragile et demande une approche douce.",
      en: "Bath time is a caregiving moment, but also a wonderful opportunity for bonding. Newborn skin is delicate and calls for a gentle approach.",
      es: "El baño es un momento de cuidado, pero también una linda oportunidad para el vínculo afectivo. La piel del recién nacido es frágil y requiere un enfoque suave.",
    },
    groups: [
      {
        title: { fr: "Sécurité avant tout", en: "Safety first", es: "Seguridad ante todo" },
        color: COLORS.blue,
        illu: "towelSoftIllu",
        items: {
          fr: [
            "2 à 3 bains par semaine suffisent pour un nouveau-né, sa peau est fragile et un lavage trop fréquent peut l'assécher",
            "Un bain-éponge (à l'aide d'une débarbouillette) est recommandé avant la chute du cordon ombilical, habituellement dans les 1 à 3 premières semaines",
            "Ne jamais laisser un bébé seul dans le bain, même quelques secondes, même dans un siège de bain — la noyade peut survenir en silence et rapidement",
            "À partir de la marche autonome, ne jamais laisser un enfant seul dans le bain non plus, même brièvement",
          ],
          en: [
            "2 to 3 baths a week are enough for a newborn, their skin is delicate and washing too often can dry it out",
            "A sponge bath (with a washcloth) is recommended before the umbilical cord falls off, usually within the first 1 to 3 weeks",
            "Never leave a baby alone in the bath, not even for a few seconds, not even in a bath seat — drowning can happen silently and quickly",
            "Once a child is walking, never leave them alone in the bath either, even briefly",
          ],
          es: [
            "2 a 3 baños por semana son suficientes para un recién nacido, su piel es frágil y lavar con demasiada frecuencia puede resecarla",
            "Se recomienda un baño de esponja (con una toallita) antes de que se caiga el cordón umbilical, generalmente en las primeras 1 a 3 semanas",
            "Nunca dejar a un bebé solo en el baño, ni siquiera unos segundos, ni siquiera en un asiento de baño — el ahogamiento puede ocurrir en silencio y rápidamente",
            "A partir de que el niño camina, tampoco dejarlo nunca solo en el baño, ni siquiera brevemente",
          ],
        },
      },
      {
        title: { fr: "Bonnes pratiques", en: "Best practices", es: "Buenas prácticas" },
        color: COLORS.sage,
        illu: "thermometer",
        items: {
          fr: [
            "Température de l'eau idéale : environ 37 °C (98,6 °F), toujours vérifiée au coude ou avec un thermomètre de bain",
            "Préparer tout le matériel à l'avance (serviette, vêtements propres, couche) pour ne jamais avoir à quitter bébé des yeux",
            "Utiliser un savon doux, sans parfum, sans colorant, spécialement formulé pour bébé, et seulement au besoin",
            "Laver le visage en premier avec de l'eau claire, avant d'ajouter le savon pour le reste du corps",
            "Sécher soigneusement les plis de la peau (cou, aisselles, aine) pour prévenir l'irritation",
            "La température de la pièce doit être chaude (environ 24 °C) pour éviter que bébé ait froid en sortant du bain",
          ],
          en: [
            "Ideal water temperature: about 37 °C (98.6 °F), always checked with your elbow or a bath thermometer",
            "Prepare all your supplies ahead of time (towel, clean clothes, diaper) so you never need to look away from baby",
            "Use a mild, fragrance-free, dye-free soap made for babies, and only as needed",
            "Wash the face first with plain water, before adding soap for the rest of the body",
            "Dry skin folds carefully (neck, armpits, groin) to prevent irritation",
            "The room temperature should be warm (around 24 °C / 75 °F) so baby doesn't get cold getting out of the bath",
          ],
          es: [
            "Temperatura ideal del agua: alrededor de 37 °C (98,6 °F), siempre verificada con el codo o un termómetro de baño",
            "Preparar todo el material con anticipación (toalla, ropa limpia, pañal) para nunca tener que quitarle los ojos de encima al bebé",
            "Usar un jabón suave, sin perfume, sin colorante, formulado especialmente para bebés, y solo cuando sea necesario",
            "Lavar la cara primero con agua limpia, antes de agregar jabón para el resto del cuerpo",
            "Secar cuidadosamente los pliegues de la piel (cuello, axilas, ingle) para prevenir la irritación",
            "La temperatura de la habitación debe ser cálida (alrededor de 24 °C) para que el bebé no sienta frío al salir del baño",
          ],
        },
      },
    ],
  },
  peau: {
    title: { fr: "Soins de la peau & produits", en: "Skin care & products", es: "Cuidado de la piel y productos" },
    illu: "soins",
    intro: {
      fr: "La peau du bébé est plus fine et perméable que celle de l'adulte, ce qui la rend plus sensible aux irritations et aux produits trop actifs.",
      en: "A baby's skin is thinner and more permeable than an adult's, making it more sensitive to irritation and to overly active products.",
      es: "La piel del bebé es más fina y permeable que la de un adulto, lo que la hace más sensible a irritaciones y a productos demasiado activos.",
    },
    groups: [
      {
        title: { fr: "Produits & routine", en: "Products & routine", es: "Productos y rutina" },
        color: COLORS.sage,
        illu: "soapIcon",
        items: {
          fr: [
            "Privilégier des produits hypoallergènes, sans parfum, sans colorant, formulés spécifiquement pour les nourrissons",
            "Une crème hydratante douce peut être appliquée après le bain sur peau encore légèrement humide pour un meilleur effet",
            "Couper les ongles avec un coupe-ongles ou une lime pour bébé, idéalement pendant le sommeil",
            "Éviter les lingettes parfumées, les produits à base d'alcool, et les huiles essentielles non diluées sur la peau du nourrisson",
          ],
          en: [
            "Choose hypoallergenic, fragrance-free, dye-free products made specifically for infants",
            "A gentle moisturizer can be applied after the bath while skin is still slightly damp, for better absorption",
            "Trim nails with baby nail clippers or an emery board, ideally while baby is asleep",
            "Avoid scented wipes, alcohol-based products, and undiluted essential oils on infant skin",
          ],
          es: [
            "Preferir productos hipoalergénicos, sin perfume, sin colorante, formulados específicamente para bebés",
            "Se puede aplicar una crema hidratante suave después del baño sobre la piel aún ligeramente húmeda para un mejor efecto",
            "Cortar las uñas con un cortaúñas o lima para bebé, idealmente mientras el bebé duerme",
            "Evitar toallitas perfumadas, productos a base de alcohol, y aceites esenciales sin diluir sobre la piel del bebé",
          ],
        },
      },
      {
        title: { fr: "Phénomènes normaux", en: "Normal occurrences", es: "Fenómenos normales" },
        color: COLORS.pink,
        illu: "babyAcneIllu",
        items: {
          fr: [
            "L'acné du nouveau-né (petits boutons rouges sur le visage) et la peau qui pèle sont fréquentes dans les premières semaines et se résolvent seules",
            "Les taches de naissance (angiomes, taches mongoloïdes) sont fréquentes et généralement bénignes; en discuter au suivi médical",
            "Le lanugo (fin duvet) et la vernix (couche protectrice blanchâtre) présents à la naissance disparaissent naturellement en quelques jours à quelques semaines",
          ],
          en: [
            "Newborn acne (small red bumps on the face) and peeling skin are common in the first weeks and resolve on their own",
            "Birthmarks (angiomas, Mongolian spots) are common and generally harmless; mention them at your medical follow-up",
            "Lanugo (fine body hair) and vernix (the whitish protective coating) present at birth naturally disappear within days to weeks",
          ],
          es: [
            "El acné del recién nacido (pequeños granitos rojos en la cara) y la piel que se descama son frecuentes en las primeras semanas y se resuelven solos",
            "Las manchas de nacimiento (angiomas, manchas mongólicas) son frecuentes y generalmente benignas; comentarlas en el seguimiento médico",
            "El lanugo (vello fino) y el vérnix (capa protectora blanquecina) presentes al nacer desaparecen naturalmente en días o semanas",
          ],
        },
      },
      {
        title: { fr: "Eczéma, soleil & quand consulter", en: "Eczema, sun & when to see a provider", es: "Eccema, sol y cuándo consultar" },
        color: COLORS.ochre,
        illu: "babyBeachIllu",
        items: {
          fr: [
            "L'eczéma du nourrisson se manifeste par des plaques sèches, rouges et parfois qui suintent; une hydratation intensive régulière est la base du traitement",
            "Protéger la peau du soleil : éviter l'exposition directe avant 6 mois, privilégier vêtements et ombre; une crème solaire minérale peut être utilisée avec parcimonie après 6 mois",
            "Consulter si une éruption s'accompagne de fièvre, s'étend rapidement, ou ne s'améliore pas avec une routine d'hydratation régulière",
          ],
          en: [
            "Infant eczema shows up as dry, red, sometimes weepy patches, often on the cheeks and skin folds; regular, intensive moisturizing is the foundation of treatment",
            "Protect skin from the sun: avoid direct exposure before 6 months, favor clothing and shade; a mineral sunscreen can be used sparingly if needed after 6 months",
            "See a provider if a rash comes with fever, spreads quickly, or doesn't improve with a regular moisturizing routine",
          ],
          es: [
            "El eccema del bebé se manifiesta con placas secas, rojas y a veces supurantes; una hidratación intensiva regular es la base del tratamiento",
            "Proteger la piel del sol: evitar la exposición directa antes de los 6 meses, preferir ropa y sombra; se puede usar con moderación un protector solar mineral después de los 6 meses",
            "Consultar si una erupción viene acompañada de fiebre, se extiende rápidamente, o no mejora con una rutina de hidratación regular",
          ],
        },
      },
    ],
  },
  oreillesNez: {
    title: { fr: "Nettoyage des oreilles et du nez", en: "Cleaning ears and nose", es: "Limpieza de oídos y nariz" },
    illu: "soins",
    intro: {
      fr: "Les oreilles et le nez d'un bébé se nettoient naturellement dans la plupart des cas; l'intervention des parents doit rester minimale et douce.",
      en: "A baby's ears and nose clean themselves naturally in most cases; parents should keep their intervention minimal and gentle.",
      es: "Los oídos y la nariz de un bebé se limpian naturalmente en la mayoría de los casos; la intervención de los padres debe ser mínima y suave.",
    },
    groups: [
      {
        title: { fr: "Ce qu'il ne faut jamais faire", en: "What never to do", es: "Lo que nunca se debe hacer" },
        color: COLORS.ochre,
        illu: "cottonSwabIllu",
        items: {
          fr: [
            "Ne jamais insérer de coton-tige ou tout autre objet dans le conduit auditif : le cérumen se nettoie tout seul et le protège naturellement",
            "Éviter d'utiliser des cotons-tiges dans le nez également, pour les mêmes raisons de sécurité que pour les oreilles",
          ],
          en: [
            "Never insert a cotton swab or any other object into the ear canal: earwax cleans itself and protects it naturally",
            "Avoid using cotton swabs in the nose too, for the same safety reasons as the ears",
          ],
          es: [
            "Nunca insertar un hisopo de algodón ni ningún otro objeto en el conducto auditivo: el cerumen se limpia solo y lo protege naturalmente",
            "Evitar usar hisopos de algodón en la nariz también, por las mismas razones de seguridad que en los oídos",
          ],
        },
      },
      {
        title: { fr: "Nettoyage doux", en: "Gentle cleaning", es: "Limpieza suave" },
        color: COLORS.blue,
        illu: "nasalAspiratorIllu",
        items: {
          fr: [
            "Nettoyer uniquement le pavillon externe de l'oreille (la partie visible) avec une débarbouillette humide, lors du bain",
            "Un excès de cérumen visible à l'entrée du conduit peut être essuyé délicatement avec un coin de débarbouillette",
            "Pour le nez, utiliser une solution saline (gouttes ou vaporisateur) suivie d'une poire nasale douce si bébé est congestionné",
            "Les éternuements fréquents chez le nouveau-né sont normaux : c'est un mécanisme pour dégager les voies nasales",
            "Un mouche-bébé électrique ou manuel peut être plus efficace qu'une poire pour certains parents",
          ],
          en: [
            "Clean only the outer, visible part of the ear with a damp washcloth, during bath time",
            "Visible excess wax at the opening of the canal can be gently wiped with the corner of a washcloth",
            "For the nose, use saline solution (drops or spray) followed by a soft nasal bulb if baby is congested",
            "Frequent sneezing in newborns is normal: it's a mechanism to clear the nasal passages",
            "An electric or manual nasal aspirator may work better than a bulb syringe for some parents",
          ],
          es: [
            "Limpiar solo la parte externa y visible del oído con una toallita húmeda, durante el baño",
            "El exceso de cerumen visible en la entrada del conducto se puede limpiar suavemente con la esquina de una toallita",
            "Para la nariz, usar solución salina (gotas o spray) seguida de una perilla nasal suave si el bebé está congestionado",
            "Los estornudos frecuentes en el recién nacido son normales: es un mecanismo para despejar las vías nasales",
            "Un aspirador nasal eléctrico o manual puede ser más eficaz que una perilla para algunos padres",
          ],
        },
      },
      {
        title: { fr: "Quand consulter", en: "When to see a provider", es: "Cuándo consultar" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: [
            "Consulter si écoulement inhabituel (jaune, vert, sanguinolent), odeur inhabituelle, douleur apparente à l'oreille, ou fièvre associée",
            "Un objet étranger inséré accidentellement dans le nez ou l'oreille par un enfant plus vieux nécessite une consultation médicale, sans tenter de le retirer soi-même",
          ],
          en: [
            "See a provider for unusual discharge (yellow, green, bloody), an unusual odor, apparent ear pain, or an associated fever",
            "A foreign object accidentally inserted in the nose or ear by an older child needs medical attention, without attempting to remove it yourself",
          ],
          es: [
            "Consultar si hay secreción inusual (amarilla, verde, con sangre), olor inusual, dolor aparente en el oído, o fiebre asociada",
            "Un objeto extraño insertado accidentalmente en la nariz o el oído por un niño mayor requiere atención médica, sin intentar retirarlo tú mismo",
          ],
        },
      },
    ],
  },
  change: {
    title: { fr: "Change & érythème fessier", en: "Diapering & diaper rash", es: "Cambio de pañal e irritación" },
    illu: "diaperChange",
    intro: {
      fr: "Un nouveau-né peut nécessiter jusqu'à 10-12 changements de couche par jour. Une bonne routine prévient la plupart des irritations.",
      en: "A newborn may need up to 10-12 diaper changes a day. A good routine prevents most irritation.",
      es: "Un recién nacido puede necesitar hasta 10-12 cambios de pañal al día. Una buena rutina previene la mayoría de las irritaciones.",
    },
    groups: [
      {
        title: { fr: "Routine de base", en: "Basic routine", es: "Rutina básica" },
        color: COLORS.sage,
        illu: "diaperIcon",
        items: {
          fr: [
            "Changer la couche dès qu'elle est souillée pour prévenir l'irritation, idéalement avant et après chaque tétée/boire",
            "Nettoyer de l'avant vers l'arrière, surtout chez les filles, pour éviter de propager des bactéries vers l'urètre",
            "Laisser sécher la peau à l'air libre quelques minutes lors des changements, surtout en cas de rougeur",
            "Éviter de trop serrer la couche, pour permettre une bonne circulation d'air et limiter la friction",
            "Le méconium (première selle, noire et collante) des premiers jours peut être plus difficile à nettoyer : de l'huile douce peut aider",
          ],
          en: [
            "Change diapers as soon as they're soiled to prevent irritation, ideally before and after each feed",
            "Wipe front to back, especially for girls, to avoid spreading bacteria toward the urethra",
            "Let the skin air-dry for a few minutes during changes, especially if there's redness",
            "Avoid fastening the diaper too tightly, to allow good air circulation and reduce friction",
            "Meconium (the first stool, black and sticky) in the early days can be harder to clean off: a bit of mild oil can help",
          ],
          es: [
            "Cambiar el pañal en cuanto esté sucio para prevenir la irritación, idealmente antes y después de cada toma",
            "Limpiar de adelante hacia atrás, especialmente en las niñas, para evitar propagar bacterias hacia la uretra",
            "Dejar secar la piel al aire libre unos minutos durante los cambios, especialmente si hay enrojecimiento",
            "Evitar apretar demasiado el pañal, para permitir una buena circulación de aire y limitar la fricción",
            "El meconio (primera deposición, negra y pegajosa) de los primeros días puede ser más difícil de limpiar: un poco de aceite suave puede ayudar",
          ],
        },
      },
      {
        title: { fr: "Prévenir & traiter les rougeurs", en: "Preventing & treating rash", es: "Prevenir y tratar el enrojecimiento" },
        color: COLORS.ochre,
        illu: "creamJarIllu",
        items: {
          fr: [
            "Appliquer une crème protectrice à base d'oxyde de zinc en prévention ou en traitement, en couche généreuse",
            "Éviter les lingettes parfumées ou avec alcool en cas de peau sensible ou de rougeur; l'eau tiède et un linge doux peuvent suffire",
            "L'érythème fessier causé par une levure (candidose) se présente avec des rougeurs vives, des bordures nettes; nécessite souvent un traitement antifongique prescrit",
            "Changer de marque de couche ou de lingette si une irritation persiste, car une sensibilité à un produit est possible",
          ],
          en: [
            "Apply a zinc-oxide barrier cream preventively or as treatment, in a generous layer",
            "Avoid scented or alcohol-based wipes if skin is sensitive or irritated; warm water and a soft cloth may be enough",
            "Yeast-related diaper rash (candidiasis) shows bright redness with sharp borders; it often needs a prescribed antifungal treatment",
            "Switch diaper or wipe brands if irritation persists, since a sensitivity to a specific product is possible",
          ],
          es: [
            "Aplicar una crema protectora a base de óxido de zinc en forma preventiva o como tratamiento, en capa generosa",
            "Evitar toallitas perfumadas o con alcohol si la piel está sensible o irritada; agua tibia y un paño suave pueden bastar",
            "La irritación causada por un hongo (candidiasis) se presenta con enrojecimiento intenso y bordes definidos; a menudo necesita un tratamiento antifúngico recetado",
            "Cambiar de marca de pañal o toallita si la irritación persiste, ya que es posible una sensibilidad a un producto específico",
          ],
        },
      },
      {
        title: { fr: "Quand consulter", en: "When to see a provider", es: "Cuándo consultar" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: ["Consulter si l'érythème s'aggrave, présente des cloques, saigne, s'accompagne de fièvre, ou ne s'améliore pas après 2-3 jours de soins à la maison"],
          en: ["See a provider if the rash worsens, blisters, bleeds, comes with fever, or doesn't improve after 2-3 days of home care"],
          es: ["Consultar si la irritación empeora, presenta ampollas, sangra, viene acompañada de fiebre, o no mejora después de 2-3 días de cuidados en casa"],
        },
      },
    ],
  },
  sommeilSecuritaire: {
    title: { fr: "Sommeil sécuritaire", en: "Safe sleep", es: "Sueño seguro" },
    illu: "safeSleep",
    intro: {
      fr: "Les recommandations de sommeil sécuritaire visent à réduire le risque de mort subite du nourrisson (MSN) et d'asphyxie accidentelle — elles sont parmi les plus importantes de la petite enfance.",
      en: "Safe sleep guidelines aim to reduce the risk of sudden infant death syndrome (SIDS) and accidental suffocation — they're among the most important guidelines in early childhood.",
      es: "Las recomendaciones de sueño seguro buscan reducir el riesgo de muerte súbita del lactante y asfixia accidental — están entre las más importantes de la primera infancia.",
    },
    groups: [
      {
        title: { fr: "Position & environnement du lit", en: "Position & sleep environment", es: "Posición y ambiente de la cuna" },
        color: COLORS.teal,
        illu: "babyOnBackIllu",
        items: {
          fr: [
            "Toujours coucher bébé sur le dos, pour chaque dodo (sieste et nuit), sur une surface ferme, jusqu'à 1 an",
            "Aucun objet mou dans le lit : oreillers, couvertures, tours de lit, jouets en peluche, coussins de positionnement",
            "Le matelas doit être ferme, bien ajusté au lit, recouvert d'un drap-housse ajusté seulement",
            "Éviter la surchauffe : privilégier une gigoteuse plutôt qu'une couverture, habiller légèrement",
            "Une fois que bébé peut se retourner seul de façon autonome dans les deux sens, il n'est plus nécessaire de le replacer sur le dos",
          ],
          en: [
            "Always place baby on their back, for every sleep (naps and nighttime), on a firm surface, until age 1",
            "No soft objects in the crib: pillows, blankets, bumpers, stuffed toys, positioning cushions",
            "The mattress should be firm, well-fitted to the crib, covered only with a fitted sheet",
            "Avoid overheating: a sleep sack is safer than a loose blanket; dress baby lightly",
            "Once baby can roll independently both ways on their own, you no longer need to reposition them onto their back",
          ],
          es: [
            "Siempre acostar al bebé boca arriba, en cada sueño (siesta y noche), sobre una superficie firme, hasta el año de edad",
            "Ningún objeto blando en la cuna: almohadas, cobijas, protectores de cuna, peluches, cojines de posicionamiento",
            "El colchón debe ser firme, bien ajustado a la cuna, cubierto solo con una sábana ajustable",
            "Evitar el sobrecalentamiento: preferir un saco de dormir en lugar de una cobija, vestir ligero",
            "Una vez que el bebé puede darse vuelta solo de manera autónoma en ambos sentidos, ya no es necesario reacomodarlo boca arriba",
          ],
        },
      },
      {
        title: { fr: "Chambre partagée & tabac", en: "Room-sharing & smoking", es: "Habitación compartida y tabaco" },
        color: COLORS.blue,
        illu: "cribIllu",
        items: {
          fr: [
            "Chambre partagée mais lit séparé (bébé dans son propre lit, dans la chambre des parents) recommandée pour les 6 à 12 premiers mois",
            "Ne jamais fumer près de bébé ni dans les espaces qu'il fréquente; le tabagisme augmente significativement le risque de MSN",
            "Le partage du lit avec les parents (co-dodo dans le même lit) augmente le risque de MSN et n'est pas recommandé, particulièrement avant 4 mois",
          ],
          en: [
            "Room-sharing without bed-sharing (baby in their own crib, in the parents' room) is recommended for the first 6 to 12 months",
            "Never smoke near baby or in spaces they spend time in; smoking significantly increases SIDS risk",
            "Bed-sharing with parents increases SIDS risk and isn't recommended, especially before 4 months",
          ],
          es: [
            "Compartir habitación pero con cuna separada (el bebé en su propia cuna, en la habitación de los padres) se recomienda durante los primeros 6 a 12 meses",
            "Nunca fumar cerca del bebé ni en los espacios que frecuenta; el tabaquismo aumenta significativamente el riesgo de muerte súbita",
            "Compartir la cama con los padres (colecho en la misma cama) aumenta el riesgo de muerte súbita y no se recomienda, especialmente antes de los 4 meses",
          ],
        },
      },
      {
        title: { fr: "Facteurs protecteurs", en: "Protective factors", es: "Factores protectores" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "L'allaitement, même partiel, est associé à une réduction du risque de MSN",
            "L'utilisation d'une sucette au coucher (une fois l'allaitement bien établi) peut aussi réduire le risque de MSN selon certaines études",
            "Éviter les moniteurs de mouvement/respiration commerciaux non recommandés médicalement comme substitut aux pratiques de sommeil sécuritaire de base",
          ],
          en: [
            "Breastfeeding, even partial, is associated with a lower SIDS risk",
            "Offering a pacifier at sleep time (once breastfeeding is well established) may also lower SIDS risk according to some studies",
            "Avoid relying on commercial movement/breathing monitors, which aren't medically endorsed as a substitute for basic safe sleep practices",
          ],
          es: [
            "La lactancia materna, incluso parcial, está asociada con una reducción del riesgo de muerte súbita",
            "El uso de un chupete al dormir (una vez que la lactancia está bien establecida) también puede reducir el riesgo según algunos estudios",
            "Evitar depender de monitores comerciales de movimiento/respiración, que no están médicamente recomendados como sustituto de las prácticas básicas de sueño seguro",
          ],
        },
      },
    ],
  },
  habillement: {
    title: { fr: "Habillement selon la saison", en: "Dressing by season", es: "Vestimenta según la estación" },
    illu: "soins",
    intro: {
      fr: "Un bébé régule moins bien sa température qu'un adulte. Quelques repères simples aident à l'habiller adéquatement, été comme hiver.",
      en: "A baby regulates temperature less well than an adult. A few simple guidelines help you dress them appropriately, summer and winter.",
      es: "Un bebé regula peor su temperatura que un adulto. Algunas pautas simples ayudan a vestirlo adecuadamente, tanto en verano como en invierno.",
    },
    groups: [
      {
        title: { fr: "Règle de base", en: "Basic rule", es: "Regla básica" },
        color: COLORS.ochre,
        illu: "clothesIcon",
        items: {
          fr: [
            "Règle simple : habiller bébé d'une couche de plus que ce qu'un adulte porterait dans les mêmes conditions",
            "Vérifier la température de bébé en touchant la nuque ou le torse, pas les mains ou les pieds qui sont naturellement plus froids",
            "Les mitaines et bas maintiennent la chaleur des extrémités, surtout chez le nouveau-né qui régule mal sa température",
            "Un chapeau est particulièrement important chez le nouveau-né, car une grande partie de la perte de chaleur corporelle se fait par la tête",
          ],
          en: [
            "Simple rule: dress baby in one more layer than an adult would wear in the same conditions",
            "Check baby's temperature by feeling the back of the neck or chest, not hands or feet, which are naturally cooler",
            "Mittens and socks help keep extremities warm, especially in newborns who regulate temperature poorly",
            "A hat is especially important for newborns, since a large share of body heat is lost through the head",
          ],
          es: [
            "Regla simple: vestir al bebé con una capa más de lo que usaría un adulto en las mismas condiciones",
            "Verificar la temperatura del bebé tocando la nuca o el torso, no las manos o los pies que naturalmente están más fríos",
            "Los mitones y calcetines mantienen el calor de las extremidades, especialmente en el recién nacido que regula mal su temperatura",
            "Un gorro es especialmente importante en el recién nacido, ya que gran parte de la pérdida de calor corporal se da por la cabeza",
          ],
        },
      },
      {
        title: { fr: "Siège d'auto & surchauffe", en: "Car seat & overheating", es: "Silla de auto y sobrecalentamiento" },
        color: COLORS.pink,
        illu: "carSeatIcon",
        items: {
          fr: [
            "En siège d'auto l'hiver, éviter les habits de neige épais sous les sangles : installer bébé en vêtements plus légers et ajouter une couverture par-dessus une fois attaché",
            "Éviter la surchauffe, un risque tout aussi important que le froid : signes de surchauffe incluent joues rouges, transpiration, respiration rapide",
          ],
          en: [
            "In winter car seats, avoid bulky snowsuits under the harness: dress baby in lighter layers and add a blanket over the straps once buckled in",
            "Avoid overheating, a risk just as important as being cold: signs include flushed cheeks, sweating, rapid breathing",
          ],
          es: [
            "En la silla de auto en invierno, evitar trajes de nieve gruesos debajo del arnés: vestir al bebé con capas más ligeras y agregar una cobija por encima una vez abrochado",
            "Evitar el sobrecalentamiento, un riesgo tan importante como el frío: las señales incluyen mejillas enrojecidas, sudoración, respiración rápida",
          ],
        },
      },
      {
        title: { fr: "Selon la saison", en: "By season", es: "Según la estación" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "En été, privilégier des tissus légers et respirants, un chapeau à large bord, et l'ombre entre 10 h et 16 h",
            "Pour les sorties, prévoir des vêtements en couches faciles à retirer ou ajouter selon l'évolution de la température",
            "Adapter la literie selon la saison en gardant toujours des principes de sommeil sécuritaire (pas de couverture lourde, gigoteuse adaptée)",
          ],
          en: [
            "In summer, favor light, breathable fabrics, a wide-brimmed hat, and shade between 10 am and 4 pm",
            "For outings, plan layered clothing that's easy to add or remove as the temperature changes",
            "Adjust bedding by season while always keeping safe sleep principles in mind (no heavy blankets, a sleep sack suited to room temperature)",
          ],
          es: [
            "En verano, preferir telas ligeras y transpirables, un sombrero de ala ancha, y la sombra entre las 10 h y las 16 h",
            "Para las salidas, planear ropa en capas fácil de agregar o quitar según cambie la temperatura",
            "Adaptar la ropa de cama según la estación manteniendo siempre los principios de sueño seguro (sin cobijas pesadas, saco de dormir adecuado)",
          ],
        },
      },
    ],
  },
};


/* ---------------- HEALTH DATA ---------------- */
const HEALTH = {
  fievre: {
    title: { fr: "Fièvre", en: "Fever", es: "Fiebre" },
    illu: "thermometer",
    intro: {
      fr: "La fièvre est un mécanisme de défense normal du corps, pas une maladie en soi. Ce qui compte le plus, c'est l'état général de l'enfant, pas seulement le chiffre sur le thermomètre.",
      en: "Fever is a normal defense mechanism, not an illness in itself. What matters most is the child's overall condition, not just the number on the thermometer.",
      es: "La fiebre es un mecanismo de defensa normal del cuerpo, no una enfermedad en sí misma. Lo que más importa es el estado general del niño, no solo la cifra en el termómetro.",
    },
    groups: [
      {
        title: { fr: "Quand s'inquiéter selon l'âge", en: "When to worry, by age", es: "Cuándo preocuparse según la edad" },
        color: COLORS.ochre,
        illu: "thermometer",
        items: {
          fr: [
            "On parle de fièvre à partir de 38 °C (rectale) chez le nourrisson; la température rectale est la plus fiable chez les tout-petits",
            "Sous 3 mois : toute fièvre (38 °C et plus) nécessite une consultation médicale rapide, même si l'enfant semble bien aller",
            "Entre 3 et 6 mois : consulter pour une fièvre élevée (39 °C et plus) ou qui persiste",
            "L'état général de l'enfant est plus important que le chiffre exact : un enfant fiévreux mais qui joue, boit et interagit est généralement moins préoccupant",
          ],
          en: [
            "Fever is defined as 38 °C (100.4 °F) rectal or higher in infants; rectal temperature is the most reliable in young babies",
            "Under 3 months: any fever (38 °C / 100.4 °F or higher) needs prompt medical attention, even if the baby seems otherwise well",
            "Between 3 and 6 months: see a provider for a high fever (39 °C / 102.2 °F or higher) or one that persists",
            "Overall behavior matters more than the exact number: a feverish child who's playing, drinking, and interacting is generally less concerning",
          ],
          es: [
            "Se habla de fiebre a partir de 38 °C (rectal) en el bebé; la temperatura rectal es la más confiable en los más pequeños",
            "Menos de 3 meses: cualquier fiebre (38 °C o más) requiere atención médica rápida, incluso si el bebé parece estar bien",
            "Entre 3 y 6 meses: consultar por una fiebre alta (39 °C o más) o que persiste",
            "El estado general del niño es más importante que la cifra exacta: un niño con fiebre pero que juega, bebe e interactúa generalmente es menos preocupante",
          ],
        },
      },
      {
        title: { fr: "Comment soulager", en: "How to bring comfort", es: "Cómo aliviar" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Bien hydrater (eau, lait, solution de réhydratation au besoin), habiller légèrement, ne pas trop couvrir",
            "L'acétaminophène peut être utilisé selon le poids de l'enfant (pas l'âge) et les indications précises d'un pharmacien ou médecin",
            "Ne jamais alterner ou combiner des médicaments sans l'avis d'un professionnel de la santé",
            "Ne pas donner d'aspirine à un enfant fiévreux (risque de syndrome de Reye)",
            "Un bain tiède (pas froid) peut apporter un léger confort, mais ne remplace pas un médicament si la fièvre cause de l'inconfort",
          ],
          en: [
            "Keep well hydrated (water, milk, rehydration solution as needed), dress lightly, avoid over-bundling",
            "Acetaminophen may be used based on the child's weight (not age) and precise guidance from a pharmacist or doctor",
            "Never alternate or combine medications without a provider's advice",
            "Don't give aspirin to a feverish child (risk of Reye's syndrome)",
            "A lukewarm (not cold) bath can offer mild comfort, but doesn't replace medication if the fever is causing discomfort",
          ],
          es: [
            "Hidratar bien (agua, leche, solución de rehidratación si es necesario), vestir ligero, no abrigar demasiado",
            "El acetaminofén se puede usar según el peso del niño (no la edad) y las indicaciones precisas de un farmacéutico o médico",
            "Nunca alternar o combinar medicamentos sin el consejo de un profesional de la salud",
            "No dar aspirina a un niño con fiebre (riesgo de síndrome de Reye)",
            "Un baño tibio (no frío) puede aportar un ligero alivio, pero no reemplaza un medicamento si la fiebre causa malestar",
          ],
        },
      },
      {
        title: { fr: "Convulsions fébriles & quand consulter", en: "Febrile seizures & when to see a provider", es: "Convulsiones febriles y cuándo consultar" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: [
            "Les convulsions fébriles peuvent survenir chez certains jeunes enfants (6 mois à 5 ans) lors d'une montée rapide de fièvre; impressionnantes mais généralement sans danger à long terme",
            "Consulter si fièvre supérieure à 40 °C, qui dure plus de 3 jours, qui s'accompagne de léthargie marquée, d'une éruption cutanée, ou de difficulté à respirer",
          ],
          en: [
            "Febrile seizures can occur in some young children (ages 6 months to 5 years) with a rapid rise in fever; frightening but generally not dangerous long-term",
            "See a provider for fever above 40 °C (104 °F), lasting more than 3 days, with marked lethargy, a rash, or trouble breathing",
          ],
          es: [
            "Las convulsiones febriles pueden ocurrir en algunos niños pequeños (6 meses a 5 años) durante una subida rápida de fiebre; impresionantes pero generalmente sin peligro a largo plazo",
            "Consultar si la fiebre supera los 40 °C, dura más de 3 días, viene con letargo marcado, una erupción cutánea, o dificultad para respirar",
          ],
        },
      },
    ],
  },
  rhume: {
    title: { fr: "Rhume & infections respiratoires", en: "Colds & respiratory infections", es: "Resfriado e infecciones respiratorias" },
    illu: "sante",
    intro: {
      fr: "Les infections respiratoires sont la raison de consultation la plus fréquente chez les jeunes enfants. La grande majorité sont virales et se résolvent sans traitement spécifique.",
      en: "Respiratory infections are the most common reason for pediatric visits. The vast majority are viral and resolve without specific treatment.",
      es: "Las infecciones respiratorias son el motivo de consulta más frecuente en niños pequeños. La gran mayoría son virales y se resuelven sin tratamiento específico.",
    },
    groups: [
      {
        title: { fr: "Ce qui est normal & comment soulager", en: "What's normal & how to help", es: "Lo que es normal y cómo aliviar" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Un jeune enfant peut avoir 6 à 8 rhumes par année, davantage en garderie : c'est normal et contribue à construire son système immunitaire",
            "Solution saline et succion nasale douce (poire ou mouche-bébé) aident à dégager le nez, surtout avant les boires et le sommeil",
            "Humidificateur (air frais, propre et bien entretenu), hydratation et repos favorisent la guérison",
            "La toux peut persister 2 à 3 semaines après un rhume, c'est normal chez le jeune enfant",
            "Le miel (dès 1 an seulement) peut apaiser la toux; le miel est formellement interdit avant 1 an (risque de botulisme)",
            "Les décongestionnants et sirops contre la toux en vente libre ne sont généralement pas recommandés chez les enfants de moins de 6 ans",
          ],
          en: [
            "A young child can have 6 to 8 colds a year, more in daycare: this is normal and helps build their immune system",
            "Saline solution and gentle nasal suction (bulb or aspirator) help clear the nose, especially before feeds and sleep",
            "A humidifier (clean, well-maintained, cool mist), hydration, and rest support recovery",
            "A cough can linger 2 to 3 weeks after a cold, which is normal in young children",
            "Honey (only from age 1 on) can soothe a cough; honey is strictly off-limits before age 1 (botulism risk)",
            "Over-the-counter decongestants and cough syrups generally aren't recommended for children under 6",
          ],
          es: [
            "Un niño pequeño puede tener de 6 a 8 resfriados al año, más si va a la guardería: es normal y ayuda a construir su sistema inmunológico",
            "La solución salina y la succión nasal suave (perilla o aspirador) ayudan a despejar la nariz, especialmente antes de las tomas y el sueño",
            "Un humidificador (aire fresco, limpio y bien mantenido), hidratación y descanso favorecen la recuperación",
            "La tos puede persistir de 2 a 3 semanas después de un resfriado, es normal en el niño pequeño",
            "La miel (solo a partir del año) puede calmar la tos; la miel está estrictamente prohibida antes del año (riesgo de botulismo)",
            "Los descongestionantes y jarabes para la tos de venta libre generalmente no se recomiendan en niños menores de 6 años",
          ],
        },
      },
      {
        title: { fr: "Bronchiolite & croup", en: "Bronchiolitis & croup", es: "Bronquiolitis y crup" },
        color: COLORS.ochre,
        illu: "allergyWarning",
        items: {
          fr: [
            "La bronchiolite (souvent causée par le VRS) touche surtout les moins de 2 ans : respiration sifflante, toux, difficulté à respirer",
            "Le croup se manifeste par une toux qui ressemble à un aboiement de phoque et une respiration bruyante, souvent la nuit; l'air frais et humide peut soulager temporairement",
          ],
          en: [
            "Bronchiolitis (often caused by RSV) mainly affects children under 2: wheezing, coughing, trouble breathing",
            "Croup causes a barking, seal-like cough and noisy breathing, often at night; cool, humid air can bring temporary relief",
          ],
          es: [
            "La bronquiolitis (a menudo causada por el VRS) afecta sobre todo a los menores de 2 años: respiración sibilante, tos, dificultad para respirar",
            "El crup se manifiesta con una tos que suena como un ladrido de foca y una respiración ruidosa, a menudo por la noche; el aire fresco y húmedo puede aliviar temporalmente",
          ],
        },
      },
      {
        title: { fr: "Quand consulter", en: "When to see a provider", es: "Cuándo consultar" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: [
            "Consulter si difficulté à respirer, respiration sifflante ou bruyante, tirage (la peau se creuse entre les côtes), ou refus de boire",
            "Consulter en urgence si les lèvres ou le visage deviennent bleutés, ou si l'enfant semble épuisé par l'effort de respirer",
          ],
          en: [
            "See a provider for trouble breathing, wheezing or noisy breathing, chest retractions (skin pulling in between the ribs), or refusal to drink",
            "Seek emergency care if lips or face turn bluish, or if the child seems exhausted from the effort of breathing",
          ],
          es: [
            "Consultar si hay dificultad para respirar, respiración sibilante o ruidosa, tiraje (la piel se hunde entre las costillas), o rechazo a beber",
            "Consultar de urgencia si los labios o la cara se ponen azulados, o si el niño parece agotado por el esfuerzo de respirar",
          ],
        },
      },
    ],
  },
  gastro: {
    title: { fr: "Gastro-entérite", en: "Gastroenteritis", es: "Gastroenteritis" },
    illu: "hydration",
    intro: {
      fr: "La gastro-entérite est très fréquente chez les jeunes enfants. Le principal risque n'est pas le virus lui-même, mais la déshydratation qu'il peut entraîner.",
      en: "Gastroenteritis is very common in young children. The main risk isn't the virus itself, but the dehydration it can cause.",
      es: "La gastroenteritis es muy frecuente en niños pequeños. El principal riesgo no es el virus en sí, sino la deshidratación que puede provocar.",
    },
    groups: [
      {
        title: { fr: "L'essentiel : hydratation", en: "The essential: hydration", es: "Lo esencial: hidratación" },
        color: COLORS.blue,
        illu: "hydration",
        items: {
          fr: [
            "Vomissements et diarrhée sont le plus souvent causés par un virus et se résolvent en quelques jours sans traitement spécifique",
            "L'hydratation est la priorité absolue : petites gorgées fréquentes plutôt que de grandes quantités d'un coup, solution de réhydratation orale recommandée si les pertes sont importantes",
            "Poursuivre l'allaitement ou l'alimentation habituelle dès que tolérée; il n'est généralement plus recommandé de jeûner",
            "Éviter les jus et boissons très sucrées pendant un épisode de diarrhée, car ils peuvent l'aggraver",
            "Le vaccin contre le rotavirus, offert en bas âge selon le calendrier vaccinal, réduit significativement le risque de gastro-entérite sévère",
          ],
          en: [
            "Vomiting and diarrhea are most often caused by a virus and resolve within a few days without specific treatment",
            "Hydration is the absolute priority: small frequent sips rather than large amounts at once, oral rehydration solution recommended if losses are significant",
            "Resume breastfeeding or regular feeding as soon as tolerated; fasting is generally no longer recommended",
            "Avoid juice and very sugary drinks during a bout of diarrhea, as they can make it worse",
            "The rotavirus vaccine, given in infancy per the vaccination schedule, significantly reduces the risk of severe gastroenteritis",
          ],
          es: [
            "Los vómitos y la diarrea suelen ser causados por un virus y se resuelven en unos días sin tratamiento específico",
            "La hidratación es la prioridad absoluta: pequeños sorbos frecuentes en lugar de grandes cantidades de una vez, se recomienda solución de rehidratación oral si las pérdidas son importantes",
            "Retomar la lactancia o la alimentación habitual tan pronto como se tolere; generalmente ya no se recomienda ayunar",
            "Evitar jugos y bebidas muy azucaradas durante un episodio de diarrea, ya que pueden empeorarla",
            "La vacuna contra el rotavirus, aplicada en la infancia según el calendario de vacunación, reduce significativamente el riesgo de gastroenteritis severa",
          ],
        },
      },
      {
        title: { fr: "Signes de déshydratation", en: "Signs of dehydration", es: "Señales de deshidratación" },
        color: COLORS.ochre,
        illu: "allergyWarning",
        items: {
          fr: [
            "Signes de déshydratation légère à surveiller : bouche sèche, moins de couches mouillées, soif accrue, légère irritabilité",
            "Signes de déshydratation modérée à sévère : peu ou pas de larmes en pleurant, yeux creux, léthargie marquée, fontanelle creuse, peau qui reste plissée après un pincement doux",
            "La diarrhée peut durer jusqu'à 1 à 2 semaines même après la résolution des autres symptômes; ce n'est pas nécessairement un signe de complication",
            "Une bonne hygiène des mains limite la propagation aux autres membres de la famille",
          ],
          en: [
            "Signs of mild dehydration to watch for: dry mouth, fewer wet diapers, increased thirst, mild irritability",
            "Signs of moderate to severe dehydration: little or no tears when crying, sunken eyes, marked lethargy, a sunken fontanelle, skin that stays tented after a gentle pinch",
            "Diarrhea can last up to 1 to 2 weeks even after other symptoms resolve; this isn't necessarily a sign of complication",
            "Good hand hygiene limits spread to other family members",
          ],
          es: [
            "Señales de deshidratación leve a vigilar: boca seca, menos pañales mojados, más sed, ligera irritabilidad",
            "Señales de deshidratación moderada a severa: pocas o ninguna lágrima al llorar, ojos hundidos, letargo marcado, fontanela hundida, piel que permanece plegada después de un pellizco suave",
            "La diarrea puede durar hasta 1 a 2 semanas incluso después de que los otros síntomas se resuelvan; esto no es necesariamente una señal de complicación",
            "Una buena higiene de manos limita el contagio a otros miembros de la familia",
          ],
        },
      },
      {
        title: { fr: "Quand consulter", en: "When to seek help", es: "Cuándo consultar" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: ["Consulter en urgence si signes de déshydratation modérée à sévère, sang dans les selles ou les vomissures, vomissements incoercibles empêchant toute hydratation, ou fièvre élevée persistante chez un très jeune enfant"],
          en: ["Seek urgent care for signs of moderate to severe dehydration, blood in the stool or vomit, uncontrollable vomiting preventing any hydration, or persistent high fever in a very young child"],
          es: ["Consultar de urgencia si hay señales de deshidratación moderada a severa, sangre en las heces o el vómito, vómitos incontrolables que impiden cualquier hidratación, o fiebre alta persistente en un niño muy pequeño"],
        },
      },
    ],
  },
  otite: {
    title: { fr: "Otite", en: "Ear infection", es: "Otitis" },
    illu: "sante",
    intro: {
      fr: "L'otite moyenne aiguë est l'une des infections les plus fréquentes de la petite enfance, souvent liée à l'anatomie encore immature des trompes d'Eustache.",
      en: "Acute otitis media is one of the most common infections in early childhood, often related to the still-immature anatomy of the Eustachian tubes.",
      es: "La otitis media aguda es una de las infecciones más frecuentes en la primera infancia, a menudo ligada a la anatomía aún inmadura de las trompas de Eustaquio.",
    },
    groups: [
      {
        title: { fr: "Reconnaître les signes", en: "Recognizing the signs", es: "Reconocer las señales" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Très fréquente chez les jeunes enfants, souvent après ou pendant un rhume, en raison de trompes d'Eustache plus courtes et horizontales chez le tout-petit",
            "Signes chez le nourrisson qui ne peut pas exprimer la douleur : se tire ou se frotte l'oreille, pleurs inconsolables, irritabilité, difficulté à dormir, fièvre",
            "Signes chez l'enfant plus vieux : douleur à l'oreille clairement exprimée, sensation de plénitude, parfois une baisse temporaire de l'audition",
          ],
          en: [
            "Very common in young children, often after or during a cold, due to shorter, more horizontal Eustachian tubes in little ones",
            "Signs in an infant who can't express pain: pulling or rubbing the ear, inconsolable crying, irritability, trouble sleeping, fever",
            "Signs in an older child: clearly expressed ear pain, a feeling of fullness, sometimes a temporary drop in hearing",
          ],
          es: [
            "Muy frecuente en niños pequeños, a menudo después o durante un resfriado, debido a trompas de Eustaquio más cortas y horizontales en los más pequeños",
            "Señales en el bebé que no puede expresar el dolor: se tira o se frota la oreja, llanto inconsolable, irritabilidad, dificultad para dormir, fiebre",
            "Señales en el niño más grande: dolor de oído claramente expresado, sensación de plenitud, a veces una disminución temporal de la audición",
          ],
        },
      },
      {
        title: { fr: "Traitement & prévention", en: "Treatment & prevention", es: "Tratamiento y prevención" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Certaines otites se résolvent seules sans antibiotiques; un professionnel de la santé évalue si un traitement est nécessaire",
            "L'approche d'observation (attendre 48-72h avant de prescrire des antibiotiques) est parfois recommandée chez les enfants plus âgés avec des symptômes légers",
            "Les otites à répétition peuvent parfois nécessiter une évaluation en ORL",
            "L'exposition à la fumée secondaire et l'utilisation prolongée de la sucette après 6 mois peuvent augmenter le risque d'otites",
            "L'allaitement est associé à une réduction du risque d'otites chez le nourrisson",
          ],
          en: [
            "Some ear infections resolve on their own without antibiotics; a provider assesses whether treatment is needed",
            "A 'watchful waiting' approach (48-72h before prescribing antibiotics) is sometimes recommended for older children with mild symptoms",
            "Recurring ear infections may sometimes need an ENT evaluation",
            "Exposure to secondhand smoke and prolonged pacifier use after 6 months can increase ear infection risk",
            "Breastfeeding is associated with a lower risk of ear infections in infants",
          ],
          es: [
            "Algunas otitis se resuelven solas sin antibióticos; un profesional de la salud evalúa si es necesario un tratamiento",
            "El enfoque de observación (esperar 48-72h antes de recetar antibióticos) a veces se recomienda en niños mayores con síntomas leves",
            "Las otitis recurrentes a veces pueden necesitar una evaluación con otorrinolaringología",
            "La exposición al humo de segunda mano y el uso prolongado del chupete después de los 6 meses pueden aumentar el riesgo de otitis",
            "La lactancia materna está asociada con una reducción del riesgo de otitis en el bebé",
          ],
        },
      },
      {
        title: { fr: "Quand consulter", en: "When to see a provider", es: "Cuándo consultar" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: [
            "Consulter si douleur intense, fièvre élevée, écoulement de l'oreille (peut indiquer une perforation du tympan), ou symptômes qui persistent malgré le traitement",
            "Consulter en urgence si gonflement derrière l'oreille, forte fièvre avec léthargie, ou raideur de la nuque associée",
          ],
          en: [
            "See a provider for severe pain, high fever, fluid draining from the ear (can indicate a ruptured eardrum), or symptoms that persist despite treatment",
            "Seek urgent care for swelling behind the ear, high fever with lethargy, or associated neck stiffness",
          ],
          es: [
            "Consultar si hay dolor intenso, fiebre alta, secreción del oído (puede indicar perforación del tímpano), o síntomas que persisten a pesar del tratamiento",
            "Consultar de urgencia si hay hinchazón detrás de la oreja, fiebre alta con letargo, o rigidez de nuca asociada",
          ],
        },
      },
    ],
  },
  eruptions: {
    title: { fr: "Éruptions cutanées courantes", en: "Common skin rashes", es: "Erupciones cutáneas comunes" },
    illu: "sante",
    intro: {
      fr: "La peau d'un enfant réagit à de nombreux déclencheurs — virus, allergies, chaleur — et présente souvent des éruptions bénignes qui inquiètent pourtant beaucoup les parents.",
      en: "A child's skin reacts to many triggers — viruses, allergies, heat — and often shows harmless rashes that still worry parents a great deal.",
      es: "La piel de un niño reacciona a muchos factores — virus, alergias, calor — y a menudo presenta erupciones benignas que sin embargo preocupan mucho a los padres.",
    },
    groups: [
      {
        title: { fr: "Éruptions bénignes courantes", en: "Common harmless rashes", es: "Erupciones benignas comunes" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: [
            "Éczéma : peau sèche, rouge, qui démange, souvent aux plis et aux joues chez le nourrisson; hydratation régulière et généreuse est le traitement de base",
            "Roséole : fièvre élevée pendant 3-5 jours suivie d'une éruption rosée, fréquente entre 6 mois et 2 ans",
            "Cinquième maladie : joues rouges très marquées (« joues giflées »), puis éruption réticulée sur le corps; bénigne chez l'enfant en santé",
            "Dermatite séborrhéique (chapeau) : croûtes jaunâtres et grasses sur le cuir chevelu, bénigne, s'améliore avec des massages doux à l'huile",
            "Éruption de chaleur (miliaire) : petits boutons rouges dans les zones de transpiration; se résout en gardant l'enfant au frais",
            "Piqûres d'insectes et réactions de contact peuvent aussi causer des rougeurs localisées, généralement sans gravité",
          ],
          en: [
            "Eczema: dry, red, itchy skin, often in the folds and on the cheeks in infants; regular, generous moisturizing is the foundation of treatment",
            "Roseola: high fever for 3-5 days followed by a pink rash, common between 6 months and 2 years",
            "Fifth disease: very marked red cheeks ('slapped cheek'), then a lacy rash on the body; harmless in healthy children",
            "Seborrheic dermatitis (cradle cap): yellowish, greasy scales on an infant's scalp, harmless, improves with gentle oil massage",
            "Heat rash (miliaria): small red bumps in sweaty areas; resolves by keeping the child cool",
            "Insect bites and contact reactions can also cause localized redness, generally not serious",
          ],
          es: [
            "Eccema: piel seca, roja, que pica, a menudo en los pliegues y las mejillas del bebé; la hidratación regular y generosa es el tratamiento base",
            "Roséola: fiebre alta durante 3-5 días seguida de una erupción rosada, frecuente entre los 6 meses y los 2 años",
            "Quinta enfermedad: mejillas rojas muy marcadas (« mejillas abofeteadas »), luego una erupción reticulada en el cuerpo; benigna en el niño sano",
            "Dermatitis seborreica (costra láctea): costras amarillentas y grasosas en el cuero cabelludo, benigna, mejora con masajes suaves con aceite",
            "Sarpullido por calor (miliaria): pequeños granitos rojos en zonas de sudor; se resuelve manteniendo al niño fresco",
            "Las picaduras de insectos y las reacciones de contacto también pueden causar enrojecimiento localizado, generalmente sin gravedad",
          ],
        },
      },
      {
        title: { fr: "Éruptions contagieuses", en: "Contagious rashes", es: "Erupciones contagiosas" },
        color: COLORS.ochre,
        illu: "allergyWarning",
        items: {
          fr: [
            "Varicelle : petites cloques qui démangent apparaissant par vagues; consulter pour confirmer et connaître les consignes d'isolement",
            "Urticaire : plaques surélevées qui démangent, migrant sur le corps; peut indiquer une réaction allergique, virale ou sans cause identifiée",
            "Impétigo : infection bactérienne cutanée avec des plaques rouges et des croûtes couleur miel, très contagieuse, nécessite un traitement",
          ],
          en: [
            "Chickenpox: small itchy blisters appearing in waves; see a provider to confirm and learn isolation guidance",
            "Hives: raised, itchy welts that migrate around the body; can signal an allergic, viral, or sometimes unidentified trigger",
            "Impetigo: a bacterial skin infection with red patches and honey-colored crusts, highly contagious, needs treatment",
          ],
          es: [
            "Varicela: pequeñas ampollas que pican y aparecen en oleadas; consultar para confirmar y conocer las indicaciones de aislamiento",
            "Urticaria: placas elevadas que pican y migran por el cuerpo; puede indicar una reacción alérgica, viral o sin causa identificada",
            "Impétigo: infección cutánea bacteriana con placas rojas y costras color miel, muy contagiosa, requiere tratamiento",
          ],
        },
      },
      {
        title: { fr: "Quand consulter en urgence", en: "When to seek emergency care", es: "Cuándo buscar atención de urgencia" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: ["Consulter en urgence si une éruption s'accompagne de fièvre élevée, de difficulté à respirer, de gonflement du visage, ou si elle ne pâlit pas sous la pression d'un verre"],
          en: ["Seek urgent care if a rash comes with high fever, trouble breathing, facial swelling, or if it doesn't fade under pressure from a glass"],
          es: ["Consultar de urgencia si una erupción viene acompañada de fiebre alta, dificultad para respirar, hinchazón de la cara, o si no se desvanece al presionarla con un vaso"],
        },
      },
    ],
  },
  urgence: {
    title: { fr: "Quand consulter d'urgence", en: "When to seek emergency care", es: "Cuándo buscar atención de urgencia" },
    illu: "emergency",
    intro: {
      fr: "Certains signes exigent une attention médicale immédiate. Les connaître à l'avance permet d'agir vite et sans hésitation le moment venu.",
      en: "Certain signs call for immediate medical attention. Knowing them in advance helps you act quickly and without hesitation when it matters.",
      es: "Ciertas señales requieren atención médica inmediata. Conocerlas de antemano permite actuar rápido y sin dudar cuando llega el momento.",
    },
    groups: [
      {
        title: { fr: "Signes respiratoires & neurologiques", en: "Breathing & neurological signs", es: "Señales respiratorias y neurológicas" },
        color: COLORS.pink,
        illu: "emergency",
        items: {
          fr: [
            "Difficulté à respirer, respiration très rapide, bruyante ou laborieuse, tirage marqué entre les côtes",
            "Lèvres, langue ou visage de couleur bleutée ou grisâtre",
            "Léthargie marquée, bébé très difficile à réveiller, regard vide ou absent",
            "Convulsions, même brèves, surtout une première convulsion",
          ],
          en: [
            "Trouble breathing, very fast, noisy, or labored breathing, marked chest retractions between the ribs",
            "Bluish or grayish lips, tongue, or face",
            "Marked lethargy, baby very hard to wake, a blank or absent stare",
            "Seizures, even brief ones, especially a first-time seizure",
          ],
          es: [
            "Dificultad para respirar, respiración muy rápida, ruidosa o laboriosa, tiraje marcado entre las costillas",
            "Labios, lengua o rostro de color azulado o grisáceo",
            "Letargo marcado, bebé muy difícil de despertar, mirada vacía o ausente",
            "Convulsiones, aunque sean breves, especialmente una primera convulsión",
          ],
        },
      },
      {
        title: { fr: "Déshydratation, fièvre & digestif", en: "Dehydration, fever & digestive", es: "Deshidratación, fiebre y digestivo" },
        color: COLORS.ochre,
        illu: "allergyWarning",
        items: {
          fr: [
            "Signes de déshydratation sévère : absence de larmes, bouche très sèche, peu ou pas de couches mouillées en 8 heures, fontanelle creuse",
            "Fièvre chez un bébé de moins de 3 mois (38 °C et plus, rectale)",
            "Vomissements avec du sang ou de couleur verte (bile), ventre dur, gonflé et douloureux au toucher",
            "Éruption cutanée qui ne pâlit pas sous la pression d'un verre, associée à de la fièvre",
          ],
          en: [
            "Signs of severe dehydration: no tears, very dry mouth, few or no wet diapers in 8 hours, a sunken fontanelle",
            "Fever in a baby under 3 months old (38 °C / 100.4 °F or higher, rectal)",
            "Vomit that is bloody or green (bile-colored), a hard, swollen belly that's painful to the touch",
            "A rash that doesn't fade under pressure from a glass, combined with fever",
          ],
          es: [
            "Señales de deshidratación severa: ausencia de lágrimas, boca muy seca, pocos o ningún pañal mojado en 8 horas, fontanela hundida",
            "Fiebre en un bebé menor de 3 meses (38 °C o más, rectal)",
            "Vómitos con sangre o de color verde (bilis), vientre duro, hinchado y doloroso al tacto",
            "Erupción cutánea que no se desvanece al presionarla con un vaso, asociada con fiebre",
          ],
        },
      },
      {
        title: { fr: "Traumatismes, allergies & ingestion", en: "Injury, allergy & ingestion", es: "Traumatismos, alergias e ingestión" },
        color: COLORS.blue,
        illu: "checklistIllu",
        items: {
          fr: [
            "Chute avec perte de conscience, même brève, ou choc important à la tête",
            "Ingestion possible d'un produit toxique, d'un médicament, ou d'une pile bouton",
            "Réaction allergique sévère : enflure du visage/de la gorge, urticaire généralisée avec difficulté à respirer",
            "Blessure grave, saignement qui ne s'arrête pas avec une pression directe, brûlure étendue",
          ],
          en: [
            "A fall with loss of consciousness, even brief, or a significant head impact",
            "Possible ingestion of a toxic product, medication, or button battery",
            "Severe allergic reaction: swelling of the face/throat, widespread hives with trouble breathing",
            "A serious injury, bleeding that won't stop with direct pressure, an extensive burn",
          ],
          es: [
            "Caída con pérdida de conciencia, aunque sea breve, o golpe importante en la cabeza",
            "Posible ingestión de un producto tóxico, un medicamento, o una pila botón",
            "Reacción alérgica severa: hinchazón de la cara/garganta, urticaria generalizada con dificultad para respirar",
            "Lesión grave, sangrado que no se detiene con presión directa, quemadura extensa",
          ],
        },
      },
      {
        title: { fr: "En cas de doute", en: "When in doubt", es: "En caso de duda" },
        color: COLORS.sage,
        illu: "heartCareIllu",
        items: {
          fr: ["Dans le doute, contacter une ligne infosanté (811 au Québec, ou l'équivalent local) ou se présenter directement à l'urgence — il vaut toujours mieux consulter pour rien que de retarder des soins nécessaires"],
          en: ["When in doubt, call a nurse helpline (811 in Quebec, or your local equivalent) or go straight to the emergency room — it's always better to be seen for nothing than to delay needed care"],
          es: ["En caso de duda, llamar a una línea de salud (811 en Quebec, o el equivalente local) o acudir directamente a urgencias — siempre es mejor consultar por nada que retrasar la atención necesaria"],
        },
      },
    ],
  },
  vaccination: {
    title: { fr: "Vaccination", en: "Vaccination", es: "Vacunación" },
    illu: "vaccine",
    intro: {
      fr: "La vaccination est l'une des interventions de santé publique les plus efficaces pour protéger les enfants contre des maladies graves, parfois mortelles.",
      en: "Vaccination is one of the most effective public health interventions for protecting children against serious, sometimes fatal, diseases.",
      es: "La vacunación es una de las intervenciones de salud pública más eficaces para proteger a los niños contra enfermedades graves, a veces mortales.",
    },
    groups: [
      {
        title: { fr: "Le calendrier & les bénéfices", en: "The schedule & its benefits", es: "El calendario y sus beneficios" },
        color: COLORS.blue,
        illu: "vaccine",
        items: {
          fr: [
            "Le calendrier vaccinal débute dès 2 mois et se poursuit jusqu'à l'adolescence, avec des rappels à des âges précis",
            "Les vaccins protègent contre des maladies graves : coqueluche, rougeole, oreillons, rubéole, méningite, pneumonie à pneumocoque, hépatite B, polio, rotavirus, varicelle, entre autres",
            "L'immunité de groupe protège aussi les personnes qui ne peuvent pas être vaccinées (nourrissons trop jeunes, personnes immunosupprimées)",
            "Un retard vaccinal peut généralement être rattrapé; en discuter avec le professionnel de la santé",
            "Certains vaccins combinés permettent de réduire le nombre d'injections tout en couvrant plusieurs maladies",
          ],
          en: [
            "The vaccination schedule starts at 2 months and continues into adolescence, with boosters at specific ages",
            "Vaccines protect against serious diseases: whooping cough, measles, mumps, rubella, meningitis, pneumococcal pneumonia, hepatitis B, polio, rotavirus, chickenpox, among others",
            "Herd (community) immunity also protects people who can't be vaccinated (infants too young, immunocompromised individuals)",
            "A delayed schedule can usually be caught up; talk to a provider about a catch-up schedule",
            "Combination vaccines reduce the number of injections while covering several diseases at once",
          ],
          es: [
            "El calendario de vacunación comienza a los 2 meses y continúa hasta la adolescencia, con refuerzos en edades precisas",
            "Las vacunas protegen contra enfermedades graves: tos ferina, sarampión, paperas, rubéola, meningitis, neumonía neumocócica, hepatitis B, polio, rotavirus, varicela, entre otras",
            "La inmunidad colectiva también protege a las personas que no pueden vacunarse (bebés demasiado pequeños, personas inmunosuprimidas)",
            "Un retraso en el calendario generalmente se puede recuperar; hablarlo con el profesional de la salud",
            "Algunas vacunas combinadas permiten reducir el número de inyecciones mientras cubren varias enfermedades",
          ],
        },
      },
      {
        title: { fr: "Effets secondaires & précautions", en: "Side effects & precautions", es: "Efectos secundarios y precauciones" },
        color: COLORS.sage,
        illu: "checklistIllu",
        items: {
          fr: [
            "Des effets secondaires légers (fièvre, rougeur ou douleur au site d'injection, irritabilité passagère) sont fréquents et temporaires",
            "Les effets secondaires graves sont extrêmement rares; les bénéfices de la vaccination dépassent largement les risques",
            "Les vaccins vivants atténués (comme RRO) nécessitent des précautions particulières chez les enfants immunosupprimés : en discuter avec le médecin",
            "Apporter le carnet de vaccination à chaque visite médicale et le conserver précieusement pour l'entrée à la garderie et à l'école",
            "Suivre le calendrier officiel de sa région et consulter son professionnel de la santé pour toute question ou hésitation",
          ],
          en: [
            "Mild side effects (fever, redness or soreness at the injection site, temporary irritability) are common and short-lived",
            "Serious side effects are extremely rare; the benefits of vaccination far outweigh the risks",
            "Live attenuated vaccines (like MMR) require special precautions for immunocompromised children: discuss this with your doctor",
            "Bring the vaccination record to every medical visit and keep it safe, as it's needed for daycare and school enrollment",
            "Follow the official schedule for your region and talk to your provider with any questions or hesitations",
          ],
          es: [
            "Los efectos secundarios leves (fiebre, enrojecimiento o dolor en el sitio de inyección, irritabilidad pasajera) son frecuentes y temporales",
            "Los efectos secundarios graves son extremadamente raros; los beneficios de la vacunación superan ampliamente los riesgos",
            "Las vacunas vivas atenuadas (como SPR) requieren precauciones especiales en niños inmunosuprimidos: hablarlo con el médico",
            "Llevar el carnet de vacunación a cada visita médica y conservarlo con cuidado, ya que se necesita para ingresar a la guardería y a la escuela",
            "Seguir el calendario oficial de tu región y consultar a tu profesional de la salud ante cualquier duda o hesitación",
          ],
        },
      },
      {
        title: { fr: "COVID-19 & protection du nourrisson", en: "COVID-19 & infant protection", es: "COVID-19 y protección del bebé" },
        color: COLORS.pink,
        illu: "heartCareIllu",
        items: {
          fr: [
            "La vaccination contre la COVID-19 est recommandée pendant la grossesse et l'allaitement selon les autorités de santé publique",
            "Les anticorps produits par la mère traversent le placenta durant la grossesse, offrant au nouveau-né une protection passive temporaire dès la naissance",
            "Cette protection se transmet aussi par le lait maternel, ajoutant une couche de protection supplémentaire",
            "Le nourrisson ne reçoit généralement pas son propre vaccin contre la COVID-19 avant 6 mois; se référer au calendrier vaccinal local",
            "L'immunité passive transmise par la mère diminue progressivement, d'où l'importance du calendrier vaccinal propre au nourrisson par la suite",
          ],
          en: [
            "COVID-19 vaccination is recommended during pregnancy and while breastfeeding per public health authorities",
            "Antibodies the mother produces cross the placenta during pregnancy, giving the newborn temporary passive protection right from birth",
            "This protection is also passed on through breast milk, adding another layer of protection",
            "Infants generally don't receive their own COVID-19 vaccine before 6 months; check your local vaccination schedule",
            "The passive immunity passed on by the mother gradually wanes, which is why the infant's own vaccination schedule matters afterward",
          ],
          es: [
            "La vacunación contra la COVID-19 se recomienda durante el embarazo y la lactancia según las autoridades de salud pública",
            "Los anticuerpos producidos por la madre atraviesan la placenta durante el embarazo, dándole al recién nacido una protección pasiva temporal desde el nacimiento",
            "Esta protección también se transmite a través de la leche materna, añadiendo una capa adicional de protección",
            "El bebé generalmente no recibe su propia vacuna contra la COVID-19 antes de los 6 meses; consultar el calendario de vacunación local",
            "La inmunidad pasiva transmitida por la madre disminuye gradualmente, de ahí la importancia del calendario de vacunación propio del bebé posteriormente",
          ],
        },
      },
    ],
  },
};


/* ---------------- MISSION / MEMBERSHIP TEXT ---------------- */
const MISSION = {
  fr: {
    title: "Notre mission",
    p: [
      "Me My Baby existe parce que devenir parent ne devrait jamais rimer avec se perdre dans cent onglets de navigateur à 2 h du matin.",
      "Notre mission est de rassembler, en un seul endroit fiable et bienveillant, tout ce qu'il faut savoir de l'envie d'un enfant jusqu'à ses 5 ans — et de vous accompagner concrètement au quotidien : Léa, notre diététicienne virtuelle, vous prépare des menus personnalisés ; Mia répond à vos questions à toute heure ; des outils simples suivent l'allaitement, le sommeil, les coups de bébé, les rendez-vous et la croissance de votre enfant.",
      "Nous croyons que chaque famille mérite des repères clairs, sans jugement, et des outils qui allègent vraiment le quotidien plutôt que de l'alourdir.",
    ],
    values: [
      { t: "Fiable", d: "Contenu basé sur les repères de développement reconnus et les recommandations en santé périnatale et pédiatrique." },
      { t: "Bienveillant", d: "Un ton chaleureux, sans culpabilisation, qui respecte le rythme de chaque parent et de chaque enfant." },
      { t: "Complet", d: "Un seul endroit pour la conception, la grossesse, le post-partum et le développement jusqu'à 5 ans." },
      { t: "À vos côtés au quotidien", d: "Léa, Mia, et des outils concrets (trackers, rendez-vous, journal) qui vous suivent chaque jour, pas seulement dans les moments de recherche." },
    ],
  },
  en: {
    title: "Our mission",
    p: [
      "Me My Baby exists because becoming a parent should never mean getting lost in a hundred browser tabs at 2 a.m.",
      "Our mission is to gather, in one reliable and caring place, everything you need to know from wanting a child to their 5th birthday — and to support you concretely day to day: Léa, our virtual dietitian, prepares personalized menus for you; Mia answers your questions any time; simple tools track feeding, sleep, baby's kicks, appointments, and your child's growth.",
      "We believe every family deserves clear, judgment-free guidance, and tools that genuinely lighten daily life instead of adding to it.",
    ],
    values: [
      { t: "Reliable", d: "Content grounded in recognized developmental milestones and perinatal and pediatric health guidance." },
      { t: "Caring", d: "A warm, guilt-free tone that respects every parent's and every child's own pace." },
      { t: "Complete", d: "One place for conception, pregnancy, postpartum and development up to age 5." },
      { t: "By your side every day", d: "Léa, Mia, and practical tools (trackers, appointments, journal) that stay with you daily, not just when you're searching for answers." },
    ],
  },
  es: {
    title: "Nuestra misión",
    p: [
      "Me My Baby existe porque convertirse en padre o madre nunca debería significar perderse entre cien pestañas del navegador a las 2 de la madrugada.",
      "Nuestra misión es reunir, en un solo lugar confiable y cálido, todo lo que necesitas saber desde el deseo de tener un hijo hasta sus 5 años — y acompañarte de forma concreta día a día: Léa, nuestra nutricionista virtual, te prepara menús personalizados; Mia responde tus preguntas a cualquier hora; herramientas sencillas hacen seguimiento de la lactancia, el sueño, los movimientos del bebé, las citas y el crecimiento de tu hijo.",
      "Creemos que cada familia merece guías claras, sin juicios, y herramientas que realmente aligeren el día a día en lugar de complicarlo.",
    ],
    values: [
      { t: "Confiable", d: "Contenido basado en hitos del desarrollo reconocidos y recomendaciones en salud perinatal y pediátrica." },
      { t: "Cálida", d: "Un tono cercano, sin culpas, que respeta el ritmo de cada padre, madre e hijo." },
      { t: "Completa", d: "Un solo lugar para la concepción, el embarazo, el posparto y el desarrollo hasta los 5 años." },
      { t: "A tu lado cada día", d: "Léa, Mia, y herramientas prácticas (seguimientos, citas, diario) que te acompañan a diario, no solo cuando buscas respuestas." },
    ],
  },
};

// Liste ISO 3166-1 de tous les pays (codes à 2 lettres) — utilisée pour générer un sélecteur international complet.
const ISO_COUNTRY_CODES = [
  "AF","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BT","BO","BA","BW","BR","BN","BG","BF","BI",
  "CV","KH","CM","CA","CF","TD","CL","CN","CO","KM","CG","CD","CR","CI","HR","CU","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE",
  "SZ","ET","FJ","FI","FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IR","IQ","IE","IL","IT","JM",
  "JP","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX",
  "FM","MD","MC","MN","ME","MA","MZ","MM","NA","NR","NP","NL","NZ","NI","NE","NG","MK","NO","OM","PK","PW","PA","PG","PY","PE","PH","PL","PT",
  "QA","RO","RU","RW","KN","LC","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SK","SI","SB","SO","ZA","SS","ES","LK","SD","SR","SE","CH",
  "SY","TW","TJ","TZ","TH","TL","TG","TO","TT","TN","TR","TM","TV","UG","UA","AE","GB","US","UY","UZ","VU","VA","VE","VN","YE","ZM","ZW",
];

// Devises approximatives par pays (les pays non listés utilisent USD par défaut — voir currencyForCountry)
const COUNTRY_CURRENCY = {
  CA: "CAD", FR: "EUR", BE: "EUR", CH: "EUR", ES: "EUR", MX: "USD", US: "USD",
  DE: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", IE: "EUR", AT: "EUR", GR: "EUR", LU: "EUR", FI: "EUR",
  GB: "USD",
};

// Génère la liste des pays avec leur nom traduit automatiquement (fr/en/es) via l'API native du navigateur,
// plutôt que de maintenir des traductions manuelles pour ~190 pays.
function buildCountryLabel(code) {
  const label = {};
  for (const loc of [["fr", "fr"], ["en", "en"], ["es", "es"]]) {
    try {
      const dn = new Intl.DisplayNames([loc[1]], { type: "region" });
      label[loc[0]] = dn.of(code) || code;
    } catch (e) { label[loc[0]] = code; }
  }
  return label;
}

const COUNTRIES = ISO_COUNTRY_CODES.map((code) => ({
  code, currency: COUNTRY_CURRENCY[code] || "USD", label: buildCountryLabel(code),
})).sort((a, b) => a.label.fr.localeCompare(b.label.fr, "fr"));

function currencyForCountry(code) {
  return COUNTRIES.find((c) => c.code === code)?.currency || "USD";
}

const LANGUAGES = [
  { code: "fr", label: { fr: "Français", en: "French", es: "Francés" } },
  { code: "en", label: { fr: "Anglais", en: "English", es: "Inglés" } },
  { code: "es", label: { fr: "Espagnol", en: "Spanish", es: "Español" } },
];

const MEMBERSHIP = {
  fr: {
    title: "Devenez membre Me My Baby",
    subtitle: "Un seul abonnement pour ne plus jamais chercher l'information ailleurs.",
    billingMonthly: "Mensuel",
    billingAnnual: "Annuel",
    saveBadge: (pct) => `Économisez ${pct} %`,
    perMonthEquiv: (v, sym) => `≈ ${v} ${sym || "$"} / mois`,
    perMonth: "/ mois",
    perYear: "/ an",
    renewalNoteMonthly: "Renouvellement automatique chaque mois avec le même mode de paiement. Annulable à tout moment, sans frais — l'accès se poursuit jusqu'à la fin de la période déjà payée.",
    renewalNoteAnnual: "Facturé une fois par année et renouvelé automatiquement à chaque année avec le même mode de paiement, sauf annulation avant la date de renouvellement. L'abonnement annuel n'est pas remboursable, mais vous donne accès à tout le contenu pendant 12 mois complets.",
    familyNote: "Un abonnement, deux parents connectés — partagez-le avec votre partenaire, ça reste pour vous et bébé.",
  },
  en: {
    title: "Become a Me My Baby member",
    subtitle: "One membership so you never have to search anywhere else again.",
    billingMonthly: "Monthly",
    billingAnnual: "Annual",
    saveBadge: (pct) => `Save ${pct}%`,
    perMonthEquiv: (v, sym) => `≈ ${sym || "$"}${v} / month`,
    perMonth: "/ month",
    perYear: "/ year",
    renewalNoteMonthly: "Automatically renews every month using the same payment method. Cancel anytime at no cost — access continues until the end of the period already paid for.",
    renewalNoteAnnual: "Billed once a year and automatically renewed each year with the same payment method, unless cancelled before the renewal date. The annual plan is non-refundable but gives you full access to all content for a full 12 months.",
    familyNote: "One membership, two connected parents — share it with your partner, it's still for you and baby.",
  },
  es: {
    title: "Hazte miembro de Me My Baby",
    subtitle: "Una sola membresía para no volver a buscar información en otro lugar.",
    billingMonthly: "Mensual",
    billingAnnual: "Anual",
    saveBadge: (pct) => `Ahorra ${pct} %`,
    perMonthEquiv: (v, sym) => `≈ ${sym || "$"}${v} / mes`,
    perMonth: "/ mes",
    perYear: "/ año",
    renewalNoteMonthly: "Se renueva automáticamente cada mes con el mismo método de pago. Cancelable en cualquier momento, sin costo — el acceso continúa hasta el final del período ya pagado.",
    renewalNoteAnnual: "Se factura una vez al año y se renueva automáticamente cada año con el mismo método de pago, salvo cancelación antes de la fecha de renovación. El plan anual no es reembolsable, pero te da acceso a todo el contenido durante 12 meses completos.",
    familyNote: "Una membresía, dos padres conectados — compártela con tu pareja, sigue siendo para ti y el bebé.",
  },
};

const PLANS = {
  fr: [
    {
      id: "premium", name: "Premium", tagline: "Tout Me My Baby, sans compromis", priceMonthly: 9.95, priceAnnual: 99, badge: "Essai gratuit de 5 jours",
      cta: "Commencer mon essai gratuit de 5 jours",
      features: [
        "Accès illimité à tout le contenu, de la conception à 5 ans",
        "Disponible en français, anglais et espagnol",
        "Léa, votre diététicienne virtuelle : menus personnalisés selon vos besoins, envoyés par courriel",
        "Menus hebdomadaires renouvelés chaque semaine + liste d'épicerie générée automatiquement",
        "Mia, votre assistante virtuelle, disponible 24h/24 pour toutes vos questions",
        "Trackers quotidiens : allaitement, sommeil, couches, coups de bébé, contractions",
        "Suivi de croissance avec courbe et détection de tendances inhabituelles",
        "Rendez-vous & horaire familial pour maman et les enfants",
        "Tâches familiales partagées, pour alléger la charge mentale",
        "Mes documents : carnet de santé numérique avec catégories, notes et rappels de suivi",
        "Album souvenir illustré personnalisable (3 couvertures au choix), avec export PDF",
        "Journal de souvenirs avec photos",
        "Calendrier vaccinal adapté à votre pays ou province (Québec, Canada, France, États-Unis)",
        "Conseil du jour personnalisé selon votre semaine de grossesse ou l'âge de bébé",
        "Questions suggérées à poser à votre médecin, par trimestre",
        "Auto-questionnaire de bien-être post-partum, avec ressources si besoin",
        "Programme d'exercices post-accouchement en 3 étapes",
        "Communauté privée de parents",
      ],
    },
  ],
  en: [
    {
      id: "premium", name: "Premium", tagline: "All of Me My Baby, no compromises", priceMonthly: 9.95, priceAnnual: 99, badge: "5-day free trial",
      cta: "Start my 5-day free trial",
      features: [
        "Unlimited access to all content, from conception to age 5",
        "Available in French, English, and Spanish",
        "Léa, your virtual dietitian: personalized menus based on your needs, sent by email",
        "Weekly menus refreshed every week + auto-generated grocery list",
        "Mia, your virtual assistant, available 24/7 for all your questions",
        "Daily trackers: feeding, sleep, diapers, baby kicks, contractions",
        "Growth tracking with a trend chart and unusual-pattern detection",
        "Appointments & family schedule for mom and the kids",
        "Shared family tasks, to lighten the mental load",
        "My documents: a digital health record with categories, notes, and follow-up reminders",
        "Illustrated, customizable memory album (3 cover styles to choose from), with PDF export",
        "Memory journal with photos",
        "Vaccine calendar adapted to your country or province (Quebec, Canada, France, United States)",
        "Personalized daily tip based on your pregnancy week or baby's age",
        "Suggested questions to ask your doctor, by trimester",
        "Postpartum wellbeing check-in, with resources if needed",
        "3-stage postpartum exercise program",
        "Private parent community",
      ],
    },
  ],
  es: [
    {
      id: "premium", name: "Premium", tagline: "Todo Me My Baby, sin compromisos", priceMonthly: 9.95, priceAnnual: 99, badge: "Prueba gratuita de 5 días",
      cta: "Comenzar mi prueba gratuita de 5 días",
      features: [
        "Acceso ilimitado a todo el contenido, desde la concepción hasta los 5 años",
        "Disponible en francés, inglés y español",
        "Léa, tu nutricionista virtual: menús personalizados según tus necesidades, enviados por correo",
        "Menús semanales renovados cada semana + lista de compras generada automáticamente",
        "Mia, tu asistente virtual, disponible 24/7 para todas tus preguntas",
        "Seguimientos diarios: lactancia, sueño, pañales, movimientos del bebé, contracciones",
        "Seguimiento de crecimiento con gráfico y detección de tendencias inusuales",
        "Citas y horario familiar para mamá y los niños",
        "Tareas familiares compartidas, para aligerar la carga mental",
        "Mis documentos: un expediente de salud digital con categorías, notas y recordatorios de seguimiento",
        "Álbum de recuerdos ilustrado y personalizable (3 estilos de portada), con exportación a PDF",
        "Diario de recuerdos con fotos",
        "Calendario de vacunación adaptado a tu país o provincia (Quebec, Canadá, Francia, Estados Unidos)",
        "Consejo del día personalizado según tu semana de embarazo o la edad del bebé",
        "Preguntas sugeridas para hacerle a tu médico, por trimestre",
        "Cuestionario de bienestar posparto, con recursos si es necesario",
        "Programa de ejercicios posparto en 3 etapas",
        "Comunidad privada de padres",
      ],
    },
  ],
};



/* ---------------- LOGO ---------------- */
function Logo({ height = 46 }) {
  return (
    <svg viewBox="0 0 460 220" height={height} style={{ display: "block" }}>
      <text x="0" y="150" fontFamily="Georgia, 'Times New Roman', serif" fontSize="64" fontWeight="700" fill={COLORS.teal} textLength="262" lengthAdjust="spacingAndGlyphs">Me My Ba</text>
      <g transform="translate(262,150)">
        <rect x="0" y="-47" width="7" height="47" rx="3.5" fill={COLORS.teal} />
        <circle cx="17" cy="-16" r="16" fill={COLORS.teal} />
        <circle cx="21" cy="-22" r="4" fill={COLORS.cream} />
        <path d="M 21,-18.5 C 25.5,-15.5 24.5,-8 17.5,-7 C 11.5,-6.2 8.5,-11 11,-15 C 13,-18 17,-19.5 21,-18.5 Z" fill={COLORS.cream} />
      </g>
      <text x="296" y="150" fontFamily="Georgia, 'Times New Roman', serif" fontSize="64" fontWeight="700" fill={COLORS.teal} textLength="30" lengthAdjust="spacingAndGlyphs">y</text>
      <g transform="translate(379,133) rotate(-15) scale(0.26)" color={COLORS.teal}>
        <path d="M 0,20 C 13,20 15,10 12,0 C 10,-7 5,-14 0,-16 C -5,-14 -10,-7 -12,0 C -15,10 -13,20 0,20 Z" fill="currentColor" />
        <circle cx="-7" cy="-17" r="2.8" fill="currentColor" />
        <circle cx="-3.5" cy="-20" r="3" fill="currentColor" />
        <circle cx="0" cy="-21" r="3.1" fill="currentColor" />
        <circle cx="3.5" cy="-20" r="3" fill="currentColor" />
        <circle cx="7" cy="-17" r="2.8" fill="currentColor" />
      </g>
      <g transform="translate(397,115) rotate(-55) scale(0.36)" color={COLORS.sage}>
        <path d="M 0,20 C 13,20 15,10 12,0 C 10,-7 5,-14 0,-16 C -5,-14 -10,-7 -12,0 C -15,10 -13,20 0,20 Z" fill="currentColor" />
        <circle cx="-7" cy="-17" r="2.8" fill="currentColor" />
        <circle cx="-3.5" cy="-20" r="3" fill="currentColor" />
        <circle cx="0" cy="-21" r="3.1" fill="currentColor" />
        <circle cx="3.5" cy="-20" r="3" fill="currentColor" />
        <circle cx="7" cy="-17" r="2.8" fill="currentColor" />
      </g>
      <g transform="translate(379,97) rotate(-90) scale(0.48)" color={COLORS.ochre}>
        <path d="M 0,20 C 13,20 15,10 12,0 C 10,-7 5,-14 0,-16 C -5,-14 -10,-7 -12,0 C -15,10 -13,20 0,20 Z" fill="currentColor" />
        <circle cx="-7" cy="-17" r="2.8" fill="currentColor" />
        <circle cx="-3.5" cy="-20" r="3" fill="currentColor" />
        <circle cx="0" cy="-21" r="3.1" fill="currentColor" />
        <circle cx="3.5" cy="-20" r="3" fill="currentColor" />
        <circle cx="7" cy="-17" r="2.8" fill="currentColor" />
      </g>
    </svg>
  );
}

/* ---------------- ILLUSTRATIONS (custom brand-style scenes, no external images) ---------------- */
function LeaPhoto({ size = 64 }) {
  return (
    <img
      src="https://images.pexels.com/photos/19675470/pexels-photo-19675470.jpeg?auto=compress&cs=tinysrgb&w=400"
      alt="Léa"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
      onError={(e) => { e.target.style.display = "none"; }}
    />
  );
}

function Illustration({ type, size = 88 }) {
  const c = COLORS;
  const uid = useId();
  const scenes = {
    conception: (
      <>
        <circle cx="50" cy="50" r="38" fill="none" stroke={c.line} strokeWidth="3" strokeDasharray="3 7" />
        <circle cx="50" cy="12" r="5" fill={c.teal} />
        <path d="M50,66 C34,54 30,40 40,34 C46,30 50,34 50,38 C50,34 54,30 60,34 C70,40 66,54 50,66 Z" fill={c.ochre} />
      </>
    ),
    grossesse: (
      <>
        <circle cx="38" cy="22" r="9" fill={c.teal} />
        <path d="M32,31 C27,40 27,50 32,58 C39,80 68,80 63,55 C72,49 69,35 58,30 C49,23 38,24 32,31 Z" fill={c.sage} />
        <circle cx="63" cy="55" r="2.4" fill={c.cream} />
      </>
    ),
    postpartum: (
      <>
        <path d="M64,18 A30,30 0 1,0 64,82 A24,24 0 1,1 64,18 Z" fill={c.teal} />
        <circle cx="34" cy="62" r="11" fill={c.ochre} />
        <circle cx="80" cy="24" r="2.4" fill={c.ochre} />
        <circle cx="70" cy="16" r="1.6" fill={c.ochre} />
      </>
    ),
    dev01: (
      <>
        <g transform="translate(34,66) rotate(-10) scale(1.1)" fill={c.teal}>
          <path d="M 0,20 C 13,20 15,10 12,0 C 10,-7 5,-14 0,-16 C -5,-14 -10,-7 -12,0 C -15,10 -13,20 0,20 Z" />
          <circle cx="-7" cy="-17" r="2.8" /><circle cx="-3.5" cy="-20" r="3" /><circle cx="0" cy="-21" r="3.1" /><circle cx="3.5" cy="-20" r="3" /><circle cx="7" cy="-17" r="2.8" />
        </g>
        <g transform="translate(62,40) rotate(12) scale(1.3)" fill={c.ochre}>
          <path d="M 0,20 C 13,20 15,10 12,0 C 10,-7 5,-14 0,-16 C -5,-14 -10,-7 -12,0 C -15,10 -13,20 0,20 Z" />
          <circle cx="-7" cy="-17" r="2.8" /><circle cx="-3.5" cy="-20" r="3" /><circle cx="0" cy="-21" r="3.1" /><circle cx="3.5" cy="-20" r="3" /><circle cx="7" cy="-17" r="2.8" />
        </g>
        <path d="M78,20 l2.4,5.4 5.6,0.6 -4.2,3.8 1.2,5.6 -5,-3 -5,3 1.2,-5.6 -4.2,-3.8 5.6,-0.6 Z" fill={c.sage} />
      </>
    ),
    dev15: (
      <>
        <circle cx="42" cy="32" r="13" fill={c.sage} />
        <rect x="30" y="45" width="24" height="27" rx="10" fill={c.teal} />
        <circle cx="76" cy="66" r="9" fill={c.ochre} />
        <path d="M55,56 L70,62" stroke={c.teal} strokeWidth="4" strokeLinecap="round" />
      </>
    ),
    alimentation: (
      <>
        <path d="M22,52 a28,20 0 0,0 56,0 Z" fill={c.teal} />
        <ellipse cx="50" cy="52" rx="28" ry="7" fill={c.sage} />
        <circle cx="42" cy="48" r="4" fill={c.ochre} />
        <circle cx="53" cy="46" r="3.4" fill={c.cream} />
        <circle cx="60" cy="49" r="3" fill={c.ochre} />
        <rect x="76" y="18" width="4.5" height="30" rx="2.2" fill={c.ochre} />
        <ellipse cx="78.2" cy="16" rx="6" ry="8" fill={c.ochre} />
      </>
    ),
    soins: (
      <>
        <path d="M18,54 h64 a6,6 0 0,1 -6,11 h-52 a6,6 0 0,1 -6,-11 Z" fill={c.sage} />
        <path d="M24,54 Q30,42 24,32" fill="none" stroke={c.teal} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M24,48 q5,-6 10,0 q5,-6 10,0 q5,-6 10,0 q5,-6 10,0 q5,-6 10,0" stroke={c.teal} strokeWidth="3" fill="none" />
        <circle cx="70" cy="26" r="3.4" fill={c.ochre} />
        <circle cx="78" cy="34" r="2.2" fill={c.ochre} />
      </>
    ),
    sante: (
      <>
        <path d="M50,78 C22,58 20,34 39,27 C45,25 50,30 50,35 C50,30 55,25 61,27 C80,34 78,58 50,78 Z" fill={c.ochre} />
        <rect x="45" y="38" width="10" height="26" rx="2.4" fill={c.cream} />
        <rect x="37" y="46" width="26" height="10" rx="2.4" fill={c.cream} />
      </>
    ),
    home: (
      <>
        <circle cx="34" cy="30" r="10" fill={c.card} opacity="0.95" />
        <path d="M26,42 C20,52 20,64 26,72 C34,90 60,90 56,68 C64,62 62,48 52,42 C44,36 32,37 26,42 Z" fill={c.card} opacity="0.95" />
        <g transform="translate(66,54) rotate(-8) scale(0.9)" fill={c.ochre}>
          <path d="M 0,20 C 13,20 15,10 12,0 C 10,-7 5,-14 0,-16 C -5,-14 -10,-7 -12,0 C -15,10 -13,20 0,20 Z" />
          <circle cx="-7" cy="-17" r="2.8" /><circle cx="-3.5" cy="-20" r="3" /><circle cx="0" cy="-21" r="3.1" /><circle cx="3.5" cy="-20" r="3" /><circle cx="7" cy="-17" r="2.8" />
        </g>
        <circle cx="82" cy="24" r="2.2" fill={c.card} opacity="0.8" />
        <circle cx="90" cy="36" r="1.6" fill={c.card} opacity="0.8" />
      </>
    ),
    mission: (
      <>
        <path d="M50,78 C22,58 20,34 39,27 C45,25 50,30 50,35 C50,30 55,25 61,27 C80,34 78,58 50,78 Z" fill={c.teal} />
        <circle cx="50" cy="46" r="6" fill={c.cream} />
      </>
    ),
    membership: (
      <>
        <rect x="18" y="34" width="64" height="42" rx="10" fill={c.card} opacity="0.95" />
        <rect x="18" y="46" width="64" height="9" fill={c.teal} opacity="0.85" />
        <circle cx="66" cy="66" r="7" fill={c.ochre} />
      </>
    ),
    profile: (
      <>
        <circle cx="50" cy="38" r="16" fill={c.ochre} />
        <path d="M22,84 C22,62 34,54 50,54 C66,54 78,62 78,84 Z" fill={c.teal} />
      </>
    ),
    mysub: (
      <>
        <rect x="16" y="30" width="68" height="46" rx="12" fill={c.sage} />
        <rect x="16" y="44" width="68" height="10" fill={c.teal} opacity="0.8" />
        <circle cx="68" cy="66" r="6" fill={c.cream} />
        <circle cx="30" cy="66" r="3" fill={c.cream} opacity="0.8" />
      </>
    ),
    contact: (
      <>
        <rect x="14" y="28" width="72" height="48" rx="12" fill={c.ochre} />
        <path d="M18,34 L50,58 L82,34" fill="none" stroke={c.cream} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    dietitian: (
      <>
        <circle cx="50" cy="50" r="42" fill={c.sage} />
        <circle cx="50" cy="50" r="42" fill="none" stroke={c.teal} strokeWidth="2" opacity="0.15" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia, serif" fontSize="42" fontWeight="700" fill="#fff">L</text>
        <path d="M70,74 C70,69 80,69 80,74 C80,79 70,79 70,74 Z" fill={c.ochre} />
        <circle cx="74" cy="66" r="2" fill={c.ochre} />
      </>
    ),
    assistantBot: (
      <>
        <rect x="20" y="12" width="8" height="14" rx="4" fill={c.teal} />
        <circle cx="24" cy="10" r="4" fill={c.ochre} />
        <rect x="22" y="28" width="56" height="46" rx="16" fill={c.sage} />
        <circle cx="38" cy="50" r="6" fill={c.card} />
        <circle cx="62" cy="50" r="6" fill={c.card} />
        <circle cx="38" cy="50" r="2.4" fill={c.teal} />
        <circle cx="62" cy="50" r="2.4" fill={c.teal} />
        <path d="M38,64 Q50,72 62,64" stroke={c.card} strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="10" y="44" width="8" height="16" rx="4" fill={c.sage} />
        <rect x="82" y="44" width="8" height="16" rx="4" fill={c.sage} />
      </>
    ),
    cycleDiagram: (
      <>
        <circle cx="50" cy="50" r="34" fill="none" stroke={c.line} strokeWidth="10" />
        <path d="M50,16 A34,34 0 0,1 84,50" fill="none" stroke={c.ochre} strokeWidth="10" strokeLinecap="round" />
        <path d="M84,50 A34,34 0 0,1 50,84" fill="none" stroke={c.pink} strokeWidth="10" strokeLinecap="round" />
        <circle cx="84" cy="50" r="5" fill={c.teal} />
      </>
    ),
    hospitalBag: (
      <>
        <path d="M38,30 v-6 a12,12 0 0,1 24,0 v6" fill="none" stroke={c.teal} strokeWidth="5" />
        <rect x="22" y="30" width="56" height="52" rx="10" fill={c.sage} />
        <rect x="46" y="46" width="8" height="18" rx="3" fill={c.cream} />
        <rect x="37" y="55" width="26" height="8" rx="3" fill={c.cream} />
      </>
    ),
    babyBottle: (
      <>
        <rect x="38" y="10" width="24" height="10" rx="4" fill={c.teal} />
        <rect x="42" y="18" width="16" height="10" fill={c.card} stroke={c.line} strokeWidth="1.5" />
        <path d="M32,28 h36 a4,4 0 0,1 4,4 v46 a8,8 0 0,1 -8,8 h-28 a8,8 0 0,1 -8,-8 v-46 a4,4 0 0,1 4,-4 Z" fill={c.card} stroke={c.line} strokeWidth="2" />
        <path d="M32,52 h36 v22 a8,8 0 0,1 -8,8 h-20 a8,8 0 0,1 -8,-8 Z" fill={c.blue} opacity="0.55" />
        <rect x="36" y="34" width="28" height="3" fill={c.line} />
        <rect x="36" y="42" width="28" height="3" fill={c.line} />
        <rect x="36" y="60" width="28" height="3" fill="#fff" opacity="0.6" />
      </>
    ),
    clothesIcon: (
      <>
        <path d="M40,24 L34,32 L40,38 L44,34 L44,80 L56,80 L56,34 L60,38 L66,32 L60,24 L50,28 Z" fill={c.sage} />
        <path d="M42,24 Q50,32 58,24" fill="none" stroke={c.teal} strokeWidth="2.4" />
      </>
    ),
    toiletryIcon: (
      <>
        <rect x="46" y="18" width="8" height="12" rx="2" fill={c.teal} />
        <path d="M40,28 h20 a4,4 0 0,1 4,4 v42 a6,6 0 0,1 -6,6 h-16 a6,6 0 0,1 -6,-6 v-42 a4,4 0 0,1 4,-4 Z" fill={c.blue} />
        <rect x="40" y="46" width="20" height="8" fill="#fff" opacity="0.5" />
      </>
    ),
    carSeatIcon: (
      <>
        <path d="M30,82 L30,48 Q30,26 50,26 Q70,26 70,48 L70,82 Z" fill={c.ochre} />
        <path d="M38,82 L38,52 Q38,36 50,36 Q62,36 62,52 L62,82 Z" fill="#fff" opacity="0.35" />
        <rect x="24" y="76" width="52" height="12" rx="5" fill={c.teal} />
        <path d="M28,40 Q20,44 22,58" stroke={c.teal} strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    ),
    diaperIcon: (
      <>
        <path d="M24,38 L76,38 L68,70 Q50,86 32,70 Z" fill="#fff" stroke={c.line} strokeWidth="2" />
        <rect x="13" y="42" width="14" height="12" rx="4" fill={c.pink} />
        <rect x="73" y="42" width="14" height="12" rx="4" fill={c.pink} />
        <path d="M35,50 h30" stroke={c.line} strokeWidth="2" />
      </>
    ),
    pillowIcon: (
      <>
        <rect x="18" y="34" width="64" height="34" rx="17" fill={c.cream} stroke={c.line} strokeWidth="2" />
        <path d="M34,42 Q50,50 66,42" stroke={c.line} strokeWidth="1.6" fill="none" />
        <path d="M34,58 Q50,50 66,58" stroke={c.line} strokeWidth="1.6" fill="none" />
      </>
    ),
    docIcon: (
      <>
        <path d="M15,30 h30 l6,8 h34 a4,4 0 0,1 4,4 v40 a4,4 0 0,1 -4,4 h-70 a4,4 0 0,1 -4,-4 v-48 a4,4 0 0,1 4,-4 Z" fill={c.ochre} />
        <rect x="30" y="52" width="40" height="4" fill="#fff" opacity="0.6" />
        <rect x="30" y="62" width="40" height="4" fill="#fff" opacity="0.6" />
        <rect x="30" y="72" width="26" height="4" fill="#fff" opacity="0.6" />
      </>
    ),
    idCardIcon: (
      <>
        <rect x="16" y="30" width="68" height="46" rx="8" fill={c.blue} />
        <circle cx="34" cy="52" r="10" fill="#fff" opacity="0.85" />
        <rect x="50" y="44" width="28" height="4" fill="#fff" opacity="0.7" />
        <rect x="50" y="54" width="20" height="4" fill="#fff" opacity="0.5" />
      </>
    ),
    phoneIcon: (
      <>
        <rect x="34" y="14" width="32" height="58" rx="8" fill={c.teal} />
        <rect x="38" y="20" width="24" height="42" fill={c.card} />
        <circle cx="50" cy="66" r="3" fill={c.card} />
        <path d="M50,74 v14" stroke={c.ochre} strokeWidth="4" strokeLinecap="round" />
        <path d="M50,88 l-8,-8 M50,88 l8,-8" stroke={c.ochre} strokeWidth="4" strokeLinecap="round" fill="none" />
      </>
    ),
    notebookIcon: (
      <>
        <rect x="24" y="18" width="52" height="66" rx="6" fill={c.sage} />
        <circle cx="30" cy="18" r="3" fill={c.teal} />
        <circle cx="42" cy="18" r="3" fill={c.teal} />
        <circle cx="54" cy="18" r="3" fill={c.teal} />
        <circle cx="66" cy="18" r="3" fill={c.teal} />
        <rect x="34" y="38" width="34" height="3" fill="#fff" opacity="0.6" />
        <rect x="34" y="48" width="34" height="3" fill="#fff" opacity="0.6" />
        <rect x="34" y="58" width="24" height="3" fill="#fff" opacity="0.6" />
      </>
    ),
    braIcon: (
      <>
        <path d="M30,40 Q30,26 46,30 Q50,32 50,40 Q50,32 54,30 Q70,26 70,40 Q70,58 50,54 Q30,58 30,40 Z" fill={c.pink} />
        <path d="M46,30 Q50,20 54,30" stroke={c.pink} strokeWidth="3" fill="none" />
      </>
    ),
    slippersIcon: (
      <>
        <ellipse cx="34" cy="60" rx="20" ry="12" fill={c.ochre} />
        <path d="M20,58 Q34,44 48,58" stroke={c.teal} strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="70" cy="60" rx="20" ry="12" fill={c.ochre} />
        <path d="M56,58 Q70,44 84,58" stroke={c.teal} strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    ),
    padsIcon: (
      <>
        <rect x="24" y="30" width="52" height="40" rx="10" fill={c.pink} />
        <rect x="32" y="42" width="36" height="16" rx="8" fill="#fff" opacity="0.6" />
      </>
    ),
    underwearIcon: (
      <>
        <path d="M24,32 h52 v14 q0,28 -26,32 q-26,-4 -26,-32 Z" fill={c.sage} />
        <rect x="24" y="32" width="52" height="8" fill={c.teal} opacity="0.3" />
      </>
    ),
    periBottleIcon: (
      <>
        <rect x="42" y="20" width="16" height="10" fill={c.teal} />
        <path d="M38,30 h24 a4,4 0 0,1 4,4 v40 a10,10 0 0,1 -10,10 h-12 a10,10 0 0,1 -10,-10 v-40 a4,4 0 0,1 4,-4 Z" fill={c.blue} opacity="0.75" />
        <path d="M50,10 q10,4 4,14" stroke={c.blue} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ),
    wipesPackIcon: (
      <>
        <rect x="22" y="34" width="56" height="42" rx="8" fill={c.sage} />
        <path d="M38,34 Q50,24 62,34" fill="none" stroke={c.teal} strokeWidth="3" />
        <rect x="34" y="50" width="32" height="4" fill="#fff" opacity="0.6" />
      </>
    ),
    waterSnackIcon: (
      <>
        <rect x="24" y="26" width="18" height="52" rx="8" fill={c.blue} opacity="0.75" />
        <rect x="30" y="18" width="6" height="10" fill={c.teal} />
        <rect x="54" y="38" width="26" height="34" rx="6" fill={c.ochre} />
        <circle cx="67" cy="50" r="5" fill="#fff" opacity="0.5" />
      </>
    ),
    headphonesIcon: (
      <>
        <path d="M28,52 a22,22 0 0,1 44,0" stroke={c.teal} strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="22" y="50" width="12" height="20" rx="5" fill={c.pink} />
        <rect x="66" y="50" width="12" height="20" rx="5" fill={c.pink} />
      </>
    ),
    hatSocksIcon: (
      <>
        <path d="M30,52 a20,20 0 0,1 40,0 z" fill={c.pink} />
        <circle cx="50" cy="30" r="4" fill={c.ochre} />
        <ellipse cx="34" cy="76" rx="10" ry="14" fill={c.blue} opacity="0.7" />
        <ellipse cx="66" cy="76" rx="10" ry="14" fill={c.blue} opacity="0.7" />
      </>
    ),
    towelIcon: (
      <>
        <rect x="22" y="30" width="56" height="50" rx="10" fill={c.cream} stroke={c.line} strokeWidth="2" />
        <circle cx="50" cy="30" r="14" fill={c.pink} opacity="0.6" />
      </>
    ),
    soapIcon: (
      <>
        <rect x="36" y="24" width="28" height="52" rx="8" fill={c.sage} />
        <rect x="44" y="12" width="12" height="14" fill={c.teal} />
        <rect x="42" y="40" width="16" height="4" fill="#fff" opacity="0.6" />
      </>
    ),
    shampooBottleIllu: (
      <>
        <rect x="42" y="10" width="16" height="10" rx="3" fill={c.teal} />
        <path d="M38,10 h24 v6 h-24 Z" fill={c.teal} opacity="0.7" />
        <path d="M32,26 h36 a6,6 0 0,1 6,6 v48 a10,10 0 0,1 -10,10 h-28 a10,10 0 0,1 -10,-10 v-48 a6,6 0 0,1 6,-6 Z" fill={c.blue} />
        <rect x="34" y="50" width="32" height="20" rx="5" fill="#fff" opacity="0.9" />
        <circle cx="44" cy="60" r="4" fill={c.blue} opacity="0.5" />
        <path d="M52,56 q4,4 0,8" stroke={c.blue} strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
      </>
    ),
    swaddleIcon: (
      <>
        <rect x="20" y="34" width="60" height="42" rx="14" fill={c.ochre} opacity="0.85" />
        <path d="M30,44 Q50,54 70,44" stroke="#fff" strokeWidth="2.4" fill="none" opacity="0.6" />
        <path d="M30,58 Q50,68 70,58" stroke="#fff" strokeWidth="2.4" fill="none" opacity="0.6" />
      </>
    ),
    formulaIcon: (
      <>
        <path d="M32,24 h36 l4,52 a6,6 0 0,1 -6,6 h-32 a6,6 0 0,1 -6,-6 Z" fill={c.blue} />
        <rect x="30" y="20" width="40" height="8" rx="3" fill={c.teal} />
        <rect x="38" y="42" width="24" height="14" rx="3" fill="#fff" opacity="0.7" />
      </>
    ),
    burpClothIcon: (
      <>
        <rect x="24" y="28" width="52" height="44" rx="10" fill={c.sage} opacity="0.8" />
        <path d="M24,50 h52" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <path d="M50,28 v44" stroke="#fff" strokeWidth="2" opacity="0.4" />
      </>
    ),
    cribIllu: (
      <>
        <path d="M20,82 Q50,92 80,82" stroke={c.ochre} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M24,76 Q24,42 50,42 Q76,42 76,76 Z" fill={c.card} stroke={c.line} strokeWidth="2" />
        <path d="M31,76 Q31,50 50,50 Q69,50 69,76" fill="none" stroke={c.sage} strokeWidth="2" />
        <path d="M50,42 L50,18" stroke={c.teal} strokeWidth="3" strokeLinecap="round" />
        <path d="M34,20 Q50,8 66,20" fill="none" stroke={c.teal} strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="14" r="3" fill={c.pink} />
      </>
    ),
    teddyBearIllu: (
      <>
        <circle cx="28" cy="28" r="11" fill={c.ochre} />
        <circle cx="72" cy="28" r="11" fill={c.ochre} />
        <circle cx="28" cy="28" r="5" fill={c.cream} />
        <circle cx="72" cy="28" r="5" fill={c.cream} />
        <circle cx="50" cy="52" r="26" fill={c.ochre} />
        <ellipse cx="50" cy="60" rx="11" ry="9" fill={c.cream} />
        <circle cx="50" cy="55" r="2.6" fill={c.teal} />
        <circle cx="40" cy="46" r="2.6" fill={c.teal} />
        <circle cx="60" cy="46" r="2.6" fill={c.teal} />
        <path d="M44,64 Q50,68 56,64" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
    swaddledBabyIllu: (
      <>
        <path d="M20,46 Q20,90 50,90 Q80,90 80,46 Q80,38 50,38 Q20,38 20,46 Z" fill={c.pink} />
        <path d="M28,52 Q50,60 72,52" stroke="#fff" strokeWidth="2" fill="none" opacity="0.55" />
        <path d="M28,66 Q50,74 72,66" stroke="#fff" strokeWidth="2" fill="none" opacity="0.45" />
        <circle cx="50" cy="26" r="16" fill="#F0C99A" />
        <path d="M40,24 q3,3 6,0" stroke={c.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M54,24 q3,3 6,0" stroke={c.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M45,33 Q50,36 55,33" stroke={c.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </>
    ),
    tummyTimeIllu: (
      <>
        <ellipse cx="38" cy="70" rx="26" ry="13" fill={c.pink} opacity="0.85" />
        <circle cx="68" cy="48" r="20" fill="#F4CFA3" />
        <path d="M60,32 q4,-6 10,-4" stroke="#F4CFA3" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="63" cy="46" r="2.2" fill={c.teal} />
        <circle cx="74" cy="46" r="2.2" fill={c.teal} />
        <path d="M64,54 q6,4 12,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M50,64 L64,58" stroke="#F4CFA3" strokeWidth="7" strokeLinecap="round" />
      </>
    ),
    rollSitIllu: (
      <>
        <path d="M28,82 Q28,58 50,58 Q72,58 72,82 Z" fill={c.sage} opacity="0.85" />
        <circle cx="50" cy="34" r="21" fill="#F4CFA3" />
        <path d="M42,17 q4,-6 10,-3" stroke="#F4CFA3" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="44" cy="32" r="2.2" fill={c.teal} />
        <circle cx="56" cy="32" r="2.2" fill={c.teal} />
        <path d="M44,40 q6,4 12,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M28,66 L16,72" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
        <path d="M72,66 L84,72" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    crawlingBabyIllu: (
      <>
        <path d="M20,64 Q40,42 66,50" fill="none" stroke={c.blue} strokeWidth="13" strokeLinecap="round" opacity="0.85" />
        <circle cx="78" cy="42" r="18" fill="#F4CFA3" />
        <path d="M72,26 q4,-6 10,-3" stroke="#F4CFA3" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="73" cy="40" r="2" fill={c.teal} />
        <circle cx="83" cy="40" r="2" fill={c.teal} />
        <path d="M74,47 q5,3 10,0" stroke={c.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M22,64 L16,78" stroke="#F4CFA3" strokeWidth="7" strokeLinecap="round" />
        <path d="M42,52 L38,68" stroke="#F4CFA3" strokeWidth="7" strokeLinecap="round" />
        <path d="M60,50 L66,64" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    standCruiseIllu: (
      <>
        <rect x="14" y="50" width="44" height="7" rx="3" fill={c.ochre} opacity="0.9" />
        <rect x="14" y="50" width="7" height="34" rx="3" fill={c.ochre} opacity="0.9" />
        <circle cx="66" cy="34" r="19" fill="#F4CFA3" />
        <path d="M58,18 q4,-6 10,-3" stroke="#F4CFA3" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="32" r="2.2" fill={c.teal} />
        <circle cx="71" cy="32" r="2.2" fill={c.teal} />
        <path d="M60,40 q6,4 12,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M52,54 Q46,66 52,80" fill="none" stroke={c.blue} strokeWidth="16" strokeLinecap="round" opacity="0.85" />
        <path d="M50,58 L30,54" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
        <path d="M50,82 L44,92" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
        <path d="M56,82 L62,92" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    standSofaIllu: (
      <>
        <path d="M12,42 q0,-9 9,-9 h18 q9,0 9,9 v10 h8 v20 q0,4 -4,4 h-44 q-4,0 -4,-4 v-20 h8 Z" fill={c.blue} opacity="0.85" />
        <rect x="8" y="52" width="9" height="20" rx="3" fill={c.blue} />
        <rect x="52" y="52" width="9" height="20" rx="3" fill={c.blue} />
        <path d="M12,52 h48" stroke="#fff" strokeWidth="1.6" opacity="0.3" />
        <circle cx="76" cy="36" r="16" fill="#F4CFA3" />
        <path d="M68,20 q4,-6 10,-3" stroke="#F4CFA3" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <circle cx="71" cy="34" r="2.1" fill={c.teal} />
        <circle cx="81" cy="34" r="2.1" fill={c.teal} />
        <path d="M71,42 q6,4 12,0" stroke={c.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <rect x="64" y="52" width="24" height="32" rx="10" fill={c.pink} opacity="0.9" />
        <path d="M64,58 L57,67" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
        <path d="M84,58 L91,67" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    abcLettersIllu: (
      <>
        <rect x="4" y="32" width="27" height="32" rx="6" fill={c.pink} />
        <text x="17.5" y="55" fontSize="19" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="Georgia, serif">A</text>
        <rect x="36" y="32" width="27" height="32" rx="6" fill={c.ochre} />
        <text x="49.5" y="55" fontSize="19" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="Georgia, serif">B</text>
        <rect x="68" y="32" width="27" height="32" rx="6" fill={c.blue} />
        <text x="81.5" y="55" fontSize="19" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="Georgia, serif">C</text>
      </>
    ),
    superheroIllu: (
      <>
        <path d="M30,46 Q50,38 70,46 L76,88 Q50,97 24,88 Z" fill={c.pink} opacity="0.55" />
        <rect x="37" y="46" width="26" height="34" rx="10" fill={c.ochre} />
        <path d="M50,46 l-7,11 h14 Z" fill={c.blue} opacity="0.85" />
        <circle cx="50" cy="28" r="16" fill="#F4CFA3" />
        <rect x="38" y="23" width="24" height="7" rx="3" fill={c.teal} />
        <circle cx="44" cy="26.5" r="1.8" fill="#fff" />
        <circle cx="56" cy="26.5" r="1.8" fill="#fff" />
        <path d="M44,36 q6,4 12,0" stroke={c.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </>
    ),
    walkIllu: (
      <>
        <circle cx="50" cy="28" r="19" fill="#F4CFA3" />
        <path d="M42,12 q4,-6 10,-3" stroke="#F4CFA3" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="44" cy="26" r="2.2" fill={c.teal} />
        <circle cx="56" cy="26" r="2.2" fill={c.teal} />
        <path d="M44,34 q6,4 12,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M50,47 Q46,58 50,68" fill="none" stroke={c.pink} strokeWidth="16" strokeLinecap="round" opacity="0.9" />
        <path d="M42,54 L28,48" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
        <path d="M58,54 L72,60" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
        <path d="M48,68 L36,90" stroke={c.pink} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
        <path d="M54,68 L66,88" stroke={c.pink} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
      </>
    ),
    cryIllu: (
      <>
        <circle cx="50" cy="45" r="27" fill={c.pink} opacity="0.25" />
        <path d="M38,42 q3,-4 6,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M56,42 q3,-4 6,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M38,56 q12,10 24,0" stroke={c.teal} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M32,60 q1,8 -3,13" stroke={c.blue} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M68,60 q1,8 -3,13" stroke={c.blue} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      </>
    ),
    cooIllu: (
      <>
        <circle cx="42" cy="48" r="24" fill={c.sage} opacity="0.3" />
        <circle cx="40" cy="44" r="2" fill={c.teal} />
        <circle cx="52" cy="44" r="2" fill={c.teal} />
        <path d="M40,55 q6,4 12,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="72" cy="28" r="5" fill={c.sage} />
        <circle cx="82" cy="40" r="3" fill={c.sage} />
      </>
    ),
    babbleIllu: (
      <>
        <path d="M18,26 h50 a8,8 0 0,1 8,8 v20 a8,8 0 0,1 -8,8 h-28 l-11,13 v-13 h-11 a8,8 0 0,1 -8,-8 v-20 a8,8 0 0,1 8,-8 Z" fill={c.ochre} />
        <circle cx="33" cy="44" r="4" fill="#fff" />
        <circle cx="48" cy="44" r="4" fill="#fff" />
        <circle cx="63" cy="44" r="4" fill="#fff" />
      </>
    ),
    wordsIllu: (
      <>
        <path d="M16,24 h62 a8,8 0 0,1 8,8 v22 a8,8 0 0,1 -8,8 h-33 l-13,13 v-13 h-16 a8,8 0 0,1 -8,-8 v-22 a8,8 0 0,1 8,-8 Z" fill={c.blue} />
        <circle cx="36" cy="46" r="4" fill="#fff" />
        <rect x="49" y="43" width="22" height="6" rx="3" fill="#fff" />
      </>
    ),
    talkIllu: (
      <>
        <path d="M12,20 h70 a8,8 0 0,1 8,8 v26 a8,8 0 0,1 -8,8 h-38 l-15,14 v-14 h-17 a8,8 0 0,1 -8,-8 v-26 a8,8 0 0,1 8,-8 Z" fill={c.pink} />
        <rect x="26" y="38" width="52" height="5" rx="2" fill="#fff" opacity="0.9" />
        <rect x="26" y="48" width="36" height="5" rx="2" fill="#fff" opacity="0.7" />
      </>
    ),
    carrotIllu: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M50,32 L38,86 Q50,94 62,86 Z" fill={c.ochre} />
        <path d="M43,34 Q41,18 31,11" stroke={c.sage} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M50,30 Q50,14 50,8" stroke={c.sage} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M57,34 Q59,18 69,11" stroke={c.sage} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    ),
    appleIllu: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M50,30 C68,26 78,42 74,60 C70,80 58,88 50,84 C42,88 30,80 26,60 C22,42 32,26 50,30 Z" fill="#D9342A" />
        <path d="M48,30 Q46,18 54,14" stroke="#5E8A4E" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="38" cy="44" rx="6" ry="10" fill="#fff" opacity="0.25" />
      </g>
    ),
    sweetPotatoIllu: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <ellipse cx="50" cy="54" rx="27" ry="19" fill={c.ochre} transform="rotate(-18 50 54)" />
        <ellipse cx="41" cy="45" rx="6" ry="9" fill="#fff" opacity="0.22" transform="rotate(-18 41 45)" />
      </g>
    ),
    squashIllu: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M50,28 C40,28 34,38 36,49 C29,53 25,63 32,73 C39,85 61,85 68,73 C75,63 71,53 64,49 C66,38 60,28 50,28 Z" fill={c.ochre} />
        <rect x="47" y="14" width="6" height="15" rx="3" fill="#8A6B3C" />
        <ellipse cx="42" cy="42" rx="5" ry="7" fill="#fff" opacity="0.2" />
      </g>
    ),
    broccoliIllu: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <circle cx="36" cy="34" r="14" fill={`url(#${uid}-greenGrad)`} />
        <circle cx="60" cy="30" r="15" fill={`url(#${uid}-greenGrad)`} />
        <circle cx="50" cy="46" r="14" fill={`url(#${uid}-greenGrad)`} />
        <rect x="42" y="50" width="16" height="32" rx="6" fill="#D7E8CC" />
      </g>
    ),
    peaPodIllu: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M18,52 Q50,20 82,52 Q50,64 18,52 Z" fill={`url(#${uid}-greenGrad)`} />
        <circle cx="33" cy="49" r="7.5" fill="#A9D488" />
        <circle cx="50" cy="45" r="7.5" fill="#A9D488" />
        <circle cx="67" cy="49" r="7.5" fill="#A9D488" />
      </g>
    ),
    lentilBowlIllu: (
      <>
        <path d="M18,48 Q18,80 50,80 Q82,80 82,48 Z" fill="#EDD9B8" />
        <path d="M18,48 h64" stroke="#D9A15A" strokeWidth="3" fill="none" />
        <circle cx="32" cy="58" r="4" fill="#B5794A" />
        <circle cx="45" cy="64" r="4" fill="#B5794A" />
        <circle cx="58" cy="59" r="4" fill="#B5794A" />
        <circle cx="68" cy="66" r="4" fill="#B5794A" />
        <circle cx="39" cy="70" r="4" fill="#B5794A" />
        <circle cx="52" cy="72" r="4" fill="#B5794A" />
      </>
    ),
    chickenLegIllu: (
      <>
        <path d="M32,40 C28,52 34,64 46,68 C44,76 48,84 56,82 C64,80 66,70 60,64 C68,58 68,44 56,36 C46,30 36,32 32,40 Z" fill="#EFCFA0" />
        <path d="M50,72 L62,86" stroke="#EFCFA0" strokeWidth="11" strokeLinecap="round" />
        <ellipse cx="42" cy="46" rx="5" ry="7" fill="#fff" opacity="0.35" />
      </>
    ),
    salmonIllu: (
      <>
        <path d="M18,50 Q34,32 62,36 Q78,40 84,50 Q78,60 62,64 Q34,68 18,50 Z" fill="#F0957A" />
        <path d="M84,50 L96,40 L96,60 Z" fill="#F0957A" />
        <circle cx="32" cy="46" r="2.6" fill="#7A4A3A" />
        <path d="M44,42 Q54,50 44,58" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
      </>
    ),
    beefIllu: (
      <>
        <ellipse cx="50" cy="54" rx="30" ry="21" fill="#B5674B" />
        <path d="M27,49 Q50,41 73,49" stroke="#8A4A34" strokeWidth="3" fill="none" opacity="0.6" />
        <path d="M29,60 Q50,67 71,60" stroke="#8A4A34" strokeWidth="3" fill="none" opacity="0.6" />
        <ellipse cx="38" cy="44" rx="6" ry="8" fill="#fff" opacity="0.15" />
      </>
    ),
    peanutIllu: (
      <>
        <path d="M38,30 C30,38 30,48 38,54 C30,60 30,72 40,78 C50,84 62,80 66,68 C74,62 74,50 66,44 C74,38 72,26 62,22 C52,18 42,22 38,30 Z" fill="#D9A15A" />
        <path d="M42,52 Q52,54 60,50" stroke="#B5794A" strokeWidth="2" fill="none" opacity="0.5" />
      </>
    ),
    treeNutIllu: (
      <>
        <ellipse cx="50" cy="52" rx="20" ry="28" fill="#B5794A" />
        <path d="M50,28 Q38,44 50,54 Q62,44 50,28 Z" fill="#8A5B34" opacity="0.6" />
      </>
    ),
    shellfishIllu: (
      <>
        <path d="M28,60 Q28,28 55,24 Q76,20 78,38 Q80,48 68,50 Q76,55 70,65 Q59,74 46,68 Q34,73 28,60 Z" fill="#F0957A" />
        <circle cx="60" cy="31" r="3" fill="#7A4A3A" />
      </>
    ),
    soyPodIllu: (
      <>
        <path d="M20,50 Q50,24 80,50 Q50,62 20,50 Z" fill="#C9D98A" />
        <circle cx="35" cy="48" r="7" fill="#EDE29C" />
        <circle cx="50" cy="44" r="7" fill="#EDE29C" />
        <circle cx="65" cy="48" r="7" fill="#EDE29C" />
      </>
    ),
    wheatIllu: (
      <>
        <path d="M50,22 v58" stroke="#D9A15A" strokeWidth="3" fill="none" />
        <ellipse cx="43" cy="30" rx="5" ry="8" fill="#E8C77A" transform="rotate(-20 43 30)" />
        <ellipse cx="57" cy="30" rx="5" ry="8" fill="#E8C77A" transform="rotate(20 57 30)" />
        <ellipse cx="43" cy="42" rx="5" ry="8" fill="#E8C77A" transform="rotate(-20 43 42)" />
        <ellipse cx="57" cy="42" rx="5" ry="8" fill="#E8C77A" transform="rotate(20 57 42)" />
        <ellipse cx="43" cy="54" rx="5" ry="8" fill="#E8C77A" transform="rotate(-20 43 54)" />
        <ellipse cx="57" cy="54" rx="5" ry="8" fill="#E8C77A" transform="rotate(20 57 54)" />
      </>
    ),
    sesameIllu: (
      <>
        <ellipse cx="34" cy="46" rx="6" ry="3" fill="#EDE0C0" transform="rotate(-20 34 46)" />
        <ellipse cx="50" cy="38" rx="6" ry="3" fill="#D9A15A" transform="rotate(10 50 38)" />
        <ellipse cx="66" cy="48" rx="6" ry="3" fill="#EDE0C0" transform="rotate(-15 66 48)" />
        <ellipse cx="42" cy="58" rx="6" ry="3" fill="#D9A15A" transform="rotate(25 42 58)" />
        <ellipse cx="58" cy="60" rx="6" ry="3" fill="#EDE0C0" transform="rotate(-10 58 60)" />
        <ellipse cx="50" cy="70" rx="6" ry="3" fill="#D9A15A" transform="rotate(15 50 70)" />
      </>
    ),
    handGraspIllu: (
      <>
        <path d="M50,18 v24" stroke="#F0C99A" strokeWidth="9" strokeLinecap="round" />
        <path d="M37,24 v20" stroke="#F0C99A" strokeWidth="8" strokeLinecap="round" />
        <path d="M63,24 v20" stroke="#F0C99A" strokeWidth="8" strokeLinecap="round" />
        <path d="M27,33 v16" stroke="#F0C99A" strokeWidth="7" strokeLinecap="round" />
        <path d="M73,33 v16" stroke="#F0C99A" strokeWidth="7" strokeLinecap="round" />
        <path d="M22,48 Q50,82 78,48 Q78,68 50,72 Q22,68 22,48 Z" fill="#F0C99A" />
      </>
    ),
    smileFaceIllu: (
      <>
        <circle cx="50" cy="50" r="30" fill={c.pink} opacity="0.85" />
        <circle cx="40" cy="44" r="3" fill="#fff" />
        <circle cx="60" cy="44" r="3" fill="#fff" />
        <path d="M36,58 Q50,72 64,58" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    ),
    gingerRootIllu: (
      <>
        <ellipse cx="52" cy="58" rx="26" ry="17" fill={c.ochre} transform="rotate(-12 52 58)" />
        <ellipse cx="33" cy="48" rx="12" ry="9" fill={c.ochre} transform="rotate(15 33 48)" />
        <ellipse cx="68" cy="66" rx="10" ry="8" fill={c.ochre} transform="rotate(-8 68 66)" />
        <path d="M55,40 Q60,22 72,15" stroke={c.sage} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M72,15 Q78,10 84,13" stroke={c.sage} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ),
    legCareIllu: (
      <>
        <path d="M40,14 h20 v34 q0,10 8,16 l4,24 h-14 l-2,-19 q-6,4 -14,0 l-2,19 h-14 l4,-24 q8,-6 8,-16 Z" fill={c.blue} opacity="0.85" />
        <path d="M30,44 Q50,49 70,44" stroke="#fff" strokeWidth="2" fill="none" opacity="0.55" />
        <path d="M32,58 Q50,62 68,58" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
      </>
    ),
    stretchFigureIllu: (
      <>
        <circle cx="50" cy="20" r="10" fill={c.ochre} />
        <path d="M50,30 v24" stroke={c.ochre} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,36 L28,24" stroke={c.ochre} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,36 L72,24" stroke={c.ochre} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,54 L34,82" stroke={c.ochre} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,54 L66,82" stroke={c.ochre} strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    exerciseBreathing: (
      <>
        <circle cx="50" cy="24" r="9" fill={c.sage} />
        <path d="M50,33 q-14,10 -14,28 q0,14 14,14 q14,0 14,-14 q0,-18 -14,-28 Z" fill={c.sage} />
        <circle cx="50" cy="55" r="10" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="2 4" opacity="0.85" />
        <path d="M36,72 q14,10 28,0" stroke={c.sage} strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    ),
    exerciseKegel: (
      <>
        <circle cx="50" cy="58" r="26" fill={c.pink} opacity="0.22" />
        <path d="M50,72 v-30" stroke={c.pink} strokeWidth="6" strokeLinecap="round" />
        <path d="M38,52 L50,38 L62,52" stroke={c.pink} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    exercisePelvicTilt: (
      <>
        <circle cx="22" cy="46" r="9" fill={c.blue} />
        <path d="M31,46 h32" stroke={c.blue} strokeWidth="6" strokeLinecap="round" />
        <path d="M63,46 q10,-4 15,9" stroke={c.blue} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M58,28 q7,9 0,18" stroke={c.blue} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      </>
    ),
    exerciseWalk: (
      <>
        <circle cx="50" cy="18" r="8" fill={c.teal} />
        <path d="M50,26 v20" stroke={c.teal} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,32 L36,42" stroke={c.teal} strokeWidth="5" strokeLinecap="round" />
        <path d="M50,32 L66,26" stroke={c.teal} strokeWidth="5" strokeLinecap="round" />
        <path d="M50,46 L34,64" stroke={c.teal} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,46 L64,80" stroke={c.teal} strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    exerciseBridge: (
      <>
        <circle cx="20" cy="60" r="8" fill={c.ochre} />
        <path d="M28,60 h14 q10,-22 20,0 h14" stroke={c.ochre} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M62,60 v18" stroke={c.ochre} strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    exerciseCatCow: (
      <>
        <circle cx="22" cy="34" r="8" fill={c.sage} />
        <path d="M22,42 Q50,18 78,42" stroke={c.sage} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M22,42 v22" stroke={c.sage} strokeWidth="5" strokeLinecap="round" />
        <path d="M78,42 v22" stroke={c.sage} strokeWidth="5" strokeLinecap="round" />
      </>
    ),
    exerciseDeadBug: (
      <>
        <circle cx="50" cy="24" r="8" fill={c.pink} />
        <path d="M50,32 v18" stroke={c.pink} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,36 L30,26" stroke={c.pink} strokeWidth="5" strokeLinecap="round" />
        <path d="M50,36 L68,44" stroke={c.pink} strokeWidth="5" strokeLinecap="round" />
        <path d="M50,50 L34,40" stroke={c.pink} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,50 L70,66" stroke={c.pink} strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    exercisePlank: (
      <>
        <circle cx="18" cy="52" r="8" fill={c.blue} />
        <path d="M26,52 h50" stroke={c.blue} strokeWidth="6" strokeLinecap="round" />
        <path d="M26,52 L22,68" stroke={c.blue} strokeWidth="5" strokeLinecap="round" />
        <path d="M76,52 L80,68" stroke={c.blue} strokeWidth="5" strokeLinecap="round" />
      </>
    ),
    exerciseSquat: (
      <>
        <circle cx="50" cy="18" r="8" fill={c.teal} />
        <path d="M50,26 v16" stroke={c.teal} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,30 L32,26" stroke={c.teal} strokeWidth="5" strokeLinecap="round" />
        <path d="M50,30 L68,26" stroke={c.teal} strokeWidth="5" strokeLinecap="round" />
        <path d="M50,42 L34,54 L34,76" stroke={c.teal} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50,42 L66,54 L66,76" stroke={c.teal} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    exerciseLunge: (
      <>
        <circle cx="38" cy="18" r="8" fill={c.ochre} />
        <path d="M38,26 v16" stroke={c.ochre} strokeWidth="6" strokeLinecap="round" />
        <path d="M38,32 L58,40" stroke={c.ochre} strokeWidth="5" strokeLinecap="round" />
        <path d="M38,42 L24,58 L24,80" stroke={c.ochre} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38,42 L60,50 L72,76" stroke={c.ochre} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    exerciseWeights: (
      <>
        <circle cx="50" cy="20" r="8" fill={c.pink} />
        <path d="M50,28 v20" stroke={c.pink} strokeWidth="6" strokeLinecap="round" />
        <path d="M50,34 L28,44" stroke={c.pink} strokeWidth="5" strokeLinecap="round" />
        <rect x="12" y="38" width="10" height="14" rx="3" fill={c.pink} />
        <rect x="22" y="42" width="8" height="6" rx="2" fill={c.pink} />
        <path d="M50,48 L36,64 L36,86" stroke={c.pink} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50,48 L64,64 L64,86" stroke={c.pink} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    bathtubIllu: (
      <>
        <path d="M18,56 h64 a4,4 0 0,1 4,4 v6 a15,15 0 0,1 -15,15 h-42 a15,15 0 0,1 -15,-15 v-6 a4,4 0 0,1 4,-4 Z" fill={c.blue} opacity="0.8" />
        <path d="M18,56 q-2,-16 14,-17" stroke={c.blue} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M32,34 q4,-6 0,-13" stroke={c.blue} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M42,34 q4,-6 0,-13" stroke={c.blue} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
      </>
    ),
    heartCareIllu: (
      <>
        <path d="M50,82 C20,60 15,35 32,24 C42,17 50,24 50,32 C50,24 58,17 68,24 C85,35 80,60 50,82 Z" fill={c.pink} />
        <path d="M38,42 h8 l4,-8 l6,16 l4,-8 h8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      </>
    ),
    mindCareIllu: (
      <>
        <circle cx="50" cy="42" r="26" fill={c.sage} />
        <path d="M38,38 q4,-6 8,0" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M54,38 q4,-6 8,0" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M40,52 Q50,58 60,52" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M50,68 v14" stroke={c.sage} strokeWidth="6" strokeLinecap="round" />
        <circle cx="50" cy="86" r="5" fill={c.sage} />
      </>
    ),
    coupleIllu: (
      <>
        <circle cx="35" cy="34" r="13" fill={c.teal} />
        <path d="M16,78 Q16,54 35,54 Q54,54 54,78 Z" fill={c.teal} />
        <circle cx="66" cy="34" r="13" fill={c.pink} />
        <path d="M47,78 Q47,54 66,54 Q85,54 85,78 Z" fill={c.pink} />
      </>
    ),
    checklistIllu: (
      <>
        <rect x="26" y="16" width="48" height="68" rx="8" fill={c.card} stroke={c.line} strokeWidth="2" />
        <rect x="38" y="12" width="24" height="10" rx="3" fill={c.teal} />
        <path d="M35,38 l6,6 l11,-13" stroke={c.sage} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="55" y="35" width="12" height="4" fill={c.line} />
        <path d="M35,58 l6,6 l11,-13" stroke={c.sage} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="55" y="55" width="12" height="4" fill={c.line} />
      </>
    ),
    duckIllu: (
      <>
        <path d="M12,78 Q30,84 48,78 Q66,84 88,78" fill="none" stroke={c.blue} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <ellipse cx="47" cy="64" rx="30" ry="20" fill={c.yellow} />
        <circle cx="66" cy="40" r="17" fill={c.yellow} />
        <path d="M78,38 Q92,36 90,44 Q86,48 78,44 Z" fill={c.ochre} />
        <circle cx="72" cy="35" r="2.4" fill={c.teal} />
        <path d="M20,66 Q10,60 14,50" fill="none" stroke={c.yellow} strokeWidth="9" strokeLinecap="round" />
      </>
    ),
    towelSoftIllu: (
      <>
        <rect x="18" y="56" width="64" height="18" rx="7" fill={c.blue} opacity="0.85" />
        <rect x="23" y="39" width="54" height="18" rx="7" fill={c.blue} opacity="0.62" />
        <rect x="28" y="22" width="44" height="18" rx="7" fill={c.blue} opacity="0.4" />
        <path d="M28,65 h44" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <path d="M33,48 h34" stroke="#fff" strokeWidth="2" opacity="0.5" />
      </>
    ),
    cottonSwabIllu: (
      <>
        <rect x="17" y="47" width="66" height="6" rx="3" fill="#D9C9A3" />
        <circle cx="16" cy="50" r="11" fill="#fff" stroke={c.line} strokeWidth="2.5" />
        <circle cx="84" cy="50" r="11" fill="#fff" stroke={c.line} strokeWidth="2.5" />
      </>
    ),
    nasalAspiratorIllu: (
      <>
        <rect x="46" y="16" width="8" height="18" rx="3" fill={c.blue} opacity="0.9" />
        <circle cx="50" cy="58" r="28" fill={c.blue} opacity="0.85" />
        <ellipse cx="39" cy="47" rx="7" ry="10" fill="#fff" opacity="0.22" />
      </>
    ),
    creamJarIllu: (
      <>
        <ellipse cx="50" cy="28" rx="26" ry="8" fill={c.sage} opacity="0.7" />
        <path d="M24,28 h52 v34 a26,10 0 0,1 -52,0 Z" fill={c.sage} />
        <ellipse cx="50" cy="62" rx="26" ry="9" fill={c.sage} opacity="0.85" />
        <ellipse cx="50" cy="27" rx="20" ry="5.5" fill="#fff" opacity="0.85" />
      </>
    ),
    bodysuitIllu: (
      <>
        <path d="M50,20 L38,20 L28,30 L34,38 L38,35 L38,48 L34,80 L66,80 L62,48 L62,35 L66,38 L72,30 L62,20 Z" fill={c.blue} />
        <circle cx="45" cy="58" r="2" fill="#fff" opacity="0.6" />
        <circle cx="55" cy="58" r="2" fill="#fff" opacity="0.6" />
      </>
    ),
    shortsIllu: (
      <>
        <path d="M28,26 h44 v18 h-6 l-2,36 h-10 l-4,-28 -4,28 h-10 l-2,-36 h-6 Z" fill={c.ochre} />
        <rect x="28" y="32" width="44" height="3" fill="#fff" opacity="0.35" />
      </>
    ),
    pantsIllu: (
      <>
        <path d="M30,20 h40 v18 h-7 l-3,46 h-11 l-2,-38 -2,38 h-11 l-3,-46 h-7 Z" fill={c.teal} />
        <rect x="30" y="27" width="40" height="3" fill="#fff" opacity="0.35" />
      </>
    ),
    sunHatIllu: (
      <>
        <ellipse cx="50" cy="58" rx="34" ry="9" fill={c.ochre} />
        <path d="M32,58 a18,20 0 0,1 36,0 Z" fill={c.ochre} opacity="0.8" />
        <path d="M42,32 q-4,10 4,20" stroke="#8A6B3C" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M58,32 q4,10 -4,20" stroke="#8A6B3C" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.6" />
      </>
    ),
    hatIllu: (
      <>
        <path d="M32,62 a18,20 0 0,1 36,0 Z" fill={c.pink} />
        <rect x="30" y="58" width="40" height="8" rx="4" fill={c.pink} opacity="0.75" />
        <path d="M34,54 q16,-10 32,0" stroke="#fff" strokeWidth="2" fill="none" opacity="0.35" />
        <circle cx="50" cy="22" r="7" fill={c.pink} />
      </>
    ),
    socksIllu: (
      <>
        <path d="M38,18 h24 v32 q10,4 10,18 a12,12 0 0,1 -12,12 h-10 a12,12 0 0,1 -12,-12 Z" fill={c.sage} />
        <rect x="38" y="44" width="24" height="3" fill="#fff" opacity="0.4" />
      </>
    ),
    longSleeveShirtIllu: (
      <>
        <path d="M50,18 L36,18 L18,32 L26,44 L34,38 L34,50 L30,82 L70,82 L66,50 L66,38 L74,44 L82,32 L64,18 Z" fill={c.sage} />
        <path d="M42,20 q8,7 16,0" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
      </>
    ),
    lightJacketIllu: (
      <>
        <path d="M50,18 L36,18 L18,32 L26,44 L34,38 L34,50 L30,82 L48,82 L48,20 Z" fill={c.blue} />
        <path d="M50,18 L64,18 L82,32 L74,44 L66,38 L66,50 L70,82 L52,82 L52,20 Z" fill={c.blue} opacity="0.7" />
        <rect x="49" y="18" width="2" height="64" fill="#fff" opacity="0.6" />
      </>
    ),
    warmJacketIllu: (
      <>
        <path d="M50,16 q-9,0 -12,8 L20,32 L28,46 L38,40 L34,50 L28,84 L72,84 L66,50 L62,40 L72,46 L80,32 L62,24 q-3,-8 -12,-8 Z" fill={c.teal} />
        <path d="M38,20 q12,-10 24,0 q3,8 -4,10 q-8,-8 -16,0 q-7,-2 -4,-10 Z" fill="#EFE3C6" />
        <path d="M34,52 h32 M32,64 h36" stroke="#fff" strokeWidth="1.6" opacity="0.3" />
      </>
    ),
    snowsuitIllu: (
      <>
        <circle cx="50" cy="22" r="13" fill={c.pink} />
        <path d="M37,16 q13,-9 26,0" stroke="#EFE3C6" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M50,32 q-8,0 -11,7 L24,46 L31,58 L40,52 L36,60 L30,86 L70,86 L64,60 L60,52 L69,58 L76,46 L61,39 q-3,-7 -11,-7 Z" fill={c.pink} />
      </>
    ),
    mittensIllu: (
      <>
        <path d="M30,50 q0,-16 14,-16 q14,0 14,16 v18 q0,10 -14,10 q-14,0 -14,-10 Z" fill={c.ochre} />
        <path d="M56,50 q0,-16 14,-16 q14,0 14,16 v18 q0,10 -14,10 q-14,0 -14,-10 Z" fill={c.ochre} />
        <rect x="30" y="62" width="28" height="4" fill="#fff" opacity="0.3" />
        <rect x="56" y="62" width="28" height="4" fill="#fff" opacity="0.3" />
      </>
    ),
    stairsIllu: (
      <>
        <path d="M18,82 h13 v-15 h13 v-15 h13 v-15 h13 v-15 h12 v60 Z" fill={c.blue} />
        <path d="M18,82 v-15 h13 M31,67 v-15 h13 M44,52 v-15 h13 M57,37 v-15 h12" stroke="#fff" strokeWidth="1.6" opacity="0.35" fill="none" />
      </>
    ),
    spoonIllu: (
      <>
        <ellipse cx="50" cy="28" rx="15" ry="19" fill={c.ochre} />
        <rect x="46" y="44" width="8" height="42" rx="4" fill={c.ochre} />
        <ellipse cx="46" cy="24" rx="4" ry="7" fill="#fff" opacity="0.3" />
      </>
    ),
    ballIllu: (
      <>
        <circle cx="50" cy="50" r="32" fill="#fff" stroke={c.line} strokeWidth="2" />
        <path d="M50,32 L61,40 L57,53 L43,53 L39,40 Z" fill={c.teal} />
        <path d="M50,32 L42,20 L58,20 Z" fill={c.teal} />
        <path d="M39,40 L22,38 L26,24 Z" fill={c.teal} />
        <path d="M61,40 L78,38 L74,24 Z" fill={c.teal} />
        <path d="M43,53 L32,66 L20,58 Z" fill={c.teal} />
        <path d="M57,53 L68,66 L80,58 Z" fill={c.teal} />
        <path d="M50,32 L42,20 M50,32 L58,20 M50,32 L39,40 M50,32 L61,40" stroke={c.teal} strokeWidth="2" />
        <path d="M43,53 L32,66 M57,53 L68,66" stroke={c.teal} strokeWidth="2" />
      </>
    ),
    bookIllu: (
      <>
        <path d="M50,26 Q32,19 17,26 V74 Q32,67 50,74 Q68,67 83,74 V26 Q68,19 50,26 Z" fill={c.teal} />
        <path d="M50,26 v48" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <path d="M23,34 q13,-5 23,0 M23,44 q13,-5 23,0" stroke="#fff" strokeWidth="1.6" opacity="0.4" fill="none" />
      </>
    ),
    colorWheelIllu: (
      <>
        <path d="M50,50 L50,16 A34,34 0 0,1 79,33 Z" fill={c.pink} />
        <path d="M50,50 L79,33 A34,34 0 0,1 79,67 Z" fill={c.ochre} />
        <path d="M50,50 L79,67 A34,34 0 0,1 50,84 Z" fill={c.sage} />
        <path d="M50,50 L50,84 A34,34 0 0,1 21,67 Z" fill={c.blue} />
        <path d="M50,50 L21,67 A34,34 0 0,1 21,33 Z" fill={c.teal} />
        <path d="M50,50 L21,33 A34,34 0 0,1 50,16 Z" fill="#8F6BAE" />
        <circle cx="50" cy="50" r="8" fill="#fff" />
      </>
    ),
    pointHandIllu: (
      <>
        <path d="M40,84 v-32 q0,-8 7,-8 q7,0 7,8 v6 l8,-16 q3,-6 9,-3 q4,3 1,9 l-6,12 q9,-1 11,5 q2,6 -3,9 l-17,15 q-7,5 -15,-1 Z" fill="#F4CFA3" />
      </>
    ),
    waveHandIllu: (
      <>
        <ellipse cx="52" cy="70" rx="20" ry="18" fill="#F4CFA3" />
        <ellipse cx="30" cy="46" rx="7" ry="16" fill="#F4CFA3" transform="rotate(-25 30 46)" />
        <ellipse cx="42" cy="32" rx="7" ry="18" fill="#F4CFA3" transform="rotate(-10 42 32)" />
        <ellipse cx="56" cy="27" rx="7" ry="19" fill="#F4CFA3" />
        <ellipse cx="70" cy="32" rx="7" ry="18" fill="#F4CFA3" transform="rotate(10 70 32)" />
        <ellipse cx="80" cy="46" rx="7" ry="16" fill="#F4CFA3" transform="rotate(25 80 46)" />
      </>
    ),
    ladderIllu: (
      <>
        <rect x="26" y="14" width="7" height="72" rx="3" fill={c.ochre} />
        <rect x="67" y="14" width="7" height="72" rx="3" fill={c.ochre} />
        <rect x="26" y="24" width="48" height="7" fill={c.ochre} />
        <rect x="26" y="44" width="48" height="7" fill={c.ochre} />
        <rect x="26" y="64" width="48" height="7" fill={c.ochre} />
      </>
    ),
    pinchIllu: (
      <>
        <path d="M26,76 Q22,52 34,44 Q37,32 48,34 Q52,36 50,44 Q58,38 62,46 Q64,50 60,54 Q68,52 68,60 Q68,66 60,66 Z" fill="#F4CFA3" />
        <circle cx="44" cy="40" r="10" fill="none" stroke="#F4CFA3" strokeWidth="7" />
        <path d="M62,50 v28" stroke="#F4CFA3" strokeWidth="8" strokeLinecap="round" />
        <path d="M72,48 v28" stroke="#F4CFA3" strokeWidth="8" strokeLinecap="round" />
        <path d="M80,50 v24" stroke="#F4CFA3" strokeWidth="8" strokeLinecap="round" />
      </>
    ),
    writingIllu: (
      <>
        <rect x="16" y="18" width="52" height="64" rx="4" fill="#fff" stroke={c.line} strokeWidth="2.5" />
        <path d="M25,36 q9,-5 18,0 q9,5 18,0" stroke={c.blue} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M25,50 q9,-5 18,0 q9,5 10,0" stroke={c.blue} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M25,64 q9,-5 16,0" stroke={c.blue} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M60,62 L82,30 Q86,24 91,28 Q95,32 91,38 L70,70 L58,74 Z" fill={c.ochre} />
        <path d="M82,30 l9,8" stroke="#8A6B3C" strokeWidth="2.5" />
        <path d="M58,74 l3,-10 l9,4 Z" fill={c.teal} />
      </>
    ),
    reachArmsIllu: (
      <>
        <path d="M18,88 Q30,60 52,42" stroke={c.ochre} strokeWidth="11" strokeLinecap="round" fill="none" />
        <circle cx="66" cy="30" r="10" fill={c.ochre} />
        <path d="M66,30 v-16" stroke={c.ochre} strokeWidth="6.5" strokeLinecap="round" />
        <path d="M66,30 l-13,-8" stroke={c.ochre} strokeWidth="6.5" strokeLinecap="round" />
        <path d="M66,30 l-4,-16" stroke={c.ochre} strokeWidth="6.5" strokeLinecap="round" />
        <path d="M66,30 l11,-11" stroke={c.ochre} strokeWidth="6.5" strokeLinecap="round" />
        <path d="M66,30 l16,-3" stroke={c.ochre} strokeWidth="6.5" strokeLinecap="round" />
      </>
    ),
    rollOverIllu: (
      <>
        <path d="M22,20 A28,28 0 0,1 68,15" stroke={c.ochre} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M64,10 l9,4 l-6,8 Z" fill={c.ochre} />
        <ellipse cx="45" cy="64" rx="30" ry="14" fill={c.sage} opacity="0.85" />
        <circle cx="74" cy="50" r="16" fill="#F4CFA3" />
        <circle cx="68" cy="47" r="2.1" fill={c.teal} />
        <circle cx="79" cy="47" r="2.1" fill={c.teal} />
        <path d="M70,55 q4,3 8,0" stroke={c.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M18,58 L10,70" stroke="#F4CFA3" strokeWidth="7" strokeLinecap="round" />
      </>
    ),
    eyesTrackIllu: (
      <>
        <ellipse cx="33" cy="50" rx="19" ry="15" fill="#fff" stroke={c.line} strokeWidth="2.5" />
        <ellipse cx="67" cy="50" rx="19" ry="15" fill="#fff" stroke={c.line} strokeWidth="2.5" />
        <circle cx="37" cy="50" r="8" fill={c.teal} />
        <circle cx="71" cy="50" r="8" fill={c.teal} />
        <circle cx="40" cy="46" r="2.4" fill="#fff" />
        <circle cx="74" cy="46" r="2.4" fill="#fff" />
      </>
    ),
    babyBeachIllu: (
      <>
        <circle cx="76" cy="16" r="8" fill={c.yellow} opacity="0.8" />
        <path d="M0,82 Q25,74 50,82 T100,82 V100 H0 Z" fill={c.blue} opacity="0.35" />
        <path d="M0,90 Q25,84 50,90 T100,90 V100 H0 Z" fill="#E8D9B5" opacity="0.6" />
        <path d="M27,58 L20,70" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
        <path d="M73,58 L80,70" stroke="#F4CFA3" strokeWidth="6" strokeLinecap="round" />
        <rect x="36" y="49" width="28" height="26" rx="8" fill={c.blue} />
        <path d="M40,80 v13" stroke="#F4CFA3" strokeWidth="7" strokeLinecap="round" />
        <path d="M60,80 v13" stroke="#F4CFA3" strokeWidth="7" strokeLinecap="round" />
        <path d="M35,75 h30 v13 h-30 Z" fill={c.pink} opacity="0.9" />
        <circle cx="50" cy="31" r="17" fill="#F4CFA3" />
        <circle cx="44" cy="31" r="2.2" fill={c.teal} />
        <circle cx="56" cy="31" r="2.2" fill={c.teal} />
        <path d="M44,38 q6,4 12,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M27,27 Q50,10 73,27 Q78,36 68,35 Q50,25 32,35 Q22,36 27,27 Z" fill={c.ochre} />
      </>
    ),
    babyAcneIllu: (
      <>
        <circle cx="50" cy="52" r="34" fill="#F4CFA3" />
        <path d="M38,60 q3,4 6,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M56,60 q3,4 6,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M42,72 q8,6 16,0" stroke={c.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="30" cy="46" r="2.6" fill={c.pink} />
        <circle cx="66" cy="50" r="2.6" fill={c.pink} />
        <circle cx="36" cy="66" r="2.3" fill={c.pink} />
        <circle cx="60" cy="34" r="2.3" fill={c.pink} />
        <circle cx="70" cy="64" r="2.3" fill={c.pink} />
        <circle cx="44" cy="26" r="2.3" fill={c.pink} />
        <circle cx="26" cy="60" r="2" fill={c.pink} />
      </>
    ),
    babyOnBackIllu: (
      <>
        <rect x="10" y="14" width="80" height="74" rx="16" fill={c.blue} opacity="0.15" />
        <path d="M27,58 Q50,50 73,58 L68,85 Q50,91 32,85 Z" fill={c.pink} opacity="0.85" />
        <path d="M27,58 L15,68 M73,58 L85,68" stroke="#F4CFA3" strokeWidth="7" strokeLinecap="round" />
        <circle cx="50" cy="35" r="18" fill="#F4CFA3" />
        <path d="M40,21 q4,-6 10,-3" stroke="#F4CFA3" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="44" cy="34" r="2.1" fill={c.teal} />
        <circle cx="56" cy="34" r="2.1" fill={c.teal} />
        <path d="M44,41 q6,4 12,0" stroke={c.teal} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </>
    ),
    alcoholGlassIllu: (
      <>
        <path d="M35,20 h30 v6 q0,18 -15,22 q-15,-4 -15,-22 Z" fill={c.pink} opacity="0.85" />
        <rect x="47" y="48" width="6" height="20" fill={c.pink} opacity="0.85" />
        <rect x="38" y="68" width="24" height="6" rx="2" fill={c.teal} />
      </>
    ),
    fishIllu: (
      <>
        <path d="M18,50 Q34,30 60,35 Q76,38 84,50 Q76,62 60,65 Q34,70 18,50 Z" fill={c.blue} opacity="0.85" />
        <path d="M84,50 L96,38 L96,62 Z" fill={c.blue} opacity="0.85" />
        <circle cx="33" cy="46" r="3" fill={c.teal} />
      </>
    ),
    cheeseWedgeIllu: (
      <>
        <path d="M18,72 L50,18 L82,72 Z" fill={c.ochre} />
        <circle cx="45" cy="56" r="4" fill={c.cream} />
        <circle cx="60" cy="61" r="3" fill={c.cream} />
        <circle cx="52" cy="46" r="3" fill={c.cream} />
      </>
    ),
    deliMeatIllu: (
      <>
        <ellipse cx="50" cy="35" rx="30" ry="10" fill={c.pink} opacity="0.85" />
        <ellipse cx="50" cy="50" rx="30" ry="10" fill={c.pink} opacity="0.65" />
        <ellipse cx="50" cy="65" rx="30" ry="10" fill={c.pink} opacity="0.45" />
      </>
    ),
    coffeeCupIllu: (
      <>
        <path d="M28,40 h40 v24 a12,12 0 0,1 -12,12 h-16 a12,12 0 0,1 -12,-12 Z" fill={c.teal} />
        <path d="M68,46 q10,0 10,10 t-10,10" stroke={c.teal} strokeWidth="4" fill="none" />
        <path d="M38,30 q3,-6 0,-12" stroke={c.ochre} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M50,30 q3,-6 0,-12" stroke={c.ochre} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.7" />
      </>
    ),
    sproutsIllu: (
      <>
        <path d="M40,80 q0,-30 -10,-45" stroke={c.sage} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M50,80 q0,-40 0,-55" stroke={c.sage} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M60,80 q0,-30 10,-45" stroke={c.sage} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="30" cy="33" r="5" fill={c.sage} />
        <circle cx="50" cy="24" r="5" fill={c.sage} />
        <circle cx="70" cy="33" r="5" fill={c.sage} />
      </>
    ),
    milkCartonIllu: (
      <>
        <path d="M32,25 L50,12 L68,25 V80 H32 Z" fill={c.blue} opacity="0.3" stroke={c.blue} strokeWidth="2" />
        <rect x="32" y="42" width="36" height="14" fill={c.blue} opacity="0.55" />
      </>
    ),
    herbalTeaIllu: (
      <>
        <path d="M28,42 h36 v20 a18,18 0 0,1 -18,18 a18,18 0 0,1 -18,-18 Z" fill={c.sage} opacity="0.85" />
        <path d="M64,48 q10,0 10,8 t-10,8" stroke={c.sage} strokeWidth="4" fill="none" />
        <rect x="42" y="20" width="3" height="24" fill={c.ochre} />
        <rect x="38" y="16" width="14" height="8" rx="2" fill={c.ochre} />
      </>
    ),
    friedFoodIllu: (
      <>
        <rect x="30" y="45" width="40" height="35" rx="4" fill={c.ochre} />
        <rect x="35" y="20" width="6" height="35" rx="2" fill={c.ochre} />
        <rect x="47" y="15" width="6" height="40" rx="2" fill={c.ochre} />
        <rect x="59" y="22" width="6" height="33" rx="2" fill={c.ochre} />
      </>
    ),
    sugarCubeIllu: (
      <>
        <rect x="25" y="50" width="20" height="20" rx="3" fill="#fff" stroke={c.line} strokeWidth="2" />
        <rect x="50" y="50" width="20" height="20" rx="3" fill="#fff" stroke={c.line} strokeWidth="2" />
        <rect x="37" y="28" width="20" height="20" rx="3" fill="#fff" stroke={c.line} strokeWidth="2" />
      </>
    ),
    twinsIcon: (
      <>
        <circle cx="34" cy="26" r="10" fill={c.teal} />
        <path d="M26,36 C20,46 20,58 26,66 C34,82 54,82 50,60 C58,54 55,42 46,36 C40,30 30,31 26,36 Z" fill={c.pink} opacity="0.9" />
        <circle cx="66" cy="26" r="10" fill={c.teal} />
        <path d="M58,36 C52,46 52,58 58,66 C66,82 86,82 82,60 C90,54 87,42 78,36 C72,30 62,31 58,36 Z" fill={c.ochre} opacity="0.9" />
      </>
    ),
    safeSleep: (
      <>
        <rect x="16" y="52" width="68" height="30" rx="8" fill={c.sage} />
        <rect x="16" y="52" width="68" height="8" fill={c.teal} opacity="0.7" />
        <ellipse cx="50" cy="46" rx="20" ry="13" fill="#F0C99A" />
        <circle cx="43" cy="44" r="1.8" fill={c.teal} />
        <circle cx="57" cy="44" r="1.8" fill={c.teal} />
        <path d="M45,50 Q50,53 55,50" stroke={c.teal} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </>
    ),
    emergency: (
      <>
        <path d="M50,15 L82,32 V54 C82,72 68,84 50,90 C32,84 18,72 18,54 V32 Z" fill={c.ochre} />
        <rect x="46" y="34" width="8" height="28" rx="3" fill={c.cream} />
        <circle cx="50" cy="72" r="4.5" fill={c.cream} />
      </>
    ),
    allergyWarning: (
      <>
        <path d="M50,14 L90,84 H10 Z" fill={c.pink} />
        <rect x="46" y="38" width="8" height="22" rx="3" fill={c.cream} />
        <circle cx="50" cy="70" r="4.5" fill={c.cream} />
      </>
    ),
    potty: (
      <>
        <ellipse cx="50" cy="34" rx="26" ry="10" fill={c.sage} />
        <path d="M26,34 v18 a24,12 0 0,0 48,0 v-18" fill={c.teal} />
        <ellipse cx="50" cy="34" rx="16" ry="6" fill={c.cream} />
      </>
    ),
    vaccine: (
      <>
        <rect x="30" y="46" width="46" height="14" rx="4" fill={c.sage} transform="rotate(-30 30 46)" />
        <rect x="66" y="24" width="10" height="16" rx="2" fill={c.teal} transform="rotate(-30 66 24)" />
        <path d="M30,60 l-10,10" stroke={c.teal} strokeWidth="4" strokeLinecap="round" />
        <circle cx="24" cy="70" r="3" fill={c.ochre} />
      </>
    ),
    fertileCalendar: (
      <>
        <rect x="16" y="20" width="68" height="60" rx="8" fill={c.card} stroke={c.line} strokeWidth="2" />
        <rect x="16" y="20" width="68" height="16" rx="8" fill={c.teal} />
        {[0, 1, 2, 3, 4, 5].map((col) =>
          [0, 1].map((row) => (
            <rect key={`${col}-${row}`} x={22 + col * 11} y={44 + row * 15} width="8" height="8" rx="2"
              fill={(col === 3 && row === 0) ? c.ochre : (col >= 1 && col <= 4 ? c.pink : c.line)} />
          ))
        )}
      </>
    ),
    bellySmall: (
      <>
        <circle cx="42" cy="26" r="9" fill={c.teal} />
        <path d="M36,34 C31,42 31,52 36,58 C42,72 62,72 58,52 C64,48 62,38 54,34 C48,29 40,29 36,34 Z" fill={c.pink} />
      </>
    ),
    bellyMedium: (
      <>
        <circle cx="40" cy="22" r="9" fill={c.teal} />
        <path d="M33,30 C27,40 27,52 33,60 C40,80 68,80 62,55 C70,49 67,36 56,30 C47,23 37,24 33,30 Z" fill={c.pink} />
      </>
    ),
    bellyLarge: (
      <>
        <circle cx="36" cy="20" r="9" fill={c.teal} />
        <path d="M28,28 C20,40 20,54 28,63 C36,90 78,90 70,58 C80,50 76,34 62,28 C50,19 36,20 28,28 Z" fill={c.pink} />
      </>
    ),
    nursing: (
      <>
        <path d="M22,84 C22,58 36,48 52,48 C68,48 82,58 82,84 Z" fill={c.teal} />
        <circle cx="52" cy="34" r="15" fill="#F0C99A" />
        <ellipse cx="66" cy="66" rx="14" ry="10" fill="#F0C99A" />
        <circle cx="70" cy="62" r="1.8" fill={c.teal} />
      </>
    ),
    crawling: (
      <>
        <ellipse cx="50" cy="68" rx="26" ry="10" fill={c.sage} />
        <circle cx="72" cy="50" r="13" fill="#F0C99A" />
        <path d="M30,68 Q50,40 74,50" fill="none" stroke={c.teal} strokeWidth="10" strokeLinecap="round" />
      </>
    ),
    playing: (
      <>
        <circle cx="34" cy="34" r="11" fill={c.sage} />
        <rect x="24" y="45" width="20" height="24" rx="9" fill={c.teal} />
        <circle cx="70" cy="60" r="14" fill={c.ochre} />
        <path d="M67,55 l6,10 M73,55 l-6,10" stroke={c.cream} strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
    diaperChange: (
      <>
        <rect x="16" y="56" width="68" height="16" rx="6" fill={c.sage} />
        <ellipse cx="50" cy="44" rx="24" ry="14" fill="#F0C99A" />
        <path d="M38,58 h24 a4,4 0 0,1 4,4 v4 a4,4 0 0,1 -4,4 h-24 a4,4 0 0,1 -4,-4 v-4 a4,4 0 0,1 4,-4 Z" fill={c.card} />
      </>
    ),
    thermometer: (
      <>
        <rect x="45" y="14" width="10" height="46" rx="5" fill={c.card} stroke={c.line} strokeWidth="2" />
        <rect x="47.5" y="28" width="5" height="30" fill={c.pink} />
        <circle cx="50" cy="66" r="12" fill={c.pink} />
      </>
    ),
    hydration: (
      <>
        <path d="M50,14 C64,34 72,46 72,58 A22,22 0 0,1 28,58 C28,46 36,34 50,14 Z" fill={c.teal} />
        <ellipse cx="43" cy="52" rx="5" ry="7" fill="#ffffff" opacity="0.4" />
      </>
    ),
    foodPlate: (
      <>
        <circle cx="50" cy="50" r="34" fill={c.card} stroke={c.line} strokeWidth="2" />
        <path d="M50,50 L50,16 A34,34 0 0,1 79,66 Z" fill={c.sage} />
        <path d="M50,50 L79,66 A34,34 0 0,1 30,79 Z" fill={c.ochre} />
        <path d="M50,50 L30,79 A34,34 0 0,1 50,16 Z" fill={c.pink} />
      </>
    ),
    raspberryLeaf: (
      <>
        <path d="M50,20 C30,30 24,50 34,70 C40,82 60,82 66,70 C76,50 70,30 50,20 Z" fill={c.sage} />
        <path d="M50,24 L50,76 M50,45 L36,34 M50,45 L64,34 M50,60 L38,68 M50,60 L62,68" stroke={c.teal} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="70" cy="60" r="4" fill="#B23A4E" />
        <circle cx="76" cy="66" r="4" fill="#B23A4E" />
        <circle cx="73" cy="72" r="4" fill="#B23A4E" />
        <circle cx="80" cy="72" r="4" fill="#B23A4E" />
      </>
    ),
    nettleLeaf: (
      <>
        <path d="M50,18 C34,26 26,44 30,62 C33,76 45,84 50,84 C55,84 67,76 70,62 C74,44 66,26 50,18 Z" fill="#5E8A4E" />
        <path d="M50,22 L50,80" stroke={c.teal} strokeWidth="1.6" />
        {[-1, 1].map((s) =>
          [0.28, 0.45, 0.62].map((t, i) => (
            <path key={`${s}-${i}`} d={`M50,${22 + t * 58} L${50 + s * 16},${16 + t * 58}`} stroke={c.teal} strokeWidth="1.3" strokeLinecap="round" />
          ))
        )}
      </>
    ),
    raspberryNettleMix: (
      <>
        <path d="M30,50 C24,36 32,22 46,22 C58,22 64,34 60,46 C56,58 40,64 30,50 Z" fill="#5E8A4E" />
        <path d="M70,50 C60,42 56,58 66,72 C72,80 84,78 86,66 C88,54 80,44 70,50 Z" fill={c.sage} />
        <circle cx="78" cy="70" r="3.4" fill="#B23A4E" />
        <circle cx="83" cy="75" r="3.4" fill="#B23A4E" />
        <circle cx="80" cy="80" r="3.4" fill="#B23A4E" />
      </>
    ),
    gingerLemon: (
      <>
        <path d="M22,50 C18,38 28,26 40,28 C50,30 52,42 46,50 C54,52 58,64 50,72 C40,80 26,74 24,62 C22,56 24,52 22,50 Z" fill="#D9A85C" />
        <circle cx="70" cy="55" r="22" fill="#E8C93A" />
        <circle cx="70" cy="55" r="15" fill="#F3E27A" />
        {[0, 60, 120].map((a) => (
          <path key={a} d="M70,55 L70,40" stroke="#E8C93A" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 70 55)`} />
        ))}
      </>
    ),
    greenTeaLeaf: (
      <>
        <ellipse cx="46" cy="50" rx="30" ry="20" fill="#6E9B5E" transform="rotate(-28 46 50)" />
        <path d="M22,58 Q46,50 70,42" stroke={c.teal} strokeWidth="1.6" fill="none" />
        <ellipse cx="66" cy="66" rx="20" ry="14" fill="#8CB579" transform="rotate(18 66 66)" />
        <path d="M50,72 Q66,66 82,60" stroke={c.teal} strokeWidth="1.4" fill="none" />
      </>
    ),
    avocado: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M50,16 C68,16 78,36 74,56 C70,78 58,86 50,86 C42,86 30,78 26,56 C22,36 32,16 50,16 Z" fill={`url(#${uid}-avoSkinGrad)`} />
        <path d="M50,26 C62,26 68,40 65,54 C62,70 55,76 50,76 C45,76 38,70 35,54 C32,40 38,26 50,26 Z" fill={`url(#${uid}-avoFleshGrad)`} />
        <circle cx="50" cy="54" r="12" fill={`url(#${uid}-brownGrad)`} />
        <ellipse cx="46" cy="50" rx="3.4" ry="2.4" fill="#fff" opacity="0.35" />
        <ellipse cx="38" cy="28" rx="5" ry="3" fill="#fff" opacity="0.3" />
      </g>
    ),
    pillCapsule: (
      <>
        <rect x="24" y="42" width="52" height="24" rx="12" fill={c.sage} transform="rotate(-30 50 54)" />
        <rect x="24" y="42" width="26" height="24" rx="12" fill={c.teal} transform="rotate(-30 50 54)" />
        <circle cx="72" cy="30" r="4" fill={c.ochre} />
        <circle cx="80" cy="38" r="3" fill={c.ochre} />
      </>
    ),
    poppySeed: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <circle cx="50" cy="50" r="7" fill={`url(#${uid}-brownGrad)`} />
        <ellipse cx="48" cy="47" rx="1.6" ry="1.1" fill="#fff" opacity="0.4" />
      </g>
    ),
    raspberryFruit: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        {[[42, 40], [50, 36], [58, 40], [38, 50], [50, 48], [62, 50], [42, 60], [50, 58], [58, 60], [46, 68], [54, 68]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="6.5" fill={`url(#${uid}-redGrad)`} />
        ))}
        {[[40, 38], [48, 34], [36, 48], [48, 46], [40, 58], [44, 66]].map(([x, y], i) => (
          <ellipse key={`h${i}`} cx={x} cy={y} rx="1.6" ry="1" fill="#fff" opacity="0.4" />
        ))}
        <path d="M46,26 Q50,18 54,26" stroke="#5E8A4E" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    ),
    plumFruit: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <circle cx="50" cy="54" r="28" fill={`url(#${uid}-purpleGrad)`} />
        <ellipse cx="38" cy="38" rx="8" ry="11" fill="#fff" opacity="0.28" />
        <path d="M52,26 Q56,16 64,18" stroke="#5E8A4E" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    ),
    bananaFruit: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M28,66 C24,44 34,26 54,22 C60,21 64,24 62,29 C60,33 54,32 50,35 C36,45 32,58 40,70 C42,74 38,78 33,76 C30,75 29,71 28,66 Z" fill={`url(#${uid}-yellowGrad)`} />
        <path d="M50,35 C48,40 46,50 46,58" stroke="#C9A82A" strokeWidth="1.6" fill="none" />
        <path d="M40,32 C34,42 31,52 34,62" stroke="#fff" strokeWidth="2.2" fill="none" opacity="0.3" strokeLinecap="round" />
      </g>
    ),
    cornCob: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M42,18 C30,22 24,34 26,50 C24,64 30,78 42,84 L58,84 C70,78 76,64 74,50 C76,34 70,22 58,18 Z" fill={`url(#${uid}-yellowGrad)`} />
        {[28, 36, 44, 52, 60, 68, 76].map((y) => (
          <g key={y}>
            <circle cx="38" cy={y} r="4" fill="#E0BE30" />
            <circle cx="50" cy={y + 4} r="4" fill="#E0BE30" />
            <circle cx="62" cy={y} r="4" fill="#E0BE30" />
            <ellipse cx="37" cy={y - 1} rx="1.2" ry="0.9" fill="#fff" opacity="0.4" />
            <ellipse cx="61" cy={y - 1} rx="1.2" ry="0.9" fill="#fff" opacity="0.4" />
          </g>
        ))}
        <path d="M40,18 Q30,8 20,14 Q28,20 40,18 Z" fill={`url(#${uid}-greenGrad)`} />
        <path d="M60,18 Q70,8 80,14 Q72,20 60,18 Z" fill={`url(#${uid}-greenGrad)`} />
      </g>
    ),
    eggplantFruit: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M50,30 C68,34 76,52 68,68 C62,80 50,84 42,78 C30,70 28,50 38,36 C42,30 46,28 50,30 Z" fill={`url(#${uid}-eggplantGrad)`} />
        <ellipse cx="44" cy="40" rx="5" ry="10" fill="#fff" opacity="0.25" />
        <path d="M46,30 Q50,18 60,20 Q56,28 46,30 Z" fill={`url(#${uid}-greenGrad)`} />
      </g>
    ),
    coconutFruit: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <circle cx="50" cy="54" r="30" fill={`url(#${uid}-brownGrad)`} />
        <circle cx="50" cy="54" r="30" fill="none" stroke="#4A3222" strokeWidth="1.4" strokeDasharray="2 3" />
        <ellipse cx="38" cy="38" rx="7" ry="10" fill="#fff" opacity="0.18" />
        <circle cx="50" cy="54" r="17" fill="#F7F0DC" />
        <circle cx="50" cy="54" r="17" fill="none" stroke="#E4D9BC" strokeWidth="1" />
        <circle cx="42" cy="30" r="3.6" fill="#4A3222" />
        <circle cx="50" cy="27" r="3.6" fill="#4A3222" />
        <circle cx="58" cy="30" r="3.6" fill="#4A3222" />
      </g>
    ),
    lettuceLeaf: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <path d="M50,20 C30,24 20,42 24,60 C28,76 40,84 50,84 C60,84 72,76 76,60 C80,42 70,24 50,20 Z" fill={`url(#${uid}-greenGrad)`} />
        <path d="M50,20 C40,26 34,42 36,58 C38,72 44,80 50,84 C56,80 62,72 64,58 C66,42 60,26 50,20 Z" fill="#B7D89C" />
        <path d="M50,26 L50,80 M40,34 L44,78 M60,34 L56,78" stroke="#6E9B5E" strokeWidth="1.3" fill="none" />
        <ellipse cx="42" cy="32" rx="5" ry="8" fill="#fff" opacity="0.25" />
      </g>
    ),
    watermelonFruit: (
      <g filter={`url(#${uid}-fruitShadow)`}>
        <ellipse cx="50" cy="54" rx="32" ry="34" fill={`url(#${uid}-greenGrad)`} />
        {[-24, -14, -4, 6, 16, 24].map((dx, i) => (
          <path
            key={i}
            d={`M${50 + dx * 0.6},22 C${50 + dx},38 ${50 + dx},70 ${50 + dx * 0.6},86`}
            stroke="#2F5E30"
            strokeWidth={i === 2 || i === 3 ? 4.4 : 3.4}
            fill="none"
            strokeLinecap="round"
            opacity="0.85"
          />
        ))}
        <ellipse cx="50" cy="54" rx="32" ry="34" fill="none" stroke="#2F5E30" strokeWidth="1.4" opacity="0.4" />
        <path d="M48,20 Q50,14 55,15" stroke="#5E8A4E" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="36" cy="34" rx="8" ry="12" fill="#ffffff" opacity="0.22" />
      </g>
    ),
    bowlSalad: (
      <>
        <path d="M18,48 a32,20 0 0,0 64,0 Z" fill={c.card} stroke={c.line} strokeWidth="2" />
        <circle cx="38" cy="42" r="6" fill={c.sage} />
        <circle cx="52" cy="38" r="7" fill={c.sage} />
        <circle cx="64" cy="44" r="5.5" fill={c.ochre} />
        <circle cx="46" cy="46" r="4.5" fill={c.pink} />
      </>
    ),
    bowlSoup: (
      <>
        <path d="M16,50 h68 a34,18 0 0,1 -68,0 Z" fill={c.ochre} />
        <path d="M16,50 h68 v4 a4,4 0 0,1 -4,4 h-60 a4,4 0 0,1 -4,-4 Z" fill={c.card} />
        <path d="M38,32 q-4,-6 0,-12" stroke={c.line} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M50,32 q-4,-6 0,-12" stroke={c.line} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M62,32 q-4,-6 0,-12" stroke={c.line} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>
    ),
    proteinDish: (
      <>
        <circle cx="50" cy="50" r="32" fill={c.card} stroke={c.line} strokeWidth="2" />
        <ellipse cx="46" cy="48" rx="17" ry="12" fill="#B9734E" />
        <ellipse cx="60" cy="42" rx="10" ry="7" fill={c.sage} />
        <ellipse cx="62" cy="58" rx="9" ry="6" fill={c.sage} />
      </>
    ),
    eggsDish: (
      <>
        <circle cx="50" cy="52" r="32" fill={c.card} stroke={c.line} strokeWidth="2" />
        <ellipse cx="40" cy="50" rx="13" ry="10" fill="#FBEAC2" />
        <circle cx="40" cy="50" r="5" fill={c.ochre} />
        <ellipse cx="62" cy="52" rx="13" ry="10" fill="#FBEAC2" />
        <circle cx="62" cy="52" r="5" fill={c.ochre} />
      </>
    ),
    oatmealBowl: (
      <>
        <path d="M18,48 a32,20 0 0,0 64,0 Z" fill="#EADFC4" stroke={c.line} strokeWidth="2" />
        <circle cx="40" cy="44" r="3" fill={c.pink} />
        <circle cx="50" cy="46" r="3" fill={c.pink} />
        <circle cx="60" cy="43" r="3" fill={c.sage} />
      </>
    ),
    smoothieCup: (
      <>
        <path d="M34,22 h32 l-5,54 a5,5 0 0,1 -5,4 h-12 a5,5 0 0,1 -5,-4 Z" fill={c.pink} />
        <rect x="46" y="10" width="6" height="16" rx="3" fill={c.teal} />
      </>
    ),
    yogurtCup: (
      <>
        <path d="M38,24 h24 l-4,46 a4,4 0 0,1 -4,4 h-8 a4,4 0 0,1 -4,-4 Z" fill={c.card} stroke={c.line} strokeWidth="2" />
        <rect x="36" y="22" width="28" height="8" rx="3" fill={c.sage} />
      </>
    ),
    fruitBowl: (
      <>
        <path d="M16,52 a34,18 0 0,0 68,0 Z" fill={c.sage} opacity="0.3" />
        <circle cx="38" cy="42" r="11" fill={c.ochre} />
        <circle cx="58" cy="38" r="9" fill="#C0453F" />
        <circle cx="66" cy="50" r="8" fill={c.pink} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ flexShrink: 0 }}>
      <defs>
        <filter id={`${uid}-fruitShadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#3A2E1F" floodOpacity="0.28" />
        </filter>
        <radialGradient id={`${uid}-redGrad`} cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#F5A0A8" /><stop offset="60%" stopColor="#D94B4B" /><stop offset="100%" stopColor="#A82F2F" />
        </radialGradient>
        <radialGradient id={`${uid}-purpleGrad`} cx="35%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#B79BD1" /><stop offset="55%" stopColor="#6B4E8E" /><stop offset="100%" stopColor="#453064" />
        </radialGradient>
        <radialGradient id={`${uid}-yellowGrad`} cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#FBF0A8" /><stop offset="60%" stopColor="#E8C93A" /><stop offset="100%" stopColor="#C9A82A" />
        </radialGradient>
        <radialGradient id={`${uid}-greenGrad`} cx="35%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#C3E0A6" /><stop offset="60%" stopColor="#6E9B5E" /><stop offset="100%" stopColor="#43613A" />
        </radialGradient>
        <radialGradient id={`${uid}-brownGrad`} cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#9C7757" /><stop offset="60%" stopColor="#6B4A34" /><stop offset="100%" stopColor="#42301F" />
        </radialGradient>
        <radialGradient id={`${uid}-eggplantGrad`} cx="32%" cy="24%" r="82%">
          <stop offset="0%" stopColor="#9C7EB2" /><stop offset="55%" stopColor="#5B3A6E" /><stop offset="100%" stopColor="#341F42" />
        </radialGradient>
        <radialGradient id={`${uid}-avoSkinGrad`} cx="32%" cy="24%" r="82%">
          <stop offset="0%" stopColor="#9CC17E" /><stop offset="60%" stopColor="#5E8A4E" /><stop offset="100%" stopColor="#354D2C" />
        </radialGradient>
        <radialGradient id={`${uid}-avoFleshGrad`} cx="38%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#F2F6D8" /><stop offset="100%" stopColor="#C9DE8E" />
        </radialGradient>
      </defs>
      {scenes[type] || null}
    </svg>
  );
}

/* ---------------- FETUS ILLUSTRATION (soft pseudo-3D, gradient-shaded, grows with each week) ---------------- */
function FetusIllustration({ week, scale = 1, size = 60, detailed = false }) {
  const gradId = `fetusGrad-${week}`;
  const shadowId = `fetusShadow-${week}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ flexShrink: 0, overflow: "visible" }}>
      <defs>
        <radialGradient id={gradId} cx="32%" cy="22%" r="88%">
          <stop offset="0%" stopColor="#FCE9EE" />
          <stop offset="50%" stopColor={COLORS.pink} />
          <stop offset="100%" stopColor="#AD6B87" />
        </radialGradient>
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#7A4B5C" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter={`url(#${shadowId})`} transform={`translate(50,50) scale(${scale}) translate(-50,-50)`}>
        {/* umbilical cord, curling gently away from the belly */}
        <path d="M62,66 C70,68 76,64 78,72 C80,80 74,84 70,80" stroke={`url(#${gradId})`} strokeWidth="3.4" fill="none" strokeLinecap="round" opacity="0.85" />
        <circle cx="70" cy="80" r="3" fill={`url(#${gradId})`} opacity="0.85" />

        {/* curled spine and torso, tucked into the classic fetal "C" position */}
        <path d="M60,36 C75,39 83,54 79,68 C75,80 62,89 48,87 C36,85 27,75 27,63 C27,53 34,46 42,42 C46,38 53,35 60,36 Z" fill={`url(#${gradId})`} />

        {/* thigh, bent up toward the belly */}
        <ellipse cx="40" cy="70" rx="14" ry="10" fill={`url(#${gradId})`} transform="rotate(28 40 70)" />
        {/* shin and foot, tucked under the thigh */}
        <ellipse cx="52" cy="86" rx="9" ry="7" fill={`url(#${gradId})`} transform="rotate(-8 52 86)" />

        {/* upper arm, curved toward the face */}
        <path d="M30,44 C22,46 18,54 22,62 C25,68 32,70 36,66 C32,60 30,52 30,44 Z" fill={`url(#${gradId})`} />
        {/* small hand resting near the chin */}
        <circle cx="34" cy="38" r="6" fill={`url(#${gradId})`} />

        {/* large head, proportionally big like a real fetus */}
        <circle cx="58" cy="25" r="18" fill={`url(#${gradId})`} />
        {/* ear */}
        <path d="M41,24 C37,22 37,30 41,30 C43,30 43,24 41,24 Z" fill={`url(#${gradId})`} />
        {/* brow ridge */}
        <path d="M58,18 Q63,15 68,18" stroke="#8A5468" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
        {/* closed, resting eye with a soft lash */}
        <path d="M60,22 Q64,19.5 68,22" stroke="#7A4B5C" strokeWidth="1.7" fill="none" strokeLinecap="round" opacity="0.65" />
        <path d="M67,21.5 L69,20" stroke="#7A4B5C" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
        {/* nose, in profile */}
        <path d="M74,24 Q80,26 76,31 Q73,33.5 70,31" fill={`url(#${gradId})`} />
        {/* small open mouth */}
        <ellipse cx="70" cy="35" rx="2.6" ry="1.8" fill="#8A5468" opacity="0.4" />
        {/* chin taper */}
        <path d="M66,38 Q60,42 54,40" stroke="#8A5468" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.3" />
        {/* soft cheek blush */}
        <ellipse cx="66" cy="29" rx="3.6" ry="2.6" fill="#F6B8C6" opacity="0.4" />
        {/* soft highlight on the head for a rendered, glossy feel */}
        <ellipse cx="51" cy="17" rx="5.5" ry="3.4" fill="#ffffff" opacity="0.55" />
        {/* highlight on the curled back for volume */}
        <ellipse cx="68" cy="46" rx="5" ry="9" fill="#ffffff" opacity="0.2" transform="rotate(20 68 46)" />
        {detailed && (
          <>
            {/* small fingers near the chin */}
            <path d="M30,34 L28,31 M34,32 L34,29 M38,34 L40,31" stroke="#8A5468" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
            {/* small toes on the tucked foot */}
            <path d="M46,90 L44,93 M52,91 L52,94 M58,89 L60,92" stroke="#8A5468" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
          </>
        )}
      </g>
    </svg>
  );
}

/* ---------------- SECTION HERO (explanatory banner + icon per tab) ---------------- */
const SECTION_META = {
  conception: { icon: Egg, color: COLORS.ochre, bg: "#EDDDA0", compact: true,
    title: { fr: "Conception", en: "Conception" },
    desc: { fr: "Comprendre son cycle, repérer sa fenêtre fertile et préparer son corps avant même le test de grossesse.", en: "Understand your cycle, spot your fertile window, and get your body ready before the pregnancy test." } },
  grossesse: { icon: Calendar, color: COLORS.pink, bg: "#FBE3EA", wallpaper: ["👶", "🍼", "🧸", "🧷"],
    title: { fr: "Ma grossesse", en: "My Pregnancy" },
    desc: { fr: "Semaine par semaine, trimestre par trimestre : ce qui se passe dans votre corps et chez votre bébé.", en: "Week by week, trimester by trimester: what's happening in your body and with your baby." } },
  postpartum: { icon: Moon, color: COLORS.teal,
    title: { fr: "Post-partum", en: "Postpartum" },
    desc: { fr: "Le corps récupère, les émotions varient, et un nouveau rythme de vie s'installe.", en: "Your body recovers, emotions shift, and a new rhythm of life settles in." } },
  dev01: { icon: Sparkles, emojiIcon: "👶", color: COLORS.ochre, bg: "#FBF3E4", wallpaper: ["👶", "🧸", "🔤", "🍼"],
    title: { fr: "0 à 5 ans", en: "0 to 5 years" },
    desc: { fr: "Les jalons moteurs, le langage, le sommeil et l'autonomie, du nouveau-né jusqu'à l'entrée à l'école.", en: "Motor milestones, language, sleep and independence, from newborn to starting school." } },
  rdv: { icon: Users, color: COLORS.blue, bg: "#EAF2F8",
    title: { fr: "Rendez-vous & horaire familial", en: "Appointments & family schedule" },
    desc: { fr: "Les rendez-vous de maman et des enfants, tous au même endroit.", en: "Mom's and the kids' appointments, all in one place." } },
  alimentation: { icon: Apple, color: COLORS.teal, bg: "#E4EAE0",
    title: { fr: "Alimentation", en: "Feeding" },
    desc: { fr: "De la première purée aux repas en famille : recettes, quantités et tableaux pratiques.", en: "From the first purée to family meals: recipes, quantities and handy charts." } },
  soins: { icon: Droplet, customIcon: "shampooBottleIllu", color: COLORS.ochre, bg: "#D9E7F2", wallpaper: ["🛁", "🧴", "🧼", "🩹"],
    title: { fr: "Soins", en: "Care" },
    desc: { fr: "Bain, peau, sommeil sécuritaire : les bons gestes du quotidien.", en: "Bath time, skin, safe sleep: the right everyday habits." } },
  sante: { icon: Stethoscope, color: COLORS.sage,
    title: { fr: "Santé", en: "Health" },
    desc: { fr: "Reconnaître les maladies courantes et savoir quand consulter.", en: "Recognize common illnesses and know when to see a doctor." } },
};

// Reusable wallpaper pattern generator (deterministic)
function makeWallpaperPattern(emojis, count = 24) {
  return Array.from({ length: count }).map((_, idx) => {
    const row = Math.floor(idx / 6);
    const col = idx % 6;
    return {
      emoji: emojis[idx % emojis.length],
      top: `${row * 22 + (col % 2 === 0 ? 2 : 9)}%`,
      left: `${col * 17 + (row % 2 === 0 ? 2 : 6)}%`,
      rotate: ((idx * 37) % 40) - 20,
      size: 18 + (idx % 3) * 4,
    };
  });
}

function SectionHero({ sectionKey, lang }) {
  const meta = SECTION_META[sectionKey];
  if (!meta) return null;
  const Icon = meta.icon;
  const compact = !!meta.compact;
  const hasBg = !!meta.bg;
  const hasWallpaper = !!meta.wallpaper;
  const pattern = hasWallpaper ? makeWallpaperPattern(meta.wallpaper) : null;
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18,
      background: meta.bg || COLORS.card,
      border: hasBg ? "none" : `1px solid ${COLORS.line}`,
      borderRadius: 20, padding: compact ? "16px 20px" : "22px 26px",
      marginBottom: 20, boxShadow: "0 2px 14px rgba(47,72,88,0.06)",
    }}>
      {hasWallpaper && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          {pattern.map((it, idx) => (
            <span
              key={idx}
              style={{
                position: "absolute", top: it.top, left: it.left, fontSize: it.size,
                opacity: 0.16, transform: `rotate(${it.rotate}deg)`,
              }}
            >
              {it.emoji}
            </span>
          ))}
        </div>
      )}
      <div style={{
        position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: compact ? 14 : 18,
        background: hasWallpaper ? "#fff" : "transparent",
        borderRadius: hasWallpaper ? 16 : 0,
        padding: hasWallpaper ? "14px 18px" : 0,
        boxShadow: hasWallpaper ? "0 4px 14px rgba(47,72,88,0.10)" : "none",
      }}>
        <div style={{
          width: compact ? 48 : 62, height: compact ? 48 : 62, borderRadius: compact ? 14 : 18,
          background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {meta.customIcon ? (
            <Illustration type={meta.customIcon} size={compact ? 30 : 38} />
          ) : meta.emojiIcon ? (
            <span style={{ fontSize: compact ? 26 : 32, lineHeight: 1 }}>{meta.emojiIcon}</span>
          ) : (
            <Icon size={compact ? 22 : 28} color="#fff" />
          )}
        </div>
        <div>
          <h2 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: compact ? 19 : 23, color: COLORS.teal }}>{meta.title[lang]}</h2>
          <p style={{ margin: 0, color: hasWallpaper ? COLORS.muted : (hasBg ? COLORS.teal : COLORS.muted), opacity: hasBg && !hasWallpaper ? 0.75 : 1, fontSize: compact ? 13 : 14.5, lineHeight: 1.5, maxWidth: 540 }}>{meta.desc[lang]}</p>
        </div>
      </div>
      <div className="hero-illu" style={{ position: "relative", zIndex: 1, background: hasBg ? "rgba(255,255,255,0.45)" : COLORS.cream, borderRadius: 16, padding: 8 }}>
        <Illustration type={sectionKey} size={compact ? 56 : 72} />
      </div>
    </div>
  );
}

/* ---------------- GENERIC CONTENT RENDERERS ---------------- */
// ---------------- TEXTE LÉGAL (Politique de confidentialité + Conditions d'utilisation) ----------------
// ⚠️ Base de départ couvrant RGPD (UE), Loi 25 (Québec), CCPA (Californie) — à faire réviser par un juriste avant lancement public,
// particulièrement en raison des données de santé et des données concernant des enfants traitées par l'application.
const LEGAL_TEXT = {
  privacy: {
    fr: `POLITIQUE DE CONFIDENTIALITÉ — ME MY BABY

Dernière mise à jour : ${new Date().getFullYear()}

1. RESPONSABLE DU TRAITEMENT
Me My Baby ("nous") est responsable du traitement des données personnelles collectées via cette application, destinée à un usage international.

2. DONNÉES COLLECTÉES
— Données de compte : nom, courriel, mot de passe (chiffré).
— Données de profil : âge ou date de naissance, pays, langue, date prévue d'accouchement, photo de profil.
— Données concernant vos enfants : prénom, date de naissance, photo — saisies par vous, le parent ou tuteur légal titulaire du compte. L'enfant ne crée pas de compte lui-même.
— Données de santé et de suivi : poids, taille, croissance, alimentation, journal de grossesse/postpartum, rendez-vous médicaux, documents santé que vous choisissez d'ajouter.
— Données techniques : adresse IP, type d'appareil, journaux de connexion.

3. FINALITÉS DU TRAITEMENT
Vos données sont utilisées pour : fournir les fonctionnalités de l'application, personnaliser le contenu selon votre grossesse/vos enfants, assurer la sécurité du compte, communiquer avec vous (courriels transactionnels), et améliorer le service.

4. BASE LÉGALE (Union européenne — RGPD)
Le traitement repose sur votre consentement explicite (recueilli à l'inscription), l'exécution du contrat de service, et notre intérêt légitime à améliorer l'application.

5. SOUS-TRAITANTS ET HÉBERGEMENT
Vos données sont hébergées par Supabase (base de données, authentification et stockage des photos), l'application elle-même est hébergée par Vercel, et les courriels transactionnels sont envoyés via Resend. Ces prestataires peuvent traiter des données en dehors de votre pays de résidence, avec des garanties contractuelles appropriées (clauses contractuelles types ou décision d'adéquation, selon le cas).

6. CONSERVATION DES DONNÉES
Vos données sont conservées tant que votre compte est actif. Vous pouvez demander leur suppression à tout moment (voir section 8).

7. DONNÉES DE SANTÉ ET DONNÉES SENSIBLES
Les informations de santé et de grossesse que vous saisissez sont des données sensibles. Elles ne sont jamais vendues, ni partagées à des fins publicitaires. Elles servent uniquement à faire fonctionner les outils de suivi que vous utilisez.

8. VOS DROITS
Selon votre pays de résidence (RGPD pour l'UE, Loi 25 pour le Québec, CCPA pour la Californie, ou lois équivalentes ailleurs), vous disposez des droits suivants : accès à vos données, rectification, effacement ("droit à l'oubli"), portabilité, opposition et limitation du traitement, et retrait du consentement à tout moment. Pour exercer ces droits, contactez-nous via la section "Nous joindre" de l'application.

9. SÉCURITÉ
Nous appliquons des mesures de sécurité raisonnables (chiffrement, contrôle d'accès) pour protéger vos données contre l'accès non autorisé.

10. MINEURS
Cette application est destinée aux parents et futurs parents adultes. Les données concernant les enfants sont saisies et contrôlées exclusivement par le parent ou tuteur légal titulaire du compte.

11. MODIFICATIONS
Cette politique peut être mise à jour. Les changements importants vous seront communiqués dans l'application.

12. CONTACT
Pour toute question relative à vos données personnelles, utilisez la section "Nous joindre" de l'application.`,
    en: `PRIVACY POLICY — ME MY BABY

Last updated: ${new Date().getFullYear()}

1. DATA CONTROLLER
Me My Baby ("we") is responsible for processing personal data collected through this application, intended for international use.

2. DATA WE COLLECT
— Account data: name, email, password (encrypted).
— Profile data: age or date of birth, country, language, expected due date, profile photo.
— Data about your children: first name, date of birth, photo — entered by you, the parent or legal guardian holding the account. The child does not create their own account.
— Health and tracking data: weight, height, growth, feeding, pregnancy/postpartum journal, medical appointments, health documents you choose to add.
— Technical data: IP address, device type, connection logs.

3. PURPOSES OF PROCESSING
Your data is used to: provide the app's features, personalize content based on your pregnancy/children, secure your account, communicate with you (transactional emails), and improve the service.

4. LEGAL BASIS (European Union — GDPR)
Processing relies on your explicit consent (collected at signup), performance of the service contract, and our legitimate interest in improving the app.

5. SUBPROCESSORS AND HOSTING
Your data is hosted by Supabase (database, authentication, and photo storage), the app itself is hosted by Vercel, and transactional emails are sent via Resend. These providers may process data outside your country of residence, with appropriate contractual safeguards (standard contractual clauses or an adequacy decision, as applicable).

6. DATA RETENTION
Your data is kept as long as your account is active. You may request deletion at any time (see section 8).

7. HEALTH AND SENSITIVE DATA
Health and pregnancy information you enter is sensitive data. It is never sold or shared for advertising purposes. It is used solely to power the tracking tools you use.

8. YOUR RIGHTS
Depending on your country of residence (GDPR for the EU, Law 25 for Quebec, CCPA for California, or equivalent laws elsewhere), you have the following rights: access to your data, rectification, erasure ("right to be forgotten"), portability, objection and restriction of processing, and withdrawal of consent at any time. To exercise these rights, contact us via the "Contact us" section of the app.

9. SECURITY
We apply reasonable security measures (encryption, access control) to protect your data from unauthorized access.

10. MINORS
This application is intended for adult parents and expectant parents. Data about children is entered and controlled exclusively by the parent or legal guardian holding the account.

11. CHANGES
This policy may be updated. Significant changes will be communicated to you within the app.

12. CONTACT
For any question about your personal data, use the "Contact us" section of the app.`,
    es: `POLÍTICA DE PRIVACIDAD — ME MY BABY

Última actualización: ${new Date().getFullYear()}

1. RESPONSABLE DEL TRATAMIENTO
Me My Baby ("nosotros") es responsable del tratamiento de los datos personales recopilados a través de esta aplicación, destinada a un uso internacional.

2. DATOS QUE RECOPILAMOS
— Datos de cuenta: nombre, correo electrónico, contraseña (cifrada).
— Datos de perfil: edad o fecha de nacimiento, país, idioma, fecha probable de parto, foto de perfil.
— Datos sobre tus hijos: nombre, fecha de nacimiento, foto — ingresados por ti, el padre/madre o tutor legal titular de la cuenta. El niño/a no crea su propia cuenta.
— Datos de salud y seguimiento: peso, altura, crecimiento, alimentación, diario de embarazo/posparto, citas médicas, documentos de salud que decidas agregar.
— Datos técnicos: dirección IP, tipo de dispositivo, registros de conexión.

3. FINALIDADES DEL TRATAMIENTO
Tus datos se utilizan para: proporcionar las funciones de la aplicación, personalizar el contenido según tu embarazo/hijos, proteger tu cuenta, comunicarnos contigo (correos transaccionales) y mejorar el servicio.

4. BASE LEGAL (Unión Europea — RGPD)
El tratamiento se basa en tu consentimiento explícito (recogido al registrarte), la ejecución del contrato de servicio y nuestro interés legítimo en mejorar la aplicación.

5. SUBENCARGADOS Y ALOJAMIENTO
Tus datos están alojados por Supabase (base de datos, autenticación y almacenamiento de fotos), la aplicación en sí está alojada por Vercel, y los correos transaccionales se envían a través de Resend. Estos proveedores pueden procesar datos fuera de tu país de residencia, con garantías contractuales adecuadas (cláusulas contractuales tipo o decisión de adecuación, según corresponda).

6. CONSERVACIÓN DE DATOS
Tus datos se conservan mientras tu cuenta esté activa. Puedes solicitar su eliminación en cualquier momento (ver sección 8).

7. DATOS DE SALUD Y DATOS SENSIBLES
La información de salud y embarazo que ingresas es un dato sensible. Nunca se vende ni se comparte con fines publicitarios. Se utiliza únicamente para hacer funcionar las herramientas de seguimiento que usas.

8. TUS DERECHOS
Según tu país de residencia (RGPD para la UE, Ley 25 para Quebec, CCPA para California, o leyes equivalentes en otros lugares), tienes los siguientes derechos: acceso a tus datos, rectificación, eliminación ("derecho al olvido"), portabilidad, oposición y limitación del tratamiento, y retiro del consentimiento en cualquier momento. Para ejercer estos derechos, contáctanos a través de la sección "Contáctanos" de la aplicación.

9. SEGURIDAD
Aplicamos medidas de seguridad razonables (cifrado, control de acceso) para proteger tus datos contra el acceso no autorizado.

10. MENORES
Esta aplicación está destinada a padres y futuros padres adultos. Los datos sobre los hijos son ingresados y controlados exclusivamente por el padre/madre o tutor legal titular de la cuenta.

11. CAMBIOS
Esta política puede actualizarse. Los cambios importantes se te comunicarán dentro de la aplicación.

12. CONTACTO
Para cualquier pregunta sobre tus datos personales, usa la sección "Contáctanos" de la aplicación.`,
  },
  terms: {
    fr: `CONDITIONS D'UTILISATION — ME MY BABY

Dernière mise à jour : ${new Date().getFullYear()}

⚠️ RAPPEL IMPORTANT
Les informations fournies dans Me My Baby sont destinées à enrichir vos connaissances et à vous accompagner au quotidien. Elles ne remplacent en aucun cas la consultation d'un professionnel de la santé qualifié (médecin, sage-femme, infirmière, pédiatre). Demandez toujours l'avis d'un professionnel avant toute décision concernant votre grossesse, votre accouchement ou la santé de votre enfant. En cas d'urgence, contactez immédiatement les services d'urgence de votre région.

1. ACCEPTATION
En créant un compte, vous acceptez les présentes conditions d'utilisation et notre politique de confidentialité.

2. DESCRIPTION DU SERVICE
Me My Baby est une application d'accompagnement de grossesse et de suivi parental, offerte selon un modèle freemium avec un abonnement optionnel payant.

3. COMPTE UTILISATEUR
Vous devez avoir au moins 18 ans, ou l'âge légal de majorité dans votre pays, pour créer un compte. Vous êtes responsable de la confidentialité de votre mot de passe.

4. CONTENU ET AVERTISSEMENT MÉDICAL
Le contenu de l'application (articles, suivis, suggestions de Léa la diététicienne, outils de grossesse) est fourni à titre informatif et éducatif uniquement, sans valeur de diagnostic ou de prescription. Il ne remplace pas l'avis d'un professionnel de la santé. Consultez toujours un médecin ou une sage-femme pour toute décision relative à votre grossesse ou à la santé de votre enfant.

5. ABONNEMENT ET PAIEMENT
Certaines fonctionnalités nécessitent un abonnement payant, facturé selon les modalités affichées au moment de l'achat. Vous pouvez annuler votre abonnement à tout moment; l'accès se poursuit jusqu'à la fin de la période déjà payée.

6. PROPRIÉTÉ INTELLECTUELLE
Le contenu, les textes et le design de l'application sont la propriété de Me My Baby et ne peuvent être reproduits sans autorisation.

7. RÉSILIATION
Vous pouvez supprimer votre compte à tout moment. Nous nous réservons le droit de suspendre un compte en cas d'utilisation abusive.

8. LIMITATION DE RESPONSABILITÉ
Dans les limites permises par la loi applicable, Me My Baby ne peut être tenu responsable des dommages indirects résultant de l'utilisation de l'application.

9. DROIT APPLICABLE
Les présentes conditions sont interprétées conformément aux lois applicables dans votre juridiction de résidence.

10. CONTACT
Pour toute question, utilisez la section "Nous joindre" de l'application.`,
    en: `TERMS OF USE — ME MY BABY

Last updated: ${new Date().getFullYear()}

⚠️ IMPORTANT REMINDER
Information provided in Me My Baby is intended to inform and support you day to day. It does not, under any circumstances, replace the advice of a qualified healthcare professional (doctor, midwife, nurse, pediatrician). Always seek professional advice before making any decision about your pregnancy, delivery, or your child's health. In an emergency, contact your local emergency services immediately.

1. ACCEPTANCE
By creating an account, you agree to these terms of use and our privacy policy.

2. SERVICE DESCRIPTION
Me My Baby is a pregnancy and parenting companion app, offered on a freemium model with an optional paid subscription.

3. USER ACCOUNT
You must be at least 18, or the legal age of majority in your country, to create an account. You are responsible for keeping your password confidential.

4. CONTENT AND MEDICAL DISCLAIMER
The app's content (articles, trackers, suggestions from Léa the dietitian, pregnancy tools) is provided for informational and educational purposes only, with no diagnostic or prescriptive value. It does not replace advice from a healthcare professional. Always consult a doctor or midwife for any decision regarding your pregnancy or your child's health.

5. SUBSCRIPTION AND PAYMENT
Some features require a paid subscription, billed according to the terms shown at the time of purchase. You may cancel your subscription at any time; access continues until the end of the already-paid period.

6. INTELLECTUAL PROPERTY
The app's content, text, and design are the property of Me My Baby and may not be reproduced without permission.

7. TERMINATION
You may delete your account at any time. We reserve the right to suspend an account in case of abusive use.

8. LIMITATION OF LIABILITY
To the extent permitted by applicable law, Me My Baby is not liable for indirect damages resulting from use of the app.

9. GOVERNING LAW
These terms are interpreted in accordance with the laws applicable in your jurisdiction of residence.

10. CONTACT
For any question, use the "Contact us" section of the app.`,
    es: `CONDICIONES DE USO — ME MY BABY

Última actualización: ${new Date().getFullYear()}

⚠️ RECORDATORIO IMPORTANTE
La información proporcionada en Me My Baby está destinada a informarte y acompañarte en tu día a día. No sustituye, bajo ninguna circunstancia, el consejo de un profesional de la salud calificado (médico, partera, enfermera, pediatra). Solicita siempre la opinión de un profesional antes de tomar cualquier decisión sobre tu embarazo, el parto o la salud de tu hijo/a. En caso de emergencia, contacta de inmediato a los servicios de emergencia de tu localidad.

1. ACEPTACIÓN
Al crear una cuenta, aceptas estas condiciones de uso y nuestra política de privacidad.

2. DESCRIPCIÓN DEL SERVICIO
Me My Baby es una aplicación de acompañamiento del embarazo y seguimiento parental, ofrecida bajo un modelo freemium con una suscripción de pago opcional.

3. CUENTA DE USUARIO
Debes tener al menos 18 años, o la mayoría de edad legal en tu país, para crear una cuenta. Eres responsable de mantener la confidencialidad de tu contraseña.

4. CONTENIDO Y AVISO MÉDICO
El contenido de la aplicación (artículos, seguimientos, sugerencias de Léa la dietista, herramientas de embarazo) se proporciona únicamente con fines informativos y educativos, sin valor de diagnóstico ni de prescripción. No sustituye el consejo de un profesional de la salud. Consulta siempre a un médico o partera para cualquier decisión relacionada con tu embarazo o la salud de tu hijo/a.

5. SUSCRIPCIÓN Y PAGO
Algunas funciones requieren una suscripción de pago, facturada según las condiciones mostradas al momento de la compra. Puedes cancelar tu suscripción en cualquier momento; el acceso continúa hasta el final del período ya pagado.

6. PROPIEDAD INTELECTUAL
El contenido, los textos y el diseño de la aplicación son propiedad de Me My Baby y no pueden reproducirse sin autorización.

7. TERMINACIÓN
Puedes eliminar tu cuenta en cualquier momento. Nos reservamos el derecho de suspender una cuenta en caso de uso abusivo.

8. LIMITACIÓN DE RESPONSABILIDAD
En la medida permitida por la ley aplicable, Me My Baby no es responsable de daños indirectos derivados del uso de la aplicación.

9. LEY APLICABLE
Estas condiciones se interpretan de acuerdo con las leyes aplicables en tu jurisdicción de residencia.

10. CONTACTO
Para cualquier pregunta, usa la sección "Contáctanos" de la aplicación.`,
  },
};

function LegalModal({ lang, doc, onClose }) {
  const titles = {
    privacy: { fr: "Politique de confidentialité", en: "Privacy Policy", es: "Política de privacidad" },
    terms: { fr: "Conditions d'utilisation", en: "Terms of Use", es: "Condiciones de uso" },
  };
  const closeLabel = lang === "fr" ? "Fermer" : lang === "es" ? "Cerrar" : "Close";
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200, background: "rgba(47,72,88,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 18, maxWidth: 560, width: "100%", maxHeight: "82vh",
        display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 17, margin: 0, color: COLORS.teal }}>{titles[doc][lang]}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "18px 20px", overflowY: "auto", fontSize: 12.5, lineHeight: 1.6, color: COLORS.text, whiteSpace: "pre-wrap" }}>
          {LEGAL_TEXT[doc][lang]}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${COLORS.line}`, textAlign: "right" }}>
          <button onClick={onClose} style={{ background: COLORS.teal, color: "#fff", border: "none", padding: "9px 18px", borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{closeLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 18, padding: "22px 24px", boxShadow: "0 2px 14px rgba(47,72,88,0.06)", ...style }}>
      {children}
    </div>
  );
}

/* ---------------- LOCKED CONTENT (paywall teaser) ---------------- */
function LockedContent({ lang, goTo }) {
  const L = lang === "fr"
    ? {
        title: "Contenu réservé aux membres",
        desc: "Créez votre profil gratuitement puis démarrez votre essai gratuit de 5 jours pour débloquer ce contenu et tout le reste de l'application.",
        cta: "Débloquer avec l'essai gratuit",
      }
    : lang === "es"
    ? {
        title: "Contenido solo para miembros",
        desc: "Crea tu perfil gratis y luego comienza tu prueba gratuita de 5 días para desbloquear este contenido y todo el resto de la aplicación.",
        cta: "Desbloquear con la prueba gratuita",
      }
    : {
        title: "Members-only content",
        desc: "Create your free profile, then start your 5-day free trial to unlock this content and everything else in the app.",
        cta: "Unlock with the free trial",
      };
  return (
    <div style={{
      background: COLORS.cream, borderRadius: 14, padding: "26px 22px", textAlign: "center",
      border: `1px dashed ${COLORS.line}`,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <Lock size={19} color="#fff" />
      </div>
      <div style={{ fontWeight: 700, color: COLORS.teal, fontSize: 15.5, marginBottom: 6 }}>{L.title}</div>
      <p style={{ fontSize: 13.5, color: COLORS.muted, lineHeight: 1.55, maxWidth: 380, margin: "0 auto 16px" }}>{L.desc}</p>
      <button onClick={() => goTo && goTo("abonnement")} style={{
        background: COLORS.ochre, color: "#fff", border: "none", padding: "10px 20px",
        borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
      }}>{L.cta}</button>
    </div>
  );
}

/* ---------------- keyword → icon matching for content bubbles ---------------- */
const BULLET_ICON_RULES = [
  { icon: Moon, words: ["sommeil", "dormir", "nuit", "sieste", "coucher", "sleep", "night", "nap", "bedtime"] },
  { icon: Apple, words: ["aliment", "manger", "nourriture", "repas", "nutrition", "diète", "diet", "food", "eat", "meal", "légume", "fruit", "protéine", "protein"] },
  { icon: Droplet, words: ["eau", "hydrat", "boire", "lait", "biberon", "water", "drink", "milk", "bottle", "allaitement", "breastfeed", "breast milk"] },
  { icon: Bath, words: ["bain", "laver", "toilette", "bath", "wash", "hygiène", "hygiene"] },
  { icon: ThermometerSun, words: ["température", "fièvre", "chaleur", "fever", "temperature", "heat"] },
  { icon: ShieldAlert, words: ["vaccin", "vaccine", "sécurité", "danger", "urgence", "risque", "safety", "risk", "emergency", "warning"] },
  { icon: Stethoscope, words: ["médecin", "docteur", "professionnel de la santé", "consult", "clinique", "doctor", "provider", "medical", "physician"] },
  { icon: Calendar, words: ["semaine", "mois", "calendrier", "date", "cycle", "week", "month", "calendar", "schedule"] },
  { icon: Baby, words: ["bébé", "nourrisson", "nouveau-né", "baby", "newborn", "infant"] },
  { icon: Users, words: ["partenaire", "famille", "entourage", "conjoint", "partner", "family", "spouse", "parents"] },
  { icon: BookOpen, words: ["livre", "lecture", "histoire", "book", "read", "story"] },
  { icon: Heart, words: ["amour", "affection", "lien", "bond", "love", "attachment"] },
  { icon: Sun, words: ["soleil", "extérieur", "activité physique", "exercice", "sun", "outdoor", "exercise", "activity"] },
  { icon: Sparkles, words: ["développement", "jalon", "milestone", "development", "growth", "croissance"] },
  { icon: MessageCircle, words: ["parler", "communiquer", "discuter", "langage", "parole", "talk", "language", "speech", "communicate"] },
  { icon: Globe, words: ["ethnicité", "population", "monde", "ethnic", "population", "world"] },
  { icon: CreditCard, words: ["coût", "prix", "budget", "cost", "price"] },
];

function pickBulletIcon(text, fallback) {
  if (!text) return fallback;
  const lower = text.toLowerCase();
  for (const rule of BULLET_ICON_RULES) {
    if (rule.words.some((w) => lower.includes(w))) return rule.icon;
  }
  return fallback;
}

function SubtabBody({ data, lang, accent = COLORS.sage, Icon, isMember = true, goTo }) {
  if (!data) return null;
  return (
    <Card style={{ borderTop: `4px solid ${accent}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, paddingBottom: 14, borderBottom: `2px solid ${accent}30` }}>
        {(data.titleIcon || Icon) && (
          <div style={{ width: 44, height: 44, borderRadius: 13, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {data.titleIcon ? <Illustration type={data.titleIcon} size={28} /> : <Icon size={22} color="#fff" />}
          </div>
        )}
        <h1 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 27, fontWeight: 700, color: COLORS.teal, lineHeight: 1.15 }}>
          {data.title[lang]}
        </h1>
      </div>
      {!isMember ? (
        <div>
          {data.illu && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ background: COLORS.cream, borderRadius: 14, padding: 10 }}>
                <Illustration type={data.illu} size={64} />
              </div>
            </div>
          )}
          <LockedContent lang={lang} goTo={goTo} />
        </div>
      ) : (
        <>
      {data.intro && (
        <div style={{
          display: "flex", gap: 16, alignItems: "center", marginBottom: 20, flexWrap: "wrap",
          background: `linear-gradient(135deg, ${accent}18 0%, ${accent}05 100%)`,
          border: `1px solid ${accent}35`, borderRadius: 16, padding: "16px 18px",
        }}>
          {data.heroImage ? (
            <img
              src={data.heroImage} alt="" width={72} height={72}
              style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 8px rgba(47,72,88,0.12)" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : data.illu && (
            <div style={{ background: COLORS.card, borderRadius: 14, padding: 8, flexShrink: 0, boxShadow: "0 2px 8px rgba(47,72,88,0.08)" }}>
              <Illustration type={data.illu} size={60} />
            </div>
          )}
          <p style={{ color: COLORS.text, lineHeight: 1.65, fontSize: 15.5, margin: 0, flex: 1, minWidth: 200 }}>{data.intro[lang]}</p>
        </div>
      )}
      {data.groups ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {data.groups.map((g, gi) => (
            <div key={gi} style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 16px rgba(47,72,88,0.08)" }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                padding: "18px 16px 14px",
                background: `linear-gradient(135deg, ${g.color} 0%, ${g.color}CC 100%)`,
              }}>
                <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: "50%", padding: 11, flexShrink: 0 }}>
                  <Illustration type={g.illu} size={48} />
                </div>
                <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 16.5, fontWeight: 700, color: "#fff", textAlign: "center" }}>{g.title[lang]}</span>
              </div>
              <div style={{ background: `${g.color}0F`, padding: "14px 18px" }}>
                {g.foodList && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                    {g.foodList.map((a, ai) => (
                      <div key={ai} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, background: `${g.color}1F`, marginBottom: 4,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Illustration type={a.icon} size={24} />
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.teal, lineHeight: 1.2 }}>{a.name[lang]}</span>
                      </div>
                    ))}
                  </div>
                )}
                {g.items[lang].map((it, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: i < g.items[lang].length - 1 ? 9 : 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: g.color, marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.55 }}>{it}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : data.list && (
        data.images ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.list[lang].map((item, i) => {
              const img = data.images[i];
              const sepIdx = item.indexOf(":");
              const lead = sepIdx > -1 ? item.slice(0, sepIdx) : item;
              const description = sepIdx > -1 ? item.slice(sepIdx + 1).trim() : "";
              const reverse = i % 2 === 1;
              const bubbleColors = [accent, COLORS.ochre, COLORS.pink, COLORS.blue, COLORS.sage];
              const bColor = bubbleColors[i % bubbleColors.length];
              const BulletIcon = pickBulletIcon(item, Icon);
              return (
                <div key={i} style={{
                  display: "flex", flexDirection: reverse ? "row-reverse" : "row",
                  alignItems: "center", gap: 20,
                  padding: "20px 6px",
                  borderBottom: i < data.list[lang].length - 1 ? `1px solid ${COLORS.line}` : "none",
                }}>
                  <div style={{ flexShrink: 0 }}>
                    {img ? (
                      <img
                        src={img} alt="" width={96} height={96}
                        style={{
                          width: 96, height: 96, borderRadius: 22, objectFit: "cover",
                          boxShadow: "0 8px 18px rgba(47,72,88,0.20)", border: "3px solid #fff",
                        }}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <div style={{
                        width: 96, height: 96, borderRadius: 22, background: `${bColor}1F`,
                        border: `2px solid ${bColor}55`, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {BulletIcon && <BulletIcon size={32} color={bColor} />}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 17.5, fontWeight: 700, color: COLORS.teal, marginBottom: 5, lineHeight: 1.3 }}>
                      {lead}
                    </div>
                    {description && (
                      <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.7 }}>{description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {data.list[lang].map((item, i) => {
            const bubbleColors = [accent, COLORS.ochre, COLORS.pink, COLORS.blue, COLORS.sage];
            const bColor = bubbleColors[i % bubbleColors.length];
            const BulletIcon = pickBulletIcon(item, Icon);
            return (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: `${bColor}14`, borderLeft: `3px solid ${bColor}`,
                borderRadius: 12, padding: "10px 12px",
              }}>
                {BulletIcon ? (
                  <div style={{
                    width: 22, height: 22, borderRadius: 7, background: bColor,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                  }}>
                    <BulletIcon size={12} color="#fff" />
                  </div>
                ) : (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: bColor, marginTop: 7, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.55 }}>{item}</span>
              </div>
            );
          })}
        </div>
        )
      )}
      {data.table && (
        <div style={{ overflowX: "auto", marginTop: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}>
            <thead>
              <tr>
                {data.table.headers[lang].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "8px 10px", borderBottom: `2px solid ${COLORS.sage}`, color: COLORS.teal, fontFamily: "Fraunces, Georgia, serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.table.rows[lang].map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 ? COLORS.cream : "transparent" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "8px 10px", borderBottom: `1px solid ${COLORS.line}`, color: COLORS.text }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.note && (
        <p style={{ marginTop: 14, padding: "10px 14px", background: COLORS.cream, borderRadius: 10, fontSize: 14, color: COLORS.muted, borderLeft: `3px solid ${COLORS.ochre}` }}>
          {data.note[lang]}
        </p>
      )}
      </>
      )}
    </Card>
  );
}

/* ---------------- SUBTAB NAVIGATION ---------------- */
function darkenHex(hex, amount = 0.22) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (n >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function SubtabPills({ subIds, activeSub, setActiveSub, dataObj, lang }) {
  const dark = darkenHex(COLORS.blue, 0.32);
  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22,
    }}>
      {subIds.map((id) => {
        const isActive = activeSub === id;
        return (
          <button
            key={id}
            onClick={() => setActiveSub(id)}
            style={{
              padding: "8px 16px",
              border: `2px solid ${dark}`,
              borderRadius: 999,
              background: isActive ? dark : "transparent",
              color: isActive ? "#fff" : dark,
              fontSize: 14,
              cursor: "pointer",
              fontWeight: isActive ? 800 : 700,
              textDecoration: isActive ? "none" : "underline",
              textUnderlineOffset: "3px",
              whiteSpace: "nowrap",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {dataObj[id].title[lang]}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- NURSING SCHEDULE CARD (breastfeeding, Pinterest-style) ---------------- */
const NURSING_SCHEDULE = [
  { key: "newborn", label: { fr: "Nouveau-né", en: "Newborn", es: "Recién nacido" }, color: COLORS.pink, bg: "#FDF0F3",
    times: ["7h", "10h", "13h", "16h", "18h", "21h", "0h", "4h"],
    minutes: 15, sessions: { fr: "7-10 tétées / jour", en: "7-10 feeds / day", es: "7-10 tomas / día" } },
  { key: "4-6", label: { fr: "4-6 mois", en: "4-6 months", es: "4-6 meses" }, color: COLORS.sage, bg: "#F0F5EC",
    times: ["7h", "11h", "15h", "19h", "23h", "3h"],
    minutes: 20, sessions: { fr: "5-6 tétées / jour", en: "5-6 feeds / day", es: "5-6 tomas / día" } },
  { key: "6plus", label: { fr: "6+ mois", en: "6+ months", es: "6+ meses" }, color: COLORS.ochre, bg: "#FBF3E4",
    times: ["7h", "12h", "17h", "22h"],
    minutes: 30, sessions: { fr: "3-4 tétées / jour", en: "3-4 feeds / day", es: "3-4 tomas / día" } },
];

function NursingScheduleCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Horaire d'allaitement (ou tire-lait) type", schedule: "Horaire suggéré", perSession: "Min. / tétée", sessions: "Tétées / jour", note: "Chaque bébé est différent — ces repères sont généraux; ajustez selon les signaux de faim de votre bébé." }
    : lang === "es"
    ? { title: "Horario típico de lactancia (o extracción)", schedule: "Horario sugerido", perSession: "Min. / toma", sessions: "Tomas / día", note: "Cada bebé es diferente — estas son pautas generales; ajusta según las señales de hambre de tu bebé." }
    : { title: "Typical nursing (or pumping) schedule", schedule: "Suggested schedule", perSession: "Min / feed", sessions: "Feeds / day", note: "Every baby is different — these are general guidelines; follow your baby's hunger cues." };
  const maxRows = Math.max(...NURSING_SCHEDULE.map((c) => c.times.length));
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.pink}`, background: "#fff" }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 380 }}>
          <thead>
            <tr>
              <th style={{ padding: "6px 8px" }} />
              {NURSING_SCHEDULE.map((col) => (
                <th key={col.key} style={{ padding: "0 6px 8px", textAlign: "center" }}>
                  <span style={{
                    display: "inline-block", background: col.color, color: "#fff", fontSize: 11,
                    fontWeight: 800, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap",
                  }}>{col.label[lang]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={NURSING_SCHEDULE.length + 1} style={{ padding: "2px 8px 4px", fontSize: 9.5, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase" }}>{L.schedule}</td>
            </tr>
            {Array.from({ length: maxRows }).map((_, r) => (
              <tr key={r}>
                <td style={{ padding: "4px 8px", fontSize: 9, color: COLORS.muted, textAlign: "right" }}>{r + 1}</td>
                {NURSING_SCHEDULE.map((col) => (
                  <td key={col.key} style={{
                    padding: "4px 8px", textAlign: "center", fontSize: 12.5, fontWeight: 600, color: COLORS.text,
                    background: r % 2 ? col.bg : "#fff", borderBottom: r === maxRows - 1 ? `2px solid ${COLORS.line}` : "1px dashed rgba(47,72,88,0.1)",
                  }}>
                    {col.times[r] || ""}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td style={{ padding: "8px 8px 2px", fontSize: 10, color: COLORS.muted, fontWeight: 700 }}>{L.perSession}</td>
              {NURSING_SCHEDULE.map((col) => (
                <td key={col.key} style={{ padding: "8px 8px 2px", textAlign: "center" }}>
                  <span style={{
                    display: "inline-flex", width: 34, height: 34, borderRadius: "50%", border: `3px solid ${col.color}`,
                    alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: col.color,
                  }}>{col.minutes}</span>
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: "6px 8px", fontSize: 10, color: COLORS.muted, fontWeight: 700 }}>{L.sessions}</td>
              {NURSING_SCHEDULE.map((col) => (
                <td key={col.key} style={{ padding: "6px 8px", textAlign: "center" }}>
                  <span style={{
                    display: "inline-block", background: col.color, color: "#fff", fontSize: 10.5, fontWeight: 700,
                    padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap",
                  }}>{col.sessions[lang]}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 14, marginBottom: 0, textAlign: "center", fontStyle: "italic" }}>{L.note}</p>
    </Card>
  );
}

/* ---------------- POSTPARTUM EXERCISE TABLES (3 stages) ---------------- */
const EXERCISE_TIERS = [
  {
    key: "beginner",
    color: COLORS.sage,
    bg: "#F0F5EC",
    title: { fr: "Étape 1 — Débuter en douceur", en: "Stage 1 — Gentle start" },
    when: { fr: "Dès le feu vert médical (6-8 semaines) — durée suggérée : 3 à 4 semaines", en: "As soon as you're cleared (6-8 weeks) — suggested duration: 3 to 4 weeks" },
    exercises: [
      {
        icon: "exerciseBreathing", tag: { fr: "Respiration", en: "Breathing" },
        name: { fr: "Respiration diaphragmatique", en: "Diaphragmatic breathing" },
        desc: { fr: "Assise ou couchée, inspirez par le nez en gonflant le ventre, expirez lentement par la bouche en contractant légèrement le bas-ventre.", en: "Sitting or lying down, inhale through the nose letting the belly rise, exhale slowly through the mouth while gently drawing in the lower belly." },
        reps: { fr: "5-10 min, 1-2 fois/jour", en: "5-10 min, 1-2x/day" },
      },
      {
        icon: "exerciseKegel", tag: { fr: "Périnée", en: "Pelvic floor" },
        name: { fr: "Contractions du plancher pelvien (Kegel)", en: "Pelvic floor contractions (Kegel)" },
        desc: { fr: "Contractez les muscles du périnée comme pour retenir l'envie d'uriner, tenez 3-5 secondes, puis relâchez complètement.", en: "Contract the pelvic floor as if stopping the flow of urine, hold 3-5 seconds, then fully release." },
        reps: { fr: "3 séries de 10, 2-3 fois/jour", en: "3 sets of 10, 2-3x/day" },
      },
      {
        icon: "exercisePelvicTilt", tag: { fr: "Diastase", en: "Diastasis" },
        name: { fr: "Bascule du bassin", en: "Pelvic tilt" },
        desc: { fr: "Couchée sur le dos, genoux pliés, aplatissez doucement le bas du dos contre le sol en contractant le ventre, puis relâchez.", en: "Lying on your back, knees bent, gently flatten your lower back into the floor by engaging the abdomen, then release." },
        reps: { fr: "10-15 répétitions, 1 fois/jour", en: "10-15 reps, once a day" },
      },
      {
        icon: "exerciseWalk", tag: { fr: "Cardio léger", en: "Light cardio" },
        name: { fr: "Marche légère", en: "Gentle walking" },
        desc: { fr: "Commencez par de courtes marches à rythme confortable, en augmentant progressivement la durée selon votre énergie.", en: "Start with short walks at a comfortable pace, gradually increasing duration as your energy allows." },
        reps: { fr: "10-20 min/jour, selon tolérance", en: "10-20 min/day, as tolerated" },
      },
    ],
  },
  {
    key: "intermediate",
    color: COLORS.ochre,
    bg: "#FBF3E4",
    title: { fr: "Étape 2 — Intermédiaire", en: "Stage 2 — Intermediate" },
    when: { fr: "Après 3-4 semaines à l'étape 1, sans douleur ni fuite — durée suggérée : 4 à 6 semaines", en: "After 3-4 weeks at stage 1, with no pain or leakage — suggested duration: 4 to 6 weeks" },
    exercises: [
      {
        icon: "exerciseBridge", tag: { fr: "Diastase", en: "Diastasis" },
        name: { fr: "Pont fessier (bridge)", en: "Glute bridge" },
        desc: { fr: "Couchée sur le dos, genoux pliés, soulevez les hanches en contractant fessiers et plancher pelvien, redescendez lentement.", en: "Lying on your back, knees bent, lift the hips while engaging the glutes and pelvic floor, lower slowly." },
        reps: { fr: "2-3 séries de 10-12", en: "2-3 sets of 10-12" },
      },
      {
        icon: "exerciseCatCow", tag: { fr: "Mobilité", en: "Mobility" },
        name: { fr: "Chat-vache (cat-cow)", en: "Cat-cow" },
        desc: { fr: "À quatre pattes, alternez le dos rond (expiration) et le dos creux (inspiration) avec des mouvements lents et contrôlés.", en: "On hands and knees, alternate rounding the spine (exhale) and arching it (inhale) with slow, controlled movement." },
        reps: { fr: "10 cycles, 1 fois/jour", en: "10 cycles, once a day" },
      },
      {
        icon: "exerciseDeadBug", tag: { fr: "Diastase", en: "Diastasis" },
        name: { fr: "Dead bug modifié", en: "Modified dead bug" },
        desc: { fr: "Couchée sur le dos, genoux à 90°, descendez lentement un pied vers le sol en gardant le bas du dos stable, puis alternez.", en: "Lying on your back, knees at 90°, slowly lower one foot toward the floor while keeping the lower back stable, then alternate." },
        reps: { fr: "2-3 séries de 8 par côté", en: "2-3 sets of 8 per side" },
      },
      {
        icon: "exerciseKegel", tag: { fr: "Périnée", en: "Pelvic floor" },
        name: { fr: "Kegel avec tenue prolongée", en: "Kegel with longer hold" },
        desc: { fr: "Même mouvement qu'à l'étape 1, en allongeant progressivement la tenue de la contraction jusqu'à 8-10 secondes.", en: "Same movement as stage 1, gradually extending the hold up to 8-10 seconds." },
        reps: { fr: "3 séries de 10, 2-3 fois/jour", en: "3 sets of 10, 2-3x/day" },
      },
      {
        icon: "exerciseWalk", tag: { fr: "Cardio", en: "Cardio" },
        name: { fr: "Marche plus soutenue", en: "Brisker walking" },
        desc: { fr: "Augmentez la durée et le rythme des marches, en ajoutant progressivement de légères pentes si toléré.", en: "Increase the duration and pace of your walks, gradually adding light inclines if well tolerated." },
        reps: { fr: "20-30 min, 4-5 fois/semaine", en: "20-30 min, 4-5x/week" },
      },
    ],
  },
  {
    key: "advanced",
    color: COLORS.blue,
    bg: "#EAF2F8",
    title: { fr: "Étape 3 — Avancé", en: "Stage 3 — Advanced" },
    when: { fr: "Diastase fermé (idéalement confirmé par un physio) et plancher pelvien fonctionnel, sans douleur ni fuite", en: "Diastasis closed (ideally confirmed by a physio) and a functional pelvic floor, with no pain or leakage" },
    exercises: [
      {
        icon: "exercisePlank", tag: { fr: "Gainage", en: "Core" },
        name: { fr: "Planche complète", en: "Full plank" },
        desc: { fr: "Sur les avant-bras et les orteils, corps aligné de la tête aux talons, abdomen et plancher pelvien engagés.", en: "On forearms and toes, body aligned from head to heels, abdomen and pelvic floor engaged." },
        reps: { fr: "3 séries de 20-30 sec", en: "3 sets of 20-30 sec" },
      },
      {
        icon: "exerciseSquat", tag: { fr: "Force", en: "Strength" },
        name: { fr: "Squats avec poids légers", en: "Squats with light weights" },
        desc: { fr: "Pieds largeur d'épaules, descendez comme pour vous asseoir en gardant le dos droit, un poids léger dans chaque main si désiré.", en: "Feet shoulder-width apart, lower as if sitting into a chair while keeping the back straight, holding a light weight in each hand if desired." },
        reps: { fr: "3 séries de 10-12", en: "3 sets of 10-12" },
      },
      {
        icon: "exerciseLunge", tag: { fr: "Force", en: "Strength" },
        name: { fr: "Fentes (lunges)", en: "Lunges" },
        desc: { fr: "Faites un grand pas vers l'avant, pliez les deux genoux à 90°, revenez à la position de départ, puis alternez de jambe.", en: "Step forward, bend both knees to 90°, return to start, then alternate legs." },
        reps: { fr: "3 séries de 10 par jambe", en: "3 sets of 10 per leg" },
      },
      {
        icon: "exerciseWeights", tag: { fr: "Force", en: "Strength" },
        name: { fr: "Retour à l'entraînement en résistance", en: "Return to resistance training" },
        desc: { fr: "Reprenez progressivement votre programme d'entraînement pré-grossesse (poids, appareils), en augmentant charges et intensité graduellement.", en: "Gradually resume your pre-pregnancy training program (weights, machines), progressively increasing load and intensity." },
        reps: { fr: "2-4 fois/semaine, selon votre plan", en: "2-4x/week, per your program" },
      },
    ],
  },
];

function PostpartumExerciseTables({ lang }) {
  const L = lang === "fr"
    ? {
        title: "Programme de remise en forme postnatale",
        subtitle: "3 étapes progressives, à commencer seulement après le feu vert de votre médecin ou sage-femme.",
        refs: "Repères inspirés des directives postnatales de la Société canadienne de physiologie de l'exercice et de l'ACOG. Information générale — ne remplace pas un suivi médical ou en physiothérapie périnéale et pelvienne personnalisé.",
      }
    : lang === "es"
    ? {
        title: "Programa de recuperación física posparto",
        subtitle: "3 etapas progresivas, a comenzar solo con la autorización de tu médico o partera.",
        refs: "Pautas inspiradas en las directrices posnatales de la Sociedad Canadiense de Fisiología del Ejercicio y del ACOG. Información general — no reemplaza un seguimiento médico o de fisioterapia perineal y pélvica personalizado.",
      }
    : {
        title: "Postnatal fitness program",
        subtitle: "3 progressive stages, to start only after your doctor's or midwife's clearance.",
        refs: "Benchmarks inspired by the postnatal guidelines of the Canadian Society for Exercise Physiology and ACOG. General information — does not replace personalized medical or pelvic floor physiotherapy follow-up.",
      };

  return (
    <div style={{ marginTop: 8 }}>
      <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: COLORS.teal, marginBottom: 4 }}>{L.title}</h2>
      <p style={{ color: COLORS.muted, fontSize: 13.5, marginBottom: 18 }}>{L.subtitle}</p>

      {EXERCISE_TIERS.map((tier) => (
        <Card key={tier.key} style={{ marginBottom: 18, border: "none", background: "#fff", borderTop: `5px solid ${tier.color}` }}>
          <h3 style={{ margin: "0 0 2px", fontFamily: "Fraunces, Georgia, serif", fontSize: 19, fontWeight: 700, color: tier.color }}>{tier.title[lang]}</h3>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, fontWeight: 600, color: COLORS.muted }}>{tier.when[lang]}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tier.exercises.map((ex, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, alignItems: "flex-start", background: tier.bg,
                borderRadius: 14, padding: "12px 14px",
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, background: "#fff", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(47,72,88,0.10)",
                }}>
                  <Illustration type={ex.icon} size={30} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{ex.name[lang]}</span>
                    <span style={{
                      background: tier.color, color: "#fff", fontSize: 9.5, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.02em",
                    }}>{ex.tag[lang]}</span>
                  </div>
                  <p style={{ margin: "0 0 5px", fontSize: 12.5, color: COLORS.text, lineHeight: 1.5 }}>{ex.desc[lang]}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: tier.color, fontWeight: 700 }}>{ex.reps[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#EAF2F8", borderRadius: 12, padding: "12px 14px" }}>
        <Stethoscope size={16} color={COLORS.blue} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11.5, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>{L.refs}</p>
      </div>
    </div>
  );
}

/* ---------------- MILK CHART CARD (bottle feeding, Pinterest-style) ---------------- */
const MILK_CHART = [
  { age: { fr: "0-1 mois", en: "0-1 month", es: "0-1 mes" }, perFeeding: { fr: "60-90 ml", en: "2-3 oz", es: "60-90 ml" },
    frequency: { fr: "Aux 2-3 h — 8-12 boires/jour", en: "Every 2-3 h — 8-12 feeds/day", es: "Cada 2-3 h — 8-12 tomas/día" },
    total: { fr: "≈ 700 ml", en: "≈ 24 oz", es: "≈ 700 ml" } },
  { age: { fr: "1-3 mois", en: "1-3 months", es: "1-3 meses" }, perFeeding: { fr: "90-120 ml", en: "3-4 oz", es: "90-120 ml" },
    frequency: { fr: "5-8 boires/jour", en: "5-8 feeds/day", es: "5-8 tomas/día" },
    total: { fr: "700-950 ml", en: "24-32 oz", es: "700-950 ml" } },
  { age: { fr: "3-6 mois", en: "3-6 months", es: "3-6 meses" }, perFeeding: { fr: "120-180 ml", en: "4-6 oz", es: "120-180 ml" },
    note: { fr: "Bébé dort plus longtemps la nuit; le nombre de boires diminue.", en: "As baby sleeps longer at night, feedings decrease.", es: "El bebé duerme más tiempo por la noche; el número de tomas disminuye." },
    frequency: { fr: "4-5 boires/jour", en: "4-5 feeds/day", es: "4-5 tomas/día" },
    total: { fr: "700-950 ml", en: "24-32 oz", es: "700-950 ml" } },
  { age: { fr: "6-9 mois", en: "6-9 months", es: "6-9 meses" }, perFeeding: { fr: "180-240 ml", en: "6-8 oz", es: "180-240 ml" },
    note: { fr: "Bon moment pour débuter les aliments solides.", en: "Good time to start on solids.", es: "Buen momento para comenzar los alimentos sólidos." },
    frequency: { fr: "≈ 6 boires/jour", en: "≈ 6 feeds/day", es: "≈ 6 tomas/día" },
    total: { fr: "≈ 950 ml", en: "≈ 32 oz", es: "≈ 950 ml" } },
  { age: { fr: "9-12 mois", en: "9-12 months", es: "9-12 meses" }, perFeeding: { fr: "210-240 ml", en: "7-8 oz", es: "210-240 ml" },
    note: { fr: "Bébé boit parfois un peu moins, avec plus de solides au menu.", en: "Baby sometimes drinks a little less as more solids are added.", es: "El bebé a veces bebe un poco menos, con más sólidos en el menú." },
    frequency: { fr: "3-5 boires/jour", en: "3-5 feeds/day", es: "3-5 tomas/día" },
    total: { fr: "—", en: "—", es: "—" } },
];

function MilkChartCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Repères pour le biberon, selon l'âge", age: "Âge", perFeeding: "Par boire", frequency: "Fréquence", total: "Total / jour", note: "Chaque bébé est différent — ces quantités sont des repères généraux, à ajuster avec un professionnel de la santé." }
    : lang === "es"
    ? { title: "Guía de biberón, según la edad", age: "Edad", perFeeding: "Por toma", frequency: "Frecuencia", total: "Total / día", note: "Cada bebé es diferente — estas cantidades son pautas generales, a ajustar con un profesional de la salud." }
    : { title: "Bottle-feeding guide, by age", age: "Age", perFeeding: "Per feeding", frequency: "Frequency", total: "Daily total", note: "Every baby is different — these amounts are general guidelines; adjust with a healthcare provider." };
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.blue}`, background: "#fff" }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MILK_CHART.map((row, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, background: i % 2 ? "#EAF2F8" : "#F6FAFC",
            borderRadius: 14, padding: "10px 14px", flexWrap: "wrap",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: COLORS.blue, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Illustration type="babyBottle" size={18} />
            </div>
            <div style={{ minWidth: 78 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: COLORS.teal }}>{row.age[lang]}</div>
              {row.note && <div style={{ fontSize: 9.5, color: COLORS.muted, marginTop: 1 }}>{row.note[lang]}</div>}
            </div>
            <div style={{ flex: 1, display: "flex", gap: 14, flexWrap: "wrap", minWidth: 180 }}>
              <div>
                <div style={{ fontSize: 8.5, color: COLORS.muted, textTransform: "uppercase", fontWeight: 700 }}>{L.perFeeding}</div>
                <div style={{ fontSize: 12, color: COLORS.text, fontWeight: 700 }}>{row.perFeeding[lang]}</div>
              </div>
              <div>
                <div style={{ fontSize: 8.5, color: COLORS.muted, textTransform: "uppercase", fontWeight: 700 }}>{L.frequency}</div>
                <div style={{ fontSize: 12, color: COLORS.text, fontWeight: 700 }}>{row.frequency[lang]}</div>
              </div>
              <div>
                <div style={{ fontSize: 8.5, color: COLORS.muted, textTransform: "uppercase", fontWeight: 700 }}>{L.total}</div>
                <div style={{ fontSize: 12, color: COLORS.blue, fontWeight: 800 }}>{row.total[lang]}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 14, marginBottom: 0, textAlign: "center", fontStyle: "italic" }}>{L.note}</p>
    </Card>
  );
}

/* ---------------- SLEEP MILESTONES CARD (Pinterest-style grid) ---------------- */
const SLEEP_MILESTONES = [
  {
    range: { fr: "0-3 mois", en: "0-3 months" }, color: COLORS.sage, bg: "#F0F5EC",
    items: {
      fr: [
        "Montre des signes de sommeil réguliers (6-8 semaines)",
        "Dort par tranches de 4 à 6 h (dès 2 mois)",
        "Sort de la période de pleurs intenses (8 semaines)",
        "Peut passer à la gigoteuse (3 mois)",
      ],
      en: [
        "Starts showing regular sleepy cues (6-8 weeks)",
        "Starts sleeping 4-6 hour stretches (2 months+)",
        "Moves out of peak fussiness period (8 weeks)",
        "Can transition to a sleep sack (3 months)",
      ],
    },
  },
  {
    range: { fr: "3-6 mois", en: "3-6 months" }, color: COLORS.teal, bg: "#E4EAEE",
    items: {
      fr: [
        "Abandonne la 4e sieste (4-5 mois)",
        "Reste éveillé plus longtemps le jour (2-2,5 h)",
        "Peut dormir jusqu'à 8-9 h la nuit sans boire",
        "Les cycles de sommeil commencent à se structurer (1,5-2 h)",
        "L'heure du coucher devient plus tôt",
      ],
      en: [
        "Drops the 4th nap (4-5 months)",
        "Stays awake longer during the day (2-2.5 hours)",
        "Can sleep up to 8-9 hours at night without feeding",
        "Naps/sleep cycles start consolidating (1.5-2 hours)",
        "Bedtime becomes earlier",
      ],
    },
  },
  {
    range: { fr: "6-9 mois", en: "6-9 months" }, color: "#8F8676", bg: "#F1EEE7",
    items: {
      fr: [
        "Abandonne la 3e sieste (7-8 mois)",
        "Abandonne le boire de nuit",
        "Les périodes d'éveil s'allongent (2,5-3,5 h après la 1re sieste)",
        "S'endort seul pour les siestes et le coucher",
        "Commence à dormir toute la nuit régulièrement",
      ],
      en: [
        "Drops the 3rd nap (7-8 months)",
        "Drops the night feed",
        "Awake windows stretch (2.5-3.5 hours after the 1st nap)",
        "Falls asleep independently for naps and bedtime",
        "Starts regularly sleeping through the night",
      ],
    },
  },
  {
    range: { fr: "9-12 mois", en: "9-12 months" }, color: COLORS.blue, bg: "#EAF2F8",
    items: {
      fr: [
        "La période d'éveil du matin s'allonge (2-2,5 h)",
        "Le sommeil suit un horaire plutôt que des périodes d'éveil seulement",
        "L'introduction d'un doudou est sécuritaire (12 mois)",
      ],
      en: [
        "Morning awake window lengthens (2-2.5 hours)",
        "Sleep follows a schedule rather than awake windows only",
        "Introducing a lovey is safe (12 months)",
      ],
    },
  },
  {
    range: { fr: "12-18 mois", en: "12-18 months" }, color: COLORS.pink, bg: "#FDF0F3",
    items: {
      fr: [
        "Passe dans sa propre chambre (12 mois, recommandation AAP)",
        "Abandonne la 2e sieste (14-16 mois)",
        "La période d'éveil du matin s'allonge (4-5 h)",
        "Le temps de sieste augmente (jusqu'à 3 h pour une sieste)",
      ],
      en: [
        "Moves to own room (12 months, AAP guidelines)",
        "Drops the 2nd nap (14-16 months)",
        "Morning awake window lengthens (4-5 hours)",
        "Naptime increases (up to 3 hours for one nap)",
      ],
    },
  },
  {
    range: { fr: "18 mois +", en: "18 months+" }, color: COLORS.ochre, bg: "#FBF3E4",
    items: {
      fr: [
        "Transition du lit à barreaux vers un lit d'enfant (24-36 mois)",
        "L'enfant donne des signaux verbaux de sommeil",
        "L'enfant abandonne la sieste (3-4 ans)",
        "Retire la suce comme « prop » de sommeil",
      ],
      en: [
        "Crib-to-bed transition happens (24-36 months)",
        "Child gives verbal sleepy cues",
        "Child drops the nap (3-4 years old)",
        "Removes the pacifier as a sleep prop",
      ],
    },
  },
];

function SleepMilestonesCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Jalons du sommeil, et quand ils arrivent", note: "Ces jalons sont basés sur des moyennes et des recommandations générales, mais chaque bébé est différent et progresse à son propre rythme." }
    : lang === "es"
    ? { title: "Hitos del sueño, y cuándo ocurren", note: "Estos hitos se basan en promedios y recomendaciones generales, pero cada bebé es diferente y progresa a su propio ritmo." }
    : { title: "Sleep milestones, and when they happen", note: "These milestones are based on averages and general recommendations, but every baby is different and will progress at their own pace." };
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.teal}`, background: "#fff" }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {SLEEP_MILESTONES.map((m, i) => (
          <div key={i} style={{ background: m.bg, borderRadius: 14, padding: "12px 13px" }}>
            <div style={{
              display: "inline-block", background: m.color, color: "#fff", fontSize: 11.5, fontWeight: 800,
              padding: "4px 12px", borderRadius: 999, marginBottom: 10,
            }}>{m.range[lang]}</div>
            <ul style={{ margin: 0, padding: 0 }}>
              {m.items[lang].map((it, j) => (
                <li key={j} style={{ display: "flex", gap: 6, alignItems: "flex-start", listStyle: "none", marginBottom: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.4 }}>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 14, marginBottom: 0, textAlign: "center", fontStyle: "italic" }}>{L.note}</p>
    </Card>
  );
}

function GenericSection({ dataObj, lang, sectionKey, isMember, goTo, children: kids, session }) {
  const ids = Object.keys(dataObj);
  const [activeSub, setActiveSub] = useState(ids[0]);
  const meta = SECTION_META[sectionKey];
  const milestoneRows = sectionKey === "dev01"
    ? (DEV_MILESTONE_MAP[activeSub]
        ? DEV_MILESTONE_MAP[activeSub].map((i) => DEV_MILESTONES[i])
        : DEV15_MILESTONE_MAP[activeSub]
          ? DEV15_MILESTONE_MAP[activeSub].map((i) => DEV15_MILESTONES[i])
          : null)
    : null;
  return (
    <div>
      <SectionHero sectionKey={sectionKey} lang={lang} />
      <ToyDivider />
      {sectionKey === "dev01" && <MilestoneChartCard lang={lang} />}
      {isMember && sectionKey === "dev01" && <VaccineCalendar lang={lang} />}
      {isMember && sectionKey === "dev01" && <GrowthTracker lang={lang} children={kids} goTo={goTo} session={session} />}
      <SubtabPills subIds={ids} activeSub={activeSub} setActiveSub={setActiveSub} dataObj={dataObj} lang={lang} accent={meta?.color} />
      {milestoneRows && <DevMilestonesTable lang={lang} rows={milestoneRows} />}
      <SubtabBody data={dataObj[activeSub]} lang={lang} accent={meta?.color} Icon={meta?.icon} isMember={isMember} goTo={goTo} />
      <ToyDivider />
      {isMember && sectionKey === "alimentation" && activeSub === "intro" && <RecipesByAgeCard lang={lang} />}
      {isMember && sectionKey === "alimentation" && activeSub === "menu612" && (
        <MealScheduleCard lang={lang} rows={MENU612_SCHEDULE} color={COLORS.blue} colHeaders={lang === "fr" ? ["6-8 mois", "9-12 mois"] : lang === "es" ? ["6-8 meses", "9-12 meses"] : ["6-8 months", "9-12 months"]} title={lang === "fr" ? "Horaire d'une journée type — 6 à 12 mois" : lang === "es" ? "Horario de un día tipo — 6 a 12 meses" : "Sample day schedule — 6 to 12 months"} />
      )}
      {isMember && sectionKey === "alimentation" && activeSub === "menu15" && (
        <MealScheduleCard lang={lang} rows={MENU15_SCHEDULE} color={COLORS.pink} colHeaders={lang === "fr" ? ["1-3 ans", "3-5 ans"] : lang === "es" ? ["1-3 años", "3-5 años"] : ["1-3 years", "3-5 years"]} title={lang === "fr" ? "Horaire d'une journée type — 1 à 5 ans" : lang === "es" ? "Horario de un día tipo — 1 a 5 años" : "Sample day schedule — 1 to 5 years"} />
      )}
      {isMember && sectionKey === "postpartum" && activeSub === "allaitement" && <NursingScheduleCard lang={lang} />}
      {isMember && sectionKey === "postpartum" && activeSub === "allaitement" && <FeedingTracker lang={lang} />}
      {isMember && sectionKey === "postpartum" && activeSub === "allaitement" && <DiaperTracker lang={lang} />}
      {isMember && sectionKey === "postpartum" && activeSub === "biberon" && <MilkChartCard lang={lang} />}
      {isMember && sectionKey === "postpartum" && activeSub === "sommeilNaissance" && <SleepMilestonesCard lang={lang} />}
      {isMember && sectionKey === "postpartum" && activeSub === "sommeilNaissance" && <SleepTracker lang={lang} />}
      {isMember && sectionKey === "postpartum" && activeSub === "allaitement" && <BreastmilkTipsCard lang={lang} />}
      {isMember && sectionKey === "postpartum" && activeSub === "exercicesPostpartum" && <PostpartumExerciseTables lang={lang} />}
      {isMember && sectionKey === "postpartum" && activeSub === "emotions" && <MoodCheckIn lang={lang} />}
      {isMember && sectionKey === "soins" && activeSub === "habillement" && <TempClothingTable lang={lang} />}
      {isMember && sectionKey === "soins" && activeSub === "bain" && <BathFrequencyTable lang={lang} />}
    </div>
  );
}

/* ---------------- OVULATION CALCULATOR ---------------- */
function OvulationCalculator({ lang }) {
  const [lmp, setLmp] = useState("");
  const [cycleLength, setCycleLength] = useState(28);

  const result = useMemo(() => {
    if (!lmp) return null;
    const start = new Date(lmp + "T00:00:00");
    if (isNaN(start.getTime())) return null;
    const ovulationDay = new Date(start);
    ovulationDay.setDate(start.getDate() + (Number(cycleLength) - 14));
    const fertileStart = new Date(ovulationDay);
    fertileStart.setDate(ovulationDay.getDate() - 5);
    const fertileEnd = new Date(ovulationDay);
    fertileEnd.setDate(ovulationDay.getDate() + 1);
    const nextPeriod = new Date(start);
    nextPeriod.setDate(start.getDate() + Number(cycleLength));
    return { ovulationDay, fertileStart, fertileEnd, nextPeriod };
  }, [lmp, cycleLength]);

  const fmt = (d) => d.toLocaleDateString(lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA", { day: "numeric", month: "long", year: "numeric" });

  const L = lang === "fr"
    ? { title: "Calculateur d'ovulation", lmpLabel: "1er jour de vos dernières règles", cycleLabel: "Longueur habituelle du cycle (jours)", ov: "Jour d'ovulation estimé", fw: "Fenêtre fertile", np: "Prochaines règles prévues", disclaimer: "Estimation basée sur un cycle régulier. Les cycles irréguliers rendent cette estimation moins précise." }
    : lang === "es"
    ? { title: "Calculadora de ovulación", lmpLabel: "1er día de tu última menstruación", cycleLabel: "Duración habitual del ciclo (días)", ov: "Día de ovulación estimado", fw: "Ventana fértil", np: "Próxima menstruación esperada", disclaimer: "Estimación basada en un ciclo regular. Los ciclos irregulares hacen esta estimación menos precisa." }
    : { title: "Ovulation calculator", lmpLabel: "First day of your last period", cycleLabel: "Usual cycle length (days)", ov: "Estimated ovulation day", fw: "Fertile window", np: "Next period expected", disclaimer: "Estimate based on a regular cycle. Irregular cycles make this estimate less precise." };

  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.blue}`, background: "#EEF5FA" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Calculator size={18} color="#fff" />
        </div>
        <h3 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 20, color: COLORS.teal }}>{L.title}</h3>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: COLORS.muted, fontWeight: 600 }}>
          {L.lmpLabel}
          <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: COLORS.muted, fontWeight: 600 }}>
          {L.cycleLabel}
          <input type="number" min={21} max={35} value={cycleLength} onChange={(e) => setCycleLength(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, width: 100 }} />
        </label>
      </div>
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div style={{ background: "linear-gradient(135deg, #D8E9F2 0%, #C2DCE9 100%)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#3D6E8F", fontWeight: 700, textTransform: "uppercase" }}>{L.ov}</div>
            <div style={{ fontSize: 17, color: COLORS.teal, fontWeight: 800, marginTop: 4 }}>{fmt(result.ovulationDay)}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #D8E9F2 0%, #C2DCE9 100%)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#3D6E8F", fontWeight: 700, textTransform: "uppercase" }}>{L.fw}</div>
            <div style={{ fontSize: 15, color: COLORS.teal, fontWeight: 800, marginTop: 4 }}>{fmt(result.fertileStart)} – {fmt(result.fertileEnd)}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #D8E9F2 0%, #C2DCE9 100%)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#3D6E8F", fontWeight: 700, textTransform: "uppercase" }}>{L.np}</div>
            <div style={{ fontSize: 17, color: COLORS.teal, fontWeight: 800, marginTop: 4 }}>{fmt(result.nextPeriod)}</div>
          </div>
        </div>
      )}
      <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 14, marginBottom: 0 }}>{L.disclaimer}</p>
    </Card>
  );
}

/* ---------------- CYCLE TRACKER (personal journal) ---------------- */
function CycleTracker({ lang }) {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState("");

  const L = lang === "fr"
    ? {
        title: "Mon suivi de cycle", subtitle: "Notez le premier jour de vos règles chaque mois — l'application calcule la durée de chaque cycle pour vous.",
        dateLabel: "Premier jour des règles", add: "Ajouter",
        empty: "Aucune date pour l'instant — ajoutez le premier jour de vos dernières règles ci-dessus.",
        colDate: "Date", colLength: "Durée du cycle", firstCycle: "Premier cycle enregistré",
        days: (n) => `${n} jour${n > 1 ? "s" : ""}`,
        remove: "Retirer", demo: "Démonstration : ces données restent seulement dans cette session et ne sont pas sauvegardées — elles seront perdues si vous fermez ou rechargez l'application.",
      }
    : lang === "es"
    ? {
        title: "Mi seguimiento de ciclo", subtitle: "Registra el primer día de tu menstruación cada mes — la aplicación calcula la duración de cada ciclo por ti.",
        dateLabel: "Primer día de la menstruación", add: "Agregar",
        empty: "Aún no hay fechas — agrega el primer día de tu última menstruación arriba.",
        colDate: "Fecha", colLength: "Duración del ciclo", firstCycle: "Primer ciclo registrado",
        days: (n) => `${n} día${n > 1 ? "s" : ""}`,
        remove: "Quitar", demo: "Demostración: estos datos se mantienen solo en esta sesión y no se guardan — se perderán si cierras o recargas la aplicación.",
      }
    : {
        title: "My cycle tracker", subtitle: "Log the first day of your period each month — the app calculates each cycle's length for you.",
        dateLabel: "First day of period", add: "Add",
        empty: "No dates yet — add the first day of your last period above.",
        colDate: "Date", colLength: "Cycle length", firstCycle: "First cycle logged",
        days: (n) => `${n} day${n > 1 ? "s" : ""}`,
        remove: "Remove", demo: "Demo only: this data stays within this session and isn't saved — it will be lost if you close or reload the app.",
      };

  const inputStyle = { padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5, fontFamily: "inherit" };

  const addEntry = () => {
    if (!date || entries.some((en) => en.date === date)) return;
    setEntries([...entries, { date }].sort((a, b) => a.date.localeCompare(b.date)));
    setDate("");
  };

  const removeEntry = (d) => setEntries(entries.filter((en) => en.date !== d));

  const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long", year: "numeric" });
  const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

  const rows = [...entries].reverse().map((en, i, arr) => {
    const prev = arr[i + 1];
    const length = prev ? dayDiff(prev.date, en.date) : null;
    return { ...en, length };
  });

  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.sage}`, background: "#EAF1E8" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.sage, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BookOpen size={17} color="#fff" />
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 14px" }}>{L.subtitle}</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: COLORS.muted, fontWeight: 600 }}>
          {L.dateLabel}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addEntry(); }}
            style={inputStyle}
          />
        </label>
        <button type="button" onClick={addEntry} style={{
          background: COLORS.sage, color: "#fff", border: "none", padding: "9px 18px",
          borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>{L.add}</button>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.muted, fontStyle: "italic" }}>{L.empty}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11.5, color: COLORS.muted, textTransform: "uppercase" }}>{L.colDate}</th>
                <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11.5, color: COLORS.muted, textTransform: "uppercase" }}>{L.colLength}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.date} style={{ background: i % 2 ? COLORS.cream : "transparent" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: COLORS.teal }}>{fmt(row.date)}</td>
                  <td style={{ padding: "8px 10px", color: COLORS.text }}>
                    {row.length ? L.days(row.length) : <span style={{ color: COLORS.muted, fontStyle: "italic" }}>{L.firstCycle}</span>}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    <button onClick={() => removeEntry(row.date)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>{L.remove}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 12, marginBottom: 0 }}>{L.demo}</p>
    </Card>
  );
}

/* ---------------- OVULATION EXAMPLE DIAGRAM ---------------- */
/* ---------------- TEA RECIPES (visual card) ---------------- */
const TEA_RECIPES = [
  {
    icon: "raspberryLeaf",
    name: { fr: "Feuilles de framboisier rouge", en: "Red raspberry leaf" },
    forWho: { fr: "Femme", en: "Women" },
    ingredients: { fr: "1 à 2 c. à thé (5-10 g) de feuilles séchées de framboisier rouge, 250 ml d'eau bouillante", en: "1-2 tsp (5-10 g) dried red raspberry leaves, 250 ml (1 cup) boiling water" },
    prep: { fr: "Verser l'eau bouillante sur les feuilles, couvrir et infuser 10-15 minutes, puis filtrer", en: "Pour boiling water over the leaves, cover and steep 10-15 minutes, then strain" },
    amount: { fr: "1 tasse (250 ml) par jour, jusqu'à 2 tasses max, à valider avec un professionnel", en: "1 cup (250 ml) a day, up to 2 cups max, check with a provider" },
  },
  {
    icon: "nettleLeaf",
    name: { fr: "Ortie", en: "Nettle leaf" },
    forWho: { fr: "Femme et homme", en: "Women and men" },
    ingredients: { fr: "1 c. à thé (5 g) de feuilles séchées d'ortie, 250 ml d'eau bouillante", en: "1 tsp (5 g) dried nettle leaves, 250 ml boiling water" },
    prep: { fr: "Infuser à couvert 10 minutes, puis filtrer", en: "Steep covered for 10 minutes, then strain" },
    amount: { fr: "1 tasse par jour, jusqu'à 2 tasses max", en: "1 cup a day, up to 2 cups max" },
  },
  {
    icon: "raspberryNettleMix",
    name: { fr: "Mélange framboisier & ortie", en: "Raspberry leaf & nettle blend" },
    forWho: { fr: "Femme", en: "Women" },
    ingredients: { fr: "1 c. à thé de feuilles de framboisier + 1 c. à thé de feuilles d'ortie, 300 ml d'eau bouillante", en: "1 tsp raspberry leaf + 1 tsp nettle leaf, 300 ml boiling water" },
    prep: { fr: "Mélanger les deux plantes séchées, infuser à couvert 10-15 minutes, filtrer", en: "Combine the dried herbs, steep covered 10-15 minutes, then strain" },
    amount: { fr: "1 tasse par jour", en: "1 cup a day" },
  },
  {
    icon: "gingerLemon",
    name: { fr: "Gingembre & citron", en: "Ginger & lemon" },
    forWho: { fr: "Femme et homme", en: "Women and men" },
    ingredients: { fr: "1 tranche de gingembre frais (environ 2,5 cm), le jus d'un demi-citron, 250 ml d'eau", en: "1 slice fresh ginger (about 1 inch), juice of half a lemon, 250 ml water" },
    prep: { fr: "Faire mijoter le gingembre 10 minutes, retirer du feu, ajouter le jus de citron avant de boire", en: "Simmer the ginger for 10 minutes, remove from heat, stir in lemon juice before drinking" },
    amount: { fr: "1 tasse au besoin, jusqu'à 2-3 tasses par jour", en: "1 cup as needed, up to 2-3 cups a day" },
  },
  {
    icon: "greenTeaLeaf",
    name: { fr: "Thé vert (antioxydant)", en: "Green tea (antioxidant)" },
    forWho: { fr: "Homme surtout (utile aussi pour la femme)", en: "Especially men (also fine for women)" },
    ingredients: { fr: "1 sachet ou 1 c. à thé de feuilles de thé vert, 250 ml d'eau chaude (environ 80 °C, non bouillante)", en: "1 tea bag or 1 tsp green tea leaves, 250 ml hot water (about 80 °C / 176 °F, not boiling)" },
    prep: { fr: "Infuser 2-3 minutes seulement pour éviter l'amertume, puis retirer les feuilles", en: "Steep for just 2-3 minutes to avoid bitterness, then remove the leaves" },
    amount: { fr: "1 à 2 tasses par jour (contient de la caféine, à limiter en essayant de concevoir)", en: "1-2 cups a day (contains caffeine, limit while trying to conceive)" },
  },
];

/* ---------------- FOODS CARD (ochre) ---------------- */
const FOODS = [
  { icon: "fruitBowl", name: { fr: "Aliments riches en antioxydants", en: "Antioxidant-rich foods" }, desc: { fr: "Baies, agrumes, légumes colorés, noix — aident à protéger les ovules et les spermatozoïdes du stress oxydatif.", en: "Berries, citrus, colorful vegetables, nuts — help protect eggs and sperm from oxidative stress." } },
  { icon: "avocado", name: { fr: "Bonnes graisses", en: "Healthy fats" }, desc: { fr: "Huile d'olive, avocat, noix, poissons gras comme le saumon — associées à une meilleure fertilité.", en: "Olive oil, avocado, nuts, fatty fish like salmon — linked to better fertility." } },
  { icon: "bowlSalad", name: { fr: "Aliments riches en folate", en: "Folate-rich foods" }, desc: { fr: "Légumes-feuilles vert foncé, légumineuses, asperges — essentiels avant même la conception.", en: "Dark leafy greens, legumes, asparagus — essential even before conception." } },
  { icon: "oatmealBowl", name: { fr: "Céréales entières & légumineuses", en: "Whole grains & legumes" }, desc: { fr: "Plutôt que des glucides raffinés — favorisent une glycémie stable, liée à une meilleure ovulation.", en: "Instead of refined carbs — support steadier blood sugar, linked to better ovulation." } },
  { icon: "proteinDish", name: { fr: "Protéines végétales", en: "Plant-based protein" }, desc: { fr: "Légumineuses, tofu, en partie à la place des protéines animales — liées à un risque réduit d'infertilité ovulatoire.", en: "Legumes, tofu, partly in place of animal protein — linked to lower risk of ovulatory infertility." } },
];

/* ---------------- FOODS TO AVOID CARD (red/pink) — pregnancy ---------------- */
const FOODS_TO_AVOID = [
  {
    icon: "alcoholGlassIllu",
    name: { fr: "Alcool", en: "Alcohol" },
    desc: {
      fr: "Aucune quantité d'alcool n'est considérée sécuritaire durant la grossesse. Il traverse librement le placenta et peut nuire au développement du cerveau et des organes du bébé, à n'importe quel stade.",
      en: "No amount of alcohol is considered safe during pregnancy. It crosses the placenta freely and can harm baby's brain and organ development, at any stage.",
    },
  },
  {
    icon: "fishIllu",
    name: { fr: "Poissons riches en mercure", en: "High-mercury fish" },
    desc: {
      fr: "Thon frais/steak, espadon, requin, marlin, escolier : le mercure s'accumule et peut nuire au développement neurologique du fœtus. Le thon en conserve pâle est plus faible en mercure mais reste à limiter.",
      en: "Fresh/steak tuna, swordfish, shark, marlin, escolar: mercury builds up and can harm fetal neurological development. Canned light tuna is lower in mercury but still worth limiting.",
    },
  },
  {
    icon: "fishIllu",
    name: { fr: "Poissons et fruits de mer crus", en: "Raw fish & seafood" },
    desc: {
      fr: "Sushis, sashimis, huîtres crues, ceviche : risque de listériose et de parasites. Les versions cuites ou les sushis végétariens/cuits restent une option sécuritaire.",
      en: "Sushi, sashimi, raw oysters, ceviche: risk of listeriosis and parasites. Cooked versions or vegetarian/cooked sushi remain a safe option.",
    },
  },
  {
    icon: "cheeseWedgeIllu",
    name: { fr: "Fromages au lait cru", en: "Unpasteurized cheeses" },
    desc: {
      fr: "Brie, camembert, bleu, féta et autres fromages à pâte molle non pasteurisés : risque de listériose, qui peut causer une fausse couche ou une infection grave chez le bébé. Sécuritaires s'ils sont bien cuits (ex. dans un plat chaud).",
      en: "Brie, camembert, blue cheese, feta and other unpasteurized soft cheeses: listeriosis risk, which can cause miscarriage or serious infant infection. Safe if thoroughly cooked (e.g. in a hot dish).",
    },
  },
  {
    icon: "deliMeatIllu",
    name: { fr: "Charcuteries & pâtés froids", en: "Deli meats & cold pâtés" },
    desc: {
      fr: "Charcuteries tranchées, pâtés et rillettes réfrigérés : même risque de listériose. À consommer seulement bien réchauffés à la vapeur jusqu'à ce qu'ils soient fumants.",
      en: "Sliced deli meats, refrigerated pâtés and meat spreads: same listeriosis risk. Only eat them steaming hot, reheated thoroughly.",
    },
  },
  {
    icon: "eggsDish",
    name: { fr: "Viande, volaille et œufs pas assez cuits", en: "Undercooked meat, poultry & eggs" },
    desc: {
      fr: "Risque de toxoplasmose et de salmonellose. Cuire la viande à point (sans rosé), et bien cuire les œufs jusqu'à ce que le jaune soit ferme.",
      en: "Risk of toxoplasmosis and salmonella. Cook meat thoroughly (no pink), and cook eggs until the yolk is firm.",
    },
  },
  {
    icon: "coffeeCupIllu",
    name: { fr: "Caféine en excès", en: "Excess caffeine" },
    desc: {
      fr: "Limiter à 200-300 mg par jour (environ 2 tasses de café filtre) — une consommation élevée est associée à un risque accru de faible poids à la naissance.",
      en: "Limit to 200-300 mg a day (about 2 cups of filter coffee) — high intake is linked to a higher risk of low birth weight.",
    },
  },
  {
    icon: "sproutsIllu",
    name: { fr: "Germes crus & légumes non lavés", en: "Raw sprouts & unwashed produce" },
    desc: {
      fr: "Luzerne, haricot mungo et autres germes crus peuvent porter des bactéries; bien laver tous les fruits et légumes pour réduire le risque de toxoplasmose et de contamination bactérienne.",
      en: "Alfalfa, mung bean and other raw sprouts can carry bacteria; wash all fruits and vegetables well to reduce toxoplasmosis and bacterial contamination risk.",
    },
  },
  {
    icon: "milkCartonIllu",
    name: { fr: "Lait & jus non pasteurisés", en: "Unpasteurized milk & juice" },
    desc: {
      fr: "Le lait cru et les jus non pasteurisés (souvent vendus à la ferme) peuvent contenir des bactéries dangereuses comme E. coli ou Listeria.",
      en: "Raw milk and unpasteurized juice (often farm-sold) can carry dangerous bacteria like E. coli or Listeria.",
    },
  },
  {
    icon: "pillCapsule",
    name: { fr: "Excès de vitamine A", en: "Excess vitamin A" },
    desc: {
      fr: "Foie et suppléments à forte dose de vitamine A (rétinol) : un excès est tératogène. Vérifier les suppléments prénataux et éviter le foie en grande quantité.",
      en: "Liver and high-dose vitamin A (retinol) supplements: excess is teratogenic. Check prenatal supplements and avoid large amounts of liver.",
    },
  },
  {
    icon: "herbalTeaIllu",
    name: { fr: "Certaines tisanes", en: "Certain herbal teas" },
    desc: {
      fr: "Sauge, actée à grappes noires, réglisse en grande quantité : effets incertains ou déconseillés en grossesse. En discuter avec un pharmacien ou professionnel de la santé avant d'en consommer régulièrement.",
      en: "Sage, black cohosh, large amounts of licorice root: uncertain or discouraged effects in pregnancy. Check with a pharmacist or provider before regular use.",
    },
  },
];

const FERTILITY_FOODS_TO_AVOID = [
  {
    icon: "friedFoodIllu",
    name: { fr: "Gras trans & fritures", en: "Trans fats & fried foods" },
    desc: {
      fr: "Aliments frits, margarines partiellement hydrogénées, pâtisseries industrielles : associés à un risque accru d'infertilité ovulatoire selon plusieurs études.",
      en: "Fried foods, partially hydrogenated margarines, packaged baked goods: linked to a higher risk of ovulatory infertility in several studies.",
    },
  },
  {
    icon: "sugarCubeIllu",
    name: { fr: "Sucres & glucides raffinés", en: "Refined sugars & carbs" },
    desc: {
      fr: "Boissons sucrées, pâtisseries, pain blanc : provoquent des pics de glycémie qui peuvent perturber l'ovulation. Préférer les glucides à indice glycémique bas.",
      en: "Sugary drinks, pastries, white bread: cause blood sugar spikes that can disrupt ovulation. Favor lower-glycemic carbs instead.",
    },
  },
  {
    icon: "alcoholGlassIllu",
    name: { fr: "Alcool", en: "Alcohol" },
    desc: {
      fr: "Réduit la fertilité chez la femme et chez l'homme; idéalement à éviter complètement en période de conception active, chez les deux partenaires.",
      en: "Reduces fertility in both women and men; ideally avoided completely while actively trying to conceive, for both partners.",
    },
  },
  {
    icon: "coffeeCupIllu",
    name: { fr: "Caféine en excès", en: "Excess caffeine" },
    desc: {
      fr: "Limiter à environ 200-300 mg par jour (2 tasses de café filtre); une consommation élevée est associée à des délais de conception plus longs.",
      en: "Limit to about 200-300 mg a day (2 cups of filter coffee); high intake is associated with longer time-to-conception.",
    },
  },
  {
    icon: "fishIllu",
    name: { fr: "Poissons riches en mercure", en: "High-mercury fish" },
    desc: {
      fr: "Thon frais/steak, espadon, requin, marlin : le mercure peut affecter la qualité des ovules et des spermatozoïdes.",
      en: "Fresh/steak tuna, swordfish, shark, marlin: mercury can affect egg and sperm quality.",
    },
  },
  {
    icon: "deliMeatIllu",
    name: { fr: "Viandes transformées", en: "Processed meats" },
    desc: {
      fr: "Charcuteries et viandes rouges très transformées : une consommation élevée est associée à une qualité de sperme réduite chez l'homme.",
      en: "Deli meats and heavily processed red meats: high intake is linked to reduced sperm quality in men.",
    },
  },
  {
    icon: "milkCartonIllu",
    name: { fr: "Produits laitiers écrémés en excès", en: "Excess low-fat dairy" },
    desc: {
      fr: "Certaines études (dont la Nurses' Health Study) suggèrent qu'une consommation élevée de produits laitiers écrémés pourrait être liée à un risque accru d'infertilité ovulatoire — le lait entier avec modération semble préférable.",
      en: "Some studies (including the Nurses' Health Study) suggest high intake of skim dairy may be linked to a higher risk of ovulatory infertility — whole milk in moderation may be preferable.",
    },
  },
];

function AvoidFoodsCard({ lang, title, subtitle, items, color = COLORS.pink, bg = "#FDF0F3", Icon = ShieldAlert }) {
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${color}`, background: bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color="#fff" />
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{title}</h3>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 16px" }}>{subtitle}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {items.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: COLORS.card, borderRadius: 12, padding: "12px 14px", boxShadow: "0 1px 5px rgba(47,72,88,0.06)" }}>
            <div style={{ background: bg, borderRadius: 10, padding: 4, flexShrink: 0 }}>
              <Illustration type={f.icon} size={38} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: COLORS.teal, fontSize: 13.5, marginBottom: 3 }}>{f.name[lang]}</div>
              <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5 }}>{f.desc[lang]}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const FOODS_TO_FAVOR = [
  {
    icon: "broccoliIllu",
    name: { fr: "Légumes verts feuillus", en: "Leafy green vegetables" },
    desc: {
      fr: "Épinards, brocoli, chou frisé : riches en folate, fer et vitamine K, essentiels au développement du tube neural du bébé, surtout en début de grossesse.",
      en: "Spinach, broccoli, kale: rich in folate, iron and vitamin K, essential for baby's neural tube development, especially early in pregnancy.",
    },
  },
  {
    icon: "carrotIllu",
    name: { fr: "Légumes orangés", en: "Orange vegetables" },
    desc: {
      fr: "Carotte, patate douce, courge : riches en bêta-carotène, une source sécuritaire de vitamine A (contrairement aux suppléments à forte dose ou au foie).",
      en: "Carrots, sweet potato, squash: rich in beta-carotene, a safe source of vitamin A (unlike high-dose supplements or liver).",
    },
  },
  {
    icon: "fruitBowl",
    name: { fr: "Fruits variés", en: "A variety of fruit" },
    desc: {
      fr: "Agrumes, baies, kiwi, banane : vitamine C, fibres et hydratation. La vitamine C aide aussi à l'absorption du fer contenu dans les autres aliments.",
      en: "Citrus, berries, kiwi, banana: vitamin C, fiber and hydration. Vitamin C also helps absorb iron from other foods.",
    },
  },
  {
    icon: "lentilBowlIllu",
    name: { fr: "Légumineuses", en: "Legumes" },
    desc: {
      fr: "Lentilles, pois chiches, haricots noirs : excellente source de fer, de protéines végétales et de fibres, utile contre la constipation fréquente en grossesse.",
      en: "Lentils, chickpeas, black beans: an excellent source of iron, plant protein and fiber, helpful against the constipation common in pregnancy.",
    },
  },
  {
    icon: "salmonIllu",
    name: { fr: "Poissons gras faibles en mercure", en: "Low-mercury oily fish" },
    desc: {
      fr: "Saumon, sardines, truite : riches en oméga-3 (DHA), importants pour le développement du cerveau et des yeux du bébé. Viser 2-3 portions par semaine.",
      en: "Salmon, sardines, trout: rich in omega-3 (DHA), important for baby's brain and eye development. Aim for 2-3 servings a week.",
    },
  },
  {
    icon: "chickenLegIllu",
    name: { fr: "Viandes maigres bien cuites", en: "Well-cooked lean meats" },
    desc: {
      fr: "Poulet, dinde, bœuf maigre bien cuits : source importante de fer et de protéines complètes, surtout utile si vous sentez une fatigue accrue.",
      en: "Well-cooked chicken, turkey, lean beef: an important source of iron and complete protein, especially useful if you're feeling extra fatigue.",
    },
  },
  {
    icon: "eggsDish",
    name: { fr: "Œufs bien cuits", en: "Well-cooked eggs" },
    desc: {
      fr: "Riches en choline, un nutriment clé pour le développement du cerveau de bébé, et en protéines complètes. Toujours cuits jusqu'à ce que le jaune soit ferme.",
      en: "Rich in choline, a key nutrient for baby's brain development, and complete protein. Always cook until the yolk is firm.",
    },
  },
  {
    icon: "oatmealBowl",
    name: { fr: "Grains entiers", en: "Whole grains" },
    desc: {
      fr: "Avoine, quinoa, riz brun, pain complet : énergie stable, fibres et vitamines B — un bon choix pour éviter les baisses d'énergie durant la journée.",
      en: "Oats, quinoa, brown rice, whole grain bread: steady energy, fiber and B vitamins — a good choice to avoid energy dips through the day.",
    },
  },
  {
    icon: "treeNutIllu",
    name: { fr: "Noix et graines", en: "Nuts and seeds" },
    desc: {
      fr: "Amandes, graines de chia, graines de lin : oméga-3, magnésium et bonnes graisses. À adapter en cas d'allergie connue.",
      en: "Almonds, chia seeds, flax seeds: omega-3s, magnesium and healthy fats. Adjust if you have a known allergy.",
    },
  },
  {
    icon: "milkCartonIllu",
    name: { fr: "Produits laitiers pasteurisés", en: "Pasteurized dairy" },
    desc: {
      fr: "Lait, yogourt, fromages pasteurisés à pâte ferme : une des meilleures sources de calcium et de vitamine D pour la santé osseuse de bébé et la vôtre.",
      en: "Milk, yogurt, hard pasteurized cheeses: one of the best sources of calcium and vitamin D for baby's bone health and yours.",
    },
  },
];

function FoodsToAvoidCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Aliments à éviter durant la grossesse", subtitle: "Ces aliments comportent un risque réel pour vous ou le bébé — mieux vaut les éviter complètement pendant la grossesse." }
    : lang === "es"
    ? { title: "Alimentos a evitar durante el embarazo", subtitle: "Estos alimentos representan un riesgo real para ti o el bebé — es mejor evitarlos por completo durante el embarazo." }
    : { title: "Foods to avoid during pregnancy", subtitle: "These foods carry a real risk to you or baby — best avoided entirely during pregnancy." };
  return <AvoidFoodsCard lang={lang} title={L.title} subtitle={L.subtitle} items={FOODS_TO_AVOID} />;
}

function FoodsToFavorCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Aliments à privilégier durant la grossesse", subtitle: "Ces aliments apportent les nutriments les plus importants pour vous et le développement de bébé — à intégrer régulièrement à votre menu." }
    : lang === "es"
    ? { title: "Alimentos a privilegiar durante el embarazo", subtitle: "Estos alimentos aportan los nutrientes más importantes para ti y el desarrollo del bebé — vale la pena incluirlos regularmente en tu menú." }
    : { title: "Foods to favor during pregnancy", subtitle: "These foods provide the nutrients most important for you and baby's development — worth including regularly in your meals." };
  return <AvoidFoodsCard lang={lang} title={L.title} subtitle={L.subtitle} items={FOODS_TO_FAVOR} color={COLORS.sage} bg="#F0F5EC" Icon={Check} />;
}

function FertilityFoodsToAvoidCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Aliments à limiter pour la fertilité", subtitle: "Ces aliments, en excès, peuvent nuire à la fertilité chez la femme comme chez l'homme — à limiter en période de conception active." }
    : lang === "es"
    ? { title: "Alimentos a limitar para la fertilidad", subtitle: "Estos alimentos, en exceso, pueden afectar la fertilidad tanto en la mujer como en el hombre — vale la pena limitarlos durante la búsqueda activa de embarazo." }
    : { title: "Foods to limit for fertility", subtitle: "In excess, these foods may hinder fertility in both women and men — worth limiting while actively trying to conceive." };
  return <AvoidFoodsCard lang={lang} title={L.title} subtitle={L.subtitle} items={FERTILITY_FOODS_TO_AVOID} />;
}

function FoodsCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Aliments à privilégier", subtitle: "Ce qu'on mange peut soutenir la fertilité — voici les grandes catégories à intégrer." }
    : lang === "es"
    ? { title: "Alimentos a privilegiar", subtitle: "Lo que comemos puede apoyar la fertilidad — estas son las grandes categorías a incluir." }
    : { title: "Foods to favor", subtitle: "What you eat can support fertility — here are the main categories to include." };
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.ochre}`, background: "#FBF3E4" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.ochre, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Apple size={17} color="#fff" />
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 16px" }}>{L.subtitle}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {FOODS.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: COLORS.card, borderRadius: 12, padding: "12px 14px", boxShadow: "0 1px 5px rgba(47,72,88,0.06)" }}>
            <div style={{ background: "#FBF3E4", borderRadius: 10, padding: 4, flexShrink: 0 }}>
              <Illustration type={f.icon} size={38} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: COLORS.teal, fontSize: 13.5, marginBottom: 3 }}>{f.name[lang]}</div>
              <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5 }}>{f.desc[lang]}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- SUPPLEMENTS CARD (blue) ---------------- */
const SUPPLEMENTS = [
  { name: { fr: "Acide folique", en: "Folic acid" }, amount: { fr: "400 à 800 mcg / jour", en: "400 to 800 mcg / day" }, forWho: { fr: "Femme", en: "Women" }, desc: { fr: "Le supplément le mieux établi, à commencer 1 à 3 mois avant d'essayer de concevoir.", en: "The best-established supplement, started 1 to 3 months before trying to conceive." } },
  { name: { fr: "Vitamine D", en: "Vitamin D" }, amount: { fr: "600 à 1000 UI / jour", en: "600 to 1000 IU / day" }, forWho: { fr: "Femme et homme", en: "Women and men" }, desc: { fr: "Dose plus élevée possible sous supervision médicale en cas de carence confirmée.", en: "A higher dose may be prescribed under medical supervision if a deficiency is confirmed." } },
  { name: { fr: "Oméga-3", en: "Omega-3" }, amount: { fr: "500 à 1000 mg / jour (EPA/DHA)", en: "500 to 1000 mg / day (EPA/DHA)" }, forWho: { fr: "Femme et homme", en: "Women and men" }, desc: { fr: "Associés à une meilleure qualité des ovules dans certaines études.", en: "Linked to better egg quality in some studies." } },
  { name: { fr: "Coenzyme Q10 (CoQ10)", en: "Coenzyme Q10 (CoQ10)" }, amount: { fr: "100 à 200 mg / jour", en: "100 to 200 mg / day" }, forWho: { fr: "Femme surtout", en: "Especially women" }, desc: { fr: "Étudiée pour la qualité des ovules, surtout après 35 ans; données préliminaires.", en: "Studied for egg quality, especially after 35; evidence is still preliminary." } },
  { name: { fr: "Zinc", en: "Zinc" }, amount: { fr: "8 à 11 mg / jour (jusqu'à 30 mg, max 40 mg)", en: "8 to 11 mg / day (up to 30 mg, max 40 mg)" }, forWho: { fr: "Femme et homme", en: "Women and men" }, desc: { fr: "Qualité des ovules et équilibre hormonal chez la femme; qualité du sperme chez l'homme.", en: "Egg quality and hormone balance in women; sperm quality in men." } },
  { name: { fr: "Sélénium", en: "Selenium" }, amount: { fr: "55 mcg / jour (max 400 mcg)", en: "55 mcg / day (max 400 mcg)" }, forWho: { fr: "Femme et homme", en: "Women and men" }, desc: { fr: "Important pour la fertilité des deux sexes, avec un rôle antioxydant.", en: "Important for fertility in both sexes, with an antioxidant role." } },
  { name: { fr: "Supplément prénatal complet", en: "Complete prenatal supplement" }, amount: { fr: "Selon le produit", en: "Per product label" }, forWho: { fr: "Femme", en: "Women" }, desc: { fr: "Couvre souvent plusieurs de ces besoins en une seule prise; en discuter avec un pharmacien.", en: "Often covers several of these needs in one dose; discuss with a pharmacist." } },
];

function SupplementsCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Suppléments & vitamines", subtitle: "Quantités généralement recommandées — toujours confirmer avec un professionnel de la santé avant de commencer.", forWho: "Pour qui" }
    : lang === "es"
    ? { title: "Suplementos y vitaminas", subtitle: "Cantidades generalmente recomendadas — siempre confirmar con un profesional de la salud antes de comenzar.", forWho: "Para quién" }
    : { title: "Supplements & vitamins", subtitle: "Generally recommended amounts — always confirm with a healthcare provider before starting.", forWho: "Who it's for" };
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.blue}`, background: "#EAF2F8" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Illustration type="pillCapsule" size={20} />
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 16px" }}>{L.subtitle}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {SUPPLEMENTS.map((s, i) => (
          <div key={i} style={{ background: COLORS.card, borderRadius: 12, padding: "12px 14px", boxShadow: "0 1px 5px rgba(47,72,88,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
              <div style={{ fontWeight: 700, color: COLORS.teal, fontSize: 13.5 }}>{s.name[lang]}</div>
              <span style={{ background: COLORS.blue, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{s.forWho[lang]}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#2E5C7A", fontWeight: 700, marginBottom: 4 }}>{s.amount[lang]}</div>
            <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5 }}>{s.desc[lang]}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- TEA INFO CARD (pink) ---------------- */
function TeaInfoCard({ lang }) {
  const L = lang === "fr"
    ? {
        title: "À savoir avant de boire des tisanes", subtitle: "Un aperçu général avant de passer aux recettes ci-dessous.",
        items: [
          "Framboisier rouge : traditionnellement utilisée pour tonifier l'utérus; les données scientifiques sont limitées, mais elle est généralement considérée sûre en préconception à dose modérée.",
          "Ortie : riche en minéraux (fer, calcium); parfois recommandée en phytothérapie, mais les preuves cliniques sur la fertilité restent minces.",
          "Prudence avec la sauge, le persil en grande quantité, ou l'actée à grappes noires : certaines sources suggèrent de les éviter en période de conception active sans avis professionnel.",
          "Aucune tisane ne remplace un suivi médical; en parler à un professionnel de la santé ou un pharmacien avant d'en consommer régulièrement, surtout en cas de traitement de fertilité en cours.",
        ],
      }
    : lang === "es"
    ? {
        title: "Qué saber antes de beber infusiones", subtitle: "Un panorama general antes de pasar a las recetas a continuación.",
        items: [
          "Hoja de frambuesa roja: usada tradicionalmente para tonificar el útero; los datos científicos son limitados, pero generalmente se considera segura en preconcepción en dosis moderadas.",
          "Ortiga: rica en minerales (hierro, calcio); a veces recomendada en fitoterapia, aunque la evidencia clínica sobre la fertilidad sigue siendo escasa.",
          "Precaución con la salvia, el perejil en grandes cantidades, o la cimicifuga: algunas fuentes sugieren evitarlas durante la búsqueda activa de embarazo sin consejo profesional.",
          "Ninguna infusión reemplaza el seguimiento médico; consulta a un profesional de la salud o farmacéutico antes de consumirlas regularmente, sobre todo si hay un tratamiento de fertilidad en curso.",
        ],
      }
    : {
        title: "Good to know before drinking herbal teas", subtitle: "A general overview before the recipes below.",
        items: [
          "Red raspberry leaf: traditionally used as a uterine tonic; scientific data is limited, but it's generally considered safe preconception in moderate amounts.",
          "Nettle leaf: rich in minerals (iron, calcium); sometimes recommended in herbal medicine, though clinical evidence on fertility remains thin.",
          "Caution with sage, large amounts of parsley, or black cohosh: some sources suggest avoiding these during active conception attempts without professional advice.",
          "No herbal tea replaces medical follow-up; check with a healthcare provider or pharmacist before regular use, especially during ongoing fertility treatment.",
        ],
      };
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.pink}`, background: "#FBF0F3" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.pink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Illustration type="greenTeaLeaf" size={20} />
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 14px" }}>{L.subtitle}</p>
      <ul style={{ margin: 0, padding: 0 }}>
        {L.items.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", listStyle: "none", marginBottom: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.pink, marginTop: 8, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.6 }}>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- HOSPITAL BAG CARDS (mom + baby, separate, checklist style) ---------------- */
const MOM_BAG_CATEGORIES = [
  {
    title: { fr: "Documents & essentiels", en: "Documents & essentials" },
    items: [
      { icon: "docIcon", name: { fr: "Dossier prénatal", en: "Prenatal file" } },
      { icon: "idCardIcon", name: { fr: "ID / assurance", en: "ID / insurance" } },
      { icon: "phoneIcon", name: { fr: "Téléphone & chargeur", en: "Phone & charger" } },
      { icon: "notebookIcon", name: { fr: "Plan de naissance", en: "Birth plan" }, qty: { fr: "optionnel", en: "optional" } },
    ],
  },
  {
    title: { fr: "Vêtements & confort", en: "Clothing & comfort" },
    items: [
      { icon: "clothesIcon", name: { fr: "Robes de nuit ouvertes devant", en: "Front-open nightgowns" }, qty: "3-4" },
      { icon: "braIcon", name: { fr: "Soutiens-gorge d'allaitement", en: "Nursing bras" }, qty: "2-3" },
      { icon: "slippersIcon", name: { fr: "Pantoufles antidérapantes", en: "Non-slip slippers" }, qty: "1" },
      { icon: "clothesIcon", name: { fr: "Robe de chambre / châle", en: "Robe / shawl" }, qty: "1-2" },
    ],
  },
  {
    title: { fr: "Soins post-partum", en: "Postpartum care" },
    items: [
      { icon: "padsIcon", name: { fr: "Serviettes maternité", en: "Maternity pads" }, qty: "15-20" },
      { icon: "underwearIcon", name: { fr: "Sous-vêtements jetables", en: "Disposable underwear" }, qty: "6-8" },
      { icon: "periBottleIcon", name: { fr: "Bouteille périnéale", en: "Perineal bottle" } },
      { icon: "wipesPackIcon", name: { fr: "Lingettes antiseptiques", en: "Antiseptic wipes" } },
    ],
  },
  {
    title: { fr: "Toilettes & confort", en: "Toiletries & comfort" },
    items: [
      { icon: "toiletryIcon", name: { fr: "Trousse de toilette", en: "Toiletries bag" } },
      { icon: "pillowIcon", name: { fr: "Oreiller / coussin d'allaitement", en: "Pillow / nursing pillow" } },
      { icon: "waterSnackIcon", name: { fr: "Bouteille d'eau & collations", en: "Water bottle & snacks" } },
      { icon: "headphonesIcon", name: { fr: "Musique apaisante", en: "Calming playlist" }, qty: { fr: "optionnel", en: "optional" } },
    ],
  },
];

const BABY_BAG_CATEGORIES = [
  {
    title: { fr: "Vêtements", en: "Clothing" },
    items: [
      { icon: "clothesIcon", name: { fr: "Pyjamas / dodos", en: "Sleepers" }, qty: "3-4" },
      { icon: "hatSocksIcon", name: { fr: "Bonnet & chaussettes", en: "Hat & socks" }, qty: "2-3" },
      { icon: "clothesIcon", name: { fr: "Gilet chaud", en: "Warm sweater" }, qty: "1-2" },
      { icon: "clothesIcon", name: { fr: "Tenue du retour à la maison", en: "Going-home outfit" }, qty: "1" },
    ],
  },
  {
    title: { fr: "Couches & hygiène", en: "Diapers & hygiene" },
    items: [
      { icon: "diaperIcon", name: { fr: "Couches taille naissance", en: "Newborn diapers" }, qty: "8-10" },
      { icon: "wipesPackIcon", name: { fr: "Lingettes / débarbouillettes", en: "Wipes / washcloths" } },
      { icon: "towelIcon", name: { fr: "Serviette de bain", en: "Baby towel" } },
      { icon: "soapIcon", name: { fr: "Savon / lotion bébé", en: "Baby soap / lotion" }, qty: { fr: "optionnel", en: "optional" } },
    ],
  },
  {
    title: { fr: "Confort & transport", en: "Comfort & transport" },
    items: [
      { icon: "swaddleIcon", name: { fr: "Couverture d'emmaillotage", en: "Swaddle blanket" }, qty: "1-2" },
      { icon: "carSeatIcon", name: { fr: "Siège d'auto homologué", en: "Approved car seat" } },
      { icon: "swaddleIcon", name: { fr: "Couverture pour le retour", en: "Blanket for the ride home" } },
      { icon: "clothesIcon", name: { fr: "Tenue de rechange", en: "Spare outfit" }, qty: { fr: "au cas où", en: "just in case" } },
    ],
  },
  {
    title: { fr: "Alimentation (si besoin)", en: "Feeding (if needed)" },
    items: [
      { icon: "babyBottle", name: { fr: "Biberons", en: "Feeding bottles" }, qty: "1-2" },
      { icon: "formulaIcon", name: { fr: "Préparation lactée", en: "Formula" }, qty: { fr: "si besoin", en: "if needed" } },
      { icon: "burpClothIcon", name: { fr: "Linges à régurgitation", en: "Burp cloths" }, qty: "2-3" },
    ],
  },
];

/* ---------------- FOOD BY AGE CARDS (colorful, icon grid, no horizontal scroll) ---------------- */
const RECIPES_BY_AGE = [
  {
    age: { fr: "6-8 mois", en: "6-8 months" }, color: COLORS.sage, bg: "#F0F5EC",
    items: [
      { icon: "carrotIllu", name: { fr: "Purée de carotte", en: "Carrot purée" }, detail: { fr: "Carottes vapeur + eau de cuisson", en: "Steamed carrots + cooking water" }, portion: { fr: "2-4 c. à soupe", en: "2-4 tbsp" } },
      { icon: "appleIllu", name: { fr: "Purée de pomme", en: "Apple purée" }, detail: { fr: "Pommes pelées, cuites", en: "Peeled, cooked apples" }, portion: { fr: "2-4 c. à soupe", en: "2-4 tbsp" } },
      { icon: "sweetPotatoIllu", name: { fr: "Purée de patate douce", en: "Sweet potato purée" }, detail: { fr: "Patate douce cuite + eau ou lait", en: "Cooked sweet potato + water or milk" }, portion: { fr: "2-4 c. à soupe", en: "2-4 tbsp" } },
      { icon: "squashIllu", name: { fr: "Purée de courge butternut", en: "Butternut squash purée" }, detail: { fr: "Courge rôtie + eau de cuisson", en: "Roasted squash + cooking water" }, portion: { fr: "2-4 c. à soupe", en: "2-4 tbsp" } },
    ],
  },
  {
    age: { fr: "7-9 mois", en: "7-9 months" }, color: COLORS.blue, bg: "#EAF2F8",
    items: [
      { icon: "broccoliIllu", name: { fr: "Brocoli-poire écrasés", en: "Mashed broccoli-pear" }, detail: { fr: "Brocoli vapeur + poire mûre, texture grumeleuse", en: "Steamed broccoli + ripe pear, lumpy texture" }, portion: { fr: "3-5 c. à soupe", en: "3-5 tbsp" } },
      { icon: "avocado", name: { fr: "Poire-avocat écrasés", en: "Mashed pear-avocado" }, detail: { fr: "Poire cuite + avocat mûr, à la fourchette", en: "Cooked pear + ripe avocado, fork-mashed" }, portion: { fr: "3-5 c. à soupe", en: "3-5 tbsp" } },
      { icon: "peaPodIllu", name: { fr: "Pois-menthe écrasés", en: "Mashed pea & mint" }, detail: { fr: "Petits pois écrasés + feuille de menthe", en: "Mashed peas + a mint leaf" }, portion: { fr: "3-5 c. à soupe", en: "3-5 tbsp" } },
      { icon: "lentilBowlIllu", name: { fr: "Lentilles légèrement écrasées", en: "Lightly mashed lentils" }, detail: { fr: "Lentilles rouges + bouillon léger", en: "Red lentils + light broth" }, portion: { fr: "4-6 c. à soupe", en: "4-6 tbsp" } },
    ],
  },
  {
    age: { fr: "9-12 mois", en: "9-12 months" }, color: COLORS.pink, bg: "#FDF0F3",
    items: [
      { icon: "chickenLegIllu", name: { fr: "Poulet effiloché & légumes", en: "Shredded chicken & veggies" }, detail: { fr: "Poulet en filaments + carotte, courgette en dés mous", en: "Shredded chicken + soft-diced carrot, zucchini" }, portion: { fr: "Petits morceaux, à la main", en: "Small pieces, finger food" } },
      { icon: "salmonIllu", name: { fr: "Saumon émietté & patate douce", en: "Flaked salmon & sweet potato" }, detail: { fr: "Saumon sans arêtes émietté + dés de patate douce", en: "Boneless flaked salmon + sweet potato cubes" }, portion: { fr: "Petits morceaux, à la main", en: "Small pieces, finger food" } },
      { icon: "oatmealBowl", name: { fr: "Céréales multigrains & fruits", en: "Multigrain cereal & fruit" }, detail: { fr: "Avoine, quinoa + fruits mous coupés en dés", en: "Oats, quinoa + soft fruit cut into cubes" }, portion: { fr: "1/2 à 3/4 tasse", en: "1/2 to 3/4 cup" } },
      { icon: "beefIllu", name: { fr: "Bœuf haché & légumes en dés", en: "Ground beef & diced veggies" }, detail: { fr: "Bœuf maigre émietté + carotte, patate en petits dés", en: "Crumbled lean beef + carrot, potato in small dice" }, portion: { fr: "Portion du repas familial", en: "Portion of the family meal" } },
    ],
  },
];

const ALLERGENS_LIST = [
  { icon: "peanutIllu", name: { fr: "Arachides", en: "Peanuts" } },
  { icon: "treeNutIllu", name: { fr: "Noix", en: "Tree nuts" } },
  { icon: "eggsDish", name: { fr: "Œufs", en: "Eggs" } },
  { icon: "milkCartonIllu", name: { fr: "Lait", en: "Milk" } },
  { icon: "fishIllu", name: { fr: "Poisson", en: "Fish" } },
  { icon: "shellfishIllu", name: { fr: "Crustacés & mollusques", en: "Shellfish & mollusks" } },
  { icon: "soyPodIllu", name: { fr: "Soya", en: "Soy" } },
  { icon: "wheatIllu", name: { fr: "Blé", en: "Wheat" } },
  { icon: "sesameIllu", name: { fr: "Sésame", en: "Sesame" } },
];

const MENU612_SCHEDULE = [
  {
    time: "7 h", moment: { fr: "Réveil", en: "Wake-up" },
    a1: { icon: "babyBottle", text: { fr: "Lait maternel/préparation", en: "Breast milk/formula" } },
    a2: { icon: "babyBottle", text: { fr: "Lait maternel/préparation", en: "Breast milk/formula" } },
  },
  {
    time: "9 h", moment: { fr: "Matin", en: "Morning" },
    a1: { icon: "fruitBowl", text: { fr: "Purée de fruit + céréales enrichies en fer", en: "Fruit purée + iron-fortified cereal" } },
    a2: { icon: "fruitBowl", text: { fr: "Fruits en morceaux + céréales + yogourt", en: "Chopped fruit + cereal + yogurt" } },
  },
  {
    time: "11 h", moment: { fr: "Collation AM", en: "AM snack" },
    a1: { icon: "babyBottle", text: { fr: "Lait au besoin", en: "Milk as needed" } },
    a2: { icon: "appleIllu", text: { fr: "Petits morceaux de fruit mou", en: "Small pieces of soft fruit" } },
  },
  {
    time: "12 h", moment: { fr: "Midi", en: "Midday" },
    a1: { icon: "bowlSalad", text: { fr: "Purée légume + protéine", en: "Veggie purée + protein" } },
    a2: { icon: "proteinDish", text: { fr: "Légumes + protéine en morceaux + féculent", en: "Veggies + protein pieces + starch" } },
  },
  {
    time: "15 h", moment: { fr: "Collation PM", en: "PM snack" },
    a1: { icon: "babyBottle", text: { fr: "Lait maternel/préparation", en: "Breast milk/formula" } },
    a2: { icon: "yogurtCup", text: { fr: "Yogourt ou fromage + fruit", en: "Yogurt or cheese + fruit" } },
  },
  {
    time: "18 h", moment: { fr: "Souper", en: "Dinner" },
    a1: { icon: "bowlSoup", text: { fr: "Purée légume + féculent", en: "Veggie purée + starch" } },
    a2: { icon: "bowlSoup", text: { fr: "Repas familial en morceaux mous", en: "Family meal in soft pieces" } },
  },
  {
    time: "20 h", moment: { fr: "Coucher", en: "Bedtime" },
    a1: { icon: "babyBottle", text: { fr: "Lait maternel/préparation", en: "Breast milk/formula" } },
    a2: { icon: "babyBottle", text: { fr: "Lait maternel/préparation", en: "Breast milk/formula" } },
  },
];

const MENU15_SCHEDULE = [
  {
    time: "7 h 30", moment: { fr: "Petit-déjeuner", en: "Breakfast" },
    a1: { icon: "oatmealBowl", text: { fr: "Céréales + lait + petits fruits", en: "Cereal + milk + berries" } },
    a2: { icon: "eggsDish", text: { fr: "Rôties + œuf + fruit", en: "Toast + egg + fruit" } },
  },
  {
    time: "9 h 30", moment: { fr: "Collation AM", en: "AM snack" },
    a1: { icon: "appleIllu", text: { fr: "Morceaux de fruit + fromage", en: "Fruit pieces + cheese" } },
    a2: { icon: "cheeseWedgeIllu", text: { fr: "Craquelins + fromage", en: "Crackers + cheese" } },
  },
  {
    time: "12 h", moment: { fr: "Dîner", en: "Lunch" },
    a1: { icon: "proteinDish", text: { fr: "Protéine + légumes + féculent (petite portion)", en: "Protein + veggies + starch (small portion)" } },
    a2: { icon: "bowlSalad", text: { fr: "Repas familial, portion enfant", en: "Family meal, child-sized portion" } },
  },
  {
    time: "15 h", moment: { fr: "Collation PM", en: "PM snack" },
    a1: { icon: "yogurtCup", text: { fr: "Yogourt + fruit", en: "Yogurt + fruit" } },
    a2: { icon: "carrotIllu", text: { fr: "Légumes crus + trempette", en: "Raw veggies + dip" } },
  },
  {
    time: "18 h", moment: { fr: "Souper", en: "Dinner" },
    a1: { icon: "bowlSalad", text: { fr: "Repas familial, morceaux adaptés", en: "Family meal, adapted pieces" } },
    a2: { icon: "bowlSoup", text: { fr: "Repas familial complet", en: "Full family meal" } },
  },
];

function MealCell({ cell, lang, color }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
      <div style={{
        width: 24, height: 24, borderRadius: 7, background: "#fff", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(47,72,88,0.10)",
      }}>
        <Illustration type={cell.icon} size={16} />
      </div>
      <span style={{ fontSize: 9.5, color: COLORS.text, lineHeight: 1.3 }}>{cell.text[lang]}</span>
    </div>
  );
}

function MealScheduleCard({ lang, rows, color, colHeaders, title }) {
  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{title}</h3>
      <table style={{ borderCollapse: "separate", borderSpacing: "0 6px", width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "20%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "40%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: "0 4px 6px", textAlign: "left", fontSize: 8.5, color: COLORS.muted, textTransform: "uppercase", fontWeight: 700 }} />
            <th style={{ padding: "0 4px 6px", textAlign: "left", fontSize: 9.5, fontWeight: 800, color: COLORS.teal, textTransform: "uppercase", lineHeight: 1.2 }}>{colHeaders[0]}</th>
            <th style={{ padding: "0 4px 6px", textAlign: "left", fontSize: 9.5, fontWeight: 800, color: COLORS.teal, textTransform: "uppercase", lineHeight: 1.2 }}>{colHeaders[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td style={{ padding: "8px 4px", verticalAlign: "top", background: `${color}26`, borderLeft: `4px solid ${color}` }}>
                <span style={{ display: "block", fontFamily: "Fraunces, Georgia, serif", fontSize: 13, fontWeight: 700, color: color, lineHeight: 1.1 }}>{r.time}</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: COLORS.muted, lineHeight: 1.2 }}>{r.moment[lang]}</span>
              </td>
              <td style={{ padding: "8px 6px", verticalAlign: "top", background: `${color}26` }}>
                <MealCell cell={r.a1} lang={lang} color={color} />
              </td>
              <td style={{ padding: "8px 6px", verticalAlign: "top", background: `${color}26` }}>
                <MealCell cell={r.a2} lang={lang} color={color} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-start", background: `${color}1F`,
        borderRadius: 12, padding: "12px 14px", marginTop: 12,
      }}>
        <ShieldAlert size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11.5, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>
          {lang === "fr"
            ? "Cet horaire est indicatif — ajustez les moments et les quantités selon l'appétit et le rythme de votre enfant."
            : "This schedule is a guide — adjust timing and amounts to your child's appetite and rhythm."}
        </p>
      </div>
    </Card>
  );
}

const TEMP_CLOTHING = [
  { n: 1, temp: "25°C ET PLUS", weather: "sun", color: COLORS.ochre, items: [
    { icon: "bodysuitIllu", name: { fr: "Body manches courtes", en: "Short sleeve bodysuit" } },
    { icon: "shortsIllu", name: { fr: "Short", en: "Shorts" } },
    { icon: "sunHatIllu", name: { fr: "Chapeau de soleil", en: "Sun hat" } },
    { icon: "socksIllu", name: { fr: "Bas si besoin", en: "Socks if needed" } },
  ] },
  { n: 2, temp: "20°C À 25°C", weather: "cloudSun", color: COLORS.sage, items: [
    { icon: "bodysuitIllu", name: { fr: "Body manches courtes ou longues", en: "Long or short sleeve bodysuit" } },
    { icon: "pantsIllu", name: { fr: "Pantalon léger", en: "Lightweight pants" } },
    { icon: "socksIllu", name: { fr: "Bas si besoin", en: "Socks if needed" } },
  ] },
  { n: 3, temp: "15°C À 19°C", weather: "cloud", color: "#D08A4E", items: [
    { icon: "bodysuitIllu", name: { fr: "Body manches courtes", en: "Short sleeve bodysuit" } },
    { icon: "longSleeveShirtIllu", name: { fr: "Chandail manches longues", en: "Long sleeve shirt" } },
    { icon: "pantsIllu", name: { fr: "Pantalon", en: "Pants" } },
    { icon: "lightJacketIllu", name: { fr: "Veste légère", en: "Light jacket" } },
    { icon: "socksIllu", name: { fr: "Bas", en: "Socks" } },
  ] },
  { n: 4, temp: "10°C À 14°C", weather: "cloud", color: COLORS.blue, items: [
    { icon: "bodysuitIllu", name: { fr: "Body manches courtes", en: "Short sleeve bodysuit" } },
    { icon: "longSleeveShirtIllu", name: { fr: "Chandail manches longues", en: "Long sleeve shirt" } },
    { icon: "warmJacketIllu", name: { fr: "Manteau chaud", en: "Warm jacket" } },
    { icon: "pantsIllu", name: { fr: "Pantalon", en: "Pants" } },
    { icon: "socksIllu", name: { fr: "Bas chauds", en: "Warm socks" } },
  ] },
  { n: 5, temp: "5°C À 9°C", weather: "snow", color: "#8F6BAE", items: [
    { icon: "bodysuitIllu", name: { fr: "Body manches courtes", en: "Short sleeve bodysuit" } },
    { icon: "longSleeveShirtIllu", name: { fr: "Chandail manches longues", en: "Long sleeve shirt" } },
    { icon: "pantsIllu", name: { fr: "Pantalon", en: "Pants" } },
    { icon: "snowsuitIllu", name: { fr: "Habit de neige", en: "Snowsuit" } },
    { icon: "hatIllu", name: { fr: "Tuque", en: "Hat" } },
    { icon: "socksIllu", name: { fr: "Bas chauds", en: "Warm socks" } },
  ] },
  { n: 6, temp: "0°C ET MOINS", weather: "snow", color: "#3E5A73", items: [
    { icon: "bodysuitIllu", name: { fr: "Body manches courtes", en: "Short sleeve bodysuit" } },
    { icon: "longSleeveShirtIllu", name: { fr: "Chandail manches longues", en: "Long sleeve shirt" } },
    { icon: "pantsIllu", name: { fr: "Pantalon", en: "Pants" } },
    { icon: "snowsuitIllu", name: { fr: "Habit de neige", en: "Snowsuit" } },
    { icon: "hatIllu", name: { fr: "Tuque", en: "Hat" } },
    { icon: "mittensIllu", name: { fr: "Mitaines", en: "Mittens" } },
    { icon: "socksIllu", name: { fr: "Bas chauds", en: "Warm socks" } },
  ] },
];

function WeatherIcon({ type, size = 22, color = "#fff" }) {
  if (type === "sun") return <Sun size={size} color={color} />;
  if (type === "cloudSun") return <CloudSun size={size} color={color} />;
  if (type === "cloud") return <Cloud size={size} color={color} />;
  return <Snowflake size={size} color={color} />;
}

function TempClothingTable({ lang }) {
  const L = lang === "fr"
    ? { title: "Comment habiller bébé selon la température", subtitle: "Un guide simple pour garder bébé confortable, peu importe la météo.", rule: "Bonne règle : habillez bébé d'une couche de plus que vous n'en porteriez à la même température." }
    : lang === "es"
    ? { title: "Cómo vestir al bebé según la temperatura", subtitle: "Una guía simple para mantener al bebé cómodo, sin importar el clima.", rule: "Buena regla: viste al bebé con una capa más de lo que tú usarías a la misma temperatura." }
    : { title: "How to dress your baby for any temperature", subtitle: "A simple guide to keep your baby comfortable in every weather.", rule: "Good rule of thumb: dress baby in one more layer than you would wear in the same temperature." };
  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 11.5, color: COLORS.muted }}>{L.subtitle}</p>
      {TEMP_CLOTHING.map((row, i) => (
        <div key={i} style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: i < TEMP_CLOTHING.length - 1 ? 10 : 0, boxShadow: "0 2px 8px rgba(47,72,88,0.08)" }}>
          <div style={{
            width: 56, flexShrink: 0, background: row.color, color: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 4px", gap: 6,
          }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{row.n}</div>
            <span style={{ fontSize: 10.5, fontWeight: 800, textAlign: "center", lineHeight: 1.15 }}>{row.temp}</span>
            <WeatherIcon type={row.weather} size={20} />
          </div>
          <div style={{ flex: 1, background: `${row.color}14`, padding: "10px 10px" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {row.items.map((it, j) => (
                <div key={j} style={{
                  width: 34, height: 34, borderRadius: 9, background: "#fff", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(47,72,88,0.10)",
                }}>
                  <Illustration type={it.icon} size={23} />
                </div>
              ))}
            </div>
            {row.items.map((it, j) => (
              <div key={j} style={{ fontSize: 9.5, color: COLORS.text, lineHeight: 1.5 }}>• {it.name[lang]}</div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FBF3E4", borderRadius: 12, padding: "12px 14px", marginTop: 12 }}>
        <Heart size={16} color={COLORS.ochre} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11.5, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>{L.rule}</p>
      </div>
    </Card>
  );
}

const BATH_FREQUENCY = [
  {
    age: { fr: "0 mois", en: "0 months", es: "0 meses" }, color: COLORS.pink, bg: "#FDF0F3",
    items: {
      fr: ["2 bains par semaine suffisent au retour à la maison", "Éviter d'immerger bébé tant que le cordon n'est pas tombé", "Préférer une débarbouillette douce et humide"],
      en: ["2 baths a week are enough once home", "Avoid submerging baby until the cord falls off", "A soft, damp washcloth works best"],
      es: ["2 baños por semana son suficientes al llegar a casa", "Evitar sumergir al bebé mientras el cordón no se haya caído", "Preferir una toallita suave y húmeda"],
    },
  },
  {
    age: { fr: "1-3 mois", en: "1-3 months", es: "1-3 meses" }, color: COLORS.ochre, bg: "#FBF3E4",
    items: {
      fr: ["Garder le rythme de 2 bains/semaine jusqu'au 3e mois", "Introduire graduellement le bain traditionnel une fois le nombril guéri"],
      en: ["Keep the 2 baths/week rhythm until month 3", "Gradually introduce traditional baths once the belly button heals"],
      es: ["Mantener el ritmo de 2 baños/semana hasta el 3er mes", "Introducir gradualmente el baño tradicional una vez que el ombligo haya sanado"],
    },
  },
  {
    age: { fr: "3-6 mois", en: "3-6 months", es: "3-6 meses" }, color: COLORS.blue, bg: "#EAF2F8",
    items: {
      fr: ["Possibilité de laver un peu plus souvent avec l'introduction des solides", "Combiner bain traditionnel et bain-éponge", "Laver la zone de la couche plus fréquemment"],
      en: ["May wash a bit more often once solids start", "Combine traditional and sponge baths", "Wash the diaper area more frequently"],
      es: ["Se puede lavar un poco más seguido al comenzar los sólidos", "Combinar baño tradicional y baño de esponja", "Lavar la zona del pañal con más frecuencia"],
    },
  },
  {
    age: { fr: "6-12 mois", en: "6-12 months", es: "6-12 meses" }, color: COLORS.sage, bg: "#F0F5EC",
    items: {
      fr: ["Le bain devient plus facile une fois que bébé s'assoit", "Peut passer à un bain aux 2 jours et le rendre plus ludique", "La plupart des bébés adorent l'eau — garder leur attention active"],
      en: ["Bath time gets easier once baby can sit up", "Can move to every-other-day baths and make it playful", "Most babies love water — keep them engaged"],
      es: ["El baño se vuelve más fácil una vez que el bebé se sienta", "Se puede pasar a un baño cada 2 días y hacerlo más lúdico", "La mayoría de los bebés adora el agua — mantener su atención activa"],
    },
  },
];

function BathFrequencyTable({ lang }) {
  const L = lang === "fr"
    ? { title: "À quelle fréquence laver bébé ?", note: "Ce sont des repères généraux, pas des règles strictes — ajustez selon la peau de votre bébé." }
    : lang === "es"
    ? { title: "¿Con qué frecuencia bañar al bebé?", note: "Estas son pautas generales, no reglas estrictas — ajusta según la piel de tu bebé." }
    : { title: "How often does baby need a bath?", note: "These are general guidelines, not strict rules — adjust based on your baby's skin." };
  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      {BATH_FREQUENCY.map((row, i) => (
        <div key={i} style={{ borderRadius: 14, overflow: "hidden", marginBottom: i < BATH_FREQUENCY.length - 1 ? 10 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: row.color, padding: "8px 14px" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Illustration type="bathtubIllu" size={20} />
            </div>
            <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>{row.age[lang]}</span>
          </div>
          <div style={{ background: row.bg, padding: "10px 14px" }}>
            {row.items[lang].map((it, j) => (
              <div key={j} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: j < row.items[lang].length - 1 ? 4 : 0 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: row.color, marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: COLORS.text, lineHeight: 1.4 }}>{it}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10, fontStyle: "italic" }}>{L.note}</p>
    </Card>
  );
}

const BREASTMILK_TIPS = [
  { icon: "nursing", name: { fr: "Allaiter souvent", en: "Nurse often" }, desc: { fr: "Plus bébé tète, plus le corps produit de lait. Offrir les deux seins à chaque tétée, ne pas sauter les boires de nuit.", en: "The more baby nurses, the more your body makes. Offer both breasts each feed, don't skip night feeds." } },
  { icon: "hydration", name: { fr: "Bien s'hydrater", en: "Stay hydrated" }, desc: { fr: "Les liquides aident le corps à produire du lait. Boire régulièrement, garder une bouteille d'eau à portée de main.", en: "Fluids help your body produce milk. Drink regularly, keep a bottle nearby." } },
  { icon: "bowlSalad", name: { fr: "Bien manger", en: "Eat nourishing foods" }, desc: { fr: "Une bonne alimentation soutient la production de lait. Avoine, noix, graines, légumes verts et protéines.", en: "Good nutrition supports milk production. Oats, nuts, seeds, leafy greens, and protein." } },
  { icon: "babyBottle", name: { fr: "Vider les seins", en: "Empty your breasts" }, desc: { fr: "Bien vider les seins signale au corps de produire plus de lait. Tirer après les tétées au besoin.", en: "Draining breasts well signals your body to make more milk. Pump after feeds if needed." } },
  { icon: "heartCareIllu", name: { fr: "Peau à peau", en: "Skin-to-skin time" }, desc: { fr: "Le contact rapproché stimule les hormones qui augmentent la production de lait. Le plus souvent possible.", en: "Close contact boosts hormones that increase milk supply. As often as possible." } },
  { icon: "oatmealBowl", name: { fr: "Aliments galactogènes", en: "Natural galactagogues" }, desc: { fr: "Certains aliments/plantes peuvent soutenir la lactation : fenugrec, graines de lin, avoine, ail, gingembre. Consulter un professionnel au doute.", en: "Some foods/herbs may support supply: fenugreek, flaxseed, oats, garlic, ginger. Consult a provider if unsure." } },
  { icon: "mindCareIllu", name: { fr: "Repos & moins de stress", en: "Rest & reduce stress" }, desc: { fr: "Le stress peut affecter la production de lait. Prendre de courtes pauses, accepter de l'aide.", en: "Stress can affect milk supply. Take short breaks, ask for and accept help." } },
];

function BreastmilkTipsCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Augmenter sa production de lait", subtitle: "De petits gestes, une grande différence.", note: "Si vous vous inquiétez pour votre production, contactez une consultante en lactation — vous n'avez pas à traverser ça seule." }
    : lang === "es"
    ? { title: "Aumentar tu producción de leche", subtitle: "Pequeños gestos, una gran diferencia.", note: "Si te preocupa tu producción, contacta a una consultora de lactancia — no tienes que pasar por esto sola." }
    : { title: "Increasing your breastmilk supply", subtitle: "Small steps, big supply.", note: "If you're worried about your supply, reach out to a lactation consultant — you don't have to do it alone." };
  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.muted }}>{L.subtitle}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {BREASTMILK_TIPS.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FBF0F3", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Illustration type={t.icon} size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: COLORS.teal, fontSize: 12.5, marginBottom: 2 }}>{t.name[lang]}</div>
              <div style={{ fontSize: 10.5, color: COLORS.text, lineHeight: 1.4 }}>{t.desc[lang]}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FBF3E4", borderRadius: 12, padding: "12px 14px", marginTop: 12 }}>
        <Heart size={16} color={COLORS.ochre} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11.5, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>{L.note}</p>
      </div>
    </Card>
  );
}

function AllergensList({ lang }) {
  const L = lang === "fr"
    ? { title: "Les 9 allergènes prioritaires" }
    : lang === "es"
    ? { title: "Los 9 alérgenos prioritarios" }
    : { title: "The 9 priority allergens" };
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.ochre}`, background: "#FBF3E4" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ALLERGENS_LIST.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 12, padding: "8px 12px" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: "#FBF3E4", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Illustration type={a.icon} size={28} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.teal }}>{a.name[lang]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecipesByAgeCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Idées de repas par âge", note: "Ne jamais ajouter de sel, de sucre ou de miel avant 12 mois. Adapter la texture à l'évolution de bébé : purée lisse dès 6 mois, texture plus grumeleuse vers 7-8 mois, puis morceaux mous et repas familial dès 9 mois." }
    : lang === "es"
    ? { title: "Ideas de comidas por edad", note: "Nunca agregar sal, azúcar o miel antes de los 12 meses. Adaptar la textura según la evolución del bebé: puré liso desde los 6 meses, textura más grumosa hacia los 7-8 meses, luego trozos blandos y comida familiar desde los 9 meses." }
    : { title: "Meal ideas by age", note: "Never add salt, sugar or honey before 12 months. Adapt texture as baby develops: smooth purée from 6 months, lumpier texture around 7-8 months, then soft pieces and family meals from 9 months on." };
  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      {RECIPES_BY_AGE.map((group, gi) => (
        <div key={gi} style={{ marginBottom: gi < RECIPES_BY_AGE.length - 1 ? 16 : 14 }}>
          <span style={{
            display: "inline-block", background: group.color, color: "#fff", fontSize: 12, fontWeight: 800,
            padding: "5px 14px", borderRadius: 999, marginBottom: 10,
          }}>{group.age[lang]}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, background: group.bg, borderRadius: 14, padding: 8 }}>
            {group.items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 8, background: "#fff", borderRadius: 10, padding: "8px 8px" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, background: group.bg, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Illustration type={it.icon} size={22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: COLORS.teal, marginBottom: 2, lineHeight: 1.2 }}>{it.name[lang]}</div>
                  <div style={{ fontSize: 9, color: COLORS.text, lineHeight: 1.25, marginBottom: 2 }}>{it.detail[lang]}</div>
                  <div style={{ fontSize: 8.5, color: COLORS.muted, fontWeight: 700 }}>{it.portion[lang]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-start", background: "#FBF3E4",
        borderRadius: 12, padding: "12px 14px", marginTop: 4,
      }}>
        <ShieldAlert size={16} color={COLORS.ochre} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11.5, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>{L.note}</p>
      </div>
    </Card>
  );
}

function BagItemsCard({ title, categories, lang, color, bg }) {
  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${color}`, background: bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Illustration type="hospitalBag" size={20} />
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{title}</h3>
      </div>
      {categories.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: ci < categories.length - 1 ? 20 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{
              width: 20, height: 20, borderRadius: "50%", background: color, color: "#fff",
              fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{ci + 1}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.02em" }}>{cat.title[lang]}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))", gap: 10 }}>
            {cat.items.map((it, i) => {
              const qty = typeof it.qty === "object" ? it.qty[lang] : it.qty;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{
                    width: 58, height: 58, borderRadius: 16, background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(47,72,88,0.08)", marginBottom: 6,
                  }}>
                    <Illustration type={it.icon} size={40} />
                  </div>
                  <span style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.3 }}>{it.name[lang]}</span>
                  {qty && <span style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700 }}>({qty})</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </Card>
  );
}

function MomBagCard({ lang }) {
  return <BagItemsCard title={lang === "fr" ? "Sac pour maman" : lang === "es" ? "Maleta para mamá" : "Bag for mom"} categories={MOM_BAG_CATEGORIES} lang={lang} color={COLORS.pink} bg="#FBF0F3" />;
}

function BabyBagCard({ lang }) {
  return <BagItemsCard title={lang === "fr" ? "Sac pour bébé" : lang === "es" ? "Maleta para el bebé" : "Bag for baby"} categories={BABY_BAG_CATEGORIES} lang={lang} color={COLORS.blue} bg="#EAF2F8" />;
}

function TeaRecipesCard({ lang }) {
  const L = lang === "fr"
    ? { title: "Recettes de tisane maison", subtitle: "Cinq infusions simples, avec ingrédients illustrés et préparation étape par étape.", forWho: "Pour qui", ingredients: "Ingrédients", prep: "Préparation", amount: "Quantité / fréquence" }
    : lang === "es"
    ? { title: "Recetas de infusión casera", subtitle: "Cinco infusiones simples, con ingredientes ilustrados y preparación paso a paso.", forWho: "Para quién", ingredients: "Ingredientes", prep: "Preparación", amount: "Cantidad / frecuencia" }
    : { title: "Homemade tea recipes", subtitle: "Five simple infusions, with illustrated ingredients and step-by-step prep.", forWho: "Who it's for", ingredients: "Ingredients", prep: "Preparation", amount: "Amount / frequency" };

  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.sage}`, background: "#EEF4EC" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.sage, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Apple size={17} color="#fff" />
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 16px" }}>{L.subtitle}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {TEA_RECIPES.map((r, i) => (
          <div key={i} style={{ background: COLORS.card, borderRadius: 14, padding: "16px 16px", boxShadow: "0 2px 8px rgba(47,72,88,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ background: "#EEF4EC", borderRadius: 12, padding: 6, flexShrink: 0 }}>
                <Illustration type={r.icon} size={46} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: COLORS.teal, fontSize: 14.5, lineHeight: 1.3 }}>{r.name[lang]}</div>
                <span style={{ display: "inline-block", marginTop: 4, background: COLORS.sage, color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>{r.forWho[lang]}</span>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.55 }}>
              <p style={{ margin: "0 0 6px" }}><strong style={{ color: COLORS.teal }}>{L.ingredients} : </strong>{r.ingredients[lang]}</p>
              <p style={{ margin: "0 0 6px" }}><strong style={{ color: COLORS.teal }}>{L.prep} : </strong>{r.prep[lang]}</p>
              <p style={{ margin: 0 }}><strong style={{ color: COLORS.teal }}>{L.amount} : </strong>{r.amount[lang]}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OvulationExample({ lang }) {
  const L = lang === "fr"
    ? {
        title: "Exemple visuel — cycle de 28 jours",
        desc: "Jour 1 = premier jour des règles. L'ovulation survient environ 14 jours plus tard (jour 14). La fenêtre fertile couvre les 5 jours avant l'ovulation, plus le jour même.",
        legend1: "Règles (jour 1)", legend2: "Fenêtre fertile", legend3: "Jour d'ovulation", legend4: "Phase lutéale",
      }
    : lang === "es"
    ? {
        title: "Ejemplo visual — ciclo de 28 días",
        desc: "Día 1 = primer día de la menstruación. La ovulación ocurre unos 14 días después (día 14). La ventana fértil abarca los 5 días previos a la ovulación, más el día mismo.",
        legend1: "Menstruación (día 1)", legend2: "Ventana fértil", legend3: "Día de ovulación", legend4: "Fase lútea",
      }
    : {
        title: "Visual example — 28-day cycle",
        desc: "Day 1 = the first day of your period. Ovulation happens about 14 days later (day 14). The fertile window covers the 5 days before ovulation, plus the day itself.",
        legend1: "Period (day 1)", legend2: "Fertile window", legend3: "Ovulation day", legend4: "Luteal phase",
      };

  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const colorFor = (d) => {
    if (d === 1) return COLORS.teal;
    if (d === 14) return COLORS.ochre;
    if (d >= 9 && d <= 15) return COLORS.pink;
    return COLORS.line;
  };
  const textColorFor = (d) => (d === 1 || d === 14 || (d >= 9 && d <= 15)) ? "#fff" : COLORS.muted;

  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.yellow}`, background: "#FBF6E3" }}>
      <h3 style={{ margin: "0 0 6px", fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13.5, color: COLORS.muted, lineHeight: 1.55, maxWidth: 560 }}>{L.desc}</p>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8 }}>
        {days.map((d) => (
          <div key={d} style={{
            width: 26, height: 26, borderRadius: 8, background: colorFor(d), color: textColorFor(d),
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {d === 14 ? "★" : d}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14 }}>
        {[
          [COLORS.teal, L.legend1],
          [COLORS.pink, L.legend2],
          [COLORS.ochre, L.legend3],
          [COLORS.line, L.legend4],
        ].map(([color, label], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: COLORS.text }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- PREGNANCY CALCULATOR ---------------- */
function PregnancyCalculator({ lang }) {
  const [lmp, setLmp] = useState("");

  const result = useMemo(() => {
    if (!lmp) return null;
    const start = new Date(lmp + "T00:00:00");
    if (isNaN(start.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(start);
    dueDate.setDate(start.getDate() + 280);
    const diffDays = Math.floor((today - start) / 86400000);
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    let trimester = 1;
    if (weeks >= 27) trimester = 3;
    else if (weeks >= 13) trimester = 2;
    const daysLeft = Math.max(0, Math.floor((dueDate - today) / 86400000));
    return { dueDate, weeks, days, trimester, daysLeft };
  }, [lmp]);

  const fmt = (d) => d.toLocaleDateString(lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA", { day: "numeric", month: "long", year: "numeric" });

  const L = lang === "fr"
    ? { title: "Calculateur de grossesse", lmpLabel: "1er jour de vos dernières règles", due: "Date prévue d'accouchement", week: "Semaine de grossesse", tri: "Trimestre", left: "Jours restants", weekVal: (w, d) => `${w} semaines et ${d} jour${d > 1 ? "s" : ""}`, disclaimer: "Basé sur un cycle de 28 jours. Votre professionnel de la santé peut ajuster la date selon l'échographie de datation." }
    : lang === "es"
    ? { title: "Calculadora de embarazo", lmpLabel: "1er día de tu última menstruación", due: "Fecha probable de parto", week: "Semana de embarazo", tri: "Trimestre", left: "Días restantes", weekVal: (w, d) => `${w} semanas y ${d} día${d > 1 ? "s" : ""}`, disclaimer: "Basado en un ciclo de 28 días. Tu profesional de la salud puede ajustar la fecha según la ecografía de datación." }
    : { title: "Pregnancy calculator", lmpLabel: "First day of your last period", due: "Estimated due date", week: "Pregnancy week", tri: "Trimester", left: "Days left", weekVal: (w, d) => `${w} weeks and ${d} day${d > 1 ? "s" : ""}`, disclaimer: "Based on a 28-day cycle. Your healthcare provider may adjust the date using the dating ultrasound." };

  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.pink}`, background: "#FDF2F5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Calendar size={20} color={COLORS.pink} />
        <h3 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 20, color: COLORS.teal }}>{L.title}</h3>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: COLORS.muted, fontWeight: 600, marginBottom: 16, maxWidth: 260 }}>
        {L.lmpLabel}
        <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14 }} />
      </label>
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div style={{ background: "linear-gradient(135deg, #F6DCE3 0%, #F0C9D5 100%)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#8F4A63", fontWeight: 700, textTransform: "uppercase" }}>{L.week}</div>
            <div style={{ fontSize: 16, color: COLORS.teal, fontWeight: 800, marginTop: 4 }}>{L.weekVal(result.weeks, result.days)}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #F6DCE3 0%, #F0C9D5 100%)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#8F4A63", fontWeight: 700, textTransform: "uppercase" }}>{L.tri}</div>
            <div style={{ fontSize: 16, color: COLORS.teal, fontWeight: 800, marginTop: 4 }}>{result.trimester}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #F6DCE3 0%, #F0C9D5 100%)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#8F4A63", fontWeight: 700, textTransform: "uppercase" }}>{L.due}</div>
            <div style={{ fontSize: 15, color: COLORS.teal, fontWeight: 800, marginTop: 4 }}>{fmt(result.dueDate)}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #F6DCE3 0%, #F0C9D5 100%)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#8F4A63", fontWeight: 700, textTransform: "uppercase" }}>{L.left}</div>
            <div style={{ fontSize: 16, color: COLORS.teal, fontWeight: 800, marginTop: 4 }}>{result.daysLeft}</div>
          </div>
        </div>
      )}
      <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 14, marginBottom: 0 }}>{L.disclaimer}</p>
    </Card>
  );
}

/* ---------------- PREGNANCY WEEK STRIP (three stacked rows of weeks) ---------------- */
function WeekStrip({ lang }) {
  const L = lang === "fr"
    ? { title: "Le développement du fœtus, semaine par semaine", week: "Semaine", fruit: "Comparaison", weight: "Poids" }
    : lang === "es"
    ? { title: "El desarrollo del feto, semana a semana", week: "Semana", fruit: "Comparación", weight: "Peso" }
    : { title: "Fetal development, week by week", week: "Week", fruit: "Compared to", weight: "Weight" };

  const palette = [COLORS.pink, COLORS.ochre, COLORS.sage, COLORS.blue];

  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.ochre}`, background: "#FFFDF9" }}>
      <h3 style={{ margin: "0 0 14px", fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: COLORS.teal }}>{L.title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10.5, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.03em" }}>{L.week}</th>
            <th style={{ textAlign: "center", padding: "6px 8px", fontSize: 10.5, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.03em" }}></th>
            <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10.5, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.03em" }}>{L.fruit}</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10.5, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.03em" }}>{L.weight}</th>
          </tr>
        </thead>
        <tbody>
          {PREGNANCY_WEEKS.map((w, i) => {
            const c = palette[i % palette.length];
            return (
              <tr key={w.w} style={{ background: i % 2 ? `${c}14` : "transparent" }}>
                <td style={{ padding: "9px 8px", borderRadius: "10px 0 0 10px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: 30, height: 24, borderRadius: 8, background: c, color: "#fff",
                    fontSize: 11.5, fontWeight: 800, padding: "0 8px",
                  }}>{w.w}</span>
                </td>
                <td style={{ padding: "9px 4px", textAlign: "center" }}>
                  <Illustration type={w.icon} size={30} />
                </td>
                <td style={{ padding: "9px 8px", fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{w.compare[lang]}</td>
                <td style={{ padding: "9px 8px", textAlign: "right", borderRadius: "0 10px 10px 0" }}>
                  <span style={{ fontSize: 13, color: c, fontWeight: 800 }}>{w.weight[lang]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/* ---------------- DAILY TRACKER (feeding, sleep, diaper, kicks, contractions) ---------------- */
function formatDuration(ms, lang) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatClock(date, lang) {
  return date.toLocaleTimeString(lang === "fr" ? "fr-CA" : "en-CA", { hour: "2-digit", minute: "2-digit" });
}

function TrackerLogList({ entries, emptyLabel }) {
  if (entries.length === 0) return (
    <div style={{
      textAlign: "center", padding: "16px 12px", marginTop: 14, borderRadius: 12,
      border: `1px dashed ${COLORS.line}`, background: COLORS.cream,
    }}>
      <p style={{ fontSize: 12.5, color: COLORS.muted, fontStyle: "italic", margin: 0 }}>{emptyLabel}</p>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
      {entries.slice().reverse().map((e, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: COLORS.cream, borderRadius: 10, padding: "9px 13px", fontSize: 13,
        }}>
          <span style={{ color: COLORS.text, fontWeight: 600 }}>{e.label}</span>
          <span style={{ color: COLORS.muted }}>{e.detail}</span>
        </div>
      ))}
    </div>
  );
}

function FeedingTracker({ lang, session }) {
  const emptyLabel = lang === "fr" ? "Aucune entrée pour l'instant." : lang === "es" ? "Aún no hay entradas." : "No entries yet.";
  const [trackSession, setTrackSession] = useState(null); // { side, start }
  const [log, setLog] = useState([]);
  const hasSession = !!(session?.access_token && session?.user?.id);
  const M = lang === "fr"
    ? { left: "Sein gauche", right: "Sein droit", bottle: "Biberon", stop: "Arrêter", inProgress: "En cours" }
    : lang === "es"
    ? { left: "Seno izquierdo", right: "Seno derecho", bottle: "Biberón", stop: "Detener", inProgress: "En curso" }
    : { left: "Left breast", right: "Right breast", bottle: "Bottle", stop: "Stop", inProgress: "In progress" };

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchTrackerEntries(session.user.id, "feeding", session.access_token)
      .then((rows) => setLog(rows.map(mapTrackerEntryRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const persist = (entry) => {
    if (hasSession) supabaseAddTrackerEntry("feeding", entry, session.user.id, session.access_token).catch(() => {});
  };

  const start = (side) => setTrackSession({ side, start: new Date() });
  const stop = () => {
    if (!trackSession) return;
    const durationMs = new Date() - trackSession.start;
    const entry = { label: trackSession.side, detail: `${formatClock(trackSession.start, lang)} · ${formatDuration(durationMs, lang)}` };
    setLog((l) => [...l, entry]);
    persist(entry);
    setTrackSession(null);
  };
  const logBottle = () => {
    const entry = { label: M.bottle, detail: formatClock(new Date(), lang) };
    setLog((l) => [...l, entry]);
    persist(entry);
  };

  return (
    <Card>
      <div style={{ background: "#FDF0F3", borderRadius: 18, padding: "16px", textAlign: "center", marginBottom: 16 }}>
        <FeedingHeroIllu size={130} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        {[M.left, M.right].map((side) => (
          <button key={side} onClick={() => (trackSession?.side === side ? stop() : start(side))} style={{
            flex: 1, minWidth: 130, padding: "14px 10px", borderRadius: 14, border: "none", cursor: "pointer",
            background: trackSession?.side === side ? COLORS.pink : "#FDF0F3", color: trackSession?.side === side ? "#fff" : COLORS.pink,
            fontWeight: 700, fontSize: 14,
          }}>
            {side}{trackSession?.side === side ? ` · ${formatDuration(new Date() - trackSession.start, lang)} — ${M.stop}` : ""}
          </button>
        ))}
      </div>
      <button onClick={logBottle} style={{
        width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "#fff",
        color: COLORS.teal, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
      }}>+ {M.bottle}</button>
      <TrackerLogList entries={log} emptyLabel={emptyLabel} />
    </Card>
  );
}

function SleepTracker({ lang, session }) {
  const emptyLabel = lang === "fr" ? "Aucune entrée pour l'instant." : lang === "es" ? "Aún no hay entradas." : "No entries yet.";
  const [trackSession, setTrackSession] = useState(null);
  const [log, setLog] = useState([]);
  const hasSession = !!(session?.access_token && session?.user?.id);
  const M = lang === "fr" ? { start: "Bébé s'endort", stop: "Bébé se réveille" } : lang === "es" ? { start: "El bebé se duerme", stop: "El bebé se despierta" } : { start: "Baby falls asleep", stop: "Baby wakes up" };

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchTrackerEntries(session.user.id, "sleep", session.access_token)
      .then((rows) => setLog(rows.map(mapTrackerEntryRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const toggle = () => {
    if (trackSession) {
      const durationMs = new Date() - trackSession.start;
      const entry = { label: formatClock(trackSession.start, lang), detail: formatDuration(durationMs, lang) };
      setLog((l) => [...l, entry]);
      if (hasSession) supabaseAddTrackerEntry("sleep", entry, session.user.id, session.access_token).catch(() => {});
      setTrackSession(null);
    } else {
      setTrackSession({ start: new Date() });
    }
  };

  return (
    <Card>
      <div style={{ background: "#EAF2F8", borderRadius: 18, padding: "16px", textAlign: "center", marginBottom: 16 }}>
        <SleepHeroIllu size={130} />
      </div>
      <button onClick={toggle} style={{
        width: "100%", padding: "18px", borderRadius: 16, border: "none", cursor: "pointer",
        background: trackSession ? COLORS.blue : "#EAF2F8", color: trackSession ? "#fff" : COLORS.blue,
        fontWeight: 800, fontSize: 15,
      }}>
        {trackSession ? `${M.stop} · ${formatDuration(new Date() - trackSession.start, lang)}` : M.start}
      </button>
      <TrackerLogList entries={log} emptyLabel={emptyLabel} />
    </Card>
  );
}

function DiaperTracker({ lang, session }) {
  const emptyLabel = lang === "fr" ? "Aucune entrée pour l'instant." : lang === "es" ? "Aún no hay entradas." : "No entries yet.";
  const [log, setLog] = useState([]);
  const hasSession = !!(session?.access_token && session?.user?.id);
  const M = lang === "fr" ? { pee: "Pipi", poop: "Selle", both: "Les deux" } : lang === "es" ? { pee: "Pipí", poop: "Popó", both: "Ambos" } : { pee: "Wet", poop: "Dirty", both: "Both" };

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchTrackerEntries(session.user.id, "diaper", session.access_token)
      .then((rows) => setLog(rows.map(mapTrackerEntryRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const add = (type) => {
    const entry = { label: type, detail: formatClock(new Date(), lang) };
    setLog((l) => [...l, entry]);
    if (hasSession) supabaseAddTrackerEntry("diaper", entry, session.user.id, session.access_token).catch(() => {});
  };

  return (
    <Card>
      <div style={{ background: "#F0F5EC", borderRadius: 18, padding: "16px", textAlign: "center", marginBottom: 16 }}>
        <DiaperHeroIllu size={130} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[M.pee, M.poop, M.both].map((type) => (
          <button key={type} onClick={() => add(type)} style={{
            flex: 1, minWidth: 100, padding: "16px 10px", borderRadius: 14, border: "none", cursor: "pointer",
            background: "#F0F5EC", color: COLORS.sage, fontWeight: 700, fontSize: 14,
          }}>{type}</button>
        ))}
      </div>
      <TrackerLogList entries={log} emptyLabel={emptyLabel} />
    </Card>
  );
}

function KickTracker({ lang, session }) {
  const emptyLabel = lang === "fr" ? "Aucune entrée pour l'instant." : lang === "es" ? "Aún no hay entradas." : "No entries yet.";
  const [count, setCount] = useState(0);
  const [sessionStart, setSessionStart] = useState(null);
  const [log, setLog] = useState([]);
  const hasSession = !!(session?.access_token && session?.user?.id);
  const M = lang === "fr"
    ? { title: "Compte-coups de bébé", subtitle: "Chaque fois que vous sentez bébé bouger ou donner un coup, touchez le bouton — ça compte les mouvements pour surveiller sa forme.", add: "+1 coup", reset: "Terminer la séance", tip: "Le repère habituel est d'environ 10 coups en moins de 2 heures. Si vous en sentez beaucoup moins que d'habitude, contactez votre professionnel de la santé." }
    : lang === "es"
    ? { title: "Contador de movimientos del bebé", subtitle: "Cada vez que sientas al bebé moverse o dar una patada, toca el botón — esto cuenta los movimientos para vigilar su bienestar.", add: "+1 movimiento", reset: "Terminar la sesión", tip: "La referencia habitual es de unos 10 movimientos en menos de 2 horas. Si sientes muchos menos de lo habitual, contacta a tu profesional de la salud." }
    : { title: "Baby kick counter", subtitle: "Every time you feel baby move or kick, tap the button — this counts baby's movements to help monitor their wellbeing.", add: "+1 kick", reset: "End session", tip: "A common guideline is about 10 kicks in under 2 hours. If you notice far fewer than usual, contact your healthcare provider." };

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchTrackerEntries(session.user.id, "kick", session.access_token)
      .then((rows) => setLog(rows.map(mapTrackerEntryRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const add = () => { if (!sessionStart) setSessionStart(new Date()); setCount((c) => c + 1); };
  const reset = () => {
    if (sessionStart) {
      const entry = { label: `${count} ${lang === "fr" ? "coups" : lang === "es" ? "movimientos" : "kicks"}`, detail: `${formatClock(sessionStart, lang)} → ${formatClock(new Date(), lang)}` };
      setLog((l) => [...l, entry]);
      if (hasSession) supabaseAddTrackerEntry("kick", entry, session.user.id, session.access_token).catch(() => {});
    }
    setCount(0); setSessionStart(null);
  };

  return (
    <Card>
      <div style={{ background: "#FBF3E4", borderRadius: 18, padding: "16px", textAlign: "center", marginBottom: 16 }}>
        <KickHeroIllu size={130} />
      </div>
      <h3 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: 17, color: COLORS.teal }}>{M.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: COLORS.muted, lineHeight: 1.5 }}>{M.subtitle}</p>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 48, color: COLORS.ochre, fontWeight: 700 }}>{count}</div>
        {sessionStart && <div style={{ fontSize: 12.5, color: COLORS.muted }}>{lang === "fr" ? "Depuis" : lang === "es" ? "Desde" : "Since"} {formatClock(sessionStart, lang)}</div>}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={add} style={{ flex: 1, padding: "16px", borderRadius: 14, border: "none", background: COLORS.ochre, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>{M.add}</button>
        <button onClick={reset} disabled={!sessionStart} style={{ padding: "16px 18px", borderRadius: 14, border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.muted, fontWeight: 700, fontSize: 13, cursor: sessionStart ? "pointer" : "default", opacity: sessionStart ? 1 : 0.5 }}>{M.reset}</button>
      </div>
      <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5, marginTop: 12 }}>{M.tip}</p>
      <TrackerLogList entries={log} emptyLabel={emptyLabel} />
    </Card>
  );
}

function ContractionTracker({ lang, session }) {
  const emptyLabel = lang === "fr" ? "Aucune entrée pour l'instant." : lang === "es" ? "Aún no hay entradas." : "No entries yet.";
  const [active, setActive] = useState(null);
  const [log, setLog] = useState([]);
  const hasSession = !!(session?.access_token && session?.user?.id);
  const M = lang === "fr"
    ? { start: "Début de contraction", stop: "Fin de contraction", duration: "Durée", interval: "Depuis la précédente",
        tip: "La règle du 5-1-1 (contractions aux 5 minutes, durant 1 minute, depuis 1 heure) est souvent utilisée comme repère pour se rendre à l'hôpital — validez toujours avec votre professionnel de la santé." }
    : lang === "es"
    ? { start: "Inicio de contracción", stop: "Fin de contracción", duration: "Duración", interval: "Desde la anterior",
        tip: "La regla del 5-1-1 (contracciones cada 5 minutos, con duración de 1 minuto, durante 1 hora) se usa a menudo como referencia para ir al hospital — confirma siempre con tu profesional de la salud." }
    : { start: "Start contraction", stop: "End contraction", duration: "Duration", interval: "Since previous",
        tip: "The 5-1-1 rule (contractions every 5 minutes, lasting 1 minute, for 1 hour) is often used as a guideline for heading to the hospital — always confirm with your healthcare provider." };

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchTrackerEntries(session.user.id, "contraction", session.access_token)
      .then((rows) => setLog(rows.map(mapTrackerEntryRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const toggle = () => {
    if (active) {
      const durationMs = new Date() - active.start;
      const prevStart = log.length > 0 ? log[log.length - 1].start : null;
      const intervalMs = prevStart ? active.start - prevStart : null;
      const entry = {
        start: active.start,
        label: formatClock(active.start, lang),
        detail: `${M.duration} ${formatDuration(durationMs, lang)}${intervalMs ? ` · ${M.interval} ${formatDuration(intervalMs, lang)}` : ""}`,
      };
      setLog((l) => [...l, entry]);
      if (hasSession) supabaseAddTrackerEntry("contraction", entry, session.user.id, session.access_token).catch(() => {});
      setActive(null);
    } else {
      setActive({ start: new Date() });
    }
  };

  return (
    <Card>
      <div style={{ background: "#FDF0F3", borderRadius: 18, padding: "16px", textAlign: "center", marginBottom: 16 }}>
        <ContractionHeroIllu size={130} />
      </div>
      <button onClick={toggle} style={{
        width: "100%", padding: "18px", borderRadius: 16, border: "none", cursor: "pointer",
        background: active ? COLORS.pink : "#FDF0F3", color: active ? "#fff" : COLORS.pink,
        fontWeight: 800, fontSize: 15,
      }}>
        {active ? `${M.stop} · ${formatDuration(new Date() - active.start, lang)}` : M.start}
      </button>
      <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5, marginTop: 12 }}>{M.tip}</p>
      <TrackerLogList entries={log} emptyLabel={emptyLabel} />
    </Card>
  );
}

/* ---------------- POSTPARTUM MOOD CHECK-IN (non-diagnostic, informational) ---------------- */
function MoodCheckIn({ lang }) {
  const questions = lang === "fr"
    ? [
        { q: "Comment décririez-vous votre humeur cette semaine ?", opts: ["Plutôt bien", "Variable", "Difficile", "Très difficile"] },
        { q: "Arrivez-vous à apprécier les choses comme avant ?", opts: ["Oui, comme d'habitude", "Un peu moins", "Rarement", "Presque plus"] },
        { q: "Vous sentez-vous dépassée ou incapable de faire face ?", opts: ["Rarement", "Parfois", "Souvent", "Presque toujours"] },
        { q: "Avez-vous du mal à dormir même quand bébé dort ?", opts: ["Rarement", "Parfois", "Souvent", "Presque toujours"] },
        { q: "Avez-vous eu des pensées de vous faire du mal ou de faire du mal à votre bébé ?", opts: ["Non", "Occasionnellement", "Oui"] },
      ]
    : lang === "es"
    ? [
        { q: "¿Cómo describirías tu estado de ánimo esta semana?", opts: ["Bastante bien", "Variable", "Difícil", "Muy difícil"] },
        { q: "¿Logras disfrutar las cosas como antes?", opts: ["Sí, como siempre", "Un poco menos", "Raramente", "Casi nada"] },
        { q: "¿Te sientes abrumada o incapaz de afrontar las cosas?", opts: ["Raramente", "A veces", "Seguido", "Casi siempre"] },
        { q: "¿Te cuesta dormir incluso cuando el bebé duerme?", opts: ["Raramente", "A veces", "Seguido", "Casi siempre"] },
        { q: "¿Has tenido pensamientos de hacerte daño a ti misma o a tu bebé?", opts: ["No", "Ocasionalmente", "Sí"] },
      ]
    : [
        { q: "How would you describe your mood this week?", opts: ["Pretty good", "Up and down", "Difficult", "Very difficult"] },
        { q: "Are you able to enjoy things as much as before?", opts: ["Yes, as usual", "A little less", "Rarely", "Almost not at all"] },
        { q: "Do you feel overwhelmed or unable to cope?", opts: ["Rarely", "Sometimes", "Often", "Almost always"] },
        { q: "Do you have trouble sleeping even when baby sleeps?", opts: ["Rarely", "Sometimes", "Often", "Almost always"] },
        { q: "Have you had thoughts of harming yourself or your baby?", opts: ["No", "Occasionally", "Yes"] },
      ];

  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const allAnswered = answers.every((a) => a !== null);
  const safetyFlag = answers[4] !== null && answers[4] !== 0;

  const L = lang === "fr"
    ? {
        title: "Comment vous sentez-vous ces jours-ci ?", subtitle: "Un court auto-questionnaire pour prendre le pouls de votre humeur — ce n'est pas un outil diagnostique.",
        submit: "Voir mon résultat", retake: "Refaire le questionnaire",
        low: "Vos réponses ne montrent pas de signe particulier d'alerte en ce moment. Continuez de prendre soin de vous, et n'hésitez pas à en reparler si les choses changent.",
        mid: "Vos réponses suggèrent que les dernières semaines ont été difficiles. Ce n'est ni une honte ni un échec — en parler à votre médecin, sage-femme, ou une ligne d'écoute pourrait vraiment aider.",
        high: "Vos réponses suggèrent un niveau de détresse important. Nous vous encourageons fortement à en parler rapidement à un professionnel de la santé.",
        crisisTitle: "Si vous avez des pensées de vous faire du mal ou de faire du mal à votre bébé",
        crisisText: "Vous n'êtes pas seule, et de l'aide est disponible immédiatement.",
        resources: ["988 — Ligne de prévention du suicide (appel ou texto, disponible 24/7 partout au Canada)", "811, option 2 — Info-Social Québec, soutien psychosocial 24/7", "En cas d'urgence immédiate : 911"],
        disclaimer: "Cet outil est informatif seulement et ne remplace pas une évaluation professionnelle.",
      }
    : lang === "es"
    ? {
        title: "¿Cómo te has sentido últimamente?", subtitle: "Un breve autocuestionario para tomar el pulso a tu estado de ánimo — no es una herramienta diagnóstica.",
        submit: "Ver mi resultado", retake: "Volver a hacer el cuestionario",
        low: "Tus respuestas no muestran una señal de alerta particular en este momento. Sigue cuidándote, y no dudes en volver a revisarlo si las cosas cambian.",
        mid: "Tus respuestas sugieren que las últimas semanas han sido difíciles. Esto no es vergonzoso ni un fracaso — hablar con tu médico, partera, o una línea de apoyo realmente podría ayudar.",
        high: "Tus respuestas sugieren un nivel de angustia importante. Te animamos fuertemente a hablar pronto con un profesional de la salud.",
        crisisTitle: "Si has tenido pensamientos de hacerte daño a ti misma o a tu bebé",
        crisisText: "No estás sola, y hay ayuda disponible de inmediato.",
        resources: ["988 — Línea de prevención del suicidio (llamada o mensaje de texto, disponible 24/7 en todo Canadá)", "811, opción 2 — Info-Social Québec, apoyo psicosocial 24/7", "En caso de emergencia inmediata: 911"],
        disclaimer: "Esta herramienta es solo informativa y no reemplaza una evaluación profesional.",
      }
    : {
        title: "How have you been feeling lately?", subtitle: "A short self check-in to take stock of your mood — this is not a diagnostic tool.",
        submit: "See my result", retake: "Retake the check-in",
        low: "Your answers don't show a particular warning sign right now. Keep taking care of yourself, and feel free to check in again if things change.",
        mid: "Your answers suggest the past weeks have been tough. That's not shameful or a failure — talking to your doctor, midwife, or a support line could really help.",
        high: "Your answers suggest a significant level of distress. We strongly encourage you to talk to a healthcare professional soon.",
        crisisTitle: "If you're having thoughts of harming yourself or your baby",
        crisisText: "You are not alone, and help is available right now.",
        resources: ["988 — Suicide Crisis Helpline (call or text, available 24/7 across Canada)", "811 — health/psychosocial support line", "For immediate danger: 911"],
        disclaimer: "This tool is informational only and does not replace a professional assessment.",
      };

  const score = answers.reduce((sum, a, i) => sum + (a ?? 0) * (i === 4 ? 2 : 1), 0);
  const resultMsg = safetyFlag ? L.high : score >= 8 ? L.mid : L.low;

  if (submitted) {
    return (
      <Card style={{ marginTop: 8, background: safetyFlag ? "#FDECEC" : "#F0F5EC", border: "none" }}>
        <p style={{ fontSize: 14.5, color: COLORS.text, lineHeight: 1.6, margin: "0 0 14px" }}>{resultMsg}</p>
        {safetyFlag && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
            <p style={{ fontWeight: 800, color: "#B3261E", fontSize: 14, margin: "0 0 4px" }}>{L.crisisTitle}</p>
            <p style={{ fontSize: 13, color: COLORS.text, margin: "0 0 10px" }}>{L.crisisText}</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>
              {L.resources.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        <button onClick={() => { setSubmitted(false); setAnswers(Array(questions.length).fill(null)); }} style={{
          background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.teal, borderRadius: 10,
          padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>{L.retake}</button>
        <p style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 12 }}>{L.disclaimer}</p>
      </Card>
    );
  }

  return (
    <Card style={{ marginTop: 8 }}>
      <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: COLORS.teal, margin: "0 0 4px" }}>{L.title}</h3>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 16px" }}>{L.subtitle}</p>
      {questions.map((item, qi) => (
        <div key={qi} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>{item.q}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {item.opts.map((opt, oi) => (
              <button key={oi} onClick={() => setAnswers((a) => { const next = [...a]; next[qi] = oi; return next; })} style={{
                padding: "8px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${answers[qi] === oi ? COLORS.teal : COLORS.line}`,
                background: answers[qi] === oi ? COLORS.teal : "#fff",
                color: answers[qi] === oi ? "#fff" : COLORS.text,
              }}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
      <button disabled={!allAnswered} onClick={() => setSubmitted(true)} style={{
        width: "100%", padding: "12px", borderRadius: 12, border: "none", cursor: allAnswered ? "pointer" : "default",
        background: allAnswered ? COLORS.teal : COLORS.line, color: "#fff", fontWeight: 700, fontSize: 14,
        opacity: allAnswered ? 1 : 0.7,
      }}>{L.submit}</button>
      <p style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 12 }}>{L.disclaimer}</p>
    </Card>
  );
}

/* ---------------- VACCINE CALENDAR (general schedule, checklist) ---------------- */
const VACCINE_REGIONS = [
  { key: "quebec", label: { fr: "Québec", en: "Quebec", es: "Quebec" } },
  { key: "canada", label: { fr: "Canada (autres provinces)", en: "Canada (other provinces)", es: "Canadá (otras provincias)" } },
  { key: "france", label: { fr: "France", en: "France", es: "Francia" } },
  { key: "usa", label: { fr: "États-Unis", en: "United States", es: "Estados Unidos" } },
];

const VACCINE_SCHEDULES = {
  quebec: [
    { age: { fr: "Naissance", en: "Birth", es: "Nacimiento" }, vaccines: { fr: "Hépatite B (à la naissance, en pouponnière)", en: "Hepatitis B (at birth, in maternity ward)", es: "Hepatitis B (al nacer, en la sala de maternidad)" } },
    { age: { fr: "2 mois", en: "2 months", es: "2 meses" }, vaccines: { fr: "DCaT-VPI-Hib-HB, pneumocoque, rotavirus", en: "DTaP-IPV-Hib-HepB, pneumococcal, rotavirus", es: "DTaP-VPI-Hib-HB, neumococo, rotavirus" } },
    { age: { fr: "4 mois", en: "4 months", es: "4 meses" }, vaccines: { fr: "DCaT-VPI-Hib-HB, pneumocoque, rotavirus", en: "DTaP-IPV-Hib-HepB, pneumococcal, rotavirus", es: "DTaP-VPI-Hib-HB, neumococo, rotavirus" } },
    { age: { fr: "12 mois", en: "12 months", es: "12 meses" }, vaccines: { fr: "RRO, pneumocoque (rappel), méningocoque C", en: "MMR, pneumococcal (booster), meningococcal C", es: "SPR, neumococo (refuerzo), meningococo C" } },
    { age: { fr: "18 mois", en: "18 months", es: "18 meses" }, vaccines: { fr: "DCaT-VPI-Hib (rappel), RRO-varicelle (rappel)", en: "DTaP-IPV-Hib (booster), MMR-varicella (booster)", es: "DTaP-VPI-Hib (refuerzo), SPR-varicela (refuerzo)" } },
    { age: { fr: "4-6 ans", en: "4-6 years", es: "4-6 años" }, vaccines: { fr: "DCaT-VPI (rappel)", en: "DTaP-IPV (booster)", es: "DTaP-VPI (refuerzo)" } },
  ],
  canada: [
    { age: { fr: "Naissance", en: "Birth", es: "Nacimiento" }, vaccines: { fr: "Hépatite B (selon la province)", en: "Hepatitis B (varies by province)", es: "Hepatitis B (según la provincia)" } },
    { age: { fr: "2 mois", en: "2 months", es: "2 meses" }, vaccines: { fr: "DCaT-VPI-Hib, pneumocoque, rotavirus", en: "DTaP-IPV-Hib, pneumococcal, rotavirus", es: "DTaP-VPI-Hib, neumococo, rotavirus" } },
    { age: { fr: "4 mois", en: "4 months", es: "4 meses" }, vaccines: { fr: "DCaT-VPI-Hib, pneumocoque, rotavirus", en: "DTaP-IPV-Hib, pneumococcal, rotavirus", es: "DTaP-VPI-Hib, neumococo, rotavirus" } },
    { age: { fr: "6 mois", en: "6 months", es: "6 meses" }, vaccines: { fr: "DCaT-VPI-Hib, rotavirus (selon le vaccin)", en: "DTaP-IPV-Hib, rotavirus (depending on vaccine)", es: "DTaP-VPI-Hib, rotavirus (según la vacuna)" } },
    { age: { fr: "12 mois", en: "12 months", es: "12 meses" }, vaccines: { fr: "RRO, pneumocoque (rappel), méningocoque C", en: "MMR, pneumococcal (booster), meningococcal C", es: "SPR, neumococo (refuerzo), meningococo C" } },
    { age: { fr: "18 mois", en: "18 months", es: "18 meses" }, vaccines: { fr: "DCaT-VPI-Hib (rappel), RRO-varicelle (rappel)", en: "DTaP-IPV-Hib (booster), MMR-varicella (booster)", es: "DTaP-VPI-Hib (refuerzo), SPR-varicela (refuerzo)" } },
    { age: { fr: "4-6 ans", en: "4-6 years", es: "4-6 años" }, vaccines: { fr: "DCaT-VPI (rappel)", en: "DTaP-IPV (booster)", es: "DTaP-VPI (refuerzo)" } },
  ],
  france: [
    { age: { fr: "2 mois", en: "2 months", es: "2 meses" }, vaccines: { fr: "Hexavalent (DTCaP-Hib-HépB), pneumocoque, méningocoque B", en: "Hexavalent (DTaP-Hib-HepB), pneumococcal, meningococcal B", es: "Hexavalente (DTaP-Hib-HepB), neumococo, meningococo B" } },
    { age: { fr: "3 mois", en: "3 months", es: "3 meses" }, vaccines: { fr: "Méningocoque B (2e dose)", en: "Meningococcal B (2nd dose)", es: "Meningococo B (2ª dosis)" } },
    { age: { fr: "4 mois", en: "4 months", es: "4 meses" }, vaccines: { fr: "Hexavalent, pneumocoque", en: "Hexavalent, pneumococcal", es: "Hexavalente, neumococo" } },
    { age: { fr: "6 mois", en: "6 months", es: "6 meses" }, vaccines: { fr: "Méningocoque ACWY", en: "Meningococcal ACWY", es: "Meningococo ACWY" } },
    { age: { fr: "11 mois", en: "11 months", es: "11 meses" }, vaccines: { fr: "Hexavalent (rappel), pneumocoque (rappel)", en: "Hexavalent (booster), pneumococcal (booster)", es: "Hexavalente (refuerzo), neumococo (refuerzo)" } },
    { age: { fr: "12 mois", en: "12 months", es: "12 meses" }, vaccines: { fr: "ROR, méningocoque B (rappel), méningocoque ACWY (rappel)", en: "MMR, meningococcal B (booster), meningococcal ACWY (booster)", es: "SPR, meningococo B (refuerzo), meningococo ACWY (refuerzo)" } },
    { age: { fr: "16-18 mois", en: "16-18 months", es: "16-18 meses" }, vaccines: { fr: "ROR (2e dose)", en: "MMR (2nd dose)", es: "SPR (2ª dosis)" } },
    { age: { fr: "6 ans", en: "6 years", es: "6 años" }, vaccines: { fr: "DTCaP (rappel)", en: "DTaP (booster)", es: "DTaP (refuerzo)" } },
  ],
  usa: [
    { age: { fr: "Naissance", en: "Birth", es: "Nacimiento" }, vaccines: { fr: "Hépatite B (1re dose)", en: "Hepatitis B (1st dose)", es: "Hepatitis B (1ª dosis)" } },
    { age: { fr: "2 mois", en: "2 months", es: "2 meses" }, vaccines: { fr: "DTaP, Hib, VPI, pneumocoque, rotavirus", en: "DTaP, Hib, IPV, pneumococcal, rotavirus", es: "DTaP, Hib, VPI, neumococo, rotavirus" } },
    { age: { fr: "4 mois", en: "4 months", es: "4 meses" }, vaccines: { fr: "DTaP, Hib, VPI, pneumocoque, rotavirus", en: "DTaP, Hib, IPV, pneumococcal, rotavirus", es: "DTaP, Hib, VPI, neumococo, rotavirus" } },
    { age: { fr: "6 mois", en: "6 months", es: "6 meses" }, vaccines: { fr: "DTaP, pneumocoque, hépatite B (3e dose), grippe annuelle", en: "DTaP, pneumococcal, hepatitis B (3rd dose), annual flu", es: "DTaP, neumococo, hepatitis B (3ª dosis), gripe anual" } },
    { age: { fr: "12-15 mois", en: "12-15 months", es: "12-15 meses" }, vaccines: { fr: "Hib (rappel), pneumocoque (rappel), RRO, varicelle", en: "Hib (booster), pneumococcal (booster), MMR, varicella", es: "Hib (refuerzo), neumococo (refuerzo), SPR, varicela" } },
    { age: { fr: "15-18 mois", en: "15-18 months", es: "15-18 meses" }, vaccines: { fr: "DTaP (rappel)", en: "DTaP (booster)", es: "DTaP (refuerzo)" } },
    { age: { fr: "4-6 ans", en: "4-6 years", es: "4-6 años" }, vaccines: { fr: "DTaP (rappel), VPI (rappel), RRO (2e dose), varicelle (2e dose)", en: "DTaP (booster), IPV (booster), MMR (2nd dose), varicella (2nd dose)", es: "DTaP (refuerzo), VPI (refuerzo), SPR (2ª dosis), varicela (2ª dosis)" } },
  ],
};

function VaccineCalendar({ lang }) {
  const [checked, setChecked] = useState({});
  const [region, setRegion] = useState(lang === "fr" ? "quebec" : "usa");
  const L = lang === "fr"
    ? {
        title: "Calendrier vaccinal", subtitle: "Choisissez votre pays ou région — cochez au fur et à mesure des rendez-vous.",
        disclaimer: "Les calendriers vaccinaux peuvent changer et varient selon la province ou le pays — suivez toujours le calendrier officiel donné par votre professionnel de la santé ou votre clinique locale.",
        usaExtra: "Le calendrier américain a fait l'objet de changements et de contestations judiciaires récentes — vérifiez la version la plus à jour sur cdc.gov ou avec votre pédiatre.",
      }
    : lang === "es"
    ? {
        title: "Calendario de vacunación", subtitle: "Elige tu país o región — marca cada elemento a medida que ocurran las citas.",
        disclaimer: "Los calendarios de vacunación pueden cambiar y varían según la provincia o el país — sigue siempre el calendario oficial dado por tu profesional de la salud o tu clínica local.",
        usaExtra: "El calendario estadounidense ha tenido cambios y disputas legales recientes — verifica la versión más actualizada en cdc.gov o con tu pediatra.",
      }
    : {
        title: "Vaccine calendar", subtitle: "Choose your country or region — check items off as appointments happen.",
        disclaimer: "Vaccine schedules can change and vary by province or country — always follow the official schedule given by your healthcare provider or local clinic.",
        usaExtra: "The U.S. schedule has recently seen changes and legal challenges — check the latest version at cdc.gov or with your pediatrician.",
      };

  const schedule = VACCINE_SCHEDULES[region];

  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.muted }}>{L.subtitle}</p>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {VACCINE_REGIONS.map((r) => (
          <button key={r.key} onClick={() => { setRegion(r.key); setChecked({}); }} style={{
            padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${region === r.key ? COLORS.teal : COLORS.line}`,
            background: region === r.key ? COLORS.teal : "#fff",
            color: region === r.key ? "#fff" : COLORS.text,
          }}>{r.label[lang]}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {schedule.map((row, i) => (
          <label key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10, background: checked[i] ? "#F0F5EC" : COLORS.cream,
            borderRadius: 12, padding: "10px 13px", cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={!!checked[i]}
              onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
              style={{ marginTop: 2, accentColor: COLORS.sage, width: 16, height: 16, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.teal }}>{row.age[lang]}</div>
              <div style={{ fontSize: 12.5, color: COLORS.text, marginTop: 2 }}>{row.vaccines[lang]}</div>
            </div>
          </label>
        ))}
      </div>
      {region === "usa" && (
        <p style={{ fontSize: 11, color: "#B3261E", marginTop: 14, lineHeight: 1.5, fontWeight: 600 }}>{L.usaExtra}</p>
      )}
      <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10, lineHeight: 1.5 }}>{L.disclaimer}</p>
    </Card>
  );
}

/* ---------------- GROWTH TRACKER (weight/height log + simple trend line) ---------------- */
function GrowthHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 180 110" width={size} height={size * 0.61}>
      {/* règle murale avec graduations */}
      <path d="M20 8 V100" stroke="#C9B79A" strokeWidth="3" strokeLinecap="round" />
      {[8, 22, 36, 50, 64, 78, 92].map((y, i) => (
        <path key={i} d={`M14 ${y} H26`} stroke="#C9B79A" strokeWidth="2" />
      ))}
      {/* ligne de sol */}
      <path d="M8 100 H176" stroke="#E7E1D3" strokeWidth="3" />
      {/* trois silhouettes qui grandissent */}
      <g>
        <circle cx="70" cy="80" r="7" fill={COLORS.sage} />
        <path d="M62 100 Q70 86 78 100 Z" fill={COLORS.sage} />
      </g>
      <g>
        <circle cx="112" cy="62" r="8.5" fill={COLORS.ochre} />
        <path d="M101 100 Q112 74 123 100 Z" fill={COLORS.ochre} />
      </g>
      <g>
        <circle cx="156" cy="40" r="10" fill={COLORS.blue} />
        <path d="M142 100 Q156 50 170 100 Z" fill={COLORS.blue} />
      </g>
      {/* flèche vers le haut */}
      <path d="M150 20 L162 6 L174 20" stroke={COLORS.teal} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeedingHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 100" width={size} height={size * 0.625}>
      <circle cx="80" cy="50" r="42" fill="#FDF0F3" />
      {/* biberon */}
      <rect x="60" y="30" width="20" height="42" rx="8" fill="#fff" stroke={COLORS.pink} strokeWidth="2" />
      <rect x="65" y="20" width="10" height="14" rx="3" fill={COLORS.pink} />
      <rect x="67" y="12" width="6" height="10" rx="2" fill="#F2DCC0" />
      <path d="M62 40 H78 M62 48 H78 M62 56 H78" stroke={COLORS.pink} strokeWidth="1.4" opacity="0.6" />
      {/* petit coeur qui flotte */}
      <text x="30" y="30" fontSize="16" fill={COLORS.pink}>♥</text>
      <text x="118" y="70" fontSize="12" fill={COLORS.pink} opacity="0.7">♥</text>
      {/* goutte de lait */}
      <path d="M100 55 Q104 62 100 68 Q96 62 100 55 Z" fill="#fff" stroke={COLORS.pink} strokeWidth="1.5" />
    </svg>
  );
}

function DiaperHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 100" width={size} height={size * 0.625}>
      <circle cx="80" cy="50" r="42" fill="#F0F5EC" />
      {/* couche stylisée */}
      <path d="M50 42 Q80 30 110 42 L106 62 Q80 74 54 62 Z" fill="#fff" stroke={COLORS.sage} strokeWidth="2" />
      <path d="M50 42 Q46 50 50 58" stroke={COLORS.sage} strokeWidth="2" fill="none" />
      <path d="M110 42 Q114 50 110 58" stroke={COLORS.sage} strokeWidth="2" fill="none" />
      <circle cx="65" cy="50" r="3" fill={COLORS.ochre} />
      <circle cx="95" cy="50" r="3" fill={COLORS.ochre} />
      {/* petites étoiles */}
      <text x="34" y="30" fontSize="12" fill={COLORS.sage}>✦</text>
      <text x="120" y="72" fontSize="10" fill={COLORS.sage}>✦</text>
    </svg>
  );
}

function ContractionHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 100" width={size} height={size * 0.625}>
      <circle cx="80" cy="50" r="42" fill="#FDF0F3" />
      {/* ligne de pouls */}
      <path d="M28 55 H55 L62 35 L72 68 L80 45 L86 55 H132" stroke={COLORS.pink} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* petite horloge */}
      <circle cx="118" cy="30" r="12" fill="#fff" stroke={COLORS.pink} strokeWidth="2" />
      <path d="M118 23 V30 L123 33" stroke={COLORS.pink} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function ContactHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 100" width={size} height={size * 0.625}>
      {/* enveloppe */}
      <rect x="34" y="26" width="92" height="62" rx="10" fill="#fff" stroke={COLORS.ochre} strokeWidth="2.5" />
      <path d="M36 30 L80 62 L124 30" stroke={COLORS.ochre} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* petit coeur en cachet */}
      <circle cx="80" cy="58" r="12" fill={COLORS.pink} />
      <text x="80" y="63" fontSize="14" textAnchor="middle" fill="#fff">♥</text>
      {/* avion en papier qui s'envole */}
      <path d="M118 74 L134 68 L120 82 L118 78 L108 76 Z" fill={COLORS.blue} opacity="0.85" />
      {/* petites étoiles */}
      <text x="20" y="24" fontSize="12" fill={COLORS.ochre}>✦</text>
      <text x="138" y="30" fontSize="10" fill={COLORS.ochre} opacity="0.8">✦</text>
      <text x="24" y="76" fontSize="9" fill={COLORS.ochre} opacity="0.6">✦</text>
    </svg>
  );
}

function KickHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 100" width={size} height={size * 0.625}>
      <circle cx="80" cy="50" r="42" fill="#FBF3E4" />
      {/* silhouette de ventre de grossesse, vue de profil */}
      <path
        d="M56 88 Q40 88 38 66 Q36 40 56 26 Q66 19 78 22 Q100 27 106 50 Q110 68 100 80 Q90 90 76 89 Q64 89 56 88 Z"
        fill="#fff" stroke={COLORS.ochre} strokeWidth="2.5"
      />
      {/* nombril */}
      <ellipse cx="90" cy="52" rx="2.5" ry="3.5" fill={COLORS.ochre} opacity="0.35" />
      {/* petite empreinte de pied qui pousse de l'intérieur */}
      <g transform="translate(70 58) rotate(-12)">
        <ellipse cx="0" cy="6" rx="8" ry="11" fill={COLORS.ochre} />
        <circle cx="-6" cy="-7" r="2.6" fill={COLORS.ochre} />
        <circle cx="-2" cy="-9.5" r="2.8" fill={COLORS.ochre} />
        <circle cx="2.5" cy="-9.5" r="2.8" fill={COLORS.ochre} />
        <circle cx="7" cy="-7" r="2.6" fill={COLORS.ochre} />
      </g>
      {/* petites lignes de mouvement autour du coup de pied */}
      <path d="M50 46 Q44 50 48 56" stroke={COLORS.ochre} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M46 60 Q40 62 42 68" stroke={COLORS.ochre} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* petites étoiles autour, effet mouvement */}
      <text x="18" y="34" fontSize="13" fill={COLORS.ochre}>✦</text>
      <text x="126" y="30" fontSize="11" fill={COLORS.ochre} opacity="0.8">✦</text>
      <text x="122" y="78" fontSize="9" fill={COLORS.ochre} opacity="0.6">✦</text>
    </svg>
  );
}

function FamilyTasksHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 100" width={size} height={size * 0.625}>
      <circle cx="80" cy="50" r="42" fill="#F0F5EC" />
      {/* liste avec coches */}
      <rect x="46" y="26" width="68" height="48" rx="8" fill="#fff" stroke={COLORS.sage} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="54" y={36 + i * 12} width="9" height="9" rx="3" fill={i < 2 ? COLORS.sage : "#fff"} stroke={COLORS.sage} strokeWidth="1.6" />
          {i < 2 && <path d={`M56 ${40.5 + i * 12} l2 2 l4 -4`} stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />}
          <path d={`M68 ${40.5 + i * 12} H104`} stroke={COLORS.line} strokeWidth="2" />
        </g>
      ))}
      <text x="26" y="30" fontSize="12" fill={COLORS.sage}>✦</text>
    </svg>
  );
}

function SleepHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 100" width={size} height={size * 0.625}>
      {/* étoiles */}
      <text x="20" y="18" fontSize="10" fill={COLORS.blue}>✦</text>
      <text x="140" y="16" fontSize="8" fill={COLORS.blue}>✦</text>
      <text x="130" y="70" fontSize="7" fill={COLORS.blue}>✦</text>
      <text x="16" y="60" fontSize="7" fill={COLORS.blue}>✦</text>
      {/* grosse lune douce */}
      <path d="M108 44 Q92 40 92 22 Q92 6 108 2 Q94 10 94 24 Q94 40 112 44 Q110 44 108 44 Z" fill="#B9CDE0" />
      {/* nuage douillet en bas */}
      <ellipse cx="80" cy="86" rx="46" ry="14" fill="#EAF2F8" />
      {/* bébé qui dort, emmailloté, sur le nuage */}
      <ellipse cx="60" cy="72" rx="26" ry="18" fill={COLORS.blue} opacity="0.85" />
      <circle cx="60" cy="52" r="15" fill="#F2DCC0" />
      <path d="M47 46 Q60 34 73 46" stroke={COLORS.blue} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M52 52 q3 2 6 0" stroke="#8A6A48" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M62 52 q3 2 6 0" stroke="#8A6A48" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="58" rx="2.5" ry="1.8" fill="#C99A6E" />
      {/* petits z de sommeil */}
      <text x="88" y="42" fontFamily="Georgia, serif" fontSize="13" fill={COLORS.blue} fontStyle="italic">z</text>
      <text x="98" y="30" fontFamily="Georgia, serif" fontSize="10" fill={COLORS.blue} fontStyle="italic">z</text>
      <text x="106" y="20" fontFamily="Georgia, serif" fontSize="7" fill={COLORS.blue} fontStyle="italic">z</text>
    </svg>
  );
}

function JournalCoverIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={size * 0.69}>
      {/* carnet fermé, légèrement de biais */}
      <g transform="rotate(-4 80 55)">
        <rect x="34" y="16" width="92" height="78" rx="8" fill={COLORS.ochre} />
        <rect x="34" y="16" width="10" height="78" rx="4" fill="#B98B36" />
        <rect x="52" y="30" width="56" height="4" rx="2" fill="rgba(255,255,255,0.55)" />
        <rect x="52" y="40" width="40" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
        {/* petit coeur sur la couverture */}
        <text x="90" y="72" fontSize="20" fill="#fff" opacity="0.9">♥</text>
      </g>
      {/* ruban marque-page */}
      <path d="M96 10 L96 44 L104 36 L112 44 L112 10 Z" fill={COLORS.pink} />
      {/* stylo posé dessus */}
      <g transform="rotate(28 60 88)">
        <rect x="30" y="86" width="60" height="7" rx="3.5" fill={COLORS.blue} />
        <path d="M90 86 L100 89.5 L90 93 Z" fill="#DDD" />
        <rect x="26" y="87" width="6" height="5" rx="1.5" fill={COLORS.teal} />
      </g>
      {/* petites étoiles */}
      <text x="18" y="30" fontSize="10" fill={COLORS.ochre}>✦</text>
      <text x="140" y="60" fontSize="8" fill={COLORS.pink}>✦</text>
    </svg>
  );
}

function DocumentsHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={size * 0.69}>
      {/* chemise / dossier */}
      <path d="M14 34 H62 L72 44 H146 V96 Q146 100 142 100 H18 Q14 100 14 96 Z" fill={COLORS.blue} />
      <path d="M14 34 Q14 30 18 30 H58 L68 40 H142 Q146 40 146 44 V50 H14 Z" fill={COLORS.teal} />
      {/* feuille qui dépasse avec une croix médicale */}
      <rect x="46" y="14" width="52" height="66" rx="6" fill="#fff" />
      <rect x="54" y="24" width="36" height="4" rx="2" fill={COLORS.line} />
      <rect x="54" y="34" width="26" height="4" rx="2" fill={COLORS.line} />
      <circle cx="72" cy="58" r="14" fill="#FDECEC" />
      <rect x="68" y="49" width="8" height="18" rx="2" fill="#D96A6A" />
      <rect x="63" y="54" width="18" height="8" rx="2" fill="#D96A6A" />
      {/* petit trombone */}
      <path d="M104 20 q10 -8 10 4 v18 q0 6 -6 6 q-6 0 -6 -6 V26" stroke={COLORS.ochre} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* étoile */}
      <text x="122" y="60" fontSize="9" fill={COLORS.blue}>✦</text>
    </svg>
  );
}

function AppointmentHeroIllu({ size = 140 }) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={size * 0.69}>
      {/* page de calendrier */}
      <rect x="20" y="14" width="120" height="86" rx="10" fill="#fff" />
      <rect x="20" y="14" width="120" height="22" rx="10" fill={COLORS.teal} />
      <rect x="20" y="28" width="120" height="8" fill={COLORS.teal} />
      <rect x="40" y="6" width="8" height="16" rx="3" fill={COLORS.teal} />
      <rect x="112" y="6" width="8" height="16" rx="3" fill={COLORS.teal} />
      {/* grille de petites cases */}
      {[0, 1, 2, 3, 4].map((col) =>
        [0, 1, 2].map((row) => (
          <rect key={`${col}-${row}`} x={32 + col * 18} y={48 + row * 16} width="12" height="10" rx="2" fill="#F0EAD9" />
        ))
      )}
      {/* date entourée + coeur */}
      <circle cx="86" cy="64" r="13" fill={COLORS.ochre} />
      <text x="86" y="69" fontSize="12" fill="#fff" textAnchor="middle" fontWeight="700">12</text>
      <text x="118" y="30" fontSize="12" fill={COLORS.pink}>♥</text>
      <text x="26" y="30" fontSize="10" fill={COLORS.star || "#fff"}>✦</text>
    </svg>
  );
}

const GROWTH_EXAMPLE_ENTRIES = [
  { date: "", weight: 3.3 }, { date: "", weight: 4.6 }, { date: "", weight: 5.8 }, { date: "", weight: 7.1 }, { date: "", weight: 8.4 },
];

function GrowthTracker({ lang, children, goTo, session }) {
  const [selectedChildId, setSelectedChildId] = useState(children?.[0]?.id ?? null);
  const [entriesByChild, setEntriesByChild] = useState({});
  const [form, setForm] = useState({ date: "", weight: "", height: "" });
  const [showAddChildNotice, setShowAddChildNotice] = useState(false);
  const [units, setUnits] = useState(lang === "fr" ? "metric" : "imperial");
  const [saving, setSaving] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState("");
  const hasChild = !!(children && children.length > 0);
  const hasSession = !!(session?.access_token && session?.user?.id);
  const entries = entriesByChild[selectedChildId] ?? [];

  // Charge les mesures déjà enregistrées dès qu'une session valide est disponible
  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchGrowthEntries(session.user.id, session.access_token)
      .then((rows) => {
        const grouped = {};
        rows.forEach((row) => {
          const e = mapGrowthRow(row);
          grouped[e.childId] = [...(grouped[e.childId] ?? []), { date: e.date, weight: e.weight, height: e.height }];
        });
        setEntriesByChild(grouped);
      })
      .catch(() => {}); // on garde l'affichage local si le chargement échoue
  }, [hasSession, session?.user?.id]);

  const kgToLb = (kg) => kg * 2.20462;
  const lbToKg = (lb) => lb / 2.20462;
  const cmToIn = (cm) => cm / 2.54;
  const inToCm = (inch) => inch * 2.54;

  const L = lang === "fr"
    ? {
        title: "Suivi de croissance", subtitle: "Notez le poids et la taille de votre enfant pour voir son évolution dans le temps.",
        date: "Date", add: "Ajouter",
        empty: "Aucune mesure enregistrée pour l'instant.",
        exampleChart: "Exemple d'aperçu — vos données remplaceront ceci",
        note: "Ceci suit la progression de votre enfant dans le temps — pour comparer avec les courbes de percentiles officielles, votre pédiatre ou CLSC utilise le carnet de santé standardisé.",
        needChildNotice: "Il faut d'abord créer un profil enfant pour commencer un suivi de croissance — allez dans « Mes enfants » dans votre profil.",
        goToProfile: "Aller à mon profil", dismiss: "Fermer",
        forChild: "Pour :", metric: "Métrique (kg/cm)", imperial: "Impérial (lb/po)",
      }
    : lang === "es"
    ? {
        title: "Seguimiento del crecimiento", subtitle: "Registra el peso y la talla de tu hijo para ver su evolución en el tiempo.",
        date: "Fecha", add: "Agregar",
        empty: "Aún no hay mediciones registradas.",
        exampleChart: "Vista previa de ejemplo — tus datos reemplazarán esto",
        note: "Esto sigue el progreso propio de tu hijo en el tiempo — para comparar con las curvas de percentiles oficiales, tu pediatra o clínica usa la cartilla de salud estandarizada.",
        needChildNotice: "Primero hay que crear un perfil de hijo para comenzar un seguimiento de crecimiento — ve a « Mis hijos » en tu perfil.",
        goToProfile: "Ir a mi perfil", dismiss: "Cerrar",
        forChild: "Para:", metric: "Métrico (kg/cm)", imperial: "Imperial (lb/in)",
      }
    : {
        title: "Growth tracker", subtitle: "Log your child's weight and height to see their progress over time.",
        date: "Date", add: "Add",
        empty: "No measurements logged yet.",
        exampleChart: "Example preview — your data will replace this",
        note: "This tracks your child's own progress over time — to compare against official percentile curves, your pediatrician or clinic uses the standardized growth chart.",
        needChildNotice: "You need to create a child profile first to start growth tracking — go to \"My children\" in your profile.",
        goToProfile: "Go to my profile", dismiss: "Dismiss",
        forChild: "For:", metric: "Metric (kg/cm)", imperial: "Imperial (lb/in)",
      };

  const weightLabel = units === "metric" ? (lang === "fr" ? "Poids (kg)" : lang === "es" ? "Peso (kg)" : "Weight (kg)") : (lang === "fr" ? "Poids (lb)" : lang === "es" ? "Peso (lb)" : "Weight (lb)");
  const heightLabel = units === "metric" ? (lang === "fr" ? "Taille (cm)" : lang === "es" ? "Talla (cm)" : "Height (cm)") : (lang === "fr" ? "Taille (po)" : lang === "es" ? "Talla (in)" : "Height (in)");
  const weightChartLabel = units === "metric" ? (lang === "fr" ? "Évolution du poids (kg)" : lang === "es" ? "Evolución del peso (kg)" : "Weight over time (kg)") : (lang === "fr" ? "Évolution du poids (lb)" : lang === "es" ? "Evolución del peso (lb)" : "Weight over time (lb)");

  const addEntry = async () => {
    if (!hasChild) { setShowAddChildNotice(true); return; }
    if (!form.date || !form.weight || !selectedChildId) return;
    const weightKg = units === "metric" ? Number(form.weight) : lbToKg(Number(form.weight));
    const heightCm = form.height ? (units === "metric" ? Number(form.height) : inToCm(Number(form.height))) : null;
    const newEntry = { date: form.date, weight: weightKg, height: heightCm };

    if (hasSession) {
      setSaving(true);
      setLoadErrorMsg("");
      try {
        await supabaseAddGrowthEntry({ ...newEntry, childId: selectedChildId }, session.user.id, session.access_token);
        setEntriesByChild((prev) => {
          const updated = [...(prev[selectedChildId] ?? []), newEntry].sort((a, b) => a.date.localeCompare(b.date));
          return { ...prev, [selectedChildId]: updated };
        });
        setForm({ date: "", weight: "", height: "" });
      } catch (err) {
        setLoadErrorMsg(lang === "fr" ? "Impossible d'enregistrer la mesure pour le moment." : lang === "es" ? "No se pudo guardar la medición por ahora." : "Couldn't save this measurement right now.");
      }
      setSaving(false);
    } else {
      setEntriesByChild((prev) => {
        const updated = [...(prev[selectedChildId] ?? []), newEntry].sort((a, b) => a.date.localeCompare(b.date));
        return { ...prev, [selectedChildId]: updated };
      });
      setForm({ date: "", weight: "", height: "" });
    }
  };

  const inputStyle = { flex: 1, minWidth: 90, padding: "9px 11px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13 };

  const displayEntries = (entries.length > 0 ? entries : GROWTH_EXAMPLE_ENTRIES).map((e) => ({
    date: e.date,
    weight: units === "metric" ? e.weight : kgToLb(e.weight),
    height: e.height ? (units === "metric" ? e.height : cmToIn(e.height)) : null,
  }));
  const isExample = entries.length === 0;
  const chartW = 280, chartH = 90, pad = 8;
  const weights = displayEntries.map((e) => e.weight);
  const minW = weights.length ? Math.min(...weights) - 0.3 : 0;
  const maxW = weights.length ? Math.max(...weights) + 0.3 : 1;
  const points = displayEntries.map((e, i) => {
    const x = displayEntries.length > 1 ? pad + (i / (displayEntries.length - 1)) * (chartW - pad * 2) : chartW / 2;
    const y = chartH - pad - ((e.weight - minW) / (maxW - minW || 1)) * (chartH - pad * 2);
    return `${x},${y}`;
  });

  // ---- Détection de tendance inhabituelle (informatif seulement, jamais diagnostique) ----
  const growthAlert = useMemo(() => {
    if (isExample || entries.length < 2) return null;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const daysBetween = (new Date(last.date) - new Date(prev.date)) / 86400000;
    if (daysBetween <= 0) return null;
    const weeksBetween = daysBetween / 7;
    const deltaKg = last.weight - prev.weight;
    const ratePerWeek = deltaKg / weeksBetween;

    if (deltaKg < -0.05) {
      return { type: "loss", key: "loss" };
    }
    if (sorted.length >= 3) {
      const earlierRates = [];
      for (let i = 1; i < sorted.length - 1; i++) {
        const dwks = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / 86400000 / 7;
        if (dwks > 0) earlierRates.push((sorted[i].weight - sorted[i - 1].weight) / dwks);
      }
      const avgPriorRate = earlierRates.reduce((a, b) => a + b, 0) / (earlierRates.length || 1);
      if (avgPriorRate > 0.02 && ratePerWeek < avgPriorRate * 0.4) {
        return { type: "slower", key: "slower" };
      }
    }
    return null;
  }, [entries, isExample]);

  const alertText = growthAlert
    ? lang === "fr"
      ? growthAlert.type === "loss"
        ? "Aperçu : la dernière mesure montre une perte de poids par rapport à la précédente. Ce n'est pas nécessairement préoccupant (erreur de pesée, habillement, heure de la journée), mais si ça se confirme, en parler à votre professionnel de la santé est une bonne idée."
        : "Aperçu : le rythme de prise de poids semble avoir ralenti par rapport aux mesures précédentes. Cela arrive souvent et n'est pas nécessairement un problème, mais c'est le genre de tendance à mentionner à votre pédiatre ou CLSC au prochain rendez-vous."
      : lang === "es"
      ? growthAlert.type === "loss"
        ? "Aviso: la última medición muestra una pérdida de peso respecto a la anterior. Esto no es necesariamente preocupante (error de pesaje, ropa, hora del día), pero si se confirma, vale la pena mencionarlo a tu profesional de la salud."
        : "Aviso: el ritmo de aumento de peso parece haberse desacelerado respecto a las mediciones anteriores. Esto suele pasar y no es necesariamente un problema, pero es el tipo de tendencia que vale la pena mencionar a tu pediatra en la próxima cita."
      : growthAlert.type === "loss"
        ? "Heads up: the latest measurement shows a weight loss compared to the previous one. This isn't necessarily concerning (scale error, clothing, time of day), but if it's confirmed, it's worth mentioning to your healthcare provider."
        : "Heads up: the pace of weight gain seems to have slowed compared to previous measurements. This is often normal and not necessarily a problem, but it's the kind of trend worth mentioning to your pediatrician at the next visit."
    : null;

  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <div style={{
        background: "#F0F5EC", borderRadius: 18, padding: "18px 16px", textAlign: "center", marginBottom: 16,
      }}>
        <GrowthHeroIllu size={150} />
      </div>

      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.muted }}>{L.subtitle}</p>

      {hasChild && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700 }}>{L.forChild}</span>
          {children.map((ch) => (
            <button key={ch.id} onClick={() => setSelectedChildId(ch.id)} style={{
              padding: "6px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${selectedChildId === ch.id ? COLORS.ochre : COLORS.line}`,
              background: selectedChildId === ch.id ? COLORS.ochre : "#fff",
              color: selectedChildId === ch.id ? "#fff" : COLORS.text,
            }}>{ch.name}</button>
          ))}
        </div>
      )}

      {showAddChildNotice && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10, background: "#F0F5EC", border: `1px solid ${COLORS.sage}`,
          borderRadius: 12, padding: "12px 14px", marginBottom: 14,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12.5, color: COLORS.text, lineHeight: 1.5, fontWeight: 600 }}>{L.needChildNotice}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => goTo && goTo("profil")} style={{
                background: COLORS.sage, color: "#fff", border: "none", borderRadius: 8, padding: "6px 13px",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>{L.goToProfile}</button>
              <button onClick={() => setShowAddChildNotice(false)} style={{
                background: "none", border: "none", color: COLORS.muted, fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>{L.dismiss}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["metric", "imperial"].map((u) => (
          <button key={u} onClick={() => setUnits(u)} style={{
            padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${units === u ? COLORS.teal : COLORS.line}`,
            background: units === u ? COLORS.teal : "#fff",
            color: units === u ? "#fff" : COLORS.text,
          }}>{u === "metric" ? L.metric : L.imperial}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder={L.date} />
        <input type="number" step="0.1" style={inputStyle} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder={weightLabel} />
        <input type="number" step="0.1" style={inputStyle} value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder={heightLabel} />
        <button
          onClick={addEntry} disabled={saving}
          style={{
            padding: "9px 16px", borderRadius: 10, border: "none", background: COLORS.teal, color: "#fff",
            fontWeight: 700, fontSize: 13, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
          }}
        >{saving ? "…" : L.add}</button>
      </div>
      {loadErrorMsg && <p style={{ fontSize: 11.5, color: "#B3261E", marginBottom: 8 }}>{loadErrorMsg}</p>}

      <div style={{ opacity: isExample ? 0.55 : 1 }}>
        <p style={{ fontSize: 11.5, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", margin: "10px 0 4px" }}>
          {isExample ? L.exampleChart : weightChartLabel}
        </p>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: 90, marginBottom: 10 }}>
          <polyline points={points.join(" ")} fill="none" stroke={COLORS.ochre} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={isExample ? "5 4" : "0"} />
          {displayEntries.map((e, i) => {
            const [x, y] = points[i].split(",");
            return <circle key={i} cx={x} cy={y} r="3.5" fill={COLORS.ochre} />;
          })}
        </svg>
        {!isExample && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {displayEntries.slice().reverse().map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, background: COLORS.cream, borderRadius: 8, padding: "6px 11px" }}>
                <span style={{ color: COLORS.muted }}>{e.date}</span>
                <span style={{ color: COLORS.text, fontWeight: 700 }}>
                  {e.weight.toFixed(1)} {units === "metric" ? "kg" : "lb"}{e.height ? ` · ${e.height.toFixed(1)} ${units === "metric" ? "cm" : "po"}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {alertText && (
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start", background: "#FBF3E4", border: `1px solid ${COLORS.ochre}80`,
          borderRadius: 12, padding: "11px 13px", marginTop: 12,
        }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>📈</span>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.text, lineHeight: 1.5 }}>{alertText}</p>
        </div>
      )}
      <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 12, lineHeight: 1.5 }}>{L.note}</p>
    </Card>
  );
}

/* ---------------- APPOINTMENTS & FAMILY SCHEDULE ---------------- */
/* ---------------- JOURNAL (memories, with photos) ---------------- */
function JournalTracker({ lang, session }) {
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);
  const hasSession = !!(session?.access_token && session?.user?.id);

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchJournalEntries(session.user.id, session.access_token)
      .then((rows) => setEntries(rows.map(mapJournalRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const L = lang === "fr"
    ? {
        title: "Journal de souvenirs", subtitle: "Notez vos ressentis, vos petits moments et vos souvenirs — avec une photo si vous voulez.",
        placeholder: "Aujourd'hui, je me sens…", addPhoto: "Ajouter une photo", removePhoto: "Retirer la photo",
        add: "Ajouter au journal", empty: "Aucun souvenir noté pour l'instant — le premier vous attend juste ici.",
        exampleLabel: "Exemple", exampleText: "Aujourd'hui, elle a ri aux éclats pour la première fois en entendant le chien aboyer. Un moment tout simple, mais que je veux me rappeler pour toujours.",
        errorAdd: "Impossible d'ajouter ce souvenir pour le moment.",
      }
    : lang === "es"
    ? {
        title: "Diario de recuerdos", subtitle: "Anota cómo te sientes, tus pequeños momentos y tus recuerdos — con una foto si quieres.",
        placeholder: "Hoy me siento…", addPhoto: "Agregar una foto", removePhoto: "Quitar la foto",
        add: "Agregar al diario", empty: "Aún no hay recuerdos anotados — el primero te espera justo aquí.",
        exampleLabel: "Ejemplo", exampleText: "Hoy se rió a carcajadas por primera vez al escuchar al perro ladrar. Un momento muy simple, pero que quiero recordar para siempre.",
        errorAdd: "No se pudo agregar este recuerdo por ahora.",
      }
    : {
        title: "Memory journal", subtitle: "Jot down how you're feeling, little moments, and memories — with a photo if you'd like.",
        placeholder: "Today I'm feeling…", addPhoto: "Add a photo", removePhoto: "Remove photo",
        add: "Add to journal", empty: "No memories logged yet — your first one is waiting right here.",
        exampleLabel: "Example", exampleText: "Today she burst out laughing for the first time hearing the dog bark. Such a simple moment, but one I want to remember forever.",
        errorAdd: "Couldn't add this memory right now.",
      };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
    setPhotoFile(file);
  };

  const addEntry = async () => {
    if (!text.trim() && !photo) return;
    setErrorMsg("");
    if (hasSession) {
      setSaving(true);
      try {
        let photoUrl = null;
        if (photoFile) photoUrl = await supabaseUploadPhoto(photoFile, session.user.id, session.access_token);
        const row = await supabaseAddJournalEntry({ text: text.trim(), photo: photoUrl }, session.user.id, session.access_token);
        setEntries((e) => [mapJournalRow(row), ...e]);
        setText(""); setPhoto(null); setPhotoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        setErrorMsg(L.errorAdd);
      }
      setSaving(false);
    } else {
      setEntries((e) => [{ id: `local-${Date.now()}`, date: new Date(), text: text.trim(), photo }, ...e]);
      setText(""); setPhoto(null); setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <div style={{ background: "#FBF3E4", borderRadius: 18, padding: "18px 16px", textAlign: "center", marginBottom: 16 }}>
        <JournalCoverIllu size={140} />
      </div>
      <h3 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{L.subtitle}</p>

      <textarea
        rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={L.placeholder}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${COLORS.line}`, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: 10 }}
      />

      {photo ? (
        <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
          <img src={photo} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 12 }} />
          <button onClick={() => { setPhoto(null); setPhotoFile(null); }} style={{
            position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%",
            background: COLORS.pink, color: "#fff", border: "2px solid #fff", cursor: "pointer", fontSize: 12, lineHeight: 1,
          }}>✕</button>
        </div>
      ) : (
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
          border: `1px dashed ${COLORS.line}`, fontSize: 12.5, color: COLORS.muted, cursor: "pointer", marginBottom: 12,
        }}>
          📷 {L.addPhoto}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
        </label>
      )}

      <button onClick={addEntry} disabled={saving} style={{
        display: "block", width: "100%", padding: "12px", borderRadius: 12, border: "none",
        background: COLORS.ochre, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: saving ? "default" : "pointer",
        opacity: saving ? 0.7 : 1, marginBottom: errorMsg ? 8 : 18,
      }}>{saving ? "…" : L.add}</button>
      {errorMsg && <p style={{ fontSize: 11.5, color: "#B3261E", marginBottom: 18 }}>{errorMsg}</p>}

      {entries.length === 0 ? (
        <div style={{ opacity: 0.6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textAlign: "center", marginBottom: 8, fontStyle: "italic" }}>{L.exampleLabel}</p>
          <div style={{
            display: "flex", gap: 10, background: COLORS.cream, borderRadius: 14, padding: "12px 14px",
            border: `1px dashed ${COLORS.ochre}80`,
          }}>
            <div style={{
              width: 4, borderRadius: 999, background: COLORS.ochre, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginBottom: 4 }}>
                {new Date().toLocaleDateString(lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA", { day: "numeric", month: "short", year: "numeric" })}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.55, fontStyle: "italic" }}>{L.exampleText}</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", marginTop: 14, fontStyle: "italic" }}>{L.empty}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((e) => (
            <div key={e.id} style={{
              display: "flex", gap: 12, background: "#FDF0F3", borderRadius: 14, padding: "12px 14px",
              borderLeft: `4px solid ${COLORS.pink}`,
            }}>
              {e.photo && <img src={e.photo} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginBottom: 3 }}>
                  {e.date.toLocaleDateString(lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                {e.text && <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{e.text}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------- DOCUMENTS (photos of medical documents, prescriptions, etc.) ---------------- */
const DOC_CATEGORIES = [
  { key: "vaccination", icon: "💉", color: COLORS.blue, bg: "#EAF2F8", label: { fr: "Vaccination", en: "Vaccination", es: "Vacunación" } },
  { key: "prescription", icon: "💊", color: COLORS.ochre, bg: "#FBF3E4", label: { fr: "Ordonnance", en: "Prescription", es: "Receta" } },
  { key: "results", icon: "🧪", color: COLORS.sage, bg: "#F0F5EC", label: { fr: "Résultat de labo", en: "Lab result", es: "Resultado de laboratorio" } },
  { key: "consultation", icon: "📋", color: COLORS.pink, bg: "#FDF0F3", label: { fr: "Note de consultation", en: "Visit note", es: "Nota de consulta" } },
  { key: "other", icon: "📄", color: COLORS.teal, bg: "#EAF2F8", label: { fr: "Autre", en: "Other", es: "Otro" } },
];

function DocumentsTracker({ lang, session }) {
  const [docs, setDocs] = useState([]);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("vaccination");
  const [note, setNote] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);
  const hasSession = !!(session?.access_token && session?.user?.id);

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchDocuments(session.user.id, session.access_token)
      .then((rows) => setDocs(rows.map(mapDocumentRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const L = lang === "fr"
    ? {
        title: "Mes documents & suivi santé", subtitle: "Photographiez vos documents, ajoutez une note de l'équipe soignante et un rappel de suivi — tout au même endroit.",
        labelPh: "Ex. Carnet de vaccination, ordonnance amoxicilline…", add: "Ajouter un document", empty: "Aucun document ajouté pour l'instant.",
        remove: "Retirer", exampleLabel: "Exemple",
        category: "Catégorie", notePh: "Note du médecin, de la sage-femme, ou consigne à retenir (optionnel)…",
        reminderLabel: "Rappel de suivi (optionnel)", reminderBadge: (d) => `Suivi le ${d}`,
        reminderPast: (d) => `Suivi prévu le ${d} — à faire`,
        errorAdd: "Impossible d'ajouter ce document pour le moment.", errorRemove: "Impossible de retirer ce document pour le moment.",
      }
    : lang === "es"
    ? {
        title: "Mis documentos y seguimiento de salud", subtitle: "Fotografía tus documentos, agrega una nota del equipo de salud y un recordatorio de seguimiento — todo en un solo lugar.",
        labelPh: "Ej. Cartilla de vacunación, receta de amoxicilina…", add: "Agregar un documento", empty: "Aún no hay documentos agregados.",
        remove: "Quitar", exampleLabel: "Ejemplo",
        category: "Categoría", notePh: "Nota del médico, la partera, o instrucción a recordar (opcional)…",
        reminderLabel: "Recordatorio de seguimiento (opcional)", reminderBadge: (d) => `Seguimiento el ${d}`,
        reminderPast: (d) => `Seguimiento previsto el ${d} — pendiente`,
        errorAdd: "No se pudo agregar este documento por ahora.", errorRemove: "No se pudo quitar este documento por ahora.",
      }
    : {
        title: "My documents & health tracking", subtitle: "Photograph your documents, add a note from your care team, and a follow-up reminder — all in one place.",
        labelPh: "E.g. Vaccine booklet, amoxicillin prescription…", add: "Add a document", empty: "No documents added yet.",
        remove: "Remove", exampleLabel: "Example",
        category: "Category", notePh: "Note from doctor, midwife, or instruction to remember (optional)…",
        reminderLabel: "Follow-up reminder (optional)", reminderBadge: (d) => `Follow up on ${d}`,
        reminderPast: (d) => `Follow-up was due ${d} — pending`,
        errorAdd: "Couldn't add this document right now.", errorRemove: "Couldn't remove this document right now.",
      };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg("");
    if (hasSession) {
      setSaving(true);
      try {
        const photoUrl = await supabaseUploadPhoto(file, session.user.id, session.access_token);
        const newDoc = { label: label.trim() || file.name, photo: photoUrl, category, note: note.trim(), reminderDate };
        const row = await supabaseAddDocument(newDoc, session.user.id, session.access_token);
        setDocs((d) => [mapDocumentRow(row), ...d]);
        setLabel(""); setNote(""); setReminderDate("");
      } catch (err) {
        setErrorMsg(L.errorAdd);
      }
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const newDoc = { label: label.trim() || file.name, photo: reader.result, category, note: note.trim(), reminderDate };
        setDocs((d) => [{ ...newDoc, id: `local-${Date.now()}`, date: new Date() }, ...d]);
        setLabel(""); setNote(""); setReminderDate("");
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const removeDoc = async (id) => {
    setErrorMsg("");
    if (hasSession && typeof id === "string" && !id.startsWith("local-")) {
      try {
        await supabaseDeleteDocument(id, session.access_token);
        setDocs((d) => d.filter((x) => x.id !== id));
      } catch (err) {
        setErrorMsg(L.errorRemove);
      }
    } else {
      setDocs((d) => d.filter((x) => x.id !== id));
    }
  };
  const catInfo = (key) => DOC_CATEGORIES.find((c) => c.key === key) || DOC_CATEGORIES[4];
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <div style={{ background: "#EAF2F8", borderRadius: 18, padding: "16px", textAlign: "center", marginBottom: 16 }}>
        <DocumentsHeroIllu size={140} />
      </div>
      <h3 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{L.subtitle}</p>

      <input
        value={label} onChange={(e) => setLabel(e.target.value)} placeholder={L.labelPh}
        style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${COLORS.line}`, fontSize: 13.5, boxSizing: "border-box", marginBottom: 10 }}
      />

      <p style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", margin: "0 0 6px" }}>{L.category}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {DOC_CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCategory(c.key)} style={{
            padding: "6px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${category === c.key ? c.color : COLORS.line}`,
            background: category === c.key ? c.color : "#fff",
            color: category === c.key ? "#fff" : COLORS.text,
          }}>{c.icon} {c.label[lang]}</button>
        ))}
      </div>

      <textarea
        value={note} onChange={(e) => setNote(e.target.value)} placeholder={L.notePh} rows={2}
        style={{ width: "100%", padding: "10px 13px", borderRadius: 12, border: `1px solid ${COLORS.line}`, fontSize: 13, boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit", resize: "vertical" }}
      />

      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 14 }}>
        {L.reminderLabel}
        <input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5, maxWidth: 200 }} />
      </label>

      <label style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px",
        borderRadius: 14, border: `1.5px dashed ${COLORS.blue}80`, background: "#EAF2F8",
        fontSize: 13, color: COLORS.blue, fontWeight: 700, cursor: saving ? "default" : "pointer", marginBottom: 8, boxSizing: "border-box",
        opacity: saving ? 0.7 : 1,
      }}>
        📎 {saving ? "…" : L.add}
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFile} disabled={saving} style={{ display: "none" }} />
      </label>
      {errorMsg && <p style={{ fontSize: 11.5, color: "#B3261E", marginBottom: 10 }}>{errorMsg}</p>}

      {docs.length === 0 ? (
        <div style={{ opacity: 0.6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textAlign: "center", marginBottom: 8, fontStyle: "italic" }}>{L.exampleLabel}</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 110 }}>
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 14, overflow: "hidden", background: "#EAF2F8",
                border: `1px dashed ${COLORS.blue}80`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6,
              }}>
                <span style={{ fontSize: 34 }}>💉</span>
              </div>
              <p style={{ fontSize: 11, color: COLORS.text, margin: 0, textAlign: "center", fontWeight: 600 }}>
                {lang === "fr" ? "Carnet de vaccination" : lang === "es" ? "Cartilla de vacunación" : "Vaccine booklet"}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", marginTop: 14, fontStyle: "italic" }}>{L.empty}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map((d) => {
            const c = catInfo(d.category);
            const reminderPast = d.reminderDate && d.reminderDate < todayStr;
            return (
              <div key={d.id} style={{ position: "relative", display: "flex", gap: 12, background: c.bg, borderRadius: 14, padding: "10px 12px", borderLeft: `4px solid ${c.color}` }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12, overflow: "hidden", background: "#fff", flexShrink: 0,
                  boxShadow: "0 1px 4px rgba(47,72,88,0.10)",
                }}>
                  {d.photo.startsWith("data:image") ? (
                    <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>📄</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.text }}>{d.label}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", background: c.color, padding: "1px 8px", borderRadius: 999 }}>{c.icon} {c.label[lang]}</span>
                  </div>
                  {d.note && <p style={{ margin: "0 0 4px", fontSize: 11.5, color: COLORS.text, lineHeight: 1.4 }}>{d.note}</p>}
                  {d.reminderDate && (
                    <span style={{
                      display: "inline-block", fontSize: 10.5, fontWeight: 700, marginTop: 2,
                      color: reminderPast ? "#B3261E" : COLORS.sage,
                    }}>
                      {reminderPast ? L.reminderPast(d.reminderDate) : L.reminderBadge(d.reminderDate)}
                    </span>
                  )}
                </div>
                <button onClick={() => removeDoc(d.id)} style={{
                  position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%",
                  background: "rgba(47,72,88,0.5)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, lineHeight: 1, flexShrink: 0,
                }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---------------- FAMILY TASKS (who does what) ---------------- */
function FamilyTasksTracker({ lang, session }) {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ task: "", person: "maman" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hasSession = !!(session?.access_token && session?.user?.id);

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchFamilyTasks(session.user.id, session.access_token)
      .then((rows) => setTasks(rows.map(mapFamilyTaskRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const L = lang === "fr"
    ? {
        title: "Tâches familiales", subtitle: "Qui fait quoi — pour alléger la charge mentale et se répartir les tâches liées à bébé.",
        placeholder: "Ex. Préparer les biberons pour la nuit, appeler la pédiatre…",
        maman: "Maman", papa: "Papa/Partenaire", add: "Ajouter", empty: "Aucune tâche pour l'instant.",
        done: "Terminée", remove: "Retirer",
        errorAdd: "Impossible d'ajouter cette tâche pour le moment.", errorUpdate: "Impossible de mettre à jour cette tâche.", errorRemove: "Impossible de retirer cette tâche.",
      }
    : lang === "es"
    ? {
        title: "Tareas familiares", subtitle: "Quién hace qué — para aligerar la carga mental y repartir las tareas relacionadas con el bebé.",
        placeholder: "Ej. Preparar biberones para la noche, llamar al pediatra…",
        maman: "Mamá", papa: "Papá/Pareja", add: "Agregar", empty: "Aún no hay tareas.",
        done: "Terminada", remove: "Quitar",
        errorAdd: "No se pudo agregar esta tarea por ahora.", errorUpdate: "No se pudo actualizar esta tarea.", errorRemove: "No se pudo quitar esta tarea.",
      }
    : {
        title: "Family tasks", subtitle: "Who does what — to lighten the mental load and split baby-related tasks.",
        placeholder: "E.g. Prep night bottles, call the pediatrician…",
        maman: "Mom", papa: "Dad/Partner", add: "Add", empty: "No tasks yet.",
        done: "Done", remove: "Remove",
        errorAdd: "Couldn't add this task right now.", errorUpdate: "Couldn't update this task.", errorRemove: "Couldn't remove this task.",
      };

  const personColors = { maman: COLORS.pink, papa: COLORS.blue };

  const addTask = async () => {
    if (!form.task.trim()) return;
    setErrorMsg("");
    if (hasSession) {
      setSaving(true);
      try {
        const row = await supabaseAddFamilyTask(form, session.user.id, session.access_token);
        setTasks((t) => [...t, mapFamilyTaskRow(row)]);
        setForm({ task: "", person: form.person });
      } catch (err) {
        setErrorMsg(L.errorAdd);
      }
      setSaving(false);
    } else {
      setTasks((t) => [...t, { ...form, id: `local-${Date.now()}`, done: false }]);
      setForm({ task: "", person: form.person });
    }
  };
  const toggleDone = async (id) => {
    const target = tasks.find((x) => x.id === id);
    if (!target) return;
    const nextDone = !target.done;
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: nextDone } : x)));
    if (hasSession && typeof id === "string" && !id.startsWith("local-")) {
      try {
        await supabaseUpdateFamilyTask(id, nextDone, session.access_token);
      } catch (err) {
        setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !nextDone } : x))); // on annule le changement si l'écriture échoue
        setErrorMsg(L.errorUpdate);
      }
    }
  };
  const removeTask = async (id) => {
    setErrorMsg("");
    if (hasSession && typeof id === "string" && !id.startsWith("local-")) {
      try {
        await supabaseDeleteFamilyTask(id, session.access_token);
        setTasks((t) => t.filter((x) => x.id !== id));
      } catch (err) {
        setErrorMsg(L.errorRemove);
      }
    } else {
      setTasks((t) => t.filter((x) => x.id !== id));
    }
  };

  return (
    <Card>
      <div style={{ background: "#F0F5EC", borderRadius: 18, padding: "16px", textAlign: "center", marginBottom: 16 }}>
        <FamilyTasksHeroIllu size={130} />
      </div>
      <h3 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: 17, color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: COLORS.muted, lineHeight: 1.5 }}>{L.subtitle}</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {["maman", "papa"].map((p) => (
          <button key={p} onClick={() => setForm({ ...form, person: p })} style={{
            flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${form.person === p ? personColors[p] : COLORS.line}`,
            background: form.person === p ? personColors[p] : "#fff",
            color: form.person === p ? "#fff" : COLORS.text, fontWeight: 700, fontSize: 12.5,
          }}>{p === "maman" ? L.maman : L.papa}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} placeholder={L.placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
          style={{ flex: 1, padding: "10px 13px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5, boxSizing: "border-box" }}
        />
        <button onClick={addTask} disabled={saving} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: COLORS.teal, color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "…" : L.add}</button>
      </div>
      {errorMsg && <p style={{ fontSize: 11.5, color: "#B3261E", marginBottom: 10 }}>{errorMsg}</p>}

      {tasks.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.muted, fontStyle: "italic" }}>{L.empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {tasks.map((t) => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 10, background: t.done ? "#F0F5EC" : COLORS.cream,
              borderRadius: 12, padding: "9px 13px", opacity: t.done ? 0.65 : 1,
            }}>
              <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} style={{ accentColor: COLORS.sage, width: 16, height: 16, flexShrink: 0 }} />
              <span style={{
                flex: 1, fontSize: 13, color: COLORS.text, textDecoration: t.done ? "line-through" : "none",
              }}>{t.task}</span>
              <span style={{
                background: personColors[t.person], color: "#fff", fontSize: 9.5, fontWeight: 700,
                padding: "2px 8px", borderRadius: 999, flexShrink: 0,
              }}>{t.person === "maman" ? L.maman : L.papa}</span>
              <button onClick={() => removeTask(t.id)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------- BABY ALBUM (virtual memory book) ---------------- */
const BABY_BIRTH_CARD_PROMPTS = [
  { id: "birthDate", type: "date", label: { fr: "Née / né le", en: "Born on" } },
  { id: "birthTime", type: "time", label: { fr: "Heure de naissance", en: "Time of birth" } },
  { id: "birthWeight", type: "text", label: { fr: "Poids", en: "Weight" } },
  { id: "birthLength", type: "text", label: { fr: "Taille", en: "Length" } },
  { id: "birthPlace", type: "text", label: { fr: "Lieu de naissance", en: "Place of birth" } },
];

const BABY_ALBUM_SECTIONS = [
  {
    id: "avant",
    icon: Heart,
    color: COLORS.pink,
    title: { fr: "Avant la naissance", en: "Before the birth" },
    prompts: [
      { id: "announce", type: "textarea", label: { fr: "Comment avez-vous annoncé la grossesse ?", en: "How did you announce the pregnancy?" } },
      { id: "familyReaction", type: "textarea", label: { fr: "Comment la famille a-t-elle réagi ?", en: "How did the family react?" } },
      { id: "revealParty", type: "textarea", label: { fr: "Avez-vous fait un reveal ou une baby shower ? Racontez.", en: "Did you have a gender reveal or baby shower? Tell the story." } },
      { id: "nameChoice", type: "textarea", label: { fr: "Qui a donné le prénom, et pourquoi ce prénom ?", en: "Who chose the name, and why that name?" } },
    ],
  },
  {
    id: "famille",
    icon: Users,
    color: COLORS.blue,
    title: { fr: "Arbre généalogique", en: "Family tree" },
    prompts: [
      { id: "papaFamily", type: "textarea", label: { fr: "Du côté de papa (grands-parents, arrière-grands-parents…)", en: "On dad's side (grandparents, great-grandparents…)" } },
      { id: "mamanFamily", type: "textarea", label: { fr: "Du côté de maman (grands-parents, arrière-grands-parents…)", en: "On mom's side (grandparents, great-grandparents…)" } },
    ],
  },
  {
    id: "naissance",
    icon: Baby,
    color: COLORS.ochre,
    title: { fr: "La naissance", en: "The birth" },
    prompts: [
      ...BABY_BIRTH_CARD_PROMPTS,
      { id: "birthStory", type: "textarea", label: { fr: "Racontez l'histoire de sa naissance", en: "Tell the story of the birth" } },
      { id: "godparents", type: "text", label: { fr: "Qui est le parrain / la marraine ?", en: "Who are the godparents?" } },
    ],
  },
  {
    id: "premieres",
    icon: Sparkles,
    color: COLORS.sage,
    title: { fr: "Les premières fois", en: "The firsts" },
    prompts: [
      { id: "firstSmile", type: "text", label: { fr: "Premier sourire (quand ?)", en: "First smile (when?)" } },
      { id: "firstFood", type: "text", label: { fr: "Premier aliment mangé", en: "First food eaten" } },
      { id: "firstSteps", type: "text", label: { fr: "Premiers pas (quand ?)", en: "First steps (when?)" } },
      { id: "firstWord", type: "text", label: { fr: "Premier mot", en: "First word" } },
      { id: "firstNight", type: "text", label: { fr: "Première nuit complète (quand ?)", en: "First full night's sleep (when?)" } },
    ],
  },
  {
    id: "garderie",
    icon: Users,
    color: COLORS.blue,
    title: { fr: "Souvenirs de ma garderie", en: "Daycare memories" },
    prompts: [
      { id: "daycareName", type: "text", label: { fr: "Nom de la garderie", en: "Daycare name" } },
      { id: "daycareEducator", type: "text", label: { fr: "Nom de l'éducatrice / l'éducateur", en: "Educator's name" } },
      { id: "daycareFirstDay", type: "date", label: { fr: "Premier jour de garderie", en: "First day of daycare" } },
      { id: "daycareFriends", type: "textarea", label: { fr: "Ses ami·e·s de garderie", en: "Daycare friends" } },
      { id: "daycareFavorite", type: "textarea", label: { fr: "Ce qu'il/elle préfère faire à la garderie", en: "What they love doing at daycare" } },
    ],
  },
  {
    id: "gouts",
    icon: Star,
    color: COLORS.pink,
    title: { fr: "Ses goûts", en: "Likes & dislikes" },
    prompts: [
      { id: "loved", type: "textarea", label: { fr: "Ce qu'il/elle a adoré", en: "What they loved" } },
      { id: "disliked", type: "textarea", label: { fr: "Ce qu'il/elle n'a pas aimé du tout", en: "What they really didn't like" } },
    ],
  },
];

/* ---------------- Couvertures d'album (3 thèmes) + nounours endormi ---------------- */
const ALBUM_COVER_THEMES = [
  { key: "neutral", label: { fr: "Neutre", en: "Neutral" }, bg: "#F3ECDD", moon: "#B7A88C", accent: COLORS.ochre, star: "#D8C9A3" },
  { key: "girl", label: { fr: "Fille", en: "Girl" }, bg: "#FDF2F6", moon: "#D8AAB4", accent: "#C97C98", star: "#F0CBD3" },
  { key: "boy", label: { fr: "Garçon", en: "Boy" }, bg: "#EAF1F6", moon: "#8FAFAE", accent: "#5C8A89", star: "#C7DEDD" },
];

function SleepyTeddy({ size = 46, theme }) {
  const t = theme || ALBUM_COVER_THEMES[0];
  return (
    <svg viewBox="0 0 90 70" width={size} height={size * 0.78}>
      {/* petit croissant de lune */}
      <path d="M20 40 Q10 26 22 14 Q10 20 12 34 Q14 46 26 48 Q20 46 20 40 Z" fill={t.moon} />
      {/* nounours endormi, pelotonné */}
      <ellipse cx="55" cy="44" rx="24" ry="18" fill="#D9BFA0" />
      <circle cx="34" cy="34" r="12" fill="#D9BFA0" />
      <circle cx="26" cy="26" r="5" fill="#D9BFA0" />
      <circle cx="40" cy="24" r="5" fill="#D9BFA0" />
      <circle cx="26" cy="26" r="2.3" fill="#C6A883" />
      <circle cx="40" cy="24" r="2.3" fill="#C6A883" />
      <path d="M28 36 q6 4 12 0" stroke="#8A6A48" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="46" cy="38" rx="2.5" ry="1.8" fill="#8A6A48" />
      <ellipse cx="66" cy="50" rx="7" ry="5" fill="#C6A883" opacity="0.6" />
      {/* petits z de sommeil */}
      <text x="66" y="16" fontFamily="Georgia, serif" fontSize="11" fill={t.accent} fontStyle="italic">z</text>
      <text x="74" y="8" fontFamily="Georgia, serif" fontSize="8" fill={t.accent} fontStyle="italic">z</text>
    </svg>
  );
}

/* ---------------- 3 couvertures d'album distinctes ---------------- */
function CoverArtNeutral({ size = 130 }) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={size * 0.69}>
      {/* halo doux autour de la lune */}
      <circle cx="26" cy="24" r="20" fill="#EADFC4" opacity="0.5" />
      {/* lune, en haut à gauche, bien dégagée */}
      <path d="M34 32 Q18 30 16 16 Q14 4 26 0 Q16 6 18 18 Q20 30 34 32 Z" fill="#C9AE7C" />
      {/* étoiles, réparties loin de la lune et des nuages */}
      <text x="70" y="14" fontSize="9" fill="#D8C9A3">✦</text>
      <text x="140" y="30" fontSize="7" fill="#D8C9A3">✦</text>
      <text x="12" y="52" fontSize="6" fill="#D8C9A3">✦</text>
      {/* nuage unique, en haut à droite, loin de la lune */}
      <g opacity="0.95">
        <ellipse cx="126" cy="20" rx="20" ry="11" fill="#fff" />
        <ellipse cx="112" cy="16" rx="12" ry="8" fill="#fff" />
        <ellipse cx="140" cy="16" rx="12" ry="8" fill="#fff" />
      </g>
      {/* nounours assis, réveillé et souriant, bien centré en bas */}
      <ellipse cx="80" cy="88" rx="32" ry="16" fill="#E4C9A3" opacity="0.4" />
      <ellipse cx="80" cy="70" rx="27" ry="25" fill="#D9BFA0" />
      <circle cx="57" cy="51" r="10.5" fill="#D9BFA0" />
      <circle cx="103" cy="51" r="10.5" fill="#D9BFA0" />
      <circle cx="57" cy="51" r="4.8" fill="#C6A883" />
      <circle cx="103" cy="51" r="4.8" fill="#C6A883" />
      <circle cx="66" cy="66" r="3" fill="#6B4A2B" />
      <circle cx="94" cy="66" r="3" fill="#6B4A2B" />
      <ellipse cx="80" cy="74" rx="6" ry="4.5" fill="#C6A883" />
      <path d="M68 78 Q80 88 92 78" stroke="#6B4A2B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="80" cy="87" rx="14" ry="10" fill="#EFDDBF" />
      {/* petites pattes */}
      <circle cx="60" cy="92" r="7" fill="#D9BFA0" />
      <circle cx="100" cy="92" r="7" fill="#D9BFA0" />
    </svg>
  );
}

function CoverArtGirl({ size = 130 }) {
  const bands = ["#F2A6B0", "#F6C89F", "#F3E29B", "#B9DDBB", "#A9C9E8", "#CDB6DE"];
  return (
    <svg viewBox="0 0 160 110" width={size} height={size * 0.69}>
      {/* arc-en-ciel */}
      {bands.map((c, i) => (
        <path key={c} d={`M20 90 A${60 - i * 6} ${60 - i * 6} 0 0 1 ${140 - i * 12} 90`} stroke={c} strokeWidth="7" fill="none" strokeLinecap="round" transform={`translate(${i * 3},0)`} />
      ))}
      {/* nuages aux extrémités */}
      <g>
        <ellipse cx="24" cy="88" rx="16" ry="10" fill="#fff" />
        <ellipse cx="12" cy="84" rx="10" ry="7" fill="#fff" />
      </g>
      <g>
        <ellipse cx="136" cy="88" rx="16" ry="10" fill="#fff" />
        <ellipse cx="148" cy="84" rx="10" ry="7" fill="#fff" />
      </g>
      {/* petites étoiles/coeurs */}
      <text x="30" y="30" fontSize="9" fill="#E8A6BC">✦</text>
      <text x="120" y="24" fontSize="8" fill="#E8A6BC">♥</text>
      <text x="80" y="16" fontSize="9" fill="#F3E29B">✦</text>
      {/* petit ourson qui pointe derrière un nuage */}
      <ellipse cx="80" cy="92" rx="18" ry="12" fill="#fff" />
      <circle cx="80" cy="76" r="15" fill="#D9BFA0" />
      <circle cx="69" cy="66" r="6" fill="#D9BFA0" />
      <circle cx="91" cy="66" r="6" fill="#D9BFA0" />
      <circle cx="69" cy="66" r="2.6" fill="#C6A883" />
      <circle cx="91" cy="66" r="2.6" fill="#C6A883" />
      <circle cx="74" cy="78" r="2" fill="#6B4A2B" />
      <circle cx="86" cy="78" r="2" fill="#6B4A2B" />
      <ellipse cx="80" cy="83" rx="4" ry="3" fill="#C6A883" />
    </svg>
  );
}

function CoverArtBoy({ size = 130 }) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={size * 0.69}>
      {/* ciel : nuages + soleil doux */}
      <circle cx="132" cy="20" r="12" fill="#F3E29B" opacity="0.8" />
      <ellipse cx="30" cy="18" rx="14" ry="8" fill="#fff" opacity="0.9" />
      <ellipse cx="20" cy="15" rx="8" ry="6" fill="#fff" opacity="0.9" />
      {/* rails */}
      <path d="M6 92 H154" stroke="#C9B79A" strokeWidth="3" />
      <path d="M6 97 H154" stroke="#C9B79A" strokeWidth="3" />
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M${14 + i * 16} 90 V99`} stroke="#C9B79A" strokeWidth="3" />
      ))}
      {/* fumée */}
      <circle cx="34" cy="30" r="5" fill="#D7E3E6" opacity="0.8" />
      <circle cx="30" cy="22" r="7" fill="#D7E3E6" opacity="0.8" />
      <circle cx="26" cy="12" r="9" fill="#D7E3E6" opacity="0.7" />
      {/* locomotive */}
      <rect x="18" y="46" width="34" height="26" rx="8" fill="#5C8A89" />
      <rect x="30" y="34" width="10" height="16" rx="2" fill="#5C8A89" />
      <circle cx="40" cy="56" r="7" fill="#fff" opacity="0.9" />
      <circle cx="26" cy="80" r="7" fill="#7A6A55" />
      <circle cx="44" cy="80" r="7" fill="#7A6A55" />

      {/* wagon 1 — carré ochre */}
      <path d="M52 68 H70" stroke="#7A6A55" strokeWidth="2.5" />
      <rect x="70" y="52" width="32" height="24" rx="6" fill="#F3E29B" />
      <rect x="78" y="58" width="16" height="14" rx="3" fill="#D4A54A" />
      <circle cx="78" cy="80" r="6" fill="#7A6A55" />
      <circle cx="94" cy="80" r="6" fill="#7A6A55" />

      {/* wagon 2 — cercle bleu */}
      <path d="M102 68 H120" stroke="#7A6A55" strokeWidth="2.5" />
      <rect x="120" y="52" width="30" height="24" rx="6" fill="#A9C9E8" />
      <circle cx="135" cy="64" r="9" fill="#6E9BC0" />
      <circle cx="128" cy="80" r="6" fill="#7A6A55" />
      <circle cx="144" cy="80" r="6" fill="#7A6A55" />
    </svg>
  );
}


function FamilyTreeIllu({ size = 46, theme }) {
  const t = theme || ALBUM_COVER_THEMES[0];
  return (
    <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
      {/* tronc et racines */}
      <path d="M50 88 L50 52" stroke="#A9825C" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 88 Q42 82 34 86" stroke="#A9825C" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 88 Q58 82 66 86" stroke="#A9825C" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* branche côté papa (gauche) */}
      <path d="M50 66 Q30 60 20 40" stroke="#A9825C" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M32 55 Q22 52 16 42" stroke="#A9825C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* branche côté maman (droite) */}
      <path d="M50 66 Q70 60 80 40" stroke="#A9825C" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M68 55 Q78 52 84 42" stroke="#A9825C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* branche centrale (bébé) */}
      <path d="M50 52 Q50 38 50 28" stroke="#A9825C" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* feuillages ronds */}
      <circle cx="18" cy="36" r="15" fill={t.moon} opacity="0.85" />
      <circle cx="82" cy="36" r="15" fill={t.star} opacity="0.9" />
      <circle cx="50" cy="20" r="17" fill={t.accent} opacity="0.28" />
      <circle cx="35" cy="50" r="12" fill={t.moon} opacity="0.5" />
      <circle cx="65" cy="50" r="12" fill={t.star} opacity="0.6" />

      {/* petits cœurs = les membres de la famille */}
      <text x="12" y="40" fontSize="10" fill="#fff">♥</text>
      <text x="76" y="40" fontSize="10" fill="#fff">♥</text>
      <text x="45" y="24" fontSize="11" fill={t.accent}>♥</text>
    </svg>
  );
}

function AnnounceGiftIllu({ size = 46, theme }) {
  const t = theme || ALBUM_COVER_THEMES[0];
  return (
    <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
      {/* ballon */}
      <path d="M28 8 Q44 8 44 26 Q44 40 28 40 Q12 40 12 26 Q12 8 28 8 Z" fill={t.moon} />
      <path d="M28 40 L28 48" stroke="#B7A88C" strokeWidth="1.5" />
      <path d="M25 48 L31 52 L25 56" stroke="#B7A88C" strokeWidth="1.5" fill="none" />
      {/* cadeau */}
      <rect x="46" y="46" width="42" height="34" rx="4" fill={t.accent} opacity="0.85" />
      <rect x="46" y="46" width="42" height="10" fill={t.star} />
      <rect x="63" y="46" width="8" height="34" fill={t.star} />
      <path d="M60 46 Q54 32 67 34 Q60 36 60 46 Z" fill={t.star} />
      <path d="M74 46 Q80 32 67 34 Q74 36 74 46 Z" fill={t.star} />
      {/* confettis / étoiles */}
      <text x="8" y="60" fontSize="10" fill={t.accent}>✦</text>
      <text x="90" y="30" fontSize="8" fill={t.moon}>✦</text>
      <circle cx="80" cy="14" r="3" fill={t.star} />
    </svg>
  );
}

function BabyBundleIllu({ size = 46, theme }) {
  const t = theme || ALBUM_COVER_THEMES[0];
  return (
    <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
      {/* nuage douillet en dessous */}
      <ellipse cx="50" cy="72" rx="34" ry="12" fill={t.moon} opacity="0.35" />
      {/* bébé emmailloté */}
      <path d="M32 42 Q32 20 50 20 Q68 20 68 42 L64 78 Q50 86 36 78 Z" fill={t.accent} opacity="0.85" />
      <circle cx="50" cy="30" r="15" fill="#F2DCC0" />
      <path d="M37 24 Q50 12 63 24" stroke={t.accent} strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="44" cy="30" r="2" fill="#6B4A2B" />
      <circle cx="56" cy="30" r="2" fill="#6B4A2B" />
      <path d="M46 36 Q50 39 54 36" stroke="#6B4A2B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="34" r="2.5" fill="#E7B99A" opacity="0.6" />
      {/* étoiles */}
      <text x="16" y="26" fontSize="9" fill={t.star}>✦</text>
      <text x="82" y="50" fontSize="8" fill={t.star}>✦</text>
    </svg>
  );
}

function FootprintsIllu({ size = 46, theme }) {
  const t = theme || ALBUM_COVER_THEMES[0];
  const foot = (x, y, rot) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse cx="0" cy="0" rx="7" ry="10" fill={t.accent} />
      <circle cx="-5" cy="-11" r="2.2" fill={t.accent} />
      <circle cx="-1.5" cy="-13" r="2.4" fill={t.accent} />
      <circle cx="2.5" cy="-13" r="2.4" fill={t.accent} />
      <circle cx="6" cy="-11" r="2.2" fill={t.accent} />
    </g>
  );
  return (
    <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
      {foot(24, 68, -8)}
      {foot(44, 50, 6)}
      {foot(30, 32, -6)}
      {foot(52, 16, 8)}
      <text x="66" y="18" fontSize="14" fill={t.star}>★</text>
      <text x="76" y="42" fontSize="8" fill={t.moon}>✦</text>
      <text x="12" y="50" fontSize="8" fill={t.moon}>✦</text>
    </svg>
  );
}

function TastesIllu({ size = 46, theme }) {
  const t = theme || ALBUM_COVER_THEMES[0];
  return (
    <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
      {/* bol */}
      <path d="M22 46 Q22 76 50 76 Q78 76 78 46 Z" fill={t.accent} opacity="0.85" />
      <ellipse cx="50" cy="46" rx="28" ry="9" fill={t.moon} />
      {/* cuillère */}
      <path d="M70 20 L58 42" stroke="#B7A88C" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="72" cy="16" rx="7" ry="9" fill="#B7A88C" transform="rotate(28 72 16)" />
      {/* coeur qui flotte (aimé) */}
      <text x="14" y="26" fontSize="14" fill={t.accent}>♥</text>
      {/* étoiles autour */}
      <text x="34" y="18" fontSize="9" fill={t.star}>✦</text>
      <text x="84" y="46" fontSize="8" fill={t.star}>✦</text>
    </svg>
  );
}

function DaycareIllu({ size = 46, theme }) {
  const t = theme || ALBUM_COVER_THEMES[0];
  const crayon = (x, color, rot) => (
    <g transform={`translate(${x} 12) rotate(${rot})`}>
      <rect x="0" y="10" width="10" height="34" rx="4" fill={color} />
      <path d="M0 10 L5 0 L10 10 Z" fill="#F2DCC0" />
    </g>
  );
  const friend = (x, color) => (
    <g transform={`translate(${x} 0)`}>
      <circle cx="0" cy="0" r="10" fill="#F2DCC0" />
      <circle cx="-3.5" cy="-1" r="1.4" fill="#6B4A2B" />
      <circle cx="3.5" cy="-1" r="1.4" fill="#6B4A2B" />
      <path d="M-4 4 Q0 7 4 4" stroke="#6B4A2B" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M-9 8 Q0 20 9 8 L11 34 Q0 40 -11 34 Z" fill={color} />
    </g>
  );
  return (
    <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
      {/* crayons de couleur */}
      {crayon(14, t.accent, -8)}
      {crayon(28, t.moon, 4)}
      {crayon(42, t.star, -4)}
      {/* deux amis qui se tiennent la main */}
      <g transform="translate(66 50)">
        {friend(-10, t.accent)}
        {friend(14, t.moon)}
        <path d="M-2 26 Q2 30 6 26" stroke="#D9BFA0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      {/* petites étoiles */}
      <text x="8" y="70" fontSize="9" fill={t.star}>✦</text>
      <text x="86" y="24" fontSize="8" fill={t.accent}>✦</text>
    </svg>
  );
}

const BABY_ALBUM_SECTION_ILLUS = {
  avant: AnnounceGiftIllu,
  famille: FamilyTreeIllu,
  naissance: BabyBundleIllu,
  premieres: FootprintsIllu,
  garderie: DaycareIllu,
  gouts: TastesIllu,
};

function BabyAlbum({ lang, children, userProfile, goTo, session }) {
  const [selectedChildId, setSelectedChildId] = useState(children?.[0]?.id ?? "draft");
  const [answersByChild, setAnswersByChild] = useState({});
  const [themeByChild, setThemeByChild] = useState({});
  const [openSection, setOpenSection] = useState(BABY_ALBUM_SECTIONS[0].id);
  const [activePhotoPrompt, setActivePhotoPrompt] = useState(null);
  const [showAddChildNotice, setShowAddChildNotice] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const fileInputRef = useRef(null);
  const hasChild = !!(children && children.length > 0);
  const hasSession = !!(session?.access_token && session?.user?.id);
  const loadedChildrenRef = useRef(new Set());
  const saveTimerRef = useRef(null);

  // Si un premier enfant est ajouté pendant qu'on est sur le brouillon, on bascule automatiquement sur lui
  useEffect(() => {
    if (selectedChildId === "draft" && children && children.length > 0) {
      setSelectedChildId(children[0].id);
      setShowAddChildNotice(false);
    }
  }, [children]);

  // Charge l'album de l'enfant sélectionné depuis Supabase (une seule fois par enfant)
  useEffect(() => {
    if (!hasSession || selectedChildId === "draft" || loadedChildrenRef.current.has(selectedChildId)) return;
    loadedChildrenRef.current.add(selectedChildId);
    supabaseFetchAlbum(selectedChildId, session.user.id, session.access_token)
      .then((row) => {
        if (!row) return;
        if (row.answers) setAnswersByChild((prev) => ({ ...prev, [selectedChildId]: row.answers }));
        if (row.theme) setThemeByChild((prev) => ({ ...prev, [selectedChildId]: row.theme }));
      })
      .catch(() => {});
  }, [hasSession, selectedChildId, session?.user?.id]);

  // Sauvegarde automatique différée (debounce) dès qu'on modifie les réponses ou le thème
  useEffect(() => {
    if (!hasSession || selectedChildId === "draft" || !loadedChildrenRef.current.has(selectedChildId)) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(() => {
      supabaseUpsertAlbum(
        selectedChildId, session.user.id,
        themeByChild[selectedChildId] || "neutral",
        answersByChild[selectedChildId] || {},
        session.access_token
      )
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 1000);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answersByChild[selectedChildId], themeByChild[selectedChildId]]);

  const L = lang === "fr"
    ? {
        title: "Album souvenir de bébé", subtitle: "Un livre souvenir virtuel — répondez aux questions à votre rythme, avec des photos si vous voulez.",
        addChildHint: "Astuce : ajoutez votre enfant dans le profil (« Mes enfants ») pour donner son prénom à l'album — vos réponses actuelles seront conservées.",
        needChildNotice: "Il faut d'abord créer un profil enfant pour remplir l'album — allez dans « Mes enfants » dans votre profil.",
        goToProfile: "Aller à mon profil", dismiss: "Fermer",
        forChild: "Pour :", addPhoto: "Ajouter une photo", placeholder: "Écrire ici…",
        coverTitleNamed: (name) => `L'album de ${name}`,
        coverTitleExpecting: "Votre album vous attend",
        coverTitleDraft: "Votre album souvenir",
        coverSubtitleNamed: "Un livre souvenir qui se construit avec vous, page après page.",
        coverSubtitleExpecting: "Commencez à le remplir dès maintenant — il sera prêt pour toutes les premières fois de bébé.",
        coverSubtitleDraft: "Commencez à répondre aux questions quand vous voulez — vous pourrez y ajouter votre enfant plus tard.",
        progress: (done, total) => `${done} souvenir${done > 1 ? "s" : ""} sur ${total} rempli${done > 1 ? "s" : ""}`,
        chooseTheme: "Choisissez le style de la couverture", whatsInsideTitle: "Ce que contient votre album",
        whatsInside: [
          "Le récit de la grossesse et de son annonce",
          "L'arbre généalogique des deux côtés de la famille",
          "Une fiche de naissance complète (date, heure, poids, taille, lieu)",
          "Toutes les premières fois de bébé",
          "Ses goûts et ses petites manies",
          "Des photos à chaque étape, si vous le souhaitez",
        ],
        birthCardEmptyPlaceholder: "—",
        download: "Télécharger mon album (PDF)",
        downloadHint: "Une fenêtre d'impression s'ouvrira — choisissez « Enregistrer en PDF » comme imprimante pour obtenir votre album en PDF.",
        saving: "Enregistrement…", saved: "Enregistré ✓", saveError: "Non enregistré — vérifiez votre connexion",
      }
    : lang === "es"
    ? {
        title: "Álbum de recuerdos del bebé", subtitle: "Un libro de recuerdos virtual — responde las preguntas a tu ritmo, con fotos si quieres.",
        addChildHint: "Consejo: agrega a tu hijo en el perfil (« Mis hijos ») para ponerle su nombre al álbum — tus respuestas actuales se conservarán.",
        needChildNotice: "Primero hay que crear un perfil de hijo para llenar el álbum — ve a « Mis hijos » en tu perfil.",
        goToProfile: "Ir a mi perfil", dismiss: "Cerrar",
        forChild: "Para:", addPhoto: "Agregar una foto", placeholder: "Escribe aquí…",
        coverTitleNamed: (name) => `El álbum de ${name}`,
        coverTitleExpecting: "Tu álbum te espera",
        coverTitleDraft: "Tu álbum de recuerdos",
        coverSubtitleNamed: "Un libro de recuerdos que se construye contigo, página tras página.",
        coverSubtitleExpecting: "Empieza a llenarlo desde ahora — estará listo para todas las primeras veces del bebé.",
        coverSubtitleDraft: "Empieza a responder las preguntas cuando quieras — podrás agregar a tu hijo más tarde.",
        progress: (done, total) => `${done} de ${total} recuerdo${total > 1 ? "s" : ""} completado${done > 1 ? "s" : ""}`,
        chooseTheme: "Elige el estilo de la portada", whatsInsideTitle: "Qué contiene tu álbum",
        whatsInside: [
          "El relato del embarazo y cómo se anunció",
          "El árbol genealógico de ambos lados de la familia",
          "Una ficha de nacimiento completa (fecha, hora, peso, talla, lugar)",
          "Todas las primeras veces del bebé",
          "Sus gustos y pequeñas manías",
          "Fotos en cada etapa, si lo deseas",
        ],
        birthCardEmptyPlaceholder: "—",
        download: "Descargar mi álbum (PDF)",
        downloadHint: "Se abrirá una ventana de impresión — elige « Guardar como PDF » como impresora para obtener tu álbum en PDF.",
        saving: "Guardando…", saved: "Guardado ✓", saveError: "No guardado — revisa tu conexión",
      }
    : {
        title: "Baby memory album", subtitle: "A virtual memory book — answer the questions at your own pace, with photos if you'd like.",
        addChildHint: "Tip: add your child in your profile (\"My children\") to put their name on the album — your current answers will be kept.",
        needChildNotice: "You need to create a child profile first to fill in the album — go to \"My children\" in your profile.",
        goToProfile: "Go to my profile", dismiss: "Dismiss",
        forChild: "For:", addPhoto: "Add a photo", placeholder: "Write here…",
        coverTitleNamed: (name) => `${name}'s album`,
        coverTitleExpecting: "Your album is waiting for you",
        coverTitleDraft: "Your memory album",
        coverSubtitleNamed: "A memory book that builds itself with you, page by page.",
        coverSubtitleExpecting: "Start filling it in now — it'll be ready for all of baby's firsts.",
        coverSubtitleDraft: "Start answering the questions whenever you like — you can add your child later.",
        progress: (done, total) => `${done} of ${total} memor${done > 1 ? "ies" : "y"} filled in`,
        chooseTheme: "Choose your cover style", whatsInsideTitle: "What's inside your album",
        whatsInside: [
          "The story of the pregnancy and how it was announced",
          "The family tree on both sides",
          "A full birth record (date, time, weight, length, place)",
          "All of baby's firsts",
          "Their likes and little quirks",
          "Photos at every stage, if you'd like",
        ],
        birthCardEmptyPlaceholder: "—",
        download: "Download my album (PDF)",
        downloadHint: "A print window will open — choose \"Save as PDF\" as the printer to get your album as a PDF.",
        saving: "Saving…", saved: "Saved ✓", saveError: "Not saved — check your connection",
      };


  const answers = answersByChild[selectedChildId] || {};
  const theme = ALBUM_COVER_THEMES.find((t) => t.key === (themeByChild[selectedChildId] || "neutral"));
  const setTheme = (key) => setThemeByChild((prev) => ({ ...prev, [selectedChildId]: key }));

  const setAnswer = (promptId, field, value) => {
    if (!hasChild) { setShowAddChildNotice(true); return; }
    setAnswersByChild((prev) => ({
      ...prev,
      [selectedChildId]: {
        ...(prev[selectedChildId] || {}),
        [promptId]: { ...(prev[selectedChildId]?.[promptId] || {}), [field]: value },
      },
    }));
  };

  const openPhotoPicker = (promptId) => {
    if (!hasChild) { setShowAddChildNotice(true); return; }
    setActivePhotoPrompt(promptId);
    fileInputRef.current?.click();
  };
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoPrompt) return;
    const promptId = activePhotoPrompt;
    const reader = new FileReader();
    reader.onload = () => setAnswer(promptId, "photo", reader.result); // aperçu instantané en attendant le téléversement
    reader.readAsDataURL(file);
    if (hasSession) {
      supabaseUploadPhoto(file, session.user.id, session.access_token)
        .then((url) => setAnswer(promptId, "photo", url)) // remplace par l'URL définitive une fois téléversée
        .catch(() => {});
    }
    e.target.value = "";
  };

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5, boxSizing: "border-box", fontFamily: "inherit" };

  const totalPrompts = BABY_ALBUM_SECTIONS.reduce((sum, s) => sum + s.prompts.length, 0);
  const filledPrompts = BABY_ALBUM_SECTIONS.reduce((sum, s) => sum + s.prompts.filter((p) => {
    const a = answers[p.id];
    return a && (a.text?.trim() || a.photo);
  }).length, 0);
  const progressPct = totalPrompts ? Math.round((filledPrompts / totalPrompts) * 100) : 0;
  const activeChildName = children?.find((c) => c.id === selectedChildId)?.name;
  const isExpecting = !activeChildName && !!userProfile?.dueDate;
  const coverTitle = activeChildName ? L.coverTitleNamed(activeChildName) : isExpecting ? L.coverTitleExpecting : L.coverTitleDraft;
  const coverSubtitle = activeChildName ? L.coverSubtitleNamed : isExpecting ? L.coverSubtitleExpecting : L.coverSubtitleDraft;

  return (
    <Card style={{ background: theme.bg, border: "none" }}>
      {/* Sélecteur de style de couverture */}
      <p style={{ fontSize: 11, fontWeight: 800, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px", textAlign: "center" }}>{L.chooseTheme}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 18 }}>
        {ALBUM_COVER_THEMES.map((t) => (
          <button key={t.key} onClick={() => setTheme(t.key)} style={{
            width: 34, height: 34, borderRadius: "50%", cursor: "pointer",
            background: t.moon, border: theme.key === t.key ? `3px solid ${t.accent}` : "3px solid transparent",
            boxShadow: theme.key === t.key ? `0 0 0 2px ${t.bg}` : "none", position: "relative",
          }} aria-label={t.label[lang]} title={t.label[lang]} />
        ))}
      </div>

      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 22, marginBottom: 20,
        background: theme.bg, padding: "30px 22px 26px", textAlign: "center",
        border: `1px solid ${theme.accent}55`, boxShadow: `0 10px 26px ${theme.accent}22`,
      }}>
        <div style={{ margin: "0 auto 10px" }}>
          {theme.key === "girl" ? <CoverArtGirl size={140} /> : theme.key === "boy" ? <CoverArtBoy size={140} /> : <CoverArtNeutral size={130} />}
        </div>

        <p style={{
          fontFamily: "Fraunces, Georgia, serif", fontStyle: "italic", fontSize: 15, color: theme.accent,
          margin: "0 0 2px", letterSpacing: "0.02em",
        }}>{lang === "fr" ? "mon" : "my"}</p>
        <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 26, color: COLORS.teal, margin: "0 0 4px", lineHeight: 1.1 }}>
          {activeChildName || (lang === "fr" ? "premier album" : "first album")}
        </h3>
        <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "0 0 18px", fontStyle: "italic" }}>{coverSubtitle}</p>

        {/* Fiche de naissance façon carnet */}
        <div style={{
          background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "14px 16px", textAlign: "left",
          border: `1px dashed ${theme.accent}80`, marginBottom: 4,
        }}>
          {BABY_BIRTH_CARD_PROMPTS.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", borderBottom: `1px solid ${theme.accent}25` }}>
              <span style={{ fontSize: 11, color: theme.accent, fontWeight: 700 }}>{p.label[lang]}</span>
              <span style={{ fontSize: 11.5, color: COLORS.text, fontWeight: 600 }}>{answers[p.id]?.text || L.birthCardEmptyPlaceholder}</span>
            </div>
          ))}
        </div>

        <div style={{ position: "relative", maxWidth: 220, margin: "16px auto 0" }}>
          <div style={{ height: 6, borderRadius: 999, background: `${theme.accent}30`, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: theme.accent, borderRadius: 999, transition: "width 0.3s" }} />
          </div>
          <p style={{ fontSize: 11, color: theme.accent, fontWeight: 700, margin: "6px 0 0" }}>{L.progress(filledPrompts, totalPrompts)}</p>
        </div>
      </div>

      <h3 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{L.subtitle}</p>

      {children && children.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700 }}>{L.forChild}</span>
          {children.map((ch) => (
            <button key={ch.id} onClick={() => setSelectedChildId(ch.id)} style={{
              padding: "6px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${selectedChildId === ch.id ? COLORS.ochre : COLORS.line}`,
              background: selectedChildId === ch.id ? COLORS.ochre : "#fff",
              color: selectedChildId === ch.id ? "#fff" : COLORS.text,
            }}>{ch.name}</button>
          ))}
        </div>
      )}
      {hasSession && selectedChildId !== "draft" && saveStatus !== "idle" && (
        <p style={{
          fontSize: 11, marginBottom: 16, fontWeight: 600,
          color: saveStatus === "error" ? "#B3261E" : saveStatus === "saving" ? COLORS.muted : COLORS.sage,
        }}>
          {saveStatus === "saving" ? L.saving : saveStatus === "error" ? L.saveError : L.saved}
        </p>
      )}

      {!activeChildName && (
        <p style={{ fontSize: 12, color: COLORS.muted, fontStyle: "italic", marginBottom: 16, lineHeight: 1.5 }}>{L.addChildHint}</p>
      )}

      {showAddChildNotice && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10, background: "#FDF0F3", border: `1px solid ${COLORS.pink}`,
          borderRadius: 12, padding: "12px 14px", marginBottom: 16,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12.5, color: COLORS.text, lineHeight: 1.5, fontWeight: 600 }}>{L.needChildNotice}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => goTo && goTo("profil")} style={{
                background: COLORS.pink, color: "#fff", border: "none", borderRadius: 8, padding: "6px 13px",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>{L.goToProfile}</button>
              <button onClick={() => setShowAddChildNotice(false)} style={{
                background: "none", border: "none", color: COLORS.muted, fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>{L.dismiss}</button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {BABY_ALBUM_SECTIONS.map((section) => {
          const isOpen = openSection === section.id;
          const SIcon = section.icon;
          return (
            <div key={section.id} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 14, overflow: "hidden" }}>
              <button
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                  background: isOpen ? `${section.color}14` : "#fff", border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 9, background: section.color, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <SIcon size={15} color="#fff" />
                </div>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: COLORS.teal }}>{section.title[lang]}</span>
                <span style={{ color: COLORS.muted, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div style={{ padding: "4px 14px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, opacity: 0.9 }}>
                    {(() => { const SectionArt = BABY_ALBUM_SECTION_ILLUS[section.id] || FamilyTreeIllu; return <SectionArt size={58} theme={theme} />; })()}
                  </div>
                  {section.prompts.map((p) => {
                    const val = answers[p.id] || {};
                    return (
                      <div key={p.id} style={{ marginBottom: 14 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>{p.label[lang]}</p>
                        {p.type === "textarea" ? (
                          <textarea rows={2} placeholder={L.placeholder} value={val.text || ""} onChange={(e) => setAnswer(p.id, "text", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
                        ) : (
                          <input type={p.type} placeholder={p.type === "text" ? L.placeholder : undefined} value={val.text || ""} onChange={(e) => setAnswer(p.id, "text", e.target.value)} style={inputStyle} />
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                          {val.photo && (
                            <img src={val.photo} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8 }} />
                          )}
                          <button onClick={() => openPhotoPicker(p.id)} style={{
                            background: "none", border: `1px dashed ${COLORS.line}`, borderRadius: 8, padding: "4px 10px",
                            fontSize: 11, color: COLORS.muted, cursor: "pointer",
                          }}>📷 {L.addPhoto}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => { if (!hasChild) { setShowAddChildNotice(true); return; } window.print(); }}
        style={{
          display: "block", width: "100%", marginTop: 20, padding: "13px", borderRadius: 12, border: "none",
          background: COLORS.teal, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}
      >📄 {L.download}</button>
      <p style={{ fontSize: 11, color: COLORS.muted, textAlign: "center", marginTop: 8 }}>{L.downloadHint}</p>

      {/* ---- Vue imprimable (visible seulement lors de l'impression / export PDF) ---- */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #album-print-view, #album-print-view * { visibility: visible; }
          #album-print-view { position: absolute; top: 0; left: 0; width: 100%; }
          .album-print-page { page-break-after: always; padding: 36px 30px; }
          .album-print-page:last-child { page-break-after: auto; }
        }
        @media screen { #album-print-view { display: none; } }
      `}</style>
      <div id="album-print-view">
        <div className="album-print-page" style={{ background: theme.bg, textAlign: "center" }}>
          {theme.key === "girl" ? <CoverArtGirl size={200} /> : theme.key === "boy" ? <CoverArtBoy size={200} /> : <CoverArtNeutral size={190} />}
          <p style={{ fontFamily: "Fraunces, Georgia, serif", fontStyle: "italic", fontSize: 20, color: theme.accent, margin: "18px 0 4px" }}>
            {lang === "fr" ? "mon" : "my"}
          </p>
          <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 40, color: COLORS.teal, margin: "0 0 24px" }}>
            {activeChildName || (lang === "fr" ? "premier album" : "first album")}
          </h1>
          <div style={{
            display: "inline-block", background: "rgba(255,255,255,0.8)", borderRadius: 16, padding: "20px 28px",
            border: `1px dashed ${theme.accent}90`, textAlign: "left",
          }}>
            {BABY_BIRTH_CARD_PROMPTS.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 30, padding: "6px 0", borderBottom: `1px solid ${theme.accent}25`, minWidth: 260 }}>
                <span style={{ fontSize: 13, color: theme.accent, fontWeight: 700 }}>{p.label[lang]}</span>
                <span style={{ fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{answers[p.id]?.text || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {BABY_ALBUM_SECTIONS.map((section) => (
          <div key={section.id} className="album-print-page" style={{ background: "#fff" }}>
            <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 24, color: theme.accent, borderBottom: `2px solid ${theme.accent}`, paddingBottom: 10, marginBottom: 22 }}>
              {section.title[lang]}
            </h2>
            {section.prompts.map((p) => {
              const val = answers[p.id] || {};
              return (
                <div key={p.id} style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.accent, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.02em" }}>{p.label[lang]}</p>
                  <p style={{ fontSize: 14.5, color: COLORS.text, lineHeight: 1.6, margin: "0 0 8px" }}>{val.text || "—"}</p>
                  {val.photo && <img src={val.photo} alt="" style={{ width: 130, height: 130, objectFit: "cover", borderRadius: 12 }} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

function AppointmentManager({ lang, isMember, goTo, embedded = false, session }) {
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ person: "maman", childName: "", title: "", date: "", time: "", location: "", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hasSession = !!(session?.access_token && session?.user?.id);

  useEffect(() => {
    if (!hasSession) return;
    supabaseFetchAppointments(session.user.id, session.access_token)
      .then((rows) => setAppointments(rows.map(mapAppointmentRow)))
      .catch(() => {});
  }, [hasSession, session?.user?.id]);

  const L = lang === "fr"
    ? {
        title: "Rendez-vous & horaire familial", subtitle: "Gardez en un seul endroit les rendez-vous de maman et des enfants.",
        addBtn: "+ Ajouter un rendez-vous", person: "Pour qui ?", maman: "Maman", enfant: "Enfant",
        childName: "Prénom de l'enfant", appTitle: "Titre du rendez-vous", appTitlePh: "Ex. Visite postnatale, vaccin 2 mois...",
        date: "Date", time: "Heure", location: "Lieu (optionnel)", notes: "Notes (optionnel)",
        save: "Enregistrer", cancel: "Annuler", empty: "Aucun rendez-vous à venir. Ajoutez-en un pour commencer.",
        exampleLabel: "Exemple — ajoutez le vôtre ci-dessus",
        upcoming: "À venir", past: "Passés", remove: "Retirer", demo: "Démonstration : ces rendez-vous sont conservés le temps de la session seulement.",
        errorAdd: "Impossible d'ajouter ce rendez-vous pour le moment.", errorRemove: "Impossible de retirer ce rendez-vous.",
      }
    : lang === "es"
    ? {
        title: "Citas y horario familiar", subtitle: "Mantén en un solo lugar las citas de mamá y de los niños.",
        addBtn: "+ Agregar una cita", person: "¿Para quién?", maman: "Mamá", enfant: "Hijo/a",
        childName: "Nombre del hijo/a", appTitle: "Título de la cita", appTitlePh: "Ej. Visita posnatal, vacuna 2 meses...",
        date: "Fecha", time: "Hora", location: "Lugar (opcional)", notes: "Notas (opcional)",
        save: "Guardar", cancel: "Cancelar", empty: "Aún no hay citas próximas. Agrega una para comenzar.",
        exampleLabel: "Ejemplo — agrega la tuya arriba",
        upcoming: "Próximas", past: "Pasadas", remove: "Quitar", demo: "Demostración: estas citas se conservan solo durante esta sesión.",
        errorAdd: "No se pudo agregar esta cita por ahora.", errorRemove: "No se pudo quitar esta cita.",
      }
    : {
        title: "Appointments & family schedule", subtitle: "Keep mom's and the kids' appointments all in one place.",
        addBtn: "+ Add an appointment", person: "For whom?", maman: "Mom", enfant: "Child",
        childName: "Child's first name", appTitle: "Appointment title", appTitlePh: "E.g. Postnatal visit, 2-month vaccine...",
        date: "Date", time: "Time", location: "Location (optional)", notes: "Notes (optional)",
        save: "Save", cancel: "Cancel", empty: "No upcoming appointments. Add one to get started.",
        exampleLabel: "Example — add your own above",
        upcoming: "Upcoming", past: "Past", remove: "Remove", demo: "Demo only: these appointments are kept for this session only.",
        errorAdd: "Couldn't add this appointment right now.", errorRemove: "Couldn't remove this appointment.",
      };

  const EXAMPLE_APPT = lang === "fr"
    ? { person: "enfant", childName: "Bébé", title: "Vaccin 2 mois", date: "2026-09-14", time: "10 h 00", location: "CLSC du quartier" }
    : lang === "es"
    ? { person: "enfant", childName: "Bebé", title: "Vacuna 2 meses", date: "2026-09-14", time: "10:00 AM", location: "Clínica local" }
    : { person: "enfant", childName: "Baby", title: "2-month vaccine", date: "2026-09-14", time: "10:00 AM", location: "Local clinic" };

  const personColors = { maman: COLORS.pink, enfant: COLORS.blue };

  const addAppointment = async () => {
    if (!form.title.trim() || !form.date) return;
    setErrorMsg("");
    if (hasSession) {
      setSaving(true);
      try {
        const row = await supabaseAddAppointment(form, session.user.id, session.access_token);
        setAppointments((a) => [...a, mapAppointmentRow(row)]);
        setForm({ person: "maman", childName: "", title: "", date: "", time: "", location: "", notes: "" });
        setShowForm(false);
      } catch (err) {
        setErrorMsg(L.errorAdd);
      }
      setSaving(false);
    } else {
      setAppointments((a) => [...a, { ...form, id: `local-${Date.now()}` }]);
      setForm({ person: "maman", childName: "", title: "", date: "", time: "", location: "", notes: "" });
      setShowForm(false);
    }
  };
  const removeAppointment = async (id) => {
    setErrorMsg("");
    if (hasSession && typeof id === "string" && !id.startsWith("local-")) {
      try {
        await supabaseDeleteAppointment(id, session.access_token);
        setAppointments((a) => a.filter((x) => x.id !== id));
      } catch (err) {
        setErrorMsg(L.errorRemove);
      }
    } else {
      setAppointments((a) => a.filter((x) => x.id !== id));
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const sorted = appointments.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const upcoming = sorted.filter((a) => a.date >= today);
  const past = sorted.filter((a) => a.date < today);

  const inputStyle = { width: "100%", padding: "10px 13px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5, boxSizing: "border-box" };
  const labelStyle = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: COLORS.muted, fontWeight: 600, marginBottom: 12 };

  const AppointmentCard = ({ appt, faded, hideRemove }) => {
    const who = appt.person === "maman" ? L.maman : (appt.childName || L.enfant);
    const color = personColors[appt.person];
    return (
      <div style={{
        display: "flex", gap: 12, alignItems: "flex-start", background: faded ? COLORS.cream : `${color}14`,
        borderRadius: 14, padding: "12px 14px", borderLeft: `4px solid ${color}`, opacity: faded ? 0.7 : 1,
      }}>
        <div style={{
          minWidth: 52, textAlign: "center", background: color, color: "#fff", borderRadius: 10, padding: "6px 4px", flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>{appt.date?.slice(8, 10)}</div>
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase" }}>{appt.date?.slice(5, 7)}/{appt.date?.slice(0, 4)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{appt.title}</span>
            <span style={{
              background: color, color: "#fff", fontSize: 9.5, fontWeight: 700,
              padding: "2px 8px", borderRadius: 999, textTransform: "uppercase",
            }}>{who}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: COLORS.muted }}>
            {appt.time && `${appt.time} · `}{appt.location}
          </p>
          {appt.notes && <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.text }}>{appt.notes}</p>}
        </div>
        {!hideRemove && <button onClick={() => removeAppointment(appt.id)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>{L.remove}</button>}
      </div>
    );
  };

  if (!isMember && !embedded) {
    return (
      <div>
        <SectionHero sectionKey="rdv" lang={lang} />
        <ToyDivider />
        <LockedContent lang={lang} goTo={goTo} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "#EAF2F8", borderRadius: 18, padding: "18px 16px", textAlign: "center", marginBottom: 16 }}>
        <AppointmentHeroIllu size={140} />
      </div>
      <h3 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: COLORS.teal }}>{L.title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{L.subtitle}</p>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{
          width: "100%", padding: "13px", borderRadius: 12, border: "none", background: COLORS.teal,
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 20,
        }}>{L.addBtn}</button>
      ) : (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["maman", "enfant"].map((p) => (
              <button key={p} onClick={() => setForm({ ...form, person: p })} style={{
                flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
                border: `1px solid ${form.person === p ? personColors[p] : COLORS.line}`,
                background: form.person === p ? personColors[p] : "#fff",
                color: form.person === p ? "#fff" : COLORS.text, fontWeight: 700, fontSize: 13,
              }}>{p === "maman" ? L.maman : L.enfant}</button>
            ))}
          </div>
          {form.person === "enfant" && (
            <label style={labelStyle}>{L.childName}
              <input style={inputStyle} value={form.childName} onChange={(e) => setForm({ ...form, childName: e.target.value })} />
            </label>
          )}
          <label style={labelStyle}>{L.appTitle}
            <input style={inputStyle} placeholder={L.appTitlePh} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ ...labelStyle, flex: 1 }}>{L.date}
              <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>{L.time}
              <input type="time" style={inputStyle} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </label>
          </div>
          <label style={labelStyle}>{L.location}
            <input style={inputStyle} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </label>
          <label style={labelStyle}>{L.notes}
            <input style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addAppointment} disabled={saving} style={{ background: COLORS.teal, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "…" : L.save}</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.line}`, padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{L.cancel}</button>
          </div>
          {errorMsg && <p style={{ fontSize: 11.5, color: "#B3261E", marginTop: 10, marginBottom: 0 }}>{errorMsg}</p>}
        </Card>
      )}

      {appointments.length === 0 ? (
        <div style={{ opacity: 0.6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textAlign: "center", marginBottom: 8, fontStyle: "italic" }}>{L.exampleLabel}</p>
          <div style={{ border: `1px dashed ${COLORS.blue}80`, borderRadius: 14, padding: 2 }}>
            <AppointmentCard appt={EXAMPLE_APPT} hideRemove />
          </div>
          <p style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", marginTop: 14, fontStyle: "italic" }}>{L.empty}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11.5, fontWeight: 800, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 10px" }}>{L.upcoming}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcoming.map((a) => <AppointmentCard key={a.id} appt={a} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 800, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 10px" }}>{L.past}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {past.map((a) => <AppointmentCard key={a.id} appt={a} faded />)}
              </div>
            </div>
          )}
        </>
      )}
      <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 20, textAlign: "center" }}>{L.demo}</p>
    </div>
  );
}

/* ---------------- DAILY TIP (personalized by pregnancy week or child age) ---------------- */
const PREGNANCY_TIPS = {
  fr: [
    // Trimestre 1 (semaines 0-13)
    [
      "La fatigue intense est normale ce trimestre — votre corps travaille fort en coulisses. Écoutez-la sans culpabilité.",
      "Les nausées matinales touchent près de 70% des grossesses. Manger de petites quantités souvent peut aider.",
      "C'est le bon moment pour commencer un supplément d'acide folique si ce n'est pas déjà fait, sur avis de votre professionnel de la santé.",
      "Votre premier rendez-vous prénatal a généralement lieu entre 8 et 12 semaines — bon moment pour préparer vos questions.",
      "L'odorat plus sensible et les aversions alimentaires sont fréquents en début de grossesse — normal, ça passe.",
    ],
    // Trimestre 2 (semaines 14-27)
    [
      "Souvent le trimestre le plus confortable — l'énergie revient pour beaucoup de femmes. Profitez-en pour bouger un peu si vous en avez envie.",
      "Les premiers mouvements de bébé (ou l'impression de bulles) apparaissent généralement entre 16 et 22 semaines.",
      "L'échographie morphologique a lieu autour de 20-22 semaines — un bon moment pour noter vos questions.",
      "Le mal de dos peut s'intensifier avec le poids qui augmente — une bonne posture et des chaussures confortables aident.",
      "C'est un bon moment pour commencer à magasiner pour la chambre de bébé, sans pression.",
    ],
    // Trimestre 3 (semaines 28-40+)
    [
      "Le compte-coups devient utile maintenant — environ 10 mouvements en moins de 2 heures est un repère habituel.",
      "Le souffle court est fréquent en fin de grossesse — bébé prend de la place. Ça s'améliore souvent après l'engagement de bébé.",
      "Bon moment pour préparer votre valise de maternité si ce n'est pas déjà fait.",
      "Les contractions de Braxton Hicks (fausses contractions) sont normales — irrégulières et sans intensité croissante.",
      "Pensez à discuter de votre plan de naissance avec votre équipe soignante si vous en avez un.",
    ],
  ],
  en: [
    [
      "Intense fatigue is normal this trimester — your body is working hard behind the scenes. Listen to it without guilt.",
      "Morning sickness affects nearly 70% of pregnancies. Eating small amounts often can help.",
      "This is a good time to start a folic acid supplement if you haven't already, with your provider's guidance.",
      "Your first prenatal visit usually happens between 8 and 12 weeks — a good time to prepare your questions.",
      "Heightened smell and food aversions are common early on — normal, and it passes.",
    ],
    [
      "Often the most comfortable trimester — energy returns for many women. Take advantage to move a bit if you feel like it.",
      "Baby's first movements (or a fluttery feeling) usually appear between 16 and 22 weeks.",
      "The anatomy ultrasound happens around 20-22 weeks — a good time to jot down your questions.",
      "Back pain can intensify as weight increases — good posture and comfortable shoes help.",
      "A good time to start browsing for the nursery, no pressure.",
    ],
    [
      "Kick counting becomes useful now — about 10 movements in under 2 hours is a common guideline.",
      "Shortness of breath is common late in pregnancy — baby is taking up room. It often improves once baby engages.",
      "Good time to pack your hospital bag if you haven't already.",
      "Braxton Hicks contractions (practice contractions) are normal — irregular and not increasing in intensity.",
      "Consider discussing your birth plan with your care team if you have one.",
    ],
  ],
};

const CHILD_TIPS = {
  fr: [
    // 0-3 mois
    ["Le sommeil par cycles courts est normal ce mois-ci — bébé ne fait pas encore la différence jour/nuit.", "Le peau à peau apaise bébé et favorise l'attachement.", "Les pleurs du soir (coliques) culminent souvent vers 6 semaines et s'améliorent après 3 mois."],
    // 3-6 mois
    ["Bébé commence à mieux tenir sa tête — bon moment pour plus de temps sur le ventre supervisé.", "Le rire et les premiers babillages apparaissent souvent autour de 4 mois.", "La diversification alimentaire est généralement introduite vers 6 mois, sur avis de votre pédiatre."],
    // 6-12 mois
    ["Bébé explore tout avec la bouche en ce moment — sécurisez les petits objets.", "Les premiers mots simples ('maman', 'papa') apparaissent souvent entre 9 et 12 mois.", "La position assise sans appui se développe généralement entre 6 et 8 mois."],
    // 1-2 ans
    ["Les premiers pas arrivent souvent entre 9 et 15 mois — chaque enfant a son rythme.", "Le vocabulaire explose généralement entre 18 et 24 mois.", "Les crises de colère ('terrible twos') sont un signe normal de développement de l'autonomie."],
    // 2-5 ans
    ["La propreté se développe généralement entre 2 et 3 ans — chaque enfant est différent, pas de course.", "Le jeu symbolique (faire semblant) devient central dans le développement vers 3 ans.", "L'entrée à la maternelle est une grande transition — préparez-la en douceur avec des routines prévisibles."],
  ],
  en: [
    ["Short sleep cycles are normal this month — baby doesn't yet distinguish day from night.", "Skin-to-skin soothes baby and supports bonding.", "Evening crying (colic) often peaks around 6 weeks and improves after 3 months."],
    ["Baby is starting to hold their head up better — good time for more supervised tummy time.", "Laughing and early babbling often appear around 4 months.", "Solid foods are usually introduced around 6 months, per your pediatrician's guidance."],
    ["Baby is exploring everything with their mouth right now — secure small objects.", "First simple words ('mama', 'dada') often appear between 9 and 12 months.", "Sitting without support usually develops between 6 and 8 months."],
    ["First steps often happen between 9 and 15 months — every child has their own pace.", "Vocabulary usually explodes between 18 and 24 months.", "Tantrums ('terrible twos') are a normal sign of growing independence."],
    ["Potty training usually develops between 2 and 3 years — every child is different, no rush.", "Pretend play becomes central to development around age 3.", "Starting preschool is a big transition — ease into it with predictable routines."],
  ],
};

function DailyTip({ lang, userProfile }) {
  const pregnancy = getPregnancyInfo(userProfile?.dueDate, lang);
  const childAges = userProfile?.childrenAgesArr;

  // Choisit une astuce en fonction du jour de l'année pour qu'elle change chaque jour, mais reste stable pendant la journée
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

  let tip = null;
  let context = null;
  let extraNotes = [];

  if (pregnancy) {
    const tierTips = PREGNANCY_TIPS[lang][pregnancy.trimester - 1];
    tip = tierTips[dayOfYear % tierTips.length];
    context = lang === "fr" ? `Semaine ${pregnancy.weeks} de grossesse` : `Week ${pregnancy.weeks} of pregnancy`;
    const profile = userProfile?.pregnancyProfile || [];
    if (profile.includes("jumeaux")) {
      extraNotes.push(lang === "fr"
        ? "Grossesse gémellaire : plusieurs de vos repères (rendez-vous, prise de poids, terme) peuvent différer — consultez la section dédiée aux jumeaux dans Conception."
        : "Twin pregnancy: several of your benchmarks (appointments, weight gain, due date) may differ — check the dedicated twins section under Conception.");
    }
    if (profile.includes("35plus")) {
      extraNotes.push(lang === "fr"
        ? "Grossesse après 35 ans : depuis 2026, ça ne veut plus dire « à risque » automatiquement — consultez la section dédiée dans Conception pour voir ce qui a changé."
        : "Pregnancy after 35: as of 2026 this no longer automatically means \"high-risk\" — check the dedicated section under Conception to see what's changed.");
    }
    if (profile.includes("risque")) {
      extraNotes.push(lang === "fr"
        ? "Grossesse à risque : consultez la section dédiée dans Conception pour comprendre à quoi vous attendre et quand consulter rapidement."
        : "High-risk pregnancy: check the dedicated section under Conception to understand what to expect and when to seek care promptly.");
    }
  } else if (childAges && childAges.length > 0 && childAges[0]) {
    const ageYears = Number(childAges[0]);
    const bucket = ageYears < 0.25 ? 0 : ageYears < 0.5 ? 1 : ageYears < 1 ? 2 : ageYears < 2 ? 3 : 4;
    const tierTips = CHILD_TIPS[lang][bucket];
    tip = tierTips[dayOfYear % tierTips.length];
    context = lang === "fr" ? "Astuce du jour" : "Tip of the day";
  }

  if (!tip) return null;

  const L = lang === "fr" ? { label: "💡 Conseil du jour" } : lang === "es" ? { label: "💡 Consejo del día" } : { label: "💡 Tip of the day" };

  return (
    <div style={{
      background: `linear-gradient(135deg, #FBF3E4 0%, #FDF0F3 100%)`, borderRadius: 18,
      padding: "16px 18px", marginBottom: 4, border: `1px solid ${COLORS.line}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: COLORS.ochre, textTransform: "uppercase", letterSpacing: "0.03em" }}>{L.label}</span>
        {context && <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>· {context}</span>}
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: COLORS.text, lineHeight: 1.55 }}>{tip}</p>
      {extraNotes.map((note, i) => (
        <p key={i} style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.blue, fontWeight: 600, lineHeight: 1.5 }}>{note}</p>
      ))}
    </div>
  );
}

/* ---------------- SUGGESTED DOCTOR QUESTIONS (by trimester) ---------------- */
const DOCTOR_QUESTIONS = {
  fr: {
    1: ["Quels suppléments me recommandez-vous ?", "Quels sont les signes qui doivent m'inquiéter à ce stade ?", "Quels aliments dois-je éviter ?", "À quelle fréquence aurai-je des rendez-vous ?"],
    2: ["Quand aurai-je mon échographie morphologique ?", "Est-ce normal de ressentir [tel symptôme] ?", "Devrais-je envisager un dépistage du diabète gestationnel ?", "Quelle activité physique est sécuritaire pour moi ?"],
    3: ["Quels sont les signes de travail que je dois surveiller ?", "Quel est votre protocole pour le dépassement de terme ?", "Quand devrais-je me rendre à l'hôpital ?", "Pouvons-nous discuter de mon plan de naissance ?"],
  },
  en: {
    1: ["What supplements do you recommend?", "What signs should concern me at this stage?", "What foods should I avoid?", "How often will I have appointments?"],
    2: ["When will I have my anatomy ultrasound?", "Is it normal to feel [symptom]?", "Should I consider gestational diabetes screening?", "What physical activity is safe for me?"],
    3: ["What labor signs should I watch for?", "What's your protocol for going past the due date?", "When should I head to the hospital?", "Can we discuss my birth plan?"],
  },
  es: {
    1: ["¿Qué suplementos me recomienda?", "¿Qué señales deben preocuparme en esta etapa?", "¿Qué alimentos debo evitar?", "¿Con qué frecuencia tendré citas?"],
    2: ["¿Cuándo tendré mi ecografía morfológica?", "¿Es normal sentir [tal síntoma]?", "¿Debería considerar el cribado de diabetes gestacional?", "¿Qué actividad física es segura para mí?"],
    3: ["¿Qué señales de trabajo de parto debo vigilar?", "¿Cuál es su protocolo si se pasa la fecha de parto?", "¿Cuándo debería ir al hospital?", "¿Podemos hablar de mi plan de parto?"],
  },
};

function DoctorQuestions({ lang, trimester }) {
  const L = lang === "fr"
    ? { title: "Questions à poser à votre prochain rendez-vous", subtitle: "Une liste suggérée selon votre trimestre — cochez celles que vous voulez poser." }
    : lang === "es"
    ? { title: "Preguntas para hacer en tu próxima cita", subtitle: "Una lista sugerida según tu trimestre — marca las que quieras preguntar." }
    : { title: "Questions to ask at your next appointment", subtitle: "A suggested list based on your trimester — check off the ones you want to ask." };
  const [checked, setChecked] = useState({});
  const questions = DOCTOR_QUESTIONS[lang][trimester] || DOCTOR_QUESTIONS[lang][1];
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.blue}`, background: "#EAF2F8" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Stethoscope size={17} color="#fff" />
        </div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: COLORS.teal }}>{L.title}</h3>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 16px" }}>{L.subtitle}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {questions.map((q, i) => (
          <label key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10, background: checked[i] ? "#F0F5EC" : "#fff",
            borderRadius: 12, padding: "11px 14px", cursor: "pointer", boxShadow: "0 1px 4px rgba(47,72,88,0.06)",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `2px solid ${checked[i] ? COLORS.sage : COLORS.line}`, background: checked[i] ? COLORS.sage : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {checked[i] && <Check size={12} color="#fff" strokeWidth={3} />}
              <input type="checkbox" checked={!!checked[i]} onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))} style={{ position: "absolute", opacity: 0, width: 18, height: 18, cursor: "pointer" }} />
            </div>
            <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.45, textDecoration: checked[i] ? "line-through" : "none", opacity: checked[i] ? 0.65 : 1 }}>{q}</span>
          </label>
        ))}
      </div>
      {checkedCount > 0 && (
        <p style={{ fontSize: 11.5, color: COLORS.blue, fontWeight: 700, marginTop: 12, marginBottom: 0 }}>
          {checkedCount} / {questions.length}
        </p>
      )}
    </Card>
  );
}

function PregnancySection({ lang, isMember, goTo }) {
  const ids = Object.keys(PREGNANCY);
  const [activeSub, setActiveSub] = useState(ids[0]);
  const meta = SECTION_META.grossesse;
  return (
    <div>
      <SectionHero sectionKey="grossesse" lang={lang} />
      <ToyDivider />
      <PregnancyCalculator lang={lang} />
      <WeekStrip lang={lang} />
      <SubtabPills subIds={ids} activeSub={activeSub} setActiveSub={setActiveSub} dataObj={PREGNANCY} lang={lang} accent={meta.color} />
      <SubtabBody data={PREGNANCY[activeSub]} lang={lang} accent={meta.color} Icon={meta.icon} isMember={isMember} goTo={goTo} />
      <ToyDivider />
      {isMember && activeSub === "trousse" && (
        <>
          <MomBagCard lang={lang} />
          <BabyBagCard lang={lang} />
        </>
      )}
      {isMember && activeSub === "alimentation" && <FoodsToFavorCard lang={lang} />}
      {isMember && activeSub === "alimentation" && <FoodsToAvoidCard lang={lang} />}
      {isMember && activeSub === "t1" && <DoctorQuestions lang={lang} trimester={1} />}
      {isMember && activeSub === "t2" && <DoctorQuestions lang={lang} trimester={2} />}
      {isMember && activeSub === "t2" && <KickTracker lang={lang} />}
      {isMember && activeSub === "t3" && <DoctorQuestions lang={lang} trimester={3} />}
      {isMember && activeSub === "t3" && (
        <>
          <KickTracker lang={lang} />
          <ContractionTracker lang={lang} />
        </>
      )}
    </div>
  );
}

function ConceptionSection({ lang, isMember, goTo }) {
  const ids = Object.keys(CONCEPTION);
  const [activeSub, setActiveSub] = useState(ids[0]);
  const meta = SECTION_META.conception;
  return (
    <div>
      <SectionHero sectionKey="conception" lang={lang} />
      <ToyDivider />
      <OvulationCalculator lang={lang} />
      <CycleTracker lang={lang} />
      <OvulationExample lang={lang} />
      <SubtabPills subIds={ids} activeSub={activeSub} setActiveSub={setActiveSub} dataObj={CONCEPTION} lang={lang} accent={meta.color} />
      <SubtabBody data={CONCEPTION[activeSub]} lang={lang} accent={meta.color} Icon={meta.icon} isMember={isMember} goTo={goTo} />
      <ToyDivider />
      {isMember && activeSub === "prepCorps" && (
        <>
          <FoodsCard lang={lang} />
          <FertilityFoodsToAvoidCard lang={lang} />
          <SupplementsCard lang={lang} />
          <TeaInfoCard lang={lang} />
          <TeaRecipesCard lang={lang} />
        </>
      )}
    </div>
  );
}

/* ---------------- SHARE BUTTON ---------------- */
function ShareButton({ lang }) {
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const L = lang === "fr"
    ? {
        label: "Partager avec une amie / une maman",
        copied: "Lien copié !",
        text: "Je viens de découvrir Me My Baby, une application complète pour la grossesse et le développement de bébé jusqu'à 5 ans. Regarde !",
        manualHint: "Le partage automatique n'est pas disponible ici. Copiez le texte ci-dessous :",
      }
    : lang === "es"
    ? {
        label: "Compartir con una amiga / una mamá",
        copied: "¡Enlace copiado!",
        text: "Acabo de descubrir Me My Baby, una aplicación completa para el embarazo y el desarrollo del bebé hasta los 5 años. ¡Échale un vistazo!",
        manualHint: "El uso compartido automático no está disponible aquí. Copia el texto a continuación:",
      }
    : {
        label: "Share with a friend / a mom",
        copied: "Link copied!",
        text: "I just found Me My Baby, a complete app for pregnancy and baby development up to age 5. Check it out!",
        manualHint: "Automatic sharing isn't available here. Copy the text below:",
      };

  const shareText = `${L.text} ${typeof window !== "undefined" ? window.location.href : ""}`;

  const handleShare = async () => {
    const shareData = { title: "Me My Baby", text: L.text, url: window.location.href };
    // Try the native share sheet first (mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        // user cancelled, or share isn't permitted here — fall through to clipboard
      }
    }
    // Try copying to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch (e) {
        // clipboard permission blocked — fall through to manual box
      }
    }
    // Last resort: show the text so it can be copied by hand
    setShowManual(true);
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <button onClick={handleShare} style={{
        display: "inline-flex", alignItems: "center", gap: 9, background: COLORS.card,
        border: `1.5px solid ${COLORS.pink}`, color: COLORS.pink, padding: "11px 20px",
        borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}>
        <Share2 size={16} />
        {copied ? L.copied : L.label}
      </button>
      {showManual && (
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 6px" }}>{L.manualHint}</p>
          <input
            readOnly
            value={shareText}
            onFocus={(e) => e.target.select()}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`,
              fontSize: 12.5, color: COLORS.text, boxSizing: "border-box", textAlign: "center",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------- HOME ---------------- */
// Faint wallpaper pattern of healthy foods behind the Léa highlight card
const LEA_FOOD_EMOJIS = ["🍎", "🥕", "🥦", "🍓", "🥑", "🍇"];
const BABY_TOY_EMOJIS = ["🧸", "🧸", "🍼", "🧸", "🪀"];
const BABY_LETTER_BLOCKS = [
  { letter: "A", color: COLORS.yellow },
  { letter: "B", color: COLORS.blue },
  { letter: "C", color: COLORS.sage },
];

function QuickTrackerLinks({ lang, isMember, goTo, children: kids, userProfile, session }) {
  const [openTool, setOpenTool] = useState(null);
  const L = lang === "fr"
    ? { title: "Accès rapide à vos outils", feeding: "Allaitement", sleep: "Sommeil", diaper: "Couches", kicks: "Coups de bébé", contractions: "Contractions", rdv: "Mes rendez-vous", journal: "Mon journal", docs: "Mes documents", tasks: "Tâches familiales", album: "Album souvenir", growth: "Suivi de croissance", close: "Fermer l'outil" }
    : lang === "es"
    ? { title: "Acceso rápido a tus herramientas", feeding: "Lactancia", sleep: "Sueño", diaper: "Pañales", kicks: "Movimientos del bebé", contractions: "Contracciones", rdv: "Mis citas", journal: "Mi diario", docs: "Mis documentos", tasks: "Tareas familiares", album: "Álbum de recuerdos", growth: "Seguimiento del crecimiento", close: "Cerrar la herramienta" }
    : { title: "Quick access to your tools", feeding: "Feeding", sleep: "Sleep", diaper: "Diapers", kicks: "Baby kicks", contractions: "Contractions", rdv: "My appointments", journal: "My journal", docs: "My documents", tasks: "Family tasks", album: "Memory album", growth: "Growth tracker", close: "Close tool" };

  const AppointmentTool = (props) => <AppointmentManager {...props} isMember={isMember} goTo={goTo} embedded />;
  const AlbumTool = (props) => <BabyAlbum {...props} children={kids} userProfile={userProfile} goTo={goTo} session={session} />;
  const GrowthTool = (props) => <GrowthTracker {...props} children={kids} goTo={goTo} session={session} />;

  const links = [
    { key: "feeding", label: L.feeding, icon: Milk, color: COLORS.pink, Comp: FeedingTracker },
    { key: "sleep", label: L.sleep, icon: Moon, color: COLORS.blue, Comp: SleepTracker },
    { key: "diaper", label: L.diaper, icon: Droplet, color: COLORS.sage, Comp: DiaperTracker },
    { key: "kicks", label: L.kicks, icon: Footprints, color: COLORS.ochre, Comp: KickTracker },
    { key: "contractions", label: L.contractions, icon: Heart, color: COLORS.pink, Comp: ContractionTracker },
    { key: "rdv", label: L.rdv, icon: Calendar, color: COLORS.teal, Comp: AppointmentTool },
    { key: "journal", label: L.journal, icon: BookOpen, color: COLORS.ochre, Comp: JournalTracker },
    { key: "docs", label: L.docs, icon: FileText, color: COLORS.blue, Comp: DocumentsTracker },
    { key: "tasks", label: L.tasks, icon: Check, color: COLORS.sage, Comp: FamilyTasksTracker },
    { key: "album", label: L.album, icon: Star, color: COLORS.pink, Comp: AlbumTool },
    { key: "growth", label: L.growth, icon: Stethoscope, color: COLORS.sage, Comp: GrowthTool },
  ];
  const active = links.find((l) => l.key === openTool);

  return (
    <div style={{ marginBottom: 4 }}>
      <p style={{ fontSize: 11.5, fontWeight: 800, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 10px" }}>{L.title}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: active ? 14 : 0 }}>
        {links.map((l) => {
          const isOpen = openTool === l.key;
          return (
            <button key={l.key} onClick={() => setOpenTool(isOpen ? null : l.key)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer", minWidth: 58,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16, background: isOpen ? l.color : `${l.color}1F`,
                display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
              }}>
                <l.icon size={20} color={isOpen ? "#fff" : l.color} />
              </div>
              <span style={{ fontSize: 11, color: COLORS.text, fontWeight: 700 }}>{l.label}</span>
            </button>
          );
        })}
      </div>

      {active && (
        <div>
          {isMember ? <active.Comp lang={lang} session={session} /> : <LockedContent lang={lang} goTo={goTo} />}
          <button onClick={() => setOpenTool(null)} style={{
            display: "block", margin: "10px auto 0", background: "none", border: "none",
            color: COLORS.muted, fontSize: 12.5, fontWeight: 700, textDecoration: "underline", cursor: "pointer",
          }}>{L.close}</button>
        </div>
      )}
    </div>
  );
}

function ToyDivider() {
  const items = [
    { type: "emoji", emoji: "🧸" },
    { type: "block", ...BABY_LETTER_BLOCKS[0] },
    { type: "emoji", emoji: "🍼" },
    { type: "block", ...BABY_LETTER_BLOCKS[1] },
    { type: "emoji", emoji: "🪀" },
    { type: "block", ...BABY_LETTER_BLOCKS[2] },
    { type: "emoji", emoji: "🧸" },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, padding: "14px 0", flexWrap: "wrap" }}>
      {items.map((it, i) => (
        it.type === "block" ? (
          <div key={i} style={{
            width: 26, height: 26, borderRadius: 7, background: it.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "Fraunces, Georgia, serif",
            boxShadow: "0 2px 5px rgba(0,0,0,0.12)", transform: `rotate(${(i % 2 === 0 ? -8 : 8)}deg)`,
          }}>{it.letter}</div>
        ) : (
          <span key={i} style={{ fontSize: 24, transform: `rotate(${(i % 2 === 0 ? 8 : -8)}deg)`, display: "inline-block" }}>{it.emoji}</span>
        )
      ))}
    </div>
  );
}
const BABY_TOY_PATTERN = Array.from({ length: 40 }).map((_, idx) => {
  const row = Math.floor(idx / 5);
  const col = idx % 5;
  const base = {
    top: `${row * 12.5 + (col % 2 === 0 ? 2 : 6)}%`,
    left: `${col * 20 + (row % 2 === 0 ? 2 : 8)}%`,
    rotate: ((idx * 41) % 40) - 20,
    size: 20 + (idx % 3) * 4,
  };
  // Une case sur quatre affiche un bloc-lettre coloré plutôt qu'un émoji jouet
  if (idx % 4 === 0) {
    return { ...base, type: "block", ...BABY_LETTER_BLOCKS[(idx / 4) % BABY_LETTER_BLOCKS.length] };
  }
  return { ...base, type: "emoji", emoji: BABY_TOY_EMOJIS[idx % BABY_TOY_EMOJIS.length] };
});
const LEA_FOOD_PATTERN = Array.from({ length: 24 }).map((_, idx) => {
  const row = Math.floor(idx / 6);
  const col = idx % 6;
  return {
    emoji: LEA_FOOD_EMOJIS[idx % LEA_FOOD_EMOJIS.length],
    top: `${row * 24 + (col % 2 === 0 ? 2 : 10)}%`,
    left: `${col * 17 + (row % 2 === 0 ? 2 : 6)}%`,
    rotate: ((idx * 41) % 40) - 20,
    size: 20 + (idx % 3) * 4,
  };
});

/* ---------------- GLOBAL SEARCH ---------------- */
const SEARCH_SECTIONS = [
  { key: "conception", dataObj: CONCEPTION },
  { key: "grossesse", dataObj: PREGNANCY },
  { key: "postpartum", dataObj: POSTPARTUM },
  { key: "dev01", dataObj: { ...DEV01, ...DEV15 } },
  { key: "alimentation", dataObj: FEEDING },
  { key: "soins", dataObj: CARE },
  { key: "sante", dataObj: HEALTH },
];

function GlobalSearch({ lang, goTo }) {
  const [query, setQuery] = useState("");
  const nav = T[lang].nav;
  const L = lang === "fr"
    ? { placeholder: "Rechercher dans toute l'application…", noResults: "Aucun résultat pour l'instant.", inSection: "dans" }
    : lang === "es"
    ? { placeholder: "Buscar en toda la aplicación…", noResults: "Aún no hay resultados.", inSection: "en" }
    : { placeholder: "Search across the whole app…", noResults: "No results yet.", inSection: "in" };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const found = [];
    for (const sec of SEARCH_SECTIONS) {
      for (const subId of Object.keys(sec.dataObj)) {
        const sub = sec.dataObj[subId];
        const title = sub.title?.[lang] || "";
        const intro = sub.intro?.[lang] || "";
        if (title.toLowerCase().includes(q) || intro.toLowerCase().includes(q)) {
          found.push({ sectionKey: sec.key, sectionLabel: nav[sec.key], title });
        }
      }
    }
    return found.slice(0, 8);
  }, [query, lang]);

  return (
    <div style={{ marginBottom: 4, position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: COLORS.muted }}>🔍</span>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L.placeholder}
          style={{
            width: "100%", padding: "12px 14px 12px 38px", borderRadius: 999, border: `1px solid ${COLORS.line}`,
            fontSize: 13.5, boxSizing: "border-box", background: "#fff",
          }}
        />
      </div>
      {query.trim().length >= 2 && (
        <div style={{
          marginTop: 8, background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.line}`,
          boxShadow: "0 6px 18px rgba(47,72,88,0.10)", overflow: "hidden",
        }}>
          {results.length === 0 ? (
            <p style={{ margin: 0, padding: "12px 16px", fontSize: 13, color: COLORS.muted, fontStyle: "italic" }}>{L.noResults}</p>
          ) : (
            results.map((r, i) => (
              <button key={i} onClick={() => { goTo(r.sectionKey); setQuery(""); }} style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none",
                border: "none", borderBottom: i < results.length - 1 ? `1px solid ${COLORS.line}` : "none",
                cursor: "pointer", fontSize: 13.5,
              }}>
                <span style={{ color: COLORS.text, fontWeight: 600 }}>{r.title}</span>
                <span style={{ color: COLORS.muted }}> — {L.inSection} {r.sectionLabel}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Home({ lang, goTo, isMember, userProfile, children, session }) {
  const h = T[lang].home;

  if (isMember) {
    const firstName = userProfile?.firstName?.trim();
    const pregnancy = getPregnancyInfo(userProfile?.dueDate, lang);
    const childrenCount = userProfile?.children;

    const M = lang === "fr"
      ? {
          greetingName: (n) => `Bonjour${n ? `, ${n}` : ""}`,
          greetingSub: "Contente de vous revoir. Voici où vous en êtes aujourd'hui.",
          weeksLabel: (w, d) => `${w} semaine${w > 1 ? "s" : ""}${d > 0 ? ` + ${d} j` : ""} de grossesse`,
          trimesterLabel: (t) => `${t}${t === 1 ? "er" : "e"} trimestre`,
          childrenLabel: (n) => `${n} enfant${Number(n) > 1 ? "s" : ""}`,
          miaTitle: "Une question aujourd'hui ?",
          miaText: "Je suis Mia — posez-moi n'importe quelle question, ou dites-moi quel sujet vous aimeriez explorer aujourd'hui : grossesse, sommeil, alimentation, développement...",
          miaCta: "Discuter avec Mia",
          forumTitle: "Notre communauté",
        }
      : lang === "es"
      ? {
          greetingName: (n) => `Hola${n ? `, ${n}` : ""}`,
          greetingSub: "Qué bueno verte de nuevo. Aquí está tu situación hoy.",
          weeksLabel: (w, d) => `${w} semana${w > 1 ? "s" : ""}${d > 0 ? ` + ${d} d` : ""} de embarazo`,
          trimesterLabel: (t) => `${t}º trimestre`,
          childrenLabel: (n) => `${n} hijo${Number(n) > 1 ? "s" : ""}`,
          miaTitle: "¿Alguna pregunta hoy?",
          miaText: "Soy Mia — pregúntame lo que quieras, o dime qué tema te gustaría explorar hoy: embarazo, sueño, alimentación, desarrollo...",
          miaCta: "Hablar con Mia",
          forumTitle: "Nuestra comunidad",
        }
      : {
          greetingName: (n) => `Hello${n ? `, ${n}` : ""}`,
          greetingSub: "Good to see you again. Here's where you're at today.",
          weeksLabel: (w, d) => `${w} week${w > 1 ? "s" : ""}${d > 0 ? ` + ${d}d` : ""} pregnant`,
          trimesterLabel: (t) => `${t === 1 ? "1st" : t === 2 ? "2nd" : "3rd"} trimester`,
          childrenLabel: (n) => `${n} child${Number(n) > 1 ? "ren" : ""}`,
          miaTitle: "Any questions today?",
          miaText: "I'm Mia — ask me anything, or tell me what topic you'd like to explore today: pregnancy, sleep, feeding, development...",
          miaCta: "Chat with Mia",
          forumTitle: "In the community",
        };

    const badgeStyles = [
      { bg: "#FDF0F3", color: COLORS.pink },
      { bg: "#FBF3E4", color: COLORS.ochre },
      { bg: "#F0F5EC", color: COLORS.sage },
    ];

    const initials = firstName ? firstName.trim().slice(0, 2).toUpperCase() : "★";

    return (
      <div>
        <div style={{
          position: "relative", overflow: "hidden", borderRadius: 24, marginBottom: 4, padding: "28px 26px",
          background: `linear-gradient(135deg, #FDF0F3 0%, #FBF6ED 45%, #FBF3E4 100%)`,
          border: `1px solid ${COLORS.line}`, boxShadow: "0 10px 26px rgba(217,139,164,0.16)",
        }}>
          <div style={{ position: "absolute", top: -18, right: -12, opacity: 0.5 }}>
            <Sparkles size={70} color={COLORS.ochre} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, position: "relative" }}>
            <div style={{
              width: 62, height: 62, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${COLORS.ochre} 0%, ${COLORS.pink} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700,
              boxShadow: "0 6px 14px rgba(212,165,74,0.35)", border: "3px solid #fff",
            }}>
              {initials}
            </div>
            <div>
              <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 25, margin: "0 0 3px", color: COLORS.teal }}>{M.greetingName(firstName)}</h1>
              <p style={{ fontSize: 13.5, color: COLORS.muted, margin: 0 }}>{M.greetingSub}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", position: "relative" }}>
            {pregnancy && (
              <>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: badgeStyles[0].color,
                  padding: "8px 15px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, boxShadow: "0 2px 8px rgba(47,72,88,0.08)",
                }}>
                  <Baby size={14} /> {M.weeksLabel(pregnancy.weeks, pregnancy.days)}
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: badgeStyles[1].color,
                  padding: "8px 15px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, boxShadow: "0 2px 8px rgba(47,72,88,0.08)",
                }}>
                  <Calendar size={14} /> {M.trimesterLabel(pregnancy.trimester)}
                </span>
              </>
            )}
            {childrenCount != null && Number(childrenCount) > 0 && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: badgeStyles[2].color,
                padding: "8px 15px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, boxShadow: "0 2px 8px rgba(47,72,88,0.08)",
              }}>
                <Heart size={14} /> {M.childrenLabel(childrenCount)}
              </span>
            )}
          </div>
        </div>

        <GlobalSearch lang={lang} goTo={goTo} />

        <DailyTip lang={lang} userProfile={userProfile} />

        <QuickTrackerLinks lang={lang} isMember={isMember} goTo={goTo} children={children} userProfile={userProfile} session={session} />

        <div style={{ marginTop: 20 }}>
          <AIAssistant lang={lang} isMember={isMember} goTo={goTo} />
        </div>

        <ToyDivider />

        <div>
          <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 21, color: COLORS.teal, marginBottom: 14 }}>{M.forumTitle}</h2>
          <ForumSection lang={lang} isMember={isMember} goTo={goTo} />
        </div>

        <ToyDivider />
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.pink} 0%, #C97C98 45%, ${COLORS.teal} 130%)`,
        borderRadius: 20, padding: "28px 24px", color: "#fff", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap",
        boxShadow: "0 12px 28px rgba(217,139,164,0.28)",
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 23, lineHeight: 1.2, margin: "0 0 6px", maxWidth: 480 }}>
            {h.hero1}
          </h1>
          <div style={{
            fontFamily: "Fraunces, Georgia, serif", fontSize: 19, fontWeight: 700, lineHeight: 1.2,
            color: COLORS.ochre, margin: "0 0 10px", maxWidth: 460,
          }}>
            {h.heroTagline}
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, maxWidth: 420, opacity: 0.95, margin: "0 0 16px" }}>{h.hero2}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => goTo("abonnement")} style={{
              background: COLORS.ochre, color: "#fff", border: "none", padding: "9px 18px",
              borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 5px 12px rgba(212,165,74,0.32)",
            }}>{h.cta}</button>
            <button onClick={() => goTo("abonnement")} style={{
              background: "transparent", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600,
              textDecoration: "underline", cursor: "pointer", padding: 0,
            }}>{h.ctaSecondary}</button>
          </div>
        </div>
        <div className="hero-illu" style={{ background: "rgba(255,255,255,0.14)", borderRadius: 16, padding: 8, flexShrink: 0 }}>
          <Illustration type="home" size={80} />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <QuickTrackerLinks lang={lang} isMember={isMember} goTo={goTo} children={children} userProfile={userProfile} session={session} />
      </div>

      {/* Why it's a must-have */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 700,
          color: "#1F3A5F", marginBottom: 12,
        }}>{h.whyTitle}</h2>
        <Card style={{ position: "relative", overflow: "hidden", background: "#E4EFDF", border: "none", padding: "16px" }}>
          {/* wallpaper pattern */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
            {LEA_FOOD_PATTERN.map((it, idx) => (
              <span
                key={idx}
                style={{
                  position: "absolute", top: it.top, left: it.left, fontSize: it.size,
                  opacity: 0.18, transform: `rotate(${it.rotate}deg)`,
                }}
              >
                {it.emoji}
              </span>
            ))}
          </div>
          <div style={{
            position: "relative", zIndex: 1, background: "#fff", borderRadius: 14,
            padding: "18px 20px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
            boxShadow: "0 4px 16px rgba(47,72,88,0.08)",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: COLORS.sage,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: "0 4px 10px rgba(143,166,142,0.35)",
            }}>
              <UtensilsCrossed size={22} color="#fff" />
            </div>
            <div style={{ background: "#fff", borderRadius: "50%", padding: 3, boxShadow: "0 2px 8px rgba(47,72,88,0.12)", flexShrink: 0 }}>
              <LeaPhoto size={64} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: COLORS.teal, fontSize: 14.5 }}>Léa</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>{lang === "fr" ? "Diététicienne" : "Dietitian"}</div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 15.5, color: COLORS.text, lineHeight: 1.75, margin: 0 }}>{h.whySummary}</p>
            </div>
          </div>
        </Card>
      </div>

      <ToyDivider />

      {/* Community — now embedded directly on the home page */}
      <div style={{ marginBottom: 36 }}>
        <ForumSection lang={lang} isMember={isMember} goTo={goTo} />
      </div>

      <ToyDivider />

      {/* Live pregnancy calculator preview */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 24, color: COLORS.teal, marginBottom: 6 }}>{h.tryTitle}</h2>
        <p style={{ color: COLORS.muted, fontSize: 14.5, marginBottom: 18, maxWidth: 560 }}>{h.tryDesc}</p>
        <PregnancyCalculator lang={lang} />
      </div>

      {/* Closing invitation */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.teal} 0%, ${COLORS.pink} 140%)`,
        borderRadius: 24, padding: "38px 32px", color: "#fff", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      }}>
        <div className="hero-illu" style={{ background: "rgba(255,255,255,0.15)", borderRadius: 18, padding: 8, marginBottom: 12 }}>
          <Illustration type="dev15" size={56} />
        </div>
        <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 26, margin: "0 0 8px" }}>{h.closingTitle}</h2>
        <p style={{ fontSize: 14.5, opacity: 0.95, margin: "0 0 20px", maxWidth: 440 }}>{h.closingDesc}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => goTo("abonnement")} style={{
            background: COLORS.ochre, color: "#fff", border: "none", padding: "12px 24px",
            borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>{h.closingCta}</button>
          <button onClick={() => goTo("abonnement")} style={{
            background: "transparent", color: "#fff", border: "none", fontSize: 13.5, fontWeight: 600,
            textDecoration: "underline", cursor: "pointer", padding: 0,
          }}>{h.closingCtaSecondary}</button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <ShareButton lang={lang} />
      </div>
    </div>
  );
}

/* ---------------- MISSION ---------------- */
function MissionSection({ lang }) {
  const m = MISSION[lang];
  const valueVisuals = [
    { color: COLORS.blue, bg: "#EAF2F8", icon: ShieldAlert },
    { color: COLORS.pink, bg: "#FDF0F3", icon: Heart },
    { color: COLORS.sage, bg: "#F0F5EC", icon: BookOpen },
    { color: COLORS.ochre, bg: "#FBF3E4", icon: Calendar },
  ];
  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.ochre} 0%, ${COLORS.pink} 55%, ${COLORS.teal} 100%)`,
        borderRadius: 26, padding: "40px 28px", textAlign: "center", color: "#fff",
        marginBottom: 22, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -30, right: -20, opacity: 0.18 }}>
          <Sparkles size={130} color="#fff" />
        </div>
        <div style={{ position: "absolute", bottom: -26, left: -16, opacity: 0.15 }}>
          <Heart size={110} color="#fff" />
        </div>
        <div style={{
          background: "rgba(255,255,255,0.22)", borderRadius: 20, padding: 10,
          display: "inline-flex", marginBottom: 16, position: "relative",
        }}>
          <Illustration type="mission" size={56} />
        </div>
        <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 30, margin: "0 0 8px", position: "relative" }}>{m.title}</h2>
        <p style={{ fontSize: 15, opacity: 0.95, margin: "0 auto", maxWidth: 440, position: "relative", lineHeight: 1.6 }}>{m.p[0]}</p>
      </div>

      <Card style={{
        marginBottom: 22, background: `linear-gradient(180deg, #FFFDF9 0%, ${COLORS.cream} 100%)`,
        border: `1px solid ${COLORS.line}`, position: "relative", paddingTop: 30,
      }}>
        <div style={{
          position: "absolute", top: -18, left: 26, width: 40, height: 40, borderRadius: 12,
          background: COLORS.ochre, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Fraunces, Georgia, serif", fontSize: 30, color: "#fff", lineHeight: 1, boxShadow: "0 4px 10px rgba(212,165,74,0.4)",
        }}>"</div>
        {m.p.slice(1).map((para, i) => (
          <p key={i} style={{ lineHeight: 1.75, color: COLORS.text, fontSize: 15.5, margin: i === 0 ? "0 0 14px" : 0 }}>{para}</p>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        {m.values.map((v, i) => {
          const vis = valueVisuals[i % valueVisuals.length];
          const VIcon = vis.icon;
          return (
            <Card key={i} style={{ background: vis.bg, border: "none", borderTop: `4px solid ${vis.color}` }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, background: vis.color,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                boxShadow: `0 4px 10px ${vis.color}55`,
              }}>
                <VIcon size={23} color="#fff" />
              </div>
              <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: vis.color, fontWeight: 700, marginBottom: 6 }}>{v.t}</div>
              <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.55 }}>{v.d}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- MEMBERSHIP ---------------- */
/* ---------------- UNIFIED ABONNEMENT TAB ---------------- */
function AbonnementUnified({ lang, isMember, goTo, onBecomeMember, userProfile }) {
  return isMember
    ? <MySubscriptionSection lang={lang} goTo={goTo} userProfile={userProfile} />
    : <MembershipSection lang={lang} goTo={goTo} onBecomeMember={onBecomeMember} userProfile={userProfile} />;
}

function MembershipSection({ lang, goTo, onBecomeMember, userProfile }) {
  const m = MEMBERSHIP[lang];
  const p = PLANS[lang][0];
  const [billing, setBilling] = useState("annual");
  const currency = currencyForCountry(userProfile?.country);

  // Taux approximatifs (basés sur le CAD, devise de référence) — à titre indicatif seulement.
  const FX_RATES = { CAD: 1, USD: 0.72, EUR: 0.62 };
  const CURRENCY_SYMBOLS = { CAD: "$ CA", USD: "$ US", EUR: "€" };
  const convert = (n) => n * FX_RATES[currency];

  const fmt = (n) => convert(n).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const price = billing === "monthly" ? p.priceMonthly : p.priceAnnual;
  const monthlyEquiv = billing === "annual" ? convert(p.priceAnnual / 12).toFixed(2) : null;
  const savingsPct = Math.round((1 - p.priceAnnual / (p.priceMonthly * 12)) * 100);
  const currencyNote = lang === "fr"
    ? "Prix affichés à titre indicatif selon le taux de change approximatif — la facturation réelle se fait en dollars canadiens (CAD)."
    : "Prices shown are approximate based on current exchange rates — actual billing is processed in Canadian dollars (CAD).";

  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.sage} 0%, #7a9479 100%)`,
        borderRadius: 24, padding: "36px 32px", color: "#fff", textAlign: "center",
      }}>
        <div className="hero-illu" style={{ background: "rgba(255,255,255,0.15)", borderRadius: 18, padding: 8, display: "inline-flex", marginBottom: 14 }}>
          <Illustration type="membership" size={52} />
        </div>
        <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 28, margin: "0 0 8px" }}>{m.title}</h2>
        <p style={{ fontSize: 15, opacity: 0.95, margin: "0 auto", maxWidth: 460 }}>{m.subtitle}</p>
      </div>

      {/* Billing toggle */}
      <div style={{ display: "flex", justifyContent: "center", gap: 22, borderBottom: `1px solid ${COLORS.line}`, margin: "26px 0 16px" }}>
        {["monthly", "annual"].map((b) => (
          <button
            key={b}
            onClick={() => setBilling(b)}
            style={{
              padding: "0 0 10px", border: "none", background: "transparent", cursor: "pointer",
              borderBottom: `2px solid ${billing === b ? COLORS.teal : "transparent"}`,
              color: billing === b ? COLORS.teal : COLORS.muted,
              fontSize: 14.5, fontWeight: billing === b ? 700 : 500, marginBottom: -1,
            }}
          >
            {b === "monthly" ? m.billingMonthly : m.billingAnnual}
          </button>
        ))}
      </div>

      {/* Single plan card */}
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <Card style={{ display: "flex", flexDirection: "column", position: "relative", border: `2px solid ${COLORS.teal}` }}>
          <span style={{
            position: "absolute", top: -12, left: 20, background: COLORS.ochre, color: "#fff",
            fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
          }}>{p.badge}</span>
          <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: COLORS.teal, fontWeight: 700, marginTop: 8 }}>{p.name}</div>
          <div style={{ fontSize: 13.5, color: COLORS.muted, marginBottom: 16 }}>{p.tagline}</div>

          <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 36, color: COLORS.teal, fontWeight: 700 }}>
              {fmt(price)} {CURRENCY_SYMBOLS[currency]}
            </span>
            <span style={{ fontSize: 13, color: COLORS.muted }}>{billing === "monthly" ? m.perMonth : m.perYear}</span>
            {billing === "annual" && savingsPct > 0 && (
              <span style={{ fontSize: 10.5, background: COLORS.ochre, color: "#fff", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>
                {m.saveBadge(savingsPct)}
              </span>
            )}
          </div>
          {monthlyEquiv && (
            <div style={{ fontSize: 12.5, color: COLORS.sage, fontWeight: 600, marginBottom: 16 }}>{m.perMonthEquiv(monthlyEquiv, CURRENCY_SYMBOLS[currency])}</div>
          )}
          {!monthlyEquiv && <div style={{ marginBottom: 16 }} />}

          <ul style={{ margin: "0 0 20px", padding: 0 }}>
            {p.features.map((f, i) => (
              <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", listStyle: "none", marginBottom: 9 }}>
                <Check size={15} color={COLORS.teal} style={{ marginTop: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.5 }}>{f}</span>
              </li>
            ))}
          </ul>

          <div style={{
            background: COLORS.cream, borderRadius: 12, padding: "12px 14px", marginBottom: 14,
            borderLeft: `3px solid ${COLORS.ochre}`,
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: COLORS.text, fontStyle: "italic", lineHeight: 1.5 }}>
              "{T[lang].home.testimonials[1].quote}"
            </p>
            <p style={{ margin: 0, fontSize: 11.5, color: COLORS.muted, fontWeight: 700 }}>— {T[lang].home.testimonials[1].name}</p>
          </div>

          <button onClick={() => onBecomeMember && onBecomeMember()} style={{
            background: COLORS.ochre, color: "#fff", border: "none",
            padding: "13px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14.5, cursor: "pointer",
          }}>{p.cta}</button>
          <p style={{ fontSize: 11.5, color: COLORS.muted, textAlign: "center", marginTop: 10, marginBottom: 0, lineHeight: 1.4 }}>
            {billing === "monthly" ? m.renewalNoteMonthly : m.renewalNoteAnnual}
          </p>
          {currency !== "CAD" && (
            <p style={{ fontSize: 10.5, color: COLORS.muted, textAlign: "center", marginTop: 6, marginBottom: 0, lineHeight: 1.4, fontStyle: "italic" }}>
              {currencyNote}
            </p>
          )}
        </Card>
      </div>

      <p style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", marginTop: 20, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
        {m.familyNote}
      </p>
    </div>
  );
}

/* ---------------- SIGNUP ---------------- */
function SignupSection({ lang, onBecomeMember }) {
  const [form, setForm] = useState({
    name: "", email: "", children: "0", childrenAges: "", motherAge: "", dueDate: "", card: "", newsletter: true,
  });
  const [submitted, setSubmitted] = useState(false);

  const L = lang === "fr"
    ? {
        title: "Créer votre profil", subtitle: "Quelques informations pour personnaliser votre expérience.",
        name: "Nom complet", email: "Courriel", children: "Nombre d'enfants", childrenAges: "Âge des enfants",
        childrenAgesPlaceholder: "Ex. 2 ans, 4 mois", motherAge: "Votre âge",
        due: "Date prévue d'accouchement (si applicable)",
        card: "Mode de paiement (numéro de carte)", newsletter: "J'accepte de recevoir l'infolettre mensuelle Me My Baby par courriel.",
        submit: "Créer mon profil", success: "Bienvenue chez Me My Baby ! Votre profil a été créé.",
        demo: "Démonstration : aucun compte réel n'est créé, aucun paiement n'est traité et aucun courriel n'est envoyé dans ce prototype.",
        dataNote: "Ces informations nous aident à mieux comprendre notre communauté et à adapter le contenu — elles restent confidentielles.",
      }
    : lang === "es"
    ? {
        title: "Crea tu perfil", subtitle: "Algunos datos para personalizar tu experiencia.",
        name: "Nombre completo", email: "Correo electrónico", children: "Número de hijos", childrenAges: "Edad de los hijos",
        childrenAgesPlaceholder: "Ej. 2 años, 4 meses", motherAge: "Tu edad",
        due: "Fecha probable de parto (si aplica)",
        card: "Método de pago (número de tarjeta)", newsletter: "Acepto recibir el boletín mensual de Me My Baby por correo electrónico.",
        submit: "Crear mi perfil", success: "¡Bienvenida a Me My Baby! Tu perfil ha sido creado.",
        demo: "Demostración: no se crea ninguna cuenta real, no se procesa ningún pago y no se envía ningún correo en este prototipo.",
        dataNote: "Esta información nos ayuda a comprender mejor a nuestra comunidad y adaptar el contenido — se mantiene confidencial.",
      }
    : {
        title: "Create your profile", subtitle: "A few details to personalize your experience.",
        name: "Full name", email: "Email", children: "Number of children", childrenAges: "Children's ages",
        childrenAgesPlaceholder: "E.g. 2 years, 4 months", motherAge: "Your age",
        due: "Expected due date (if applicable)",
        card: "Payment method (card number)", newsletter: "I agree to receive the monthly Me My Baby newsletter by email.",
        submit: "Create my profile", success: "Welcome to Me My Baby! Your profile has been created.",
        demo: "Demo only: no real account is created, no payment is processed, and no email is sent in this prototype.",
        dataNote: "This information helps us better understand our community and tailor our content — it stays confidential.",
      };

  const inputStyle = { width: "100%", padding: "10px 13px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14.5, boxSizing: "border-box" };
  const labelStyle = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: COLORS.muted, fontWeight: 600, marginBottom: 14 };

  if (submitted) {
    return (
      <Card style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: COLORS.sage, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Check size={28} color="#fff" />
        </div>
        <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: COLORS.teal, margin: "0 0 8px" }}>{L.success}</h3>
        <p style={{ fontSize: 13, color: COLORS.muted }}>{L.demo}</p>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
        <div style={{ background: COLORS.cream, borderRadius: 14, padding: 6 }}>
          <Illustration type="profile" size={40} />
        </div>
        <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 26, color: COLORS.teal, margin: 0 }}>{L.title}</h2>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 14, marginBottom: 20 }}>{L.subtitle}</p>
      <Card>
        <div>
          <label style={labelStyle}>{L.name}
            <input required style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label style={labelStyle}>{L.email}
            <input required type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label style={labelStyle}>{L.motherAge}
            <input type="number" min={13} max={60} style={inputStyle} value={form.motherAge} onChange={(e) => setForm({ ...form, motherAge: e.target.value })} />
          </label>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, flex: 1, minWidth: 160 }}>{L.children}
              <input type="number" min={0} style={inputStyle} value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} />
            </label>
            <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>{L.childrenAges}
              <input placeholder={L.childrenAgesPlaceholder} style={inputStyle} value={form.childrenAges} onChange={(e) => setForm({ ...form, childrenAges: e.target.value })} />
            </label>
          </div>
          <label style={labelStyle}>{L.due}
            <input type="date" style={inputStyle} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </label>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: "-6px 0 16px", fontStyle: "italic" }}>{L.dataNote}</p>
          <label style={labelStyle}>{L.card}
            <input placeholder="•••• •••• •••• ••••" style={inputStyle} value={form.card} onChange={(e) => setForm({ ...form, card: e.target.value })} />
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: COLORS.text, margin: "6px 0 20px", cursor: "pointer" }}>
            <input type="checkbox" checked={form.newsletter} onChange={(e) => setForm({ ...form, newsletter: e.target.checked })} style={{ marginTop: 3 }} />
            <span>{L.newsletter}</span>
          </label>
          <button
            type="button"
            onClick={() => { setSubmitted(true); onBecomeMember && onBecomeMember(); }}
            style={{
              width: "100%", background: COLORS.teal, color: "#fff", border: "none", padding: "13px",
              borderRadius: 12, fontSize: 15.5, fontWeight: 700, cursor: "pointer",
            }}>{L.submit}</button>
          <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 12, textAlign: "center" }}>{L.demo}</p>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- NAV CONFIG ---------------- */
/* ---------------- PROFILE ---------------- */
function ProfileSection({ lang, setLang, children, setChildren, userProfile, onLogout, session, justSignedUp, onOnboardingDone, standalone, isMember, onBecomeMember }) {
  const [editing, setEditing] = useState(!!justSignedUp);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [photo, setPhoto] = useState(userProfile?.photoUrl || null);
  const [photoFile, setPhotoFile] = useState(null);
  const photoInputRef = useRef(null);
  const hasSession = !!(session?.access_token && session?.user?.id);
  const [form, setForm] = useState({
    name: userProfile ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || (lang === "fr" ? "Prénom Nom" : lang === "es" ? "Nombre Apellido" : "First Last") : (lang === "fr" ? "Prénom Nom" : lang === "es" ? "Nombre Apellido" : "First Last"),
    email: userProfile?.email || "vous@exemple.com",
    username: userProfile?.username || "",
    country: userProfile?.country || "CA",
    language: userProfile?.language || lang || "fr",
    age: userProfile?.motherAge || "",
    birthdate: userProfile?.motherBirthdate || "",
    children: userProfile?.children ?? "0",
    dueDate: userProfile?.dueDate || "",
  });
  // Brouillons de fiches enfant, un par enfant à créer selon le nombre saisi
  const [childDrafts, setChildDrafts] = useState([]);

  const handleChildrenCountChange = (value) => {
    const count = Math.max(0, Math.min(20, Number(value) || 0));
    setForm((f) => ({ ...f, children: value }));
    setChildDrafts((prev) => Array.from({ length: count }, (_, i) => prev[i] || { name: "", birthdate: "", photo: null, photoFile: null }));
  };
  const updateChildDraft = (i, field, value) => {
    setChildDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  };
  const handleChildDraftPhoto = async (i, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl, file: resizedFile } = await resizeImageForUpload(file);
    updateChildDraft(i, "photo", dataUrl);
    updateChildDraft(i, "photoFile", resizedFile);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl, file: resizedFile } = await resizeImageForUpload(file);
    setPhoto(dataUrl);
    setPhotoFile(resizedFile);
  };

  const computeBirthdateFromAge = (value, unit) => {
    const n = Number(value) || 0;
    const d = new Date();
    if (unit === "months") d.setMonth(d.getMonth() - n);
    else d.setFullYear(d.getFullYear() - n);
    return d.toISOString().slice(0, 10);
  };

  // Calcule un âge (en années, ou en mois si moins de 2 ans) à partir d'une date de naissance
  const computeAgeFromBirthdate = (birthdateStr) => {
    if (!birthdateStr) return null;
    const birth = new Date(birthdateStr + "T00:00:00");
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) years--;
    if (years < 2) {
      let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
      if (today.getDate() < birth.getDate()) months--;
      return { value: Math.max(0, months), unit: "months" };
    }
    return { value: Math.max(0, years), unit: "years" };
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    let hadError = false;
    // 0. Sauvegarde de la photo de profil (si une nouvelle a été choisie)
    let profilePhotoUrl = photo;
    if (hasSession && photoFile) {
      try {
        profilePhotoUrl = await supabaseUploadPhoto(photoFile, session.user.id, session.access_token);
      } catch (e) { hadError = true; }
    }
    // 1. Sauvegarde nom / courriel / âge / pays / langue du profil
    if (hasSession) {
      const [firstName, ...rest] = form.name.trim().split(" ");
      try {
        await supabaseUpdateProfile(session.user.id, {
          first_name: firstName || "", last_name: rest.join(" "), mother_age: form.age || null, mother_birthdate: form.birthdate || null,
          username: form.username || null, due_date: form.dueDate || null, children: form.children,
          country: form.country || null, language: form.language || "fr", photo_url: profilePhotoUrl || null,
        }, session.access_token);
      } catch (e) { hadError = true; }
    }
    if (form.language && form.language !== lang && setLang) setLang(form.language); // applique la nouvelle langue immédiatement
    // 2. Création des fiches enfant remplies — on ne perd plus les brouillons qui échouent
    const filledDrafts = childDrafts.filter((d) => d.name.trim());
    const stillPending = [];
    for (const draft of filledDrafts) {
      const birthdate = draft.birthdate || "";
      if (hasSession) {
        try {
          let photoUrl = null;
          if (draft.photoFile) photoUrl = await supabaseUploadPhoto(draft.photoFile, session.user.id, session.access_token);
          const row = await supabaseAddChild({ name: draft.name.trim(), birthdate, photo: photoUrl }, session.user.id, session.access_token);
          setChildren((c) => [...c, mapChildRow(row)]);
        } catch (e) { hadError = true; stillPending.push(draft); }
      } else {
        setChildren((c) => [...c, { name: draft.name.trim(), birthdate, photo: draft.photo, id: `local-${Date.now()}-${Math.random()}` }]);
      }
    }
    setChildDrafts(stillPending); // seuls les brouillons qui ont échoué restent affichés, pour réessayer
    setSaving(false);
    if (hadError) {
      setErrorMsg(L.errorSave);
      return; // on reste sur le formulaire d'édition, rien n'est perdu, la personne peut réessayer
    }
    setPhoto(profilePhotoUrl);
    setEditing(false);
    setSaved(true);
    if (onOnboardingDone) onOnboardingDone();
  };

  const L = lang === "fr"
    ? { title: "Mon profil", subtitle: "Vos informations personnelles.", name: "Nom complet", email: "Courriel",
        username: "Nom d'utilisateur (optionnel)", country: "Pays", language: "Langue de l'application",
        age: "Votre âge", birthdate: "Votre date de naissance", ageComputed: (a) => `Vous avez ${a} ans`,
        children: "Nombre d'enfants", due: "Date prévue d'accouchement (si applicable)", edit: "Modifier", save: "Enregistrer",
        continueBtn: "Continuer vers mon profil",
        cancel: "Annuler", saved: "Profil mis à jour.", memberSince: "Membre depuis", demo: "Démonstration : aucune donnée n'est réellement sauvegardée.",
        errorSave: "Certaines informations n'ont pas pu être enregistrées (connexion instable). Rien n'a été perdu — vérifiez les champs ci-dessous et cliquez de nouveau sur Enregistrer.",
        congrats: "Félicitations pour votre grossesse ! 🎉", dueOn: (d) => `Bébé est attendu pour le ${d}`,
        weeksLabel: (w, d) => `Vous en êtes à ${w} semaine${w > 1 ? "s" : ""}${d > 0 ? ` et ${d} jour${d > 1 ? "s" : ""}` : ""}`,
        trimesterLabel: (t) => `${t}${t === 1 ? "er" : "e"} trimestre`, changePhoto: "Changer la photo", addPhoto: "Ajouter une photo",
        logout: "Se déconnecter",
        welcomeTitle: (name) => `Bonjour ${name} !`, welcomeSubtitle: "Débutons par créer votre profil.",
        childName: (i) => `Prénom de l'enfant ${i + 1}`, childBirthdate: "Date de naissance",
        childAgeComputed: (a, unit) => unit === "months" ? `${a} mois` : `${a} an${a > 1 ? "s" : ""}`,
        childPhoto: "Photo", saving: "Enregistrement…" }
    : lang === "es"
    ? { title: "Mi perfil", subtitle: "Tu información personal.", name: "Nombre completo", email: "Correo electrónico",
        username: "Nombre de usuario (opcional)", country: "País", language: "Idioma de la aplicación",
        age: "Tu edad", birthdate: "Tu fecha de nacimiento", ageComputed: (a) => `Tienes ${a} años`,
        children: "Número de hijos", due: "Fecha probable de parto (si aplica)", edit: "Editar", save: "Guardar",
        continueBtn: "Continuar a mi perfil",
        cancel: "Cancelar", saved: "Perfil actualizado.", memberSince: "Miembro desde", demo: "Demostración: ningún dato se guarda realmente.",
        errorSave: "Algunos datos no se pudieron guardar (conexión inestable). No se perdió nada — revisa los campos abajo y haz clic en Guardar de nuevo.",
        congrats: "¡Felicidades por tu embarazo! 🎉", dueOn: (d) => `El bebé está previsto para el ${d}`,
        weeksLabel: (w, d) => `Estás en la semana ${w}${d > 0 ? ` y ${d} día${d > 1 ? "s" : ""}` : ""}`,
        trimesterLabel: (t) => `${t}º trimestre`, changePhoto: "Cambiar la foto", addPhoto: "Agregar una foto",
        logout: "Cerrar sesión",
        welcomeTitle: (name) => `¡Hola ${name}!`, welcomeSubtitle: "Comencemos por crear tu perfil.",
        childName: (i) => `Nombre del hijo/a ${i + 1}`, childBirthdate: "Fecha de nacimiento",
        childAgeComputed: (a, unit) => unit === "months" ? `${a} meses` : `${a} año${a > 1 ? "s" : ""}`,
        childPhoto: "Foto", saving: "Guardando…" }
    : { title: "My profile", subtitle: "Your personal information.", name: "Full name", email: "Email",
        username: "Username (optional)", country: "Country", language: "App language",
        age: "Your age", birthdate: "Your date of birth", ageComputed: (a) => `You are ${a} years old`,
        children: "Number of children", due: "Expected due date (if applicable)", edit: "Edit", save: "Save",
        continueBtn: "Continue to my profile",
        cancel: "Cancel", saved: "Profile updated.", memberSince: "Member since", demo: "Demo only: no data is actually saved.",
        errorSave: "Some information couldn't be saved (unstable connection). Nothing was lost — check the fields below and click Save again.",
        congrats: "Congratulations on your pregnancy! 🎉", dueOn: (d) => `Baby is due on ${d}`,
        weeksLabel: (w, d) => `You're at ${w} week${w > 1 ? "s" : ""}${d > 0 ? ` and ${d} day${d > 1 ? "s" : ""}` : ""}`,
        trimesterLabel: (t) => `${t === 1 ? "1st" : t === 2 ? "2nd" : "3rd"} trimester`, changePhoto: "Change photo", addPhoto: "Add a photo",
        logout: "Log out",
        welcomeTitle: (name) => `Hello ${name}!`, welcomeSubtitle: "Let's start by creating your profile.",
        childName: (i) => `Child ${i + 1}'s first name`, childAge: "Age", years: "years", months: "months",
        childPhoto: "Photo", saving: "Saving…" };

  const inputStyle = { width: "100%", padding: "10px 13px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14.5, boxSizing: "border-box" };
  const labelStyle = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: COLORS.muted, fontWeight: 600, marginBottom: 14 };
  const initials = form.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const pregnancy = useMemo(() => {
    if (!form.dueDate) return null;
    const dueDateObj = new Date(form.dueDate + "T00:00:00");
    if (isNaN(dueDateObj.getTime())) return null;
    const conceptionStart = new Date(dueDateObj);
    conceptionStart.setDate(conceptionStart.getDate() - 280); // 40 semaines avant la DPA
    const today = new Date();
    const diffDays = Math.floor((today - conceptionStart) / 86400000);
    const weeks = Math.max(0, Math.min(42, Math.floor(diffDays / 7)));
    const days = Math.max(0, diffDays % 7);
    const trimester = weeks <= 13 ? 1 : weeks <= 27 ? 2 : 3;
    const fmtDue = dueDateObj.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long", year: "numeric" });
    return { weeks, days, trimester, fmtDue };
  }, [form.dueDate, lang]);

  const TRIMESTER_SUMMARY = {
    1: {
      fr: "Le premier trimestre est marqué par les grands changements hormonaux : fatigue, nausées possibles, seins sensibles — pendant que les organes essentiels de bébé se forment.",
      en: "The first trimester brings big hormonal shifts: fatigue, possible nausea, tender breasts — while baby's essential organs are forming.",
    },
    2: {
      fr: "Le deuxième trimestre est souvent le plus confortable : l'énergie revient, le ventre s'arrondit, et vous sentirez bientôt (ou déjà) les premiers mouvements de bébé.",
      en: "The second trimester is often the most comfortable: energy returns, the belly rounds out, and you'll soon feel (or already are feeling) baby's first movements.",
    },
    3: {
      fr: "Le troisième trimestre est la dernière ligne droite : bébé prend du poids rapidement et se prépare à la naissance — bon moment pour préparer votre valise de maternité.",
      en: "The third trimester is the home stretch: baby is gaining weight quickly and getting ready for birth — a good time to pack your hospital bag.",
    },
  };

  const infoCards = [
    { label: L.email, value: form.email, icon: Mail, color: COLORS.blue, bg: "#EAF2F8" },
    { label: L.age, value: form.age || "—", icon: User, color: COLORS.sage, bg: "#F0F5EC" },
    { label: L.children, value: form.children, icon: Baby, color: COLORS.pink, bg: "#FDF0F3" },
  ];

  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.teal} 0%, #3f6178 100%)`,
        borderRadius: 24, padding: "34px 28px", textAlign: "center", color: "#fff",
        marginBottom: 20, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -20, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ position: "relative", display: "inline-block", margin: "0 auto 16px" }}>
          <div style={{
            width: 128, height: 128, borderRadius: "50%", background: COLORS.ochre, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, Georgia, serif",
            fontSize: 42, fontWeight: 700, flexShrink: 0, position: "relative", overflow: "hidden",
            border: "4px solid rgba(255,255,255,0.5)", boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
          }}>
            {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            style={{
              position: "absolute", bottom: 0, right: 2, width: 36, height: 36, borderRadius: "50%",
              background: COLORS.ochre, border: "3px solid #fff", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.25)", fontSize: 15,
            }}
            aria-label={photo ? L.changePhoto : L.addPhoto}
          >
            📷
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
        </div>
        {justSignedUp ? (
          <>
            <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 25, margin: "0 0 4px", position: "relative" }}>{L.welcomeTitle(form.name)}</h2>
            <p style={{ fontSize: 14, opacity: 0.9, margin: 0, position: "relative" }}>{L.welcomeSubtitle}</p>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 25, margin: "0 0 4px", position: "relative" }}>{form.name}</h2>
            <p style={{ fontSize: 13, opacity: 0.85, margin: 0, position: "relative" }}>
              {L.memberSince} {new Date().toLocaleDateString(lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA", { month: "long", year: "numeric" })}
            </p>
          </>
        )}
      </div>

      {pregnancy && !editing && (
        <div style={{
          background: `linear-gradient(135deg, ${COLORS.pink} 0%, ${COLORS.ochre} 100%)`,
          borderRadius: 22, padding: "22px 24px", color: "#fff", marginBottom: 20,
          position: "relative", overflow: "hidden", boxShadow: "0 8px 20px rgba(217,139,164,0.30)",
        }}>
          <div style={{ position: "absolute", top: -24, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.10)" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, background: "rgba(255,255,255,0.25)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Baby size={24} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 19, margin: "0 0 4px" }}>{L.congrats}</h3>
              <p style={{ fontSize: 13.5, margin: "0 0 10px", opacity: 0.95 }}>{L.dueOn(pregnancy.fmtDue)}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{
                  background: "rgba(255,255,255,0.25)", padding: "5px 12px", borderRadius: 999,
                  fontSize: 12.5, fontWeight: 700,
                }}>{L.weeksLabel(pregnancy.weeks, pregnancy.days)}</span>
                <span style={{
                  background: "rgba(255,255,255,0.25)", padding: "5px 12px", borderRadius: 999,
                  fontSize: 12.5, fontWeight: 700,
                }}>{L.trimesterLabel(pregnancy.trimester)}</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, background: "rgba(255,255,255,0.18)", borderRadius: 12, padding: "10px 12px" }}>
                {TRIMESTER_SUMMARY[pregnancy.trimester][lang]}
              </p>
            </div>
          </div>
        </div>
      )}

      <Card style={{ marginBottom: 8 }}>
        {editing ? (
          <div>
            {!justSignedUp && (
              <>
                <label style={labelStyle}>{L.name}
                  <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label style={labelStyle}>{L.email}
                  <input style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
              </>
            )}
            <label style={labelStyle}>{L.username}
              <input style={inputStyle} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </label>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <label style={{ ...labelStyle, flex: 1, minWidth: 160 }}>{L.country}
                <select style={inputStyle} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label[lang]}</option>)}
                </select>
              </label>
              <label style={{ ...labelStyle, flex: 1, minWidth: 160 }}>{L.language}
                <select style={inputStyle} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label[lang]}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <label style={{ ...labelStyle, flex: 1, minWidth: 140 }}>{L.birthdate}
                <input type="date" style={inputStyle} value={form.birthdate} onChange={(e) => {
                  const bd = e.target.value;
                  const computed = computeAgeFromBirthdate(bd);
                  const years = computed ? (computed.unit === "months" ? Math.round(computed.value / 12) : computed.value) : "";
                  setForm({ ...form, birthdate: bd, age: years });
                }} />
                {form.age !== "" && <span style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{L.ageComputed(form.age)}</span>}
              </label>
              <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>{L.due}
                <input type="date" style={inputStyle} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </label>
            </div>
            <label style={{ ...labelStyle, maxWidth: 220 }}>{L.children}
              <input type="number" min={0} max={20} style={inputStyle} value={form.children} onChange={(e) => handleChildrenCountChange(e.target.value)} />
            </label>

            {childDrafts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {childDrafts.map((draft, i) => (
                  <div key={i} style={{ background: COLORS.cream, borderRadius: 14, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <label style={{
                        display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: "50%",
                        background: "#fff", border: `2px dashed ${COLORS.pink}80`, cursor: "pointer", overflow: "hidden", fontSize: 20,
                      }}>
                        {draft.photo ? <img src={draft.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📷"}
                        <input type="file" accept="image/*" onChange={(e) => handleChildDraftPhoto(i, e)} style={{ display: "none" }} />
                      </label>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                      <input
                        placeholder={L.childName(i)} value={draft.name}
                        onChange={(e) => updateChildDraft(i, "name", e.target.value)}
                        style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5, boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11.5, color: COLORS.muted, fontWeight: 600 }}>{L.childBirthdate}</span>
                        <input
                          type="date" value={draft.birthdate}
                          onChange={(e) => updateChildDraft(i, "birthdate", e.target.value)}
                          style={{ padding: "9px 10px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5, boxSizing: "border-box" }}
                        />
                        {draft.birthdate && (() => {
                          const a = computeAgeFromBirthdate(draft.birthdate);
                          return a ? <span style={{ fontSize: 11.5, color: COLORS.muted }}>{L.childAgeComputed(a.value, a.unit)}</span> : null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button onClick={handleSave} disabled={saving} style={{ background: COLORS.teal, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? L.saving : justSignedUp ? L.continueBtn : L.save}</button>
              {!justSignedUp && <button onClick={() => setEditing(false)} style={{ background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.line}`, padding: "10px 22px", borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{L.cancel}</button>}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {infoCards.map((c, i) => (
                <div key={i} style={{ background: c.bg, borderRadius: 14, padding: "14px 16px", borderTop: `3px solid ${c.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <c.icon size={14} color="#fff" />
                    </div>
                    <div style={{ fontSize: 11.5, color: c.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>{c.label}</div>
                  </div>
                  <div style={{ fontSize: 15, color: COLORS.text, fontWeight: 700 }}>{c.value}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setEditing(true)} style={{
              display: "inline-flex", alignItems: "center", gap: 7, background: COLORS.teal, color: "#fff", border: "none",
              padding: "10px 22px", borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 10px rgba(47,72,88,0.25)",
            }}><User size={14} /> {L.edit}</button>
            {saved && <span style={{ marginLeft: 12, fontSize: 13, color: COLORS.sage, fontWeight: 700 }}>✓ {L.saved}</span>}
          </div>
        )}
      </Card>
      {errorMsg && <p style={{ fontSize: 12.5, color: "#B3261E", marginTop: 10, marginBottom: 0, textAlign: "center", fontWeight: 600 }}>{errorMsg}</p>}
      {!standalone && !hasSession && <p style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 4, marginBottom: 24, textAlign: "center", fontStyle: "italic" }}>{L.demo}</p>}

      {!standalone && (
        <>
          <ChildrenManager lang={lang} children={children} setChildren={setChildren} session={session} />
          <CoParentInvite lang={lang} />
          {onBecomeMember && (
            <button
              onClick={onBecomeMember}
              style={{
                display: "block", width: "100%", marginTop: 22, background: isMember ? COLORS.sage : COLORS.teal,
                border: "none", color: "#fff", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              }}
            >
              {isMember
                ? (lang === "fr" ? "✓ Accès conceptrice activé" : lang === "es" ? "✓ Acceso de diseñadora activado" : "✓ Designer access active")
                : (lang === "fr" ? "Activer l'accès conceptrice (accès complet)" : lang === "es" ? "Activar acceso de diseñadora (acceso completo)" : "Activate designer access (full access)")}
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: "block", width: "100%", marginTop: 22, background: "#fff", border: `1px solid ${COLORS.line}`,
                color: "#B3261E", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              }}
            >
              {L.logout}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- CHILDREN MANAGER (multi-child, light) ---------------- */
function ChildrenManager({ lang, children, setChildren, session }) {
  const [form, setForm] = useState({ name: "", birthdate: "", photo: null });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);
  const L = lang === "fr"
    ? { title: "Mes enfants", subtitle: "Ajoutez chacun de vos enfants pour un suivi personnalisé (croissance, jalons, etc.).",
        name: "Prénom", birthdate: "Date de naissance", add: "Ajouter", empty: "Aucun enfant ajouté pour l'instant.", remove: "Retirer", photo: "Photo (optionnel)",
        errorAdd: "Impossible d'ajouter l'enfant pour le moment. Réessayez.", errorRemove: "Impossible de retirer l'enfant pour le moment." }
    : lang === "es"
    ? { title: "Mis hijos", subtitle: "Agrega a cada uno de tus hijos para un seguimiento personalizado (crecimiento, hitos, etc.).",
        name: "Nombre", birthdate: "Fecha de nacimiento", add: "Agregar", empty: "Aún no hay hijos agregados.", remove: "Quitar", photo: "Foto (opcional)",
        errorAdd: "No se pudo agregar al hijo/a por ahora. Inténtalo de nuevo.", errorRemove: "No se pudo quitar al hijo/a por ahora." }
    : { title: "My children", subtitle: "Add each of your children for personalized tracking (growth, milestones, etc.).",
        name: "First name", birthdate: "Date of birth", add: "Add", empty: "No children added yet.", remove: "Remove", photo: "Photo (optional)",
        errorAdd: "Couldn't add your child right now. Please try again.", errorRemove: "Couldn't remove your child right now." };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo: reader.result, photoFile: file }));
    reader.readAsDataURL(file);
  };

  const hasSession = !!(session?.access_token && session?.user?.id);

  const addChild = async () => {
    if (!form.name.trim()) return;
    setErrorMsg("");
    if (hasSession) {
      setSaving(true);
      try {
        let photoUrl = null;
        if (form.photoFile) photoUrl = await supabaseUploadPhoto(form.photoFile, session.user.id, session.access_token);
        const row = await supabaseAddChild({ ...form, photo: photoUrl }, session.user.id, session.access_token);
        setChildren((c) => [...c, mapChildRow(row)]);
        setForm({ name: "", birthdate: "", photo: null, photoFile: null });
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        setErrorMsg(L.errorAdd);
      }
      setSaving(false);
    } else {
      // Mode aperçu / hors connexion : on garde l'enfant en mémoire locale seulement
      setChildren((c) => [...c, { ...form, id: `local-${Date.now()}` }]);
      setForm({ name: "", birthdate: "", photo: null, photoFile: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeChild = async (id) => {
    setErrorMsg("");
    if (hasSession && typeof id === "string" && !id.startsWith("local-")) {
      try {
        await supabaseDeleteChild(id, session.access_token);
        setChildren((c) => c.filter((ch) => ch.id !== id));
      } catch (err) {
        setErrorMsg(L.errorRemove);
      }
    } else {
      setChildren((c) => c.filter((ch) => ch.id !== id));
    }
  };

  const inputStyle = { flex: 1, minWidth: 120, padding: "9px 12px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5 };

  return (
    <Card style={{ marginBottom: 20, borderTop: `4px solid ${COLORS.pink}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS.pink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Baby size={16} color="#fff" />
        </div>
        <h3 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: COLORS.teal }}>{L.title}</h3>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.muted }}>{L.subtitle}</p>

      {children.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {children.map((ch) => (
            <div key={ch.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FDF0F3",
              borderRadius: 12, padding: "10px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", background: COLORS.pink, color: "#fff", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, overflow: "hidden",
                }}>
                  {ch.photo ? <img src={ch.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (ch.name?.[0] || "?").toUpperCase()}
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: COLORS.text, fontSize: 14 }}>{ch.name}</span>
                  {ch.birthdate && <span style={{ color: COLORS.muted, fontSize: 12.5, marginLeft: 8 }}>{ch.birthdate}</span>}
                </div>
              </div>
              <button onClick={() => removeChild(ch.id)} style={{ background: "none", border: "none", color: COLORS.pink, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{L.remove}</button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: COLORS.muted, fontStyle: "italic", marginBottom: 14 }}>{L.empty}</p>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: COLORS.cream, border: `1px dashed ${COLORS.line}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", cursor: "pointer",
        }} onClick={() => fileInputRef.current?.click()}>
          {form.photo ? <img src={form.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📷"}
        </div>
        <span onClick={() => fileInputRef.current?.click()} style={{ fontSize: 12, color: COLORS.muted, cursor: "pointer" }}>{L.photo}</span>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={inputStyle} placeholder={L.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input type="date" style={inputStyle} value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
        <button
          onClick={addChild} disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 10, border: "none", background: COLORS.teal, color: "#fff",
            fontWeight: 700, fontSize: 13, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
          }}
        >{saving ? "…" : L.add}</button>
      </div>
      {errorMsg && <p style={{ fontSize: 12, color: "#B3261E", marginTop: 10, marginBottom: 0 }}>{errorMsg}</p>}
    </Card>
  );
}

/* ---------------- CO-PARENT INVITE (UI only — needs backend to actually send/share) ---------------- */
function CoParentInvite({ lang }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const L = lang === "fr"
    ? {
        title: "Inviter mon/ma partenaire", subtitle: "Partagez l'accès à votre profil et vos suivis avec votre conjoint·e.",
        placeholder: "Courriel de votre partenaire", send: "Envoyer l'invitation",
        note: "Cette fonctionnalité nécessite une connexion backend (comptes liés) qui reste à mettre en place — pour l'instant, ce bouton ne fait qu'illustrer le futur parcours.",
        sentMsg: "Aperçu : dans la version finale, une invitation serait envoyée à cette adresse.",
      }
    : lang === "es"
    ? {
        title: "Invitar a mi pareja", subtitle: "Comparte el acceso a tu perfil y tus seguimientos con tu pareja.",
        placeholder: "Correo electrónico de tu pareja", send: "Enviar invitación",
        note: "Esta función necesita una conexión de backend (cuentas vinculadas) que aún debe implementarse — por ahora este botón solo muestra un adelanto del futuro recorrido.",
        sentMsg: "Vista previa: en la versión final, se enviaría una invitación a esta dirección.",
      }
    : {
        title: "Invite my partner", subtitle: "Share access to your profile and tracking with your partner.",
        placeholder: "Partner's email", send: "Send invitation",
        note: "This feature needs a backend connection (linked accounts) that still needs to be built — for now this button only previews the future flow.",
        sentMsg: "Preview: in the final version, an invitation would be sent to this address.",
      };

  return (
    <Card style={{ borderTop: `4px solid ${COLORS.blue}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={16} color="#fff" />
        </div>
        <h3 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 18, color: COLORS.teal }}>{L.title}</h3>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.muted }}>{L.subtitle}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          type="email" placeholder={L.placeholder} value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: "10px 13px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 13.5 }}
        />
        <button onClick={() => email.trim() && setSent(true)} style={{
          padding: "10px 18px", borderRadius: 10, border: "none", background: COLORS.ochre, color: "#fff",
          fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>{L.send}</button>
      </div>
      {sent && <p style={{ fontSize: 12.5, color: COLORS.sage, fontWeight: 700, marginBottom: 8 }}>✓ {L.sentMsg}</p>}
      <p style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>{L.note}</p>
    </Card>
  );
}

/* ---------------- MY SUBSCRIPTION ---------------- */
function MySubscriptionSection({ lang, goTo }) {
  const [status, setStatus] = useState("active"); // active | paused | cancelled
  const [showManage, setShowManage] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly"); // monthly | annual — reflète le choix fait à l'inscription
  const renewDate = new Date();
  renewDate.setDate(renewDate.getDate() + (billingCycle === "annual" ? 365 : 30));
  const fmt = (d) => d.toLocaleDateString(lang === "fr" ? "fr-CA" : lang === "es" ? "es-MX" : "en-CA", { day: "numeric", month: "long", year: "numeric" });
  const premiumPlan = PLANS[lang].find((p) => p.id === "premium");

  const L = lang === "fr"
    ? { title: "Mon abonnement", subtitle: "Gérez votre abonnement Me My Baby.", plan: "Forfait actuel", price: "9,95 $ / mois", priceAnnual: "99 $ / an",
        memberLabel: "Membre", billingMonthly: "Mensuel", billingAnnual: "Annuel",
        statusActive: "Actif", statusPaused: "En pause", statusCancelled: "Annulé",
        renew: "Prochain renouvellement", payment: "Mode de paiement", update: "Mettre à jour le paiement",
        manageLink: "Gérer mon abonnement", pauseBtn: "Mettre en pause", resumeBtn: "Réactiver mon abonnement", cancelBtn: "Annuler mon abonnement",
        pausedMsg: "Votre abonnement est en pause — reprenez-le quand vous êtes prêtes, sans perdre votre historique.",
        cancelledMsgMonthly: "Votre abonnement mensuel sera annulé à la fin de la période déjà payée — vous conservez l'accès jusqu'à cette date, sans frais additionnel.",
        cancelledMsgAnnual: "Votre abonnement annuel ne sera pas renouvelé l'an prochain. Comme les abonnements annuels ne sont pas remboursables, vous conservez l'accès complet jusqu'à la fin de vos 12 mois déjà payés.",
        pauseHint: "Besoin d'une pause plutôt que d'une annulation ? Beaucoup de parents reviennent à la prochaine étape de bébé.",
        includesTitle: "Tout ce qui est inclus", includesTagline: "Un seul abonnement, un accès complet — sans paliers ni surprises.",
        annualNote: "Facturé une fois par année, non remboursable, avec accès complet pendant 12 mois. Se renouvelle automatiquement chaque année avec le même mode de paiement, sauf annulation avant la date de renouvellement.",
        monthlyNote: "Facturé chaque mois avec le même mode de paiement. Annulable à tout moment, sans frais.",
        demo: "Démonstration : aucune transaction réelle n'est traitée." }
    : lang === "es"
    ? { title: "Mi suscripción", subtitle: "Gestiona tu membresía de Me My Baby.", plan: "Plan actual", price: "$9.95 / mes", priceAnnual: "$99 / año",
        memberLabel: "Miembro", billingMonthly: "Mensual", billingAnnual: "Anual",
        statusActive: "Activa", statusPaused: "En pausa", statusCancelled: "Cancelada",
        renew: "Próxima renovación", payment: "Método de pago", update: "Actualizar método de pago",
        manageLink: "Gestionar mi suscripción", pauseBtn: "Pausar mi suscripción", resumeBtn: "Reactivar mi suscripción", cancelBtn: "Cancelar mi suscripción",
        pausedMsg: "Tu suscripción está en pausa — retómala cuando estés lista, sin perder tu historial.",
        cancelledMsgMonthly: "Tu suscripción mensual se cancelará al final del período ya pagado — conservas el acceso hasta esa fecha, sin costo adicional.",
        cancelledMsgAnnual: "Tu suscripción anual no se renovará el próximo año. Como los planes anuales no son reembolsables, conservas el acceso completo hasta el final de tus 12 meses ya pagados.",
        pauseHint: "¿Necesitas una pausa en lugar de cancelar? Muchos padres regresan en la siguiente etapa del bebé.",
        includesTitle: "Todo lo incluido", includesTagline: "Una sola membresía, acceso completo — sin niveles ni sorpresas.",
        annualNote: "Se factura una vez al año, no reembolsable, con acceso completo durante 12 meses. Se renueva automáticamente cada año con el mismo método de pago, salvo cancelación antes de la fecha de renovación.",
        monthlyNote: "Se factura cada mes con el mismo método de pago. Cancelable en cualquier momento, sin costo.",
        demo: "Demostración: no se procesa ninguna transacción real." }
    : { title: "My subscription", subtitle: "Manage your Me My Baby membership.", plan: "Current plan", price: "$9.95 / month", priceAnnual: "$99 / year",
        memberLabel: "Member", billingMonthly: "Monthly", billingAnnual: "Annual",
        statusActive: "Active", statusPaused: "Paused", statusCancelled: "Cancelled",
        renew: "Next renewal", payment: "Payment method", update: "Update payment method",
        manageLink: "Manage my subscription", pauseBtn: "Pause my subscription", resumeBtn: "Resume my subscription", cancelBtn: "Cancel my subscription",
        pausedMsg: "Your subscription is paused — resume whenever you're ready, without losing your history.",
        cancelledMsgMonthly: "Your monthly subscription will be cancelled at the end of the period already paid for — you keep access until that date, at no extra cost.",
        cancelledMsgAnnual: "Your annual subscription won't renew next year. Since annual plans are non-refundable, you keep full access through the end of your already-paid 12 months.",
        pauseHint: "Need a break instead of cancelling? Many parents come back at baby's next stage.",
        includesTitle: "Everything included", includesTagline: "One membership, full access — no tiers, no surprises.",
        annualNote: "Billed once a year, non-refundable, with full access for 12 months. Automatically renews each year with the same payment method, unless cancelled before the renewal date.",
        monthlyNote: "Billed every month with the same payment method. Cancel anytime, at no cost.",
        demo: "Demo only: no real transaction is processed." };

  const statusStyles = {
    active: { bg: "#E4EEE3", color: COLORS.sage, label: L.statusActive },
    paused: { bg: "#F3E3D3", color: COLORS.ochre, label: L.statusPaused },
    cancelled: { bg: "#F3E3D3", color: "#B5533C", label: L.statusCancelled },
  };
  const s = statusStyles[status];
  const featureColors = [COLORS.sage, COLORS.ochre, COLORS.pink, COLORS.blue];

  return (
    <div>
      <SectionHeroCustom icon={CreditCard} color={COLORS.sage} title={L.title} desc={L.subtitle} illuType="mysub" />

      {/* What's included — front and center, redesigned as an attractive summary */}
      <Card style={{ marginBottom: 18, border: "none", background: `linear-gradient(135deg, ${COLORS.teal} 0%, #3f6178 100%)`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -36, right: -36, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -46, left: -26, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.yellow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Check size={16} color={COLORS.teal} strokeWidth={3} />
          </div>
          <div style={{ fontWeight: 800, color: "#fff", fontFamily: "Fraunces, Georgia, serif", fontSize: 21 }}>{L.includesTitle}</div>
        </div>
        <p style={{ position: "relative", color: "rgba(255,255,255,0.82)", fontSize: 13.5, marginTop: 0, marginBottom: 18, maxWidth: 480, lineHeight: 1.5 }}>
          {L.includesTagline}
        </p>

        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {premiumPlan.features.map((f, i) => {
            const fColor = featureColors[i % featureColors.length];
            return (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: fColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <Check size={12} color="#fff" strokeWidth={3} />
                </div>
                <span style={{ fontSize: 13.5, color: "#fff", lineHeight: 1.5 }}>{f}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Plan / status card */}
      <Card style={{ marginBottom: 18, borderTop: `4px solid ${COLORS.teal}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
          <div>
            <span style={{ display: "inline-block", background: COLORS.yellow, color: COLORS.teal, padding: "5px 14px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 9 }}>
              {L.plan} — {billingCycle === "annual" ? L.billingAnnual : L.billingMonthly}
            </span>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 26, color: COLORS.teal, fontWeight: 700 }}>Me My Baby {L.memberLabel} — {billingCycle === "annual" ? L.priceAnnual : L.price}</div>
          </div>
          <span style={{ background: s.bg, color: s.color, padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, height: "fit-content" }}>{s.label}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
          <div style={{ background: COLORS.cream, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase" }}>{L.renew}</div>
            <div style={{ fontSize: 14.5, color: COLORS.teal, fontWeight: 600, marginTop: 4 }}>{fmt(renewDate)}</div>
          </div>
          <div style={{ background: COLORS.cream, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase" }}>{L.payment}</div>
            <div style={{ fontSize: 14.5, color: COLORS.teal, fontWeight: 600, marginTop: 4 }}>•••• •••• •••• 4242</div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.5, marginBottom: 16 }}>
          {billingCycle === "annual" ? L.annualNote : L.monthlyNote}
        </p>
        <button style={{ background: COLORS.teal, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{L.update}</button>

        {status === "paused" && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FBF3E4", borderRadius: 12, padding: "11px 13px", marginTop: 16 }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>⏸️</span>
            <p style={{ margin: 0, fontSize: 12.5, color: COLORS.text, lineHeight: 1.5 }}>{L.pausedMsg}</p>
          </div>
        )}
        {status === "cancelled" && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FDF0F3", borderRadius: 12, padding: "11px 13px", marginTop: 16 }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ️</span>
            <p style={{ margin: 0, fontSize: 12.5, color: COLORS.text, lineHeight: 1.5 }}>{billingCycle === "annual" ? L.cancelledMsgAnnual : L.cancelledMsgMonthly}</p>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.line}` }}>
          <button
            onClick={() => setShowManage(!showManage)}
            style={{
              background: "none", border: `1px solid ${COLORS.line}`, color: COLORS.muted, fontSize: 12.5, fontWeight: 700,
              cursor: "pointer", padding: "8px 18px", borderRadius: 999,
            }}
          >
            {L.manageLink} {showManage ? "▲" : "▼"}
          </button>
          {showManage && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
              {status === "active" && (
                <>
                  <button onClick={() => setStatus("paused")} style={{
                    background: "#FBF3E4", border: `1px solid ${COLORS.ochre}50`, color: COLORS.ochre,
                    fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "8px 16px", borderRadius: 999,
                  }}>{L.pauseBtn}</button>
                  <button onClick={() => setStatus("cancelled")} style={{
                    background: "#FDF0F3", border: "1px solid #B5533C50", color: "#B5533C",
                    fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "8px 16px", borderRadius: 999,
                  }}>{L.cancelBtn}</button>
                </>
              )}
              {status === "paused" && (
                <button onClick={() => setStatus("active")} style={{
                  background: "#F0F5EC", border: `1px solid ${COLORS.sage}50`, color: COLORS.sage,
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "8px 16px", borderRadius: 999,
                }}>{L.resumeBtn}</button>
              )}
            </div>
          )}
          {showManage && status === "active" && <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10, fontStyle: "italic" }}>{L.pauseHint}</p>}
        </div>
      </Card>
      <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 12, textAlign: "center" }}>{L.demo}</p>
    </div>
  );
}

/* ---------------- CONTACT ---------------- */
function ContactSection({ lang }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const L = lang === "fr"
    ? { title: "Nous joindre", subtitle: "Une question, un commentaire ? Écrivez-nous.", name: "Nom", email: "Courriel",
        message: "Message", submit: "Envoyer", sentMsg: "Merci ! Votre message a été envoyé.",
        emailUs: "Nous joindre par courriel", supportEmail: "Memybaby.app@gmail.com", hours: "Réponse sous 1 à 5 jours ouvrables",
        formTitle: "Écrivez-nous directement",
        demo: "Démonstration : ce formulaire n'envoie aucun courriel réel." }
    : lang === "es"
    ? { title: "Contáctanos", subtitle: "¿Una pregunta, un comentario? Escríbenos.", name: "Nombre", email: "Correo electrónico",
        message: "Mensaje", submit: "Enviar", sentMsg: "¡Gracias! Tu mensaje ha sido enviado.",
        emailUs: "Contáctanos por correo electrónico", supportEmail: "Memybaby.app@gmail.com", hours: "Respuesta en 1 a 5 días hábiles",
        formTitle: "Escríbenos directamente",
        demo: "Demostración: este formulario no envía ningún correo real." }
    : { title: "Contact us", subtitle: "A question or comment? Write to us.", name: "Name", email: "Email",
        message: "Message", submit: "Send", sentMsg: "Thanks! Your message has been sent.",
        emailUs: "Email us directly", supportEmail: "Memybaby.app@gmail.com", hours: "We reply within 1-5 business days",
        formTitle: "Write to us directly",
        demo: "Demo only: this form doesn't send a real email." };

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${COLORS.line}`, fontSize: 14.5, boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: COLORS.muted, fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.02em" };

  return (
    <div>
      <Card>
        <div style={{ background: "#FBF3E4", borderRadius: 18, padding: "18px 16px", textAlign: "center", marginBottom: 16 }}>
          <ContactHeroIllu size={140} />
        </div>

        <h2 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: COLORS.teal, textAlign: "center" }}>{L.title}</h2>
        <p style={{ margin: "0 0 18px", fontSize: 13.5, color: COLORS.muted, textAlign: "center", lineHeight: 1.5 }}>{L.subtitle}</p>

        <a
          href={`mailto:${L.supportEmail}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            background: "#FBF3E4", border: `1px solid ${COLORS.ochre}50`, borderRadius: 14,
            padding: "13px 16px", textDecoration: "none", marginBottom: 10,
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.ochre, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Mail size={15} color="#fff" />
          </div>
          <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 16, color: COLORS.teal, fontWeight: 700 }}>{L.supportEmail}</span>
        </a>
        <p style={{ fontSize: 11.5, color: COLORS.muted, textAlign: "center", marginBottom: 24 }}>{L.hours}</p>

        <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontFamily: "Fraunces, Georgia, serif", fontSize: 17, color: COLORS.teal, textAlign: "center" }}>{L.formTitle}</h3>
          {sent ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: COLORS.sage, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Check size={24} color="#fff" />
              </div>
              <p style={{ color: COLORS.teal, fontWeight: 700 }}>{L.sentMsg}</p>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>{L.name}
                <input required style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label style={labelStyle}>{L.email}
                <input required type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label style={labelStyle}>{L.message}
                <textarea required rows={5} style={{ ...inputStyle, resize: "vertical" }} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </label>
              <button
                type="button"
                onClick={() => { if (form.name.trim() && form.email.trim() && form.message.trim()) setSent(true); }}
                style={{ display: "block", width: "100%", background: COLORS.teal, color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
              >{L.submit}</button>
            </div>
          )}
          <p style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 14, textAlign: "center" }}>{L.demo}</p>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- FORUM / COMMUNITY ---------------- */
const FORUM_SEED = [
  {
    author: "Camille",
    fr: "Mon bébé de 8 mois refuse les morceaux et ne veut que des purées lisses 🥄 Est-ce que je dois insister ou attendre encore un peu?",
    en: "My 8-month-old refuses lumps and only wants smooth purées 🥄 Should I push through or wait a bit longer?",
    replies: 4, likes: 18,
  },
  {
    author: "Marie-Ève",
    fr: "Première nuit complète depuis la naissance hier soir (5 mois et demi) 💤 — je voulais juste le dire à des gens qui vont comprendre à quel point c'est gros 😭",
    en: "First full night's sleep since birth last night (5.5 months) 💤 — just wanted to tell people who'd understand how huge that is 😭",
    replies: 11, likes: 47,
  },
  {
    author: "Sarah",
    fr: "Des trucs pour la nausée du premier trimestre qui ont vraiment fonctionné pour vous? 🤢 Le gingembre ne fait rien chez moi.",
    en: "Any first-trimester nausea tricks that actually worked for you? 🤢 Ginger does nothing for me.",
    replies: 7, likes: 12,
  },
  {
    author: "Josée",
    fr: "Astuce qui a tout changé pour ma diastase post-partum 💪 : marcher en respirant profondément par le nez, pas par la bouche. Ma physio me l'a montré et ça fait une vraie différence.",
    en: "The tip that changed everything for my postpartum diastasis 💪: walking while breathing deeply through the nose, not the mouth. My physio showed me and it made a real difference.",
    replies: 9, likes: 33,
  },
  {
    author: "Amélie",
    fr: "Pour celles qui allaitent et qui reprennent le travail bientôt 🍼 : commencez à congeler du lait par petites portions de 60-90 ml, c'est tellement plus pratique que les gros formats!",
    en: "For those breastfeeding and heading back to work soon 🍼: start freezing milk in small 60-90 ml portions, it's so much more practical than big batches!",
    replies: 6, likes: 24,
  },
  {
    author: "Noémie",
    fr: "Mon petit a eu sa première poussée dentaire cette semaine 🦷😭 Il mordille absolument tout ce qu'il trouve, même mon épaule!",
    en: "My little one had their first tooth coming in this week 🦷😭 He's chewing on absolutely everything he finds, even my shoulder!",
    replies: 3, likes: 15,
  },
  {
    author: "Valérie",
    fr: "Est-ce normal qu'un bébé de 3 mois dorme seulement 45 minutes par sieste? 😴 Je suis à bout d'énergie, help!",
    en: "Is it normal for a 3-month-old to only nap for 45 minutes at a time? 😴 I'm running on empty, help!",
    replies: 8, likes: 22,
  },
  {
    author: "Geneviève",
    fr: "Merci à cette belle communauté 💛 sans vous je pense que j'aurais paniqué pour rien plusieurs fois depuis la naissance.",
    en: "Thank you to this wonderful community 💛 without you I think I would've panicked for nothing several times since the birth.",
    replies: 2, likes: 41,
  },
  {
    author: "Ariane",
    fr: "Petit truc pour les couches qui fuient la nuit 🌙👶 : une taille au-dessus juste pour dormir, ça change vraiment tout!",
    en: "Little tip for nighttime diaper leaks 🌙👶: one size up just for sleep makes a real difference!",
    replies: 5, likes: 19,
  },
  {
    author: "Florence",
    fr: "Petite victoire du jour : bébé a fait son premier rire aux éclats en me voyant faire une grimace 🤣❤️ Je pourrais l'écouter en boucle toute la journée.",
    en: "Small win of the day: baby had their first big belly laugh watching me make a silly face 🤣❤️ I could listen to it on loop all day.",
    replies: 6, likes: 38,
  },
];

// Faint wallpaper pattern of baby items behind the comments (deterministic, computed once)
const FORUM_PATTERN_EMOJIS = ["🍼", "🧸", "🧷", "🎀", "🪀"];
const FORUM_PATTERN = Array.from({ length: 30 }).map((_, idx) => {
  const row = Math.floor(idx / 6);
  const col = idx % 6;
  return {
    emoji: FORUM_PATTERN_EMOJIS[idx % FORUM_PATTERN_EMOJIS.length],
    top: `${row * 18 + (col % 2 === 0 ? 2 : 9)}%`,
    left: `${col * 17 + (row % 2 === 0 ? 2 : 6)}%`,
    rotate: ((idx * 37) % 40) - 20,
    size: 20 + (idx % 3) * 4,
  };
});

function ForumSection({ lang, isMember, goTo }) {
  const [posts, setPosts] = useState(FORUM_SEED);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [reactions, setReactions] = useState({}); // { [postIndex]: "like" | "dislike" }

  const setReaction = (i, type) => {
    setReactions((prev) => {
      const was = prev[i];
      const next = was === type ? null : type;
      setPosts((prevPosts) => prevPosts.map((p, idx) => {
        if (idx !== i) return p;
        let likes = p.likes || 0;
        let dislikes = p.dislikes || 0;
        if (was === "like") likes -= 1;
        if (was === "dislike") dislikes -= 1;
        if (next === "like") likes += 1;
        if (next === "dislike") dislikes += 1;
        return { ...p, likes, dislikes };
      }));
      return { ...prev, [i]: next };
    });
  };

  const L = lang === "fr"
    ? {
        title: "Communauté", subtitle: "Un espace pour échanger avec d'autres parents, poser vos questions et partager vos petites victoires.",
        nameLabel: "Votre prénom", messageLabel: "Votre message",
        namePlaceholder: "Ex. Alex", messagePlaceholder: "Partagez une question ou une expérience…",
        post: "Publier", replies: (n) => `${n} réponse${n > 1 ? "s" : ""}`, empty: "Écrivez le premier commentaire ci-dessous.",
        demo: "Démonstration : les publications restent seulement dans cette session, elles ne sont pas partagées avec d'autres utilisatrices.",
      }
    : lang === "es"
    ? {
        title: "Comunidad", subtitle: "Un espacio para conectar con otros padres, hacer tus preguntas y compartir tus pequeñas victorias.",
        nameLabel: "Tu nombre", messageLabel: "Tu mensaje",
        namePlaceholder: "Ej. Alex", messagePlaceholder: "Comparte una pregunta o una experiencia…",
        post: "Publicar", replies: (n) => `${n} respuesta${n > 1 ? "s" : ""}`, empty: "Escribe el primer comentario abajo.",
        demo: "Demostración: las publicaciones se mantienen solo en esta sesión, no se comparten con otras usuarias.",
      }
    : {
        title: "Community", subtitle: "A space to connect with other parents, ask questions, and share your small wins.",
        nameLabel: "Your first name", messageLabel: "Your message",
        namePlaceholder: "E.g. Alex", messagePlaceholder: "Share a question or an experience…",
        post: "Post", replies: (n) => `${n} repl${n > 1 ? "ies" : "y"}`, empty: "Write the first comment below.",
        demo: "Demo only: posts stay within this session and aren't shared with other users.",
      };

  const inputStyle = { width: "100%", padding: "7px 10px", borderRadius: 9, border: `1px solid ${COLORS.line}`, fontSize: 12.5, boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 10 };

  const submitPost = () => {
    if (!message.trim()) return;
    const newPost = { author: name.trim() || (lang === "fr" ? "Anonyme" : lang === "es" ? "Anónimo" : "Anonymous"), fr: message.trim(), en: message.trim(), replies: 0, likes: 0 };
    setPosts([newPost, ...posts]);
    setMessage("");
  };

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18,
        background: `linear-gradient(135deg, ${COLORS.sage} 0%, #7a9479 100%)`,
        border: "none", borderRadius: 20, padding: "20px 24px", marginBottom: 18,
        boxShadow: "0 2px 14px rgba(47,72,88,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 62, height: 62, borderRadius: 18, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={28} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: "#fff" }}>{L.title}</h2>
            <p style={{ margin: "4px 0 0", color: "#fff", opacity: 0.9, fontSize: 14, maxWidth: 480 }}>{L.subtitle}</p>
          </div>
        </div>
      </div>

      {!isMember ? (
        <LockedContent lang={lang} goTo={goTo} />
      ) : (
        <>
      {posts.length === 0 ? (
        <Card style={{ marginBottom: 18 }}>
          <p style={{ textAlign: "center", color: COLORS.muted, fontSize: 14, margin: 0 }}>{L.empty}</p>
        </Card>
      ) : (
        <Card style={{ marginBottom: 18, padding: "4px 20px", position: "relative", overflow: "hidden", background: "#FBE7EC", border: "none" }}>
          {/* wallpaper pattern */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
            {FORUM_PATTERN.map((it, idx) => (
              <span
                key={idx}
                style={{
                  position: "absolute", top: it.top, left: it.left, fontSize: it.size,
                  opacity: 0.15, transform: `rotate(${it.rotate}deg)`, filter: "grayscale(10%)",
                }}
              >
                {it.emoji}
              </span>
            ))}
          </div>
          <div style={{ position: "relative", zIndex: 1, padding: "16px 0 0" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.pink, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {lang === "fr" ? "Forum" : "Forum"}
            </span>
          </div>
          <div style={{
            position: "relative", zIndex: 1, background: "#fff",
            borderRadius: 16, padding: "8px 18px", margin: "8px 0 16px",
            boxShadow: "0 4px 18px rgba(47,72,88,0.10)",
          }}>
          {posts.map((p, i) => {
            const avatarColors = [COLORS.pink, COLORS.sage, COLORS.blue, COLORS.ochre];
            const aColor = avatarColors[i % avatarColors.length];
            return (
              <div
                key={i}
                style={{
                  display: "flex", gap: 9,
                  padding: "12px 0",
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${aColor} 0%, ${COLORS.teal} 130%)`,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, boxShadow: "0 2px 6px rgba(47,72,88,0.15)",
                }}>
                  {p.author[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: COLORS.teal, fontSize: 12 }}>{p.author}</span>
                  <p style={{ margin: "3px 0 7px", fontSize: 12, color: COLORS.text, lineHeight: 1.45 }}>{p[lang]}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setReaction(i, "like")}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer",
                        background: reactions[i] === "like" ? "#FDEFF3" : "rgba(255,255,255,0.6)", color: reactions[i] === "like" ? COLORS.pink : COLORS.muted,
                        borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 700,
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      <ThumbsUp size={10} fill={reactions[i] === "like" ? COLORS.pink : "none"} />
                      {p.likes || 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReaction(i, "dislike")}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer",
                        background: reactions[i] === "dislike" ? "#E9EEF2" : "rgba(255,255,255,0.6)", color: reactions[i] === "dislike" ? COLORS.teal : COLORS.muted,
                        borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 700,
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      <ThumbsDown size={10} fill={reactions[i] === "dislike" ? COLORS.teal : "none"} />
                      {p.dislikes || 0}
                    </button>
                    <span style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: "#EAF2F8", color: COLORS.blue,
                      borderRadius: 999, padding: "4px 10px", fontSize: 11.5, fontWeight: 700,
                    }}>
                      <Cloud size={11} fill={COLORS.blue} strokeWidth={0} />
                      {L.replies(p.replies)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 18, padding: "10px 14px" }}>
        <div style={{ fontWeight: 800, color: COLORS.teal, marginBottom: 7, fontFamily: "Fraunces, Georgia, serif", fontSize: 12.5 }}>{L.messageLabel}</div>
        <div>
          <label style={{ ...labelStyle, marginBottom: 7 }}>{L.nameLabel}
            <input style={{ ...inputStyle, padding: "5px 8px", fontSize: 11.5 }} placeholder={L.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label style={{ ...labelStyle, marginBottom: 7 }}>{L.messageLabel}
            <textarea rows={2} style={{ ...inputStyle, padding: "5px 8px", fontSize: 11.5, resize: "vertical" }} placeholder={L.messagePlaceholder} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <button type="button" onClick={submitPost} style={{ background: COLORS.teal, color: "#fff", border: "none", padding: "5px 13px", borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{L.post}</button>
        </div>
      </Card>

      <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 12, textAlign: "center" }}>{L.demo}</p>
      </>
      )}
    </div>
  );
}

function SectionHeroCustom({ icon: Icon, color, title, desc, illuType }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, background: COLORS.card,
      border: `1px solid ${COLORS.line}`, borderRadius: 20, padding: "22px 26px",
      marginBottom: 20, boxShadow: "0 2px 14px rgba(47,72,88,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={28} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif", fontSize: 23, color: COLORS.teal }}>{title}</h2>
          <p style={{ margin: 0, color: COLORS.muted, fontSize: 14.5, lineHeight: 1.5, maxWidth: 540 }}>{desc}</p>
        </div>
      </div>
      {illuType && (
        <div className="hero-illu" style={{ background: COLORS.cream, borderRadius: 16, padding: 8 }}>
          <Illustration type={illuType} size={68} />
        </div>
      )}
    </div>
  );
}

/* ---------------- WEEKLY VISUAL MENUS (Léa) ---------------- */
const MENU_DAYS = {
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

/* ---------------- Utilitaires de semaine (rotation + dates réelles) ---------------- */
function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function formatShortDate(date, lang) {
  return date.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "short" });
}
function getCurrentWeekDates() {
  const monday = getMondayOfCurrentWeek();
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
}
function getPregnancyInfo(dueDate, lang) {
  if (!dueDate) return null;
  const dueDateObj = new Date(dueDate + "T00:00:00");
  if (isNaN(dueDateObj.getTime())) return null;
  const conceptionStart = new Date(dueDateObj);
  conceptionStart.setDate(conceptionStart.getDate() - 280); // 40 semaines avant la DPA
  const today = new Date();
  const diffDays = Math.floor((today - conceptionStart) / 86400000);
  const weeks = Math.max(0, Math.min(42, Math.floor(diffDays / 7)));
  const days = Math.max(0, diffDays % 7);
  const trimester = weeks <= 13 ? 1 : weeks <= 27 ? 2 : 3;
  const fmtDue = dueDateObj.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long", year: "numeric" });
  return { weeks, days, trimester, fmtDue };
}

const WEEKLY_MENUS = {
  weightLoss: {
    title: { fr: "Menu perte de poids", en: "Weight-loss menu" },
    color: COLORS.sage,
    days: [
      { b: { icon: "yogurtCup", fr: "Yogourt grec & bleuets et fraises", en: "Greek yogurt & blueberries and strawberries", recipe: { ing: { fr: "Yogourt grec nature, bleuets et fraises, filet de miel", en: "Plain Greek yogurt, blueberries and strawberries, drizzle of honey" }, steps: { fr: "Verser le yogourt dans un bol, garnir de bleuets et fraises et d'un filet de miel.", en: "Pour yogurt into a bowl, top with blueberries and strawberries and a drizzle of honey." } } }, l: { icon: "bowlSalad", fr: "Salade de poulet grillé", en: "Grilled chicken salad", recipe: { ing: { fr: "Poitrine de poulet, laitue, tomates, concombre, vinaigrette légère", en: "Chicken breast, lettuce, tomatoes, cucumber, light vinaigrette" }, steps: { fr: "Griller le poulet, trancher, et disposer sur un lit de laitue avec les légumes et la vinaigrette.", en: "Grill the chicken, slice, and place over lettuce with veggies and vinaigrette." } } }, d: { icon: "bowlSoup", fr: "Soupe aux légumes", en: "Vegetable soup", recipe: { ing: { fr: "Carottes, céleri, oignon, bouillon de légumes, épices", en: "Carrots, celery, onion, vegetable broth, spices" }, steps: { fr: "Faire revenir les légumes, ajouter le bouillon et mijoter 20 minutes.", en: "Sauté the veggies, add broth and simmer 20 minutes." } } } },
      { b: { icon: "oatmealBowl", fr: "Gruau aux fruits", en: "Oatmeal with fruit", recipe: { ing: { fr: "Flocons d'avoine, lait ou boisson végétale, pomme et poire", en: "Rolled oats, milk or plant milk, apple and pear" }, steps: { fr: "Cuire l'avoine dans le lait, garnir de pomme et poire coupés.", en: "Cook oats in milk, top with sliced apple and pear." } } }, l: { icon: "bowlSoup", fr: "Soupe minestrone", en: "Minestrone soup", recipe: { ing: { fr: "Tomates, haricots blancs, pâtes courtes, carottes, courgettes et poivrons, bouillon", en: "Tomatoes, white beans, small pasta, carrots, zucchini and bell peppers, broth" }, steps: { fr: "Mijoter les légumes et le bouillon, ajouter les pâtes et les haricots en fin de cuisson.", en: "Simmer veggies and broth, add pasta and beans near the end." } } }, d: { icon: "proteinDish", fr: "Poisson grillé & légumes", en: "Grilled fish & veggies", recipe: { ing: { fr: "Filet de poisson blanc, courgettes et poivrons, huile d'olive, citron", en: "White fish fillet, zucchini and bell peppers, olive oil, lemon" }, steps: { fr: "Griller le poisson et les légumes, arroser de jus de citron avant de servir.", en: "Grill fish and veggies, drizzle with lemon juice before serving." } } } },
      { b: { icon: "smoothieCup", fr: "Smoothie vert", en: "Green smoothie", recipe: { ing: { fr: "Épinards, banane, boisson végétale, graines de chia", en: "Spinach, banana, plant milk, chia seeds" }, steps: { fr: "Mixer tous les ingrédients jusqu'à consistance lisse.", en: "Blend all ingredients until smooth." } } }, l: { icon: "bowlSalad", fr: "Salade de quinoa", en: "Quinoa salad", recipe: { ing: { fr: "Quinoa cuit, tomates cerises, concombre, feta, vinaigrette", en: "Cooked quinoa, cherry tomatoes, cucumber, feta, vinaigrette" }, steps: { fr: "Mélanger le quinoa refroidi avec les légumes et la vinaigrette.", en: "Mix cooled quinoa with veggies and vinaigrette." } } }, d: { icon: "bowlSoup", fr: "Soupe aux lentilles", en: "Lentil soup", recipe: { ing: { fr: "Lentilles, carottes, oignon, cumin, bouillon", en: "Lentils, carrots, onion, cumin, broth" }, steps: { fr: "Mijoter les lentilles avec les légumes et les épices jusqu'à tendreté.", en: "Simmer lentils with veggies and spices until tender." } } } },
      { b: { icon: "eggsDish", fr: "Œufs pochés & épinards", en: "Poached eggs & spinach", recipe: { ing: { fr: "Œufs, épinards frais, pain complet", en: "Eggs, fresh spinach, whole grain bread" }, steps: { fr: "Pocher les œufs, faire tomber les épinards à la poêle, servir sur une rôtie.", en: "Poach eggs, wilt spinach in a pan, serve over toast." } } }, l: { icon: "proteinDish", fr: "Poulet & légumes vapeur", en: "Chicken & steamed veggies", recipe: { ing: { fr: "Poitrine de poulet, brocoli, carottes, épices", en: "Chicken breast, broccoli, carrots, spices" }, steps: { fr: "Cuire le poulet à la poêle, cuire les légumes à la vapeur, servir ensemble.", en: "Pan-cook chicken, steam veggies, serve together." } } }, d: { icon: "bowlSalad", fr: "Salade César légère", en: "Light Caesar salad", recipe: { ing: { fr: "Laitue romaine, poulet grillé, parmesan, vinaigrette allégée", en: "Romaine lettuce, grilled chicken, parmesan, light dressing" }, steps: { fr: "Mélanger la laitue avec le poulet tranché, le parmesan et la vinaigrette.", en: "Toss lettuce with sliced chicken, parmesan and dressing." } } } },
      { b: { icon: "fruitBowl", fr: "Bol de pomme et poire", en: "Fresh fruit bowl", recipe: { ing: { fr: "Fruits de saison variés, yogourt ou noix", en: "Assorted seasonal fruit, yogurt or nuts" }, steps: { fr: "Couper les fruits et les mélanger dans un bol, garnir au goût.", en: "Cut fruit and combine in a bowl, top as desired." } } }, l: { icon: "bowlSoup", fr: "Soupe thaï aux crevettes", en: "Thai shrimp soup", recipe: { ing: { fr: "Crevettes, lait de coco léger, citronnelle, champignons", en: "Shrimp, light coconut milk, lemongrass, mushrooms" }, steps: { fr: "Mijoter le bouillon avec les aromates, ajouter les crevettes et les champignons en fin de cuisson.", en: "Simmer broth with aromatics, add shrimp and mushrooms near the end." } } }, d: { icon: "proteinDish", fr: "Tofu grillé & légumes", en: "Grilled tofu & veggies", recipe: { ing: { fr: "Tofu ferme, carottes, courgettes et poivrons, sauce soya, gingembre", en: "Firm tofu, carrots, zucchini and bell peppers, soy sauce, ginger" }, steps: { fr: "Griller le tofu, sauter les légumes avec la sauce et le gingembre.", en: "Grill tofu, stir-fry veggies with sauce and ginger." } } } },
      { b: { icon: "yogurtCup", fr: "Yogourt & granola léger", en: "Yogurt & light granola", recipe: { ing: { fr: "Yogourt nature, granola faible en sucre, fruits", en: "Plain yogurt, low-sugar granola, fruit" }, steps: { fr: "Superposer le yogourt, le granola et les fruits.", en: "Layer yogurt, granola and fruit." } } }, l: { icon: "bowlSalad", fr: "Salade méditerranéenne", en: "Mediterranean salad", recipe: { ing: { fr: "Tomates, concombre, olives, feta, huile d'olive", en: "Tomatoes, cucumber, olives, feta, olive oil" }, steps: { fr: "Mélanger tous les légumes avec la feta et l'huile d'olive.", en: "Toss all veggies with feta and olive oil." } } }, d: { icon: "bowlSoup", fr: "Soupe au poulet", en: "Chicken soup", recipe: { ing: { fr: "Poulet, carottes, céleri, nouilles, bouillon", en: "Chicken, carrots, celery, noodles, broth" }, steps: { fr: "Mijoter le poulet et les légumes dans le bouillon, ajouter les nouilles en fin de cuisson.", en: "Simmer chicken and veggies in broth, add noodles near the end." } } } },
      { b: { icon: "smoothieCup", fr: "Smoothie protéiné léger", en: "Light protein smoothie", recipe: { ing: { fr: "Protéine en poudre, banane, boisson végétale", en: "Protein powder, banana, plant milk" }, steps: { fr: "Mixer tous les ingrédients jusqu'à consistance lisse.", en: "Blend all ingredients until smooth." } } }, l: { icon: "proteinDish", fr: "Saumon & asperges", en: "Salmon & asparagus", recipe: { ing: { fr: "Filet de saumon, asperges, citron, huile d'olive", en: "Salmon fillet, asparagus, lemon, olive oil" }, steps: { fr: "Cuire le saumon au four avec les asperges, arroser de citron.", en: "Bake salmon with asparagus, drizzle with lemon." } } }, d: { icon: "bowlSalad", fr: "Salade verte composée", en: "Mixed green salad", recipe: { ing: { fr: "Mélange de laitues, carottes et concombre, vinaigrette légère", en: "Mixed greens, carrots and cucumber, light vinaigrette" }, steps: { fr: "Mélanger tous les légumes avec la vinaigrette juste avant de servir.", en: "Toss veggies with vinaigrette just before serving." } } } },
    ],
  },
  protein: {
    title: { fr: "Menu protéiné", en: "Protein menu" },
    color: COLORS.ochre,
    days: [
      { b: { icon: "eggsDish", fr: "Œufs brouillés & fromage", en: "Scrambled eggs & cheese", recipe: { ing: { fr: "Œufs, fromage râpé, sel, poivre", en: "Eggs, shredded cheese, salt, pepper" }, steps: { fr: "Battre les œufs, cuire à feu doux en remuant, ajouter le fromage à la fin.", en: "Beat eggs, cook on low heat while stirring, add cheese at the end." } } }, l: { icon: "proteinDish", fr: "Poitrine de poulet & riz", en: "Chicken breast & rice", recipe: { ing: { fr: "Poitrine de poulet, riz, brocoli et carottes", en: "Chicken breast, rice, broccoli and carrots" }, steps: { fr: "Griller le poulet, cuire le riz, servir ensemble avec les légumes.", en: "Grill chicken, cook rice, serve together with veggies." } } }, d: { icon: "proteinDish", fr: "Steak & légumes", en: "Steak & veggies", recipe: { ing: { fr: "Steak maigre, courgettes et poivrons, huile d'olive", en: "Lean steak, zucchini and bell peppers, olive oil" }, steps: { fr: "Griller le steak selon la cuisson désirée, sauter les légumes en accompagnement.", en: "Grill steak to desired doneness, sauté veggies as a side." } } } },
      { b: { icon: "yogurtCup", fr: "Yogourt grec riche en protéines", en: "High-protein Greek yogurt", recipe: { ing: { fr: "Yogourt grec, noix, miel", en: "Greek yogurt, nuts, honey" }, steps: { fr: "Verser le yogourt dans un bol, garnir de noix et d'un filet de miel.", en: "Pour yogurt into a bowl, top with nuts and a drizzle of honey." } } }, l: { icon: "proteinDish", fr: "Saumon & quinoa", en: "Salmon & quinoa", recipe: { ing: { fr: "Filet de saumon, quinoa cuit, épinards et brocoli", en: "Salmon fillet, cooked quinoa, spinach and broccoli" }, steps: { fr: "Cuire le saumon au four, servir sur un lit de quinoa avec les légumes.", en: "Bake salmon, serve over quinoa with greens." } } }, d: { icon: "proteinDish", fr: "Poulet grillé & haricots", en: "Grilled chicken & beans", recipe: { ing: { fr: "Poulet, haricots verts ou rouges, épices", en: "Chicken, green or red beans, spices" }, steps: { fr: "Griller le poulet, cuire les haricots à la vapeur, assaisonner.", en: "Grill chicken, steam beans, season to taste." } } } },
      { b: { icon: "eggsDish", fr: "Omelette au fromage", en: "Cheese omelette", recipe: { ing: { fr: "Œufs, fromage, fines herbes", en: "Eggs, cheese, herbs" }, steps: { fr: "Battre les œufs avec les herbes, cuire en omelette, garnir de fromage.", en: "Beat eggs with herbs, cook as an omelette, top with cheese." } } }, l: { icon: "bowlSoup", fr: "Soupe aux pois chiches", en: "Chickpea soup", recipe: { ing: { fr: "Pois chiches, tomates, épices, bouillon", en: "Chickpeas, tomatoes, spices, broth" }, steps: { fr: "Mijoter les pois chiches avec les tomates et les épices 20 minutes.", en: "Simmer chickpeas with tomatoes and spices for 20 minutes." } } }, d: { icon: "proteinDish", fr: "Bœuf haché maigre & légumes", en: "Lean ground beef & veggies", recipe: { ing: { fr: "Bœuf haché maigre, carottes, courgettes et poivrons, épices", en: "Lean ground beef, carrots, zucchini and bell peppers, spices" }, steps: { fr: "Faire revenir le bœuf, ajouter les légumes et cuire jusqu'à tendreté.", en: "Brown the beef, add veggies and cook until tender." } } } },
      { b: { icon: "smoothieCup", fr: "Smoothie protéiné", en: "Protein smoothie", recipe: { ing: { fr: "Protéine en poudre, lait, banane", en: "Protein powder, milk, banana" }, steps: { fr: "Mixer tous les ingrédients jusqu'à consistance lisse.", en: "Blend all ingredients until smooth." } } }, l: { icon: "proteinDish", fr: "Thon & salade", en: "Tuna & salad", recipe: { ing: { fr: "Thon en conserve, laitue, tomates, vinaigrette", en: "Canned tuna, lettuce, tomatoes, vinaigrette" }, steps: { fr: "Égoutter le thon, mélanger avec la salade et la vinaigrette.", en: "Drain tuna, toss with salad and vinaigrette." } } }, d: { icon: "proteinDish", fr: "Porc grillé & patates douces", en: "Grilled pork & sweet potato", recipe: { ing: { fr: "Filet de porc, patates douces, épices", en: "Pork tenderloin, sweet potatoes, spices" }, steps: { fr: "Griller le porc, cuire les patates douces au four, servir ensemble.", en: "Grill pork, roast sweet potatoes, serve together." } } } },
      { b: { icon: "eggsDish", fr: "Œufs & bacon de dinde", en: "Eggs & turkey bacon", recipe: { ing: { fr: "Œufs, bacon de dinde, pain complet", en: "Eggs, turkey bacon, whole grain bread" }, steps: { fr: "Cuire le bacon à la poêle, ajouter les œufs et cuire à la coque désirée.", en: "Pan-cook bacon, add eggs and cook to desired doneness." } } }, l: { icon: "proteinDish", fr: "Poulet & lentilles", en: "Chicken & lentils", recipe: { ing: { fr: "Poulet, lentilles ou pois chiches, épices", en: "Chicken, lentils or chickpeas, spices" }, steps: { fr: "Cuire le poulet et les lentilles ensemble avec les épices.", en: "Cook chicken and lentils together with spices." } } }, d: { icon: "proteinDish", fr: "Poisson blanc & riz brun", en: "White fish & brown rice", recipe: { ing: { fr: "Filet de poisson blanc, riz brun, citron", en: "White fish fillet, brown rice, lemon" }, steps: { fr: "Cuire le poisson au four, servir avec le riz brun et un filet de citron.", en: "Bake fish, serve with brown rice and a squeeze of lemon." } } } },
      { b: { icon: "yogurtCup", fr: "Yogourt, noix & graines", en: "Yogurt, nuts & seeds", recipe: { ing: { fr: "Yogourt nature, amandes et noix de Grenoble, graines de chia", en: "Plain yogurt, almonds and walnuts, chia seeds" }, steps: { fr: "Verser le yogourt dans un bol, garnir de noix et de graines.", en: "Pour yogurt into a bowl, top with nuts and seeds." } } }, l: { icon: "proteinDish", fr: "Dinde hachée & légumes", en: "Ground turkey & veggies", recipe: { ing: { fr: "Dinde hachée, carottes, courgettes et poivrons, épices", en: "Ground turkey, carrots, zucchini and bell peppers, spices" }, steps: { fr: "Faire revenir la dinde avec les légumes et les épices.", en: "Brown turkey with veggies and spices." } } }, d: { icon: "proteinDish", fr: "Crevettes & quinoa", en: "Shrimp & quinoa", recipe: { ing: { fr: "Crevettes, quinoa cuit, épinards et brocoli", en: "Shrimp, cooked quinoa, spinach and broccoli" }, steps: { fr: "Sauter les crevettes, servir sur un lit de quinoa avec les légumes.", en: "Sauté shrimp, serve over quinoa with greens." } } } },
      { b: { icon: "eggsDish", fr: "Œufs pochés & avocat", en: "Poached eggs & avocado", recipe: { ing: { fr: "Œufs, avocat, pain complet", en: "Eggs, avocado, whole grain bread" }, steps: { fr: "Pocher les œufs, écraser l'avocat sur une rôtie, garnir des œufs.", en: "Poach eggs, mash avocado onto toast, top with eggs." } } }, l: { icon: "proteinDish", fr: "Poulet rôti & légumes", en: "Roast chicken & veggies", recipe: { ing: { fr: "Poulet, carottes, panais et navet, herbes", en: "Chicken, carrots, parsnip and turnip, herbs" }, steps: { fr: "Rôtir le poulet et les légumes au four avec les herbes.", en: "Roast chicken and veggies in the oven with herbs." } } }, d: { icon: "proteinDish", fr: "Saumon & brocoli", en: "Salmon & broccoli", recipe: { ing: { fr: "Filet de saumon, brocoli, citron", en: "Salmon fillet, broccoli, lemon" }, steps: { fr: "Cuire le saumon et le brocoli à la vapeur ou au four, arroser de citron.", en: "Steam or bake salmon and broccoli, drizzle with lemon." } } } },
    ],
  },
  breastfeeding: {
    title: { fr: "Menu allaitement", en: "Breastfeeding menu" },
    color: COLORS.pink,
    days: [
      { b: { icon: "oatmealBowl", fr: "Gruau & graines de lin", en: "Oatmeal with flaxseed", recipe: { ing: { fr: "Flocons d'avoine, lait, graines de lin moulues", en: "Rolled oats, milk, ground flaxseed" }, steps: { fr: "Cuire l'avoine dans le lait, incorporer les graines de lin.", en: "Cook oats in milk, stir in flaxseed." } } }, l: { icon: "bowlSoup", fr: "Soupe au poulet & légumes", en: "Chicken & veggie soup", recipe: { ing: { fr: "Poulet, carottes, céleri, bouillon", en: "Chicken, carrots, celery, broth" }, steps: { fr: "Mijoter le poulet et les légumes dans le bouillon jusqu'à tendreté.", en: "Simmer chicken and veggies in broth until tender." } } }, d: { icon: "proteinDish", fr: "Poisson & épinards et brocoli", en: "Fish & spinach and broccoli", recipe: { ing: { fr: "Filet de poisson, épinards ou brocoli, huile d'olive", en: "Fish fillet, spinach or broccoli, olive oil" }, steps: { fr: "Cuire le poisson, sauter les épinards et brocoli à l'huile d'olive.", en: "Cook fish, sauté greens in olive oil." } } } },
      { b: { icon: "smoothieCup", fr: "Smoothie banane & avoine", en: "Banana oat smoothie", recipe: { ing: { fr: "Banane, flocons d'avoine, lait", en: "Banana, rolled oats, milk" }, steps: { fr: "Mixer tous les ingrédients jusqu'à consistance lisse.", en: "Blend all ingredients until smooth." } } }, l: { icon: "bowlSalad", fr: "Salade de lentilles", en: "Lentil salad", recipe: { ing: { fr: "Lentilles cuites, carottes et concombre, vinaigrette", en: "Cooked lentils, carrots and cucumber, vinaigrette" }, steps: { fr: "Mélanger les lentilles avec les légumes et la vinaigrette.", en: "Toss lentils with veggies and vinaigrette." } } }, d: { icon: "bowlSoup", fr: "Soupe aux carottes, panais et navet", en: "Root veggie soup", recipe: { ing: { fr: "Carottes, panais, pommes de terre, bouillon", en: "Carrots, parsnip, potatoes, broth" }, steps: { fr: "Mijoter les carottes, panais et navet dans le bouillon jusqu'à tendreté, réduire en purée si désiré.", en: "Simmer carrots, parsnip and turnip in broth until tender, purée if desired." } } } },
      { b: { icon: "eggsDish", fr: "Œufs & pain complet", en: "Eggs & whole grain toast", recipe: { ing: { fr: "Œufs, pain complet, beurre", en: "Eggs, whole grain bread, butter" }, steps: { fr: "Cuire les œufs au goût, servir avec une rôtie de pain complet.", en: "Cook eggs as desired, serve with whole grain toast." } } }, l: { icon: "proteinDish", fr: "Poulet & riz brun", en: "Chicken & brown rice", recipe: { ing: { fr: "Poulet, riz brun, légumes", en: "Chicken, brown rice, veggies" }, steps: { fr: "Cuire le poulet et le riz, servir avec des courgettes et poivrons.", en: "Cook chicken and rice, serve with zucchini and bell peppers." } } }, d: { icon: "bowlSoup", fr: "Soupe miso au tofu", en: "Miso tofu soup", recipe: { ing: { fr: "Pâte miso, tofu, algues, oignons verts", en: "Miso paste, tofu, seaweed, green onions" }, steps: { fr: "Diluer le miso dans l'eau chaude, ajouter le tofu en dés et les oignons verts.", en: "Dissolve miso in hot water, add diced tofu and green onions." } } } },
      { b: { icon: "oatmealBowl", fr: "Gruau aux fruits & noix", en: "Oatmeal with fruit & nuts", recipe: { ing: { fr: "Flocons d'avoine, pomme et poire, noix", en: "Rolled oats, apple and pear, nuts" }, steps: { fr: "Cuire l'avoine, garnir de fruits et de noix.", en: "Cook oats, top with fruit and nuts." } } }, l: { icon: "bowlSoup", fr: "Soupe crémeuse aux légumes", en: "Creamy vegetable soup", recipe: { ing: { fr: "Légumes variés, bouillon, un peu de crème ou lait", en: "Mixed veggies, broth, a splash of cream or milk" }, steps: { fr: "Mijoter les légumes, mixer avec un peu de crème jusqu'à consistance lisse.", en: "Simmer veggies, blend with a little cream until smooth." } } }, d: { icon: "proteinDish", fr: "Bœuf maigre & légumes", en: "Lean beef & veggies", recipe: { ing: { fr: "Bœuf maigre, carottes, courgettes et poivrons, épices", en: "Lean beef, carrots, zucchini and bell peppers, spices" }, steps: { fr: "Faire revenir le bœuf avec les légumes et les épices.", en: "Brown beef with veggies and spices." } } } },
      { b: { icon: "yogurtCup", fr: "Yogourt & bleuets et fraises", en: "Yogurt & blueberries and strawberries", recipe: { ing: { fr: "Yogourt nature, bleuets et fraises", en: "Plain yogurt, blueberries and strawberries" }, steps: { fr: "Verser le yogourt dans un bol, garnir de bleuets et fraises.", en: "Pour yogurt into a bowl, top with blueberries and strawberries." } } }, l: { icon: "bowlSalad", fr: "Salade de pois chiches", en: "Chickpea salad", recipe: { ing: { fr: "Pois chiches, carottes et concombre, vinaigrette", en: "Chickpeas, carrots and cucumber, vinaigrette" }, steps: { fr: "Mélanger les pois chiches avec les légumes et la vinaigrette.", en: "Toss chickpeas with veggies and vinaigrette." } } }, d: { icon: "proteinDish", fr: "Saumon & quinoa", en: "Salmon & quinoa", recipe: { ing: { fr: "Filet de saumon, quinoa cuit, épinards et brocoli", en: "Salmon fillet, cooked quinoa, spinach and broccoli" }, steps: { fr: "Cuire le saumon, servir sur un lit de quinoa avec les légumes.", en: "Cook salmon, serve over quinoa with greens." } } } },
      { b: { icon: "smoothieCup", fr: "Smoothie vert hydratant", en: "Hydrating green smoothie", recipe: { ing: { fr: "Épinards, concombre, banane, eau de coco", en: "Spinach, cucumber, banana, coconut water" }, steps: { fr: "Mixer tous les ingrédients jusqu'à consistance lisse.", en: "Blend all ingredients until smooth." } } }, l: { icon: "proteinDish", fr: "Poulet & légumes vapeur", en: "Chicken & steamed veggies", recipe: { ing: { fr: "Poulet, carottes, courgettes et poivrons", en: "Chicken, carrots, zucchini and bell peppers" }, steps: { fr: "Cuire le poulet à la poêle, cuire les légumes à la vapeur.", en: "Pan-cook chicken, steam the veggies." } } }, d: { icon: "bowlSoup", fr: "Soupe à l'orge", en: "Barley soup", recipe: { ing: { fr: "Orge, légumes, bouillon", en: "Barley, veggies, broth" }, steps: { fr: "Mijoter l'orge avec les légumes dans le bouillon jusqu'à tendreté.", en: "Simmer barley with veggies in broth until tender." } } } },
      { b: { icon: "oatmealBowl", fr: "Gruau au beurre d'amande", en: "Oatmeal with almond butter", recipe: { ing: { fr: "Flocons d'avoine, lait, beurre d'amande", en: "Rolled oats, milk, almond butter" }, steps: { fr: "Cuire l'avoine dans le lait, incorporer une cuillère de beurre d'amande.", en: "Cook oats in milk, stir in a spoonful of almond butter." } } }, l: { icon: "bowlSoup", fr: "Soupe minestrone", en: "Minestrone soup", recipe: { ing: { fr: "Tomates, haricots, pâtes courtes, légumes", en: "Tomatoes, beans, small pasta, veggies" }, steps: { fr: "Mijoter les légumes et le bouillon, ajouter les pâtes et les haricots.", en: "Simmer veggies and broth, add pasta and beans." } } }, d: { icon: "proteinDish", fr: "Poulet & patate douce", en: "Chicken & sweet potato", recipe: { ing: { fr: "Poulet, patate douce, épices", en: "Chicken, sweet potato, spices" }, steps: { fr: "Cuire le poulet, rôtir la patate douce au four, servir ensemble.", en: "Cook chicken, roast sweet potato, serve together." } } } },
    ],
  },
};

function MenuMealCell({ meal, lang, color, onSelect }) {
  return (
    <div
      onClick={() => onSelect(meal)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0, cursor: "pointer" }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: "#fff", marginBottom: 3,
        display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(47,72,88,0.10)",
      }}>
        <Illustration type={meal.icon} size={32} />
      </div>
      <div style={{ fontSize: 8.5, color: COLORS.text, lineHeight: 1.2, textAlign: "center" }}>{meal[lang]}</div>
      <div style={{ fontSize: 7, color: color, fontWeight: 700, textDecoration: "underline", marginTop: 1 }}>
        {lang === "fr" ? "Voir la recette" : lang === "es" ? "Ver la receta" : "View recipe"}
      </div>
    </div>
  );
}

function RecipeDetailView({ meal, lang, color, onBack }) {
  const L = lang === "fr"
    ? { back: "← Retour au menu", ingredients: "Ingrédients", steps: "Préparation" }
    : lang === "es"
    ? { back: "← Volver al menú", ingredients: "Ingredientes", steps: "Preparación" }
    : { back: "← Back to menu", ingredients: "Ingredients", steps: "Method" };
  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: color, fontSize: 13, fontWeight: 700,
        cursor: "pointer", padding: 0, marginBottom: 16,
      }}>{L.back}</button>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18, background: `${color}1F`, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Illustration type={meal.icon} size={54} />
        </div>
        <h2 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: COLORS.teal, lineHeight: 1.2 }}>{meal[lang]}</h2>
      </div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", color: color }}>{L.ingredients}</h3>
        <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.6, background: `${color}14`, borderRadius: 12, padding: "12px 14px" }}>
          {meal.recipe.ing[lang]}
        </p>
      </div>
      <div>
        <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", color: color }}>{L.steps}</h3>
        <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.7 }}>
          {meal.recipe.steps[lang]}
        </p>
      </div>
    </Card>
  );
}

function WeeklyMenuTable({ menuKey, lang, onSelectRecipe }) {
  const menu = WEEKLY_MENUS[menuKey];
  const days = MENU_DAYS[lang];
  const mealLabels = lang === "fr" ? { b: "Déj.", l: "Dîn.", d: "Sou." } : lang === "es" ? { b: "Des.", l: "Alm.", d: "Cen." } : { b: "Br.", l: "Lu.", d: "Di." };
  const pick = (meal) => onSelectRecipe({ meal, color: menu.color });
  const [showGrocery, setShowGrocery] = useState(false);

  const L = lang === "fr"
    ? { grocery: "🛒 Générer ma liste d'épicerie", groceryTitle: "Liste d'épicerie de la semaine", close: "Fermer" }
    : lang === "es"
    ? { grocery: "🛒 Generar mi lista de compras", groceryTitle: "Lista de compras de la semana", close: "Cerrar" }
    : { grocery: "🛒 Generate my grocery list", groceryTitle: "This week's grocery list", close: "Close" };

  // La rotation change automatiquement le point de départ du menu chaque semaine calendaire
  const weekDates = getCurrentWeekDates();
  const weekNumber = getISOWeekNumber(weekDates[0]);
  const offset = weekNumber % menu.days.length;
  const rangeLabel = lang === "fr"
    ? `Semaine du ${formatShortDate(weekDates[0], lang)} au ${formatShortDate(weekDates[6], lang)}`
    : lang === "es"
    ? `Semana del ${formatShortDate(weekDates[0], lang)} al ${formatShortDate(weekDates[6], lang)}`
    : `Week of ${formatShortDate(weekDates[0], lang)} – ${formatShortDate(weekDates[6], lang)}`;

  const groceryItems = useMemo(() => {
    const set = new Set();
    for (let i = 0; i < days.length; i++) {
      const day = menu.days[(offset + i) % menu.days.length];
      [day.b, day.l, day.d].forEach((meal) => {
        const ing = meal?.recipe?.ing?.[lang];
        if (!ing) return;
        ing.split(",").forEach((part) => {
          const clean = part.trim().replace(/^et\s+/i, "").replace(/^and\s+/i, "");
          if (clean) set.add(clean.charAt(0).toUpperCase() + clean.slice(1));
        });
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menu, offset, lang, days.length]);

  return (
    <Card style={{ marginBottom: 18, border: "none", background: "#fff" }}>
      <h3 style={{ margin: "0 0 2px", fontFamily: "Fraunces, Georgia, serif", fontSize: 21, fontWeight: 700, color: menu.color }}>{menu.title[lang]}</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12.5, fontWeight: 600, color: COLORS.muted }}>{rangeLabel}</p>
      <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: 10, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", paddingLeft: 58 }}>
        <span style={{ flex: 1, textAlign: "center" }}>{mealLabels.b}</span>
        <span style={{ flex: 1, textAlign: "center" }}>{mealLabels.l}</span>
        <span style={{ flex: 1, textAlign: "center" }}>{mealLabels.d}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {days.map((_, i) => {
          const day = menu.days[(offset + i) % menu.days.length];
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, background: `${menu.color}1F`,
              borderRadius: 14, padding: "8px 8px", borderLeft: `4px solid ${menu.color}`,
            }}>
              <span style={{
                width: 50, flexShrink: 0, fontSize: 10.5, fontWeight: 800, color: "#fff",
                background: menu.color, borderRadius: 999, padding: "4px 2px", textAlign: "center", lineHeight: 1.3,
              }}>{days[i].slice(0, 3)}<br /><span style={{ fontWeight: 600, opacity: 0.85 }}>{formatShortDate(weekDates[i], lang)}</span></span>
              <MenuMealCell meal={day.b} lang={lang} color={menu.color} onSelect={pick} />
              <MenuMealCell meal={day.l} lang={lang} color={menu.color} onSelect={pick} />
              <MenuMealCell meal={day.d} lang={lang} color={menu.color} onSelect={pick} />
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowGrocery((s) => !s)} style={{
        width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${menu.color}`, background: showGrocery ? menu.color : "#fff",
        color: showGrocery ? "#fff" : menu.color, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
      }}>{showGrocery ? L.close : L.grocery}</button>

      {showGrocery && (
        <div style={{ marginTop: 14, background: COLORS.cream, borderRadius: 14, padding: "14px 16px" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 800, color: COLORS.teal }}>{L.groceryTitle}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "4px 10px" }}>
            {groceryItems.map((item, i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: COLORS.text, padding: "3px 0" }}>
                <input type="checkbox" style={{ accentColor: menu.color }} />
                {item}
              </label>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

const DIETITIAN_SYSTEM_PROMPT = {
  fr: `Tu es Léa, la diététicienne virtuelle de l'application Me My Baby (grossesse, post-partum, et développement de l'enfant jusqu'à 5 ans). Tu aides les parents à choisir un plan alimentaire général adapté à leurs besoins (grossesse, allaitement ou non, diversification alimentaire du bébé, allergies courantes, objectifs personnels). Ton ton est chaleureux, concret et sans jugement. Donne des orientations générales, des idées de menus et des repères nutritionnels reconnus. Tu n'es pas un substitut à un vrai professionnel de la santé : pour toute question médicale précise (dosage de suppléments, condition médicale diagnostiquée, allergie sévère, perte de poids, trouble alimentaire), invite clairement la personne à consulter un diététicien ou un médecin. Ne donne jamais de diagnostic ni de posologie précise. Reste concise (quelques paragraphes maximum).`,
  en: `You are Léa, the virtual dietitian of the Me My Baby app (pregnancy, postpartum, and child development up to age 5). You help parents choose a general food plan suited to their needs (pregnancy, breastfeeding or not, starting solids, common allergies, personal goals). Your tone is warm, practical, and judgment-free. Give general guidance, menu ideas, and recognized nutrition benchmarks. You are not a substitute for a real healthcare professional: for any precise medical question (supplement dosage, a diagnosed medical condition, severe allergy, weight loss, eating disorder), clearly invite the person to consult a dietitian or doctor. Never give a diagnosis or a precise dosage. Keep answers concise (a few short paragraphs at most).`,
};

function DietitianChat({ lang, isMember, goTo, userEmail }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Parcours "menu personnalisé" : intake -> génération -> confirmation d'envoi
  const [intakeMode, setIntakeMode] = useState(false);
  const [intakeStep, setIntakeStep] = useState(0);
  const [intakeGoal, setIntakeGoal] = useState("");
  const [intakeNeeds, setIntakeNeeds] = useState("");
  const [intakeRestrictions, setIntakeRestrictions] = useState("");
  const [sendingMenu, setSendingMenu] = useState(false);
  const [menuSentAt, setMenuSentAt] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const L = lang === "fr"
    ? {
        title: "Léa, votre diététicienne virtuelle", subtitle: "Un menu personnalisé selon vos besoins, ou des menus généraux pour l'allaitement, la perte de poids ou un apport en protéines — renouvelés chaque semaine.",
        badge: "Fonctionnalité Premium", intro: "Bonjour, je suis Léa 👋 Je peux vous proposer un menu personnalisé selon vos besoins, ou des menus généraux pour l'allaitement, la perte de poids ou un apport en protéines, mis à jour chaque semaine. Que puis-je faire pour vous ?",
        placeholder: "Écrivez votre question…", send: "Envoyer", thinking: "Léa réfléchit…",
        errorMsg: "Une erreur est survenue. Réessayez dans un instant.",
        disclaimer: "Léa donne des conseils généraux et ne remplace pas une consultation avec un professionnel de la santé.",
        suggestions: ["Menu pour l'allaitement cette semaine", "Menu pour la perte de poids postpartum", "Menu riche en protéines"],
        personalizedCta: "✨ Obtenir mon menu personnalisé",
        intakeTitle: "Votre menu personnalisé",
        intakeGoalQ: "Quel est votre objectif principal cette semaine ?",
        goals: ["Perte de poids postpartum", "Allaitement", "Apport en protéines", "Retrouver de l'énergie", "Autre besoin"],
        needsQ: "Dites-en moi un peu plus sur vos besoins (préférences, contraintes de temps, etc.) :",
        needsPlaceholder: "Ex. je manque de temps le matin, j'aime la cuisine méditerranéenne…",
        restrictionsQ: "Avez-vous des allergies ou restrictions alimentaires à respecter ?",
        restrictionsPlaceholder: "Ex. intolérance au lactose, végétarienne, aucune",
        next: "Suivant", back: "Retour", generate: "Générer mon menu",
        noEmail: "Aucun courriel n'est associé à votre profil — impossible d'envoyer le menu. Vérifiez votre profil.",
        sending: "Léa prépare votre menu et vous l'envoie…",
        sentTitle: "C'est envoyé ! 📬",
        sentDesc: (email) => `Votre menu personnalisé pour la semaine a été préparé et envoyé à ${email}. Revenez faire une nouvelle demande n'importe quand — Léa se fera un plaisir de vous préparer un nouveau menu !`,
        newRequest: "Faire une nouvelle demande",
        cancel: "Annuler",
        close: "Fermer",
      }
    : lang === "es"
    ? {
        title: "Léa, tu nutricionista virtual", subtitle: "Un menú personalizado según tus necesidades, o menús generales para la lactancia, la pérdida de peso o un aporte de proteínas — renovados cada semana.",
        badge: "Función Premium", intro: "Hola, soy Léa 👋 Puedo ofrecerte un menú personalizado según tus necesidades, o menús generales para la lactancia, la pérdida de peso o un aporte de proteínas, actualizados cada semana. ¿En qué puedo ayudarte?",
        placeholder: "Escribe tu pregunta…", send: "Enviar", thinking: "Léa está pensando…",
        errorMsg: "Ocurrió un error. Inténtalo de nuevo en un momento.",
        disclaimer: "Léa ofrece consejos generales y no reemplaza una consulta con un profesional de la salud.",
        suggestions: ["Menú para la lactancia esta semana", "Menú para la pérdida de peso posparto", "Menú rico en proteínas"],
        personalizedCta: "✨ Obtener mi menú personalizado",
        intakeTitle: "Tu menú personalizado",
        intakeGoalQ: "¿Cuál es tu objetivo principal esta semana?",
        goals: ["Pérdida de peso posparto", "Lactancia", "Aporte de proteínas", "Recuperar energía", "Otra necesidad"],
        needsQ: "Cuéntame un poco más sobre tus necesidades (preferencias, restricciones de tiempo, etc.):",
        needsPlaceholder: "Ej. tengo poco tiempo por la mañana, me gusta la cocina mediterránea…",
        restrictionsQ: "¿Tienes alergias o restricciones alimentarias a considerar?",
        restrictionsPlaceholder: "Ej. intolerancia a la lactosa, vegetariana, ninguna",
        next: "Siguiente", back: "Atrás", generate: "Generar mi menú",
        noEmail: "Ningún correo electrónico está asociado a tu perfil — no se puede enviar el menú. Verifica tu perfil.",
        sending: "Léa está preparando tu menú y enviándolo…",
        sentTitle: "¡Enviado! 📬",
        sentDesc: (email) => `Tu menú personalizado para la semana ha sido preparado y enviado a ${email}. Vuelve a hacer una nueva solicitud cuando quieras — ¡Léa estará encantada de prepararte un nuevo menú!`,
        newRequest: "Hacer una nueva solicitud",
        cancel: "Cancelar",
        close: "Cerrar",
      }
    : {
        title: "Léa, your virtual dietitian", subtitle: "A menu personalized to your needs, or general menus for breastfeeding, weight loss, or protein intake — refreshed every week.",
        badge: "Premium feature", intro: "Hi, I'm Léa 👋 I can offer you a menu personalized to your needs, or general menus for breastfeeding, weight loss, or protein intake, updated every week. What can I help you with?",
        placeholder: "Type your question…", send: "Send", thinking: "Léa is thinking…",
        errorMsg: "Something went wrong. Please try again in a moment.",
        disclaimer: "Léa offers general guidance and doesn't replace a consultation with a healthcare professional.",
        suggestions: ["This week's breastfeeding menu", "Postpartum weight-loss menu", "A high-protein menu"],
        personalizedCta: "✨ Get my personalized menu",
        intakeTitle: "Your personalized menu",
        intakeGoalQ: "What's your main goal this week?",
        goals: ["Postpartum weight loss", "Breastfeeding", "Protein intake", "Getting energy back", "Other need"],
        needsQ: "Tell me a bit more about your needs (preferences, time constraints, etc.):",
        needsPlaceholder: "E.g. I'm short on time in the morning, I like Mediterranean food…",
        restrictionsQ: "Any allergies or dietary restrictions to work around?",
        restrictionsPlaceholder: "E.g. lactose intolerant, vegetarian, none",
        next: "Next", back: "Back", generate: "Generate my menu",
        noEmail: "No email is linked to your profile — the menu can't be sent. Please check your profile.",
        sending: "Léa is preparing your menu and sending it over…",
        sentTitle: "It's sent! 📬",
        sentDesc: (email) => `Your personalized menu for the week has been prepared and sent to ${email}. Come back anytime to make a new request — Léa will be happy to put together a fresh menu!`,
        newRequest: "Make a new request",
        cancel: "Cancel",
        close: "Close",
      };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg = { role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: DIETITIAN_SYSTEM_PROMPT[lang],
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = (data.content || []).map((b) => b.text || "").join("\n").trim()
        || (lang === "fr" ? "Désolée, je n'ai pas pu répondre. Réessayez." : "Sorry, I couldn't answer. Please try again.");
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(L.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetIntake = () => {
    setIntakeMode(false); setIntakeStep(0); setIntakeGoal(""); setIntakeNeeds("");
    setIntakeRestrictions(""); setMenuSentAt(null);
  };

  const generateAndSendMenu = async () => {
    if (!userEmail) { setError(L.noEmail); return; }
    setSendingMenu(true);
    setError(null);
    try {
      const genPrompt = lang === "fr"
        ? `Génère un menu personnalisé complet pour UNE semaine (lundi à dimanche, déjeuner/dîner/souper) pour une utilisatrice avec l'objectif suivant : "${intakeGoal}". Besoins/préférences additionnels : "${intakeNeeds || "aucun précisé"}". Allergies/restrictions à respecter absolument : "${intakeRestrictions || "aucune"}". Présente le menu jour par jour, de façon claire et chaleureuse, comme si tu l'envoyais par courriel signé Léa.`
        : `Generate a complete personalized menu for ONE week (Monday to Sunday, breakfast/lunch/dinner) for a user with the following goal: "${intakeGoal}". Additional needs/preferences: "${intakeNeeds || "none specified"}". Allergies/restrictions to strictly respect: "${intakeRestrictions || "none"}". Present the menu day by day, clearly and warmly, as if sending it by email signed by Léa.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1800,
          system: DIETITIAN_SYSTEM_PROMPT[lang],
          messages: [{ role: "user", content: genPrompt }],
        }),
      });
      const data = await response.json();
      const menuText = (data.content || []).map((b) => b.text || "").join("\n").trim();

      await sendPersonalizedMenuEmail(userEmail, menuText, lang);
      setMenuSentAt(new Date());
    } catch (e) {
      setError(L.errorMsg);
    } finally {
      setSendingMenu(false);
    }
  };

  return (
    <div>
      <Card style={{ position: "relative", overflow: "hidden", background: "#E4EFDF", border: "none", padding: "16px", marginBottom: 18 }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          {LEA_FOOD_PATTERN.map((it, idx) => (
            <span key={idx} style={{ position: "absolute", top: it.top, left: it.left, fontSize: it.size, opacity: 0.18, transform: `rotate(${it.rotate}deg)` }}>
              {it.emoji}
            </span>
          ))}
        </div>
        <div style={{
          position: "relative", zIndex: 1, background: "#fff", borderRadius: 14,
          padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          boxShadow: "0 4px 16px rgba(47,72,88,0.08)",
        }}>
          <div style={{ background: "#fff", borderRadius: "50%", padding: 3, boxShadow: "0 2px 8px rgba(47,72,88,0.12)", flexShrink: 0 }}>
            <LeaPhoto size={56} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 21, color: COLORS.teal }}>{L.title}</h2>
            <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 13.5 }}>{L.subtitle}</p>
          </div>
        </div>
      </Card>

      {!isMember ? (
        <LockedContent lang={lang} goTo={goTo} />
      ) : intakeMode ? (
        <Card>
          {menuSentAt ? (
            <div style={{ textAlign: "center", padding: "10px 4px" }}>
              <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, color: COLORS.teal, margin: "0 0 10px" }}>{L.sentTitle}</h3>
              <p style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>{L.sentDesc(userEmail)}</p>
              <button onClick={resetIntake} style={{
                background: COLORS.teal, color: "#fff", border: "none", borderRadius: 12,
                padding: "11px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>{L.close}</button>
            </div>
          ) : sendingMenu ? (
            <div style={{ textAlign: "center", padding: "24px 4px" }}>
              <p style={{ color: COLORS.muted, fontSize: 14.5, fontStyle: "italic" }}>{L.sending}</p>
            </div>
          ) : (
            <div>
              <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 19, color: COLORS.teal, margin: "0 0 16px" }}>{L.intakeTitle}</h3>

              {intakeStep === 0 && (
                <div>
                  <p style={{ fontSize: 14, color: COLORS.text, fontWeight: 600, marginBottom: 12 }}>{L.intakeGoalQ}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                    {L.goals.map((g) => (
                      <button key={g} onClick={() => { setIntakeGoal(g); setIntakeStep(1); }} style={{
                        textAlign: "left", background: intakeGoal === g ? COLORS.teal : COLORS.cream,
                        color: intakeGoal === g ? "#fff" : COLORS.text, border: `1px solid ${COLORS.line}`,
                        borderRadius: 12, padding: "11px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                      }}>{g}</button>
                    ))}
                  </div>
                  <button onClick={resetIntake} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>{L.cancel}</button>
                </div>
              )}

              {intakeStep === 1 && (
                <div>
                  <p style={{ fontSize: 14, color: COLORS.text, fontWeight: 600, marginBottom: 10 }}>{L.needsQ}</p>
                  <textarea rows={3} placeholder={L.needsPlaceholder} value={intakeNeeds} onChange={(e) => setIntakeNeeds(e.target.value)}
                    style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: "inherit", marginBottom: 16, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setIntakeStep(0)} style={{ background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.line}`, padding: "10px 18px", borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>{L.back}</button>
                    <button onClick={() => setIntakeStep(2)} style={{ background: COLORS.teal, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>{L.next}</button>
                  </div>
                </div>
              )}

              {intakeStep === 2 && (
                <div>
                  <p style={{ fontSize: 14, color: COLORS.text, fontWeight: 600, marginBottom: 10 }}>{L.restrictionsQ}</p>
                  <input placeholder={L.restrictionsPlaceholder} value={intakeRestrictions} onChange={(e) => setIntakeRestrictions(e.target.value)}
                    style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: "inherit", marginBottom: 16 }} />
                  {error && <p style={{ color: "#B5533C", fontSize: 13, marginBottom: 10 }}>{error}</p>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setIntakeStep(1)} style={{ background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.line}`, padding: "10px 18px", borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>{L.back}</button>
                    <button onClick={generateAndSendMenu} style={{ background: COLORS.ochre, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>{L.generate}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      ) : (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div ref={scrollRef} style={{ maxHeight: 420, minHeight: 260, overflowY: "auto", padding: "20px 20px 4px" }}>
          <ChatBubble role="assistant" content={L.intro} lang={lang} />
          {messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} lang={lang} />)}
          {loading && <ChatBubble role="assistant" content={L.thinking} lang={lang} muted />}
        </div>

        {messages.length === 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 20px 14px" }}>
            <button onClick={() => setIntakeMode(true)} style={{
              background: COLORS.ochre, border: "none", borderRadius: 999,
              padding: "8px 15px", fontSize: 12.5, color: "#fff", cursor: "pointer", fontWeight: 700,
            }}>{L.personalizedCta}</button>
            {L.suggestions.map((s, i) => (
              <button key={i} onClick={() => send(s)} style={{
                background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 999,
                padding: "7px 13px", fontSize: 12.5, color: COLORS.teal, cursor: "pointer", fontWeight: 600,
              }}>{s}</button>
            ))}
          </div>
        )}

        {error && <p style={{ color: "#B5533C", fontSize: 13, padding: "0 20px 10px" }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${COLORS.line}`, padding: 14 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={L.placeholder}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: "inherit" }}
          />
          <button onClick={() => send()} disabled={loading} style={{
            background: COLORS.teal, color: "#fff", border: "none", borderRadius: 12, padding: "0 18px",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}>
            <Send size={17} />
          </button>
        </div>
      </Card>
      )}
      {isMember && <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 12, textAlign: "center" }}>{L.disclaimer}</p>}

      {isMember && (
        <div style={{ marginTop: 28 }}>
          {selectedRecipe ? (
            <RecipeDetailView
              meal={selectedRecipe.meal}
              lang={lang}
              color={selectedRecipe.color}
              onBack={() => setSelectedRecipe(null)}
            />
          ) : (
            <>
              <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: COLORS.teal, marginBottom: 4 }}>
                {lang === "fr" ? "Menus visuels de la semaine" : "This week's visual menus"}
              </h2>
              <p style={{ color: COLORS.muted, fontSize: 13.5, marginBottom: 18 }}>
                {lang === "fr" ? "Du lundi au dimanche, déjeuner, dîner et souper — renouvelés chaque semaine." : "Monday to Sunday, breakfast, lunch and dinner — refreshed every week."}
              </p>
              <WeeklyMenuTable menuKey="weightLoss" lang={lang} onSelectRecipe={setSelectedRecipe} />
              <WeeklyMenuTable menuKey="protein" lang={lang} onSelectRecipe={setSelectedRecipe} />
              <WeeklyMenuTable menuKey="breastfeeding" lang={lang} onSelectRecipe={setSelectedRecipe} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ role, content, muted }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      <div style={{
        maxWidth: "78%", padding: "10px 14px", borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
        background: isUser ? COLORS.teal : COLORS.cream,
        color: isUser ? "#fff" : COLORS.text,
        fontSize: 14, lineHeight: 1.55, fontStyle: muted ? "italic" : "normal",
        opacity: muted ? 0.75 : 1, whiteSpace: "pre-wrap",
      }}>
        {content}
      </div>
    </div>
  );
}

/* ---------------- GENERAL AI ASSISTANT (Mia) ---------------- */
const ASSISTANT_SYSTEM_PROMPT = {
  fr: `Tu es Mia, l'assistante virtuelle de l'application Me My Baby (conception, grossesse, post-partum, développement de l'enfant jusqu'à 5 ans). Tu réponds à toutes sortes de questions que se posent les parents et futurs parents, avec la même largeur d'information générale qu'on trouverait en cherchant sur le web, mais présentée de façon claire, organisée et fiable. Ton esprit est compatissant, aidant, respectueux et amical — jamais condescendant, jamais alarmiste. Quand c'est pertinent, oriente la personne vers des ressources reconnues et fiables (par exemple une société de pédiatrie, un organisme de santé publique reconnu, ou un site gouvernemental de santé) sans jamais inventer de lien précis, de statistique ou de citation que tu ne peux pas garantir exacte. Tu n'es pas un moteur de recherche en temps réel et tu ne remplaces pas un professionnel de la santé : pour toute question médicale précise, urgente, ou touchant un diagnostic, invite clairement la personne à consulter un professionnel ou les services d'urgence. Reste concise et chaleureuse.`,
  en: `You are Mia, the virtual assistant of the Me My Baby app (conception, pregnancy, postpartum, child development up to age 5). You answer all kinds of questions parents and parents-to-be might have, with the same breadth of general information you'd find searching the web, presented clearly, organized, and reliably. Your spirit is compassionate, helpful, respectful, and friendly — never condescending, never alarmist. When relevant, point the person toward recognized, reliable resources (for example a pediatric society, a recognized public health body, or a government health site) without ever inventing a specific link, statistic, or quote you can't guarantee is accurate. You are not a real-time search engine and you don't replace a healthcare professional: for any precise, urgent, or diagnostic medical question, clearly invite the person to consult a professional or emergency services. Stay concise and warm.`,
};

function AIAssistant({ lang, isMember, goTo }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const L = lang === "fr"
    ? {
        title: "Mia, votre assistante virtuelle", subtitle: "Posez n'importe quelle question sur la grossesse ou la vie de parent — Mia répond avec compassion et vous oriente vers des ressources fiables.",
        callout: "Vous ne trouvez pas l'information que vous cherchez ? Demandez à notre assistant virtuel, il vous aidera dans votre recherche.",
        intro: "Bonjour, je suis Mia 👋 Posez-moi à peu près n'importe quelle question liée à la grossesse, l'accouchement, le post-partum ou le développement de votre enfant. Je fais de mon mieux pour vous aider avec des réponses claires et fiables.",
        placeholder: "Écrivez votre question…", send: "Envoyer", thinking: "Mia réfléchit…",
        errorMsg: "Une erreur est survenue. Réessayez dans un instant.",
        disclaimer: "Mia donne de l'information générale et peut orienter vers des ressources fiables, mais ne remplace pas une consultation avec un professionnel de la santé.",
        suggestions: ["Comment soulager le mal de dos enceinte ?", "Mon bébé de 2 ans fait des crises, est-ce normal ?", "Quels sont les signes du travail ?", "Comment aider mon enfant à mieux dormir ?"],
      }
    : lang === "es"
    ? {
        title: "Mia, tu asistente virtual", subtitle: "Haz cualquier pregunta sobre el embarazo o la vida de padres — Mia responde con compasión y te orienta hacia recursos confiables.",
        callout: "¿No encuentras la información que buscas? Pregúntale a nuestra asistente virtual, te ayudará en tu búsqueda.",
        intro: "Hola, soy Mia 👋 Pregúntame casi cualquier cosa relacionada con el embarazo, el parto, el posparto o el desarrollo de tu hijo. Hago todo lo posible para ayudarte con respuestas claras y confiables.",
        placeholder: "Escribe tu pregunta…", send: "Enviar", thinking: "Mia está pensando…",
        errorMsg: "Ocurrió un error. Inténtalo de nuevo en un momento.",
        disclaimer: "Mia ofrece información general y puede orientarte hacia recursos confiables, pero no reemplaza una consulta con un profesional de la salud.",
        suggestions: ["¿Cómo alivio el dolor de espalda en el embarazo?", "Mi bebé de 2 años tiene rabietas, ¿es normal?", "¿Cuáles son las señales de trabajo de parto?", "¿Cómo ayudo a mi hijo a dormir mejor?"],
      }
    : {
        title: "Mia, your virtual assistant", subtitle: "Ask anything about pregnancy or parenting — Mia answers with compassion and points you to reliable resources.",
        callout: "Can't find the information you're looking for? Ask our virtual assistant, and it will help you find it.",
        intro: "Hi, I'm Mia 👋 Ask me pretty much anything about pregnancy, birth, postpartum, or your child's development. I'll do my best to help with clear, reliable answers.",
        placeholder: "Type your question…", send: "Send", thinking: "Mia is thinking…",
        errorMsg: "Something went wrong. Please try again in a moment.",
        disclaimer: "Mia gives general information and can point you to reliable resources, but doesn't replace a consultation with a healthcare professional.",
        suggestions: ["How do I ease back pain during pregnancy?", "My 2-year-old has meltdowns, is that normal?", "What are the signs of labor?", "How can I help my child sleep better?"],
      };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg = { role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: ASSISTANT_SYSTEM_PROMPT[lang],
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = (data.content || []).map((b) => b.text || "").join("\n").trim()
        || (lang === "fr" ? "Désolée, je n'ai pas pu répondre. Réessayez." : "Sorry, I couldn't answer. Please try again.");
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(L.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, background: COLORS.card,
        border: `1px solid ${COLORS.line}`, borderRadius: 20, padding: "20px 24px", marginBottom: 18,
        boxShadow: "0 2px 14px rgba(47,72,88,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: COLORS.cream, borderRadius: 16, padding: 4 }}>
            <Illustration type="assistantBot" size={56} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 21, color: COLORS.teal }}>{L.title}</h2>
            </div>
            <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 13.5, maxWidth: 480 }}>{L.subtitle}</p>
          </div>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div ref={scrollRef} style={{ maxHeight: 420, minHeight: 260, overflowY: "auto", padding: "20px 20px 4px" }}>
          <ChatBubble role="assistant" content={L.intro} lang={lang} />
          {messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} lang={lang} />)}
          {loading && <ChatBubble role="assistant" content={L.thinking} lang={lang} muted />}
        </div>

        {messages.length === 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 20px 14px" }}>
            {L.suggestions.map((s, i) => (
              <button key={i} onClick={() => send(s)} style={{
                background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 999,
                padding: "7px 13px", fontSize: 12.5, color: COLORS.teal, cursor: "pointer", fontWeight: 600,
              }}>{s}</button>
            ))}
          </div>
        )}

        {error && <p style={{ color: "#B5533C", fontSize: 13, padding: "0 20px 10px" }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${COLORS.line}`, padding: 14 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={L.placeholder}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: "inherit" }}
          />
          <button onClick={() => send()} disabled={loading} style={{
            background: COLORS.teal, color: "#fff", border: "none", borderRadius: 12, padding: "0 18px",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}>
            <Send size={17} />
          </button>
        </div>
      </Card>
      <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 12, textAlign: "center" }}>{L.disclaimer}</p>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "accueil", icon: Sun },
  { id: "profil", icon: User },
  { id: "conception", icon: Heart },
  { id: "grossesse", icon: Calendar },
  { id: "postpartum", icon: Baby },
  { id: "dev01", icon: Sparkles },
  { id: "alimentation", icon: Apple },
  { id: "soins", icon: Bath },
  { id: "sante", icon: Stethoscope },
  { id: "dietitian", icon: MessageSquare },
  { id: "mission", icon: BookOpen },
  { id: "abonnement", icon: ShieldAlert },
  { id: "contact", icon: MessageCircle },
];

const UI_FONT = "'Inter','SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/* ---------------- SIDEBAR ---------------- */
function NavDropdown({ open, active, goTo, lang, onClose }) {
  const nav = T[lang].nav;
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 35, background: "rgba(47,72,88,0.15)" }} />
      <div style={{
        position: "absolute", top: "calc(100% + 10px)", left: 0, width: 280, maxHeight: "72vh", overflowY: "auto",
        background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 16,
        boxShadow: "0 14px 34px rgba(47,72,88,0.2)", padding: 8, zIndex: 36,
      }}>
        {NAV_ITEMS.map(({ id, icon: Icon }) => {
          const isPregnancy = id === "grossesse";
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderRadius: 10,
                width: "100%", border: "none", textAlign: "left", cursor: "pointer",
                background: isActive ? (isPregnancy ? COLORS.pink : COLORS.teal) : "transparent",
                color: isActive ? "#fff" : (isPregnancy ? COLORS.pink : COLORS.text),
                fontSize: 14, fontWeight: isActive ? 700 : 500,
              }}
            >
              <Icon size={17} strokeWidth={2} />
              <span>{nav[id]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- APP ---------------- */
/* ---------------- PROFILE GATE (mandatory on first launch) ---------------- */
function ProfileGate({ lang, onComplete, onSkip }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [step, setStep] = useState("form"); // "form" | "verify" (étape du code de vérification)
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [resendMsg, setResendMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null); // "privacy" | "terms" | null

  const handleSubmit = async () => {
    if (!(form.firstName.trim() && form.email.trim() && form.password.length >= 8 && acceptedTerms)) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const result = await supabaseSignUp(form.email.trim(), form.password, {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
      });

      setLoading(false);
      if (result?.access_token) {
        // On enregistre la preuve de consentement (date + heure) dès que le compte existe.
        try {
          await supabaseUpdateProfile(result.user.id, {
            terms_accepted: true, terms_accepted_at: new Date().toISOString(),
          }, result.access_token);
        } catch (e) { /* n'empêche pas la création du compte si cette mise à jour échoue */ }
        // La confirmation par courriel n'est pas activée côté Supabase : on entre directement.
        onComplete(form, result, true);
      } else {
        // Un code à 6 chiffres vient d'être envoyé par courriel.
        setStep("verify");
      }
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg("");
    setResendMsg("");
    try {
      await supabaseResendOtp(form.email.trim(), "signup");
      setResendMsg(lang === "fr" ? "Le courriel a été renvoyé." : lang === "es" ? "El correo fue reenviado." : "The email has been resent.");
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleLogin = async () => {
    if (!(loginForm.email.trim() && loginForm.password)) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const session = await supabaseSignIn(loginForm.email.trim(), loginForm.password);
      setLoading(false);
      onComplete(null, session, false);
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  const L = lang === "fr"
    ? {
        title: "Bienvenue dans Me My Baby", subtitle: "Créez votre compte gratuit pour commencer à explorer l'application.",
        firstName: "Nom", email: "Courriel", password: "Mot de passe", passwordHint: "8 caractères minimum",
        submit: "Créer mon compte gratuit",
        note: "La création d'un compte est requise pour utiliser l'application. Vous pourrez ensuite explorer librement — le contenu détaillé est réservé aux membres.",
        acceptTermsPrefix: "J'accepte les ", termsLabel: "conditions d'utilisation", acceptTermsMiddle: " et la ", privacyLabel: "politique de confidentialité",
        acceptTermsRequired: "Vous devez accepter les conditions d'utilisation et la politique de confidentialité pour créer un compte.",
        medicalReminder: "⚠️ Le contenu de l'application est informatif et ne remplace pas l'avis d'un professionnel de la santé.",
        designerSkip: "Aperçu conceptrice — accès complet, sans créer de profil",
        loginTitle: "Content de vous revoir", loginSubtitle: "Connectez-vous pour retrouver votre profil.",
        loginSubmit: "Se connecter", switchToLogin: "Déjà membre ? Se connecter",
        switchToSignup: "Pas encore de compte ? Créer un profil",
        verifyTitle: "Vérifiez votre courriel",
        verifySubtitle: (email) => `Nous avons envoyé un courriel de confirmation à ${email}. Cliquez sur le lien qu'il contient pour activer votre compte — vous serez automatiquement dirigé·e vers l'application.`,
        resend: "Renvoyer le courriel", changeEmail: "Modifier mon courriel",
      }
    : lang === "es"
    ? {
        title: "Bienvenida a Me My Baby", subtitle: "Crea tu cuenta gratuita para empezar a explorar la aplicación.",
        firstName: "Nombre", email: "Correo electrónico", password: "Contraseña", passwordHint: "Mínimo 8 caracteres",
        submit: "Crear mi cuenta gratuita",
        note: "Se requiere crear una cuenta para usar la aplicación. Después podrás explorar libremente — el contenido detallado está reservado para miembros.",
        acceptTermsPrefix: "Acepto los ", termsLabel: "términos de uso", acceptTermsMiddle: " y la ", privacyLabel: "política de privacidad",
        acceptTermsRequired: "Debes aceptar los términos de uso y la política de privacidad para crear una cuenta.",
        medicalReminder: "⚠️ El contenido de la aplicación es informativo y no sustituye el consejo de un profesional de la salud.",
        designerSkip: "Vista previa de diseñadora — acceso completo, sin crear perfil",
        loginTitle: "Qué bueno verte de nuevo", loginSubtitle: "Inicia sesión para recuperar tu perfil.",
        loginSubmit: "Iniciar sesión", switchToLogin: "¿Ya eres miembro? Inicia sesión",
        switchToSignup: "¿Aún no tienes cuenta? Crea un perfil",
        verifyTitle: "Verifica tu correo electrónico",
        verifySubtitle: (email) => `Enviamos un correo de confirmación a ${email}. Haz clic en el enlace que contiene para activar tu cuenta — serás dirigido automáticamente a la aplicación.`,
        resend: "Reenviar el correo", changeEmail: "Cambiar mi correo",
      }
    : {
        title: "Welcome to Me My Baby", subtitle: "Create your free account to start exploring the app.",
        firstName: "Name", email: "Email", password: "Password", passwordHint: "8 characters minimum",
        submit: "Create my free account",
        note: "Creating an account is required to use the app. After that you can browse freely — detailed content is reserved for members.",
        acceptTermsPrefix: "I agree to the ", termsLabel: "Terms of Use", acceptTermsMiddle: " and ", privacyLabel: "Privacy Policy",
        acceptTermsRequired: "You must agree to the Terms of Use and Privacy Policy to create an account.",
        medicalReminder: "⚠️ The app's content is informational and does not replace advice from a healthcare professional.",
        designerSkip: "Designer preview — full access, no profile needed",
        loginTitle: "Good to see you again", loginSubtitle: "Log in to pick up right where you left off.",
        loginSubmit: "Log in", switchToLogin: "Already a member? Log in",
        switchToSignup: "No account yet? Create a profile",
        verifyTitle: "Verify your email",
        verifySubtitle: (email) => `We sent a confirmation email to ${email}. Click the link inside it to activate your account — you'll be taken straight into the app.`,
        resend: "Resend email", changeEmail: "Change my email",
      };

  const inputStyle = { width: "100%", padding: "10px 13px", borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14.5, boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: COLORS.muted, fontWeight: 600, marginBottom: 14 };

  return (
    <div style={{
      fontFamily: UI_FONT, background: COLORS.cream, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; }`}</style>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo height={36} />
        </div>
        <Card>
          {step === "verify" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: "#EAF2F8", display: "flex",
                alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <Mail size={28} color={COLORS.blue} />
              </div>
              <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: COLORS.teal, margin: "0 0 8px" }}>{L.verifyTitle}</h2>
              <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 20px", lineHeight: 1.5 }}>{L.verifySubtitle(form.email.trim())}</p>
              {errorMsg && (
                <p style={{ color: "#B3261E", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
              )}
              {resendMsg && (
                <p style={{ color: COLORS.sage, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{resendMsg}</p>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
                <button onClick={handleResend} style={{ background: "none", border: "none", color: COLORS.teal, fontSize: 12.5, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>{L.resend}</button>
                <button onClick={() => { setStep("form"); setErrorMsg(""); setResendMsg(""); }} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 12.5, textDecoration: "underline", cursor: "pointer" }}>{L.changeEmail}</button>
              </div>
            </div>
          ) : (
          <>
          <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: COLORS.teal, margin: "0 0 4px", textAlign: "center" }}>{mode === "login" ? L.loginTitle : L.title}</h2>
          <p style={{ color: COLORS.muted, fontSize: 13.5, textAlign: "center", margin: "0 0 20px" }}>{mode === "login" ? L.loginSubtitle : L.subtitle}</p>

          {mode === "login" ? (
            <div>
              <label style={labelStyle}>{L.email}
                <input required type="email" style={inputStyle} value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
              </label>
              <label style={labelStyle}>{L.password}
                <input required type="password" style={inputStyle} value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
              </label>
              {errorMsg && (
                <p style={{ color: "#B3261E", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={handleLogin}
                style={{
                  width: "100%", background: COLORS.teal, color: "#fff", border: "none", padding: "13px",
                  borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}>{loading ? "..." : L.loginSubmit}</button>
            </div>
          ) : (
          <div>
            <label style={labelStyle}>{L.firstName}
              <input required style={inputStyle} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </label>
            <label style={labelStyle}>{L.email}
              <input required type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label style={labelStyle}>{L.password}
              <input required type="password" minLength={8} style={inputStyle} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <span style={{ fontWeight: 400, fontSize: 11.5, color: COLORS.muted }}>{L.passwordHint}</span>
            </label>
            {errorMsg && (
              <p style={{ color: "#B3261E", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
            )}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12.5, color: COLORS.muted, marginBottom: 14, cursor: "pointer", lineHeight: 1.5 }}>
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>
                {L.acceptTermsPrefix}
                <button type="button" onClick={(e) => { e.preventDefault(); setLegalDoc("terms"); }} style={{ background: "none", border: "none", padding: 0, color: COLORS.teal, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>{L.termsLabel}</button>
                {L.acceptTermsMiddle}
                <button type="button" onClick={(e) => { e.preventDefault(); setLegalDoc("privacy"); }} style={{ background: "none", border: "none", padding: 0, color: COLORS.teal, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>{L.privacyLabel}</button>
              </span>
            </label>
            <button
              type="button"
              disabled={loading || !acceptedTerms}
              onClick={handleSubmit}
              style={{
                width: "100%", background: COLORS.teal, color: "#fff", border: "none", padding: "13px",
                borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: (loading || !acceptedTerms) ? "default" : "pointer",
                opacity: (loading || !acceptedTerms) ? 0.5 : 1,
              }}>{loading ? "..." : L.submit}</button>
          </div>
          )}
          </>
          )}
        </Card>
        {legalDoc && <LegalModal lang={lang} doc={legalDoc} onClose={() => setLegalDoc(null)} />}
        {step === "form" && mode === "signup" && (
          <>
            <p style={{
              fontSize: 11.5, color: COLORS.teal, textAlign: "center", marginTop: 14, lineHeight: 1.5,
              background: "#EAF2F8", borderRadius: 10, padding: "8px 12px", fontWeight: 600,
            }}>{L.medicalReminder}</p>
            <p style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>{L.note}</p>
          </>
        )}
        {step === "form" && (
        <>
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrorMsg(""); }}
          style={{
            display: "block", margin: "16px auto 0", background: "none", border: "none",
            color: COLORS.teal, fontSize: 13, fontWeight: 700, textDecoration: "underline", cursor: "pointer",
          }}
        >
          {mode === "login" ? L.switchToSignup : L.switchToLogin}
        </button>
        <button
          type="button"
          onClick={() => { onSkip(form); }}
          style={{
            display: "block",
            margin: "14px auto 0",
            background: "none",
            border: "none",
            color: COLORS.muted,
            fontSize: 11,
            textDecoration: "underline",
            cursor: "pointer",
            opacity: 0.6,
          }}
        >
          {L.designerSkip}
        </button>
        </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("fr");
  const [active, setActive] = useState("accueil");
  const [navOpen, setNavOpen] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(null);
  const [session, setSession] = useState(null); // { access_token, refresh_token, user, isMember }
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const goTo = (id) => { setActive(id); setNavOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const mapProfileRow = (row) => ({
    firstName: row.first_name || "", lastName: row.last_name || "", email: row.email || "",
    username: row.username || "", country: row.country || "", language: row.language || "fr",
    motherAge: row.mother_age || "", motherBirthdate: row.mother_birthdate || "", children: row.children ?? "0",
    childrenAgesArr: (row.children_ages || "").split(",").map((s) => s.trim()).filter(Boolean),
    dueDate: row.due_date || "", pregnancyProfile: row.pregnancy_profile || [], newsletter: row.newsletter ?? true,
    photoUrl: row.photo_url || null,
  });

  const applySession = (sess, profileRow) => {
    setSession(sess);
    setHasProfile(true);
    setIsMember(!!sess.isMember);
    if (profileRow) {
      setUserProfile(mapProfileRow(profileRow));
      if (profileRow.language) setLang(profileRow.language);
    }
    supabaseFetchChildren(sess.user.id, sess.access_token)
      .then((rows) => setChildren(rows.map(mapChildRow)))
      .catch(() => {}); // en cas d'échec, on garde la liste vide plutôt que de bloquer l'app
  };

  // Analyse l'URL pour voir si on arrive via le lien de confirmation envoyé par courriel
  // (Supabase ajoute access_token/refresh_token/type dans le fragment #... de l'adresse)
  const parseHashSession = () => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return null;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    if (!access_token) return null;
    return { access_token, refresh_token, type };
  };

  // Au chargement de l'app : on regarde d'abord si on arrive via un lien de confirmation de courriel,
  // sinon on tente de restaurer la session déjà ouverte (localStorage)
  useEffect(() => {
    (async () => {
      const fromLink = parseHashSession();
      if (fromLink) {
        try {
          const user = await supabaseGetUser(fromLink.access_token);
          const sessionToStore = { access_token: fromLink.access_token, refresh_token: fromLink.refresh_token, user, isMember: false };
          saveLocalSession(sessionToStore);
          window.history.replaceState(null, "", window.location.pathname + window.location.search); // nettoie l'adresse
          if (fromLink.type === "signup") { setJustSignedUp(true); setActive("profil"); }
          const profileRow = await supabaseFetchProfile(user.id, fromLink.access_token).catch(() => null);
          applySession(sessionToStore, profileRow);
          setCheckingSession(false);
          return;
        } catch (e) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          // on retombe sur la restauration normale ci-dessous si le lien est invalide/expiré
        }
      }

      const stored = loadLocalSession();
      if (!stored?.access_token) { setCheckingSession(false); return; }
      try {
        const user = await supabaseGetUser(stored.access_token);
        const profileRow = await supabaseFetchProfile(user.id, stored.access_token).catch(() => null);
        applySession(stored, profileRow);
      } catch (e) {
        // Le jeton d'accès a probablement expiré : on tente un rafraîchissement silencieux
        if (stored.refresh_token) {
          try {
            const refreshed = await supabaseRefreshSession(stored.refresh_token);
            const merged = { access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, user: refreshed.user, isMember: stored.isMember };
            saveLocalSession(merged);
            const profileRow = await supabaseFetchProfile(refreshed.user.id, refreshed.access_token).catch(() => null);
            applySession(merged, profileRow);
          } catch (e2) {
            clearLocalSession();
          }
        } else {
          clearLocalSession();
        }
      }
      setCheckingSession(false);
    })();
  }, []);

  // Appelé après une inscription ou une connexion réussie
  const handleAuthComplete = async (profileForm, authSession, isFreshSignup) => {
    if (authSession?.access_token) {
      const sessionToStore = { access_token: authSession.access_token, refresh_token: authSession.refresh_token, user: authSession.user, isMember: false };
      saveLocalSession(sessionToStore);
      setSession(sessionToStore);
      setHasProfile(true);
      if (isFreshSignup) { setJustSignedUp(true); setActive("profil"); }
      supabaseFetchChildren(authSession.user.id, authSession.access_token)
        .then((rows) => setChildren(rows.map(mapChildRow)))
        .catch(() => {});
      try {
        const profileRow = await supabaseFetchProfile(authSession.user.id, authSession.access_token);
        if (profileRow) {
          setUserProfile(mapProfileRow(profileRow));
          if (profileRow.language) setLang(profileRow.language);
          return;
        }
      } catch (e) { /* on retombe sur le formulaire saisi localement si la lecture échoue */ }
    }
    if (profileForm) setUserProfile(profileForm);
  };

  const becomeMember = () => {
    setIsMember(true);
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isMember: true };
      saveLocalSession(updated);
      return updated;
    });
  };

  const logout = async () => {
    if (session?.access_token) await supabaseSignOut(session.access_token);
    clearLocalSession();
    setSession(null);
    setHasProfile(false);
    setIsMember(false);
    setUserProfile(null);
    setChildren([]);
    setActive("accueil");
  };

  if (checkingSession) {
    return (
      <div style={{ fontFamily: UI_FONT, background: COLORS.cream, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Logo height={34} />
      </div>
    );
  }

  if (!hasProfile) {
    return <ProfileGate lang={lang} onComplete={handleAuthComplete} onSkip={() => { setHasProfile(true); setIsMember(true); }} />;
  }

  if (justSignedUp) {
    return (
      <div style={{ fontFamily: UI_FONT, background: COLORS.cream, minHeight: "100vh", padding: "24px 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Logo height={34} />
          </div>
          <ProfileSection
            lang={lang} setLang={setLang} children={children} setChildren={setChildren} userProfile={userProfile}
            session={session} justSignedUp={true} onOnboardingDone={() => { setJustSignedUp(false); setActive("profil"); }}
            standalone
          />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (active) {
      case "accueil": return <Home lang={lang} goTo={goTo} isMember={isMember} userProfile={userProfile} children={children} session={session} />;
      case "conception": return <ConceptionSection lang={lang} isMember={isMember} goTo={goTo} />;
      case "grossesse": return <PregnancySection lang={lang} isMember={isMember} goTo={goTo} />;
      case "postpartum": return <GenericSection dataObj={POSTPARTUM} lang={lang} sectionKey="postpartum" isMember={isMember} goTo={goTo} />;
      case "dev01": return <GenericSection dataObj={{ ...DEV01, ...DEV15 }} lang={lang} sectionKey="dev01" isMember={isMember} goTo={goTo} children={children} session={session} />;
      case "alimentation": return <GenericSection dataObj={FEEDING} lang={lang} sectionKey="alimentation" isMember={isMember} goTo={goTo} />;
      case "soins": return <GenericSection dataObj={CARE} lang={lang} sectionKey="soins" isMember={isMember} goTo={goTo} />;
      case "sante": return <GenericSection dataObj={HEALTH} lang={lang} sectionKey="sante" isMember={isMember} goTo={goTo} />;
      case "mission": return <MissionSection lang={lang} />;
      case "abonnement": return <AbonnementUnified lang={lang} isMember={isMember} goTo={goTo} onBecomeMember={becomeMember} userProfile={userProfile} />;
      case "profil": return <ProfileSection lang={lang} setLang={setLang} children={children} setChildren={setChildren} userProfile={userProfile} onLogout={logout} session={session} justSignedUp={justSignedUp} onOnboardingDone={() => setJustSignedUp(false)} isMember={isMember} onBecomeMember={isMember ? () => setIsMember(false) : becomeMember} />;
      case "dietitian": return <DietitianChat lang={lang} isMember={isMember} goTo={goTo} userEmail={userProfile?.email} />;
      case "contact": return <ContactSection lang={lang} />;
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: UI_FONT, background: COLORS.cream, minHeight: "100vh", color: COLORS.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { margin: 0; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 10px; }
        button { font-family: inherit; }
        button:focus-visible, input:focus-visible { outline: 2px solid ${COLORS.ochre}; outline-offset: 2px; }

        .page-shell { max-width: 880px; margin: 0 auto; padding: 28px 24px 64px; }

        @media (max-width: 900px) {
          .page-shell { padding: 16px 16px 48px; }
        }
        @media (max-width: 560px) {
          .hero-illu { display: none; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        background: "rgba(247,244,238,0.82)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${COLORS.line}`, position: "sticky", top: 0, zIndex: 30,
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setNavOpen((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 8 }}
              aria-label="Me My Baby menu"
            >
              <Logo height={36} />
            </button>
            <NavDropdown open={navOpen} active={active} goTo={goTo} lang={lang} onClose={() => setNavOpen(false)} />
          </div>
          {/* Indicateur de langue — purement informatif, se change dans Mon profil */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, background: COLORS.card,
            border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: "7px 14px",
            fontSize: 13, fontWeight: 600, color: COLORS.muted,
          }}>
            <Globe size={15} />
            {lang === "fr" ? "FR" : lang === "en" ? "EN" : "ES"}
          </div>
        </div>
      </header>

      <div className="page-shell">
        {renderContent()}
      </div>

      <footer style={{ borderTop: `1px solid ${COLORS.line}`, padding: "24px 20px", textAlign: "center" }}>
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
          <Logo height={26} />
        </div>
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: 0 }}>
          {lang === "fr" ? "Me My Baby — de la conception à 5 ans. Le contenu de cette application est informatif et ne remplace pas l'avis d'un professionnel de la santé." : "Me My Baby — from conception to age 5. Content in this app is informational and does not replace advice from a healthcare professional."}
        </p>
      </footer>
    </div>
  );
}
