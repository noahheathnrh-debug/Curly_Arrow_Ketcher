# Architecture Decision Records

Each file in this directory documents one significant architectural decision.

## Convention

Each ADR explains:

- **Decision** — What was decided?
- **Context** — Why was a decision necessary?
- **Alternatives considered** — What other options were evaluated?
- **Rationale** — Why was this option chosen?
- **Consequences** — What are the long-term consequences?

## Naming

Use the format: `YYYY-MM-DD-short-decision-title.md`

Example: `2026-07-10-adopt-spec-driven-development.md`

## Records

- [2026-08-06 — Obstacle-aware mechanism arrow routing](./2026-08-06-obstacle-aware-mechanism-arrow-routing.md) — mechanism arrows carry semantic anchors at both ends; a pure router in `ketcher-core` chooses their shape by scoring candidates against collision geometry
- [2026-08-16 — Stable ids for mechanism anchors](./2026-08-16-stable-ids-for-mechanism-anchors.md) — anchored atoms and bonds carry an explicit id through KET, because Pool ids are renumbered several times on save and silently repoint every arrow
