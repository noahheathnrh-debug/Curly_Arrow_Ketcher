/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

/**
 * Routing constants, all in model units where 1.0 is one bond length.
 *
 * These are tuned against printed-textbook mechanism drawings, not derived
 * from any standard. Expect to adjust them; the metric tests assert invariants
 * rather than exact curve parameters precisely so that retuning stays cheap.
 */

// ─── clearances ─────────────────────────────────────────────────────────────

/** Half-width added to a bond's drawn extent before it counts as blocking. */
export const BOND_CLEARANCE = 0.13;
/** Inflation applied to a text label's bounding box. */
export const LABEL_CLEARANCE = 0.08;
/** Padding around a charge glyph disc. */
export const CHARGE_CLEARANCE = 0.09;
/** Padding around a lone-pair or radical dot. */
export const DOT_CLEARANCE = 0.07;
/** Minimum separation between two mechanism arrows. */
export const ARROW_CLEARANCE = 0.1;

/**
 * Minimum bulge away from the chord for a short bond-to-atom arrow, as a
 * fraction of a bond length.
 *
 * Cleavage arrows have a very short chord — bond midpoint to one of that bond's
 * own atoms — so the cheapest route hugs the bond and reads as a bump drawn on
 * it rather than as a separate electron-flow arrow.
 */
export const MIN_CLEAVAGE_BULGE = 0.16;

/**
 * How far every arrow must depart from its own chord, as a fraction of it.
 *
 * A curly arrow is curved. That is not decoration — a nearly straight one reads
 * as a vector or a bond rather than as electrons moving, and among candidates
 * that all avoid the structure the score otherwise rewards the flattest, since
 * short and low-curvature both count in its favour. Roughly a fifth of the
 * chord gives the familiar textbook bow without arcing so far that the arrow
 * stops looking like the shortest sensible path between its ends.
 */
export const MIN_BOW_FRACTION = 0.22;

// ─── endpoint grace regions ─────────────────────────────────────────────────

/**
 * Near an endpoint the arrow must be allowed to touch what it is attached to,
 * otherwise no route exists at all. The grace regions are small and local
 * rather than a blanket exemption, so an arrow may brush its own source bond
 * without being licensed to run along its whole length.
 */
/** How far a bond-anchored tail sits off the bond axis, beyond the bond's own width. */
export const SIGMA_SOURCE_OFFSET = 0.04;
export const PI_SOURCE_OFFSET = 0.1;

export const SOURCE_GRACE_RADIUS = 0.16;
export const DESTINATION_GRACE_RADIUS = 0.14;

/**
 * How far from an endpoint an exemption still applies.
 *
 * An arrow anchored to a lone pair needs to start *inside* its own atom's label
 * — the pair is drawn right beside the text — so that label cannot be treated
 * as solid. But the exemption used to hold along the whole curve, which let an
 * arrow run clean through `HO` on its way somewhere else and score as perfectly
 * clear. Exempting a disc around the anchor rather than the obstacle outright
 * keeps the departure legal and makes the rest of the journey pay.
 *
 * Wider than the grace radii above, because it has to cover the whole glyph an
 * anchor may sit inside, not just the anchor's immediate surroundings.
 *
 * Bonds are deliberately not localised this way — see `evaluate`.
 */
export const EXEMPTION_REACH = 0.42;

/**
 * How far out from the target an approach lobe sits, in model units.
 *
 * Just clear of the hover outline, and no further. Pushed further out the lobes
 * stop reading as part of the thing being aimed at and become small targets
 * floating in space that the cursor has to be steered to deliberately — which
 * is the opposite of the point.
 */
export const LOBE_RADIUS = 0.26;

/**
 * Angular room reserved around a lone pair or radical dot, in radians.
 *
 * Rather more than the dots themselves occupy. An arrowhead landing right
 * beside a lone pair reads as pointing *at* the pair, which in a mechanism
 * means something quite different from pointing at the atom.
 */
export const DOT_ANGULAR_HALF_WIDTH = (26 * Math.PI) / 180;

/**
 * Ray directions used to decide whether a point is enclosed, in degrees.
 *
 * Three of them, voted, because one ray can graze the end of a bond or run
 * along it and either would flip the crossing count. Deliberately away from the
 * 30/60/90/120 degree directions structures are actually drawn on.
 */
export const PARITY_RAY_ANGLES = [17, 139, 253];

/**
 * How far the parity ray reaches, in bond lengths.
 *
 * Only has to clear the whole drawing; anything beyond the outermost atom
 * counts the same. Generous rather than computed, because the cost is a handful
 * of segment tests either way.
 */
export const PARITY_RAY_LENGTH = 1000;

/**
 * How a two-segment arrow's waypoints are laid out around the drawing.
 *
 * Deliberately coarse. These only exist so that a way round *exists* when the
 * single-bend family has none; refining them would cost candidates without
 * changing which side of the structure the arrow goes.
 */
export const DETOUR_DIRECTIONS = 8;

/**
 * Waypoint distances, as multiples of the arrow's own chord.
 *
 * Multiples of the arrow's own chord, for turns close in. Anything needing to
 * go further rounds the structure's own silhouette instead — see
 * `detourWaypoints`, where those come from what is actually drawn.
 *
 * An absolute ladder in bond lengths was tried here on the theory that a long
 * arrow had nowhere to turn near the middle of its own path. Measured over 326
 * routes it produced identical shapes — mean and worst turning uniformity to
 * two decimals — for 35 per cent more candidates, so it was not kept.
 */
export const DETOUR_RADII = [0.6, 1, 1.7];

/** Floor on the chord-scaled distance, and the clearance used when rounding
 * the structure's own silhouette. */
export const DETOUR_MIN_REACH = 0.9;

/**
 * Turn points for an arrow that has to reach *around* one of its own endpoints,
 * in bond lengths. Absolute, not scaled to the chord.
 *
 * This is what makes a pinned arrival constructible. When the user drops on an
 * approach lobe the head direction is fixed, and if that direction faces away
 * from the incoming electrons the arrow has to come across and then curl round
 * the target to enter from the far side. That curl happens *near the target*, at
 * a size set by the target, and has nothing to do with how far the arrow
 * travelled to get there.
 *
 * {@link DETOUR_RADII} cannot express it because it scales with the chord: on
 * the reported structure the chord is about eight bond lengths, so the nearest
 * turn point it offers sits five bond lengths from the arrow's midpoint and the
 * only reachable shape loops around the whole drawing.
 *
 * An absolute ladder was tried once before and recorded as a wash. That
 * measurement was taken on arrows with a free choice of approach — which are
 * exactly the arrows that were never broken.
 */
export const ENDPOINT_TURN_RADII = [0.9, 1.4, 2.1];

/*
 * Mid-journey turn points — a bend part way along, offset sideways at absolute
 * distances — were added here and removed again. Measured on pinned approaches
 * they changed nothing at all: the same four arrows out of thirty-two came back
 * badly shaped, for another five per cent of candidates.
 *
 * Taken with the endpoint rings and the detour ring, every placement of a
 * *single* turn point has now been tried. The four that remain need to bend
 * twice, which one interior point cannot express wherever it is put.
 */

/**
 * The ring used when *pairing* two turn points, one near each end.
 *
 * Deliberately much coarser than the single-bend rings. Pairing is a product,
 * not a sum, so the full rings would be thousands of curves per arrow. Two bends
 * also share the work, which makes each one's exact placement matter far less
 * than when a single bend has to achieve the whole shape on its own.
 */
export const PAIRED_TURN_DIRECTIONS = 4;
export const PAIRED_TURN_RADIUS = 1.4;

/** How many directions the endpoint rings are sampled in. */
export const ENDPOINT_TURN_DIRECTIONS = 8;

/**
 * How far off square-on the arrow may pass through an endpoint turn point, in
 * radians.
 *
 * A turn point constrains both halves of a two-segment curve at once: the first
 * arrives along this direction and the second leaves along it. So the tangent
 * there decides as much of the shape as the position does, and offering only
 * dead-square-on to the radius pins two thirds of the curve from a list of eight
 * positions.
 *
 * The flanking tilts only — square-on is a tier of its own, tried first.
 *
 * Splitting them that way is what makes them affordable. Offered together with
 * square-on they tripled the largest tier of the search and took the ring-detour
 * budget four times over; offered only when the square-on ring has failed to
 * produce a decent arrow, they cost nothing on the arrows it already handles and
 * still recover the two shapes that need them.
 */
export const ENDPOINT_TURN_TILTS = [
  (30 * Math.PI) / 180,
  (-30 * Math.PI) / 180,
];

/**
 * The penalty for leaving the region the arrow started in.
 *
 * Large enough that any route staying put beats any route that does not, so
 * this behaves as a rule rather than a preference — but finite, so a structure
 * offering nothing else still yields an arrow instead of none.
 */
export const BOUNDARY_PENETRATION = 100;

/**
 * The penalty for a curve that is mostly straight. Comparable to the boundary
 * rule: large enough that any real arrow beats one, finite so a structure
 * offering nothing else still yields something rather than nothing.
 */
export const STRAIGHT_RUN_PENETRATION = 80;

/**
 * The penalty for drawing an S as a single cubic.
 *
 * Large, because this shape is not wanted at any price. A cubic has two bends
 * in it and no more; spend one at each end reversing curvature and the middle
 * has nothing left and runs straight, which is the "Z with smooth corners"
 * reported repeatedly. Weighting it was tried at 160 and the shape still won,
 * because every alternative *inside the family* is the same shape slightly
 * rearranged.
 *
 * Ranked below a physical collision, so an arrow still goes round a bond rather
 * than through one.
 */
export const SINGLE_CUBIC_S_PENETRATION = 120;

/**
 * How many times a curve may reverse its direction of turn.
 *
 * One. A plain C reverses nothing and a proper S reverses once, in the middle;
 * beyond that the arrow is undulating, which is what makes a curve look wobbly
 * rather than drawn. Multi-segment constructions are perfectly capable of
 * bulging out, coming back, and bulging again while each individual segment
 * looks reasonable, so this has to be measured on the finished curve.
 */
export const MAX_TURN_REVERSALS = 1;

/**
 * The most curves the search will build for one arrow.
 *
 * The arrow is recomputed while the user drags, so the time this takes is a
 * feature of the tool and not an implementation detail. Each candidate costs
 * roughly a millisecond — it is flattened and then tested against every nearby
 * obstacle — so an unbounded search is measured in seconds, which is what made
 * drawing feel clunky.
 *
 * The tiers are ordered cheapest and most-likely first, so spending the
 * allowance means the promising constructions have already been tried.
 *
 * Set high enough that it is a safety net rather than a working limit. Tighter
 * values do run faster — 250 roughly halves the time again — but they buy that
 * by cutting the search off before the hard arrows find their shape, and the
 * shape guards fail. Speed here comes from making each candidate cheap, not from
 * refusing to consider them.
 */
export const CANDIDATE_BUDGET = 2000;

/**
 * Penetration past which a candidate is abandoned without finishing its
 * measurement, in model units.
 *
 * A curve this far inside the structure — most of a bond length — cannot win
 * against anything that avoids it, so the remaining obstacle tests only refine
 * where it sits among other unusable routes. A third of the search's time went
 * on exactly that.
 */
export const ABANDON_PENETRATION = 0.6;

/** Penalty per reversal beyond the limit. */
export const WOBBLE_PENETRATION = 70;

/**
 * How deep both lobes of a single cubic must be before it counts as an S worth
 * forbidding, as a fraction of the chord.
 *
 * A curve is classified an S purely by its two control points falling on
 * opposite sides of the chord, and that includes a plain arc with a hair of
 * counter-bend at one end. Those are not the reported shape and forbidding them
 * costs a great deal of searching for nothing.
 */
export const MIN_S_LOBE_DEPTH = 0.06;

/**
 * Where the crossover of a two-arc S may sit along the chord, and how far to
 * either side of it in bond lengths.
 *
 * Near the middle, because that is what makes it an S rather than a hook: the
 * curve reverses half way through the journey, so each arc gets a fair share of
 * it. Push the crossover towards either end and one arc shrinks to nothing,
 * which is the single-cubic shape again.
 */
export const CROSSOVER_POSITIONS = [0.35, 0.5, 0.65];

/** Shortest arrow worth giving a crossover, in bond lengths. */
export const MIN_CROSSOVER_CHORD = 1.6;

/**
 * Offsets reach well clear of the structure, in bond lengths.
 *
 * The chord of a long arrow runs straight through whatever lies between its
 * endpoints, so a crossover placed on or near it is inside a ring more often
 * than not. Measured on the two-molecule layout, every one of the forty-five
 * two-segment candidates for the reported arrow collided for exactly that
 * reason: the offsets only reached nine tenths of a bond length either side and
 * the clear air is several bond lengths above and below.
 */
export const CROSSOVER_OFFSETS = [0, -0.7, 0.7, -1.6, 1.6];

/** How far the crossover heading may lean off the chord, in radians. */
export const CROSSOVER_LEANS = [0, (30 * Math.PI) / 180, (-30 * Math.PI) / 180];

/**
 * How large an arrow may get, relative to its chord, before it stops counting
 * as an arrow at all — and the penalty for exceeding it.
 *
 * The companion to {@link MAX_STRAIGHT_RUN}, and needed for the same reason.
 * Ruling out the mostly-straight shapes on their own simply handed the job to
 * whatever was left, and what was left was a curve sprawling three and a half
 * chords across the page: it broke no rule, so it won. Being far too big and
 * being far too straight are both ways of not being an arrow, and neither can
 * be allowed to win by default because the other was forbidden.
 *
 * Well-formed arrows measure 0.50 to 0.75, so this leaves plenty of room.
 *
 * Both conditions must hold, and the absolute one is not optional. A resonance
 * or cleavage arrow runs between two points a fraction of a bond apart and has
 * to bow to be visible at all, which puts its spread at several times its own
 * chord while remaining tiny on the page. Judged on the ratio alone those were
 * disqualified and the fixtures lost their arrows entirely.
 */
export const MAX_SPREAD_RATIO = 1.1;
/** …and only once the arrow is actually large, in bond lengths. */
export const MAX_SPREAD_ABSOLUTE = 2.5;
export const OVERSIZE_PENETRATION = 60;

/**
 * How much arc length a corner is judged over, in model units.
 *
 * A corner is a lot of turning packed into very little distance, so the test
 * needs a distance to measure against. About a seventh of a bond length: short
 * enough that an ordinary arc barely registers, long enough to span the handful
 * of flattened steps a cusp collapses into.
 */
export const TURN_WINDOW = 0.15;

/**
 * Cap on the window as a fraction of the arrow's own length.
 *
 * Only ever binds on very short arrows. A cleavage arrow runs from a bond
 * midpoint to one of that bond's own atoms and is barely half a bond long, so
 * the fixed window above covers a third of it at once; it has to curl hard to
 * bow away from its own bond at all, and judged over that span it read as one
 * continuous corner with no route surviving.
 *
 * Deliberately a cap and not a plain proportion. Making the window scale with
 * length throughout was tried and is worse in the other direction: it judges
 * long arrows over a correspondingly long span, so a wide gentle sweep
 * accumulates enough total turning to trip the veto and the tidy two-segment
 * curves were thrown out — the arrow that had come down to 0.66 of its chord
 * went back up to 2.41. A corner is a corner at a fixed size on the page,
 * however long the arrow carrying it.
 */
export const TURN_WINDOW_LENGTH_CAP = 0.1;

/**
 * Where turning starts to cost.
 *
 * Below this an arrow is bending; above it, tightening into a hook. Graded, and
 * never a veto — vetoing corners was tried and backfires, because "collides" is
 * also what drives the two-segment rescue in `route.ts`: a compact curve with a
 * slightly sharp join gets marked unclean, the rescue escalates, and when
 * nothing survives the arrow falls back to the sprawling single cubic the rescue
 * existed to replace.
 *
 * Forty degrees puts the cost squarely between the two populations — arrows that
 * read as smooth measure 6 to 34 in this window, and the ones reported as
 * cornered measure 83 and 133.
 */
export const COMFORT_WINDOW_TURN = (40 * Math.PI) / 180;

/**
 * The narrowest wedge worth offering as a drop target, in radians.
 *
 * Wider than {@link MIN_SECTOR_WIDTH}, which is only asking whether an arrow
 * could squeeze through. A lobe has to be somewhere the cursor can comfortably
 * be put, and a lobe drawn in the middle of a 45 degree wedge still sits on the
 * bonds either side of it. Sixty degrees keeps the ordinary case — the roughly
 * 120 degree wedges of a three-coordinate atom — while dropping the cramped
 * ones, where there was never a real choice to make anyway.
 */
export const MIN_LOBE_WIDTH = (60 * Math.PI) / 180;

/**
 * How far either side of the direct approach the flanking aims sit, in radians.
 *
 * Sixty degrees: far enough that the two read as genuinely different ways round
 * the target, close enough that neither looks like the arrow has overshot and
 * doubled back.
 */
export const SIDE_SPREAD = Math.PI / 3;

/**
 * Grace also scales with the arrow's own length, floored at the fixed radii
 * above and capped so long arrows are not let off wholesale.
 *
 * A cleavage arrow runs from a bond's midpoint to one of that bond's own atoms,
 * so it is short enough that *all* of it sits inside the bond it depicts
 * breaking. Judged against a fixed radius it reports a collision with its own
 * source and its own target, which is meaningless — being near those is the
 * entire point of the arrow.
 */
export const ATTACHED_OVERLAP_LIMIT = 0.75;

export const ARRIVAL_CORRIDOR_WIDTH = 0.12;
export const ARRIVAL_CORRIDOR_LENGTH = 0.28;

/**
 * Gap left between the arrowhead tip and the thing it points at.
 *
 * Raised from 0.06: at that value heads measured only ~0.06 bond lengths clear
 * of an atom label, which is not a collision but reads as crowded next to
 * printed reference drawings.
 */
export const HEAD_STANDOFF = 0.11;
/** Granularity of the walk outward looking for a clear head anchor. */
export const HEAD_STANDOFF_STEP = 0.02;
/**
 * Cap on that walk. At a badly crowded vertex there may be no clear anchor at
 * all; stopping here and letting scoring register the collision beats pushing
 * the arrowhead half a bond length away from what it points at.
 */
export const MAX_HEAD_STANDOFF = 0.55;

// ─── arrowhead ──────────────────────────────────────────────────────────────

/**
 * Mechanism arrowheads are deliberately smaller than reaction-arrow heads,
 * which they used to share constants with. Measured off printed reference
 * drawings as a fraction of bond length; the old shared values (0.25 / 0.125)
 * are sized for a full-width reaction arrow and swallow the atom they point at.
 *
 * Scoring tests the head polygon against obstacles, so these live here rather
 * than in `draw.ts` — the router and the renderer must agree on the shape
 * exactly, or a head that scored clear can still be drawn on top of a label.
 */
export const MECH_HEAD_LENGTH = 0.18;

/**
 * The shortest an arrow may be, measured along its path.
 *
 * Three times the arrowhead, so the shaft is always clearly longer than the
 * head it carries. Without a floor the shortest arrows — a bond reaching its
 * own atom — collapsed into stubs beside their own bond.
 */
export const MIN_ARROW_LENGTH = 0.54;
export const MECH_HEAD_HALF_WIDTH = 0.075;
/** Depth of the swept-back concavity in the trailing edge. */
export const MECH_HEAD_NOTCH = 0.05;
/** Mechanism arrow stroke as a fraction of the bond stroke width. */
export const MECH_STROKE_SCALE = 0.75;
export const MECH_ARROW_COLOR = '#cc0000';

// ─── sector selection ───────────────────────────────────────────────────────

/** Sectors narrower than this are unusable as an approach. */
export const MIN_SECTOR_WIDTH = Math.PI / 9; // 20 degrees

/**
 * The widest the arrowhead may swing off the approach it arrives through.
 *
 * Independent of how open that approach is. A wide wedge means there is plenty
 * of room to come in; it does not mean the head should be free to arrive nearly
 * sideways and skim past the thing it is pointing at.
 */
export const MAX_ARRIVAL_CONE = (35 * Math.PI) / 180;
/** Shrink each sector edge by this much before aiming into it. */
export const SECTOR_EDGE_MARGIN = (8 * Math.PI) / 180;
/**
 * How many approach sectors to try per destination.
 *
 * Each one costs a full sweep of families, sides and depths, so this multiplies
 * the whole routing cost. Sectors are ranked by how well they face the incoming
 * electrons, and past the best few the alternatives are only reached when
 * everything nearer is blocked.
 */
export const MAX_SECTORS = 3;

// ─── shape families ─────────────────────────────────────────────────────────

export const FLATTEN_TOLERANCE = 0.004;
export const MAX_FLATTEN_SEGMENTS = 64;

/**
 * Departure cones — how far off the ideal direction an arrow may leave, either
 * side of centre. A lone pair is tight because the arrow should visibly emanate
 * from that pair; a bond is looser because peeling off a bond reads fine over a
 * wider range.
 */
/**
 * Widening this to 75 degrees was tried, on the theory that the departure cone
 * was what forced arrows into hooks — a chemist drawing by hand routinely leaves
 * a lone pair and curls straight back. Measured, it was a wash: one arrow
 * improved sharply (worst window turn 45 to 18 degrees) while another regressed
 * (50 to 61) and a third stopped finding any clean route at all. The cone is not
 * what is holding these shapes back.
 */
export const LONE_PAIR_CONE = (35 * Math.PI) / 180;
export const BOND_CONE = (50 * Math.PI) / 180;

/**
 * Arc half-angles to try, shallowest first. The first that clears wins its
 * family, so a shallow arc is preferred and depth is only spent when needed.
 */
export const THETA_STEPS_DEG = [28, 42, 62] as const;

/** Rounding step for the arc angle, so identical inputs give identical curves. */
export const THETA_QUANTUM_DEG = 1;

/** How much harder the far end curls in an uneven C (the `੭`). */
export const UNEVEN_RATIO = 0.45;

/**
 * Fraction of the curve treated as "body" for the sharp-turn penalty. Turns
 * outside this, near the tail, are allowed to be tighter — that is where the
 * user wants any redirection to happen.
 */
export const BODY_RANGE: readonly [number, number] = [0.25, 1.0];

/** Final quantisation, so serialized curves and snapshots stay stable. */
export const SERIALIZATION_QUANTUM = 1e-4;

/** Routes longer than `LENGTH_LIMIT_SCALE * chord + LENGTH_LIMIT_OFFSET` are rejected as wandering. */
export const LENGTH_LIMIT_SCALE = 2.25;
export const LENGTH_LIMIT_OFFSET = 0.25;

/**
 * How far an arrow may stray from the midpoint of its own chord before the
 * spread penalty starts, as a fraction of that chord.
 *
 * The subtle part: spread can never fall below half the chord, because the two
 * endpoints are themselves that far from the midpoint. So the meaningful range
 * starts at 0.5, and arrows that read as well-shaped measure 0.50 to 0.58.
 *
 * This was `1.0` — charged only beyond the chord itself — which sounded
 * conservative and was in fact almost inert: it let an arrow bulge a full chord
 * length, twice the envelope of a tidy one, for nothing. Measured over a
 * two-molecule layout, every arrow complained about as "massive for no reason"
 * sat between 0.64 and 1.01 and paid exactly zero.
 */
export const SPREAD_ALLOWANCE = 0.62;

/**
 * Absolute slack on top of {@link SPREAD_ALLOWANCE}.
 *
 * A short arrow is required to bow — see {@link MIN_BOW_FRACTION} and the
 * minimum-bulge term — and for a cleavage arrow that bow is a large fraction of
 * a very small chord. Without a floor the two demands contradict each other and
 * the arrow is charged for doing what it was told.
 */
export const SPREAD_FLOOR = 0.2;

/**
 * How oversized a clean curve must be before the search keeps looking, as a
 * fraction of the chord.
 *
 * Deliberately looser than {@link SPREAD_ALLOWANCE}, and the two do different
 * jobs. The allowance is a *scoring* threshold: it discriminates finely between
 * candidates already built, and costs nothing to apply. This is a *search*
 * threshold, and applying it means running the two-segment waypoint stage —
 * roughly 190 further curves, each flattened and tested against every obstacle.
 *
 * Measured, that is about six seconds per arrow, against a live-preview budget
 * of a frame, so this cannot simply track the scoring allowance — doing that
 * sent forty per cent of arrows down that path and made the whole thing
 * unusable.
 *
 * 0.72 rather than the 0.95 first chosen. That figure came from arrows with a
 * free choice of approach, where anything below 1.0 was indeed fine. Arrows
 * whose arrival the user has pinned are a harder problem and go wrong earlier:
 * measured across a grid of pinned approaches, well-formed ones sit at 0.50 to
 * 0.65 and the complaints start at 0.78, so a threshold of 0.95 sat above every
 * defect it was supposed to catch.
 */
export const ESCALATION_SPREAD = 0.72;

/**
 * Turn points placed near the middle of the chord and offset sideways — so that
 * each half of a two-segment arrow becomes a plain C and the pair reads as a
 * real S — were added here and removed again.
 *
 * The reasoning looked sound: the turn points the search has come from a ring of
 * compass directions around the whole drawing, which is what stepping around an
 * obstacle needs and is never "the middle, offset sideways". Measured, they
 * changed nothing. Rendered side by side with them present and absent, all eight
 * test arrows were pixel-identical, because the interior point that produces the
 * good shape was already reachable from the existing ring.
 *
 * The useful conclusion is that the second control point was never the thing in
 * short supply — a *reason to prefer* the curve that uses it was. That is
 * `WEIGHTS.straightRun`, which is what actually fixed the corner-and-run shape.
 */

/**
 * When a curve counts as a corner-and-run rather than a curve.
 *
 * A long almost-straight stretch with the bending crammed into tight corners.
 * Either figure alone can be innocent — a gentle arc has a low peak and some
 * straight length, a tight curl has a high peak and none — so both must be
 * exceeded together before the search spends anything on an alternative.
 *
 * Calibrated against pinned-approach routes, which is where the defect lives:
 * the offending shapes score 0.50/10.5 and 0.56/17.9, while well-formed ones
 * across the same grid stay at or below 0.29 straight. The straight-run figure
 * is doing most of the work — the two populations are cleanly separated by it
 * alone — and the peak condition only guards against calling a long gentle arc a
 * corner because it happens to have a low average bend.
 */
export const CORNER_RUN_STRAIGHT = 0.15;

/**
 * The most of an arrow that may run straight before it stops counting as an
 * arrow at all.
 *
 * A rule rather than a preference, and the only shape rule besides not crossing
 * out of the region the arrow started in. Half of a curly arrow running dead
 * straight does not read as one, and no amount of being short or clear of the
 * structure makes up for it.
 *
 * Enforced rather than priced because pricing did not work: at nine thousand per
 * unit — ten times what any other term can reach — a curve with two thirds of
 * its length straight was still being chosen, because everything else on offer
 * scored worse still. The multi-segment constructions can lay a nearly straight
 * span between two turn points, and something has to stop that being an option.
 *
 * Set from the arrow actually complained about, read out of the running
 * application rather than reconstructed here: two segments, gentle corners, and
 * forty-six per cent of its length straight. Earlier limits of a half and then
 * of forty per cent both sat above it, which is why it kept being accepted as a
 * good arrow.
 *
 * Thirty per cent, and the search starts looking for something better at
 * fifteen. It is a curly arrow, not a curly-ish one: any appreciable stretch of
 * it running dead straight is the defect, whatever the rest is doing.
 */
export const MAX_STRAIGHT_RUN = 0.3;
/**
 * No longer consulted. Requiring a sharp curvature peak alongside the straight
 * run is what let the reported arrow through: gentle corners, 6.4 here, and
 * nearly half its length straight. Kept documented so the pairing is not
 * reintroduced.
 */
export const CORNER_RUN_PEAK = 8;

// ─── multi-arrow ────────────────────────────────────────────────────────────

export const SET_KEEP_PER_ARROW = 6;
export const SET_BEAM_WIDTH = 12;

// ─── weights ────────────────────────────────────────────────────────────────

/**
 * Applied only to candidates that already clear every obstacle. Hitting
 * something is an absolute gate above all of these — no amount of elegance
 * buys a route through a bond.
 *
 * Ordering reflects what the user asked for: keep the curve readable first,
 * then keep clear of the structure, then be short.
 */
export const WEIGHTS = {
  /** Per degree the tail leaves off its cone centre. */
  tailOffCentre: 3,
  /**
   * Per degree the head arrives off its sector centre.
   *
   * Raised from 5 to keep it in the same league as `crowding` below. With
   * crowding reaching 220 at contact, five per degree meant the router could buy
   * two hundredths of a bond length of clearance by swinging the arrival twenty
   * degrees — and a shaft that arrives across the head instead of along it draws
   * a visibly bent arrowhead, which `regionCrossing.test.ts` catches directly.
   */
  headOffCentre: 12,
  /**
   * Per obstacle, scaled by the square of how far inside the comfort radius the
   * arrow strays — zero at the radius, one where it touches.
   *
   * Was 400 per *model unit* of shortfall, which sounds far dearer than it was:
   * the shortfall is capped at {@link COMFORT_CLEARANCE}, so the whole term
   * could never exceed 36 for any one obstacle however close the arrow came.
   * Now the term reaches this figure at contact, which is what makes grazing
   * something the router will go out of its way to avoid.
   */
  crowding: 220,
  /**
   * Per unit of path length beyond the straight-line distance.
   *
   * Raising this to 90 was tried, on the theory that it was too weak to matter
   * beside `crowding` and so let arrows balloon into empty canvas for free.
   * Measured, it changed nothing at all — the route snapshots were byte-identical
   * at 25, 70 and 90 — because {@link WEIGHTS.spread} already discriminates on
   * size and does it better: a tall loop and a compact one can be the same
   * distance travelled, so length cannot tell them apart and spread can.
   *
   * Worth knowing because it was not inert in combination. With the length
   * weight raised *and* crowding squared, the router started arriving across its
   * own arrowhead rather than along it, and `regionCrossing.test.ts` caught the
   * bent heads. Neither change did that alone.
   */
  length: 25,
  /**
   * For a two-segment arrow, how unevenly the turn divides the journey.
   *
   * Zero when the halves are equal, one when the turn sits on an endpoint. Dear
   * enough to outweigh the small savings that pulled the waypoint onto the tail
   * — a curve that does all its bending in one place reads as a flat run into a
   * hook rather than as one sweep.
   */
  lopsided: 420,
  /**
   * Per unit the arrow strays from its own chord's midpoint, beyond the chord.
   *
   * The complaint these arrows attract is that they take up unnecessary room,
   * and no other term measures room. Path length does not: a tall thin loop and
   * a compact one can travel the same distance while occupying quite different
   * amounts of canvas.
   *
   * Measured over 326 routes: routes wider than five bond lengths fell from 44
   * to 19, and the ninetieth percentile from 5.16 to 4.67. The curve flattens
   * above this — 320 and 600 gave the same figures — so the extra weight would
   * only distort the other terms for nothing.
   *
   * That flattening was an artefact of the gate, not of the weight. With the
   * allowance at a full chord almost nothing was ever charged, so raising the
   * price changed nothing; once {@link SPREAD_ALLOWANCE} brought the gate down
   * to where tidy arrows actually sit, the weight became live and had to carry
   * its share against `crowding` below.
   */
  spread: 420,
  /**
   * Flat cost for a curve that crosses its own tail.
   *
   * Dear, so any curve that does not will be preferred — but a cost, not a ban.
   * Sweeping right around a structure is sometimes the only way to reach the
   * approach the user picked, and that arrow should be drawn.
   */
  selfCrossing: 220,
  /** Per unit of curvature in the arrow body — penalises sharp mid-curve turns. */
  bodyCurvature: 14,
  /**
   * Per unit of straight-running fraction beyond {@link CORNER_RUN_STRAIGHT}.
   *
   * This was tried once, measured as changing nothing, and removed — correctly
   * at the time. Back because the situation changed: the curve that avoids a
   * long straight run needs two interior turn points, and until those could be
   * built there was nothing for the penalty to steer *towards*. Pricing a shape
   * only helps when an alternative exists.
   *
   * Length and spread both reward a straight stretch — it is the shortest way
   * between two points and takes up the least room — so without this the score
   * actively prefers the shape being complained about.
   */
  straightRun: 900,
  /**
   * Per radian the worst window turn exceeds {@link COMFORT_WINDOW_TURN}.
   *
   * Distinct from `bodyCurvature`, which averages over the curve and so lets a
   * single corner hide inside an otherwise gentle sweep — and which ignores the
   * first quarter of the path entirely. This charges the tightest part of the
   * curve wherever it falls, including the join of a two-segment arrow, where
   * the halves share a tangent direction but not a curvature and the seam can
   * still read as a bend.
   */
  turnSharpness: 500,
  /**
   * Flat cost per family, so a plain C wins ties, then the uneven C.
   *
   * The S is dear enough that a marginal gain in bow cannot buy one. It used to
   * cost 45, which the bulge penalty covered with about two hundredths of a
   * unit of extra depth — so requiring arrows to bow quietly turned a clean C
   * into an S that was barely any deeper.
   */
  family: { c: 0, uneven: 25, s: 160 } as const,
  /*
   * A flat cost for reversing direction at all — pricing an S however it is
   * built, which `family` cannot do because it only reads a single cubic's
   * control points — was tried at 700 and 220 and removed.
   *
   * It does work: S usage across the two test structures fell from ten arrows
   * in twenty-six to six, leaving reversals only where a single arc genuinely
   * could not reach. But it is priced against `headOffCentre`, and any value
   * large enough to matter tipped arrows into arriving off their target — a
   * worse defect than an unnecessary reversal, and one the fixtures catch.
   * Raising head aim to compensate then broke the cleavage-bow invariant
   * instead.
   *
   * The preference is right and the mechanism is wrong: choosing between a C
   * and an S is a decision about which shape suits the journey, and expressing
   * it as one more term in a sum of a dozen weights means it can be outvoted
   * by, and can outvote, things it has nothing to do with.
   */
  /** Nudge toward earlier handle profiles, so shallow beats deep on a tie. */
  profileOrder: 8,
  /** Short bond-to-atom arrows that hug the bond they came from. */
  bulgeShortfall: 900,
  /** Per unit an arrow falls short of {@link MIN_ARROW_LENGTH}. */
  tooSmall: 900,
} as const;

/** Clearance below which a route counts as crowded, though not colliding. */
export const COMFORT_CLEARANCE = 0.09;
