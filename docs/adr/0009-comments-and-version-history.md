# ADR-0009: Lightweight comments and throttled version history

**Status:** Accepted · 2026-11-13

## Context
Both are on the brief's optional stretch list. They were added late in the timebox at Pratheek's request, so they needed to be small, safe and fully permission-checked.

## Decision
- **Version history:** the autosave `PATCH` creates a `DocumentVersion` **at most every 2 minutes per document** (autosave fires every ~800 ms, so unthrottled history would be noise). Readers can browse history. **Editors/owners restore**, and a restore first snapshots the current state in the same transaction, so a restore is itself undoable.
- **Comments:** document-level comments with an optional **quote of the selected text** rather than a live range anchor. Anyone with read access, viewers included, can comment. The author or editors can resolve/reopen. The author or the owner can delete.

## Alternatives considered
- **Snapshot on every save / an explicit "save version" button:** too noisy, or easy to forget.
- **Range-anchored comments (TipTap marks):** the right UX, but anchoring through concurrent edits and sanitizing comment marks is a project of its own. Listed as next.
- **Viewer ≠ commenter roles:** a fourth role adds UI and rules for little value at this scope.

## Consequences
- Version history doubles as the safety net for last-write-wins saves (ADR-0005).
- Other people's comments appear within ~5 s: the open panel polls while the tab is visible. True push (websockets / Neon Realtime) is a next step.
- Quotes can go stale if the text changes, which is acceptable for review-style comments.
