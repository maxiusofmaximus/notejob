import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";

type SiteCustomConfig = {
  theme: {
    brand: string;
    accent: string;
    bg: string;
  };
  content: {
    tagline: string;
    heroTitle: string;
    heroText: string;
    ctaLabel: string;
  };
  layoutOrder: string[];
};

const key = "notejob.site.custom.v1";

const defaults: SiteCustomConfig = {
  theme: {
    brand: "#70f3c6",
    accent: "#7ca3ff",
    bg: "#0d1521"
  },
  content: {
    tagline: "From quick ideas to finished outcomes.",
    heroTitle: "Capture what matters today. Finish what matters next.",
    heroText:
      "NoteJob helps you collect ideas, organize tasks, and move projects forward without losing context. Every completed task can become a clean learning note you can reuse later.",
    ctaLabel: "Create your workspace"
  },
  layoutOrder: ["hero", "workflow", "audience", "contact"]
};

const statusLine = document.getElementById("adminStatus") as HTMLParagraphElement;
const logoutBtn = document.getElementById("adminLogoutBtn") as HTMLButtonElement;
const saveBtn = document.getElementById("adminSaveBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("adminResetBtn") as HTMLButtonElement;

const brandColor = document.getElementById("adminBrandColor") as HTMLInputElement;
const accentColor = document.getElementById("adminAccentColor") as HTMLInputElement;
const bgColor = document.getElementById("adminBgColor") as HTMLInputElement;
const tagline = document.getElementById("adminTagline") as HTMLInputElement;
const heroTitle = document.getElementById("adminHeroTitle") as HTMLInputElement;
const heroText = document.getElementById("adminHeroText") as HTMLTextAreaElement;
const ctaLabel = document.getElementById("adminCtaLabel") as HTMLInputElement;

function loadConfig(): SiteCustomConfig {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function fillForm(cfg: SiteCustomConfig) {
  brandColor.value = cfg.theme.brand;
  accentColor.value = cfg.theme.accent;
  bgColor.value = cfg.theme.bg;
  tagline.value = cfg.content.tagline;
  heroTitle.value = cfg.content.heroTitle;
  heroText.value = cfg.content.heroText;
  ctaLabel.value = cfg.content.ctaLabel;
}

function applyLayoutOrder(grid: GridStack, order: string[]) {
  const widgets = grid.engine.nodes
    .slice()
    .sort((a, b) => a.y - b.y)
    .map((n) => ({ id: String((n.el as HTMLElement)?.getAttribute("gs-id")), y: n.y }));

  if (!order.length) return;
  order.forEach((id, idx) => {
    const node = widgets.find((w) => w.id === id);
    if (!node) return;
    const el = document.querySelector(`.grid-stack-item[gs-id="${id}"]`) as HTMLElement | null;
    if (!el) return;
    grid.update(el, { y: idx * 2 });
  });
}

async function ensureSession() {
  const res = await fetch("/api/admin/session");
  const data = await res.json();
  if (!data.authenticated) {
    window.location.href = "/admin/login";
  }
}

const grid = GridStack.init(
  {
    column: 12,
    cellHeight: 56,
    disableResize: true,
    margin: 8
  },
  "#adminGrid"
);

const config = loadConfig();
fillForm(config);
applyLayoutOrder(grid, config.layoutOrder);

saveBtn.addEventListener("click", () => {
  const nodes = grid.engine.nodes
    .slice()
    .sort((a, b) => a.y - b.y)
    .map((n) => String((n.el as HTMLElement).getAttribute("gs-id")));

  const payload: SiteCustomConfig = {
    theme: {
      brand: brandColor.value,
      accent: accentColor.value,
      bg: bgColor.value
    },
    content: {
      tagline: tagline.value.trim(),
      heroTitle: heroTitle.value.trim(),
      heroText: heroText.value.trim(),
      ctaLabel: ctaLabel.value.trim()
    },
    layoutOrder: nodes
  };

  localStorage.setItem(key, JSON.stringify(payload));
  statusLine.textContent = "Changes saved. Refresh home/app to preview.";
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem(key);
  fillForm(defaults);
  applyLayoutOrder(grid, defaults.layoutOrder);
  statusLine.textContent = "Reset to defaults.";
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin/login";
});

ensureSession().catch(() => {
  window.location.href = "/admin/login";
});
