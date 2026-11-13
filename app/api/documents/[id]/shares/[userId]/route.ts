import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

export const DELETE = route<{ params: Promise<{ id: string; userId: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id, userId } = await params;
  await loadDoc(id, user.id, "manage");
  await prisma.documentShare.deleteMany({ where: { documentId: id, userId } });
  return new NextResponse(null, { status: 204 });
});
