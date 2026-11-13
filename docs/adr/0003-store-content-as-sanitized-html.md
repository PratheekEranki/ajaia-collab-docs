# ADR-0003: Store document content as sanitized HTML

**Status:** Accepted · 2026-11-13

## Context
Formatting must survive save/reopen. Content enters from three places (the editor, .md/.docx/.txt import, copies) and leaves in three formats (HTML, Markdown, PDF). Anything a user types or uploads can carry `<script>` or `onerror=` payloads.

## Decision
Store `Document.content` as an **HTML string limited to an allowlist**, sanitized with `sanitize-html` on **every write path** (PATCH, import, copy). The TipTap editor loads and emits this HTML (`setContent` / `getHTML`), and its schema drops anything it doesn't understand on the client as a second layer.

Allowlist: `p h1 h2 h3 strong b em i u s ul ol li blockquote code pre br hr a[href]`, with `href` limited to http/https/mailto.

## Alternatives considered
- **TipTap/ProseMirror JSON:** the most faithful format, but import/export would need a headless editor on the server, and it adds a conversion step everywhere.
- **Markdown as storage:** underline has no Markdown form, so formatting would be lost.
- **Yjs/CRDT document:** needed only for real-time co-editing, which is out of scope.

## Consequences
- Import = convert to HTML → sanitize. Export: HTML is direct, Markdown via turndown, PDF via a print view.
- A single sanitizer function is the XSS boundary and is unit-tested.
- Underline exported to Markdown becomes plain text (Markdown limitation, documented).
