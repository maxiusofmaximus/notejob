import type { APIRoute } from "astro";
import { d1Query } from "../../lib/d1-client";
import { requireUser } from "../../lib/api-helpers";

type ItemRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  summary: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  done_subtasks: number;
  total_subtasks: number;
  resources_json: string | null;
  tags_json: string | null;
  created_at: string;
  updated_at: string;
};

async function ensureUserRow(user: { uid: string; email?: string | null }) {
  await d1Query(
    `INSERT INTO users (id, email, created_at, updated_at)
     VALUES (?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       updated_at = datetime('now')`,
    [user.uid, user.email || null]
  );
}

function normalizeRow(row: ItemRow) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    status: row.status,
    startDate: row.start_date || "",
    dueDate: row.due_date || "",
    doneSubtasks: row.done_subtasks,
    totalSubtasks: row.total_subtasks,
    resources: JSON.parse(row.resources_json || "[]"),
    tags: JSON.parse(row.tags_json || "[]"),
    updatedAt: row.updated_at
  };
}

function handleAuthError(error: unknown) {
  const message = String((error as Error)?.message || "");
  if (message === "missing-auth") return new Response(JSON.stringify({ error: "Missing auth token." }), { status: 401 });
  if (message === "firebase-admin-not-configured") {
    return new Response(JSON.stringify({ error: "Firebase admin not configured." }), { status: 503 });
  }
  return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
}

export const GET: APIRoute = async ({ request }) => {
  let user;
  try {
    user = await requireUser(request);
  } catch (error) {
    return handleAuthError(error);
  }

  const result = await d1Query<ItemRow>(
    `SELECT * FROM items WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200`,
    [user.uid]
  );

  return new Response(JSON.stringify({ items: result.results.map(normalizeRow) }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
};

export const POST: APIRoute = async ({ request }) => {
  let user;
  try {
    user = await requireUser(request);
  } catch (error) {
    return handleAuthError(error);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), { status: 400 });
  }

  await ensureUserRow(user);
  const id = String(body?.id || `i-${Date.now()}`);
  const now = new Date().toISOString();
  const resources = Array.isArray(body?.resources) ? body.resources : [];
  const tags = Array.isArray(body?.tags) ? body.tags : [];

  await d1Query(
    `INSERT INTO items
      (id, user_id, kind, title, summary, status, start_date, due_date, done_subtasks, total_subtasks, resources_json, tags_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind = excluded.kind,
        title = excluded.title,
        summary = excluded.summary,
        status = excluded.status,
        start_date = excluded.start_date,
        due_date = excluded.due_date,
        done_subtasks = excluded.done_subtasks,
        total_subtasks = excluded.total_subtasks,
        resources_json = excluded.resources_json,
        tags_json = excluded.tags_json,
        updated_at = excluded.updated_at`,
    [
      id,
      user.uid,
      String(body?.kind || "task"),
      String(body?.title || "Untitled"),
      String(body?.summary || ""),
      String(body?.status || "inbox"),
      body?.startDate || "",
      body?.dueDate || "",
      Number(body?.doneSubtasks || 0),
      Math.max(1, Number(body?.totalSubtasks || 1)),
      JSON.stringify(resources),
      JSON.stringify(tags),
      now,
      now
    ]
  );

  return new Response(JSON.stringify({ ok: true, id, updatedAt: now }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
};
