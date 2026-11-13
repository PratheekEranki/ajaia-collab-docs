import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { maxShareRole } from "@/lib/permissions";
import { Brand } from "@/components/ui";

export const dynamic = "force-dynamic";

// Link redemption (ADR-0006): signed-in visitors get the link's role, never a downgrade, never ownership.
export default async function ShareLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/?next=${encodeURIComponent(`/share/${token}`)}`);

  const doc = await prisma.document.findUnique({ where: { linkToken: token }, include: { shares: true } });
  if (!doc || !doc.linkRole) {
    return (
      <>
        <header className="topbar">
          <Brand />
        </header>
        <main className="page" style={{ maxWidth: 560 }}>
          <div className="empty">
            <p style={{ fontSize: 17, fontWeight: 600 }}>This link isn&apos;t active</p>
            <p className="muted">The owner turned link sharing off, or the document was deleted. Ask them to share it with you directly.</p>
            <Link href="/" className="btn">
              Back to documents
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (doc.ownerId !== user.id) {
    const existing = doc.shares.find((s) => s.userId === user.id)?.role ?? null;
    const role = maxShareRole(existing, doc.linkRole);
    if (role !== existing) {
      await prisma.documentShare.upsert({
        where: { documentId_userId: { documentId: doc.id, userId: user.id } },
        update: { role },
        create: { documentId: doc.id, userId: user.id, role },
      });
    }
  }
  redirect(`/docs/${doc.id}`);
}
