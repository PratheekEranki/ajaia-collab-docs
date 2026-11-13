# ADR-0005: Debounced autosave, last write wins, no real-time

**Status:** Accepted · 2026-11-13

## Context
Users expect Google Docs–style saving with no Save button. Real-time co-editing (CRDT/OT + websockets) is a multi-day feature and isn't in the core requirements.

## Decision
- The editor autosaves **800 ms after the last change** via `PATCH /api/documents/:id`. The title saves on change with the same debounce.
- The header shows a status line: `Saving…` / `Saved · 2:41 PM` / `Couldn't save — check your connection`. A `beforeunload` warning appears while a save is pending.
- Concurrent edits from two users: **last write wins**.
- "Save as" from the original idea becomes **Make a copy** (a Save button is meaningless with autosave).

## Alternatives considered
- **Explicit Save button:** easy to lose work, and it doesn't match the inspiration product.
- **Yjs + websocket provider:** the right long-term answer, but Vercel functions don't hold sockets and it would consume the timebox.
- **Optimistic locking (409 on stale `updatedAt`):** good next step and cheap to add. Deferred and listed in "next 2–4 hours".

## Consequences
- Simple and reliable for the single-editor case.
- Two editors typing at the same moment can overwrite each other. Documented as a known limitation.
