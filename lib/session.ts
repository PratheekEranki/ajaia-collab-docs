// Demo sign-in (ADR-0004): the cookie holds a user id + HMAC signature, so it can't be
// edited to impersonate someone without the server secret.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE = "ajaia_session";

function key(): Buffer {
  // ponytail: falls back to a hash of DATABASE_URL so a deploy works with only the
  // Neon integration's env vars. Set SESSION_SECRET explicitly for anything beyond a demo.
  const material = process.env.SESSION_SECRET || process.env.DATABASE_URL;
  if (!material) throw new Error("SESSION_SECRET or DATABASE_URL must be set");
  return crypto.createHash("sha256").update(`ajaia-session:${material}`).digest();
}

export function signSession(userId: string): string {
  const sig = crypto.createHmac("sha256", key()).update(userId).digest("base64url");
  return `${userId}.${sig}`;
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const expected = Buffer.from(signSession(token.slice(0, dot)));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? token.slice(0, dot) : null;
}

export async function getCurrentUser() {
  const id = verifySession((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, isAdmin: true, status: true },
  });
  // A pending account (or one deleted by an admin) has no session.
  return user?.status === "ACTIVE" ? user : null;
}

export async function startSession(userId: string) {
  (await cookies()).set(COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
