import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ApiError, readJson, requireAdmin, route } from "@/lib/api";
import { BCRYPT_ROUNDS, adminCreateSchema } from "@/lib/accounts";

const publicFields = { id: true, name: true, email: true, isAdmin: true, status: true, createdAt: true } as const;

export const GET = route(async () => {
  await requireAdmin();
  const users = await prisma.user.findMany({ select: publicFields, orderBy: [{ status: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ users });
});

// Admin creates an account directly; it is active immediately.
export const POST = route(async (req) => {
  await requireAdmin();
  const { name, email, password, isAdmin } = await readJson(req, adminCreateSchema);
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new ApiError(409, "CONFLICT", "An account with this email already exists.");
  }
  const user = await prisma.user.create({
    data: { name, email, isAdmin: Boolean(isAdmin), status: "ACTIVE", passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
    select: publicFields,
  });
  return NextResponse.json({ user }, { status: 201 });
});
