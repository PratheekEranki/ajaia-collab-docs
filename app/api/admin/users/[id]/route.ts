import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, invalid, notFound, readJson, requireAdmin, route } from "@/lib/api";

const actionSchema = z.object({ action: z.enum(["approve", "deny", "makeAdmin", "removeAdmin"]) });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { action } = await readJson(req, actionSchema);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound("Account");

  switch (action) {
    case "approve":
      if (target.status !== "PENDING") throw new ApiError(409, "CONFLICT", "This account is already active.");
      await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
      break;
    case "deny":
      // Denied requests are removed so the person can apply again later.
      if (target.status !== "PENDING") throw new ApiError(409, "CONFLICT", "Only pending requests can be denied.");
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ user: { id, status: "DENIED" } });
    case "makeAdmin":
      if (target.status !== "ACTIVE") throw invalid("Approve the account before making it an admin.");
      await prisma.user.update({ where: { id }, data: { isAdmin: true } });
      break;
    case "removeAdmin":
      if (target.id === admin.id) throw invalid("You can't remove your own admin access.");
      await prisma.user.update({ where: { id }, data: { isAdmin: false } });
      break;
  }
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, isAdmin: true, status: true } });
  return NextResponse.json({ user });
});
