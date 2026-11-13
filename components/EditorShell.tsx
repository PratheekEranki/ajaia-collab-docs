"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "./FontSize";
import { Toolbar } from "./Toolbar";
import { Avatar, RoleTag, api } from "./ui";
import { ShareDialog } from "./ShareDialog";
import { Attachments } from "./Attachments";
import { SidePanel } from "./SidePanel";

type Role = "OWNER" | "EDITOR" | "VIEWER";
type Props = {
  doc: { id: string; title: string; content: string; updatedAt: string };
  owner: { id: string; name: string };
  me: { id: string; name: string };
  role: Role;
  hasPendingRequest: boolean;
};
type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error"; message: string };

const SAVE_DELAY_MS = 800;

export function EditorShell({ doc, owner, me, role, hasPendingRequest }: Props) {
  const router = useRouter();
  const canEdit = role !== "VIEWER";
  const [title, setTitle] = useState(doc.title);
  const lastSavedTitle = useRef(doc.title);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [requested, setRequested] = useState(hasPendingRequest);
  const [panel, setPanel] = useState<null | "comments" | "history">(null);

  // --- Autosave (ADR-0005): merge changes, flush 800 ms after the last one. ---
  const pending = useRef<{ title?: string; content?: string }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const patch = pending.current;
    if (patch.title === undefined && patch.content === undefined) return;
    pending.current = {};
    setSave({ kind: "saving" });
    try {
      await api(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (patch.title !== undefined) lastSavedTitle.current = patch.title;
      setSave({ kind: "saved", at: new Date() });
    } catch (e) {
      // Put the unsaved change back so the next edit (or retry) sends it again.
      pending.current = { ...patch, ...pending.current };
      setSave({ kind: "error", message: (e as Error).message });
    }
  }, [doc.id]);

  const queue = useCallback(
    (patch: { title?: string; content?: string }) => {
      pending.current = { ...pending.current, ...patch };
      setSave({ kind: "saving" });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing. Use the toolbar for headings, lists, and bold, italic or underlined text." }),
    ],
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false, // avoid SSR hydration mismatch in Next.js
    editorProps: { attributes: { class: "prose", "aria-label": "Document body" } },
    onUpdate: ({ editor }) => queue({ content: editor.getHTML() }),
  });

  const getSelection = useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ").trim();
  }, [editor]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (value.trim()) queue({ title: value.trim() });
    else setSave({ kind: "error", message: "Title can't be empty." });
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function requestEdit() {
    try {
      await api(`/api/documents/${doc.id}/requests`, { method: "POST" });
      setRequested(true);
      flash(`Asked ${owner.name.split(" ")[0]} for edit access`);
    } catch (e) {
      flash((e as Error).message);
    }
  }

  return (
    <>
      <header className="topbar no-print">
        <Link href="/" className="btn btn-ghost btn-sm" onClick={() => flush()}>
          ← All documents
        </Link>
        <label htmlFor="doc-title" className="sr-only">
          Document title
        </label>
        <input
          id="doc-title"
          className="title-in"
          value={title}
          maxLength={200}
          readOnly={!canEdit}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={() => {
            if (!title.trim()) {
              setTitle(lastSavedTitle.current);
              setSave({ kind: "idle" });
            }
          }}
        />
        <SaveStatus state={save} canEdit={canEdit} onRetry={flush} />
        <RoleTag role={role} />
        <button className="btn btn-sm" aria-pressed={panel === "comments"} onClick={() => setPanel(panel === "comments" ? null : "comments")}>
          Comments
        </button>
        <button className="btn btn-sm" aria-pressed={panel === "history"} onClick={() => setPanel(panel === "history" ? null : "history")}>
          History
        </button>
        <FileMenu docId={doc.id} title={title} isOwner={role === "OWNER"} onToast={flash} />
        <button className="btn btn-primary btn-sm" onClick={() => setShareOpen(true)}>
          Share
        </button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }} title={`Signed in as ${me.name}`}>
          <Avatar id={me.id} name={me.name} small />
        </span>
      </header>

      <div className="toolbar-wrap no-print">
        <Toolbar editor={editor} disabled={!canEdit} />
      </div>

      <div className="doc-col">
        {!canEdit && (
          <div className="banner no-print" role="status">
            <span>
              View only. {owner.name} shared this with you as a viewer.
            </span>
            {requested ? (
              <span style={{ fontWeight: 600 }}>Edit access requested — waiting for {owner.name.split(" ")[0]}</span>
            ) : (
              <button className="btn btn-sm" onClick={requestEdit}>
                Request edit access
              </button>
            )}
          </div>
        )}
        <article className="paper">
          <EditorContent editor={editor} />
        </article>
        <Attachments docId={doc.id} canEdit={canEdit} onToast={flash} />
      </div>

      {panel && (
        <SidePanel
          docId={doc.id}
          tab={panel}
          onTab={setPanel}
          onClose={() => setPanel(null)}
          meId={me.id}
          role={role}
          getSelection={getSelection}
          onBeforeRestore={async () => {
            if (timer.current) clearTimeout(timer.current);
            await flush();
          }}
          onToast={flash}
        />
      )}
      {shareOpen && (
        <ShareDialog
          docId={doc.id}
          title={title}
          onClose={() => setShareOpen(false)}
          onToast={flash}
          onRequest={requestEdit}
          requested={requested}
          onAccessChanged={() => router.refresh()}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function SaveStatus({ state, canEdit, onRetry }: { state: SaveState; canEdit: boolean; onRetry: () => void }) {
  if (!canEdit) return null;
  if (state.kind === "error")
    return (
      <span className="status mono" role="alert" style={{ color: "var(--danger)" }}>
        <span className="dot dot-err" />
        {state.message}
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          Retry
        </button>
      </span>
    );
  const text =
    state.kind === "saving"
      ? "Saving…"
      : state.kind === "saved"
        ? `Saved · ${state.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : "All changes saved";
  return (
    <span className="status mono" aria-live="polite">
      <span className={`dot${state.kind === "saving" ? " dot-busy" : ""}`} />
      {text}
    </span>
  );
}

function FileMenu({ docId, title, isOwner, onToast }: { docId: string; title: string; isOwner: boolean; onToast: (m: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function copy() {
    try {
      const { document } = await api<{ document: { id: string } }>(`/api/documents/${docId}/copy`, { method: "POST" });
      router.push(`/docs/${document.id}`);
    } catch (e) {
      onToast((e as Error).message);
    }
  }
  async function remove() {
    try {
      await api(`/api/documents/${docId}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (e) {
      onToast((e as Error).message);
    }
  }

  return (
    <div className="menu" ref={ref}>
      <button className="btn btn-sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        File ▾
      </button>
      {open && (
        <div className="menu-list" role="menu" aria-label={`File actions for ${title}`}>
          <button className="menu-item" role="menuitem" onClick={copy}>
            Make a copy
          </button>
          <div className="menu-sep" />
          <a className="menu-item" role="menuitem" href={`/api/documents/${docId}/export?format=md`}>
            Download Markdown (.md)
          </a>
          <a className="menu-item" role="menuitem" href={`/api/documents/${docId}/export?format=html`}>
            Download web page (.html)
          </a>
          <a className="menu-item" role="menuitem" href={`/api/documents/${docId}/export?format=docx`}>
            Download Word (.docx)
          </a>
          <a className="menu-item" role="menuitem" href={`/docs/${docId}/print`} target="_blank" rel="noopener">
            Print / Save as PDF
          </a>
          {isOwner && (
            <>
              <div className="menu-sep" />
              <button
                className="menu-item btn-danger"
                role="menuitem"
                onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
              >
                {confirmDelete ? "Click again to delete permanently" : "Delete document…"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
