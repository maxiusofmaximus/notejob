import anime from "animejs/lib/anime.es.js";
import { gsap } from "gsap";

type Locale = "en" | "es";
type SiteCustomConfig = {
  theme?: { brand?: string; accent?: string; bg?: string };
  content?: { tagline?: string; heroTitle?: string; heroText?: string; ctaLabel?: string };
  layoutOrder?: string[];
};
const customKey = "notejob.site.custom.v1";

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

detectLocale().finally(() => {
  applyCustomSite();
  runAnimations();
});
