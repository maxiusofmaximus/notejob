import anime from "animejs/lib/anime.es.js";
import { gsap } from "gsap";
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from "./ui-alert";

type Locale = "en" | "es";
type SiteCustomConfig = {
  theme?: { brand?: string; accent?: string; bg?: string };
};

type Settings = {
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  language: "auto" | Locale;
  weekStart: "monday" | "sunday";
  compactCards: "on" | "off";
  weeklyDigest: "on" | "off";
};

type VaultEntry = {
  id: string;
  label: string;
  tags: string[];
  cipher: string;
  iv: string;
  salt: string;
  createdAt: string;
};

const APP_NAME = "NoteJob";
const settingsKey = "notejob.user.settings.v2";
const siteCustomKey = "notejob.site.custom.v1";
const vaultKeyBase = "notejob.vault.entries.v1";
const itemsKeyBase = "notejob.items.v1";
const cleanFirebaseValue = (value: string | undefined) => String(value || "").replace(/\uFEFF/g, "").trim();

const runtimeDefaults = {
  aiBaseUrl: import.meta.env.PUBLIC_AI_BASE_URL || "https://api.openai.com/v1",
  aiModel: import.meta.env.PUBLIC_AI_MODEL || "gpt-4o-mini",
  aiApiKey: import.meta.env.PUBLIC_AI_API_KEY || "",
  firebaseApiKey: cleanFirebaseValue(import.meta.env.PUBLIC_FIREBASE_API_KEY),
  firebaseAuthDomain: cleanFirebaseValue(import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN),
  firebaseProjectId: cleanFirebaseValue(import.meta.env.PUBLIC_FIREBASE_PROJECT_ID),
  firebaseAppId: cleanFirebaseValue(import.meta.env.PUBLIC_FIREBASE_APP_ID)
};

const defaultSettings: Settings = {
  aiBaseUrl: runtimeDefaults.aiBaseUrl,
  aiModel: runtimeDefaults.aiModel,
  aiApiKey: runtimeDefaults.aiApiKey,
  language: "auto",
  weekStart: "monday",
  compactCards: "off",
  weeklyDigest: "on"
};

const i18n: Record<Locale, Record<string, string>> = {
  en: {
    workspace_sub: "Execution dashboard for tasks and knowledge.",
    settings: "Settings",
    login: "Login",
    signup: "Signup",
    logout: "Logout",
    account: "Account",
    system_health: "System status",
    run_checks: "Refresh status",
    quick_actions: "Quick actions",
    new_task: "New task",
    new_project: "New project",
    overview: "Overview",
    tasks: "Tasks",
    projects: "Projects",
    resources: "Resources",
    overdue: "Overdue",
    ai_planner: "AI Planner",
    ai_hint: "Ask for a weekly plan, project breakdown, or next-step checklist.",
    send: "Send",
    ai_ready: "Ready to generate a plan.",
    ai_running: "Generating plan...",
    ai_success: "Plan generated",
    ai_error: "Could not generate plan"
  },
  es: {
    workspace_sub: "Panel de ejecución para tareas y conocimiento.",
    settings: "Configuración",
    login: "Entrar",
    signup: "Crear cuenta",
    logout: "Salir",
    account: "Cuenta",
    system_health: "Estado del sistema",
    run_checks: "Actualizar estado",
    quick_actions: "Acciones rápidas",
    new_task: "Nueva tarea",
    new_project: "Nuevo proyecto",
    overview: "Resumen",
    tasks: "Tareas",
    projects: "Proyectos",
    resources: "Recursos",
    overdue: "Vencidas",
    ai_planner: "Planificador IA",
    ai_hint: "Pide un plan semanal, un desglose de proyecto o una checklist de siguientes pasos.",
    send: "Enviar",
    ai_ready: "Listo para generar un plan.",
    ai_running: "Generando plan...",
    ai_success: "Plan generado",
    ai_error: "No se pudo generar el plan"
  }
};

const settings = loadSettings();
let items: any[] = [];
const systemChecks = [
  { name: "Sync", status: "ready" },
  { name: "Account security", status: "ready" },
  { name: "File processing", status: "ready" },
  { name: "Exports", status: "ready" },
  { name: "Smart assistant", status: "ready" }
];

let firebaseAuth: any = null;
let firebaseAuthMod: any = null;
let lastIdToken = "";
let currentUserId = "guest";
let locale: Locale = "en";
let vaultPassphraseCache = "";
let vaultEntries: VaultEntry[] = [];

const dom = {
  accountEmail: getById("accountEmail"),
  accountUid: getById("accountUid"),
  accountVerified: getById("accountVerified"),
  accountProvider: getById("accountProvider"),
  accountLastSignIn: getById("accountLastSignIn"),
  mcpStatus: getById("mcpStatus"),
  localeLine: getById("localeLine"),
  itemsGrid: getById("itemsGrid"),
  sumTasks: getById("sumTasks"),
  sumProjects: getById("sumProjects"),
  sumResources: getById("sumResources"),
  sumOverdue: getById("sumOverdue"),
  lastActivity: getById("lastActivity"),
  chatInput: getById("chatInput") as HTMLTextAreaElement,
  chatSendBtn: getById("chatSendBtn"),
  aiOutputStatus: getById("aiOutputStatus"),
  aiOutputList: getById("aiOutputList"),
  runMcpChecksBtn: getById("runMcpChecksBtn"),
  settingsFab: getById("settingsFab"),
  closeSettingsBtn: getById("closeSettingsBtn"),
  saveSettingsBtn: getById("saveSettingsBtn"),
  openLoginBtn: getById("openLoginBtn"),
  openSignupBtn: getById("openSignupBtn"),
  signOutBtn: getById("signOutBtn"),
  guestLoginBtn: getById("guestLoginBtn"),
  guestSignupBtn: getById("guestSignupBtn"),
  workspaceGuestView: getById("workspaceGuestView"),
  workspacePrivateView: getById("workspacePrivateView"),
  newTaskBtn: getById("newTaskBtn"),
  newProjectBtn: getById("newProjectBtn"),
  authModal: getById("authModal") as HTMLDialogElement,
  authTitle: getById("authTitle"),
  authEmail: getById("authEmail") as HTMLInputElement,
  authPassword: getById("authPassword") as HTMLInputElement,
  submitSignupBtn: getById("submitSignupBtn"),
  submitLoginBtn: getById("submitLoginBtn"),
  forgotPasswordBtn: getById("forgotPasswordBtn"),
  closeAuthModalBtn: getById("closeAuthModalBtn"),
  creatorModal: getById("creatorModal") as HTMLDialogElement,
  creatorTitle: getById("creatorTitle"),
  closeCreatorBtn: getById("closeCreatorBtn"),
  saveItemBtn: getById("saveItemBtn"),
  newTitle: getById("newTitle") as HTMLInputElement,
  newKind: getById("newKind") as HTMLSelectElement,
  newStatus: getById("newStatus") as HTMLSelectElement,
  newStartDate: getById("newStartDate") as HTMLInputElement,
  newDueDate: getById("newDueDate") as HTMLInputElement,
  newDoneSubtasks: getById("newDoneSubtasks") as HTMLInputElement,
  newTotalSubtasks: getById("newTotalSubtasks") as HTMLInputElement,
  newResources: getById("newResources") as HTMLInputElement,
  newSummary: getById("newSummary") as HTMLTextAreaElement,
  settingsModal: getById("settingsModal") as HTMLDialogElement,
  settingsAiBaseUrl: getById("settingsAiBaseUrl") as HTMLInputElement,
  settingsAiModel: getById("settingsAiModel") as HTMLInputElement,
  settingsAiKey: getById("settingsAiKey") as HTMLInputElement,
  settingsLanguage: getById("settingsLanguage") as HTMLSelectElement,
  settingsWeekStart: getById("settingsWeekStart") as HTMLSelectElement,
  settingsCompactCards: getById("settingsCompactCards") as HTMLSelectElement,
  settingsWeeklyDigest: getById("settingsWeeklyDigest") as HTMLSelectElement,
  vaultPassphrase: getById("vaultPassphrase") as HTMLInputElement,
  vaultLabel: getById("vaultLabel") as HTMLInputElement,
  vaultTags: getById("vaultTags") as HTMLInputElement,
  vaultSecret: getById("vaultSecret") as HTMLTextAreaElement,
  vaultSaveBtn: getById("vaultSaveBtn"),
  vaultUnlockBtn: getById("vaultUnlockBtn"),
  vaultGrid: getById("vaultGrid")
};

function getById(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(settingsKey);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}

function scopedKey(base: string) {
  return `${base}:${currentUserId}`;
}

function loadItems() {
  try {
    const raw = localStorage.getItem(scopedKey(itemsKeyBase));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(scopedKey(itemsKeyBase), JSON.stringify(items));
}

async function getIdToken() {
  if (!firebaseAuth?.currentUser) return "";
  lastIdToken = await firebaseAuth.currentUser.getIdToken();
  return lastIdToken;
}

async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  const token = await getIdToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

function applyTranslations() {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n || "";
    if (i18n[locale][key]) el.textContent = i18n[locale][key];
  });
  document.documentElement.lang = locale;
}

async function detectLocale() {
  if (settings.language !== "auto") {
    locale = settings.language;
    dom.localeLine.textContent = `Locale: ${locale.toUpperCase()} · manual`;
    applyTranslations();
    return;
  }

  try {
    const res = await fetch("/api/locale");
    const data = await res.json();
    locale = data.locale === "es" ? "es" : "en";
    dom.localeLine.textContent = `Locale: ${locale.toUpperCase()} · ${data.city}, ${data.country}`;
  } catch {
    locale = navigator.language.startsWith("es") ? "es" : "en";
    dom.localeLine.textContent = `Locale: ${locale.toUpperCase()} (fallback)`;
  }
  applyTranslations();
}

function applySiteCustomization() {
  try {
    const raw = localStorage.getItem(siteCustomKey);
    if (!raw) return;
    const custom = JSON.parse(raw) as SiteCustomConfig;
    if (custom.theme?.brand) document.documentElement.style.setProperty("--brand", custom.theme.brand);
    if (custom.theme?.accent) document.documentElement.style.setProperty("--accent", custom.theme.accent);
    if (custom.theme?.bg) document.documentElement.style.setProperty("--bg-1", custom.theme.bg);
  } catch {
    // ignore invalid payload
  }
}

function renderSystemStatus() {
  dom.mcpStatus.innerHTML = "";
  for (const conn of systemChecks) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${conn.name}: ${conn.status}`;
    dom.mcpStatus.append(chip);
  }
}

function runStatusCheck() {
  for (const conn of systemChecks) {
    conn.status = Math.random() > 0.12 ? "ready" : "attention";
  }
  renderSystemStatus();
}

function renderWorkspaceVisibility() {
  const authenticated = Boolean(firebaseAuth?.currentUser);
  (dom.workspaceGuestView as HTMLElement).hidden = authenticated;
  (dom.workspacePrivateView as HTMLElement).hidden = !authenticated;
}

function renderAccountIdentity(user: any | null) {
  if (!user) {
    dom.accountEmail.textContent = "Not authenticated";
    dom.accountUid.textContent = "-";
    dom.accountVerified.textContent = "No";
    dom.accountProvider.textContent = "-";
    dom.accountLastSignIn.textContent = "-";
    return;
  }

  const providers = Array.isArray(user.providerData) ? user.providerData.map((p: any) => p?.providerId).filter(Boolean) : [];
  const providerLabel = providers.length ? providers.join(", ") : "password";
  dom.accountEmail.textContent = user.email || "No email";
  dom.accountUid.textContent = user.uid || "-";
  dom.accountVerified.textContent = user.emailVerified ? "Yes" : "No";
  dom.accountProvider.textContent = providerLabel;
  dom.accountLastSignIn.textContent = user.metadata?.lastSignInTime || "-";
}

function toDateLabel(item: any) {
  return `${item.startDate || "n/a"} -> ${item.dueDate || "n/a"} · ${item.doneSubtasks}/${item.totalSubtasks}`;
}

function renderItems() {
  dom.itemsGrid.innerHTML = "";
  if (!firebaseAuth?.currentUser) {
    const empty = document.createElement("article");
    empty.className = "task-card";
    empty.innerHTML = `
      <h3>Private workspace</h3>
      <p>Login or create account to see your own tasks, projects, and resources.</p>
    `;
    dom.itemsGrid.append(empty);
    return;
  }

  const sorted = [...items].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  for (const item of sorted) {
    const article = document.createElement("article");
    article.className = "task-card";
    article.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.summary}</p>
      <p>${toDateLabel(item)}</p>
      <div class="chip-row">${item.tags.map((t: string) => `<span class="chip">${t}</span>`).join("")}</div>
    `;
    dom.itemsGrid.append(article);
  }

  if (settings.compactCards === "on") dom.itemsGrid.classList.add("compact-cards");
  else dom.itemsGrid.classList.remove("compact-cards");
}

function renderSummary() {
  if (!firebaseAuth?.currentUser) {
    dom.sumTasks.textContent = "0";
    dom.sumProjects.textContent = "0";
    dom.sumResources.textContent = "0";
    dom.sumOverdue.textContent = "0";
    dom.lastActivity.textContent = "Login required to view your account workspace.";
    return;
  }

  const tasks = items.filter((x) => x.kind === "task").length;
  const projects = items.filter((x) => x.kind === "project").length;
  const resources = items.filter((x) => x.status === "done").length;
  const overdue = items.filter((x) => x.status !== "done" && x.dueDate < new Date().toISOString().slice(0, 10)).length;

  dom.sumTasks.textContent = String(tasks);
  dom.sumProjects.textContent = String(projects);
  dom.sumResources.textContent = String(resources);
  dom.sumOverdue.textContent = String(overdue);
  const top = sortedTop();
  dom.lastActivity.textContent = top ? `${top.title} · ${top.status} · ${toDateLabel(top)}` : "No activity yet.";
}

function sortedTop() {
  return [...items].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0] || null;
}

function openAuth(mode: "signup" | "login") {
  dom.authTitle.textContent = mode === "signup" ? "Create account" : "Login";
  dom.submitSignupBtn.classList.toggle("btn--primary", mode === "signup");
  dom.submitLoginBtn.classList.toggle("btn--primary", mode === "login");
  dom.authModal.dataset.mode = mode;
  dom.authModal.showModal();
}

async function ensureFirebaseAuth() {
  if (firebaseAuth && firebaseAuthMod) return { authMod: firebaseAuthMod, auth: firebaseAuth };
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

  firebaseAuthMod = authMod;
  firebaseAuth = authMod.getAuth(app);
  authMod.onAuthStateChanged(firebaseAuth, (user: any) => {
    currentUserId = user?.uid || "guest";
    lastIdToken = "";
    renderAccountIdentity(user || null);
    items = loadItems();
    vaultEntries = loadVaultEntries();
    if (user) {
      refreshRemoteItems().catch(() => null);
      refreshRemoteVault().catch(() => null);
    }
    renderWorkspaceVisibility();
    renderItems();
    renderSummary();
    renderVault();
  });
  return { authMod: firebaseAuthMod, auth: firebaseAuth };
}

async function doAuth(mode: "signup" | "login") {
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;
  if (!email || !password) return;

  try {
    const { authMod, auth } = await ensureFirebaseAuth();
    if (mode === "signup") {
      const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
      const redirect = `${window.location.origin}/confirm-email`;
      await authMod.sendEmailVerification(cred.user, { url: redirect });
      await notifySuccess("Account created", `Verification email sent from ${APP_NAME}.`);
    } else {
      await authMod.signInWithEmailAndPassword(auth, email, password);
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        throw new Error("Email not confirmed yet.");
      }
    }
    dom.authModal.close();
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

async function sendPasswordReset() {
  const email = dom.authEmail.value.trim();
  if (!email) {
    await notifyWarning("Email required", "Enter your email to receive a reset link.");
    return;
  }
  const { authMod, auth } = await ensureFirebaseAuth();
  await authMod.sendPasswordResetEmail(auth, email);
  await notifySuccess("Reset email sent", "Check your inbox and spam folder.");
}

async function signOut() {
  if (!firebaseAuth) return;
  const authApi = firebaseAuthMod || await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  await authApi.signOut(firebaseAuth);
  lastIdToken = "";
  renderAccountIdentity(null);
}

function fillSettingsForm() {
  dom.settingsAiBaseUrl.value = settings.aiBaseUrl;
  dom.settingsAiModel.value = settings.aiModel;
  dom.settingsAiKey.value = settings.aiApiKey;
  dom.settingsLanguage.value = settings.language;
  dom.settingsWeekStart.value = settings.weekStart;
  dom.settingsCompactCards.value = settings.compactCards;
  dom.settingsWeeklyDigest.value = settings.weeklyDigest;
}

function readSettingsForm() {
  settings.aiBaseUrl = dom.settingsAiBaseUrl.value.trim();
  settings.aiModel = dom.settingsAiModel.value.trim();
  settings.aiApiKey = dom.settingsAiKey.value.trim();
  settings.language = dom.settingsLanguage.value as Settings["language"];
  settings.weekStart = dom.settingsWeekStart.value as Settings["weekStart"];
  settings.compactCards = dom.settingsCompactCards.value as Settings["compactCards"];
  settings.weeklyDigest = dom.settingsWeeklyDigest.value as Settings["weeklyDigest"];
  saveSettings();
}

function splitCsv(value: string) {
  return value.split(",").map((x) => x.trim()).filter(Boolean);
}

function openCreator(kind: "task" | "project") {
  dom.creatorTitle.textContent = kind === "project" ? "New project" : "New task";
  dom.newKind.value = kind;
  dom.newTitle.value = "";
  dom.newSummary.value = "";
  dom.newStatus.value = "inbox";
  dom.newStartDate.value = "";
  dom.newDueDate.value = "";
  dom.newDoneSubtasks.value = "0";
  dom.newTotalSubtasks.value = "1";
  dom.newResources.value = "";
  dom.creatorModal.showModal();
}

function saveItem() {
  if (!firebaseAuth?.currentUser) {
    openAuth("login");
    return;
  }
  const title = dom.newTitle.value.trim();
  if (!title) return;
  const nextItem = {
    id: `i-${Date.now()}`,
    kind: dom.newKind.value,
    title,
    summary: dom.newSummary.value.trim() || "No summary",
    status: dom.newStatus.value,
    startDate: dom.newStartDate.value || "",
    dueDate: dom.newDueDate.value || "",
    doneSubtasks: Number(dom.newDoneSubtasks.value || 0),
    totalSubtasks: Math.max(1, Number(dom.newTotalSubtasks.value || 1)),
    tags: splitCsv(dom.newResources.value).length ? splitCsv(dom.newResources.value) : ["Brief"],
    updatedAt: new Date().toISOString()
  };
  items.unshift(nextItem);
  saveItems();
  saveRemoteItem(nextItem).catch(() => null);
  dom.creatorModal.close();
  renderItems();
  renderSummary();
}

function setAiStatus(text: string, tone: "idle" | "working" | "success" | "error" = "idle") {
  dom.aiOutputStatus.textContent = text;
  dom.aiOutputStatus.classList.remove("is-working", "is-success", "is-error");
  if (tone === "working") dom.aiOutputStatus.classList.add("is-working");
  if (tone === "success") dom.aiOutputStatus.classList.add("is-success");
  if (tone === "error") dom.aiOutputStatus.classList.add("is-error");
}

function setAiPlanPreview(tasks: Array<{ title: string; dueDate: string; kind: string }>) {
  dom.aiOutputList.innerHTML = "";
  if (!tasks.length) return;

  for (const task of tasks.slice(0, 5)) {
    const li = document.createElement("li");
    li.className = "ai-output__item";
    li.textContent = `${task.kind.toUpperCase()} · ${task.title}${task.dueDate ? ` · ${task.dueDate}` : ""}`;
    dom.aiOutputList.append(li);
  }
}

async function aiPlan(prompt: string) {
  const email = firebaseAuth?.currentUser?.email || "";
  const usingOwnKey = Boolean((settings.aiApiKey || runtimeDefaults.aiApiKey || "").trim());
  const response = await fetchWithAuth("/api/ai/plan", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      model: settings.aiModel || runtimeDefaults.aiModel,
      baseUrl: settings.aiBaseUrl || runtimeDefaults.aiBaseUrl,
      apiKey: settings.aiApiKey || runtimeDefaults.aiApiKey,
      email
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || `AI endpoint failed (${response.status})`);
  }
  const data = await response.json();
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  if (!tasks.length) {
    return { created: 0, provider: data?.provider || "", tasks: [] as Array<{ title: string; dueDate: string; kind: string }> };
  }

  for (const t of tasks) {
    items.unshift({
      id: `i-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      kind: t.kind === "project" ? "project" : "task",
      title: t.title || "AI generated item",
      summary: t.summary || "",
      status: t.status || "inbox",
      startDate: t.startDate || "",
      dueDate: t.dueDate || "",
      doneSubtasks: Number(t.doneSubtasks || 0),
      totalSubtasks: Math.max(1, Number(t.totalSubtasks || 1)),
      tags: Array.isArray(t.resources) ? t.resources : ["AI"],
      updatedAt: new Date().toISOString()
    });
  }

  saveItems();
  renderItems();
  renderSummary();
  items.forEach((item) => saveRemoteItem(item).catch(() => null));

  const provider = typeof data?.provider === "string" ? data.provider : "";
  const trialRemaining = Number(data?.trial?.creditsRemaining || 0);
  if (!usingOwnKey && data?.trial) {
    await notifyInfo("Trial mode used", `Remaining shared attempts: ${trialRemaining}`);
  }

  return {
    created: tasks.length,
    provider,
    trialRemaining,
    tasks: tasks.map((t: any) => ({
      title: String(t?.title || "AI generated item"),
      dueDate: String(t?.dueDate || ""),
      kind: t?.kind === "project" ? "project" : "task"
    }))
  };
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(input: string) {
  return Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
}

async function deriveVaultKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 180000,
      hash: "SHA-256"
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptVaultSecret(secret: string, passphrase: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveVaultKey(passphrase, salt);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(secret));
  return {
    cipher: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    salt: toBase64(salt)
  };
}

async function decryptVaultSecret(entry: VaultEntry, passphrase: string) {
  const iv = fromBase64(entry.iv);
  const salt = fromBase64(entry.salt);
  const cipher = fromBase64(entry.cipher);
  const key = await deriveVaultKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

function loadVaultEntries(): VaultEntry[] {
  try {
    const raw = localStorage.getItem(scopedKey(vaultKeyBase));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVaultEntries() {
  localStorage.setItem(scopedKey(vaultKeyBase), JSON.stringify(vaultEntries));
}

function renderVault() {
  dom.vaultGrid.innerHTML = "";
  if (!firebaseAuth?.currentUser) {
    const card = document.createElement("article");
    card.className = "vault-card";
    card.innerHTML = "<strong>Private vault is available after login.</strong>";
    dom.vaultGrid.append(card);
    return;
  }

  const sorted = vaultEntries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const entry of sorted) {
    const card = document.createElement("article");
    card.className = "vault-card";

    const tags = entry.tags.map((t) => `<span class="chip">${t}</span>`).join("");
    card.innerHTML = `
      <strong>${entry.label}</strong>
      <div class="chip-row" style="margin-top:0.4rem;">${tags}</div>
      <div class="row" style="margin-top:0.5rem;">
        <button class="btn btn--ghost" data-action="reveal" data-id="${entry.id}" type="button">Reveal</button>
        <button class="btn" data-action="copy" data-id="${entry.id}" type="button">Copy</button>
      </div>
      <div class="vault-secret" id="secret-${entry.id}">Encrypted</div>
    `;
    dom.vaultGrid.append(card);
  }

  dom.vaultGrid.querySelectorAll<HTMLButtonElement>("button[data-action='reveal']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id || "";
      const entry = vaultEntries.find((x) => x.id === id);
      if (!entry) return;
      const passphrase = vaultPassphraseCache || dom.vaultPassphrase.value;
      if (!passphrase) {
        await notifyWarning("Passphrase required", "Enter your vault passphrase first.");
        return;
      }
      try {
        const secret = await decryptVaultSecret(entry, passphrase);
        const target = document.getElementById(`secret-${entry.id}`);
        if (target) target.textContent = secret;
        vaultPassphraseCache = passphrase;
      } catch {
        await notifyError("Decrypt failed", "Check your passphrase.");
      }
    });
  });

  dom.vaultGrid.querySelectorAll<HTMLButtonElement>("button[data-action='copy']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id || "";
      const entry = vaultEntries.find((x) => x.id === id);
      if (!entry) return;
      const passphrase = vaultPassphraseCache || dom.vaultPassphrase.value;
      if (!passphrase) {
        await notifyWarning("Passphrase required", "Enter your vault passphrase first.");
        return;
      }
      try {
        const secret = await decryptVaultSecret(entry, passphrase);
        await navigator.clipboard.writeText(secret);
        await notifySuccess("Copied", "Secret copied to clipboard.");
      } catch {
        await notifyError("Decrypt failed", "Check your passphrase.");
      }
    });
  });
}

async function refreshRemoteItems() {
  const response = await fetchWithAuth("/api/items", { method: "GET" });
  if (!response.ok) return;
  const data = await response.json();
  if (!Array.isArray(data?.items)) return;
  if (data.items.length === 0 && items.length) {
    items.forEach((item) => saveRemoteItem(item).catch(() => null));
    return;
  }
  items = data.items;
  saveItems();
  renderItems();
  renderSummary();
}

async function saveRemoteItem(item: any) {
  const payload = {
    ...item,
    resources: Array.isArray(item?.resources) ? item.resources : item?.tags || [],
    tags: Array.isArray(item?.tags) ? item.tags : item?.resources || []
  };
  await fetchWithAuth("/api/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function refreshRemoteVault() {
  const response = await fetchWithAuth("/api/vault", { method: "GET" });
  if (!response.ok) return;
  const data = await response.json();
  if (!Array.isArray(data?.entries)) return;
  if (data.entries.length === 0 && vaultEntries.length) {
    vaultEntries.forEach((entry) => saveRemoteVault(entry).catch(() => null));
    return;
  }
  vaultEntries = data.entries;
  saveVaultEntries();
  renderVault();
}

async function saveRemoteVault(entry: VaultEntry) {
  await fetchWithAuth("/api/vault", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entry)
  });
}

async function saveVaultEntry() {
  if (!firebaseAuth?.currentUser) {
    openAuth("login");
    return;
  }
  const passphrase = dom.vaultPassphrase.value;
  const label = dom.vaultLabel.value.trim();
  const secret = dom.vaultSecret.value.trim();
  if (!passphrase || !label || !secret) {
    await notifyWarning("Missing fields", "Passphrase, label, and secret are required.");
    return;
  }

  const encrypted = await encryptVaultSecret(secret, passphrase);
  const entry: VaultEntry = {
    id: `vault-${Date.now()}`,
    label,
    tags: splitCsv(dom.vaultTags.value),
    cipher: encrypted.cipher,
    iv: encrypted.iv,
    salt: encrypted.salt,
    createdAt: new Date().toISOString()
  };

  vaultEntries.unshift(entry);
  saveVaultEntries();
  saveRemoteVault(entry).catch(() => null);
  vaultPassphraseCache = passphrase;
  dom.vaultLabel.value = "";
  dom.vaultTags.value = "";
  dom.vaultSecret.value = "";
  renderVault();
}

function bindEvents() {
  dom.runMcpChecksBtn.addEventListener("click", runStatusCheck);
  dom.settingsFab.addEventListener("click", () => {
    fillSettingsForm();
    dom.settingsModal.showModal();
  });
  dom.closeSettingsBtn.addEventListener("click", () => dom.settingsModal.close());
  dom.saveSettingsBtn.addEventListener("click", async () => {
    readSettingsForm();
    dom.settingsModal.close();
    renderItems();
    await detectLocale();
  });

  dom.openSignupBtn.addEventListener("click", () => openAuth("signup"));
  dom.openLoginBtn.addEventListener("click", () => openAuth("login"));
  dom.guestSignupBtn.addEventListener("click", () => openAuth("signup"));
  dom.guestLoginBtn.addEventListener("click", () => openAuth("login"));
  dom.closeAuthModalBtn.addEventListener("click", () => dom.authModal.close());
  dom.submitSignupBtn.addEventListener("click", () => doAuth("signup").catch((err) => notifyError("Sign up failed", err.message)));
  dom.submitLoginBtn.addEventListener("click", () => doAuth("login").catch((err) => notifyError("Login failed", err.message)));
  dom.forgotPasswordBtn.addEventListener("click", () => sendPasswordReset().catch((err) => notifyError("Reset failed", err.message)));
  dom.signOutBtn.addEventListener("click", () => signOut().catch((err) => notifyError("Logout failed", err.message)));
  dom.newTaskBtn.addEventListener("click", () => (firebaseAuth?.currentUser ? openCreator("task") : openAuth("login")));
  dom.newProjectBtn.addEventListener("click", () => (firebaseAuth?.currentUser ? openCreator("project") : openAuth("login")));
  dom.closeCreatorBtn.addEventListener("click", () => dom.creatorModal.close());
  dom.saveItemBtn.addEventListener("click", saveItem);
  dom.chatSendBtn.addEventListener("click", async () => {
    if (!firebaseAuth?.currentUser) {
      await notifyWarning("Login required", "Login is required to use AI planner.");
      openAuth("login");
      return;
    }
    const prompt = dom.chatInput.value.trim();
    if (!prompt) return;
    dom.chatSendBtn.setAttribute("disabled", "true");
    setAiStatus(i18n[locale].ai_running || "Generating plan...", "working");
    setAiPlanPreview([]);
    dom.chatInput.value = "";
    try {
      const result = await aiPlan(prompt);
      const providerLabel = result?.provider ? ` · ${result.provider}` : "";
      setAiStatus(`${i18n[locale].ai_success || "Plan generated"}: ${result?.created || 0}${providerLabel}`, "success");
      setAiPlanPreview(result?.tasks || []);
    } catch (err: any) {
      setAiStatus(`${i18n[locale].ai_error || "Could not generate plan"}: ${err.message || "Unknown error"}`, "error");
      await notifyError("AI planner failed", err.message || "Could not generate tasks.");
    } finally {
      dom.chatSendBtn.removeAttribute("disabled");
    }
  });

  dom.vaultSaveBtn.addEventListener("click", () => {
    saveVaultEntry().catch(() => notifyError("Vault save failed", "Could not encrypt vault entry."));
  });
  dom.vaultUnlockBtn.addEventListener("click", async () => {
    const pass = dom.vaultPassphrase.value.trim();
    if (!pass) {
      await notifyWarning("Passphrase required", "Enter your passphrase.");
      return;
    }
    vaultPassphraseCache = pass;
    await notifySuccess("Vault unlocked", "Vault unlocked for this session.");
  });
}

function runMotion() {
  gsap.from(".sidebar", { x: -24, opacity: 0, duration: 0.7, ease: "power2.out" });
  gsap.from(".content-card", { y: 18, opacity: 0, duration: 0.75, ease: "power2.out", delay: 0.15 });
  anime({
    targets: ".metric",
    scale: [0.96, 1],
    opacity: [0, 1],
    easing: "easeOutExpo",
    duration: 640,
    delay: anime.stagger(70, { start: 220 })
  });
}

async function boot() {
  applySiteCustomization();
  await detectLocale();
  currentUserId = "guest";
  items = loadItems();
  vaultEntries = loadVaultEntries();
  renderSystemStatus();
  renderWorkspaceVisibility();
  renderItems();
  renderSummary();
  renderVault();
  setAiStatus(i18n[locale].ai_ready || "Ready to generate a plan.", "idle");
  bindEvents();
  runMotion();

  if (runtimeDefaults.firebaseApiKey && runtimeDefaults.firebaseAuthDomain && runtimeDefaults.firebaseProjectId && runtimeDefaults.firebaseAppId) {
    ensureFirebaseAuth().catch(() => {
      dom.accountEmail.textContent = "Authentication unavailable";
      dom.accountUid.textContent = "-";
      dom.accountVerified.textContent = "No";
      dom.accountProvider.textContent = "-";
      dom.accountLastSignIn.textContent = "-";
    });
  }

  const params = new URLSearchParams(window.location.search);
  const auth = params.get("auth");
  if (auth === "signup" || auth === "login") openAuth(auth);
}

boot();
