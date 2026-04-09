import type { APIRoute } from "astro";
import { consumeTrialCredit, getTrialState } from "../../../lib/ai-trial";
import { requireUser } from "../../../lib/api-helpers";

type AiPlanRequest = {
  prompt?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  email?: string;
};

type ProviderCandidate = {
  name: string;
  baseUrl: string;
  apiKey: string;
};

type PlannedTask = {
  title: string;
  summary: string;
  kind: "task" | "project";
  status: string;
  startDate: string;
  dueDate: string;
  doneSubtasks: number;
  totalSubtasks: number;
  resources: string[];
};

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pick(...values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function normalizeTask(raw: any): PlannedTask {
  const resources = Array.isArray(raw?.resources)
    ? raw.resources.map((x: unknown) => String(x)).filter(Boolean)
    : typeof raw?.resources === "string"
      ? raw.resources.split(",").map((x: string) => x.trim()).filter(Boolean)
      : [];

  return {
    title: String(raw?.title || "AI generated item"),
    summary: String(raw?.summary || ""),
    kind: raw?.kind === "project" ? "project" : "task",
    status: String(raw?.status || "inbox"),
    startDate: String(raw?.startDate || ""),
    dueDate: String(raw?.dueDate || ""),
    doneSubtasks: Number(raw?.doneSubtasks || 0),
    totalSubtasks: Math.max(1, Number(raw?.totalSubtasks || 1)),
    resources
  };
}

function extractJsonBlock(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return "";
}

function extractTasks(parsed: any, content: string, prompt: string) {
  const candidates = [
    parsed?.tasks,
    parsed?.items,
    parsed?.plan?.tasks,
    parsed?.result?.tasks,
    parsed?.data?.tasks,
    parsed?.backlog
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) {
      return candidate.map(normalizeTask);
    }
  }

  const checklist = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+(\[[ xX]\]\s+)?/.test(line))
    .slice(0, 8)
    .map((line, index) =>
      normalizeTask({
        title: line.replace(/^[-*]\s+(\[[ xX]\]\s+)?/, "").slice(0, 120),
        summary: "Generated from AI plan text.",
        kind: index === 0 ? "project" : "task",
        status: "inbox",
        startDate: dateOffset(0),
        dueDate: dateOffset(7 + index * 3),
        doneSubtasks: 0,
        totalSubtasks: 1,
        resources: ["AI"]
      })
    );
  if (checklist.length) return checklist;

  const titleSeed = prompt
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return [
    normalizeTask({
      title: titleSeed || "AI generated project",
      summary: "Fallback task created because the model did not return structured tasks.",
      kind: "project",
      status: "inbox",
      startDate: dateOffset(0),
      dueDate: dateOffset(14),
      doneSubtasks: 0,
      totalSubtasks: 3,
      resources: ["AI", "Fallback"]
    })
  ];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    await requireUser(request);
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "missing-auth") {
      return new Response(JSON.stringify({ error: "Missing auth token." }), { status: 401 });
    }
    if (message === "firebase-admin-not-configured") {
      return new Response(JSON.stringify({ error: "Firebase admin not configured." }), { status: 503 });
    }
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
  }

  let body: AiPlanRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), { status: 400 });
  }

  const prompt = (body.prompt || "").trim();
  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required." }), { status: 400 });
  }

  const baseUrl = pick(body.baseUrl, process.env.NOTEJOB_AI_BASE_URL, process.env.AI_BASE_URL, "https://api.openai.com/v1").replace(/\/$/, "");
  const model = pick(body.model, process.env.NOTEJOB_AI_MODEL, process.env.AI_MODEL, "gpt-4o-mini");
  const userApiKey = pick(body.apiKey);

  // BYOK priority: if user sends their own key, no trial credit is consumed.
  // Trial mode: if no user key, consume one trial credit from shared-key pool.
  let trialState = null;
  const providers: ProviderCandidate[] = [];
  if (!userApiKey) {
    const email = (body.email || "").trim().toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required to use trial mode." }), { status: 400 });
    }
    const consume = consumeTrialCredit(email);
    if (!consume.ok) {
      return new Response(
        JSON.stringify({
          error: "No trial credits remaining. Add your own API key in Settings or contact admin.",
          trial: consume.state
        }),
        { status: 402 }
      );
    }
    trialState = consume.state;
    const cerebrasKey = pick(process.env.CEREBRAS_TRIAL_API_KEY, process.env.NOTEJOB_AI_API_KEY, process.env.AI_API_KEY);
    const cerebrasBaseUrl = pick(process.env.CEREBRAS_BASE_URL, "https://api.cerebras.ai/v1").replace(/\/$/, "");
    const groqKey = pick(process.env.GROQ_TRIAL_API_KEY, process.env.GROQ_API_KEY);
    const groqBaseUrl = pick(process.env.GROQ_BASE_URL, "https://api.groq.com/openai/v1").replace(/\/$/, "");

    if (cerebrasKey) providers.push({ name: "cerebras", baseUrl: cerebrasBaseUrl, apiKey: cerebrasKey });
    if (groqKey) providers.push({ name: "groq", baseUrl: groqBaseUrl, apiKey: groqKey });
  } else if (body.email) {
    trialState = getTrialState(body.email) || null;
    providers.push({ name: "byok", baseUrl, apiKey: userApiKey });
  } else {
    providers.push({ name: "byok", baseUrl, apiKey: userApiKey });
  }

  if (providers.length === 0) {
    return new Response(JSON.stringify({ error: "No AI providers configured on server." }), { status: 503 });
  }

  const providerErrors: Array<{ provider: string; status: number; details: string }> = [];
  let content = "";
  let providerUsed = "";

  for (const provider of providers) {
    const providerRes = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return JSON {tasks:[{title,summary,kind,status,startDate,dueDate,doneSubtasks,totalSubtasks,resources}]}"
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!providerRes.ok) {
      const details = await providerRes.text();
      providerErrors.push({
        provider: provider.name,
        status: providerRes.status,
        details: details.slice(0, 300)
      });
      continue;
    }

    const providerData = await providerRes.json().catch(() => null);
    const maybeContent = providerData?.choices?.[0]?.message?.content;
    if (maybeContent) {
      content = maybeContent;
      providerUsed = provider.name;
      break;
    }
    providerErrors.push({
      provider: provider.name,
      status: 502,
      details: "Missing choices[0].message.content"
    });
  }

  if (!content) {
    return new Response(
      JSON.stringify({
        error: "All AI providers failed.",
        providersTried: providers.map((p) => p.name),
        failures: providerErrors
      }),
      { status: 502 }
    );
  }

  let parsed: any = {};
  try {
    const jsonBlock = extractJsonBlock(content);
    if (jsonBlock) {
      parsed = JSON.parse(jsonBlock);
    }
  } catch {
    parsed = {};
  }

  const tasks = extractTasks(parsed, content, prompt);
  return new Response(JSON.stringify({ tasks, trial: trialState, provider: providerUsed }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
};
