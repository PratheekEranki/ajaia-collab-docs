"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "./ui";

const MAX = 2 * 1024 * 1024;
const TYPES = [".txt", ".md", ".docx"];

export function DashboardActions() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState("");

  async function newDoc() {
    setCreating(true);
    setError("");
    try {
      const { document } = await api<{ document: { id: string } }>("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      router.push(`/docs/${document.id}`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }

  return (
    <div className="row">
      <button className="btn" onClick={() => setImportOpen(true)}>
        <UploadIcon /> Import file
      </button>
      <button className="btn btn-primary" onClick={newDoc} disabled={creating}>
        <span aria-hidden="true">＋</span> {creating ? "Creating…" : "New document"}
      </button>
      {error && (
        <p className="alert" role="alert" style={{ flexBasis: "100%" }}>
          {error}
        </p>
      )}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
    </div>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function upload(file: File) {
    setError("");
    // Fast feedback on the client; the server enforces the same rules.
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!TYPES.includes(ext)) return setError(`${file.name} can't be imported. Upload a .txt, .md or .docx file.`);
    if (file.size > MAX) return setError(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { document } = await api<{ document: { id: string } }>("/api/import", { method: "POST", body: form });
      router.push(`/docs/${document.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="import-title" className="dialog">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 id="import-title">Import a file</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            The file becomes a new document you own. Headings, lists and bold or italic text carry over.
          </p>
        </div>
        <label
          className="drop"
          data-over={over}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) upload(f);
          }}
        >
          <UploadIcon size={26} />
          <span style={{ fontWeight: 600 }}>{busy ? "Importing…" : "Drop a file here or choose one"}</span>
          <span className="mono">.txt · .md · .docx — up to 2 MB</span>
          <input
            ref={input}
            type="file"
            accept=".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <span className="btn btn-sm" aria-hidden="true">
            Choose file
          </span>
        </label>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 10.5V2.5M5 5.5l3-3 3 3M2.5 10v3.5h11V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
