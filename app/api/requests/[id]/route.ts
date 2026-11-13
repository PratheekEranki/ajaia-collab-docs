import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, notFound, readJson, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

// Owner approves (→ Editor) or denies an access request.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const { decision } = await readJson(req, z.object({ decision: z.enum(["APPROVE", "DENY"]) }));
  const request = await prisma.accessRequest.findUnique({ where: { id: (await params).id } });
  if (!request) throw notFound("Request");
  await loadDoc(request.documentId, user.id, "manage");
  if (request.status !== "PENDING") throw new ApiError(409, "CONFLICT", "This request was already resolved.");

  if (decision === "APPROVE") {
    await prisma.$transaction([
      prisma.documentShare.upsert({
        where: { documentId_userId: { documentId: request.documentId, userId: request.userId } },
        update: { role: "EDITOR" },
        create: { documentId: request.documentId, userId: request.userId, role: "EDITOR" },
      }),
      prisma.accessRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } }),
    ]);
  } else {
    await prisma.accessRequest.update({ where: { id: request.id }, data: { status: "DENIED" } });
  }
  return NextResponse.json({ request: { id: request.id, status: decision === "APPROVE" ? "APPROVED" : "DENIED" } });
});
