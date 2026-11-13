"use client";
import { useCallback, useEffect, useState } from "react";
import { Avatar, api } from "./ui";
import { TimeAgo } from "./TimeAgo";

type Account = { id: string; name: string; email: string; isAdmin: boolean; status: "PENDING" | "ACTIVE"; createdAt: string };
const json = (body: unknown, method: string) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function AdminConsole({ meId }: { meId: string }) {
  const [users, setUsers] = useState<Account[] | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", isAdmin: false });
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      setUsers((await api<{ users: Account[] }>("/api/admin/users")).users);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  }

  async function act(u: Account, action: "approve" | "deny" | "makeAdmin" | "removeAdmin") {
    setBusy(true);
    try {
      await api(`/api/admin/users/${u.id}`, json({ action }, "PATCH"));
      flash(
        { approve: `Approved ${u.name}`, deny: `Denied ${u.name}'s request`, makeAdmin: `${u.name} is now an admin`, removeAdmin: `${u.name} is no longer an admin` }[action],
      );
      await load();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      await api("/api/admin/users", json(form, "POST"));
      flash(`Created an account for ${form.name}`);
      setForm({ name: "", email: "", password: "", isAdmin: false });
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pending = users?.filter((u) => u.status === "PENDING") ?? [];
  const active = users?.filter((u) => u.status === "ACTIVE") ?? [];

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>Accounts</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Approve access requests and create accounts for teammates.
        </p>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}

      <section className="stack" aria-labelledby="pending-title">
        <h2 id="pending-title" className="section-title">
          Access requests <span className="count">{pending.length}</span>
        </h2>
        {users && pending.length === 0 && <p className="muted" style={{ margin: 0 }}>No requests waiting. New sign-ups appear here.</p>}
        {pending.length > 0 && (
          <div className="people">
            {pending.map((u) => (
              <div className="person" key={u.id}>
                <Avatar id={u.id} name={u.name} small />
                <span className="person-name">
                  <strong style={{ fontSize: 14 }}>{u.name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {u.email} · requested <TimeAgo iso={u.createdAt} />
                  </span>
                </span>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => act(u, "approve")}>Approve</button>
                <button className="btn btn-sm" disabled={busy} onClick={() => act(u, "deny")}>Deny</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="stack" aria-labelledby="create-title">
        <h2 id="create-title" className="section-title">Create an account</h2>
        <form onSubmit={create} className="create-grid">
          <label className="stack" style={{ gap: 4 }}>
            <span className="field-label">Full name</span>
            <input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span className="field-label">Work email</span>
            <input className="field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span className="field-label">Temporary password (8+)</span>
            <input className="field" type="text" required minLength={8} autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="row" style={{ gap: 8, alignSelf: "end", height: 40 }}>
            <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} /> Admin
          </label>
          <button className="btn btn-primary" disabled={busy} style={{ alignSelf: "end" }}>Create account</button>
        </form>
        {formError && <p className="alert" role="alert">{formError}</p>}
        <p className="mono" style={{ margin: 0 }}>Share the temporary password with them directly. No email is sent.</p>
      </section>

      <section className="stack" aria-labelledby="members-title">
        <h2 id="members-title" className="section-title">
          Members <span className="count">{active.length}</span>
        </h2>
        <div className="people">
          {active.map((u) => (
            <div className="person" key={u.id}>
              <Avatar id={u.id} name={u.name} small />
              <span className="person-name">
                <strong style={{ fontSize: 14 }}>
                  {u.name} {u.id === meId && <span className="muted">(you)</span>}
                </strong>
                <span className="muted" style={{ fontSize: 12 }}>{u.email}</span>
              </span>
              {u.isAdmin ? <span className="tag tag-own">Admin</span> : <span className="tag tag-shared">Member</span>}
              {u.id !== meId &&
                (u.isAdmin ? (
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(u, "removeAdmin")}>Remove admin</button>
                ) : (
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(u, "makeAdmin")}>Make admin</button>
                ))}
            </div>
          ))}
        </div>
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
