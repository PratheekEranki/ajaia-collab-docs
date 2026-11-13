import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { invalid, readJson, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";
import { sanitize } from "@/lib/content";
import { snapshotIfDue } from "@/lib/versions";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc, role } = await loadDoc((await params).id, user.id, "read");
  return NextResponse.json({
    document: { id: doc.id, title: doc.title, content: doc.content, updatedAt: doc.updatedAt, owner: doc.owner },
    role,
  });
});

const patchSchema = z
  .object({
    title: z.string().trim().min(1, "Title can't be empty.").max(200, "Title must be 200 characters or fewer.").optional(),
    content: z.string().max(1_000_000, "Document is too large to save (1 MB of text max).").optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update.");

// Autosave target: editors and owners only.
export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await loadDoc(id, user.id, "edit");
  const input = await readJson(req, patchSchema);
  if (input.title === undefined && input.content === undefined) throw invalid("Nothing to update.");
  const doc = await prisma.document.update({
    where: { id },
    data: { title: input.title, content: input.content === undefined ? undefined : sanitize(input.content) },
    select: { id: true, title: true, content: true, updatedAt: true },
  });
  await snapshotIfDue(doc.id, doc.title, doc.content, user.id);
  return NextResponse.json({ document: { id: doc.id, title: doc.title, updatedAt: doc.updatedAt } });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await loadDoc(id, user.id, "manage");
  await prisma.document.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
});
