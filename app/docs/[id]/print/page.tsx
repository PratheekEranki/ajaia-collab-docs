import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { roleFor } from "@/lib/permissions";
import { sanitize } from "@/lib/content";
import { AutoPrint } from "@/components/AutoPrint";

export const dynamic = "force-dynamic";

// PDF export via the browser's print dialog (ADR-0007).
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const doc = await prisma.document.findUnique({ where: { id: (await params).id }, include: { shares: true } });
  if (!doc || !roleFor(doc, user.id)) notFound();

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div className="topbar no-print">
        <Link href={`/docs/${doc.id}`} className="btn btn-ghost btn-sm">
          ← Back to document
        </Link>
        <span className="muted" style={{ fontSize: 14 }}>
          In the print dialog, choose <strong>Save as PDF</strong> as the destination.
        </span>
        <AutoPrint />
      </div>
      <article className="paper" style={{ margin: "0 auto", border: 0 }}>
        <h1 style={{ font: "600 32px/1.2 var(--doc)", margin: "0 0 20px" }}>{doc.title}</h1>
        {/* Content is sanitized on every write; sanitized again here as defense in depth. */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: sanitize(doc.content) }} />
      </article>
    </div>
  );
}
