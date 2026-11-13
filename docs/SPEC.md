# Ajaia Docs — Product & Technical Spec

> Living document. Update it when a decision or scope changes, and commit it with the code.
> Last updated: 2026-11-13 · Owner: Pratheek Eranki
>
> **Status at submission:** every P0, P1 and P2 item below is built and deployed. Scope added during the build after product review: rich formatting (D8), accounts with admin approval (A3–A5, superseding A1), attachments (F6) and Word export (F4). Cut items are unchanged.

## 1. Objective

Build a lightweight collaborative document editor (Google Docs–inspired) for internal teams. It ships as a **working, deployed, testable slice** inside a ~4-hour timebox.

The product is about **ownership and sharing of rich-text documents**. A user can create, edit and organize documents, bring content in from files, share them with teammates at the right permission level, and get content back out in other formats.

**Who uses it:** internal team members (simulated by 3 seeded accounts).
**What reviewers must be able to do in under 5 minutes:** sign in as Alice, create and format a doc, share it with Bob as a viewer, switch to Bob, see it under "Shared with me" as read-only, request edit access, switch back to Alice, approve, and see that it persists after refresh.

### Success criteria
- Every P0 requirement below works end to end on the live URL.
- Formatting survives save → refresh → reopen.
- The server rejects any write a user is not permitted to make (verified by tests, not just hidden buttons).
- README lets a reviewer run it locally in under 5 minutes.

## 2. Requirements

Priority: **P0** = must ship · **P1** = ship after P0 is deployed · **P2** = only if time remains · **Cut** = documented, not built.

### 2.1 Documents (P0)
| ID | Requirement | Acceptance criteria |
|---|---|---|
| D1 | Create a document | "New document" creates an "Untitled document" owned by me and opens the editor |
| D2 | Rename | Editing the title in the editor header saves it (autosave). Empty titles are rejected (400) and the UI restores the last good title |
| D3 | Rich-text editing | Bold, italic, underline, H1/H2/H3, bulleted and numbered lists, undo/redo |
| D4 | Autosave | Changes save ~800 ms after typing stops. Status line shows `Saving…` → `Saved · 2:41 PM`, or `Couldn't save — retrying` on failure |
| D5 | Reopen | Refreshing or reopening shows the same content with the same formatting |
| D6 | Dashboard | Two tabs, **My documents** and **Shared with me**, each sorted by last updated. Cards show title, preview, an ownership tag and the time |
| D8 | Rich formatting (added) | Font family, font size, text colour, highlighter, alignment, strikethrough, clear formatting; persisted and exported to HTML/Word |
| D7 | Delete | The owner can delete a document after a confirm step. Non-owners cannot (403) |

### 2.2 File handling
| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| F1 | P0 | Import a file as a new document | Accepts `.txt`, `.md`, `.docx` ≤ 2 MB. Headings, lists, bold/italic carry over. The new doc is owned by the importer |
| F2 | P0 | Reject bad files clearly | Wrong type or too large → inline error naming the file, the allowed types and the size limit. Nothing is created |
| F3 | P1 | Export | Download as **Markdown** (.md) and **HTML** (.html); **PDF** via a print-optimized view (browser "Save as PDF") |
| F4 | P2 | Export as **.docx** | Downloads a Word file that opens with formatting intact |
| F5 | P1 | **Make a copy** (Save As) | Creates "Copy of <title>" owned by the current user. Requires view access to the source |
| F6 | P2 | Attachments on a document | Upload a file (≤ 2 MB, any common type) attached to a doc. Anyone with access can see and download it; editors and the owner can add or remove. See open question Q2 |

### 2.3 Sharing & access (P0 unless noted)
| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| S1 | P0 | Every doc has exactly one owner | The creator or importer is the owner; ownership is never transferred in this scope |
| S2 | P0 | Share with a person | The owner picks a teammate **or types their email** and chooses **Viewer** or **Editor** |
| S3 | P0 | Change or remove access | The owner can switch a person's role or remove them; the change applies on that person's next request |
| S4 | P0 | Visible owned vs shared | Dashboard tabs, an ownership tag on each card, and a role chip in the editor header (Owner / Editor / Viewer) |
| S5 | P0 | Enforced permissions | Viewer: read, export, copy. Editor: viewer + edit content/title + manage attachments. Owner: editor + share, link settings, delete. **Enforced in API routes**; the UI only mirrors it |
| S6 | P1 | Share by link | The owner sets link access to Off / Anyone with the link can view / can edit. Opening `/share/<token>` while signed in grants that role (never downgrades existing access) |
| S7 | P2 | Request more access | A viewer can "Request edit access" (one pending request per user per doc). The owner sees pending requests in the Share dialog and can Approve (→ Editor) or Deny |
| S8 | Cut | Email invitations | No mail is sent: sharing by email resolves to an existing account. Unknown email → "No account uses that email" |

### 2.4 Identity
| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| A3 | P0 | Email + password sign-in (added, supersedes A1) | bcrypt; generic error for wrong credentials; pending accounts get a clear "waiting for approval" |
| A4 | P0 | Request an account | `/signup` creates a PENDING account |
| A5 | P0 | Admin console | Admins approve/deny requests, create accounts, grant/revoke admin; can't remove own admin |
| A1 | ~~P0~~ | ~~Demo sign-in~~ (superseded by ADR-0008) | A sign-in page lists 3 seeded users. Picking one sets a signed, httpOnly session cookie. "Switch user" signs out |
| A2 | P0 | Protected pages | Signed-out visits to `/docs/*` or `/api/*` → redirect to sign-in or 401 |

## 3. Commands

```bash
npm install            # install deps (runs prisma generate)
npm run db:push        # create tables on the Neon database in .env
npm run db:seed        # seed Alice, Bob, Carol + sample docs (idempotent)
npm run dev            # http://localhost:3000
npm test               # vitest unit + route tests
npm run build          # production build (must pass before deploy)
```

## 4. Project structure

```
app/
  page.tsx                    # sign-in picker OR dashboard (server component)
  docs/[id]/page.tsx          # editor page (server loads doc + role)
  docs/[id]/print/page.tsx    # print view for PDF export
  share/[token]/page.tsx      # link-share redemption
  api/…                       # route handlers (see ARCHITECTURE.md §5)
components/                   # client components: Editor, Toolbar, ShareDialog, ImportDialog…
lib/
  db.ts                       # Prisma client singleton
  session.ts                  # signed-cookie session (getCurrentUser, require user)
  permissions.ts              # PURE role/capability logic — the security core
  content.ts                  # sanitize HTML, import converters, export converters
  api.ts                      # error helper + zod parsing at the boundary
prisma/schema.prisma, prisma/seed.ts
tests/                        # vitest
docs/                         # SPEC, ARCHITECTURE, ADRs, AI_WORKFLOW
tasks/                        # plan.md, todo.md
```

## 5. Code style
- TypeScript strict. Server components for data loading; client components only where interaction is needed.
- **Validate at the edge, trust inside:** every route parses input with zod and calls `permissions.ts` before touching data.
- One error shape everywhere: `{ "error": { "code": "FORBIDDEN", "message": "Only the owner can share this document." } }`.
- No speculative abstractions (ponytail). Corners cut on purpose get a `// ponytail:` comment naming the limit.
- Comment the *why*, not the *what*.

## 6. Testing strategy
- **Unit (most):** `permissions.ts` (owner/editor/viewer/stranger/link roles, never-downgrade rule), `content.ts` (md/txt/docx → sanitized HTML; script tags stripped; HTML → markdown).
- **Route-level:** a viewer's PATCH returns 403, a stranger's GET returns 404, an unknown share email returns 404, an oversized import returns 413. Runs against the DB in `.env` (a Neon dev branch), skipped if absent.
- **Manual E2E checklist** (in README) on the deployed URL before submission.
- Bugs found: write the failing test first (prove-it pattern).

## 7. Boundaries
**Always:** validate input with zod; check permissions server-side; sanitize stored HTML; keep secrets in `.env` (gitignored); keep the deploy green.
**Ask first:** adding a paid service; changing the auth model; any schema change after the first deploy that drops data.
**Never:** commit `.env`; render user HTML outside the sanitizer; ship a button that doesn't work.

**Out of scope (documented in README):** real-time co-editing and presence, comments and suggestions, version history, real authentication/passwords, sending email, ownership transfer, folders/search.

## 8. Assumptions (surfaced, not silently filled)
1. "Share via mail" = share by typing an email that matches an account; no message is sent (S8).
2. "Save" is covered by autosave; "Save as" = **Make a copy** (F5).
3. Link sharing requires the visitor to be signed in, so every access is tied to a known user.
4. An access request upgrades viewer → editor only (no request for ownership).
5. A 2 MB upload limit keeps imports and attachments inside serverless request limits.

## 9. Open questions
- **Q1:** Should a user with *no* access who opens a doc URL be able to "Request access"? Current plan: no. They see "You don't have access", which avoids revealing that the doc exists.
- **Q2 (attachments):** The original idea was a demo version first. The plan is to **build it for real in Phase 3** (files stored in Postgres, ≤ 2 MB) and not ship a non-working button. Confirm, or drop it to "next steps".
