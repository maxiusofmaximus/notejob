import type { APIRoute } from "astro";
import { consumeTrialCredit, getTrialState } from "../../../lib/ai-trial";

type AiPlanRequest = {
  prompt?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  email?: string;
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

export const POST: APIRoute = async ({ request }) => {
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

  const baseUrl = pick(
    body.baseUrl,
    process.env.NOTEJOB_AI_BASE_URL,
    process.env.AI_BASE_URL,
    process.env.PUBLIC_AI_BASE_URL,
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = pick(body.model, process.env.NOTEJOB_AI_MODEL, process.env.AI_MODEL, process.env.PUBLIC_AI_MODEL, "gpt-4o-mini");
  const userApiKey = pick(body.apiKey);
  const fallbackTrialApiKey = pick(process.env.CEREBRAS_TRIAL_API_KEY, process.env.NOTEJOB_AI_API_KEY, process.env.AI_API_KEY, process.env.OPENAI_API_KEY);
  const apiKey = pick(
    userApiKey,
    fallbackTrialApiKey
  );

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI API key is missing on server." }), { status: 503 });
  }

  // BYOK priority: if user sends their own key, no trial credit is consumed.
  // Trial mode: if no user key, consume one trial credit from shared-key pool.
  let trialState = null;
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
  } else if (body.email) {
    trialState = getTrialState(body.email) || null;
  }

  const providerRes = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
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
    return new Response(
      JSON.stringify({
        error: "AI provider request failed.",
        status: providerRes.status,
        details: details.slice(0, 800)
      }),
      { status: 502 }
    );
  }

  const providerData = await providerRes.json().catch(() => null);
  const content = providerData?.choices?.[0]?.message?.content;
  if (!content) {
    return new Response(JSON.stringify({ tasks: [] }), { status: 200 });
  }

  let parsed: { tasks?: unknown[] } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    return new Response(JSON.stringify({ error: "AI provider returned invalid JSON content." }), { status: 502 });
  }

  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : [];
  return new Response(JSON.stringify({ tasks, trial: trialState }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
};
