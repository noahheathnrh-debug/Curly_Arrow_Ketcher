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
import {
  BODY_RANGE,
  CANDIDATE_BUDGET,
  BOUNDARY_PENETRATION,
  COMFORT_CLEARANCE,
  COMFORT_WINDOW_TURN,
  DETOUR_DIRECTIONS,
  DETOUR_MIN_REACH,
  DETOUR_RADII,
  CORNER_RUN_STRAIGHT,
  CROSSOVER_LEANS,
  CROSSOVER_OFFSETS,
  CROSSOVER_POSITIONS,
  MIN_CROSSOVER_CHORD,
  ENDPOINT_TURN_DIRECTIONS,
  ENDPOINT_TURN_RADII,
  ENDPOINT_TURN_TILTS,
  PAIRED_TURN_DIRECTIONS,
  PAIRED_TURN_RADIUS,
  ESCALATION_SPREAD,
  MAX_SPREAD_ABSOLUTE,
  MAX_SPREAD_RATIO,
  MAX_STRAIGHT_RUN,
  MAX_TURN_REVERSALS,
  SINGLE_CUBIC_S_PENETRATION,
  OVERSIZE_PENETRATION,
  STRAIGHT_RUN_PENETRATION,
  EXEMPTION_REACH,
  FLATTEN_TOLERANCE,
  ABANDON_PENETRATION,
  ATTACHED_OVERLAP_LIMIT,
  MAX_FLATTEN_SEGMENTS,
  MECH_HEAD_HALF_WIDTH,
  MECH_HEAD_LENGTH,
  MIN_ARROW_LENGTH,
  MIN_BOW_FRACTION,
  MIN_S_LOBE_DEPTH,
  MECH_HEAD_NOTCH,
  SERIALIZATION_QUANTUM,
  SPREAD_ALLOWANCE,
  TURN_WINDOW,
  TURN_WINDOW_LENGTH_CAP,
  SPREAD_FLOOR,
  WOBBLE_PENETRATION,
  WEIGHTS,
} from './constants';
import {
  type Box,
  type CurveShape,
  angleBetween,
  arrowheadPolygon,
  boxesWithin,
  degrees,
  flattenCubic,
  headChordDirection,
  headTangent,
  maxCurvature,
  curvatureProfile,
  maxTurnInWindow,
  turnReversals,
  parameterAtDistanceFromEnd,
  polygonBoxClearance,
  polygonCapsuleClearance,
  pointBoxDistance,
  pointSegmentDistanceXY,
  polylineBoxClearance,
  polylineCapsuleClearance,
  polylineBounds,
  polylineLength,
  segmentsIntersect,
  shapeFromHandles,
  splitCubic,
  tailTangent,
} from './geometry';
import {
  type ArrowFamily,
  type HandleProfile,
  CROSSOVER_PROFILES,
  DETOUR_PROFILES,
  HANDLE_PROFILES,
  WAYPOINT_PROFILES,
  buildFromTangents,
  classifyFamily,
} from './shapes';
import {
  enclosingBonds,
  resolveDestinationAnchors,
  resolveSourceAnchor,
} from './anchors';
import { buildObstacles } from './obstacles';
import type {
  DestinationAnchor,
  MechanismArrowShape,
  MechanismMetrics,
  MechanismOptions,
  MechanismStruct,
  Obstacle,
  Route,
  RouteClass,
  RouteLead,
  RouteMetrics,
  RoutingRequest,
  SourceAnchor,
} from './types';

interface Candidate {
  leads: RouteLead[];
  /** How far short of the required bow this curve falls. Zero when it bows enough. */
  bulgeShortfall: number;
  /** How far short of the minimum length. Zero when the arrow is big enough. */
  lengthShortfall: number;
  /** How far past its size allowance the curve strays. Zero when compact. */
  excessSpread: number;
  /** Big enough that the expensive stages of the search are worth running. */
  grosslyOversized: boolean;
  /** A long straight run between tight corners, rather than a curve. */
  cornerAndRun: boolean;
  /**
   * Whether the route actually hits something, as opposed to merely being a
   * poor shape.
   *
   * Kept apart from `collides` because the two answer different questions. A
   * badly-shaped arrow should lose to a well-shaped one, but it should not make
   * the router abandon the approach the user picked and arrive at a different
   * face — that is not a better arrow, it is a different one.
   */
  physical: boolean;
  /** Share of the length barely bending at all. */
  straightFraction: number;
  shape: CurveShape;
  family: ArrowFamily;
  /** True when this route touches something it is not attached to. */
  collides: boolean;
  penetration: number;
  /** Disqualification for being the wrong shape, ranked below physical hits. */
  shapePenalty: number;
  score: number;
  metrics: RouteMetrics;
  polyline: Vec2[];
  head: Vec2[];
  end: Vec2;
}

/** Cached so the same obstacle is not re-measured for every candidate. */
const obstacleBoundsCache = new WeakMap<object, Box>();

function obstacleBounds(obstacle: Obstacle): Box {
  const cached = obstacleBoundsCache.get(obstacle);
  if (cached) return cached;

  const box: Box =
    obstacle.shape === 'capsule'
      ? {
          min: new Vec2(
            Math.min(obstacle.capsule.a.x, obstacle.capsule.b.x) -
              obstacle.capsule.r,
            Math.min(obstacle.capsule.a.y, obstacle.capsule.b.y) -
              obstacle.capsule.r,
          ),
          max: new Vec2(
            Math.max(obstacle.capsule.a.x, obstacle.capsule.b.x) +
              obstacle.capsule.r,
            Math.max(obstacle.capsule.a.y, obstacle.capsule.b.y) +
              obstacle.capsule.r,
          ),
        }
      : obstacle.box;

  obstacleBoundsCache.set(obstacle, box);
  return box;
}

/** Chord length, needed before the main measurements are taken. */
function chordOf(a: Vec2, b: Vec2): number {
  return Vec2.dist(a, b);
}

function quantise(value: number): number {
  return Math.round(value / SERIALIZATION_QUANTUM) * SERIALIZATION_QUANTUM;
}

function classify(shape: CurveShape, family: ArrowFamily): RouteClass {
  if (family === 's') {
    return shape.h1 > 0 ? 's-positive-negative' : 's-negative-positive';
  }
  return shape.h1 + shape.h2 >= 0 ? 'c-positive' : 'c-negative';
}

/**
 * Points far enough from either endpoint to be judged against obstacles the
 * arrow is legitimately attached to. Without this no route exists at all: an
 * arrow leaving a lone pair necessarily touches that lone pair.
 */
/**
 * How much of the arrow lies inside an obstacle it is attached to.
 *
 * Its own source bond and its own target atom are *supposed* to be touched —
 * that is what the arrow means. Judging them by distance is meaningless: a
 * cleavage arrow runs from a bond's midpoint to one of that bond's own atoms
 * and is short enough to sit inside both from end to end, so any fixed
 * exemption radius either reports a nonsense collision or exempts everything.
 *
 * What actually distinguishes acceptable from not is whether the arrow *runs
 * along* the thing instead of leaving it. So measure the fraction of the curve
 * buried inside, and only complain past a generous threshold.
 */
function fractionInside(points: Vec2[], obstacle: Obstacle): number {
  if (points.length === 0) return 0;

  let inside = 0;

  if (obstacle.shape === 'capsule') {
    const { a, b, r } = obstacle.capsule;
    for (const point of points) {
      // Point distance, not polyline distance: the earlier version called a
      // whole-polyline routine once per point, making this quadratic and
      // costing more than the rest of routing combined.
      if (pointSegmentDistanceXY(point.x, point.y, a.x, a.y, b.x, b.y) < r) {
        inside++;
      }
    }
  } else {
    const { box } = obstacle;
    for (const point of points) {
      if (pointBoxDistance(point, box) <= 0) inside++;
    }
  }

  return inside / points.length;
}

/**
 * Whether a path crosses out of the region it started in.
 *
 * Distinct from hitting something. The inside of a benzene ring is empty space,
 * so an arrow that dives through it collides with nothing at all — and without
 * this it was free to do so, which is how a resonance arrow between two ring
 * bonds ended up drawn through the middle of the ring.
 *
 * Only bonds that lie on a cycle can bound a region, so those are the only ones
 * that count. An acyclic structure supplies none and this costs nothing.
 */
function crossesBoundary(
  polyline: Vec2[],
  boundary: ReadonlyArray<readonly [Vec2, Vec2]>,
): boolean {
  for (let i = 1; i < polyline.length; i++) {
    for (const [begin, end] of boundary) {
      if (segmentsIntersect(polyline[i - 1], polyline[i], begin, end)) {
        return true;
      }
    }
  }
  return false;
}

/** Whether a path passes through a segment, as opposed to merely near it. */
/**
 * The parts of a curve that are not near either of its own endpoints.
 *
 * An exemption exists so an arrow can leave from, and arrive at, things it is
 * attached to — a lone pair sits inside its atom's label, so that label cannot
 * be solid or there is no route at all. The mistake was making the exemption
 * follow the *obstacle* rather than the *place*: with `label:O` exempt outright,
 * an arrow could run clean through `HO` half way along its journey and be scored
 * as touching nothing.
 *
 * Splitting at the grace boundary rather than clipping to it: a run of two or
 * more consecutive points outside every zone is measured, and points inside are
 * dropped along with the segments that touch them. At this flattening that
 * costs a fraction of a step of accuracy at each boundary, which is far below
 * the clearances being judged.
 */
function runsOutsideZones(
  polyline: Vec2[],
  zones: ReadonlyArray<{ at: Vec2; radius: number }>,
): Vec2[][] {
  const runs: Vec2[][] = [];
  let run: Vec2[] = [];

  for (const point of polyline) {
    const inside = zones.some(
      (zone) => Vec2.dist(point, zone.at) <= zone.radius,
    );
    if (inside) {
      if (run.length > 1) runs.push(run);
      run = [];
    } else {
      run.push(point);
    }
  }
  if (run.length > 1) runs.push(run);

  return runs;
}

function polylineCrossesSegment(polyline: Vec2[], a: Vec2, b: Vec2): boolean {
  for (let i = 1; i < polyline.length; i++) {
    if (segmentsIntersect(polyline[i - 1], polyline[i], a, b)) return true;
  }
  return false;
}

/**
 * Whether a path crosses itself.
 *
 * Scored against, never forbidden. A curve that loops back over its own tail is
 * usually an accident of long handles, but it is also the only shape available
 * when an arrow has to sweep right around a structure to reach the approach it
 * was asked for — and that arrow is legitimate. Rejecting the shape outright
 * made those approaches unreachable, which is not the tool's call to make.
 *
 * Neighbouring segments are skipped because they share an endpoint by
 * construction, which the strict crossing test would not count anyway.
 */
function selfIntersects(polyline: Vec2[]): boolean {
  for (let i = 1; i < polyline.length; i++) {
    for (let j = i + 2; j < polyline.length; j++) {
      if (
        segmentsIntersect(
          polyline[i - 1],
          polyline[i],
          polyline[j - 1],
          polyline[j],
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function evaluate(
  shape: CurveShape,
  source: SourceAnchor,
  destination: DestinationAnchor,
  obstacles: Obstacle[],
  trim: number,
  profile: HandleProfile,
  boundary: ReadonlyArray<readonly [Vec2, Vec2]>,
  leads: Array<{ at: Vec2; shape: CurveShape }> = [],
): Candidate {
  const p0 = source.position;
  const anchor = destination.position;

  // With turn points the arrow runs p0 -> leads[0].at -> ... -> anchor, and
  // `shape` describes the final segment. Everything below then works on that
  // segment exactly as it did when there was only one.
  const start = leads.length ? leads[leads.length - 1].at : p0;

  // Trim the head back *along* the curve rather than routing to a pre-trimmed
  // endpoint. The shape is decided by chemistry and geometry; how much of it a
  // label hides is a separate and much cheaper question, and keeping the two
  // apart means a late or missing text measurement can no longer corrupt the
  // curve itself.
  const fullPolyline = flattenCubic(
    start,
    anchor,
    shape.h1,
    shape.h2,
    FLATTEN_TOLERANCE,
    MAX_FLATTEN_SEGMENTS,
    shape.along1,
    shape.along2,
  );
  const t = parameterAtDistanceFromEnd(
    start,
    anchor,
    shape,
    trim,
    fullPolyline,
  );
  const split = splitCubic(start, anchor, shape, t);
  const p1 = split.end;
  const drawn = split.shape;

  // Every segment before the last, flattened and joined. Each turn point's
  // shape describes the segment arriving at it.
  const tail: Vec2[] = [];
  const segmentLengths: number[] = [];
  let from = p0;
  for (const turnPoint of leads) {
    const piece = flattenCubic(
      from,
      turnPoint.at,
      turnPoint.shape.h1,
      turnPoint.shape.h2,
      FLATTEN_TOLERANCE,
      MAX_FLATTEN_SEGMENTS,
      turnPoint.shape.along1,
      turnPoint.shape.along2,
    );
    segmentLengths.push(polylineLength(piece));
    tail.push(...(tail.length ? piece.slice(1) : piece));
    from = turnPoint.at;
  }

  const polyline = [
    ...tail.slice(0, Math.max(0, tail.length - 1)),
    ...flattenCubic(
      start,
      p1,
      drawn.h1,
      drawn.h2,
      FLATTEN_TOLERANCE,
      MAX_FLATTEN_SEGMENTS,
      drawn.along1,
      drawn.along2,
    ),
  ];

  const tangent = headTangent(
    start,
    p1,
    drawn.h1,
    drawn.h2,
    drawn.along1,
    drawn.along2,
  );
  // Aimed along the way the arrow came in over the head's own length, rather
  // than the tangent at the very tip — see `headChordDirection`.
  const head = arrowheadPolygon(
    p1,
    headChordDirection(start, p1, drawn, MECH_HEAD_LENGTH),
    MECH_HEAD_LENGTH,
    MECH_HEAD_HALF_WIDTH,
    MECH_HEAD_NOTCH,
  );

  const chord = Vec2.dist(p0, p1);
  const length = polylineLength(polyline);

  // Whether a two-segment arrow's turn has collapsed onto one of its ends.
  //
  // Nothing used to care where along the path the turn fell, and the waypoints
  // nearest the source score well on every other count — so the chosen one sat
  // almost on top of the tail, leaving one half about zero length and the other
  // doing all the work. That is a single cubic again in all but name, and it
  // comes out shaped like one: a long flat run into a tight hook.
  //
  // Charged as a *shortfall against a minimum share*, not as distance from an
  // even split. The even-split version read as "the turn belongs in the middle",
  // which is not what was wanted and actively fought the shape the arrows are
  // meant to have: a tight curl coming off the lone pair opening into a long
  // shallow sweep divides its length roughly 30/70, and paying for that meant a
  // sprawling single curve outscored it. Only a genuinely degenerate split — one
  // half under a quarter of the journey — is a defect, and that is all this now
  // charges for.
  // How unevenly the turn points divide the journey.
  //
  // Generalised over any number of segments as the spread between the longest
  // and shortest share. A turn that has collapsed onto an endpoint leaves one
  // share near zero and reads as a flat run into a hook — a single cubic in all
  // but name.
  let imbalance = 0;
  if (leads.length && length > 1e-9) {
    const shares = [...segmentLengths, length - polylineLength(tail)].map(
      (segment) => segment / length,
    );
    imbalance = Math.max(...shares) - Math.min(...shares);
  }

  // The one hard rule: an arrow may not pass through the structure. Crossing
  // out of the region it started in is the part of that no obstacle test can
  // see, because the space enclosed by a ring is empty.
  //
  // Nothing else is forbidden. A long sweep around the outside, or a curve that
  // crosses its own tail, is an unusual arrow rather than an illegal one — and
  // when the user has picked an approach that can only be reached that way, it
  // is the arrow they asked for. Shape preferences live in the score, where a
  // tidier route outranks a strange one without ever ruling it out.
  // How the bending is spread along the curve. Needed here rather than with the
  // other shape measures below because too much of it running straight is a
  // rule, not a preference — see MAX_STRAIGHT_RUN.
  const family = classifyFamily(drawn);
  // A single cubic may not be an S. Ever.
  //
  // One curve whose two control points sit on opposite sides of its chord is
  // the shape reported over and over: it leaves the tail, crosses to the far
  // side and comes back, and because a cubic can only bend twice in total it
  // spends its whole middle running straight between two tight end hooks. No
  // amount of weighting rescues it, because within that family there is nothing
  // better to choose — the flat middle is what the family *is*.
  //
  // An arrow that needs to reverse its curvature must be built as two C shapes
  // joined at a turn point instead, which is what a chemist draws and what the
  // multi-segment constructions below produce. So the family is removed here
  // rather than penalised: with it gone the search is forced to reach for the
  // turn points, and the S it produces is two arcs rather than a Z.
  //
  // Only a *pronounced* one. `classifyFamily` calls any curve whose two control
  // points sit on opposite sides of the chord an S, which includes a gentle arc
  // carrying a negligible counter-bend at one end — visually a plain C. Banning
  // those too sent an ordinary SN2 arrow from six candidates to two hundred and
  // fifty-seven chasing a shape it never needed. Both lobes have to be real.
  const sDepth = Math.min(Math.abs(drawn.h1), Math.abs(drawn.h2));
  const singleCubicS =
    leads.length === 0 &&
    family === 's' &&
    sDepth > chordOf(p0, p1) * MIN_S_LOBE_DEPTH;

  // How many times the drawn curve reverses its direction of turn. A C does not
  // reverse, a proper S reverses once in the middle, and anything beyond that is
  // the curve undulating — the wobbly arrows reported on 2026-08-15.
  const reversals = turnReversals(polyline);
  const wobbles = reversals > MAX_TURN_REVERSALS;

  const bendProfile = curvatureProfile(polyline);
  const runsStraight = bendProfile.straightFraction > MAX_STRAIGHT_RUN;
  const escapes = crossesBoundary(polyline, boundary);
  // Judged over a window of arc length rather than between consecutive samples;
  // see `maxTurnInWindow` for why the per-step version could not see a cusp.
  const worstTurn = maxTurnInWindow(
    polyline,
    Math.min(TURN_WINDOW, length * TURN_WINDOW_LENGTH_CAP),
  );
  const turnExcess = Math.max(0, worstTurn - COMFORT_WINDOW_TURN);

  // Both disqualify. Judged against the chord, which is known here; the spread
  // itself is measured further down, so this is resolved after that.
  let obstacleHit = false;
  let collides = escapes || runsStraight || singleCubicS || wobbles;
  // Physical penetration only. Shape disqualifications are deliberately kept
  // out of this number: it is what ranks two routes that both hit something,
  // and folding a shape penalty in let a route clipping a bond by a hair
  // outrank a clean one that was merely too straight.
  let penetration = escapes ? BOUNDARY_PENETRATION : 0;
  let shapePenalty =
    (runsStraight ? STRAIGHT_RUN_PENETRATION : 0) +
    (singleCubicS ? SINGLE_CUBIC_S_PENETRATION : 0) +
    (wobbles ? (reversals - MAX_TURN_REVERSALS) * WOBBLE_PENETRATION : 0);
  let crowding = 0;
  let minimumClearance = Infinity;
  const collidedWith: string[] = [];
  if (escapes) collidedWith.push('boundary');
  if (runsStraight) collidedWith.push('straight-run');
  if (singleCubicS) collidedWith.push('single-cubic-s');
  if (wobbles) collidedWith.push(`wobble:${reversals}`);

  // Most obstacles in a real structure are nowhere near any given arrow, and
  // the exact per-segment test is far more expensive than a box comparison.
  const bounds = polylineBounds(polyline);

  for (const obstacle of obstacles) {
    if (!boxesWithin(bounds, obstacleBounds(obstacle), COMFORT_CLEARANCE)) {
      continue;
    }

    const exemptAtSource = source.exempt.has(obstacle.id);
    const exemptAtDestination = destination.exempt.has(obstacle.id);
    const exempt = exemptAtSource || exemptAtDestination;

    // Where that exemption applies.
    //
    // For everything but a bond it is a disc around the endpoint: the arrow may
    // begin inside its own atom's label and end inside its target's, and
    // nowhere else. Beyond the disc the obstacle is treated as solid like any
    // other, which is what stops an arrow crossing `HO` in mid-flight.
    //
    // A bond is the exception, and not an arbitrary one: a bond exemption
    // exists because the arrow travels *along* the bond it comes from — a
    // cleavage arrow runs from a bond's midpoint to that bond's own atom and is
    // near it for its whole length. Localising that to a disc around the
    // midpoint would report the arrow as colliding with the very bond it
    // depicts. Bonds keep the whole-curve treatment, guarded by the crossing
    // test below.
    const zones: Array<{ at: Vec2; radius: number }> = [];
    if (exempt && obstacle.cls !== 'bond') {
      if (exemptAtSource) {
        zones.push({ at: source.position, radius: EXEMPTION_REACH });
      }
      if (exemptAtDestination) {
        zones.push({ at: destination.position, radius: EXEMPTION_REACH });
      }
    }

    let clearance: number;
    if (exempt && zones.length > 0) {
      // Exempt near the endpoint, solid everywhere else.
      clearance = 1;
      for (const run of runsOutsideZones(polyline, zones)) {
        const beyond =
          obstacle.shape === 'capsule'
            ? polylineCapsuleClearance(run, obstacle.capsule)
            : polylineBoxClearance(run, obstacle.box);
        clearance = Math.min(clearance, beyond);
      }
    } else if (exempt) {
      // An exempt obstacle is one the arrow is *attached* to — its own source
      // bond, its destination's label. It may lie alongside it and start right
      // beside it, so proximity alone cannot count as a collision.
      //
      // Passing through it is a different matter. Crossing the axis of the very
      // bond an arrow comes from is not tangency, it is drawing through the
      // structure, and the overlap-fraction rule below cannot see it: a loop
      // that cuts the bond twice has only a tenth of its length inside the
      // capsule and scores as perfectly clear.
      const cuts =
        obstacle.shape === 'capsule' &&
        obstacle.cls === 'bond' &&
        polylineCrossesSegment(
          polyline,
          obstacle.capsule.a,
          obstacle.capsule.b,
        );

      // Charging crowding in proportion to how much of the arrow lies inside
      // what it is attached to was tried here, to stop a cleavage arrow curling
      // up inside its own bond for free. Measured, it made those arrows
      // *smaller* rather than larger, so the cost model is not what it appears;
      // whatever is keeping them small, this is not it.
      clearance =
        cuts || fractionInside(polyline, obstacle) > ATTACHED_OVERLAP_LIMIT
          ? -1
          : 1;
    } else {
      clearance =
        obstacle.shape === 'capsule'
          ? polylineCapsuleClearance(polyline, obstacle.capsule)
          : polylineBoxClearance(polyline, obstacle.box);
    }

    // The head is judged too: a clear shaft is no help if the triangle itself
    // lands on a charge or a bond junction.
    //
    // Judged against the source's own exemptions as well. The head is at the
    // far end of the curve, nowhere near them, so nothing about being attached
    // to the source licenses the arrowhead to sit on top of it — and skipping
    // the test wholesale let heads land inside the label the tail came out of.
    // Only what the *destination* is attached to is spared, since arriving
    // inside that is the whole intent.
    if (!exemptAtDestination) {
      const headClearance =
        obstacle.shape === 'capsule'
          ? polygonCapsuleClearance(head, obstacle.capsule)
          : polygonBoxClearance(head, obstacle.box);
      clearance = Math.min(clearance, headClearance);
    }

    if (clearance < minimumClearance) minimumClearance = clearance;
    if (clearance < 0) {
      collides = true;
      obstacleHit = true;

      // Stop measuring a candidate that is already hopeless.
      //
      // Once a route is buried this deep in the structure it will never be
      // chosen over anything clean, and the only thing the remaining obstacles
      // could refine is its position in the ordering of other hopeless routes.
      // Walking the whole curve against every obstacle to establish that is the
      // single largest cost in the search.
      if (penetration + -clearance > ABANDON_PENETRATION) {
        penetration += -clearance;
        collidedWith.push(obstacle.id);
        break;
      }
      penetration += -clearance;
      collidedWith.push(obstacle.id);
    } else if (clearance < COMFORT_CLEARANCE) {
      // Squared, and normalised to the comfort radius, so nearly touching costs
      // far more than merely being close rather than only slightly more.
      //
      // The linear version was capped by its own construction: the shortfall can
      // never exceed the comfort radius, so an obstacle the arrow is *grazing*
      // scored barely worse than one it passes at a comfortable distance, and
      // once the length term was strong enough to matter the router started
      // buying shortness with clearance. It took the carbocation fixture from
      // 0.053 clear to 0.014 — a tenth of a millimetre on screen — to save three
      // per cent of its length.
      const closeness = (COMFORT_CLEARANCE - clearance) / COMFORT_CLEARANCE;
      crowding += closeness * closeness;
    }
  }
  if (!Number.isFinite(minimumClearance)) minimumClearance = 0;

  const departure = leads.length
    ? tailTangent(p0, leads[0].at, leads[0].shape.h1, leads[0].shape.along1)
    : tailTangent(p0, p1, drawn.h1, drawn.along1);
  const tailError = degrees(angleBetween(departure, source.outward));
  const headError = degrees(angleBetween(tangent, destination.inward));

  const bodyCurvature = maxCurvature(
    p0,
    p1,
    drawn,
    BODY_RANGE[0],
    BODY_RANGE[1],
  );

  // Only for candidates still in the running.
  //
  // This is a nested loop over the flattened curve, so on a multi-segment arrow
  // it is tens of thousands of segment-pair tests — far and away the most
  // expensive thing here, and it was being paid on every candidate. It feeds
  // nothing but a score term, and `better` never reaches the score for a
  // candidate that collides: those are ordered by what they hit and how deeply.
  // So for the majority of candidates, which do collide, the whole computation
  // was thrown away.
  const loops = collides ? false : selfIntersects(polyline);

  // Short arrows leaving a bond hug it unless pushed off, and then read as a
  // bump drawn on the bond rather than as a separate arrow.
  let bulge = 0;
  if (chord > 1e-9) {
    const dir = p1.sub(p0).scaled(1 / chord);
    for (const point of polyline) {
      const rel = point.sub(p0);
      bulge = Math.max(bulge, Math.abs(rel.x * -dir.y + rel.y * dir.x));
    }
  }
  // Every arrow bows, not just the short cleavage ones the source anchor asks
  // for. Scaled by the chord so a long arrow is not required to be absurdly
  // deep, nor a short one allowed to be flat.
  const requiredBulge = Math.max(source.minimumBulge, chord * MIN_BOW_FRACTION);
  const bulgeShortfall = Math.max(0, requiredBulge - bulge);

  // An arrow has to be bigger than its own arrowhead.
  //
  // Nothing said so, and for a bond reaching its own atom — a cleavage arrow,
  // where the two ends are barely a third of a bond apart — the tidiest thing
  // available was a stub tucked along the bond it came from, shorter end to end
  // than the head drawn on it. It reads as a smudge beside the bond rather than
  // as an arrow, and being small it never troubles any of the other terms.
  const lengthShortfall = Math.max(0, MIN_ARROW_LENGTH - length);

  // How much canvas the arrow occupies, as the furthest it strays from the
  // midpoint of its own chord.
  //
  // Length does not capture this: a tall thin loop and a compact one can be the
  // same distance travelled while taking up quite different amounts of room,
  // and it is the room that reads as an arrow being too big. Charged only
  // beyond the chord itself, so an ordinary arrow pays nothing.
  // Charged beyond a fraction of the chord, not beyond the whole chord.
  //
  // Spread cannot drop below half the chord — the endpoints are themselves that
  // far from the midpoint — so an allowance of one whole chord left twice the
  // envelope of a tidy arrow free of charge, and the term was very nearly inert.
  const midpoint = Vec2.centre(p0, p1);
  let spread = 0;
  for (const point of polyline) {
    spread = Math.max(spread, Vec2.dist(point, midpoint));
  }
  // Both conditions, not either.
  //
  // Triggering on the straight run alone was tried — an arrow is meant to be
  // curly for its whole length, so a third of it running straight looks like a
  // defect on its own. Measured, it caught nothing extra: the same four arrows
  // out of thirty-two came back badly shaped, because they already escalate and
  // the search simply has nothing better. It did take an ordinary arrow from six
  // candidates to thirty, so it was pure cost.
  // The straight run alone. Requiring a sharp peak alongside it was the hole
  // the reported arrow went through: it runs straight for nearly half its
  // length while rounding its corners gently enough to score 6.4, under any
  // peak threshold worth setting. What makes it the wrong shape is the straight
  // part, not how abruptly it leaves it.
  const cornerAndRun = bendProfile.straightFraction > CORNER_RUN_STRAIGHT;
  const straightExcess = Math.max(
    0,
    bendProfile.straightFraction - CORNER_RUN_STRAIGHT,
  );

  const spreadAllowance = chord * SPREAD_ALLOWANCE + SPREAD_FLOOR;
  const excessSpread = Math.max(0, spread - spreadAllowance);

  // Far too big is disqualifying, exactly as far too straight is.
  if (
    chord > 1e-9 &&
    spread / chord > MAX_SPREAD_RATIO &&
    spread > MAX_SPREAD_ABSOLUTE
  ) {
    collides = true;
    shapePenalty += OVERSIZE_PENETRATION;
    collidedWith.push('oversized');
  }
  // Separately: is this so much larger than it should be that it is worth
  // paying for the expensive stages of the search? See `ESCALATION_SPREAD`.
  const grosslyOversized = spread > chord * ESCALATION_SPREAD + SPREAD_FLOOR;

  const score =
    WEIGHTS.bulgeShortfall * bulgeShortfall +
    WEIGHTS.tooSmall * lengthShortfall +
    WEIGHTS.tailOffCentre * tailError +
    WEIGHTS.headOffCentre * headError +
    WEIGHTS.crowding * crowding +
    WEIGHTS.length * Math.max(0, length - chord) +
    WEIGHTS.lopsided * imbalance +
    WEIGHTS.spread * excessSpread +
    WEIGHTS.turnSharpness * turnExcess +
    WEIGHTS.straightRun * straightExcess +
    WEIGHTS.bodyCurvature * bodyCurvature +
    WEIGHTS.family[family] +
    (loops ? WEIGHTS.selfCrossing : 0) +
    WEIGHTS.profileOrder * HANDLE_PROFILES.indexOf(profile);

  return {
    leads: leads.map((turnPoint) => ({ at: turnPoint.at, ...turnPoint.shape })),
    bulgeShortfall,
    lengthShortfall,
    excessSpread,
    grosslyOversized,
    cornerAndRun,
    physical: escapes || obstacleHit,
    straightFraction: bendProfile.straightFraction,
    shape: drawn,
    family,
    collides,
    penetration,
    shapePenalty,
    score,
    polyline,
    head,
    end: p1,
    metrics: {
      obstacleIntersections: collidedWith.length,
      penetrationLength: penetration,
      headPenetration: 0,
      minimumClearance,
      clearanceDeficit: crowding,
      sourceTangentErrorDeg: tailError,
      headTangentErrorDeg: headError,
      pathLengthOverChord: chord < 1e-9 ? 1 : length / chord,
      inflections: reversals,
      collidedWith,
      candidatesEvaluated: 1,
    },
  };
}

/**
 * Clean routes beat colliding ones outright; among equals, the weights decide.
 *
 * Deliberately *not* "first family that works wins" — in a two-ring layout a
 * plain C can be collision-free while an S is dramatically shorter and clearly
 * the better drawing. The rules cut the space to a handful; the weights choose
 * within it.
 */
function better(a: Candidate, b: Candidate): boolean {
  // Hitting something is the worst thing a route can do, and is ranked on its
  // own before anything else. Being a poor shape is second — bad, but not a
  // reason to prefer a curve that runs through a bond.
  if (a.physical !== b.physical) return !a.physical;
  if (a.physical && Math.abs(a.penetration - b.penetration) > 1e-9) {
    return a.penetration < b.penetration;
  }

  if (a.collides !== b.collides) return !a.collides;
  if (a.collides && Math.abs(a.shapePenalty - b.shapePenalty) > 1e-9) {
    return a.shapePenalty < b.shapePenalty;
  }

  return a.score < b.score;
}

/**
 * Where a two-segment arrow may turn.
 *
 * Two families. Close in, a ring around the arrow's own midpoint sized to its
 * own chord — that is what a local step around one bond end needs.
 *
 * Further out, the points of the structure's own silhouette: for each
 * direction, the furthest anything drawn extends that way, nudged a little
 * beyond. Those are the places an arrow actually has to round, and using them
 * instead of a bigger circle is what keeps a long detour proportionate. On a
 * ring the arrow rounds an imaginary circle rather than the thing in its way,
 * which is why a target one atom along could end up with a wider sweep than one
 * three atoms further on — the size followed where the ring fell, not how far
 * the arrow actually had to go.
 *
 * A fixed set derived from the drawing, never a search over positions: the same
 * endpoints have to give the same arrow every time.
 */
function detourWaypoints(
  source: SourceAnchor,
  destination: DestinationAnchor,
  obstacles: Obstacle[],
): Array<{ at: Vec2; through: Vec2 }> {
  const centre = Vec2.centre(source.position, destination.position);

  // Floored so that a very short arrow still gets a detour big enough to clear
  // the bond it is stepping around, rather than one scaled down into it.
  const reach = Math.max(
    Vec2.dist(source.position, destination.position),
    DETOUR_MIN_REACH,
  );

  // How far the whole drawing extends from this arrow's midpoint. Nothing
  // beyond it can be *rounding* anything — there is only empty canvas out there
  // — so a turn point past it buys reach the arrow cannot need.
  let drawingReach = 0;
  for (const obstacle of obstacles) {
    const box = obstacleBounds(obstacle);
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        const dx = x - centre.x;
        const dy = y - centre.y;
        drawingReach = Math.max(drawingReach, Math.hypot(dx, dy));
      }
    }
  }
  const limit = drawingReach + DETOUR_MIN_REACH;

  const waypoints: Array<{ at: Vec2; through: Vec2 }> = [];

  /**
   * Turn points are filtered before they are built into curves, not after.
   *
   * Every waypoint that survives costs three full candidate evaluations, each
   * flattening two cubics and testing them against the obstacle set — measured
   * at roughly six seconds per arrow when all of them survived. Two cheap tests
   * remove most of them for nothing:
   *
   * - beyond the drawing, where an arrow would be swinging out into empty space
   *   rather than around anything;
   * - inside something solid, where the arrow cannot turn at all, so the
   *   candidate was always going to be discarded as a collision.
   */
  const add = (at: Vec2, outward: Vec2) => {
    if (Vec2.dist(at, centre) > limit) return;

    for (const obstacle of obstacles) {
      if (
        source.exempt.has(obstacle.id) ||
        destination.exempt.has(obstacle.id)
      ) {
        continue;
      }
      const inside =
        obstacle.shape === 'capsule'
          ? pointSegmentDistanceXY(
              at.x,
              at.y,
              obstacle.capsule.a.x,
              obstacle.capsule.a.y,
              obstacle.capsule.b.x,
              obstacle.capsule.b.y,
            ) < obstacle.capsule.r
          : pointBoxDistance(at, obstacle.box) <= 0;
      if (inside) return;
    }

    waypoints.push({ at, through: new Vec2(-outward.y, outward.x) });
    waypoints.push({ at, through: new Vec2(outward.y, -outward.x) });
  };

  for (let i = 0; i < DETOUR_DIRECTIONS; i++) {
    const outward = unitOf((2 * Math.PI * i) / DETOUR_DIRECTIONS);

    for (const scale of DETOUR_RADII) {
      add(centre.addScaled(outward, reach * scale), outward);
    }

    // How far the drawing itself reaches this way, measured from the arrow.
    let support = 0;
    for (const obstacle of obstacles) {
      const box = obstacleBounds(obstacle);
      for (const x of [box.min.x, box.max.x]) {
        for (const y of [box.min.y, box.max.y]) {
          support = Math.max(
            support,
            (x - centre.x) * outward.x + (y - centre.y) * outward.y,
          );
        }
      }
    }

    if (support > 0) {
      add(centre.addScaled(outward, support + DETOUR_MIN_REACH), outward);
    }
  }

  return waypoints;
}

/**
 * Turn points ringing the arrow's own endpoints, at absolute distances.
 *
 * These are what let an arrow curl around its target and come in from the far
 * side. When the user drops on an approach lobe the arrival direction is pinned,
 * and if it faces away from where the electrons are coming from, the only way to
 * satisfy it is to travel across and then hook round the destination. The hook
 * belongs next to the destination and is sized by it.
 *
 * Deliberately not {@link detourWaypoints}, whose ring is centred on the arrow's
 * midpoint and scaled to its chord. That is the right shape for stepping around
 * an obstacle mid-journey and the wrong one here: for a long arrow its nearest
 * turn point is several bond lengths away from either end, so the tightest curl
 * it can describe near the target is far larger than the target.
 *
 * Both ends get a ring. The tail needs the same freedom for the mirror-image
 * case, where the lone pair points away from the target and the arrow has to
 * leave backwards and come round.
 */
function endpointWaypoints(
  source: SourceAnchor,
  destination: DestinationAnchor,
  around: 'both' | 'source' | 'destination' = 'both',
  tilts: readonly number[] = [0],
): Array<{ at: Vec2; through: Vec2 }> {
  const waypoints: Array<{ at: Vec2; through: Vec2 }> = [];

  const centres =
    around === 'source'
      ? [source.position]
      : around === 'destination'
      ? [destination.position]
      : [destination.position, source.position];

  for (const centre of centres) {
    for (let i = 0; i < ENDPOINT_TURN_DIRECTIONS; i++) {
      const outward = unitOf((2 * Math.PI * i) / ENDPOINT_TURN_DIRECTIONS);
      for (const radius of ENDPOINT_TURN_RADII) {
        const at = centre.addScaled(outward, radius);
        // Travelling across the radius, so the arrow sweeps around the endpoint
        // rather than driving at it. Both signs, since which way round the curl
        // goes is exactly the choice being offered.
        //
        // Also a few directions either side of square-on. A turn point fixes
        // both halves of the curve at once — the lead arrives along `through`
        // and the second segment leaves along it — so the tangent there is as
        // much of the shape as the position is, and offering only the two
        // perpendiculars fixes two thirds of the curve from a list of eight
        // positions.
        for (const tilt of tilts) {
          const perpendicular = new Vec2(-outward.y, outward.x);
          waypoints.push({ at, through: turn(perpendicular, tilt) });
          waypoints.push({ at, through: turn(perpendicular.negated(), tilt) });
        }
      }
    }
  }

  return waypoints;
}

/**
 * A chain of cubics through the given turn points, matched at every join.
 *
 * The joins are the whole point. Building each segment independently from its
 * own chord — which is what {@link buildFromTangents} does — gives the two sides
 * of a turn point the same handle length *as a fraction of different chords*,
 * so a short half and a long half meet with very different curvature. The
 * directions still line up, so there is no kink, but the curvature jumps: the
 * curve visibly flattens on one side of the join and tightens on the other, and
 * a chain of those reads as squared-off rather than curly.
 *
 * Using one absolute handle length either side of each join makes the curvature
 * very nearly continuous there. Taken from the shorter of the two segments so
 * the longer one cannot overpower a short neighbour and bulge it out of shape.
 */
function throughTurnPoints(
  from: Vec2,
  turnPoints: Array<{ at: Vec2; through: Vec2 }>,
  to: Vec2,
  outward: Vec2,
  inward: Vec2,
  profile: HandleProfile,
): Array<CurveShape | null> {
  const points = [from, ...turnPoints.map((turn) => turn.at), to];
  const directions = [
    outward,
    ...turnPoints.map((turn) => turn.through),
    inward,
  ];

  const spans: number[] = [];
  for (let i = 1; i < points.length; i++) {
    spans.push(Vec2.dist(points[i - 1], points[i]));
  }
  if (spans.some((span) => span < 1e-9)) return points.map(() => null);

  // One handle length per interior join, shared by the segments either side.
  const joinLengths = spans.map((span, i) =>
    i + 1 < spans.length
      ? Math.min(span, spans[i + 1]) * profile.l2
      : span * profile.l2,
  );

  const shapes: Array<CurveShape | null> = [];
  for (let i = 0; i < spans.length; i++) {
    shapes.push(
      shapeFromHandles(
        points[i],
        points[i + 1],
        directions[i],
        directions[i + 1],
        i === 0 ? spans[i] * profile.l1 : joinLengths[i - 1],
        joinLengths[i],
      ),
    );
  }
  return shapes;
}

/**
 * Crossover points for a real S — two arcs meeting in the middle.
 *
 * This is the replacement for the single-cubic S, not merely a ban on it. A
 * cubic has four control points and can bend twice in total; asking it to bow
 * one way and then the other spends both bends at the ends and leaves the
 * middle running dead straight, which is the "Z with smooth corners" that kept
 * coming out. The shape has nothing wrong with it that better weights could
 * reach — four points cannot express it.
 *
 * Two cubics joined at a crossover have seven, and that is enough. The join
 * sits near the middle of the journey with the arrow passing through it
 * travelling *along* the chord, so the first half arcs one way, the second half
 * arcs the other, and the reversal happens in the middle where it belongs
 * rather than being crushed into the two ends.
 *
 * Offsets are absolute, in bond lengths, and include zero — a crossover sitting
 * exactly on the chord is the symmetric S, and the others lean it one way or
 * the other.
 */
function crossoverWaypoints(
  source: SourceAnchor,
  destination: DestinationAnchor,
): Array<{ at: Vec2; through: Vec2 }> {
  const axis = destination.position.sub(source.position);
  const chord = axis.length();

  // Only for arrows with a middle worth crossing in.
  //
  // A cleavage arrow runs from a bond's midpoint to one of that bond's own
  // atoms, barely half a bond end to end. Offering it a crossover gives it a
  // reversal it has no room for, and the fixtures lost the bow that keeps such
  // an arrow clear of the bond it depicts breaking.
  if (chord < MIN_CROSSOVER_CHORD) return [];

  const along = axis.scaled(1 / chord);
  const sideways = new Vec2(-along.y, along.x);

  const waypoints: Array<{ at: Vec2; through: Vec2 }> = [];
  for (const position of CROSSOVER_POSITIONS) {
    const base = source.position.addScaled(along, chord * position);
    for (const offset of CROSSOVER_OFFSETS) {
      const at = base.addScaled(sideways, offset);
      // The direction through the crossover, not only straight along the chord.
      //
      // Fixing it to the chord looked right — that is what makes the two halves
      // read as separate arcs — and it is far too rigid. The chord of a long
      // arrow points through whatever lies between its endpoints, so insisting
      // the curve pass the middle on that heading forces one arc or the other
      // into the structure. Measured, every two-segment candidate for the
      // reported arrow collided, and widening the offsets alone did not free a
      // single one; the heading was what was stuck.
      for (const lean of CROSSOVER_LEANS) {
        waypoints.push({ at, through: turn(along, lean) });
      }
    }
  }

  return waypoints;
}

function unitOf(radians: number): Vec2 {
  return new Vec2(Math.cos(radians), Math.sin(radians));
}

/** Rotate a unit vector by `radians`. */
function turn(v: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return new Vec2(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
}

/**
 * Every curve worth considering for one pair of anchors.
 *
 * The tangent directions are bounded by the cones — the tail must leave within
 * ±35 degrees of straight out from its lone pair, the head must arrive inside
 * the free sector it was given. Within those bounds a few directions are
 * offered, because pinning the tangents to the exact centre leaves the curve no
 * freedom at all: for fixed endpoints *and* fixed tangents there is only one
 * family of curves, so nothing can be dodged.
 *
 * Enforcing the cone by construction rather than as a penalty is what keeps
 * arrows out of their own source atom. An earlier version derived tangents from
 * the chord and merely scored the deviation afterwards, which let badly-aimed
 * curves through.
 *
 * Ordered so the most conventional option is first — dead centre, balanced
 * handles — and evaluation stops as soon as something clean is found there.
 * The wider combinations exist for crowded structures and cost nothing when
 * they are not needed.
 */
function candidatesFor(
  source: SourceAnchor,
  destination: DestinationAnchor,
  obstacles: Obstacle[],
  trim: number,
  boundary: ReadonlyArray<readonly [Vec2, Vec2]>,
): Candidate[] {
  const p0 = source.position;
  const anchor = destination.position;
  if (Vec2.dist(p0, anchor) < 1e-9) return [];

  const results: Candidate[] = [];

  /**
   * Whether the search has spent its allowance.
   *
   * A ceiling on work, not on quality: the tiers below are ordered so the
   * cheapest and most likely constructions come first, and an arrow that has not
   * found a decent shape after this many curves is one where the remaining tiers
   * are searching for something that probably is not there. Without it a hard
   * arrow ran to four thousand candidates and several seconds, which is far past
   * the point of drawing it live.
   */
  const spent = () => results.length >= CANDIDATE_BUDGET;

  const sweep = (
    tailOffsets: number[],
    headOffsets: number[],
    profiles: readonly HandleProfile[],
  ) => {
    for (const tailOffset of tailOffsets) {
      const tail = turn(source.outward, tailOffset);
      for (const headOffset of headOffsets) {
        const head = turn(destination.inward, headOffset);
        for (const profile of profiles) {
          const shape = buildFromTangents(p0, anchor, tail, head, profile);
          if (!shape) continue;
          results.push(
            evaluate(
              shape,
              source,
              destination,
              obstacles,
              trim,
              profile,
              boundary,
            ),
          );
        }
      }
    }
  };

  // Good enough to stop at: avoids everything, and is visibly a curly arrow.
  //
  // Flatness has to end the search as surely as a collision does. The tangent
  // directions are what bow a curve — handle length alone cannot — so when the
  // head-on pair happens to lie along the chord, every profile in this first
  // sweep comes out nearly straight and returning early locks that in. That was
  // the shallow scoop that read as a bracket rather than an arrow.
  //
  // Size deliberately does *not* end the search, though it is scored heavily.
  // Adding "and compact enough" here is the obvious next move and was tried:
  // measured, it took the SN2 fixture from 6 candidates to 42 and improved its
  // spread ratio from 0.51 to 0.50, while leaving every oversized arrow in the
  // two-molecule layout exactly where it was. Those are not held back by the
  // search stopping too early — the tidier shape is not in the candidate set at
  // all — so this only bought a sevenfold cost on the path every ordinary arrow
  // takes.
  //
  // Turn sharpness is excluded for a different and firmer reason: it is measured
  // per flattened step, and the flattener adapts its step count to the curve's
  // size, so a short tightly-curled arrow turns more per step than a long gentle
  // one through the same total angle. Sound for ranking candidates for one arrow
  // — all the same scale — and unsound as an absolute threshold.
  const settled = (candidate: Candidate) =>
    !candidate.collides &&
    candidate.bulgeShortfall <= 0 &&
    candidate.lengthShortfall <= 0;

  // The conventional arrow: straight out of the lone pair, straight into the
  // free sector. Almost every arrow in an ordinary drawing ends here.
  /**
   * Whether anything found so far is both clean and a sensible size.
   *
   * The two-segment rescue at the bottom is gated on this rather than on
   * collisions alone. An arrow that avoids the structure by sprawling across
   * the page is a defect the user reports, not a success — but it *is* clean, so
   * every "did we find something?" test passes and the search stops before the
   * construction that could have drawn it tidily is ever tried.
   */
  /**
   * Whether the candidate that would actually be *chosen* is good enough to
   * stop looking.
   *
   * Judged on the winner, not on whether some acceptable curve exists anywhere
   * in the set. Those are different questions and the difference is a real
   * defect: a rung can contain both a tidy candidate and a corner-and-run one,
   * pass a "does anything good exist" test, and then hand the corner-and-run
   * curve to the user because it happened to score better on length and
   * clearance. Measured, an arrow with half its length running straight ended
   * the search after six candidates that way.
   */
  const chosen = (): Candidate | null => {
    let best: Candidate | null = null;
    for (const candidate of results) {
      if (!best || better(candidate, best)) best = candidate;
    }
    return best;
  };

  const chosenIsGood = () => {
    const best = chosen();
    return Boolean(
      best &&
        !best.collides &&
        !best.grosslyOversized &&
        best.straightFraction <= MAX_STRAIGHT_RUN,
    );
  };

  /**
   * A stricter bar, used only between the turn-point tiers.
   *
   * `cornerAndRun` needs a sharp curvature peak alongside the straight run,
   * which keeps it cheap enough to consult on every rung of the main ladder but
   * lets a long, gently-rounded straight stretch pass as acceptable. Reaching
   * the turn-point tiers already means the arrow is in trouble, so there is
   * nothing to protect here and the straight run alone is worth acting on.
   *
   * Judged against the limit an arrow must not exceed, not against the figure
   * it should ideally hit. Using the ideal here meant almost nothing ever
   * qualified as good enough to stop for, so every arrow ground through every
   * tier — four thousand candidates and several seconds each. "Keep looking
   * until this is acceptable" and "keep looking until this is perfect" are very
   * different instructions, and only the first one terminates.
   */
  const chosenIsWellShaped = () => {
    const best = chosen();
    return Boolean(
      best &&
        !best.collides &&
        !best.grosslyOversized &&
        best.straightFraction <= MAX_STRAIGHT_RUN,
    );
  };

  /**
   * The two-arc S, offered as a first-class family rather than a last resort.
   *
   * Placed here, immediately after the plain head-on curves, because for many
   * pairs of endpoints it *is* the natural arrow — the electrons leave one way
   * and have to arrive from the other, and a chemist draws that as two arcs
   * flowing through a crossover. Left at the bottom of the ladder it was only
   * ever reached after everything else had failed, by which time a curve going
   * the long way round the outside had already been accepted.
   */
  const sweepCrossovers = () => {
    for (const waypoint of crossoverWaypoints(source, destination)) {
      if (spent()) break;
      for (const profile of CROSSOVER_PROFILES) {
        const [lead, shape] = throughTurnPoints(
          p0,
          [waypoint],
          anchor,
          source.outward,
          destination.inward,
          profile,
        );
        if (!lead || !shape) continue;

        results.push(
          evaluate(
            shape,
            source,
            destination,
            obstacles,
            trim,
            profile,
            boundary,
            [{ at: waypoint.at, shape: lead }],
          ),
        );
      }
    }
  };

  sweep([0], [0], HANDLE_PROFILES);
  if (results.some(settled) && chosenIsGood()) return results;

  // The two-arc S comes next, before any of the widening below.
  //
  // Not before the plain curves, though that was tried: offered first it
  // displaced perfectly good single arcs with longer S curves — the carbocation
  // fixture went from a C of 1.15 chords to an S of 1.37 — because an S is
  // available for almost any pair of endpoints and will win something. It is the
  // right answer when a single arc cannot do the job, which is exactly what
  // failing the gate above means.
  sweepCrossovers();
  if (results.some(settled) && chosenIsGood()) return results;

  // Nothing clean head-on, so widen within the cones. Only the profiles that
  // change the curve's reach are worth repeating here; the asymmetric ones
  // mostly shift where the bend sits, which does not help escape an obstacle.
  //
  // Offering all six was tried, reasoning that where the bend sits is what makes
  // an arrow read as curly. Measured, it aimed the arrowhead markedly worse —
  // head tangent error on the carbocation fixture went from 6.1 to 21.3 degrees
  // — for a little more clearance (0.053 to 0.074, both comfortably clear) and a
  // slightly shorter path. A shaft arriving across its own head is the more
  // visible defect of the two, so the filter stays.
  const tailReach = source.cone * 0.75;
  const headReach = destination.cone * 0.75;
  const escapeProfiles = HANDLE_PROFILES.filter((profile) =>
    ['balanced', 'deep', 'sweep', 'wide-sweep'].includes(profile.id),
  );

  sweep([tailReach, -tailReach], [0, headReach, -headReach], escapeProfiles);
  if (results.some(settled) && chosenIsGood()) return results;

  sweep([0], [headReach, -headReach], escapeProfiles);

  // Clean *and* compact ends the ladder here. Clean alone is not enough.
  //
  // A single cubic with both tangents pinned has only its two handle lengths
  // free, and some ways round a structure are simply not in that family however
  // those are set — so when the compact options all collide, what survives is a
  // curve that avoids everything by sprawling. Returning on "clean" meant that
  // sprawl pre-empted the two-segment stage below, which is the construction
  // that can actually turn tightly and then run straight.
  //
  // Measured: three arrows in the two-molecule layout came out at spread ratios
  // of 0.81 to 0.91 as single curves, having previously been two-segment ones at
  // 0.60 to 0.74. Nothing had got worse at picking; the better shape had stopped
  // being built.
  //
  // Costs nothing on an ordinary arrow, which clears this with room to spare.
  if (chosenIsGood()) return results;

  // Nothing compact avoids the structure, so reach for the long way round.
  //
  // The user picked this approach; refusing to draw anything, or silently
  // arriving somewhere else, are both worse than an unusual arrow. Tangents go
  // to the edge of the cone here rather than three-quarters of the way, because
  // the sweep has to leave almost sideways to get around anything.
  if (!results.some((candidate) => !candidate.collides)) {
    sweep(
      [source.cone, -source.cone, 0],
      [destination.cone, -destination.cone, 0],
      DETOUR_PROFILES,
    );
  }

  // Deliberately no early return here.
  //
  // A single cubic with handles several times its own chord balloons out
  // wildly, and stopping as soon as one of those happened to avoid the
  // structure meant the two-segment curves below were never even built — so
  // the cases that could reach their target *only* with a waypoint came out
  // neat, while the ones that could just about manage without came out
  // sprawling. Being last in the ladder is about how exotic a construction is,
  // not about how good it looks, so both are offered and scoring chooses.
  //
  // One cubic with both end tangents pinned has only two free numbers — the
  // handle lengths — and that is a two-parameter family of shapes. Some ways
  // round a structure are simply not in it, however long the handles get. A
  // waypoint adds the freedom back, and the two halves share their tangent
  // there, so it stays one smooth stroke rather than two arrows meeting.
  // Turn points in tiers, cheapest first, each tried only if the last left the
  // arrow badly shaped.
  //
  // These were gated on whether the user pinned the arrival, to keep their cost
  // off ordinary arrows. That looked reasonable and was badly wrong: an approach
  // is only pinned when the release lands exactly on an approach lobe, and
  // releasing anywhere else on the target leaves the router to choose. So the
  // gate switched the whole fix off for the commonest way of drawing an arrow —
  // every measurement here said the shapes were fixed while the application was
  // unchanged.
  //
  // Tiering replaces it and gates on the thing that actually matters, which is
  // whether the arrow is any good yet. An ordinary arrow never reaches this loop
  // at all; one that does stops as soon as it has a decent shape.
  const oneBendTiers = [
    () => detourWaypoints(source, destination, obstacles),
    () => endpointWaypoints(source, destination),
    () => endpointWaypoints(source, destination, 'both', ENDPOINT_TURN_TILTS),
  ];

  for (const tier of oneBendTiers) {
    if (spent()) break;
    for (const waypoint of tier()) {
      if (spent()) break;
      for (const profile of WAYPOINT_PROFILES) {
        const lead = buildFromTangents(
          p0,
          waypoint.at,
          source.outward,
          waypoint.through,
          profile,
        );
        const shape = buildFromTangents(
          waypoint.at,
          anchor,
          waypoint.through,
          destination.inward,
          profile,
        );
        if (!lead || !shape) continue;

        results.push(
          evaluate(
            shape,
            source,
            destination,
            obstacles,
            trim,
            profile,
            boundary,
            [{ at: waypoint.at, shape: lead }],
          ),
        );
      }
    }
    if (chosenIsWellShaped()) return results;
  }

  if (chosenIsWellShaped()) return results;

  // Two turn points: the shape a single bend cannot reach at all.
  //
  // Every placement of one turn point has been tried by here — rings around
  // each endpoint, a ring around the whole drawing, a bend part way along, and
  // every tangent through them. The arrows that survive all of that need to
  // bend *twice*: away from the tail, across, and then back to meet a pinned
  // arrival from the far side. That is a genuinely different curve, not a
  // better-tuned version of a one-bend one, and it is what a chemist draws when
  // asked for the same arrow by hand.
  //
  // Paired one turn point from each endpoint's own ring rather than searching
  // all pairs: the two bends belong near the two ends, one getting the arrow
  // away from the tail and the other bringing it into the head, and every pair
  // of the full set is thousands of curves for shapes that duplicate what one
  // bend already covers.
  // A far coarser ring than the single-bend search uses. Pairing two full rings
  // is their product — some seven thousand curves per arrow, which took the
  // measurement harness past ten minutes for thirty-two routes. Two bends have
  // enough freedom between them that the placement of each matters much less
  // than it does when one bend has to do everything, so four directions at one
  // radius per end is plenty and keeps the product to a few hundred.
  const pairRing = (centre: Vec2) => {
    const points: Array<{ at: Vec2; through: Vec2 }> = [];
    for (let i = 0; i < PAIRED_TURN_DIRECTIONS; i++) {
      const outward = unitOf((2 * Math.PI * i) / PAIRED_TURN_DIRECTIONS);
      const at = centre.addScaled(outward, PAIRED_TURN_RADIUS);
      points.push({ at, through: new Vec2(-outward.y, outward.x) });
      points.push({ at, through: new Vec2(outward.y, -outward.x) });
    }
    return points;
  };

  const tailTurns = pairRing(source.position);
  const headTurns = pairRing(destination.position);

  for (const first of tailTurns) {
    if (spent()) break;
    for (const second of headTurns) {
      if (spent()) break;
      // A pair that doubles back on itself is a knot, not an arrow.
      if (Vec2.dist(first.at, second.at) < DETOUR_MIN_REACH) continue;

      for (const profile of WAYPOINT_PROFILES) {
        const [lead, middle, shape] = throughTurnPoints(
          p0,
          [first, second],
          anchor,
          source.outward,
          destination.inward,
          profile,
        );
        if (!lead || !middle || !shape) continue;

        results.push(
          evaluate(
            shape,
            source,
            destination,
            obstacles,
            trim,
            profile,
            boundary,
            [
              { at: first.at, shape: lead },
              { at: second.at, shape: middle },
            ],
          ),
        );
      }
    }
  }

  return results;
}

function toRoute(
  candidate: Candidate,
  source: SourceAnchor,
  destination: DestinationAnchor,
): Route {
  return {
    leads: candidate.leads.map((turnPoint) => ({
      at: turnPoint.at,
      h1: quantise(turnPoint.h1),
      h2: quantise(turnPoint.h2),
      along1: quantise(turnPoint.along1),
      along2: quantise(turnPoint.along2),
    })),
    h1: quantise(candidate.shape.h1),
    h2: quantise(candidate.shape.h2),
    along1: quantise(candidate.shape.along1),
    along2: quantise(candidate.shape.along2),
    p0: source.position,
    p1: candidate.end,
    polyline: candidate.polyline,
    head: candidate.head,
    sectorId: destination.sector.id,
    routeClass: classify(candidate.shape, candidate.family),
    // Physical only. `fallback` means the structure could not be avoided, which
    // is what the renderer and the tests read it as; a route that avoids
    // everything but is a poor shape is still a real route.
    fallback: candidate.physical,
    metrics: candidate.metrics,
  };
}

/**
 * Drop one arrow's own capsules from a shared obstacle set.
 *
 * The set is built once per gesture and reused, so a re-routed arrow has to be
 * subtracted from it here rather than skipped when it was built.
 */
function withoutArrow(
  obstacles: Obstacle[],
  struct: MechanismStruct,
  excludeArrow?: MechanismArrowShape,
): Obstacle[] {
  if (!excludeArrow || !struct.rxnArrows) return obstacles;

  let arrowId: number | null = null;
  struct.rxnArrows.forEach((arrow, id) => {
    if (arrow === excludeArrow) arrowId = id;
  });
  if (arrowId === null) return obstacles;

  const prefix = `arrow:${arrowId}:`;
  return obstacles.filter((obstacle) => !obstacle.id.startsWith(prefix));
}

/**
 * Pick a curve for one mechanism arrow.
 *
 * The chemistry — which lone pair, which atom — is settled before this runs and
 * is never changed by it. All this decides is the shape.
 */
export function routeArrow(
  request: RoutingRequest,
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  options: MechanismOptions,
  prebuiltObstacles?: Obstacle[],
): Route | null {
  const source = resolveSourceAnchor(request.source, struct, metrics, options);
  if (!source) return null;

  const destinations = resolveDestinationAnchors(
    request.destination,
    request.source,
    source.position,
    struct,
    metrics,
    options,
  );
  if (destinations.length === 0) return null;

  const obstacles = prebuiltObstacles
    ? withoutArrow(prebuiltObstacles, struct, request.excludeArrow)
    : buildObstacles(struct, metrics, request.excludeArrow);
  // The bonds that bound a closed region. An arrow may not cross out of the
  // region it starts in, and the inside of a ring is empty space, so nothing in
  // the obstacle set catches that on its own.
  const boundary = enclosingBonds(struct);
  let best: Candidate | null = null;
  let bestAnchor: DestinationAnchor | null = null;
  let evaluated = 0;

  // Sectors are ranked by how well they face the incoming electrons, and each
  // one costs a full sweep of shapes. Later sectors are examined only when
  // nothing clean was found in the ones before.
  //
  // This is not the "first thing that works wins" trap: within a sector every
  // shape is still built and scored, so an S can still beat a collision-free C
  // on merit. What is skipped is a *worse approach direction* once a good one
  // has yielded a clean arrow.
  for (const destination of destinations) {
    const candidates = candidatesFor(
      source,
      destination,
      obstacles,
      destination.trim,
      boundary,
    );
    evaluated += candidates.length;

    for (const candidate of candidates) {
      if (!best || better(candidate, best)) {
        best = candidate;
        bestAnchor = destination;
      }
    }

    if (!best || best.physical) continue;

    // When the user pinned the arrival, the first sector *is* the answer.
    //
    // `resolveDestinationAnchors` puts the aimed sector first and keeps the
    // others only as fallbacks for when the pin cannot be reached at all. Going
    // on to weigh those on shape lets a tidier curve arriving at the wrong face
    // beat the face that was actually asked for — which is not a better arrow,
    // it is a different one. Any clean route through the pinned sector wins.
    // Shape alone never sends the search to a different face — only actually
    // hitting something does. Otherwise a rule about size or straightness
    // silently overrides the approach the user chose.
    if (destination.pinned && !best.physical) break;

    // Unpinned, the sector is the router's own choice, so it should be a good
    // one. Stopping merely on "collision-free" is the same premature-stopping
    // defect as inside `candidatesFor`: a sector yielding a clean but oversized
    // or corner-and-run curve pre-empts a later sector that would have given a
    // tidy one. Widening the search made this visible — an arrow measured 0.82
    // of its chord where it had been 0.74.
    if (!best.grosslyOversized && !best.cornerAndRun) break;
  }

  if (!best || !bestAnchor) return null;

  const route = toRoute(best, source, bestAnchor);
  route.metrics.candidatesEvaluated = evaluated;
  return route;
}

/**
 * Route every arrow of one elementary step, sharing the obstacle set.
 *
 * Arrows are deliberately not jointly optimised: an arrow must never move
 * because a later one was drawn. Avoiding arrows already on the canvas is
 * handled by putting them in the obstacle set instead.
 */
export function routeArrowSet(
  requests: RoutingRequest[],
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  options: MechanismOptions,
): Array<Route | null> {
  const obstacles = buildObstacles(struct, metrics);
  return requests.map((request) =>
    routeArrow(request, struct, metrics, options, obstacles),
  );
}
