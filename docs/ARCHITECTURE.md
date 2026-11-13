# Architecture Note — Ajaia Docs

## 1. What I prioritized and why

The brief rewards a **coherent, deployed product slice** over feature count. I put depth into the three things that make a "collaborative document" real:

1. **Rich text that survives a round trip.** Edit → autosave → refresh → identical formatting.
2. **An access model enforced on the server.** Owner / Editor / Viewer, with every API route checking capability. This is the part most demos fake with hidden buttons.
3. **Getting content in and out.** Import .txt/.md/.docx as new docs; export to Markdown, HTML and PDF.

I cut real-time co-editing, comments, version history, real auth and email sending. Each one is either a project of its own (co-editing needs CRDTs/websockets) or adds infrastructure reviewers can't verify (email). Rationale per decision is in `docs/adr/`.

## 2. System overview

```
 Browser (React, TipTap editor)
   │  fetch JSON / multipart
   ▼
 Next.js 15 on Vercel ── app router pages (server components) + /api route handlers
   │    lib/session.ts      → who is calling (signed httpOnly cookie)
   │    lib/permissions.ts  → what they may do (pure functions, unit-tested)
   │    lib/content.ts      → sanitize / import / export conversions
   ▼
 Prisma ORM  ──►  Neon Postgres (project billowing-boat, branch production)
```

One deployable unit (ADR-0001): the frontend, API and server rendering live in one Next.js app, so there is one build, one deploy and one URL for reviewers.

## 3. Data model

```prisma
model User {
  id        String   @id            // "alice", "bob", "carol" — readable seed ids
  email     String   @unique
  name      String
}

model Document {
  id         String   @id @default(cuid())
  title      String                      // 1–200 chars
  content    String   @default("")       // sanitized HTML (ADR-0003)
  ownerId    String
  linkRole   Role?                       // null = link sharing off
  linkToken  String   @unique @default(cuid())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  shares     DocumentShare[]
  requests   AccessRequest[]
  attachments Attachment[]               // Phase 3
}

model DocumentShare {                    // a grant of access to one user
  documentId String
  userId     String
  role       Role                        // VIEWER | EDITOR
  @@id([documentId, userId])
}

model AccessRequest {                    // viewer asks to become editor
  id         String   @id @default(cuid())
  documentId String
  userId     String
  status     RequestStatus @default(PENDING)   // PENDING | APPROVED | DENIED
  createdAt  DateTime @default(now())
}

model Attachment {                       // Phase 3, ≤ 2 MB, stored in Postgres (ADR-0006)
  id, documentId, filename, mimeType, size, data Bytes, uploadedById, createdAt
}

enum Role { VIEWER EDITOR }
```

Ownership lives on `Document.ownerId`, not in the shares table. "Owner" therefore can't be granted or removed by mistake, and there is exactly one per doc.

## 4. Access model (the security core)

`lib/permissions.ts` is pure: `(doc, shares, userId) → role`. It never touches the DB, so it's unit-testable in milliseconds.

| Capability | Viewer | Editor | Owner |
|---|:-:|:-:|:-:|
| Read, export, make a copy | ✓ | ✓ | ✓ |
| Edit content & title, manage attachments | | ✓ | ✓ |
| Request edit access | ✓ | | |
| Share, change roles, link settings, approve requests, delete | | | ✓ |

Rules:
- **Effective role** = owner if `ownerId === user`, else the share row's role, else none.
- **No access → 404**, not 403, so document ids don't leak whether a doc exists.
- **Has access but lacks the capability → 403** with a message saying who can do it.
- **Link redemption never downgrades:** an Editor who opens a view-only link stays an Editor. Implemented as `maxRole(existing, link)`.
- Approving a request = upsert the share to EDITOR + mark the request APPROVED, in one transaction.

## 5. API contract

All JSON. Errors are always `{ error: { code, message } }` with codes `UNAUTHENTICATED 401 · FORBIDDEN 403 · NOT_FOUND 404 · VALIDATION 400 · TOO_LARGE 413 · UNSUPPORTED_TYPE 415 · CONFLICT 409`.

| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/session` `{userId}` · `DELETE /api/session` | anyone | demo sign-in / sign-out |
| `GET /api/documents?scope=owned\|shared` | user | list cards (title, preview, role, updatedAt) |
| `POST /api/documents` `{title?}` | user | create |
| `GET /api/documents/:id` | viewer+ | doc + my role + owner |
| `PATCH /api/documents/:id` `{title?, content?}` | editor+ | autosave target |
| `DELETE /api/documents/:id` | owner | delete |
| `POST /api/documents/:id/copy` | viewer+ | make a copy |
| `GET /api/documents/:id/export?format=md\|html\|docx` | viewer+ | download file |
| `GET /api/documents/:id/shares` | viewer+ | people with access (owner sees requests too) |
| `PUT /api/documents/:id/shares` `{email, role}` | owner | add or change a person |
| `DELETE /api/documents/:id/shares/:userId` | owner | remove a person |
| `PATCH /api/documents/:id/link` `{role: null\|"VIEWER"\|"EDITOR"}` | owner | link settings |
| `POST /api/documents/:id/requests` | viewer | request edit access |
| `PATCH /api/requests/:id` `{decision: "APPROVE"\|"DENY"}` | owner of the doc | resolve a request |
| `POST /api/import` (multipart `file`) | user | file → new doc |
| `/api/documents/:id/attachments[...]` | P2 | list, upload, download, delete |

Pages: `/` (sign-in or dashboard) · `/docs/:id` (editor) · `/docs/:id/print` (PDF) · `/share/:token` (link redemption).

## 6. Key flows

**Autosave.** The TipTap `onUpdate` handler debounces for 800 ms, then sends `PATCH {content: editor.getHTML()}`. The server re-checks the editor role, sanitizes and saves, and the client shows "Saved · time". On failure it shows an error and retries on the next change. Last write wins (ADR-0005).

**Import.** multipart → check size (≤ 2 MB) and extension → convert (`txt`: escape + paragraphs · `md`: marked · `docx`: mammoth) → **sanitize** → create doc → redirect to the editor.

**Export.** HTML: the sanitized content wrapped in a minimal styled page. Markdown: turndown. PDF: `/docs/:id/print` with print CSS, where the user picks "Save as PDF" (ADR-0007).

## 7. Security (STRIDE, scoped to this app)
| Threat | Mitigation |
|---|---|
| **Spoofing** another user by editing the cookie | Session cookie is HMAC-signed with `SESSION_SECRET`, httpOnly, SameSite=Lax, Secure in production. (Demo sign-in itself is intentionally open, ADR-0004) |
| **Tampering** via direct API calls | Every mutating route re-derives the role server-side; tests cover viewer-PATCH → 403 |
| **XSS** through doc content or imported files | Content is sanitized on every write with an allowlist (p, h1–h3, strong, em, u, s, ul/ol/li, blockquote, code, pre, br, a[href http/https/mailto]) |
| **Info disclosure** of doc existence | 404 for no-access, unguessable cuid ids and link tokens |
| **DoS** via uploads | 2 MB cap enforced before parsing, plus an extension and MIME allowlist |
| **Elevation** through link sharing | Link role is capped at EDITOR, can never grant owner, and never downgrades |

Secrets (`DATABASE_URL`, `SESSION_SECRET`) live in `.env` / `.env.local` locally (gitignored) and in Vercel env vars in production.

## 8. Known limitations (honest list)
- Two people editing the same doc at once: last write wins, with no live merge (ADR-0005).
- Demo sign-in means anyone can act as any seeded user. That's fine for a review build and never for production.
- PDF export depends on the browser's print dialog.
