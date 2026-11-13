import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notFound, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

// Restore = editors and owners. The current state is snapshotted first, so a restore can itself be undone.
export const POST = route<{ params: Promise<{ id: string; versionId: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id, versionId } = await params;
  const { doc } = await loadDoc(id, user.id, "edit");
  const version = await prisma.documentVersion.findFirst({ where: { id: versionId, documentId: id } });
  if (!version) throw notFound("Version");
  await prisma.$transaction([
    prisma.documentVersion.create({ data: { documentId: id, title: doc.title, content: doc.content, authorId: user.id } }),
    prisma.document.update({ where: { id }, data: { title: version.title, content: version.content } }),
  ]);
  return NextResponse.json({ restored: { id: version.id, createdAt: version.createdAt } });
});
