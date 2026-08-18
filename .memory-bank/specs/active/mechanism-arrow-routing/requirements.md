# Mechanism arrow routing — requirements

Stated by the user, in their words as far as possible. Appended to as we talk.
Not a design; a record of what has actually been asked for.

## Core goal

A **mathematical, instant** way to compute the arrow. Not a search that grinds
through thousands of candidates. Rendering "a few arrows to pick the best one"
is acceptable, but only a very small number.

Looks simple on the face of it, and acts simply for most cases — but when
required, makes an arrow that avoids objects or makes turns, *in a way that
still looks simple and is the simplest way of doing it*. It should look easy
and good no matter what.

## Shape priority

1. **Standard C-shaped curly arrow whenever possible.** This is the priority.
2. S-shaped when required.
3. Uneven / asymmetric curves — the `੭` shape.
4. Last resort: a normal arrow with "a little spin at the end to hook it in"
   to the lone pair, for when the departure angle cannot otherwise be met.

Arrows must be **curved and never straight**, and should strongly resemble
Bézier curves.

## Departure angle cones

The direction an arrow may leave its source is constrained to a cone. Angles
below are **either side of the centre line**, so ±35° means 70° of total
working space.

- **From a lone pair — ±35°** (70° total). Centred on straight out from the pair.
- **From a bond — ±50°** (100° total). Centred perpendicular to the bond.

## Live preview while dragging

The arrow should be recomputed **as the user moves the mouse**, so they watch
the real arrow shift around rather than a placeholder curve that is replaced on
release. Implies the calculation must be fast enough to run every mousemove.

Expected and wanted: mostly the arrow shifts smoothly; occasionally, crossing
a point where a different shape becomes optimal, it visibly **snaps** to that
different shape. Seeing that happen is desirable — it shows the user how the
tool is reasoning. The same applies to changing *route* rather than shape, e.g.
flipping from passing above a large object to passing below it. Both are fine
and read as the system working well.

### Endpoint behaviour while dragging

- The arrow **follows the cursor freely**, and **snaps only when close** to
  something it can snap to.
- Over empty space the preview still **shows an arrow going to that location**;
  on release it **vanishes**, since a mechanism arrow needs a real target.

## Arrival

Aim for head-on, but **not locked** to exactly head-on — an acceptable *range*
either side.

## Balance / weighting

Find a balance between, in this order:

1. Curvature (never straight)
2. Keeping as much distance as possible from other structures
3. Being as short as possible, within the two above

## Turns

- Sharp turns in the arrow's **body** should be avoided.
- The sharpest turns permitted are those it *might* make to redirect itself
  near its **starting point**.
- On the long benzylic example: leaving the lone pair straight before turning
  was **good and worth keeping**, but the redirect itself was **too strong**.
- If these little turns can be avoided entirely, they should be — a simple
  curly arrow is always preferable.

## Determinism

Drawing an arrow between the same two points must produce an **identical**
result every time. Deleting and redrawing between the same two places must
reproduce exactly the same arrow.

## Architecture

Currently there is effectively one arrow type (one centre plus two angle
pieces). Instead there should be:

- **several distinct arrow types**
- something that **determines which type to use** for a given situation
- a **control** on each, in the way the current one has parameters

## Integration with Ketcher

Use what Ketcher already knows. It highlights bonds (rounded capsule) and atoms
(circle) on hover, so it already computes where things are — the arrow should
avoid those same shapes.

## Known bug

When an arrow is drawn, the **ending position is not at the correct
coordinates**. Grabbing the arrow tip and dragging it into place fixes it and
makes it look good.

## Not wanted

- Slow routing. Current implementation is "really slow".
- Arrows whose shape varies unpredictably between similar situations.
- A drag preview that does not match the arrow you actually get on release.

## Arrow shape families

`੭` is **not** a separate "hooked entry" — it is a normal C whose curvature is
**uneven**, one side curling more than the other. An extreme `੭` covers the
hooked-entry case, so that is not a separate family.

Working set (may grow):

1. **C** — the standard, roughly circular curly arrow. Default.
2. **S** — reverses curvature once.
3. **`੭`** — asymmetric C, uneven curvature, one end curling harder.

For any given pair of endpoints, **all** of these are usually drawable (see the
three-option reference images). The system must pick one consistently.

## Cutting down the option space

Within a single shape family there are still many valid arrows, differing only
by how deep or wide the curve is (see the coloured-variant reference images).
There are far more possibilities than are useful.

Requirement: **rules that cut the space down to a very small number of
candidates**, then weights to choose among what survives. Not an open search.

## Stereochemistry

Open question raised: does the direction of approach carry chemical meaning
that curly-arrow drawings are expected to show? If so the router must not
override it for aesthetic reasons. See discussion — the working answer is that
the **side/face an arrow arrives from** can be meaningful (e.g. SN2 backside
attack), while the **side the arc bulges toward en route** is not.

## Other arrows on the canvas

- Arrows already drawn should be **avoided** — treated as obstacles.
- Open question: when a new arrow forces an existing one into a poor path,
  should existing arrows be re-routed to find a better joint arrangement?
  User unsure. Possibly an **optional action/button** rather than automatic.

## Side choice (above vs below)

Undecided. Drag direction should probably have *some* influence — the algorithm
should not ignore it outright — but often the direction genuinely will not
matter, and in those cases ignoring it is fine. No menu or explicit control:
that would feel strange.

## When arrows may move on their own

They must **not** shift because an unrelated new arrow was drawn. But they
**must** re-adjust when the thing they are attached to changes:

- Start and end points are **locked to their anchors** and move with them —
  moving the atom, the structure it belongs to, or the source lone pair/bond
  must carry the arrow with it.
- If the target atom's **label visibility** changes (bare skeletal vertex vs a
  drawn "C"), the arrowhead must sit further back when a label appears.
  Preferred: **the line stays identical and only the head moves back along it**,
  rather than the whole arrow re-shaping.

## Easy cases must stay easy

Most arrows are short and predictable — resonance arrows typically run from a
bond to the atom that bond already touches. The same calculation must handle
these trivially: the ladder should terminate almost immediately, not grind.

## Choosing the approach: discrete lobes, not an angle

**Not** a continuous angle choice. The user picks between the discrete free
approach sectors — "above" or "below" — the way they already pick which lone
pair an arrow starts from. Chemically it usually makes no difference; it is
offered for the same reason lone-pair choice is.

While dragging near the target, show the available approach sectors as
**lobes** (see mockup 2026-08-08). Drop on a lobe to choose it; drop on the
atom generally and the algorithm decides. Same interaction at both ends of the
arrow. A level can require a specific lobe.

Supersedes the earlier idea of inferring side from how far the drag bows.

## Selection: rules cut, weights choose

Not "first family that works wins" — in the reference image the C clears but
the S is dramatically shorter and clearly better, so a strict ladder picks
wrong.

- **Rules** (cone, free sectors, three families, two sides, solved depth) cut
  the space to roughly **six candidates** before any scoring.
- **Weights** then choose among those six: closeness to sector centre, distance
  kept from structures, shape preference (C cheaper than ੭, ੭ cheaper than S),
  length.

Speed comes from the small candidate count, not from avoiding evaluation.
Clearance cannot be computed in closed form — it is a property of the
constructed curve — so some evaluation is unavoidable and that is fine at six.

Determinism follows: same inputs produce the same six candidates, the same
scores, and the same winner.
