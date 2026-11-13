import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson, requireUser, route } from "@/lib/api";
import { listDocs } from "@/lib/documents";

export const GET = route(async (req) => {
  const user = await requireUser();
  const scope = new URL(req.url).searchParams.get("scope") === "shared" ? "shared" : "owned";
  return NextResponse.json({ documents: await listDocs(user.id, scope) });
});

const createSchema = z.object({
  title: z.string().trim().min(1, "Title can't be empty.").max(200, "Title must be 200 characters or fewer.").optional(),
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const { title } = await readJson(req, createSchema);
  const doc = await prisma.document.create({
    data: { title: title ?? "Untitled document", ownerId: user.id },
    select: { id: true, title: true },
  });
  return NextResponse.json({ document: doc }, { status: 201 });
});
