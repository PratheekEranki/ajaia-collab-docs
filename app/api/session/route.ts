import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound, readJson, route } from "@/lib/api";
import { endSession, startSession } from "@/lib/session";

// Demo sign-in: pick a seeded user (ADR-0004).
export const POST = route(async (req) => {
  const { userId } = await readJson(req, z.object({ userId: z.string().min(1) }));
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User");
  await startSession(user.id);
  return NextResponse.json({ user });
});

export const DELETE = route(async () => {
  await endSession();
  return new NextResponse(null, { status: 204 });
});
