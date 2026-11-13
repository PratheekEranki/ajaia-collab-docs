import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Brand } from "@/components/ui";
import { UserMenu } from "@/components/UserMenu";
import { AdminConsole } from "@/components/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return (
    <>
      <header className="topbar">
        <Brand />
        <UserMenu user={{ id: user.id, name: user.name, isAdmin: user.isAdmin }} />
      </header>
      <main className="page" style={{ maxWidth: 900 }}>
        {user.isAdmin ? (
          <AdminConsole meId={user.id} />
        ) : (
          <div className="empty">
            <p style={{ fontSize: 17, fontWeight: 600 }}>Admins only</p>
            <p className="muted">Ask an admin if you need an account created or approved.</p>
          </div>
        )}
      </main>
    </>
  );
}
