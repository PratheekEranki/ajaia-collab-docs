# ADR-0002: Neon Postgres via Prisma

**Status:** Accepted · 2026-11-13

## Context
Documents and sharing data must persist across refreshes and deploys. Vercel's filesystem is ephemeral, so SQLite files there would be wiped. Reviewers must not have to pay for anything.

## Decision
Use **Neon serverless Postgres** (free tier; project `billowing-boat-63532410`, branch `production`), linked with the Neon CLI (`neon.ts`, `.neon`). Access it through **Prisma 6**, using the **pooled** connection string at runtime. Use a Neon **dev branch** for local work and tests so tests never touch production data. Final driver choice follows the Neon agent skill's guidance for Next.js on Vercel and gets recorded here if it differs.

## Alternatives considered
- **SQLite:** simplest locally, but data doesn't persist on Vercel.
- **Supabase:** also fine, but it bundles auth/storage we don't use. Neon branching gives isolated test data cheaply.
- **Raw SQL with `@neondatabase/serverless`:** lighter, but we'd lose typed queries, schema push and seed tooling. Prisma's schema file also doubles as data-model documentation.

## Consequences
- A typed schema in `prisma/schema.prisma`; `prisma db push` + seed get a fresh DB running in one command.
- Cold-start latency of a few hundred ms on the free tier is acceptable.
- A schema change that drops data needs approval after the first deploy (see SPEC §7).

## Update — 2026-11-13 (driver + deploy wiring)
- Following the Neon agent skill's guidance for Vercel, Prisma runs through **`@prisma/adapter-pg` on a `pg` Pool registered with `attachDatabasePool`** (`lib/db.ts`).
- Runtime uses pooled `DATABASE_URL`; `prisma db push` uses direct `DATABASE_URL_UNPOOLED` (`directUrl`), since migrations over the pooler can fail.
- Vercel runs `vercel-build` = generate → `db push` → idempotent seed → `next build`. `db push` refuses destructive changes without `--accept-data-loss`, so a bad schema change fails the deploy instead of dropping data.
