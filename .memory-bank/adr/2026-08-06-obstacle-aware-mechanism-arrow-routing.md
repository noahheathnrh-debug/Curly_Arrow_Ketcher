# Obstacle-aware routing for mechanism arrows

## Decision

Mechanism (curly and fishhook) arrows carry **semantic anchors at both ends** — an
electron source and an electron destination — and their curve shape is chosen by a
dedicated **router**: a pure, render-independent module in `ketcher-core` that scores
candidate curves against collision geometry built from everything drawn on the canvas.

The pipeline is strictly one-directional:

```
chemical meaning -> endpoint anchors -> candidate curves -> scoring -> shape
```

Chemistry decides the anchors. The router only ever chooses a shape, and never changes
what the arrow means.

## Context

Mechanism arrows previously stored a semantic anchor only at the **tail**
(`lpAttach` / `raAttach`, re-resolved every render). The head was a bare coordinate
captured once when the user released the pointer, and the curve was chosen by a small
heuristic that measured distance to atom *centres* only.

Three consequences followed, all visible in real drawings:

- Bonds were invisible to the heuristic, so arrows were routed straight through them.
- The head's approach direction was derived from wherever the source happened to be,
  so arrows arrived from occupied directions and buried their heads in atom labels,
  bond junctions and charge glyphs.
- Because the heuristic and the renderer disagreed about the curve (the renderer
  scales control offsets by 4/3 so a symmetric cubic peaks at `height`; the collision
  sampler omitted that factor), collision testing measured a curve 25% flatter than
  the one actually drawn.

A separate, structural defect blocked a whole class of arrow: the minimum-length guard
compared the *snapped* endpoints in model units, and a bond-midpoint-to-own-endpoint-atom
arrow — the leaving-group arrow in every SN2 — is inherently shorter than that threshold.

## Alternatives considered

**Keep routing in the editor tool.** Simplest, and where the heuristic already lived.
Rejected: routing must re-run when the structure changes, which means the render layer
needs it; and tool-layer code cannot be exercised without a browser, which would have
left the routing rules untested.

**Store a routed polyline or spline.** Would allow arbitrary paths, including
graph-search routes around dense structures. Rejected: the arrow entity stores a chord
plus two perpendicular offsets, and the renderer builds its path in a rotated local
frame from exactly those. Supporting polylines would mean changing the entity, the KET
schema, the three drag handles and the undo operations, for expressiveness that C- and
S-curves already cover in ordinary mechanism drawings.

**A single weighted score.** Rejected: with one sum, a short tidy curve can outbid one
that simply does not cross a bond. Collisions are compared lexicographically first, and
only then does a weighted sum of aesthetic terms get a vote.

**Route each arrow independently.** Rejected for multi-arrow steps: an arrow only has
to avoid the *structure* to score well alone, so two individually perfect arrows can
still cross each other. Arrows belonging to one elementary step are chosen together by
a small beam search.

## Rationale

Separating meaning from geometry is what makes the rest tractable. Because the router
consumes a structure and render options and produces curve parameters — with no DOM,
no Raphael and no pointer state — the routing rules are testable as invariants ("no
bond crossed", "head arrives through a free sector", "head tangent within N degrees")
rather than as pinned curve values. That in turn means scoring weights can be retuned
without rewriting tests.

Drawn geometry is supplied through a `MechanismMetrics` interface with two
implementations: one analytic (derives label sizes and bond extents from the model) and
one backed by the renderer's real measurements. The same routing code serves the app and
the test suite, and the analytic path also covers the app's first paint, before Raphael
has measured anything.

## Consequences

- Arrow curvature is owned by the router until the user drags a curve handle, at which
  point `autoRoute` flips to false permanently and the shape becomes theirs.
- Routing is lazy: the cached route lives on the render object and is dropped when
  `ReStruct.markAtom`/`markBond` invalidates something the arrow is anchored to. The
  model is never mutated during a repaint.
- The KET serializer had to learn the mechanism fields. Both the micromolecule path and
  the `DrawingEntity` conversion that `serialize`/`deserialize` actually use were
  dropping them, so every save/load silently reverted a mechanism arrow to an anchorless
  quadratic.
- Arrowhead geometry constants moved into the mechanism module. The router scores the
  head polygon against obstacles, so the renderer and the router have to describe the
  same shape or a head that scored clear can still be drawn over a label.
- Formal charge placement became dynamic: lone pairs are laid out first and never moved
  (an arrow tail can be pinned to a specific `pairIdx`), so the charge glyph now takes
  whichever angular direction is still free.
- Dense structures may still have no collision-free route. The router returns its least
  bad candidate marked `fallback` rather than refusing to draw. Rendering a white
  knockout under such a crossing is a natural follow-up and is not implemented.
