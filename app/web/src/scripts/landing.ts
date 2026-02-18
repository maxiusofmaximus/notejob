import anime from "animejs/lib/anime.es.js";
import { gsap } from "gsap";
import { notifyError, notifySuccess, notifyWarning } from "./ui-alert";

type Locale = "en" | "es";
type SiteCustomConfig = {
  theme?: { brand?: string; accent?: string; bg?: string };
  content?: { tagline?: string; heroTitle?: string; heroText?: string; ctaLabel?: string };
  layoutOrder?: string[];
};
const customKey = "notejob.site.custom.v1";
const cleanFirebaseValue = (value: string | undefined) => String(value || "").replace(/\uFEFF/g, "").trim();
const runtimeDefaults = {
  firebaseApiKey: cleanFirebaseValue(import.meta.env.PUBLIC_FIREBASE_API_KEY),
  firebaseAuthDomain: cleanFirebaseValue(import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN),
  firebaseProjectId: cleanFirebaseValue(import.meta.env.PUBLIC_FIREBASE_PROJECT_ID),
  firebaseAppId: cleanFirebaseValue(import.meta.env.PUBLIC_FIREBASE_APP_ID)
};
let firebaseAuth: any = null;
let firebaseAuthMod: any = null;

const dictionary: Record<Locale, Record<string, string>> = {
  en: {
    tagline: "From quick ideas to finished outcomes.",
    contact: "Contact",
    login: "Login",
    signup: "Signup",
    kicker: "Personal Work Hub",
    hero_title: "Capture what matters today. Finish what matters next.",
    hero_text:
      "NoteJob helps you collect ideas, organize tasks, and move projects forward without losing context. Every completed task can become a clean learning note you can reuse later.",
    start_now: "Create your workspace",
    explore_dashboard: "See product demo",
    overview: "What you get",
    overview_text: "A calm, dark workspace to plan tasks, track progress, and keep decisions documented.",
    smart_locale: "Work with dates",
    smart_locale_text: "Set start and due dates, monitor deadlines, and keep your weekly priorities clear.",
    ready_for_scale: "Build your library",
    ready_for_scale_text: "Convert finished work into reusable notes, guides, and references for future projects.",
    feature_1_title: "1. Capture",
    feature_1_text: "Add ideas from your day, links, notes, and files so nothing valuable gets lost.",
    feature_2_title: "2. Execute",
    feature_2_text: "Turn ideas into tasks and projects, split into subtasks, and move work through clear statuses.",
    feature_3_title: "3. Reuse",
    feature_3_text: "Publish completed work as clean resources you can edit, share, and export.",
    for_title_1: "For solo builders",
    for_text_1: "Keep game, app, and learning ideas in one place without using five different tools.",
    for_title_2: "For creators & researchers",
    for_text_2: "Store references, summarize discoveries, and keep your process visible from idea to output.",
    for_title_3: "For small teams",
    for_text_3: "Share the latest plan, avoid duplicated effort, and keep a living documentation trail.",
    tag_1: "Daily tasks",
    tag_2: "Project planning",
    tag_3: "Knowledge notes",
    tag_4: "Deadlines",
    tag_5: "Team-ready exports",
    contact_title: "Contact",
    product_title: "Product overview",
    product_text: "Task manager, project board, and knowledge vault in one product-first workflow."
  },
  es: {
    tagline: "De ideas rápidas a resultados terminados.",
    contact: "Contacto",
    login: "Entrar",
    signup: "Crear cuenta",
    kicker: "Centro personal de trabajo",
    hero_title: "Captura lo que importa hoy. Termina lo que importa después.",
    hero_text:
      "NoteJob te ayuda a reunir ideas, organizar tareas y avanzar proyectos sin perder contexto. Cada tarea terminada puede convertirse en una nota de aprendizaje reutilizable.",
    start_now: "Crear espacio de trabajo",
    explore_dashboard: "Ver demostración",
    overview: "Lo que obtienes",
    overview_text: "Un espacio oscuro y cómodo para planificar tareas, seguir progreso y documentar decisiones.",
    smart_locale: "Trabajo con fechas",
    smart_locale_text: "Define inicio y fin de cada tarea para priorizar mejor cada semana.",
    ready_for_scale: "Construye tu biblioteca",
    ready_for_scale_text: "Convierte trabajo terminado en notas y guías reutilizables para futuros proyectos.",
    feature_1_title: "1. Captura",
    feature_1_text: "Guarda ideas, enlaces, notas y archivos para no perder información clave.",
    feature_2_title: "2. Ejecuta",
    feature_2_text: "Transforma ideas en tareas y proyectos, divide en subtareas y avanza por estados claros.",
    feature_3_title: "3. Reutiliza",
    feature_3_text: "Publica resultados como recursos limpios, editables y listos para compartir.",
    for_title_1: "Para builders individuales",
    for_text_1: "Mantén ideas de juegos, apps y aprendizaje en un solo lugar, sin cinco herramientas separadas.",
    for_title_2: "Para creadores e investigadores",
    for_text_2: "Guarda referencias, resume hallazgos y conserva el proceso completo de idea a resultado.",
    for_title_3: "Para equipos pequeños",
    for_text_3: "Comparte el plan más reciente, evita duplicar trabajo y conserva trazabilidad.",
    tag_1: "Tareas diarias",
    tag_2: "Plan de proyectos",
    tag_3: "Notas de conocimiento",
    tag_4: "Fechas límite",
    tag_5: "Exportación para equipo",
    contact_title: "Contacto",
    product_title: "Resumen del producto",
    product_text: "Gestor de tareas, tablero de proyectos y bóveda de conocimiento en un flujo centrado en producto."
  }
};

function applyLocale(locale: Locale) {
  const copy = dictionary[locale];
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n || "";
    if (copy[key]) el.textContent = copy[key];
  });
}

function applyCustomSite() {
  try {
    const raw = localStorage.getItem(customKey);
    if (!raw) return;
    const custom = JSON.parse(raw) as SiteCustomConfig;
    if (custom.theme?.brand) document.documentElement.style.setProperty("--brand", custom.theme.brand);
    if (custom.theme?.accent) document.documentElement.style.setProperty("--accent", custom.theme.accent);
    if (custom.theme?.bg) document.documentElement.style.setProperty("--bg-1", custom.theme.bg);

    if (custom.content?.tagline) {
      const el = document.getElementById("brandTagline");
      if (el) el.textContent = custom.content.tagline;
    }
    if (custom.content?.heroTitle) {
      const el = document.getElementById("heroTitle");
      if (el) el.textContent = custom.content.heroTitle;
    }
    if (custom.content?.heroText) {
      const el = document.getElementById("heroText");
      if (el) el.textContent = custom.content.heroText;
    }
    if (custom.content?.ctaLabel) {
      const el = document.getElementById("heroCtaLabel");
      if (el) el.textContent = custom.content.ctaLabel;
    }

    if (Array.isArray(custom.layoutOrder) && custom.layoutOrder.length) {
      custom.layoutOrder.forEach((sectionId, idx) => {
        const section = document.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`);
        if (section) section.style.order = String(idx + 1);
      });
    }
  } catch {
    // ignore malformed customization payload
  }
}

async function detectLocale() {
  try {
    const res = await fetch("/api/locale");
    const data = await res.json();
    const locale: Locale = data.locale === "es" ? "es" : "en";
    applyLocale(locale);
  } catch {
    applyLocale(navigator.language.startsWith("es") ? "es" : "en");
  }
}

function runAnimations() {
  gsap.from(".site-header", { y: -24, opacity: 0, duration: 0.7, ease: "power2.out" });
  gsap.from(".hero-copy h1", { y: 24, opacity: 0, duration: 0.95, ease: "power2.out", delay: 0.2 });

  anime({
    targets: ".landing-animate",
    translateY: [18, 0],
    opacity: [0, 1],
    easing: "easeOutExpo",
    delay: anime.stagger(90, { start: 260 }),
    duration: 780
  });
}

function getById<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
}

const dom = {
  landingLoginBtn: getById<HTMLButtonElement>("landingLoginBtn"),
  landingSignupBtn: getById<HTMLButtonElement>("landingSignupBtn"),
  heroLoginBtn: getById<HTMLButtonElement>("heroLoginBtn"),
  heroSignupBtn: getById<HTMLButtonElement>("heroSignupBtn"),
  landingAuthModal: getById<HTMLDialogElement>("landingAuthModal"),
  landingAuthTitle: getById<HTMLElement>("landingAuthTitle"),
  landingAuthMessage: getById<HTMLElement>("landingAuthMessage"),
  landingAuthEmail: getById<HTMLInputElement>("landingAuthEmail"),
  landingAuthPassword: getById<HTMLInputElement>("landingAuthPassword"),
  landingSubmitSignupBtn: getById<HTMLButtonElement>("landingSubmitSignupBtn"),
  landingSubmitLoginBtn: getById<HTMLButtonElement>("landingSubmitLoginBtn"),
  landingForgotPasswordBtn: getById<HTMLButtonElement>("landingForgotPasswordBtn"),
  landingCloseAuthBtn: getById<HTMLButtonElement>("landingCloseAuthBtn")
};

function setAuthMessage(text: string) {
  dom.landingAuthMessage.textContent = text;
}

function openAuth(mode: "signup" | "login") {
  dom.landingAuthModal.dataset.mode = mode;
  if (mode === "signup") {
    dom.landingAuthTitle.textContent = "Create account";
    setAuthMessage("Create your account. We will send an email confirmation link.");
  } else {
    dom.landingAuthTitle.textContent = "Login";
    setAuthMessage("Login to access your private workspace.");
  }
  dom.landingSubmitSignupBtn.classList.toggle("btn--primary", mode === "signup");
  dom.landingSubmitSignupBtn.classList.toggle("btn--ghost", mode !== "signup");
  dom.landingSubmitLoginBtn.classList.toggle("btn--primary", mode === "login");
  dom.landingSubmitLoginBtn.classList.toggle("btn--ghost", mode !== "login");
  dom.landingAuthModal.showModal();
}

async function ensureFirebaseAuth() {
  if (firebaseAuth && firebaseAuthMod) return { auth: firebaseAuth, authMod: firebaseAuthMod };
  if (!runtimeDefaults.firebaseApiKey || !runtimeDefaults.firebaseAuthDomain || !runtimeDefaults.firebaseProjectId || !runtimeDefaults.firebaseAppId) {
    throw new Error("Authentication service is not configured yet.");
  }

  const appMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const authMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  const app = appMod.getApps?.()[0] || appMod.initializeApp({
    apiKey: runtimeDefaults.firebaseApiKey,
    authDomain: runtimeDefaults.firebaseAuthDomain,
    projectId: runtimeDefaults.firebaseProjectId,
    appId: runtimeDefaults.firebaseAppId
  });

  firebaseAuth = authMod.getAuth(app);
  firebaseAuthMod = authMod;
  return { auth: firebaseAuth, authMod: firebaseAuthMod };
}

async function submitAuth(mode: "signup" | "login") {
  const email = dom.landingAuthEmail.value.trim();
  const password = dom.landingAuthPassword.value;
  if (!email || !password) {
    setAuthMessage("Email and password are required.");
    return;
  }
  if (password.length < 8) {
    setAuthMessage("Use at least 8 characters for your password.");
    return;
  }

  try {
    const { auth, authMod } = await ensureFirebaseAuth();
    if (mode === "signup") {
      const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
      const redirect = `${window.location.origin}/confirm-email`;
      await authMod.sendEmailVerification(cred.user, { url: redirect });
      await authMod.signOut(auth);
      setAuthMessage("Account created. Check your email to confirm before logging in.");
      return;
    }

    await authMod.signInWithEmailAndPassword(auth, email, password);
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await authMod.sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/confirm-email` });
      await authMod.signOut(auth);
      throw new Error("Email not confirmed yet. We sent a new confirmation link.");
    }
    window.location.href = "/app";
  } catch (err: any) {
    const code = String(err?.code || err?.message || "");
    if (code.includes("auth/invalid-credential") || code.includes("auth/invalid-login-credentials")) {
      throw new Error("Invalid email or password.");
    }
    if (code.includes("auth/user-not-found") || code.includes("auth/wrong-password")) {
      throw new Error("Invalid email or password.");
    }
    if (code.includes("auth/too-many-requests")) {
      throw new Error("Too many failed attempts. Try again later.");
    }
    if (code.includes("auth/network-request-failed")) {
      throw new Error("Authentication request failed. Verify Firebase API key restrictions and authorized domains.");
    }
    throw err;
  }
}

async function sendLandingPasswordReset() {
  const email = dom.landingAuthEmail.value.trim();
  if (!email) {
    await notifyWarning("Email required", "Enter your email to receive a reset link.");
    return;
  }
  const { auth, authMod } = await ensureFirebaseAuth();
  await authMod.sendPasswordResetEmail(auth, email);
  await notifySuccess("Reset email sent", "Check your inbox and spam folder.");
}

function bindAuthEvents() {
  dom.landingSignupBtn.addEventListener("click", () => openAuth("signup"));
  dom.landingLoginBtn.addEventListener("click", () => openAuth("login"));
  dom.heroSignupBtn.addEventListener("click", () => openAuth("signup"));
  dom.heroLoginBtn.addEventListener("click", () => openAuth("login"));
  dom.landingCloseAuthBtn.addEventListener("click", () => dom.landingAuthModal.close());
  dom.landingSubmitSignupBtn.addEventListener("click", () => {
    submitAuth("signup").catch((err: any) => {
      const msg = err.message || "Could not create account.";
      setAuthMessage(msg);
      notifyError("Sign up failed", msg);
    });
  });
  dom.landingSubmitLoginBtn.addEventListener("click", () => {
    submitAuth("login").catch((err: any) => {
      const msg = err.message || "Could not login.";
      setAuthMessage(msg);
      notifyError("Login failed", msg);
    });
  });
  dom.landingForgotPasswordBtn.addEventListener("click", () => {
    sendLandingPasswordReset().catch((err: any) => {
      const msg = err.message || "Could not send reset email.";
      setAuthMessage(msg);
      notifyError("Reset failed", msg);
    });
  });

  const params = new URLSearchParams(window.location.search);
  const auth = params.get("auth");
  if (auth === "signup" || auth === "login") openAuth(auth);
}

detectLocale().finally(() => {
  applyCustomSite();
  runAnimations();
  bindAuthEvents();
});
