import type { MiddlewareHandler } from "astro";
import { ADMIN_COOKIE_NAME, getAdminConfig, parseCookieValueFromHeader, verifySessionCookie } from "./lib/admin-auth";

export const onRequest: MiddlewareHandler = async ({ request, url }, next) => {
  const path = url.pathname;
  if (!path.startsWith("/admin")) return next();

  if (path.startsWith("/admin/login") || path.startsWith("/api/admin/login") || path.startsWith("/api/admin/session")) {
    return next();
  }

  const cfg = getAdminConfig();
  if (!cfg.secret) return next();

  const cookieHeader = request.headers.get("cookie");
  const raw = parseCookieValueFromHeader(cookieHeader, ADMIN_COOKIE_NAME);
  const session = verifySessionCookie(raw, cfg.secret);
  if (!session) {
    return Response.redirect(new URL("/admin/login", request.url), 302);
  }

  return next();
};
