// Read models shared by the dashboard page and GET /api/documents.
import { prisma } from "./db";
import { previewText } from "./content";
import { roleFor, type EffectiveRole } from "./permissions";

export type DocCard = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  role: EffectiveRole;
  ownerName: string;
  sharedCount: number;
};

export async function listDocs(userId: string, scope: "owned" | "shared"): Promise<DocCard[]> {
  const docs = await prisma.document.findMany({
    where: scope === "owned" ? { ownerId: userId } : { shares: { some: { userId } } },
    include: { shares: true, owner: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100, // ponytail: no pagination UI; 100 docs per tab is plenty for this scope
  });
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    preview: previewText(d.content),
    updatedAt: d.updatedAt.toISOString(),
    role: roleFor(d, userId)!,
    ownerName: d.owner.name,
    sharedCount: d.shares.length,
  }));
}

export async function countDocs(userId: string) {
  const [owned, shared] = await Promise.all([
    prisma.document.count({ where: { ownerId: userId } }),
    prisma.document.count({ where: { shares: { some: { userId } } } }),
  ]);
  return { owned, shared };
}
