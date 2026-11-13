# AI Workflow Note

> Running log. Fill it in as you go; it becomes the submission note. Keep it short and specific.

## Tools used
- **Claude (Claude app, agentic mode)**: planning, spec/ADR drafting, clickable design prototype, code generation, test writing, Neon CLI setup.
- **Claude skills used deliberately:** spec-driven-development (SPEC.md), planning-and-task-breakdown (tasks/), documentation-and-adrs (docs/adr), api-and-interface-design (API contract, error shape), security-and-hardening (STRIDE table, sanitizer, signed cookie), test-driven-development (permissions/content tests first), frontend-design (prototype look), ponytail (minimal-code rule).
- (Add: editor/IDE assistants you use, e.g. Copilot/Codex, if any.)

## Where AI materially sped things up
- Turned the brief into a scoped spec + 7 ADRs + a phased plan in ~15 min.
- Built a clickable prototype of the full flow *before* coding, so scope was decided on something concrete.
- (Add as you go: boilerplate routes, TipTap toolbar, converters, tests…)

## What I changed or rejected
- Rejected **sending real share emails**: needs a verified domain + mail provider, and reviewers can't verify it. Kept "share by email" as account lookup.
- Rejected shipping a **demo-only attachments button**. A control that doesn't work hurts trust more than a missing feature; built later for real or listed as next.
- Renamed **"Save / Save as"** → autosave + "Make a copy", because a Save button is meaningless with autosave.
- (Add as you go: generated code you rewrote, bugs the AI introduced, suggestions you overrode.)

## How I verified correctness, UX and reliability
- Permission rules are a pure module with unit tests; route tests prove the **server** rejects viewer writes (not just hidden buttons).
- Sanitizer tests with XSS payloads; import tests for each file type.
- Manual checklist on the deployed URL with all three seeded users.
- (Add: anything found during manual testing and how it was fixed.)
