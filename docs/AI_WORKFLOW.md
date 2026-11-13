# AI Workflow Note

## Tools used
- **Claude (claude.ai, agentic mode)** as the main pair-engineer: planning, spec and ADRs, a clickable design prototype, code generation, tests, and driving the browser for GitHub/Vercel/Neon setup.
- **Claude skills, chosen deliberately per phase:**
  - *spec-driven-development* → `docs/SPEC.md`
  - *planning-and-task-breakdown* → `tasks/`
  - *documentation-and-adrs* → `docs/adr/`
  - *api-and-interface-design* → one error shape, validation at the edges
  - *security-and-hardening* → STRIDE table, sanitizer, signed cookie, bcrypt
  - *test-driven-development* → permission and sanitizer tests written before the code
  - *frontend-design* → the prototype and visual language
  - *ponytail* → minimal code, deliberate `ponytail:` comments where corners were cut
  - the **Neon agent skill** → driver choice for Vercel
- *(Add any IDE assistant you used yourself, e.g. Copilot.)*

## Where AI materially sped things up
- **Scoping:** turned the brief into a prioritized spec, 8 ADRs and a phased plan in ~15 minutes, so every later decision had a written "why".
- **Prototype before code:** a clickable prototype of the whole flow (sign-in → dashboard → editor → share → import) let me react to real screens and change scope (roles, link sharing, access requests) before writing any code.
- **Boilerplate at volume:** ~20 API routes sharing one error/validation/permission pattern, the TipTap toolbar, the font-size extension, import/export converters, and the admin console.
- **Setup:** created the GitHub repo, the Vercel project and the deploy wiring through the browser, and diagnosed environment issues fast.

## What AI-generated output I changed or rejected
- **Rejected sending real share emails:** it needs a verified domain + mail provider, and reviewers can't check seeded inboxes. Sharing by email now resolves to an existing account.
- **Rejected a "demo-only" attachments button** in favour of building attachments for real. A control that doesn't work costs more trust than a missing feature.
- **Replaced "Save / Save as"** with autosave + *Make a copy*, since a Save button means nothing with autosave.
- **Overrode the first auth design.** The AI-recommended one-click demo sign-in (allowed by the brief) was replaced, at my direction, with email/password accounts and admin approval, which is how access works in real teams. Recorded as ADR-0008, superseding ADR-0004.
- **Expanded the editor beyond the brief's minimum** (fonts, sizes, colours, highlighter, alignment). The original sanitizer stripped all inline styles, so we rewrote it as a per-property style allowlist with CSS-injection tests.
- **Rejected Vercel's Neon Marketplace integration:** it would have created a second, separate database. We used env vars pointing at the existing Neon project.
- **Fixed toolchain issues the generated setup introduced:**
  - TypeScript 7 broke `next.config.ts` loading, so I pinned TS 5.
  - Vite silently reserves `BASE_URL`, which skipped the e2e suite, so I renamed it to `APP_URL`.

## How I verified correctness, UX quality and reliability
- **Permissions are pure and unit-tested** (`lib/permissions.ts`), and an **end-to-end suite runs against the deployed app**. It proves the server returns 401/403/404 for each forbidden action, not just that buttons are hidden.
- **The e2e tests caught a real deployment mistake:** the first run hit `ajaia-collab-docs.vercel.app`, which is *someone else's* Vercel project. The mismatched error format exposed it, and we switched to our real `-teal` domain.
- **Security tests for the sanitizer:** `<script>`, `onerror=`, `javascript:` links, `url()`/`position`/`expression()` in styles. Attachment downloads are checked for `nosniff`.
- **Full suite: 46/46 passing** (27 unit + 19 e2e) against a production build running locally on the same Neon database as the live site. A first run against the dev server showed a timeout in the request→approve test. Investigation showed every call answered in about 1 s by hand, and the slowness came from on-demand route compilation in dev mode, not from the app. So we documented running e2e against `next build && next start`.
- **Manual click-throughs on the live URL** with each role:
  - formatting persists after refresh
  - the autosave status changes correctly
  - viewers get a read-only banner and a disabled toolbar
  - the Share dialog's role changes take effect for the other user
- **A guardrail I kept:** the AI agent wasn't permitted to type passwords into the production site, so authenticated flows were verified by the API suite and by my own click-through.
