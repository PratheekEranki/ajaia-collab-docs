// Version history (ADR-0009). Autosave fires every ~800 ms, so snapshots are throttled:
// at most one per document per 2 minutes, which keeps history readable and storage small.
import { prisma } from "./db";

export const SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000;

export function snapshotDue(lastAt: Date | null, now = new Date()): boolean {
  return !lastAt || now.getTime() - lastAt.getTime() >= SNAPSHOT_INTERVAL_MS;
}

export async function snapshotIfDue(documentId: string, title: string, content: string, authorId: string) {
  const last = await prisma.documentVersion.findFirst({ where: { documentId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (snapshotDue(last?.createdAt ?? null)) {
    await prisma.documentVersion.create({ data: { documentId, title, content, authorId } });
  }
}
