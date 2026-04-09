import { getFirebaseAdminAuth } from "./firebase-admin";

export type ApiUser = { uid: string; email?: string | null };

export async function requireUser(request: Request): Promise<ApiUser> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new Error("missing-auth");
  }

  const auth = getFirebaseAdminAuth();
  if (!auth) {
    throw new Error("firebase-admin-not-configured");
  }

  const decoded = await auth.verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email };
}
