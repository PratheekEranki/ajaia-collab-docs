# ADR-0001: One Next.js app (UI + API) deployed on Vercel

**Status:** Accepted · 2026-11-13

## Context
There's a ~4h timebox and the brief requires a live URL reviewers can test. Separate frontend and backend services would mean two builds, two deploys, CORS and two sets of env vars.

## Decision
Use a single **Next.js 15 (App Router, TypeScript)** app. Pages load data in server components; mutations go through `/api` route handlers. Deploy on **Vercel's free tier**.

## Alternatives considered
- **Vite SPA + Express API:** more moving parts and two hosts. Rejected for time.
- **Remix / SvelteKit:** comparable, but Next.js has the smoothest Vercel deploy path and the largest ecosystem for TipTap examples.
- **Render/Railway with a long-running server:** free tiers sleep or need a card. Vercel doesn't.

## Consequences
- One repo, one deploy, one URL. Server-side permission checks sit next to the data access.
- Serverless functions are stateless with request size limits, so uploads are capped at 2 MB and there are no websockets (no real-time, see ADR-0005).
