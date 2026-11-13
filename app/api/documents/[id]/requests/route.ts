import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

// A viewer asks the owner for edit access. One pending request per person per document.
export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "requestEdit");
  const existing = await prisma.accessRequest.findFirst({ where: { documentId: doc.id, userId: user.id, status: "PENDING" } });
  const request = existing ?? (await prisma.accessRequest.create({ data: { documentId: doc.id, userId: user.id } }));
  return NextResponse.json({ request: { id: request.id, status: request.status } }, { status: existing ? 200 : 201 });
});
