# Mechanism Arrows (Curly & Fishhook)

## Problem

Drawing an organic reaction mechanism by hand is slow and easy to get wrong. Standard
structure editors draw reaction arrows between whole structures, but not the curly
arrows that show *where electrons go* — from a lone pair to an electrophile, from a
breaking bond to the atom that keeps its electrons.

Drawn naively, those arrows are also hard to read: they cut through bonds, bury their
heads in atom labels and charge symbols, and approach targets from directions that are
already occupied. The arrow is then chemically ambiguous even when the intent was clear.

## User interaction

The curly-arrow tool draws an electron-pair arrow; the fishhook variant draws a
single-electron arrow for radical steps.

Hovering an atom highlights its available lone pairs and radical dots. The user presses
on one of them — or anywhere on a bond — and drags to wherever the electrons are going:
another atom, or a bond whose order is increasing. Throughout the drag the arrow that
would be committed is drawn in full, so releasing changes nothing about its shape. With
nothing valid under the pointer it is shown grey and dashed instead, and releasing there
discards it.

Over a valid target, the ways the arrow could come in are offered as small circles just
outside it — one for each wedge with real room in it, so a three-coordinate atom offers
three. A sole way in still gets one, so a target always shows where an arrow would land.
A bond target offers its two sides instead, and hovering a bond before pressing shows the
two sides its tail could leave from. Moving onto one claims it; releasing away from all of
them leaves the choice to the router.

On release the arrow is committed with the curve that was on screen.

Dragging a curvature handle on a committed arrow takes over its shape by hand. That is
permanent for that arrow: it will not be re-shaped again automatically.

## Expected behavior

#### Scenario: Arrow tails start where the electrons actually are

- **WHEN** the user starts a drag on a lone pair, a radical dot, or a bond
- **THEN** the arrow's tail is anchored to that specific pair, dot, or bond
- **AND** the tail leaves it outward — radially from the atom, or peeling away from the
  bond — rather than doubling back across the atom's own label

#### Scenario: Arrows have no corners

- **WHEN** any arrow is drawn
- **THEN** it bends smoothly along its whole length
- **AND** never doubles back on itself in a sharp point, whatever it had to do to reach
  its target

#### Scenario: The shaft runs into the head's point

- **WHEN** an arrow arrives on a tightly curving path
- **THEN** the head points along the way the arrow came in over the head's own length,
  not the direction at the very tip
- **AND** the last stretch of shaft stays inside the head rather than grazing one of its
  edges

#### Scenario: Arrowheads point into what they aim at

- **WHEN** an arrow arrives through a wide opening
- **THEN** the head still comes in close to squarely, not skimming past at an angle
- **AND** how open the approach is decides which way in, not how far off the head may
  arrive

#### Scenario: Arrowheads stop short of their target

- **WHEN** an arrow points at an atom
- **THEN** the arrowhead stops before the atom, clear of its label, its charge symbol
  and any bond junction there
- **AND** clear of the whole label, not merely its width — text like `H3C` is drawn
  almost entirely to one side of its own atom, and an arrow arriving from that side
  stops further back accordingly
- **AND** the side the hydrogens are drawn on is closed to arrows altogether, so a head
  arrives at the atom's own symbol rather than through its hydrogens
- **AND** the head is small enough not to obscure what it points at

#### Scenario: Arrows arrive through a free direction

- **WHEN** an arrow points at an atom that already has bonds
- **THEN** it approaches through an angular direction not occupied by a bond, an
  implicit hydrogen or a lone pair

#### Scenario: A breaking bond does not block its own arrow

- **WHEN** an arrow shows a bond breaking, with the electrons going to one of its atoms
- **THEN** the arrow may arrive along the direction that bond occupies, because that is
  precisely where the electrons are going

#### Scenario: Bond formation puts the head between the atoms

- **WHEN** an arrow shows a new bond forming
- **THEN** the arrowhead lands in the gap between the two atoms, nearer the receiving
  one, rather than on either nucleus

#### Scenario: An arrow stays on one side of the structure

- **WHEN** an arrow starts inside a closed region — the middle of a ring, say
- **THEN** it may end anywhere inside that same region
- **AND** it is not offered an approach outside it, because reaching one would mean
  cutting a bond
- **AND** the same holds in reverse: an arrow starting outside is never offered a way in
- **AND** the curve itself stays inside that region, not merely its endpoints — the
  space enclosed by a ring is empty, so an arrow crossing it touches nothing and would
  otherwise be considered perfectly clear

#### Scenario: Every approach the user can pick is reachable

- **WHEN** the user picks an approach that can only be reached by going around the
  structure
- **THEN** the arrow takes that route, however long or unusual it looks
- **AND** it turns at a waypoint when a single bend cannot get there, joining the two
  halves along a shared direction so the result is one smooth stroke
- **AND** the detour is sized against the arrow itself, so it rounds whatever is
  immediately in the way rather than sweeping around the whole drawing
- **AND** among the routes that avoid the structure, the one occupying least canvas
  wins — not merely the shortest, since a tall thin loop and a compact one can travel
  the same distance while taking up quite different amounts of room
- **AND** where the only way round is past the end of the structure, the sweep is given
  room enough to arc comfortably rather than stretching to reach
- **AND** an approach that costs a sweep is drawn dashed and pale before it is chosen,
  so the price is visible rather than discovered on release
- **AND** the tidier of the available detours is chosen on merit, not whichever kind of
  curve the search happened to try first
- **UNLESS** something is physically in the way, which is the only thing that makes an
  approach impossible

#### Scenario: An arrow never passes through the bond it comes from

- **WHEN** an arrow is anchored to a bond at either end
- **THEN** it may lie alongside that bond and start right beside it
- **BUT** it never crosses it, on either side
- **AND** it never loops back through its own body

#### Scenario: Arrows avoid the structure

- **WHEN** a route exists that crosses nothing
- **THEN** the committed arrow crosses no bond, label, charge symbol or lone pair it is
  not attached to
- **AND** where several such routes exist, the neatest is chosen — a simple arc in
  preference to an S-curve, a shorter path in preference to a longer one

#### Scenario: The user chooses which way the arrow arrives

- **WHEN** the pointer is over a target
- **THEN** every direction with room for an arrow is offered, and none that is occupied
  by a bond or a lone pair
- **AND** none that the arrow could not reach without cutting through the structure
- **AND** the one the pointer is nearest is always the one used — there is no "between
  the lobes" where the arrow arrives from a direction none of them named
- **AND** a chosen approach is kept: the arrow arrives that way even when another
  direction would give a tidier curve
- **BUT** never at the cost of crossing the structure — a choice that could only be
  honoured by cutting through something is visibly abandoned, and the arrow arrives
  the other way instead
- **AND** the choice survives saving and reloading, and survives the structure being
  edited around it

#### Scenario: The preview is the arrow

- **WHEN** the user is dragging towards a valid target
- **THEN** the arrow drawn under the cursor is the one that will be committed, including
  which way it bends and which direction it arrives from
- **AND** it changes shape visibly as the cursor passes a point where a different route
  becomes better

#### Scenario: Arrows of one step avoid each other

- **WHEN** a step needs two or three arrows
- **THEN** they neither cross nor overlap
- **EXCEPT** where they legitimately converge on a shared atom or bond

#### Scenario: A new arrow gives way to the arrows already drawn

- **WHEN** an arrow is drawn where an earlier one already runs
- **THEN** the new arrow takes another route
- **AND** the earlier arrow does not move: an arrow never changes because a later one was
  drawn

#### Scenario: Arrows follow the structure when it moves

- **WHEN** an atom or bond an arrow is anchored to is moved or edited
- **THEN** the arrow's endpoints and curve are recomputed
- **UNLESS** the user has adjusted that arrow's curve by hand

#### Scenario: The drawing changes and the arrows follow

- **WHEN** lone pairs or hydrogens are switched on or off, or the font size changes
- **THEN** every automatically shaped arrow is recomputed against what is now drawn
- **AND** with lone pairs shown, arrowheads come in between them rather than over them
- **AND** with them hidden, that space is free again
- **UNLESS** the user has adjusted that arrow's curve by hand

#### Scenario: Charges make room for lone pairs

- **WHEN** an atom shows both a formal charge and lone pairs
- **THEN** the lone pairs keep their positions and the charge symbol moves to a free
  direction, because an arrow tail may be anchored to a specific pair

#### Scenario: Arrows survive saving and loading

- **WHEN** a drawing containing mechanism arrows is saved and reopened
- **THEN** each arrow keeps its source, its destination and its curve

## Guarantees

- An arrow's chemical meaning is fixed when it is drawn and is never altered by
  automatic re-shaping. Only the curve changes.
- A user's hand-adjusted curve is never overwritten.
- Passing through the structure is the only forbidden thing. A long sweep, a curve that
  crosses its own tail — these are scored against so a tidier arrow wins when one
  exists, but never ruled out, because they are sometimes the only way to reach an
  approach the user asked for.
- Avoiding collisions always outranks everything else. No aesthetic preference, no
  preference inferred from the drag, and no approach the user picked explicitly will
  buy a crossing; an explicit pick decides between routes that are already clean.

## Limitations

- Crowded structures may leave no clear route at all. The least-bad arrow is drawn
  rather than none, and it may cross something. It is not yet visually distinguished
  from a clean one — there is no white break where an arrow passes over a bond.
- The curve family is a single arc or S-curve between the two endpoints. An arrow
  cannot wrap around an obstruction or double back.
- Two arrows meeting at the same atom or bond necessarily touch there. Only the rest of
  their length is kept apart.
- A wedge narrower than about sixty degrees is never offered as a drop target, even
  though an arrow can be routed through it. The router may still use it.
- Where an earlier arrow blocks the only corridor available, the new arrow is drawn over
  it rather than not at all.
- Single-electron (fishhook) arrows are routed by the same rules as electron-pair
  arrows. Radical-specific conventions — two fishhooks converging on one new bond,
  diverging on homolysis — are not modelled as a set.
- Re-anchoring a fishhook tail by dragging moves it visually but does not persist the
  new radical anchor.
- Nothing validates that the arrows drawn are chemically correct, or that they match a
  particular expected mechanism.
