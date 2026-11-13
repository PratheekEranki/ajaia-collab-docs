"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./ui";

type Item = { id: string; filename: string; size: number; createdAt: string; uploadedBy: { name: string } };
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.zip";

const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export function Attachments({ docId, canEdit, onToast }: { docId: string; canEdit: boolean; onToast: (m: string) => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ attachments: Item[] }>(`/api/documents/${docId}/attachments`)).attachments);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [docId]);
  useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    setError("");
    if (file.size > 2 * 1024 * 1024) return setError(`${file.name} is ${fmtSize(file.size)}. The limit is 2 MB.`);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api(`/api/documents/${docId}/attachments`, { method: "POST", body: form });
      onToast(`Attached ${file.name}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Item) {
    try {
      await api(`/api/documents/${docId}/attachments/${item.id}`, { method: "DELETE" });
      onToast(`Removed ${item.filename}`);
      await load();
    } catch (e) {
      onToast((e as Error).message);
    }
  }

  return (
    <section className="attachments no-print" aria-labelledby="att-title">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="att-title" className="section-title">
          Attachments {items && <span className="count">{items.length}</span>}
        </h2>
        {canEdit && (
          <>
            <button className="btn btn-sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? "Uploading…" : "＋ Attach file"}
            </button>
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              aria-label="Attach a file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {items && items.length === 0 && (
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {canEdit ? "No files yet. Attach PDFs, Office files, images, CSV, text or ZIP, up to 2 MB each." : "No files attached."}
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="att-list">
          {items.map((it) => (
            <li key={it.id} className="person">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M12.5 7.5l-5 5a2.1 2.1 0 01-3-3l6-6a1.4 1.4 0 012 2l-6 6" stroke="#5a6573" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="person-name">
                <a href={`/api/documents/${docId}/attachments/${it.id}`} style={{ fontWeight: 600, fontSize: 14 }}>
                  {it.filename}
                </a>
                <span className="muted" style={{ fontSize: 12 }}>
                  {fmtSize(it.size)} · added by {it.uploadedBy.name}
                </span>
              </span>
              <a className="btn btn-ghost btn-sm" href={`/api/documents/${docId}/attachments/${it.id}`}>
                Download
              </a>
              {canEdit && (
                <button className="btn btn-ghost btn-sm" onClick={() => remove(it)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
