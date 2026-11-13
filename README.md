# Ajaia Docs

A lightweight collaborative document editor inspired by Google Docs. You write rich-text documents, share them with teammates at the right permission level, import files, attach files, and export to other formats.

**Live app:** https://ajaia-collab-docs-teal.vercel.app
**Repo:** https://github.com/PratheekEranki/ajaia-collab-docs

> Use the `-teal` URL. `ajaia-collab-docs.vercel.app` belongs to an unrelated Vercel project.

## Test accounts

| Account | Email | Password | Role |
|---|---|---|---|
| Alice Chen | `alice@ajaia.dev` | `ajaia-demo` | **Admin**; owns 2 docs |
| Bob Rivera | `bob@ajaia.dev` | `ajaia-demo` | Editor on Alice's "Q4 launch plan" |
| Carol Okafor | `carol@ajaia.dev` | `ajaia-demo` | Owns "Onboarding checklist" (Alice is a viewer) |

The sign-in page has click-to-fill buttons for these. You can also **Request an account** and approve it as Alice in **Admin → Accounts**.

### 3-minute review path
1. Sign in as **Alice**. Open *Q4 launch plan*, try the toolbar (font, size, colour, highlighter, alignment, lists) and watch *Saving… → Saved*. Refresh: the formatting persists.
2. **Share** → add `carol@ajaia.dev` as *Can view*. **File → Download** as .md / .html / .docx, or **Print / Save as PDF**.
3. **Sign out** → sign in as **Carol**. *Shared with me* shows the plan, read-only, with a **Request edit access** button. Click it.
4. Sign back in as **Alice** → **Share** → approve Carol's request. Carol can now edit.
5. **Import file** on the dashboard (.txt / .md / .docx ≤ 2 MB) → it becomes a new doc. Try a .pdf to see the validation message. Ready-made samples (including files that should be rejected) are in [`demo-files/`](demo-files/README.md).
6. As an editor, **Attach file** under a document. Viewers can download but not remove.

## Features

| Area | What works |
|---|---|
| Documents | Create, rename, delete (owner), make a copy; dashboard tabs **My documents / Shared with me** with ownership tags |
| Editor | Bold, italic, underline, strikethrough, Normal/H1/H2/H3, **font family, font size, text colour, highlighter (6 colours), left/centre/right/justify**, bulleted/numbered lists, quote, undo/redo, clear formatting |
| Saving | Autosave 800 ms after typing stops, status line (*Saving… / Saved · time / error + Retry*), unsaved-changes warning |
| Sharing | Owner adds people **by email** as Viewer or Editor, changes roles, removes access; **link sharing** (off / view / edit); viewers can **request edit access**, which the owner approves or denies |
| Accounts | Email + password (bcrypt); **sign-up creates a request that an admin approves**; admins create accounts directly and grant admin |
| Files in | Import **.txt, .md, .docx** (≤ 2 MB) as a new document (headings, lists and emphasis preserved) |
| Files out | Export **Markdown, HTML, Word (.docx)**, and **PDF** via a print-optimised page |
| Comments | Anyone with access (viewers too) can comment, optionally on selected text; author or editors resolve/reopen; author or owner deletes |
| Version history | Automatic snapshot at most every 2 min of editing; editors restore any version (the current state is kept first, so restores are undoable) |
| Attachments | Attach PDF/Office/text/CSV/image/ZIP (≤ 2 MB, max 20 per doc); editors add/remove, everyone with access downloads |
| Security | Every API route re-checks the caller's role on the server; content sanitized against an allowlist (including inline styles); 404 for docs you can't see; signed httpOnly session cookie |

**Supported file types are shown in the UI as well:** import accepts `.txt .md .docx`; attachments accept `.pdf .doc(x) .xls(x) .ppt(x) .txt .md .csv .png .jpg .gif .webp .zip`, 2 MB each.

## Run locally

Requirements: Node 20+ and a Postgres database (a free [Neon](https://neon.tech) project works).

```bash
git clone https://github.com/PratheekEranki/ajaia-collab-docs
cd ajaia-collab-docs
npm install
```

Create `.env` in the project root:

```env
DATABASE_URL="postgresql://…-pooler…/neondb?sslmode=require"   # pooled connection
DATABASE_URL_UNPOOLED="postgresql://…/neondb?sslmode=require"   # direct connection (schema changes)
SESSION_SECRET="any-long-random-string"
```

```bash
npm run db:push    # create tables
npm run db:seed    # Alice, Bob, Carol + sample docs (safe to re-run)
npm run dev        # http://localhost:3000
```

> On Windows PowerShell, if `npm`/`npx` are blocked by the execution policy, use `npm.cmd` / `npx.cmd`.

### Tests

```bash
npm test                                         # unit tests (permissions, sanitizer, import/export converters)
npm run build && npm start                       # in one terminal (production mode)
APP_URL=http://localhost:3000 npm test           # in another: + end-to-end API tests (41 tests total)
```

Run e2e against the production build. The dev server compiles routes on first request, which can make the first hits slow enough to time out. The end-to-end suite signs in as the seeded users and checks that the **server** enforces access, beyond what the UI hides:
- 401 when signed out, and forged cookies are rejected
- 404 for strangers, 403 for viewer edits and non-owner sharing
- the request → approve flow
- sign-up → pending → admin approval → sign-in
- import validation, link sharing that never downgrades a role
- Markdown/HTML/Word export
- attachment permissions, and that downloads are sent with `nosniff`

### Deploy
Vercel builds with `npm run vercel-build` = `prisma generate → prisma db push → seed → next build`. Set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in the Vercel project. `SESSION_SECRET` is optional; if it's missing, the session key is derived from the database URL.

## Project layout

```
app/                 pages (server components) + /api route handlers
components/          Editor shell, Toolbar, ShareDialog, Attachments, AdminConsole…
lib/permissions.ts   pure role/capability rules (the security core, unit-tested)
lib/access.ts        load a doc + enforce a capability (used by every doc route)
lib/content.ts       sanitizer, import/export converters, upload rules
lib/session.ts       signed-cookie sessions
prisma/              schema + idempotent seed
tests/               vitest unit + e2e
docs/                SPEC, ARCHITECTURE, ADRs, AI workflow note
```

## Status

**Working end to end:** everything in the Features table, on the live URL.

**Known limitations / deliberately cut:**
- No real-time co-editing or presence. Saves are last-write-wins (ADR-0005). Version history is the safety net.
- Comments aren't anchored to a text range: they keep a quote of the selected text instead, so editing the text doesn't break them.
- No email delivery: sharing by email grants access to an existing account, and admins hand out temporary passwords directly.
- No password reset, email verification or sign-in rate limiting yet.
- Markdown export drops colours, fonts and underline (Markdown has no syntax for them). HTML and Word keep them.
- PDF export uses the browser's print dialog.

**Next 2–4 hours:**
1. Optimistic concurrency (reject stale saves with 409 and show "someone else edited this") as a step toward real-time editing.
2. Anchored comments (highlight the range in the editor), replies and @mentions; suggestion mode.
3. Version diff view (compare two versions) and named versions.
4. Password reset + email invites via a mail provider. Move auth to Neon Auth / Auth.js.
5. Rate limiting on sign-in/sign-up. Move attachments to object storage for larger files.

Docs: [Spec](docs/SPEC.md) · [Architecture note](docs/ARCHITECTURE.md) · [ADRs](docs/adr/README.md) · [AI workflow note](docs/AI_WORKFLOW.md)
