import type { APIRoute } from "astro";
import { getAdminConfig, verifySessionCookie, ADMIN_COOKIE_NAME } from "../../../lib/admin-auth";
import { getTrialState, grantTrialCredits, resetTrialCredits } from "../../../lib/ai-trial";

function ensureAdmin(cookies: any) {
  const cfg = getAdminConfig();
  if (!cfg.secret) return { ok: false as const, status: 503, error: "Admin auth is not configured." };
  const session = cookies.get(ADMIN_COOKIE_NAME)?.value;
  const payload = verifySessionCookie(session, cfg.secret);
  if (!payload) return { ok: false as const, status: 401, error: "Unauthorized." };
  return { ok: true as const };
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const admin = ensureAdmin(cookies);
  if (!admin.ok) return new Response(JSON.stringify({ error: admin.error }), { status: admin.status });

  const url = new URL(request.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return new Response(JSON.stringify({ error: "email query param is required." }), { status: 400 });

  return new Response(JSON.stringify({ email, trial: getTrialState(email) }), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const admin = ensureAdmin(cookies);
  if (!admin.ok) return new Response(JSON.stringify({ error: admin.error }), { status: admin.status });

  let body: { email?: string; action?: "reset" | "grant"; amount?: number };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email) return new Response(JSON.stringify({ error: "email is required." }), { status: 400 });

  if (body.action === "reset") {
    const trial = resetTrialCredits(email, 1);
    return new Response(JSON.stringify({ ok: true, email, trial }), { status: 200 });
  }

  if (body.action === "grant") {
    const amount = Math.max(1, Number(body.amount || 1));
    const trial = grantTrialCredits(email, amount);
    return new Response(JSON.stringify({ ok: true, email, trial }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Unsupported action. Use reset or grant." }), { status: 400 });
};
