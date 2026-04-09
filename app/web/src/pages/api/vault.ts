import type { APIRoute } from "astro";
import { d1Query } from "../../lib/d1-client";
import { requireUser } from "../../lib/api-helpers";

type VaultRow = {
  id: string;
  user_id: string;
  label: string;
  tags_json: string | null;
  cipher: string;
  iv: string;
  salt: string;
  created_at: string;
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

function normalizeRow(row: VaultRow) {
  return {
    id: row.id,
    label: row.label,
    tags: JSON.parse(row.tags_json || "[]"),
    cipher: row.cipher,
    iv: row.iv,
    salt: row.salt,
    createdAt: row.created_at
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

  const result = await d1Query<VaultRow>(
    `SELECT * FROM vault_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`,
    [user.uid]
  );

  return new Response(JSON.stringify({ entries: result.results.map(normalizeRow) }), {
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
  const id = String(body?.id || `vault-${Date.now()}`);
  const label = String(body?.label || "").trim();
  if (!label) return new Response(JSON.stringify({ error: "Label is required." }), { status: 400 });

  const tags = Array.isArray(body?.tags) ? body.tags : [];
  const now = new Date().toISOString();

  await d1Query(
    `INSERT INTO vault_entries (id, user_id, label, tags_json, cipher, iv, salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        tags_json = excluded.tags_json,
        cipher = excluded.cipher,
        iv = excluded.iv,
        salt = excluded.salt`,
    [
      id,
      user.uid,
      label,
      JSON.stringify(tags),
      String(body?.cipher || ""),
      String(body?.iv || ""),
      String(body?.salt || ""),
      now
    ]
  );

  return new Response(JSON.stringify({ ok: true, id, createdAt: now }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
};
