import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, invalid, requireUser, route } from "@/lib/api";
import { IMPORT_TYPES, MAX_UPLOAD_BYTES, extensionOf, fileToHtml, titleFromFilename } from "@/lib/content";

// Upload .txt / .md / .docx (≤ 2 MB) → a new document owned by the uploader (ADR-0007).
export const POST = route(async (req) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw invalid("Choose a file to import.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, "TOO_LARGE", `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`);
  }
  if (!IMPORT_TYPES.includes(extensionOf(file.name) as (typeof IMPORT_TYPES)[number])) {
    throw new ApiError(415, "UNSUPPORTED_TYPE", `${file.name} can't be imported. Upload a .txt, .md or .docx file.`);
  }

  let content: string;
  try {
    content = await fileToHtml(file.name, Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new ApiError(415, "UNSUPPORTED_TYPE", `We couldn't read ${file.name}. Check that it isn't corrupted or password-protected.`);
  }

  const doc = await prisma.document.create({
    data: { title: titleFromFilename(file.name), content, ownerId: user.id },
    select: { id: true, title: true },
  });
  return NextResponse.json({ document: doc }, { status: 201 });
});
