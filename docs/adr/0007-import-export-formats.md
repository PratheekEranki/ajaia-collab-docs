# ADR-0007: Import txt/md/docx as new documents; export md/html/pdf

**Status:** Accepted · 2026-11-13

## Context
The brief requires at least one product-relevant upload flow with clearly stated limits. Product direction: (a) upload → new document now; (b) attachments later; plus export to formats other than the stored one.

## Decision
**Import (P0):** `POST /api/import` accepts one file, **≤ 2 MB**, extensions **.txt, .md, .docx** only. The conversion is `txt` → escaped paragraphs, `md` → `marked`, `docx` → `mammoth` (keeps headings, lists, bold/italic). Then sanitize (ADR-0003), create a doc titled after the file name, and open it. The limits are shown in the import dialog and README.

**Export (P1):** `GET /api/documents/:id/export?format=md|html` returns a download (`Content-Disposition: attachment`). **PDF** uses `/docs/:id/print`, a clean print-styled page that opens the browser's print dialog ("Save as PDF"). **.docx** export is P2 (`html-to-docx`) if time allows.

**Attachments (P2, Phase 3):** stored as `bytea` in Postgres (≤ 2 MB), no extra service. Built for real or not shipped at all, never shown as a non-working button.

## Alternatives considered
- **Import into the current doc:** adds cursor/replace semantics with little extra value. Deferred.
- **Server-side PDF (Puppeteer):** a heavy binary that's unreliable on serverless. The browser print path is free and good quality.
- **Object storage (Neon storage / S3) for attachments:** the right answer at scale, but it's another service, keys and setup. Postgres is fine at ≤ 2 MB.
- **.pdf/.rtf import:** poor fidelity, out of scope.

## Consequences
- Clear, testable converters in `lib/content.ts`.
- Markdown export loses underline (no Markdown syntax for it).
