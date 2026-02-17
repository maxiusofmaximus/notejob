import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "notejob_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  username: string;
  exp: number;
  nonce: string;
};

function getEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

export function getAdminConfig() {
  return {
    username: getEnv("NOTEJOB_ADMIN_USER"),
    password: getEnv("NOTEJOB_ADMIN_PASSWORD"),
    secret: getEnv("NOTEJOB_ADMIN_SESSION_SECRET")
  };
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionCookie(username: string, secret: string) {
  const payload: SessionPayload = {
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: randomBytes(12).toString("hex")
  };
  const rawPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(rawPayload, secret);
  return `${rawPayload}.${signature}`;
}

export function verifySessionCookie(cookieValue: string | undefined, secret: string): SessionPayload | null {
  if (!cookieValue || !secret) return null;
  const [payloadB64, signature] = cookieValue.split(".");
  if (!payloadB64 || !signature) return null;
  const expected = sign(payloadB64, secret);

  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
    if (!payload?.username || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieSecurityOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  };
}

export function parseCookieValueFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}
