import type { APIRoute } from "astro";
import { ADMIN_COOKIE_NAME, cookieSecurityOptions, createSessionCookie, getAdminConfig } from "../../../lib/admin-auth";

const attemptsByIp = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const slot = attemptsByIp.get(ip);
  if (!slot || now - slot.windowStart > WINDOW_MS) {
    attemptsByIp.set(ip, { count: 0, windowStart: now });
    return false;
  }
  return slot.count >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string, failed: boolean) {
  const now = Date.now();
  const slot = attemptsByIp.get(ip);
  if (!slot || now - slot.windowStart > WINDOW_MS) {
    attemptsByIp.set(ip, { count: failed ? 1 : 0, windowStart: now });
    return;
  }
  if (failed) slot.count += 1;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many attempts. Try again later." }), { status: 429 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        recordAttempt(ip, true);
        return new Response(JSON.stringify({ error: "Invalid origin." }), { status: 403 });
      }
    } catch {
      recordAttempt(ip, true);
      return new Response(JSON.stringify({ error: "Invalid origin." }), { status: 403 });
    }
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    recordAttempt(ip, true);
    return new Response(JSON.stringify({ error: "Invalid payload." }), { status: 400 });
  }

  const config = getAdminConfig();
  if (!config.username || !config.password || !config.secret) {
    return new Response(JSON.stringify({ error: "Admin auth is not configured on server." }), { status: 503 });
  }

  if (body.username !== config.username || body.password !== config.password) {
    recordAttempt(ip, true);
    return new Response(JSON.stringify({ error: "Invalid credentials." }), { status: 401 });
  }

  const session = createSessionCookie(config.username, config.secret);
  cookies.set(ADMIN_COOKIE_NAME, session, cookieSecurityOptions());
  recordAttempt(ip, false);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
