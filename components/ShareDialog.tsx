"use client";
import { useCallback, useEffect, useState } from "react";
import { Avatar, api } from "./ui";

type Person = { id: string; name: string; email: string };
type ShareRole = "VIEWER" | "EDITOR";
type ShareData = {
  role: "OWNER" | ShareRole;
  owner: Person;
  people: (Person & { role: ShareRole })[];
  link: { role: ShareRole | null; token: string | null };
  requests: { id: string; user: Person }[];
  hasPendingRequest: boolean;
  directory: Person[];
};

type Props = {
  docId: string;
  title: string;
  onClose: () => void;
  onToast: (m: string) => void;
  onRequest: () => void;
  requested: boolean;
  onAccessChanged: () => void;
};

const json = (body: unknown, method: string) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function ShareDialog({ docId, title, onClose, onToast, onRequest, requested, onAccessChanged }: Props) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<ShareRole>("VIEWER");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<ShareData>(`/api/documents/${docId}/shares`));
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [docId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      onToast(success);
      await load();
      onAccessChanged();
    } catch (e) {
      onToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function share(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const { person } = await api<{ person: Person & { role: ShareRole } }>(`/api/documents/${docId}/shares`, json({ email, role: newRole }, "PUT"));
      onToast(`Shared with ${person.name} — ${person.role === "EDITOR" ? "can edit" : "can view"}`);
      setEmail("");
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isOwner = data?.role === "OWNER";
  const linkUrl = data?.link.token ? `${typeof window === "undefined" ? "" : window.location.origin}/share/${data.link.token}` : "";
  const notShared = data ? data.directory.filter((u) => !data.people.some((p) => p.id === u.id)) : [];

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="dialog">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 id="share-title">Share “{title}”</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Viewers can read, export and copy. Editors can also change the text and title.
          </p>
        </div>

        {loadError && <p className="alert" role="alert">{loadError}</p>}
        {!data && !loadError && <p className="muted">Loading…</p>}

        {data && (
          <>
            {isOwner && (
              <form onSubmit={share} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="share-email" style={{ fontSize: 14, fontWeight: 600 }}>
                  Add people by email
                </label>
                <div className="row">
                  <input
                    id="share-email"
                    className="field"
                    style={{ flex: "1 1 220px" }}
                    type="email"
                    required
                    placeholder="bob@ajaia.dev"
                    list="share-directory"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <datalist id="share-directory">
                    {notShared.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.name}
                      </option>
                    ))}
                  </datalist>
                  <label htmlFor="share-role" className="sr-only">
                    Access level
                  </label>
                  <select id="share-role" className="field" value={newRole} onChange={(e) => setNewRole(e.target.value as ShareRole)}>
                    <option value="VIEWER">Can view</option>
                    <option value="EDITOR">Can edit</option>
                  </select>
                  <button className="btn btn-primary" disabled={busy}>
                    Share
                  </button>
                </div>
                {notShared.length > 0 && (
                  <div className="row" style={{ gap: 6 }}>
                    <span className="muted" style={{ fontSize: 13 }}>Teammates:</span>
                    {notShared.map((u) => (
                      <button key={u.id} type="button" className="btn btn-sm" onClick={() => setEmail(u.email)}>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
                {formError && <p className="alert" role="alert">{formError}</p>}
                <p className="mono" style={{ margin: 0 }}>Demo: no email is sent. Access is granted to the matching account right away.</p>
              </form>
            )}

            {isOwner && data.requests.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-label="Access requests">
                <h3>Requests for edit access</h3>
                <div className="people">
                  {data.requests.map((r) => (
                    <div className="person" key={r.id}>
                      <Avatar id={r.user.id} name={r.user.name} small />
                      <span className="person-name">
                        <strong style={{ fontSize: 14 }}>{r.user.name}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>Wants to edit · currently a viewer</span>
                      </span>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={busy}
                        onClick={() => run(() => api(`/api/requests/${r.id}`, json({ decision: "APPROVE" }, "PATCH")), `${r.user.name} can now edit`)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => run(() => api(`/api/requests/${r.id}`, json({ decision: "DENY" }, "PATCH")), `Denied ${r.user.name}'s request`)}
                      >
                        Deny
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-label="People with access">
              <h3>People with access</h3>
              <div className="people">
                <div className="person">
                  <Avatar id={data.owner.id} name={data.owner.name} small />
                  <span className="person-name">
                    <strong style={{ fontSize: 14 }}>{data.owner.name}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>{data.owner.email}</span>
                  </span>
                  <span className="tag tag-own">Owner</span>
                </div>
                {data.people.map((p) => (
                  <div className="person" key={p.id}>
                    <Avatar id={p.id} name={p.name} small />
                    <span className="person-name">
                      <strong style={{ fontSize: 14 }}>{p.name}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>{p.email}</span>
                    </span>
                    {isOwner ? (
                      <>
                        <label htmlFor={`role-${p.id}`} className="sr-only">
                          Access for {p.name}
                        </label>
                        <select
                          id={`role-${p.id}`}
                          className="field"
                          style={{ height: 34 }}
                          value={p.role}
                          disabled={busy}
                          onChange={(e) =>
                            run(
                              () => api(`/api/documents/${docId}/shares`, json({ email: p.email, role: e.target.value }, "PUT")),
                              `${p.name} ${e.target.value === "EDITOR" ? "can now edit" : "can now only view"}`,
                            )
                          }
                        >
                          <option value="VIEWER">Can view</option>
                          <option value="EDITOR">Can edit</option>
                        </select>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={busy}
                          onClick={() => run(() => api(`/api/documents/${docId}/shares/${p.id}`, { method: "DELETE" }), `Removed ${p.name}'s access`)}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="tag tag-shared">{p.role === "EDITOR" ? "Can edit" : "Can view"}</span>
                    )}
                  </div>
                ))}
              </div>
              {!isOwner && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Only {data.owner.name} can change who has access.</p>}
              {data.role === "VIEWER" &&
                (requested || data.hasPendingRequest ? (
                  <p className="note">Edit access requested. {data.owner.name.split(" ")[0]} will see it next time they open Share.</p>
                ) : (
                  <button className="btn" style={{ alignSelf: "flex-start" }} onClick={onRequest}>
                    Request edit access
                  </button>
                ))}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-label="Link sharing">
              <h3>Share with a link</h3>
              {isOwner ? (
                <div className="row">
                  <label htmlFor="link-role" className="sr-only">
                    Link access
                  </label>
                  <select
                    id="link-role"
                    className="field"
                    value={data.link.role ?? "OFF"}
                    disabled={busy}
                    onChange={(e) => {
                      const role = e.target.value === "OFF" ? null : e.target.value;
                      run(
                        () => api(`/api/documents/${docId}/link`, json({ role }, "PATCH")),
                        role ? `Anyone with the link can ${role === "EDITOR" ? "edit" : "view"}` : "Link sharing turned off",
                      );
                    }}
                  >
                    <option value="OFF">Off — only people added above</option>
                    <option value="VIEWER">Anyone signed in with the link can view</option>
                    <option value="EDITOR">Anyone signed in with the link can edit</option>
                  </select>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                  {data.link.role ? `Link sharing is on (${data.link.role === "EDITOR" ? "can edit" : "can view"}).` : "Link sharing is off."}
                </p>
              )}
              {data.link.role && linkUrl && (
                <div className="row">
                  <input className="field mono" style={{ flex: "1 1 260px" }} readOnly value={linkUrl} aria-label="Share link" onFocus={(e) => e.target.select()} />
                  <button
                    className="btn"
                    onClick={async () => {
                      await navigator.clipboard.writeText(linkUrl);
                      onToast("Link copied");
                    }}
                  >
                    Copy link
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
