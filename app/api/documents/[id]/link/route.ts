import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson, requireUser, route } from "@/lib/api";
import { loadDoc } from "@/lib/access";

// Link sharing: off (null), view, or edit. Owner only.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDoc((await params).id, user.id, "manage");
  const { role } = await readJson(req, z.object({ role: z.enum(["VIEWER", "EDITOR"]).nullable() }));
  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: { linkRole: role },
    select: { linkRole: true, linkToken: true },
  });
  return NextResponse.json({ link: { role: updated.linkRole, token: updated.linkToken } });
});
