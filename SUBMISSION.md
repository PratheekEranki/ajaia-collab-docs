# Submission — Ajaia Docs (Pratheek Eranki)

| Item | Where |
|---|---|
| **Live product** | https://ajaia-collab-docs-teal.vercel.app |
| **Source code** | This folder · also https://github.com/PratheekEranki/ajaia-collab-docs |
| **Test accounts** | `alice@ajaia.dev` (admin), `bob@ajaia.dev`, `carol@ajaia.dev`. Password `ajaia-demo` for all. Details and a 3-minute review path in [README.md](README.md#test-accounts) |
| **README** (setup, run, test, deploy, status) | [README.md](README.md) |
| **Architecture note** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), with decision records in [docs/adr/](docs/adr/README.md) |
| **AI workflow note** | [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) |
| **Walkthrough video** | [VIDEO_URL.txt](VIDEO_URL.txt) |
| **Screenshots** | [docs/screenshots/](docs/screenshots/) |
| Product spec & plan | [docs/SPEC.md](docs/SPEC.md), [tasks/plan.md](tasks/plan.md), [tasks/todo.md](tasks/todo.md) |
| Automated tests | `tests/` (unit + end-to-end API suite). See README → Tests |

## What is working
All features in the README's Features table, end to end on the live URL:
- rich-text editing with fonts, colours, highlighter and alignment
- autosave and persistence
- owner/editor/viewer sharing by email or link, plus access requests
- accounts with admin approval
- import of .txt/.md/.docx
- export to Markdown, HTML, Word and PDF
- attachments
- comments and version history (with restore)

## What is incomplete / deliberately cut
Real-time co-editing, anchored comment threads / suggestion mode, email delivery, password reset, and sign-in rate limiting. The reasons are in README → Status and in the ADRs.

## What I'd build next (2–4 hours)
Optimistic concurrency on save → anchored comments and suggestion mode → version diffs → email invites + password reset → rate limiting and object storage for attachments.
