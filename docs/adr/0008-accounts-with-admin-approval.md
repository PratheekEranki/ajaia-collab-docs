# ADR-0008: Email + password accounts with admin approval

**Status:** Accepted · 2026-11-13 · **Supersedes [ADR-0004](0004-demo-signin-with-signed-cookie.md)**

## Context
The first build used a one-click "pick a seeded user" sign-in (ADR-0004). Product review (Pratheek): real teams don't self-provision freely. People request access and an admin approves or creates their accounts. That workflow is part of how the product would actually be used, so it's worth showing.

## Decision
- **Sign-in** with email + password. Passwords are hashed with **bcrypt** (10 rounds). Wrong email and wrong password return the same message so emails can't be enumerated.
- **Sign-up = access request.** `POST /api/signup` creates a `PENDING` user. Pending users can't sign in (403 "waiting for approval").
- **Admins** (`User.isAdmin`) get an **Accounts** page: approve/deny requests (deny deletes the pending row so the person can re-apply), **create accounts directly** with a temporary password, and grant/revoke admin. An admin can't remove their own admin flag, so there is always at least one.
- Sessions are unchanged: an HMAC-signed httpOnly cookie. `getCurrentUser` now also requires `status = ACTIVE`, so removing or un-approving a user ends their access on the next request.
- **Reviewer access:** seeded Alice (admin), Bob and Carol share the public demo password `ajaia-demo`, shown on the sign-in page with click-to-fill buttons.
- Sharing only resolves emails of **active** accounts.

## Alternatives considered
- **Keep the demo picker:** fastest for reviewers, but it doesn't show how access is actually governed.
- **Auth.js / Neon Auth (Managed Better Auth):** production-grade (OAuth, email verification, resets), but needs provider setup and email delivery that reviewers can't verify in the timebox. It's the right next step and is listed in the README.
- **Invite links instead of approvals:** good later. Approval matches the requested "admins create and approve accounts" flow.

## Consequences
- More realistic access model, with an admin console reviewers can try (as Alice).
- Not included: password reset, email verification, rate limiting on sign-in, session revocation list. All are listed as next steps.
- My automated browser checks can't type passwords into the production site. Auth flows are verified with API e2e tests and by a human click-through.
