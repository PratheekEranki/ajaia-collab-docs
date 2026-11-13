import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { countDocs, listDocs } from "@/lib/documents";
import { Brand, Logo, RoleTag } from "@/components/ui";
import { SignIn } from "@/components/SignIn";
import { UserMenu } from "@/components/UserMenu";
import { DashboardActions } from "@/components/DashboardActions";
import { TimeAgo } from "@/components/TimeAgo";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string; next?: string }> }) {
  const user = await getCurrentUser();
  const sp = await searchParams;

  if (!user) {
    // Only allow returning to a share link (no open redirects).
    const next = sp.next?.startsWith("/share/") ? sp.next : undefined;
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { owned: true, shares: true } } },
    });
    return (
      <main className="signin">
        <div className="signin-inner">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="brand">
              <Logo size={28} /> Ajaia Docs
            </span>
            <h1>Sign in</h1>
            <p className="muted" style={{ margin: 0 }}>
              Pick a demo account. Each one owns different documents, so you can test sharing by switching between them.
            </p>
          </div>
          <SignIn
            next={next}
            users={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              summary: `Owns ${u._count.owned} · ${u._count.shares} shared with them`,
            }))}
          />
          <p className="mono" style={{ margin: 0 }}>
            Demo sign-in · no passwords · seeded accounts
          </p>
        </div>
      </main>
    );
  }

  const tab = sp.tab === "shared" ? "shared" : "owned";
  const [docs, counts] = await Promise.all([listDocs(user.id, tab), countDocs(user.id)]);

  return (
    <>
      <header className="topbar">
        <Brand />
        <UserMenu user={{ id: user.id, name: user.name }} />
      </header>
      <main className="page">
        <div className="page-head">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1>Documents</h1>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Everything you own, plus what teammates have shared with you.
            </p>
          </div>
          <DashboardActions />
        </div>

        <nav className="tabs" aria-label="Document lists">
          <Link href="/" className="tab" aria-current={tab === "owned" ? "page" : undefined}>
            My documents<span className="count">{counts.owned}</span>
          </Link>
          <Link href="/?tab=shared" className="tab" aria-current={tab === "shared" ? "page" : undefined}>
            Shared with me<span className="count">{counts.shared}</span>
          </Link>
        </nav>

        {docs.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize: 17, fontWeight: 600 }}>{tab === "owned" ? "No documents yet" : "Nothing shared with you yet"}</p>
            <p className="muted">
              {tab === "owned"
                ? "Create a document, or import a .txt, .md or .docx file to get started."
                : "When a teammate shares a document with you, it shows up here."}
            </p>
          </div>
        ) : (
          <div className="grid">
            {docs.map((d) => (
              <Link key={d.id} href={`/docs/${d.id}`} className="card">
                <div className="sheet" aria-hidden="true">
                  <div style={{ font: "600 17px/1.3 var(--doc)", color: "var(--ink)", marginBottom: 8 }}>{d.title}</div>
                  {d.preview || <span className="muted">Empty document</span>}
                </div>
                <div className="card-foot">
                  <span className="card-title">{d.title}</span>
                  <span className="card-meta">
                    {d.role === "OWNER" ? (
                      <RoleTag role="OWNER" label={d.sharedCount ? `Owned by you · shared with ${d.sharedCount}` : "Owned by you"} />
                    ) : (
                      <RoleTag role={d.role} label={`Shared by ${d.ownerName.split(" ")[0]} · ${d.role === "EDITOR" ? "Editor" : "Viewer"}`} />
                    )}
                    <TimeAgo iso={d.updatedAt} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
