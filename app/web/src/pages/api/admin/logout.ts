import type { APIRoute } from "astro";
import { ADMIN_COOKIE_NAME, cookieSecurityOptions } from "../../../lib/admin-auth";

export const POST: APIRoute = async ({ cookies }) => {
  cookies.set(ADMIN_COOKIE_NAME, "", { ...cookieSecurityOptions(), maxAge: 0 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
