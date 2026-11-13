"use client";
import { useCallback, useEffect, useState } from "react";
import { Avatar, api } from "./ui";
import { TimeAgo } from "./TimeAgo";

type Comment = { id: string; body: string; quote: string | null; resolved: boolean; createdAt: string; author: { id: string; name: string } };
type Version = { id: string; title: string; preview: string; createdAt: string; author: { name: string } };
type Tab = "comments" | "history";

type Props = {
  docId: string;
  tab: Tab;
  onTab: (t: Tab) => void;
  onClose: () => void;
  meId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  getSelection: () => string;
  onBeforeRestore: () => Promise<void>;
  onToast: (m: string) => void;
};

const json = (body: unknown, method: string) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function SidePanel(props: Props) {
  return (
    <aside className="side-panel no-print" aria-label="Comments and history">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" role="tablist" style={{ gap: 4 }}>
          {(["comments", "history"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={props.tab === t} className={`btn btn-sm ${props.tab === t ? "" : "btn-ghost"}`} onClick={() => props.onTab(t)}>
              {t === "comments" ? "Comments" : "Version history"}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" aria-label="Close panel" onClick={props.onClose}>
          ✕
        </button>
      </div>
      {props.tab === "comments" ? <Comments {...props} /> : <History {...props} />}
    </aside>
  );
}

function Comments({ docId, meId, role, getSelection, onToast }: Props) {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [quote, setQuote] = useState("");
  const [error, setError] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ comments: Comment[] }>(`/api/documents/${docId}/comments`)).comments);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [docId]);
  useEffect(() => {
    load();
    setQuote(getSelection().slice(0, 300));
  }, [load, getSelection]);

  // ponytail: polling, not websockets. While the panel is open (and the tab visible), pick up
  // other people's comments every 5 s. Real-time push is listed as next step (ADR-0009).
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/documents/${docId}/comments`, json({ body, quote: quote || undefined }, "POST"));
      setBody("");
      setQuote("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function act(c: Comment, action: "resolve" | "reopen" | "delete") {
    try {
      if (action === "delete") await api(`/api/documents/${docId}/comments/${c.id}`, { method: "DELETE" });
      else await api(`/api/documents/${docId}/comments/${c.id}`, json({ resolved: action === "resolve" }, "PATCH"));
      onToast(action === "delete" ? "Comment deleted" : action === "resolve" ? "Comment resolved" : "Comment reopened");
      await load();
    } catch (e) {
      onToast((e as Error).message);
    }
  }

  const open = items?.filter((c) => !c.resolved) ?? [];
  const resolved = items?.filter((c) => c.resolved) ?? [];
  const canEdit = role !== "VIEWER";

  return (
    <div className="stack" style={{ gap: 14 }}>
      <form onSubmit={add} className="stack" style={{ gap: 8 }}>
        {quote ? (
          <div className="quote-chip">
            <span className="muted" style={{ fontSize: 12 }}>On “{quote.length > 80 ? `${quote.slice(0, 80)}…` : quote}”</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuote("")} aria-label="Remove quoted text">✕</button>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>Tip: select text in the document first to comment on it.</p>
        )}
        <label htmlFor="new-comment" className="sr-only">New comment</label>
        <textarea id="new-comment" className="field" style={{ height: 76, padding: 10, resize: "vertical" }} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} disabled={!body.trim()}>Comment</button>
      </form>

      {items && open.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 14 }}>No open comments.</p>}
      {open.map((c) => (
        <CommentCard key={c.id} c={c} canResolve={c.author.id === meId || canEdit} canDelete={c.author.id === meId || role === "OWNER"} onAct={act} />
      ))}
      {resolved.length > 0 && (
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowResolved((s) => !s)}>
          {showResolved ? "Hide" : "Show"} {resolved.length} resolved
        </button>
      )}
      {showResolved && resolved.map((c) => <CommentCard key={c.id} c={c} canResolve={c.author.id === meId || canEdit} canDelete={c.author.id === meId || role === "OWNER"} onAct={act} />)}
    </div>
  );
}

function CommentCard({ c, canResolve, canDelete, onAct }: { c: Comment; canResolve: boolean; canDelete: boolean; onAct: (c: Comment, a: "resolve" | "reopen" | "delete") => void }) {
  return (
    <article className="comment" data-resolved={c.resolved}>
      <div className="row" style={{ gap: 8 }}>
        <Avatar id={c.author.id} name={c.author.name} small />
        <span className="stack" style={{ gap: 0 }}>
          <strong style={{ fontSize: 14 }}>{c.author.name}</strong>
          <TimeAgo iso={c.createdAt} />
        </span>
      </div>
      {c.quote && <blockquote className="comment-quote">{c.quote}</blockquote>}
      <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{c.body}</p>
      <div className="row" style={{ gap: 4 }}>
        {canResolve && (
          <button className="btn btn-ghost btn-sm" onClick={() => onAct(c, c.resolved ? "reopen" : "resolve")}>{c.resolved ? "Reopen" : "Resolve"}</button>
        )}
        {canDelete && <button className="btn btn-ghost btn-sm" onClick={() => onAct(c, "delete")}>Delete</button>}
      </div>
    </article>
  );
}

function History({ docId, role, onBeforeRestore, onToast }: Props) {
  const [items, setItems] = useState<Version[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api<{ versions: Version[] }>(`/api/documents/${docId}/versions`)
      .then((r) => setItems(r.versions))
      .catch((e) => setError((e as Error).message));
  }, [docId]);

  async function restore(v: Version) {
    setBusy(v.id);
    try {
      await onBeforeRestore(); // flush pending autosave so it can't overwrite the restore
      await api(`/api/documents/${docId}/versions/${v.id}`, { method: "POST" });
      onToast("Version restored");
      window.location.reload();
    } catch (e) {
      onToast((e as Error).message);
      setBusy("");
    }
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        A snapshot is saved at most every 2 minutes while editing. Restoring keeps a copy of the current version, so it can be undone.
      </p>
      {error && <p className="alert" role="alert">{error}</p>}
      {items && items.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 14 }}>No versions yet. They appear once the document is edited.</p>}
      {items?.map((v) => (
        <article key={v.id} className="comment">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="stack" style={{ gap: 0 }}>
              <strong style={{ fontSize: 14 }}>{new Date(v.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong>
              <span className="muted" style={{ fontSize: 12 }}>by {v.author.name}</span>
            </span>
            {role !== "VIEWER" && (
              <button className="btn btn-sm" disabled={busy !== ""} onClick={() => restore(v)}>{busy === v.id ? "Restoring…" : "Restore"}</button>
            )}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}><strong>{v.title}</strong> · {v.preview || "Empty"}</p>
        </article>
      ))}
    </div>
  );
}
