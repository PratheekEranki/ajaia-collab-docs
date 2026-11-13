# ADR-0006: Sharing model — owner, per-user roles, link sharing, access requests

**Status:** Accepted · 2026-11-13

## Context
The brief requires an owner, a way to grant access, and a visible owned/shared distinction. Product direction from Pratheek: grant access directly, by email or by link; allow changing permissions; let someone with access request more.

## Decision
- **Owner** is a column on `Document` (exactly one, not transferable in scope).
- **Grants** are `DocumentShare(documentId, userId, role)` with role `VIEWER | EDITOR`. The owner adds a person **by picking them or typing their email**, and can change the role or remove them.
- **No email is sent.** Typing an email resolves to an existing account; an unknown email returns "No account uses that email." (Sending mail needs a verified domain and a mail provider, and reviewers can't check seeded inboxes.)
- **Link sharing:** `Document.linkRole` (null = off) + `linkToken`. `/share/:token` requires sign-in, then upserts a share at `max(existing, linkRole)`, so it never downgrades and never grants owner.
- **Access requests:** a Viewer can request EDITOR. There's one pending request per (doc, user). The owner approves (share → EDITOR, transactional) or denies.
- All checks live in pure `lib/permissions.ts` and are enforced in every route.

## Alternatives considered
- **Single "has access" flag:** meets the minimum, but can't show read-only behavior. Roles cost ~20 min and are on the brief's stretch list.
- **Access-control list with arbitrary capabilities:** over-engineered for three roles.
- **Real invitations by email:** cut for the reasons above. Listed as a next step (Resend + invite tokens).

## Consequences
- The demo shows owner/editor/viewer behaving differently, with server-side enforcement provable by tests.
- Link sharing + requests add two small tables/columns and a handful of routes, all owner-gated.
