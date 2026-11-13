import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, invalid, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";
import { MAX_UPLOAD_BYTES, isAllowedAttachment } from "@/lib/content";

type Ctx = { params: Promise<{ id: string }> };
const listFields = { id: true, filename: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { name: true } } } as const;

// Anyone who can read the document can see and download its attachments.
export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "read");
  const attachments = await prisma.attachment.findMany({ where: { documentId: doc.id }, select: listFields, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ attachments });
});

// Editors and owners can attach files (≤ 2 MB, allowlisted types).
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "edit");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw invalid("Choose a file to attach.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, "TOO_LARGE", `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`);
  }
  if (!isAllowedAttachment(file.name)) {
    throw new ApiError(415, "UNSUPPORTED_TYPE", `${file.name} isn't an allowed type. Attach PDF, Office, text, CSV, image or ZIP files.`);
  }
  const count = await prisma.attachment.count({ where: { documentId: doc.id } });
  if (count >= 20) throw invalid("A document can have up to 20 attachments. Remove one first.");

  const attachment = await prisma.attachment.create({
    data: {
      documentId: doc.id,
      filename: file.name.slice(0, 200),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
      uploadedById: user.id,
    },
    select: listFields,
  });
  return NextResponse.json({ attachment }, { status: 201 });
});
