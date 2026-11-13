import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ApiError, readJson, route } from "@/lib/api";
import { endSession, startSession } from "@/lib/session";
import { signinSchema } from "@/lib/accounts";

// Email + password sign-in (ADR-0008). One generic message for wrong email or password,
// so the form doesn't reveal which emails have accounts.
export const POST = route(async (req) => {
  const { email, password } = await readJson(req, signinSchema);
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "PENDING_APPROVAL", "Your account is waiting for an admin to approve it. Try again once you hear back.");
  }
  await startSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
});

export const DELETE = route(async () => {
  await endSession();
  return new NextResponse(null, { status: 204 });
});
