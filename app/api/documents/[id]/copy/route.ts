import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

// "Save as" → Make a copy (ADR-0005). Anyone who can read can copy; the copy is theirs.
export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "read");
  const copy = await prisma.document.create({
    data: { title: `Copy of ${doc.title}`.slice(0, 200), content: doc.content, ownerId: user.id },
    select: { id: true, title: true },
  });
  return NextResponse.json({ document: copy }, { status: 201 });
});
