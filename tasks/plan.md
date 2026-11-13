# Implementation Plan

Source of truth for scope: `docs/SPEC.md`. Design: `docs/ARCHITECTURE.md`, `docs/adr/`.
Hard stop: **~3:10 PM CT (Nov 13)**, the end of the 4h assessment timer. The final 40 min are reserved for submission work.

## Strategy
- **Vertical slices** (DB → API → UI → test) so that every checkpoint leaves a working, deployable app.
- **Deploy early** (end of Phase 0) and redeploy at every checkpoint. If time runs out, the last checkpoint is the submission.
- **Permissions first:** `lib/permissions.ts` + its tests are written before any route uses them (TDD).
- **Minimal code (ponytail):** platform features before libraries, no speculative abstractions, and never cut corners on validation, auth checks or accessibility.

## Dependency map
```
schema + seed ─► session ─► permissions(+tests) ─► documents API ─► dashboard ─► editor/autosave
                                         │                                   │
                                         ├─► shares API ─► share dialog ─────┤
                                         ├─► link API ─► /share/[token]      │
                                         └─► requests API ─► request UI      │
content.ts(+tests) ─► import API ─► import dialog                            │
                  └─► export API ─► export menu + print page ◄───────────────┘
```

## Phases & checkpoints

| Phase | Window (CT) | Scope | Checkpoint (must be true to move on) |
|---|---|---|---|
| **0. Foundation** | 11:55–12:25 | Neon link + env, Prisma schema, seed, session, layout, sign-in page, Vercel deploy | Live URL shows sign-in; picking a user shows their name; data comes from Neon |
| **1. Core docs** | 12:25–13:25 | permissions.ts + tests, documents API, dashboard tabs, editor with toolbar, rename, autosave, delete | Create → format → refresh → identical. Viewer PATCH → 403 test passes. Redeployed |
| **2. Sharing** | 13:25–14:05 | shares API (user/email, role change, remove), share dialog, role chip, read-only mode, link sharing | Alice shares to Bob as Viewer → Bob sees it read-only on the live URL. Link grant works |
| **3. In & out** | 14:05–14:30 | content.ts + tests, import (.txt/.md/.docx), export md/html, print/PDF, make a copy | Import each type on the live URL; bad file shows the error; downloads open correctly |
| **3b. Stretch** | only if ahead | access requests → docx export → attachments (in that order) | Each item is only merged when it fully works |
| **4. Ship** | 14:30–15:10 | README, ARCHITECTURE final, AI_WORKFLOW, SUBMISSION.md, screenshots, video, Drive folder | Fresh-clone README run works; all deliverables in Drive |

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Neon/Vercel auth or env setup eats time | Done first (Phase 0) while the code is small. Fallback: local Postgres for dev, deploy later |
| TipTap SSR/hydration issues in Next 15 | Load the editor client-only (`immediatelyRender: false`) |
| docx parsing size/edge cases | 2 MB cap, mammoth only, with a clear error on failure |
| Scope creep from stretch items | Stretch only starts after the Phase 3 checkpoint is deployed |
| Running out of time for video/docs | Phase 4 is time-boxed and non-negotiable. Docs are drafted now (this set) |

## Verification per phase
`npm test` · `npm run build` · a manual click-through of that phase's checkpoint on the deployed URL · append to `docs/AI_WORKFLOW.md` (what AI produced, what I changed/rejected).
