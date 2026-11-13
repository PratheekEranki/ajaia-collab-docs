// Content boundary (ADR-0003, ADR-0007): everything that becomes document HTML passes through sanitize().
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import TurndownService from "turndown";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const IMPORT_TYPES = [".txt", ".md", ".docx"] as const;

// Inline styles are allowed only for specific properties with strictly-validated values,
// so formatting (fonts, sizes, colours, highlight, alignment) survives without opening CSS injection.
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
const ALIGN = { "text-align": [/^(left|right|center|justify)$/] };

const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: ["p", "h1", "h2", "h3", "strong", "em", "u", "s", "ul", "ol", "li", "blockquote", "code", "pre", "br", "hr", "a", "span", "mark"],
  allowedAttributes: { a: ["href"], span: ["style"], mark: ["style", "data-color"], p: ["style"], h1: ["style"], h2: ["style"], h3: ["style"] },
  allowedStyles: {
    p: ALIGN,
    h1: ALIGN,
    h2: ALIGN,
    h3: ALIGN,
    span: {
      color: [COLOR],
      "font-family": [/^[\w\s,'"-]{1,80}$/],
      "font-size": [/^\d{1,2}px$/],
    },
    mark: { "background-color": [COLOR], color: [/^inherit$/] },
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: { b: "strong", i: "em", h4: "h3", h5: "h3", h6: "h3", strike: "s", del: "s" },
};

export function sanitize(html: string): string {
  return sanitizeHtml(html, ALLOWED).trim();
}

export function textToHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .filter((block) => block.trim())
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function markdownToHtml(md: string): string {
  return sanitize(marked.parse(md, { async: false, gfm: true }) as string);
}

export async function docxToHtml(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ buffer });
  return sanitize(value);
}

/** Converts an uploaded file to sanitized HTML. Throws a user-facing message on unsupported input. */
export async function fileToHtml(filename: string, buffer: Buffer): Promise<string> {
  const ext = extensionOf(filename);
  if (ext === ".txt") return sanitize(textToHtml(buffer.toString("utf8")));
  if (ext === ".md") return markdownToHtml(buffer.toString("utf8"));
  if (ext === ".docx") return docxToHtml(buffer);
  throw new Error(`${filename} can't be imported. Upload a .txt, .md or .docx file.`);
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (base || "Imported document").slice(0, 200);
}

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

/** Plain-text preview for dashboard cards. */
export function previewText(html: string, max = 160): string {
  const text = sanitizeHtml(html.replace(/<\/(p|h[1-6]|li)>/g, " "), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// Attachments (ADR-0007): common document/image/archive types, ≤ 2 MB, stored in Postgres.
export const ATTACHMENT_TYPES = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md", ".csv",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip",
] as const;

export function isAllowedAttachment(filename: string): boolean {
  return (ATTACHMENT_TYPES as readonly string[]).includes(extensionOf(filename));
}
