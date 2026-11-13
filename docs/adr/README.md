# Architecture Decision Records

Never delete an ADR. If a decision changes, add a new one that supersedes it and mark the old one's status.

| # | Decision | Status |
|---|---|---|
| [0001](0001-nextjs-monolith-on-vercel.md) | One Next.js app (UI + API) deployed on Vercel | Accepted |
| [0002](0002-neon-postgres-with-prisma.md) | Neon Postgres via Prisma | Accepted |
| [0003](0003-store-content-as-sanitized-html.md) | Store document content as sanitized HTML | Accepted |
| [0004](0004-demo-signin-with-signed-cookie.md) | Demo sign-in with seeded users + signed cookie | Superseded by 0008 |
| [0005](0005-autosave-last-write-wins.md) | Debounced autosave, last write wins, no real-time | Accepted |
| [0006](0006-sharing-model.md) | Owner + per-user roles, link sharing, access requests; no email sending | Accepted |
| [0007](0007-import-export-formats.md) | Import txt/md/docx as new docs; export md/html/pdf(print) | Accepted |
| [0008](0008-accounts-with-admin-approval.md) | Email + password accounts, admin approval and account creation | Accepted |
