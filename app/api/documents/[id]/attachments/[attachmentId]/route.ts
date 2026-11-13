import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notFound, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

// Download. Always served as an attachment with nosniff, so an uploaded file can never run in our origin.
export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id, attachmentId } = await params;
  await loadDoc(id, user.id, "read");
  const file = await prisma.attachment.findFirst({ where: { id: attachmentId, documentId: id } });
  if (!file) throw notFound("Attachment");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename="${file.filename.replace(/["\\\r\n]/g, "_")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id, attachmentId } = await params;
  await loadDoc(id, user.id, "edit");
  const { count } = await prisma.attachment.deleteMany({ where: { id: attachmentId, documentId: id } });
  if (!count) throw notFound("Attachment");
  return new NextResponse(null, { status: 204 });
});
