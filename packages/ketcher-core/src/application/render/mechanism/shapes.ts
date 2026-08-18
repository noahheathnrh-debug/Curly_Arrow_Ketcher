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

import { Vec2 } from 'domain/entities/vec2';
import { type CurveShape, shapeFromControlPoints } from './geometry';

/**
 * How a mechanism arrow is shaped.
 *
 * The two tangent *directions* are not free: the tail leaves along the lone
 * pair or bond the electrons come from, and the head arrives through the free
 * sector at the target. Both are decided by chemistry and geometry before any
 * shaping happens, and building a curve that ignores them is what made an
 * earlier version plough arrows straight through their own source atom.
 *
 * What is free is how far along each tangent the control points sit. That is
 * this file: a short list of **handle profiles**. Depth, and whether one end
 * curls harder than the other, both come from those two lengths.
 *
 * Whether the result reads as a C, an S or a `੭` is therefore a *consequence*
 * of the tangents, not an input — see {@link classifyFamily}. Different shapes
 * for the same pair of atoms come from choosing a different approach sector,
 * which is exactly the "above or below" choice offered in the UI.
 */
export type ArrowFamily = 'c' | 'uneven' | 's';

export interface HandleProfile {
  id: string;
  /** Handle lengths as a fraction of the chord. */
  l1: number;
  l2: number;
}

/**
 * The profiles tried for each approach sector, in preference order.
 *
 * `lead-in` is the one the user singled out as worth keeping: a long first
 * handle holds the departure direction so the arrow leaves the lone pair
 * straight before turning, rather than bending immediately.
 */
export const HANDLE_PROFILES: readonly HandleProfile[] = [
  { id: 'balanced', l1: 0.42, l2: 0.42 },
  { id: 'lead-in', l1: 0.68, l2: 0.32 },
  { id: 'lead-out', l1: 0.32, l2: 0.68 },
  { id: 'deep', l1: 0.72, l2: 0.72 },
  { id: 'sweep', l1: 1.15, l2: 1.15 },
  { id: 'wide-sweep', l1: 1.9, l2: 1.9 },
];

/**
 * Strongly uneven long profiles were tried here and not kept.
 *
 * The reasoning was sound and the gap is real: this list is symmetric above
 * 0.72, so every way of making a curve bigger makes it bigger at both ends at
 * once, and the shape a chemist actually draws for a hard turn — one end curling
 * tight while the other runs almost straight — is not in the set at any handle
 * length. Four were added: `(0.28, 1.15)`, `(1.15, 0.28)`, `(0.5, 1.6)`,
 * `(1.6, 0.5)`.
 *
 * Measured over 1,214 routed arrows of at least a bond length, it came to a
 * wash: spread-to-chord p90 1.547 → 1.535, arrows longer than twice their chord
 * 449 → 418, worst-turn count over 30 degrees 26 → 29, for seven per cent more
 * candidates. And case by case it was worse where it counted — of the arrows
 * singled out as badly shaped, one improved (spread ratio 0.82 → 0.65) and three
 * regressed (0.74 → 0.91, 0.60 → 0.81, 0.60 → 0.78), because a new profile could
 * produce a clean-but-wide single curve that pre-empted a tidier two-segment one.
 *
 * The conclusion is not that more profiles cannot help. It is that sampling the
 * two handle lengths more finely does not reach these shapes, because what they
 * need is a bend in the middle that a single cubic with both tangents pinned
 * cannot place. That is a two-segment problem — see the waypoint stage in
 * `route.ts` — and widening this list is the wrong lever for it.
 */

/**
 * Handles long enough to carry an arrow right around a structure.
 *
 * Reached only when nothing shorter avoids the structure. The point is reach,
 * not elegance: at these lengths the curve swings far out before returning, and
 * may cross its own tail on the way — which is what an arrow taking the long
 * way round actually looks like when drawn by hand.
 *
 * Without these the approach on the far side of a bond was simply not
 * constructible. Every candidate collided, so the choice the user had made was
 * quietly discarded and the arrow arrived somewhere else instead.
 */
export const DETOUR_PROFILES: readonly HandleProfile[] = [
  { id: 'detour', l1: 2.7, l2: 2.7 },
  { id: 'detour-lead', l1: 3.6, l2: 1.6 },
  { id: 'detour-trail', l1: 1.6, l2: 3.6 },
  { id: 'wide-detour', l1: 4.6, l2: 4.6 },
  { id: 'long-detour', l1: 6.5, l2: 6.5 },
];

/**
 * Build a curve from its two tangent directions and two handle lengths.
 *
 * Closed form: no iteration, no fitting. This is the whole construction.
 */
export function buildFromTangents(
  p0: Vec2,
  p1: Vec2,
  tail: Vec2,
  head: Vec2,
  profile: HandleProfile,
): CurveShape | null {
  const chord = p1.sub(p0);
  const d = chord.length();
  if (d < 1e-9) return null;

  const c1 = p0.addScaled(tail, d * profile.l1);
  // `head` is the direction of travel on arrival, so the second control point
  // sits back along it from the endpoint.
  const c2 = p1.addScaled(head, -d * profile.l2);

  return shapeFromControlPoints(p0, p1, c1, c2);
}

/**
 * Name the shape a curve turned out to be.
 *
 * Measured from which side of the chord each control point falls on. Equal
 * signs mean the curve bulges one way throughout — a C. Opposite signs mean it
 * crosses the chord — an S. A C whose two offsets differ markedly is the uneven
 * `੭`, one end curling harder than the other.
 *
 * Used for scoring preference and for reporting, never as an input.
 */
export function classifyFamily(shape: CurveShape): ArrowFamily {
  const { h1, h2 } = shape;
  const epsilon = 1e-6;

  if (Math.abs(h1) < epsilon && Math.abs(h2) < epsilon) return 'c';
  if (h1 * h2 < 0) return 's';

  const larger = Math.max(Math.abs(h1), Math.abs(h2));
  const smaller = Math.min(Math.abs(h1), Math.abs(h2));
  return smaller < larger * 0.55 ? 'uneven' : 'c';
}

/**
 * Rotate `direction` toward `target`, but no further than `limit` radians away
 * from it.
 *
 * This is how the departure cone is enforced *by construction* rather than
 * merely penalised afterwards. An arrow physically cannot be built leaving a
 * lone pair at an angle the convention disallows.
 */
export function clampToCone(
  direction: Vec2,
  centre: Vec2,
  limit: number,
): Vec2 {
  const cross = centre.x * direction.y - centre.y * direction.x;
  const dot = centre.x * direction.x + centre.y * direction.y;
  const offset = Math.atan2(cross, dot);

  if (Math.abs(offset) <= limit) return direction;

  const clamped = Math.sign(offset) * limit;
  const cos = Math.cos(clamped);
  const sin = Math.sin(clamped);
  return new Vec2(
    centre.x * cos - centre.y * sin,
    centre.x * sin + centre.y * cos,
  );
}

/**
 * Handles for the two halves of an arrow that turns at a waypoint.
 *
 * Modest, and deliberately so. The waypoint is what buys the reach, which is
 * the whole reason for having one — piling the long-reach handles on top as
 * well made each half overshoot wildly and produced the enormous teardrops that
 * dwarfed the structure they were meant to step around.
 */
export const WAYPOINT_PROFILES: readonly HandleProfile[] = [
  { id: 'via-tight', l1: 0.36, l2: 0.36 },
  { id: 'via-balanced', l1: 0.55, l2: 0.55 },
  { id: 'via-open', l1: 0.8, l2: 0.8 },
];

/**
 * Handles for the two arcs of an S, deep at the ends and tight at the join.
 *
 * `l1` is the handle at the arc's outer end and `l2` the one at the crossover
 * they share. Deliberately lopsided, and that asymmetry is the whole point.
 *
 * With the two equal — which is what the general waypoint profiles give — both
 * arcs are at their flattest exactly where they meet, so the curve has a long
 * gentle stretch through the middle and the seam is plainly visible: it reads as
 * two C shapes bolted together rather than as one S. Lengthening the outer
 * handles deepens each arc, and shortening the shared one pulls the transition
 * into a shorter span, so the curvature carries through the join instead of
 * flattening out across it.
 */
export const CROSSOVER_PROFILES: readonly HandleProfile[] = [
  { id: 's-balanced', l1: 0.62, l2: 0.45 },
  { id: 's-deep', l1: 0.75, l2: 0.4 },
  { id: 's-gentle', l1: 0.55, l2: 0.5 },
  { id: 's-open', l1: 0.85, l2: 0.38 },
];

/*
 * Ratios beyond about two to one were tried — (0.95, 0.3) and (1.15, 0.25) —
 * to pull the transition into as short a span as possible. They overshoot: a
 * handle that long carries the arc past where the next one wants to pick it up,
 * and the short handle at the join then snaps it back, so the curve bulges,
 * returns, and bulges again. Each segment looks reasonable on its own and the
 * finished arrow undulates.
 *
 * `turnReversals` now catches that wherever it comes from, but the profiles
 * should not be provoking it in the first place.
 */

/*
 * Uneven and wider profiles were tried here — (0.85, 0.4), (0.4, 0.85),
 * (1.1, 1.1) — so the two halves of a turn need not be the same depth.
 * Measured on pinned approaches they made things worse: badly-shaped arrows
 * went from four to five out of thirty-two while doubling the candidate count,
 * because the extra reach let a clean but straight-running curve win somewhere
 * it previously could not be built at all.
 */
