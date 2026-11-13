import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, invalid, readJson, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

// Everyone with access sees who else has access; only the owner gets link token, requests and the directory.
export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc, role } = await loadDoc((await params).id, user.id, "read");
  const isOwner = role === "OWNER";
  const [shares, requests, myRequest, directory] = await Promise.all([
    prisma.documentShare.findMany({
      where: { documentId: doc.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    isOwner
      ? prisma.accessRequest.findMany({
          where: { documentId: doc.id, status: "PENDING" },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        })
      : [],
    prisma.accessRequest.findFirst({ where: { documentId: doc.id, userId: user.id, status: "PENDING" }, select: { id: true } }),
    isOwner ? prisma.user.findMany({ where: { id: { not: doc.ownerId } }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : [],
  ]);
  return NextResponse.json({
    role,
    owner: doc.owner,
    people: shares.map((s) => ({ ...s.user, role: s.role })),
    link: { role: doc.linkRole, token: isOwner || doc.linkRole ? doc.linkToken : null },
    requests: requests.map((r) => ({ id: r.id, user: r.user, createdAt: r.createdAt })),
    hasPendingRequest: Boolean(myRequest),
    directory,
  });
});

const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["VIEWER", "EDITOR"]),
});

// Add a person or change their role. "Share by email" resolves to an existing account; no mail is sent (ADR-0006).
export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "manage");
  const { email, role } = await readJson(req, shareSchema);
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) throw new ApiError(404, "NOT_FOUND", `No account uses ${email}. Try alice@, bob@ or carol@ajaia.dev.`);
  if (target.id === doc.ownerId) throw invalid(`${target.name} owns this document already.`);
  await prisma.$transaction([
    prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: doc.id, userId: target.id } },
      update: { role },
      create: { documentId: doc.id, userId: target.id, role },
    }),
    // Granting edit directly answers any pending request from that person.
    ...(role === "EDITOR"
      ? [prisma.accessRequest.updateMany({ where: { documentId: doc.id, userId: target.id, status: "PENDING" }, data: { status: "APPROVED" } })]
      : []),
  ]);
  return NextResponse.json({ person: { id: target.id, name: target.name, email: target.email, role } });
});
