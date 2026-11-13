"use client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

const FONTS = [
  { label: "Newsreader (default)", value: "" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "'Times New Roman'" },
  { label: "Verdana", value: "Verdana" },
  { label: "Trebuchet MS", value: "'Trebuchet MS'" },
  { label: "Courier New", value: "'Courier New'" },
  { label: "Instrument Sans", value: "'Instrument Sans'" },
];
const SIZES = ["10", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48"];
const TEXT_COLORS = ["#16202a", "#5a6573", "#c0392b", "#d35400", "#b7950b", "#1e8449", "#0b6b66", "#2463eb", "#7d3c98", "#ad1457"];
const HIGHLIGHTS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#e9d5ff"];

type Btn = { label: React.ReactNode; name: string; active?: boolean; run: () => void };

export function Toolbar({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  if (!editor) return <div className="toolbar" style={{ height: 34 }} />;
  const c = () => editor.chain().focus();
  const ts = editor.getAttributes("textStyle") as { fontFamily?: string; fontSize?: string; color?: string };
  const heading = [1, 2, 3].find((l) => editor.isActive("heading", { level: l }));
  const blockValue = heading ? `h${heading}` : "p";

  const marks: Btn[] = [
    { label: <b>B</b>, name: "Bold (Ctrl+B)", active: editor.isActive("bold"), run: () => c().toggleBold().run() },
    { label: <i>I</i>, name: "Italic (Ctrl+I)", active: editor.isActive("italic"), run: () => c().toggleItalic().run() },
    { label: <u>U</u>, name: "Underline (Ctrl+U)", active: editor.isActive("underline"), run: () => c().toggleUnderline().run() },
    { label: <s>S</s>, name: "Strikethrough", active: editor.isActive("strike"), run: () => c().toggleStrike().run() },
  ];
  const aligns: Btn[] = (["left", "center", "right", "justify"] as const).map((a) => ({
    label: <AlignIcon kind={a} />,
    name: `Align ${a}`,
    active: editor.isActive({ textAlign: a }),
    run: () => c().setTextAlign(a).run(),
  }));
  const lists: Btn[] = [
    { label: "• List", name: "Bulleted list", active: editor.isActive("bulletList"), run: () => c().toggleBulletList().run() },
    { label: "1. List", name: "Numbered list", active: editor.isActive("orderedList"), run: () => c().toggleOrderedList().run() },
    { label: "❝", name: "Quote", active: editor.isActive("blockquote"), run: () => c().toggleBlockquote().run() },
  ];
  const history: Btn[] = [
    { label: "↶", name: "Undo (Ctrl+Z)", run: () => c().undo().run() },
    { label: "↷", name: "Redo (Ctrl+Shift+Z)", run: () => c().redo().run() },
    { label: "T̸", name: "Clear formatting", run: () => c().unsetAllMarks().unsetTextAlign().setParagraph().run() },
  ];

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <Buttons items={history.slice(0, 2)} disabled={disabled} />
      <Sep />
      <label className="sr-only" htmlFor="tb-style">Paragraph style</label>
      <select
        id="tb-style"
        className="tb-select"
        disabled={disabled}
        value={blockValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") c().setParagraph().run();
          else c().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
        }}
      >
        <option value="p">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <label className="sr-only" htmlFor="tb-font">Font</label>
      <select
        id="tb-font"
        className="tb-select"
        style={{ width: 150 }}
        disabled={disabled}
        value={FONTS.find((f) => f.value === (ts.fontFamily ?? ""))?.value ?? ""}
        onChange={(e) => (e.target.value ? c().setFontFamily(e.target.value).run() : c().unsetFontFamily().run())}
      >
        {FONTS.map((f) => (
          <option key={f.label} value={f.value} style={{ fontFamily: f.value || "var(--doc)" }}>
            {f.label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="tb-size">Font size</label>
      <select
        id="tb-size"
        className="tb-select"
        style={{ width: 64 }}
        disabled={disabled}
        value={ts.fontSize?.replace("px", "") ?? ""}
        onChange={(e) => (e.target.value ? c().setFontSize(`${e.target.value}px`).run() : c().unsetFontSize().run())}
      >
        <option value="">18</option>
        {SIZES.filter((s) => s !== "18").map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Sep />
      <Buttons items={marks} disabled={disabled} />
      <Swatches
        name="Text colour"
        icon={<span style={{ fontWeight: 700, borderBottom: `3px solid ${ts.color ?? "#16202a"}`, lineHeight: 1 }}>A</span>}
        colors={TEXT_COLORS}
        disabled={disabled}
        onPick={(col) => c().setColor(col).run()}
        onClear={() => c().unsetColor().run()}
        clearLabel="Default colour"
      />
      <Swatches
        name="Highlight"
        icon={<HighlighterIcon color={(editor.getAttributes("highlight").color as string) ?? "#fef08a"} />}
        colors={HIGHLIGHTS}
        disabled={disabled}
        onPick={(col) => c().setHighlight({ color: col }).run()}
        onClear={() => c().unsetHighlight().run()}
        clearLabel="No highlight"
      />
      <Sep />
      <Buttons items={aligns} disabled={disabled} />
      <Sep />
      <Buttons items={lists} disabled={disabled} />
      <Sep />
      <Buttons items={history.slice(2)} disabled={disabled} />
    </div>
  );
}

function Buttons({ items, disabled }: { items: Btn[]; disabled: boolean }) {
  return (
    <>
      {items.map((t) => (
        <button
          key={t.name}
          type="button"
          className="tool"
          title={t.name}
          aria-label={t.name}
          aria-pressed={t.active ?? undefined}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()} // keep the editor selection
          onClick={t.run}
        >
          {t.label}
        </button>
      ))}
    </>
  );
}

function Sep() {
  return <span className="tool-sep" aria-hidden="true" />;
}

function Swatches(props: {
  name: string;
  icon: React.ReactNode;
  colors: string[];
  disabled: boolean;
  onPick: (c: string) => void;
  onClear: () => void;
  clearLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="tool"
        title={props.name}
        aria-label={props.name}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={props.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        {props.icon} <span aria-hidden="true" style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div className="menu-list swatches" role="group" aria-label={props.name} style={{ left: 0, right: "auto", minWidth: 0 }}>
          <div className="swatch-grid">
            {props.colors.map((col) => (
              <button
                key={col}
                type="button"
                className="swatch"
                style={{ background: col }}
                title={col}
                aria-label={`${props.name} ${col}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  props.onPick(col);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="menu-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              props.onClear();
              setOpen(false);
            }}
          >
            {props.clearLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function AlignIcon({ kind }: { kind: "left" | "center" | "right" | "justify" }) {
  const lines = { left: [14, 10, 14, 8], center: [14, 10, 14, 10], right: [14, 10, 14, 8], justify: [14, 14, 14, 14] }[kind];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {lines.map((w, i) => {
        const x = kind === "center" ? (16 - w) / 2 : kind === "right" ? 15 - w : 1;
        return <rect key={i} x={x} y={2 + i * 3.5} width={w} height="1.6" rx="0.8" fill="currentColor" />;
      })}
    </svg>
  );
}

function HighlighterIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 12l6.5-8.5 3 2.3L7 14.2 4 14z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="2" y="15.2" width="14" height="2.4" rx="1" fill={color} stroke="#8b96a3" strokeWidth="0.5" />
    </svg>
  );
}
