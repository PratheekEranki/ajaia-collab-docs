import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ApiError, readJson, route } from "@/lib/api";
import { BCRYPT_ROUNDS, signupSchema } from "@/lib/accounts";

// Self-service sign-up creates a PENDING account; an admin must approve it before it can sign in.
export const POST = route(async (req) => {
  const { name, email, password } = await readJson(req, signupSchema);
  const existing = await prisma.user.findUnique({ where: { email }, select: { status: true } });
  if (existing) {
    throw new ApiError(
      409,
      "CONFLICT",
      existing.status === "PENDING" ? "A request for this email is already waiting for approval." : "An account with this email already exists. Sign in instead.",
    );
  }
  await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), status: "PENDING" },
  });
  return NextResponse.json({ status: "PENDING" }, { status: 201 });
});
