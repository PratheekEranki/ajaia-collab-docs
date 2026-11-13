import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { forbidden, notFound, readJson, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";
import { can } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

async function load(ctx: Ctx) {
  const user = await requireUser();
  const { id, commentId } = await ctx.params;
  const { role } = await loadDoc(id, user.id, "read");
  const comment = await prisma.comment.findFirst({ where: { id: commentId, documentId: id } });
  if (!comment) throw notFound("Comment");
  return { user, role, comment };
}

// Resolve / reopen: the comment's author, or anyone who can edit the document.
export const PATCH = route<Ctx>(async (req, ctx) => {
  const { user, role, comment } = await load(ctx);
  if (comment.authorId !== user.id && !can(role, "edit")) throw forbidden("Only editors or the comment's author can resolve it.");
  const { resolved } = await readJson(req, z.object({ resolved: z.boolean() }));
  await prisma.comment.update({ where: { id: comment.id }, data: { resolved } });
  return NextResponse.json({ comment: { id: comment.id, resolved } });
});

// Delete: the comment's author or the document owner.
export const DELETE = route<Ctx>(async (_req, ctx) => {
  const { user, role, comment } = await load(ctx);
  if (comment.authorId !== user.id && role !== "OWNER") throw forbidden("Only the author or the document owner can delete a comment.");
  await prisma.comment.delete({ where: { id: comment.id } });
  return new NextResponse(null, { status: 204 });
});
