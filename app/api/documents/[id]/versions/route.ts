import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";
import { previewText } from "@/lib/content";

// Anyone who can read a document can browse its history.
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "read");
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: doc.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, content: true, createdAt: true, author: { select: { name: true } } },
  });
  return NextResponse.json({
    versions: versions.map((v) => ({ id: v.id, title: v.title, preview: previewText(v.content, 120), createdAt: v.createdAt, author: v.author })),
  });
});
