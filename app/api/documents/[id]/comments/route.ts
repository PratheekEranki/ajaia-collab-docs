import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { invalid, readJson, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };
const fields = { id: true, body: true, quote: true, resolved: true, createdAt: true, author: { select: { id: true, name: true } } } as const;

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "read");
  const comments = await prisma.comment.findMany({ where: { documentId: doc.id }, orderBy: { createdAt: "asc" }, select: fields });
  return NextResponse.json({ comments });
});

const createSchema = z.object({
  body: z.string().trim().min(1, "Write a comment first.").max(2000, "Comments can be up to 2,000 characters."),
  quote: z.string().trim().max(300).optional(),
});

// Anyone with access can comment, viewers included (like a "commenter" in Google Docs).
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "read");
  const { body, quote } = await readJson(req, createSchema);
  if ((await prisma.comment.count({ where: { documentId: doc.id } })) >= 500) throw invalid("This document has too many comments.");
  const comment = await prisma.comment.create({ data: { documentId: doc.id, authorId: user.id, body, quote: quote || null }, select: fields });
  return NextResponse.json({ comment }, { status: 201 });
});
