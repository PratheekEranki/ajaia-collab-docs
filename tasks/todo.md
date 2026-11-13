# Todo — ordered, executable

Size: S ≈ ≤15 min · M ≈ 15–30 min. Each item: acceptance criteria (≤3) · files · depends on.

## Phase 0 — Foundation
- [ ] **T0.1 (S) Neon link + env.** AC: `neon login` done, `neon deploy` writes `DATABASE_URL` into `.env`/`.env.local`; `.env*` gitignored. Files: `neon.ts`, `.neon`, `.gitignore`.
- [ ] **T0.2 (S) Prisma schema + seed.** AC: `db:push` creates User/Document/DocumentShare/AccessRequest; `db:seed` is idempotent and creates 3 users + 3 sample docs (one shared to Bob as Editor, one Carol→Alice as Viewer). Files: `prisma/schema.prisma`, `prisma/seed.ts`, `lib/db.ts`. Dep: T0.1.
- [ ] **T0.3 (S) Session.** AC: `POST/DELETE /api/session`; signed httpOnly cookie; tampered cookie = signed out. Files: `lib/session.ts`, `app/api/session/route.ts`. Dep: T0.2.
- [ ] **T0.4 (S) Shell + sign-in page.** AC: `/` lists seeded users when signed out; header shows the user and "Switch user". Files: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`. Dep: T0.3.
- [ ] **T0.5 (S) First deploy.** AC: Vercel project linked to the repo, env vars set, live URL shows sign-in. ✅ **Checkpoint 0**.

## Phase 1 — Core documents
- [ ] **T1.1 (S) permissions.ts — tests first.** AC: tests for owner/editor/viewer/none, capability table, `maxRole` never-downgrade; all green. Files: `lib/permissions.ts`, `tests/permissions.test.ts`.
- [ ] **T1.2 (M) Documents API.** AC: list (owned/shared), create, get, patch (title 1–200, content sanitized), delete; one error shape; zod at the edge. Files: `app/api/documents/**`, `lib/api.ts`, `lib/content.ts#sanitize`. Dep: T1.1.
- [ ] **T1.3 (M) Dashboard.** AC: tabs with counts, cards with ownership tag + preview + time, empty states, "New document" opens the editor. Files: `app/page.tsx`, `components/Dashboard.tsx`. Dep: T1.2.
- [ ] **T1.4 (M) Editor + autosave.** AC: toolbar B/I/U/H1–H3/lists/undo/redo with active states; title rename; 800 ms debounced save with status line; refresh preserves formatting. Files: `app/docs/[id]/page.tsx`, `components/Editor.tsx`, `components/Toolbar.tsx`. Dep: T1.2.
- [ ] **T1.5 (S) Route test: viewer PATCH → 403, stranger GET → 404.** Files: `tests/api.test.ts`. ✅ **Checkpoint 1** + redeploy.

## Phase 2 — Sharing
- [ ] **T2.1 (M) Shares API.** AC: owner adds by email (unknown → 404 message), changes role, removes; non-owner → 403. Files: `app/api/documents/[id]/shares/**`.
- [ ] **T2.2 (M) Share dialog + read-only mode.** AC: people list with role selects; role chip in header; viewer sees banner + disabled toolbar + non-editable body. Files: `components/ShareDialog.tsx`, Editor.
- [ ] **T2.3 (S) Link sharing.** AC: owner toggles Off/View/Edit + copy link; `/share/[token]` grants `max(existing, link)` and redirects; off → "Link sharing is off". Files: `app/api/documents/[id]/link/route.ts`, `app/share/[token]/page.tsx`. ✅ **Checkpoint 2** + redeploy.

## Phase 3 — In & out
- [ ] **T3.1 (S) content.ts converters — tests first.** AC: md headings/lists/bold → HTML; `<script>`/`onerror` stripped; HTML → md. Files: `lib/content.ts`, `tests/content.test.ts`.
- [ ] **T3.2 (M) Import.** AC: dialog shows "`.txt, .md, .docx` · up to 2 MB"; good file → new doc opened; bad type → 415 message; >2 MB → 413 message. Files: `app/api/import/route.ts`, `components/ImportDialog.tsx`.
- [ ] **T3.3 (S) Export + print.** AC: File menu → Download .md / .html, Print / Save as PDF; filenames from the title. Files: `app/api/documents/[id]/export/route.ts`, `app/docs/[id]/print/page.tsx`.
- [ ] **T3.4 (S) Make a copy.** AC: "Copy of <title>" owned by me, opens it. Files: `app/api/documents/[id]/copy/route.ts`. ✅ **Checkpoint 3** + redeploy.

## Phase 3b — Stretch (in order, only if ahead of schedule)
- [ ] **T3.5 (M) Access requests.** Viewer "Request edit access" → owner sees it in the Share dialog → Approve/Deny.
- [ ] **T3.6 (S) .docx export** via `html-to-docx`.
- [ ] **T3.7 (M) Attachments** (bytea, ≤ 2 MB) — real or not at all.

## Phase 4 — Ship (starts by 14:30 no matter what)
- [ ] **T4.1** README (setup, env, seed users, run, test, deploy, feature status: working / partial / next 2–4h).
- [ ] **T4.2** Finalize ARCHITECTURE.md, AI_WORKFLOW.md; write SUBMISSION.md.
- [ ] **T4.3** Screenshots; record the 3–5 min video; `VIDEO_URL.txt`.
- [ ] **T4.4** Upload to the Drive folder; final click-through on the live URL with all 3 users.
