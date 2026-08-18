# Stable ids for mechanism-arrow anchors

**Date:** 2026-08-16
**Status:** Accepted

## Decision

Give every atom and bond that a mechanism arrow anchors to an explicit **stable id**, written into KET as an optional extra field, and record each arrow's anchors a second time in terms of those ids. Stamp both once, on the caller's structure, before any cloning; resolve the numeric anchors back from them in a single pass after a file has been fully read.

The ids are **opt-in**: only referenced atoms and bonds get one.

## Context

Mechanism arrows already anchor semantically — a lone pair on an atom, a bond, a radical — rather than to raw coordinates, and those anchors are already serialized. But an anchor names its atom by *Pool id*, and a Pool id does not survive a save.

Saving re-keys the atoms three times: per fragment on the way into the drawing-entity model, again when the fragments are merged into a fresh structure, and again when each is cloned out for writing. The writer then emits atoms **positionally**, one node per fragment, with no identity of their own. Pool ids are monotonic and never reused, so a deletion leaves a hole that a reload closes up.

None of those hops rewrite the anchors. Two failure modes follow, both silent:

- **Interleaved fragments.** Build a nucleophile, then a substrate, then extend the nucleophile, and the ids alternate between fragments. Export groups by fragment, so the numbering no longer coincides and every anchor lands on a different atom. This is how a person actually draws; the committed fixtures happen to be numbered contiguously and survive by luck, which is why the bug went unnoticed.
- **Sparse pool.** Delete any atom below an anchored one and the reload shifts everything above it.

The consequence is worse than a cosmetic glitch: an arrow keeps its curve and its arrowhead but now describes different chemistry, with nothing on screen to say so. It also blocks the mechanism trainer entirely, whose stored answers are anchor pairs.

## Alternatives considered

- **Remap the anchors at the KET boundary.** Rejected: it fixes only the last of the three renumberings. The public save path has already renumbered twice before the writer sees the structure, so the mapping needed would have to be threaded through the drawing-entity conversion and the merge as well — exactly the per-hop bookkeeping this decision avoids.
- **Always write stable ids, for every atom.** Rejected: it changes the output of every file the editor produces and widens the diff against upstream for no benefit to structures that have no mechanism arrows.
- **Make the anchors chemical rather than positional** (name the atom by element, neighbours, charge). Rejected: not unique — a mechanism routinely has several identical atoms — and it would break the moment the learner edits the structure, which is the case the trainer most needs to survive.
- **Keep positional ids and simply forbid the situations that break them.** Rejected: the two triggers are ordinary editing, not edge cases.
- **Stamp inside the writer rather than on the caller's structure.** Rejected: by then the ids have already moved, so the stamping reads a renumbered structure and mints tokens for the wrong atoms. The stamp has to happen while the numeric anchors still agree with the structure — which means mutating the caller's structure, accepted deliberately as the metadata is inert and idempotent.

## Consequences

- Atoms and bonds gained an identity field that is **not** part of their chemical attribute list, so it stays out of property dialogs and operation diffs. It has to be named explicitly in their constructors, because cloning rebuilds them from named attributes only and would otherwise drop it.
- Mechanism arrows gained a parallel anchor bundle carried alongside the numeric one, which also has to ride through the drawing-entity conversion.
- The KET schema gained three optional fields, so the precompiled schema must be regenerated whenever it changes.
- Arrow identifiers are now persisted, but only for mechanism arrows — every arrow has one, and writing it for plain reaction arrows would change the output of existing reaction files.
- Files without the new fields load exactly as before, and an unresolvable id keeps its stored number rather than dropping the anchor.
- **Not fixed:** lone-pair and radical indices within an atom remain positional, valid only while the atom's valence, charge, neighbour geometry and hydrogen side are unchanged. A locked structure holds them still; a freely edited one does not.
