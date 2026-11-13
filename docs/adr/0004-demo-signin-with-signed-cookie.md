# ADR-0004: Demo sign-in with seeded users and a signed cookie

**Status:** Superseded by [ADR-0008](0008-accounts-with-admin-approval.md) · 2026-11-13

## Context
Sharing can only be demonstrated with more than one user. Real auth (passwords, OAuth, email magic links) costs time and makes reviewers create accounts. The brief explicitly allows seeded or mocked users.

## Decision
Seed three users: **Alice Chen** (alice@ajaia.dev), **Bob Rivera** (bob@ajaia.dev) and **Carol Okafor** (carol@ajaia.dev). The sign-in page lists them, and choosing one calls `POST /api/session`, which sets an **HMAC-signed, httpOnly, SameSite=Lax** cookie holding the user id (Secure in production). `lib/session.ts` verifies the signature and loads the user on every request. "Switch user" clears the cookie.

## Alternatives considered
- **Unsigned cookie / localStorage user id:** anyone could edit it. Signing costs about 15 lines with Node `crypto`.
- **NextAuth/Auth.js or Neon Auth:** real, but needs provider setup and makes reviewers create accounts. A poor trade for this timebox.

## Consequences
- Reviewers switch users in one click to test sharing.
- **Not production auth:** anyone can sign in as anyone. This is stated in the README and the UI ("Demo sign-in · no passwords").
- Swapping in real auth later only changes `lib/session.ts`. Permission logic stays as it is.
