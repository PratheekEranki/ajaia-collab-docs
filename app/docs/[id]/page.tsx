import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { roleFor } from "@/lib/permissions";
import { Brand } from "@/components/ui";
import { EditorShell } from "@/components/EditorShell";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { shares: true, owner: { select: { id: true, name: true } } },
  });
  const role = doc ? roleFor(doc, user.id) : null;

  if (!doc || !role) {
    return (
      <>
        <header className="topbar">
          <Brand />
        </header>
        <main className="page" style={{ maxWidth: 560 }}>
          <div className="empty">
            <p style={{ fontSize: 17, fontWeight: 600 }}>You don&apos;t have access to this document</p>
            <p className="muted">It may have been deleted, or the owner hasn&apos;t shared it with {user.name}. Ask them to share it, or to send you a link.</p>
            <Link href="/" className="btn">
              Back to documents
            </Link>
          </div>
        </main>
      </>
    );
  }

  const pending = await prisma.accessRequest.findFirst({
    where: { documentId: doc.id, userId: user.id, status: "PENDING" },
    select: { id: true },
  });

  return (
    <EditorShell
      doc={{ id: doc.id, title: doc.title, content: doc.content, updatedAt: doc.updatedAt.toISOString() }}
      owner={doc.owner}
      me={{ id: user.id, name: user.name }}
      role={role}
      hasPendingRequest={Boolean(pending)}
    />
  );
}
