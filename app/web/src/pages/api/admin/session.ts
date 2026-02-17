import type { APIRoute } from "astro";
import { ADMIN_COOKIE_NAME, getAdminConfig, verifySessionCookie } from "../../../lib/admin-auth";

export const GET: APIRoute = async ({ cookies }) => {
  const cfg = getAdminConfig();
  if (!cfg.secret) {
    return new Response(JSON.stringify({ authenticated: false, reason: "missing-server-config" }), { status: 200 });
  }

  const session = cookies.get(ADMIN_COOKIE_NAME)?.value;
  const payload = verifySessionCookie(session, cfg.secret);
  if (!payload) return new Response(JSON.stringify({ authenticated: false }), { status: 200 });

  return new Response(JSON.stringify({ authenticated: true, username: payload.username }), { status: 200 });
};
