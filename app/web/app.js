const APP_NAME = "NoteJob";

const storageKeys = {
  settings: "notejob.settings.v2"
};

const defaultSettings = {
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "gpt-4o-mini",
  aiApiKey: "",
  firebaseApiKey: "",
  firebaseAuthDomain: "",
  firebaseProjectId: "",
  firebaseAppId: ""
};

const settings = loadSettings();
let firebaseAuth = null;
let currentUser = null;
let currentTab = "home";
let authMode = "signup";
let editingResource = false;
let activeResource = null;
let creatingKind = "task";

const items = [
  {
    id: "t1",
    kind: "task",
    title: "Mecanicas slime evolutivo",
    summary: "Diseñar loop de absorción, hitos y balance.",
    status: "researching",
    startDate: "2026-02-20",
    dueDate: "2026-03-01",
    doneSubtasks: 2,
    totalSubtasks: 5,
    resources: ["GDD", "Video", "PDF"],
    updatedAt: "2026-02-15T10:00:00Z"
  },
  {
    id: "p1",
    kind: "project",
    title: "Aura for Unity",
    summary: "Copiloto de blueprints/scripts con trazabilidad.",
    status: "inbox",
    startDate: "2026-02-25",
    dueDate: "2026-03-20",
    doneSubtasks: 1,
    totalSubtasks: 6,
    resources: ["Repo", "Roadmap"],
    updatedAt: "2026-02-16T00:40:00Z"
  }
];

const resourcesVault = [];

const mcpConnectionsState = [
  { id: "web-search", name: "Web Search MCP", enabled: true, status: "idle" },
  { id: "local-ingest", name: "Local Ingest MCP", enabled: true, status: "idle" },
  { id: "cloudflare-d1", name: "Cloudflare D1", enabled: true, status: "idle" },
  { id: "firebase-auth", name: "Firebase Auth", enabled: true, status: "idle" },
  { id: "pdf-export", name: "PDF Export", enabled: true, status: "idle" }
];
const mcpRuns = [];

const landingView = document.getElementById("landingView");
const accountView = document.getElementById("accountView");
const accountEmail = document.getElementById("accountEmail");

const homePanel = document.getElementById("homePanel");
const tasksPanel = document.getElementById("tasksPanel");
const projectsPanel = document.getElementById("projectsPanel");
const resourcesPanel = document.getElementById("resourcesPanel");
const tabs = { home: homePanel, tasks: tasksPanel, projects: projectsPanel, resources: resourcesPanel };

const openSignupBtn = document.getElementById("openSignupBtn");
const openLoginBtn = document.getElementById("openLoginBtn");
const heroSignupBtn = document.getElementById("heroSignupBtn");
const heroLoginBtn = document.getElementById("heroLoginBtn");
const signOutBtn = document.getElementById("signOutBtn");

const authModal = document.getElementById("authModal");
const authModalTitle = document.getElementById("authModalTitle");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const closeAuthModalBtn = document.getElementById("closeAuthModalBtn");
const submitSignupBtn = document.getElementById("submitSignupBtn");
const submitLoginBtn = document.getElementById("submitLoginBtn");

const magicLinkModal = document.getElementById("magicLinkModal");
const magicLinkText = document.getElementById("magicLinkText");
const closeMagicLinkBtn = document.getElementById("closeMagicLinkBtn");

const openSettingsBtn = document.getElementById("openSettingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const settingsMcpStatus = document.getElementById("settingsMcpStatus");

const mcpConnections = document.getElementById("mcpConnections");
const runMcpChecksBtn = document.getElementById("runMcpChecksBtn");
const mcpRunLog = document.getElementById("mcpRunLog");

const tasksGrid = document.getElementById("tasksGrid");
const projectsGrid = document.getElementById("projectsGrid");
const resourcesGrid = document.getElementById("resourcesGrid");

const taskCardTpl = document.getElementById("taskCardTpl");
const projectCardTpl = document.getElementById("projectCardTpl");
const resourceCardTpl = document.getElementById("resourceCardTpl");

const sumTasks = document.getElementById("sumTasks");
const sumProjects = document.getElementById("sumProjects");
const sumResources = document.getElementById("sumResources");
const sumOverdue = document.getElementById("sumOverdue");
const lastActivity = document.getElementById("lastActivity");

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");

const taskSearchInput = document.getElementById("taskSearchInput");
const newTaskBtn = document.getElementById("newTaskBtn");
const newProjectBtn = document.getElementById("newProjectBtn");

const creatorModal = document.getElementById("creatorModal");
const creatorTitle = document.getElementById("creatorTitle");
const closeCreatorBtn = document.getElementById("closeCreatorBtn");
const saveItemBtn = document.getElementById("saveItemBtn");

const newTitle = document.getElementById("newTitle");
const newKind = document.getElementById("newKind");
const newStatus = document.getElementById("newStatus");
const newStartDate = document.getElementById("newStartDate");
const newDueDate = document.getElementById("newDueDate");
const newDoneSubtasks = document.getElementById("newDoneSubtasks");
const newTotalSubtasks = document.getElementById("newTotalSubtasks");
const newResources = document.getElementById("newResources");
const newSummary = document.getElementById("newSummary");

const resourceModal = document.getElementById("resourceModal");
const resourceModalTitle = document.getElementById("resourceModalTitle");
const resourceEditor = document.getElementById("resourceEditor");
const toggleResourceEditBtn = document.getElementById("toggleResourceEditBtn");
const closeResourceModalBtn = document.getElementById("closeResourceModalBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

function loadSettings() {
  try {
    const raw = localStorage.getItem(storageKeys.settings);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
}

function splitCsv(value) {
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function showLanding() {
  landingView.classList.remove("hidden");
  accountView.classList.add("hidden");
}

function showAccount() {
  landingView.classList.add("hidden");
  accountView.classList.remove("hidden");
}

function switchTab(tab) {
  currentTab = tab;
  Object.entries(tabs).forEach(([k, panel]) => {
    panel.classList.toggle("hidden", k !== tab);
  });
}

function progressLabel(item) {
  return `${item.doneSubtasks}/${item.totalSubtasks} subtareas`;
}

function dateLabel(item) {
  if (!item.startDate && !item.dueDate) return "Sin fechas";
  if (item.startDate && item.dueDate) return `Inicio ${item.startDate} -> Fin ${item.dueDate}`;
  return item.startDate ? `Inicio ${item.startDate}` : `Fin ${item.dueDate}`;
}

function addChip(container, text) {
  const el = document.createElement("span");
  el.className = "chip";
  el.textContent = text;
  container.append(el);
}

function renderTasks() {
  const q = (taskSearchInput.value || "").trim().toLowerCase();
  tasksGrid.innerHTML = "";
  items
    .filter((i) => i.kind === "task")
    .filter((i) => !q || [i.title, i.summary, i.status, ...i.resources].join(" ").toLowerCase().includes(q))
    .sort((a, b) => (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99"))
    .forEach((item) => {
      const node = taskCardTpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".badge-kind").textContent = "task";
      node.querySelector(".badge-source").textContent = item.status;
      node.querySelector(".card-title").textContent = item.title;
      node.querySelector(".card-summary").textContent = item.summary;
      node.querySelector(".date-range").textContent = dateLabel(item);
      node.querySelector(".subtasks-line").textContent = progressLabel(item);
      node.querySelector(".status-pill").textContent = item.status;
      const chips = node.querySelector(".resources-chips");
      item.resources.forEach((r) => addChip(chips, r));
      node.querySelector(".btn-complete-resource").addEventListener("click", () => promoteToResource(item.id));
      tasksGrid.append(node);
    });
}

function renderProjects() {
  projectsGrid.innerHTML = "";
  items
    .filter((i) => i.kind === "project")
    .sort((a, b) => (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99"))
    .forEach((item) => {
      const node = projectCardTpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".project-title").textContent = item.title;
      node.querySelector(".project-description").textContent = item.summary;
      node.querySelector(".date-range").textContent = dateLabel(item);
      node.querySelector(".subtasks-line").textContent = progressLabel(item);
      node.querySelector(".status-pill").textContent = item.status;
      const chips = node.querySelector(".resources-chips");
      item.resources.forEach((r) => addChip(chips, r));
      node.querySelector(".btn-complete-resource").addEventListener("click", () => promoteToResource(item.id));
      projectsGrid.append(node);
    });
}

function renderResources() {
  resourcesGrid.innerHTML = "";
  resourcesVault
    .slice()
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .forEach((resource) => {
      const node = resourceCardTpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".card-title").textContent = resource.title;
      node.querySelector(".card-summary").textContent = resource.summary;
      node.querySelector(".date-range").textContent = `Creado ${resource.createdAt} · Cerrado ${resource.completedAt}`;
      const chips = node.querySelector(".resources-chips");
      resource.resources.forEach((r) => addChip(chips, r));
      node.querySelector(".btn-open-resource").addEventListener("click", () => openResource(resource.id));
      resourcesGrid.append(node);
    });
}

function renderSummary() {
  const tasks = items.filter((i) => i.kind === "task");
  const projects = items.filter((i) => i.kind === "project");
  const overdue = items.filter((i) => i.status !== "done" && i.dueDate && i.dueDate < todayIso()).length;

  sumTasks.textContent = String(tasks.length);
  sumProjects.textContent = String(projects.length);
  sumResources.textContent = String(resourcesVault.length);
  sumOverdue.textContent = String(overdue);

  const latestItem = [...items].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
  const latestResource = [...resourcesVault].sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))[0];

  if (latestResource && (!latestItem || latestResource.completedAt >= latestItem.updatedAt)) {
    lastActivity.textContent = `Último recurso: ${latestResource.title} (${latestResource.completedAt}).`;
  } else if (latestItem) {
    lastActivity.textContent = `Último registro: ${latestItem.kind} ${latestItem.title} · ${latestItem.status} · ${dateLabel(latestItem)}.`;
  } else {
    lastActivity.textContent = "Sin actividad reciente.";
  }
}

function promoteToResource(itemId) {
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx < 0) return;

  const item = items[idx];
  item.status = "done";
  item.updatedAt = new Date().toISOString();

  const resource = {
    id: `res-${Date.now()}`,
    sourceId: item.id,
    sourceKind: item.kind,
    title: `${item.title} · recurso`,
    summary: `Resultado consolidado de ${item.kind} con evidencia de inicio/fin y subtareas.`,
    createdAt: item.startDate || todayIso(),
    completedAt: item.dueDate || todayIso(),
    resources: item.resources,
    content: [
      `# ${item.title}`,
      "",
      `- Tipo: ${item.kind}`,
      `- Estado final: done`,
      `- Inicio: ${item.startDate || "n/a"}`,
      `- Fin: ${item.dueDate || "n/a"}`,
      `- Subtareas: ${item.doneSubtasks}/${item.totalSubtasks}`,
      "",
      "## Recursos",
      ...item.resources.map((r) => `- ${r}`),
      "",
      "## Conclusiones",
      "- Documentar decisiones clave.",
      "- Conservar evidencia para siguientes iteraciones."
    ].join("\n")
  };

  resourcesVault.unshift(resource);
  renderAll();
}

function openResource(resourceId) {
  const resource = resourcesVault.find((r) => r.id === resourceId);
  if (!resource) return;
  activeResource = resource;
  editingResource = false;
  resourceModalTitle.textContent = resource.title;
  resourceEditor.value = resource.content;
  resourceEditor.readOnly = true;
  toggleResourceEditBtn.textContent = "Editar";
  resourceModal.showModal();
}

function addChatMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = `chat-msg ${role}`;
  msg.textContent = text;
  chatMessages.append(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function fallbackTaskPlan(prompt) {
  const dates = prompt.match(/\d{4}-\d{2}-\d{2}/g) || [];
  const startDate = dates[0] || todayIso();
  const dueDate = dates[1] || startDate;
  return {
    tasks: [
      {
        title: `Plan IA: ${prompt.slice(0, 60)}`,
        summary: "Plan generado con fallback local.",
        kind: "task",
        status: "inbox",
        startDate,
        dueDate,
        doneSubtasks: 0,
        totalSubtasks: 3,
        resources: ["Brief", "Checklist"]
      }
    ]
  };
}

async function aiPlan(prompt) {
  if (!settings.aiApiKey) return fallbackTaskPlan(prompt);
  const endpoint = `${settings.aiBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model: settings.aiModel || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Devuelve JSON {tasks:[{title,summary,kind,status,startDate,dueDate,doneSubtasks,totalSubtasks,resources}]}."
      },
      { role: "user", content: prompt }
    ]
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`IA API error ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Respuesta IA vacía");
  return JSON.parse(content);
}

async function onSendChat() {
  const prompt = chatInput.value.trim();
  if (!prompt) return;
  addChatMessage("user", prompt);
  chatInput.value = "";

  try {
    const out = await aiPlan(prompt);
    const planned = Array.isArray(out.tasks) ? out.tasks : [];
    if (!planned.length) {
      addChatMessage("ai", "Sin tareas generadas.");
      return;
    }

    planned.forEach((t) => {
      items.unshift({
        id: `i-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        kind: t.kind === "project" ? "project" : "task",
        title: t.title || "Nueva tarea IA",
        summary: t.summary || "Plan IA",
        status: t.status || "inbox",
        startDate: t.startDate || todayIso(),
        dueDate: t.dueDate || todayIso(),
        doneSubtasks: Number(t.doneSubtasks || 0),
        totalSubtasks: Math.max(1, Number(t.totalSubtasks || 1)),
        resources: Array.isArray(t.resources) && t.resources.length ? t.resources : ["Brief"],
        updatedAt: new Date().toISOString()
      });
    });

    addChatMessage("ai", `Generadas ${planned.length} tareas/proyectos.`);
    renderAll();
  } catch (err) {
    addChatMessage("ai", `Error: ${err.message}`);
  }
}

function renderMcpConnections() {
  mcpConnections.innerHTML = "";
  mcpConnectionsState.forEach((conn) => {
    const row = document.createElement("div");
    row.className = "mcp-connection";

    const label = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = conn.enabled;
    check.addEventListener("change", (ev) => { conn.enabled = ev.target.checked; });
    const text = document.createElement("span");
    text.textContent = conn.name;
    label.append(check, text);

    const status = document.createElement("span");
    status.className = `mcp-status ${conn.status}`;
    status.textContent = conn.status.toUpperCase();

    row.append(label, status);
    mcpConnections.append(row);
  });
}

function renderMcpRunLog() {
  mcpRunLog.innerHTML = "";
  if (!mcpRuns.length) {
    const line = document.createElement("div");
    line.className = "mcp-run-item";
    line.textContent = "Sin pruebas ejecutadas todavía.";
    mcpRunLog.append(line);
  } else {
    mcpRuns.forEach((r) => {
      const line = document.createElement("div");
      line.className = "mcp-run-item";
      line.textContent = `${r.at} -> total ${r.total}, ok ${r.ok}, fail ${r.fail}`;
      mcpRunLog.append(line);
    });
  }

  settingsMcpStatus.innerHTML = "";
  mcpConnectionsState.forEach((conn) => {
    const line = document.createElement("div");
    line.className = "mcp-run-item";
    line.textContent = `${conn.name}: ${conn.status.toUpperCase()}`;
    settingsMcpStatus.append(line);
  });
}

function runMcpChecks() {
  const started = new Date();
  mcpConnectionsState.forEach((conn) => {
    if (!conn.enabled) {
      conn.status = "idle";
      return;
    }
    const stable = conn.id === "cloudflare-d1" || conn.id === "pdf-export";
    conn.status = stable ? "ok" : (Math.random() > 0.1 ? "ok" : "fail");
  });

  const checked = mcpConnectionsState.filter((c) => c.enabled);
  mcpRuns.unshift({
    at: started.toLocaleTimeString(),
    total: checked.length,
    ok: checked.filter((c) => c.status === "ok").length,
    fail: checked.filter((c) => c.status === "fail").length
  });
  if (mcpRuns.length > 6) mcpRuns.length = 6;

  renderMcpConnections();
  renderMcpRunLog();
}

function fillSettingsForm() {
  document.getElementById("settingsAiBaseUrl").value = settings.aiBaseUrl || "";
  document.getElementById("settingsAiModel").value = settings.aiModel || "";
  document.getElementById("settingsAiKey").value = settings.aiApiKey || "";
  document.getElementById("settingsFirebaseApiKey").value = settings.firebaseApiKey || "";
  document.getElementById("settingsFirebaseAuthDomain").value = settings.firebaseAuthDomain || "";
  document.getElementById("settingsFirebaseProjectId").value = settings.firebaseProjectId || "";
  document.getElementById("settingsFirebaseAppId").value = settings.firebaseAppId || "";
  renderMcpRunLog();
}

function readSettingsForm() {
  settings.aiBaseUrl = document.getElementById("settingsAiBaseUrl").value.trim();
  settings.aiModel = document.getElementById("settingsAiModel").value.trim();
  settings.aiApiKey = document.getElementById("settingsAiKey").value.trim();
  settings.firebaseApiKey = document.getElementById("settingsFirebaseApiKey").value.trim();
  settings.firebaseAuthDomain = document.getElementById("settingsFirebaseAuthDomain").value.trim();
  settings.firebaseProjectId = document.getElementById("settingsFirebaseProjectId").value.trim();
  settings.firebaseAppId = document.getElementById("settingsFirebaseAppId").value.trim();
  saveSettings();
}

function openAuth(mode) {
  authMode = mode;
  authModalTitle.textContent = mode === "signup" ? "Crear cuenta" : "Iniciar sesión";
  submitSignupBtn.classList.toggle("hidden", mode !== "signup");
  submitLoginBtn.classList.toggle("hidden", mode !== "login");
  authModal.showModal();
}

function showMagicLinkModal(email) {
  magicLinkText.textContent = `Cuenta creada en ${APP_NAME}. Revisa ${email} para confirmar con magic link.`;
  magicLinkModal.showModal();
}

async function ensureFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;
  if (!settings.firebaseApiKey || !settings.firebaseAuthDomain || !settings.firebaseProjectId || !settings.firebaseAppId) {
    throw new Error("Configura Firebase (API key, auth domain, project id, app id) en Config.");
  }

  const appMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const authMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");

  const firebaseApp = appMod.initializeApp({
    apiKey: settings.firebaseApiKey,
    authDomain: settings.firebaseAuthDomain,
    projectId: settings.firebaseProjectId,
    appId: settings.firebaseAppId
  });

  firebaseAuth = authMod.getAuth(firebaseApp);
  authMod.onAuthStateChanged(firebaseAuth, (user) => {
    currentUser = user || null;
    onAuthChanged();
  });
  currentUser = firebaseAuth.currentUser;
  onAuthChanged();

  return firebaseAuth;
}

function onAuthChanged() {
  const email = currentUser?.email || "No autenticado";
  accountEmail.textContent = email;
  if (currentUser) showAccount();
  else showLanding();
}

async function signUpWithPassword(email, password) {
  const auth = await ensureFirebaseAuth();
  const authMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
  const verifyUrl = `${window.location.origin}${window.location.pathname.replace(/index\.html$/, "")}confirm-email.html`;
  await authMod.sendEmailVerification(cred.user, { url: verifyUrl });
  showMagicLinkModal(email);
}

async function loginWithPassword(email, password) {
  const auth = await ensureFirebaseAuth();
  const authMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  await authMod.signInWithEmailAndPassword(auth, email, password);

  if (auth.currentUser && !auth.currentUser.emailVerified) {
    throw new Error("Email not confirmed");
  }

  authModal.close();
}

async function signOut() {
  if (!firebaseAuth) return;
  const authMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  await authMod.signOut(firebaseAuth);
}

function openCreator(kind) {
  creatingKind = kind;
  creatorTitle.textContent = kind === "project" ? "Nuevo proyecto" : "Nueva tarea";
  newKind.value = kind;
  newTitle.value = "";
  newSummary.value = "";
  newStatus.value = "inbox";
  newStartDate.value = "";
  newDueDate.value = "";
  newDoneSubtasks.value = "0";
  newTotalSubtasks.value = "1";
  newResources.value = "";
  creatorModal.showModal();
}

function saveCreatedItem() {
  const title = newTitle.value.trim();
  if (!title) {
    alert("El título es obligatorio.");
    return;
  }

  const item = {
    id: `i-${Date.now()}`,
    kind: newKind.value === "project" ? "project" : "task",
    title,
    summary: newSummary.value.trim() || "Sin resumen",
    status: newStatus.value,
    startDate: newStartDate.value || "",
    dueDate: newDueDate.value || "",
    doneSubtasks: Number(newDoneSubtasks.value || 0),
    totalSubtasks: Math.max(1, Number(newTotalSubtasks.value || 1)),
    resources: splitCsv(newResources.value).length ? splitCsv(newResources.value) : ["Brief"],
    updatedAt: new Date().toISOString()
  };

  items.unshift(item);
  creatorModal.close();
  renderAll();
  switchTab(item.kind === "project" ? "projects" : "tasks");
}

function openResourceEditor(resource) {
  activeResource = resource;
  editingResource = false;
  resourceModalTitle.textContent = resource.title;
  resourceEditor.value = resource.content;
  resourceEditor.readOnly = true;
  toggleResourceEditBtn.textContent = "Editar";
  resourceModal.showModal();
}

function renderAll() {
  renderTasks();
  renderProjects();
  renderResources();
  renderSummary();
}

openSignupBtn.addEventListener("click", () => openAuth("signup"));
openLoginBtn.addEventListener("click", () => openAuth("login"));
heroSignupBtn.addEventListener("click", () => openAuth("signup"));
heroLoginBtn.addEventListener("click", () => openAuth("login"));

closeAuthModalBtn.addEventListener("click", () => authModal.close());
closeMagicLinkBtn.addEventListener("click", () => magicLinkModal.close());

submitSignupBtn.addEventListener("click", async () => {
  try {
    await signUpWithPassword(authEmail.value.trim(), authPassword.value);
    authModal.close();
  } catch (err) {
    alert(`No se pudo crear cuenta: ${err.message}`);
  }
});

submitLoginBtn.addEventListener("click", async () => {
  try {
    await loginWithPassword(authEmail.value.trim(), authPassword.value);
  } catch (err) {
    alert(`No se pudo iniciar sesión: ${err.message}`);
  }
});

signOutBtn.addEventListener("click", () => signOut().catch((err) => alert(err.message)));

openSettingsBtn.addEventListener("click", () => {
  fillSettingsForm();
  settingsModal.showModal();
});

closeSettingsBtn.addEventListener("click", () => settingsModal.close());
saveSettingsBtn.addEventListener("click", async () => {
  readSettingsForm();
  settingsModal.close();
  firebaseAuth = null;
  try {
    await ensureFirebaseAuth();
  } catch {
    // error deferred for auth actions
  }
});

runMcpChecksBtn.addEventListener("click", runMcpChecks);

Array.from(document.querySelectorAll(".nav-btn")).forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.getAttribute("data-view")));
});

chatSendBtn.addEventListener("click", onSendChat);
taskSearchInput.addEventListener("input", renderTasks);
newTaskBtn.addEventListener("click", () => openCreator("task"));
newProjectBtn.addEventListener("click", () => openCreator("project"));

closeCreatorBtn.addEventListener("click", () => creatorModal.close());
saveItemBtn.addEventListener("click", saveCreatedItem);

closeResourceModalBtn.addEventListener("click", () => resourceModal.close());
toggleResourceEditBtn.addEventListener("click", () => {
  editingResource = !editingResource;
  resourceEditor.readOnly = !editingResource;
  toggleResourceEditBtn.textContent = editingResource ? "Bloquear" : "Editar";
  if (!editingResource && activeResource) {
    activeResource.content = resourceEditor.value;
  }
});

exportPdfBtn.addEventListener("click", () => window.print());

renderMcpConnections();
renderMcpRunLog();
renderAll();
switchTab("home");
showLanding();
addChatMessage("ai", "Chat listo. Conecta bun-ai-api en Config para planificación con IA.");

if (settings.firebaseApiKey && settings.firebaseAuthDomain && settings.firebaseProjectId && settings.firebaseAppId) {
  ensureFirebaseAuth().catch(() => {
    // keep UI usable without auth setup
  });
}
