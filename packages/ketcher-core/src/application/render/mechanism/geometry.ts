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
// The defaults live with the entity that stores them, so the renderer, the
// serializer and the router cannot drift apart on what "no value" means.
import { DEFAULT_ALONG_1, DEFAULT_ALONG_2 } from 'domain/entities/rxnArrow';

/**
 * Geometry primitives for mechanism-arrow routing.
 *
 * Everything here is pure and works in model units, where one unit is one bond
 * length. No Raphael, no DOM — so the router can be exercised headlessly.
 */

/** A line segment thickened by `r`. Bonds, dots and charge glyphs all reduce to one. */
export interface Capsule {
  a: Vec2;
  b: Vec2;
  r: number;
}

/** Axis-aligned box, used for text labels. */
export interface Box {
  min: Vec2;
  max: Vec2;
}

export function makeDisc(centre: Vec2, r: number): Capsule {
  return { a: centre, b: centre, r };
}

// ─── cubic bezier in the renderer's chord-relative parameterisation ──────────

/**
 * Unit vector perpendicular to the chord, in the direction that a **positive**
 * h offset bulges.
 *
 * This must agree with `draw.ts`, which builds the path in a local frame where
 * the chord lies along +x and the control points sit at local y = -h*4/3, then
 * rotates by the chord angle. Rotating local (0,-1) by the chord angle gives
 * (chordDir.y, -chordDir.x).
 */
export function perpendicularOfChord(chordDir: Vec2): Vec2 {
  return new Vec2(chordDir.y, -chordDir.x);
}

/**
 * The 4/3 factor is not decorative: with both control points offset by h*4/3,
 * a symmetric cubic peaks at exactly `h`, which is what makes `height` mean
 * "peak deviation from the chord" and keeps cubic arrows visually identical to
 * the legacy quadratic ones.
 *
 * Anything that samples the curve for collision testing MUST include it, or it
 * measures a curve 25% flatter than the one actually drawn.
 */
export const CONTROL_POINT_SCALE = 4 / 3;

/**
 * The four numbers that define a mechanism arrow's curve, all relative to the
 * chord so they survive moving, rotating and zooming the structure.
 */
export interface CurveShape {
  h1: number;
  h2: number;
  along1: number;
  along2: number;
}

export function cubicControlPoints(
  p0: Vec2,
  p1: Vec2,
  h1: number,
  h2: number,
  along1: number = DEFAULT_ALONG_1,
  along2: number = DEFAULT_ALONG_2,
): [Vec2, Vec2] {
  const chord = p1.sub(p0);
  const len = chord.length();
  if (len < 1e-9) return [new Vec2(p0), new Vec2(p1)];

  const dir = chord.scaled(1 / len);
  const perp = perpendicularOfChord(dir);
  const k = CONTROL_POINT_SCALE;

  return [
    p0.addScaled(dir, len * along1).addScaled(perp, h1 * k),
    p0.addScaled(dir, len * along2).addScaled(perp, h2 * k),
  ];
}

/**
 * Build a curve from the Hermite form: a direction to leave along and a
 * direction to arrive along, plus how far the control points sit down each.
 *
 * This is the parameterisation the router searches, and it is what makes wide
 * sweeps reachable. Chemistry already fixes both tangent directions — leave
 * radially from the lone pair, arrive through the free sector — so the only
 * unknowns are the two handle lengths. Searching those is two-dimensional,
 * exactly as cheap as the old perpendicular-only search, while allowing a head
 * tangent at any angle to the chord rather than the 75 degrees the old
 * parameterisation could express.
 */
export function shapeFromHandles(
  p0: Vec2,
  p1: Vec2,
  tailDir: Vec2,
  headDir: Vec2,
  length1: number,
  length2: number,
): CurveShape {
  const chord = p1.sub(p0);
  const len = chord.length();
  if (len < 1e-9) {
    return {
      h1: 0,
      h2: 0,
      along1: DEFAULT_ALONG_1,
      along2: DEFAULT_ALONG_2,
    };
  }

  const dir = chord.scaled(1 / len);
  const perp = perpendicularOfChord(dir);

  const c1 = p0.addScaled(tailDir, length1);
  const c2 = p1.addScaled(headDir, -length2);

  const decompose = (c: Vec2) => {
    const rel = c.sub(p0);
    return {
      along: (rel.x * dir.x + rel.y * dir.y) / len,
      h: (rel.x * perp.x + rel.y * perp.y) / CONTROL_POINT_SCALE,
    };
  };

  const first = decompose(c1);
  const second = decompose(c2);

  return {
    h1: first.h,
    h2: second.h,
    along1: first.along,
    along2: second.along,
  };
}

export function cubicPoint(
  p0: Vec2,
  p1: Vec2,
  h1: number,
  h2: number,
  t: number,
  along1?: number,
  along2?: number,
): Vec2 {
  const [c1, c2] = cubicControlPoints(p0, p1, h1, h2, along1, along2);
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;

  return new Vec2(
    a * p0.x + b * c1.x + c * c2.x + d * p1.x,
    a * p0.y + b * c1.y + c * c2.y + d * p1.y,
  );
}

/**
 * Unit tangent at the tail. Analytic — no sampling needed, because the first
 * derivative at t=0 is just 3*(C1 - P0).
 */
export function tailTangent(
  p0: Vec2,
  p1: Vec2,
  h1: number,
  along1?: number,
): Vec2 {
  const [c1] = cubicControlPoints(p0, p1, h1, h1, along1, along1);
  const d = c1.sub(p0);
  const len = d.length();
  return len < 1e-9 ? p1.sub(p0).normalized() : d.scaled(1 / len);
}

/** Unit tangent at the head, from the derivative at t=1: 3*(P3 - C2). */
export function headTangent(
  p0: Vec2,
  p1: Vec2,
  h1: number,
  h2: number,
  along1?: number,
  along2?: number,
): Vec2 {
  const [, c2] = cubicControlPoints(p0, p1, h1, h2, along1, along2);
  const d = p1.sub(c2);
  const len = d.length();
  return len < 1e-9 ? p1.sub(p0).normalized() : d.scaled(1 / len);
}

/**
 * Flatten to a polyline whose deviation from the true curve is within
 * `tolerance`.
 *
 * Uniform subdivision with an analytic segment count rather than recursive
 * subdivision: the polyline deviation of a cubic under n uniform segments is
 * bounded by max|B''|/(8n^2), and B'' is linear in t so its maximum is at one
 * of the endpoints. That makes the segment count a closed form, which keeps
 * flattening deterministic — important, because scoring compares candidates
 * and a varying sample count would make the comparison noisy.
 */
export function flattenCubic(
  p0: Vec2,
  p1: Vec2,
  h1: number,
  h2: number,
  tolerance = 0.004,
  maxSegments = 64,
  along1?: number,
  along2?: number,
): Vec2[] {
  const [c1, c2] = cubicControlPoints(p0, p1, h1, h2, along1, along2);

  // B''(0)/6 = P0 - 2*C1 + C2 ; B''(1)/6 = C1 - 2*C2 + P1
  const d0x = p0.x - 2 * c1.x + c2.x;
  const d0y = p0.y - 2 * c1.y + c2.y;
  const d1x = c1.x - 2 * c2.x + p1.x;
  const d1y = c1.y - 2 * c2.y + p1.y;
  const secondDerivative =
    6 * Math.max(Math.hypot(d0x, d0y), Math.hypot(d1x, d1y));

  const n =
    secondDerivative < 1e-9
      ? 1
      : Math.min(
          maxSegments,
          Math.max(8, Math.ceil(Math.sqrt(secondDerivative / (8 * tolerance)))),
        );

  // Evaluated inline against control points hoisted out of the loop. Calling
  // `cubicPoint` per sample instead recomputes the control points every time
  // and allocates a handful of vectors doing it — with routing running on
  // every mouse move that dominated the entire cost.
  const points: Vec2[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;

    points[i] = new Vec2(
      a * p0.x + b * c1.x + c * c2.x + d * p1.x,
      a * p0.y + b * c1.y + c * c2.y + d * p1.y,
    );
  }
  return points;
}

export function splitCubic(
  p0: Vec2,
  p1: Vec2,
  shape: CurveShape,
  t: number,
): { end: Vec2; shape: CurveShape } {
  const [c1, c2] = cubicControlPoints(
    p0,
    p1,
    shape.h1,
    shape.h2,
    shape.along1,
    shape.along2,
  );

  const lerp = (a: Vec2, b: Vec2) => a.addScaled(b.sub(a), t);

  const a1 = lerp(p0, c1);
  const a2 = lerp(c1, c2);
  const a3 = lerp(c2, p1);
  const b1 = lerp(a1, a2);
  const b2 = lerp(a2, a3);
  const end = lerp(b1, b2);

  // Re-express the sub-curve's control points in its own chord frame.
  return {
    end,
    shape: shapeFromControlPoints(p0, end, a1, b1),
  };
}

/** Inverse of {@link cubicControlPoints}: control points back to stored form. */
export function shapeFromControlPoints(
  p0: Vec2,
  p1: Vec2,
  c1: Vec2,
  c2: Vec2,
): CurveShape {
  const chord = p1.sub(p0);
  const len = chord.length();
  if (len < 1e-9) {
    return { h1: 0, h2: 0, along1: DEFAULT_ALONG_1, along2: DEFAULT_ALONG_2 };
  }

  const dir = chord.scaled(1 / len);
  const perp = perpendicularOfChord(dir);

  const decompose = (c: Vec2) => {
    const rel = c.sub(p0);
    return {
      along: (rel.x * dir.x + rel.y * dir.y) / len,
      h: (rel.x * perp.x + rel.y * perp.y) / CONTROL_POINT_SCALE,
    };
  };

  const first = decompose(c1);
  const second = decompose(c2);

  return {
    h1: first.h,
    h2: second.h,
    along1: first.along,
    along2: second.along,
  };
}

/**
 * The parameter at which the remaining arc length equals `fromEnd`.
 *
 * Walks the flattened polyline backwards, which is accurate enough for
 * positioning an arrowhead and costs nothing extra — the polyline has already
 * been built for collision testing.
 */
export function parameterAtDistanceFromEnd(
  p0: Vec2,
  p1: Vec2,
  shape: CurveShape,
  fromEnd: number,
  precomputed?: Vec2[],
): number {
  const points =
    precomputed ??
    flattenCubic(
      p0,
      p1,
      shape.h1,
      shape.h2,
      0.004,
      64,
      shape.along1,
      shape.along2,
    );
  const segments = points.length - 1;
  if (segments < 1 || fromEnd <= 0) return 1;

  let remaining = fromEnd;
  for (let i = segments; i >= 1; i--) {
    const length = Vec2.dist(points[i - 1], points[i]);
    if (length >= remaining) {
      const withinSegment = length < 1e-12 ? 0 : 1 - remaining / length;
      return (i - 1 + withinSegment) / segments;
    }
    remaining -= length;
  }
  return 0;
}

/**
 * Largest curvature over a parameter range.
 *
 * Used to penalise sharp turns in the arrow's *body* while leaving a turn near
 * the tail unpunished — the user explicitly wants the sharpest bend, when one
 * is needed at all, to be the one redirecting the arrow away from its source.
 */
export function maxCurvature(
  p0: Vec2,
  p1: Vec2,
  shape: CurveShape,
  fromT = 0,
  toT = 1,
  samples = 16,
): number {
  const [c1, c2] = cubicControlPoints(
    p0,
    p1,
    shape.h1,
    shape.h2,
    shape.along1,
    shape.along2,
  );

  let worst = 0;
  for (let i = 0; i <= samples; i++) {
    const t = fromT + ((toT - fromT) * i) / samples;
    const mt = 1 - t;

    // First and second derivatives of the cubic at t.
    const dx =
      3 * mt * mt * (c1.x - p0.x) +
      6 * mt * t * (c2.x - c1.x) +
      3 * t * t * (p1.x - c2.x);
    const dy =
      3 * mt * mt * (c1.y - p0.y) +
      6 * mt * t * (c2.y - c1.y) +
      3 * t * t * (p1.y - c2.y);
    const ddx =
      6 * mt * (c2.x - 2 * c1.x + p0.x) + 6 * t * (p1.x - 2 * c2.x + c1.x);
    const ddy =
      6 * mt * (c2.y - 2 * c1.y + p0.y) + 6 * t * (p1.y - 2 * c2.y + c1.y);

    const speed = Math.hypot(dx, dy);
    if (speed < 1e-9) continue;
    worst = Math.max(worst, Math.abs(dx * ddy - dy * ddx) / speed ** 3);
  }
  return worst;
}

/** Axis-aligned bounds of a polyline, for cheap obstacle rejection. */
export function polylineBounds(points: Vec2[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return { min: new Vec2(minX, minY), max: new Vec2(maxX, maxY) };
}

/** Do two boxes come within `margin` of each other? */
export function boxesWithin(a: Box, b: Box, margin: number): boolean {
  return !(
    a.min.x - margin > b.max.x ||
    a.max.x + margin < b.min.x ||
    a.min.y - margin > b.max.y ||
    a.max.y + margin < b.min.y
  );
}

export function polylineLength(points: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Vec2.dist(points[i - 1], points[i]);
  }
  return total;
}

/**
 * The most a path turns within any one window of its own arc length.
 *
 * This is how a corner is told from a curve, and the per-step angle it replaces
 * could not do it. {@link flattenCubic} samples uniformly in the curve
 * parameter and raises the sample count with curvature, so where a curve turns
 * hardest its points bunch closest together — precisely cancelling the effect
 * being measured. A cusp reverses direction over almost no distance, and the
 * flattener puts so many points there that no single step turns very far.
 *
 * Measured: an arrow with a visible V in it turned only 32 degrees per step,
 * well inside a 60 degree veto, while turning 102 degrees within 0.15 of a bond
 * length. Arrows that read as smooth measured 9 to 45 in the same window. The
 * two populations do not overlap, where by the per-step figure they did.
 *
 * Turning per unit length — discrete curvature — was the other candidate. It is
 * the same idea in the limit but far noisier here, because it divides by segment
 * lengths that go to zero exactly where the answer matters most. Accumulating
 * over a fixed window keeps the same discrimination with none of that.
 *
 * @param window Arc length to accumulate over, in model units.
 * @returns Radians turned in the worst window.
 */
/** Below this multiple of a curve's own average bend, a stretch is a candidate. */
const STRAIGHT_RUN_FRACTION = 0.25;

/**
 * …and it must also be genuinely flat, in curvature per model unit.
 *
 * Relative to the curve's own average is not enough on its own, and taking it
 * as enough was a real error: a cleavage arrow is a tight curl at one end and a
 * gentle sweep elsewhere, so the gentle part bends far less than that curve's
 * average and got counted as straight — even though no part of it is. Short
 * arrows were being disqualified for a defect they did not have.
 *
 * One fifth means a radius of five bond lengths or flatter, which over the
 * length of any real arrow is visually a straight line.
 */
const STRAIGHT_ABSOLUTE_CURVATURE = 0.2;

/**
 * How the bending is distributed along a curve.
 *
 * This is what tells a genuine S — two C shapes joined — from the corner-and-run
 * shape that keeps getting drawn instead: a long almost-straight stretch with
 * the bending crammed into a couple of tight corners at the ends. Both figures
 * are ratios against the curve's own average, so neither depends on how big the
 * arrow is.
 *
 * Needed because every local measure of sharpness missed it. The worst example
 * scored 6 degrees on the tightest-turn-in-a-window test — one of the smoothest
 * numbers in the whole set — because a corner rounded off over a short distance
 * is locally gentle everywhere while still reading as a corner. What makes it
 * one is the *contrast* with the straight run beside it, and contrast is only
 * visible by comparing the curve against itself.
 *
 * Measured on a two-molecule layout: the corner-and-run shape gives 64 per cent
 * straight and a peak 26 times the mean; the same arrow drawn as two C shapes
 * gives 26 per cent and 6.8; arrows accepted as well-formed sit at 0 to 34 per
 * cent and 2.9 to 8.4.
 */
export function curvatureProfile(points: Vec2[]): {
  /** Share of the length bending far less than this curve's own average. */
  straightFraction: number;
  /** Sharpest local bend as a multiple of the average. */
  peakOverMean: number;
} {
  if (points.length < 3) return { straightFraction: 0, peakOverMean: 1 };

  let weighted = 0;
  let length = 0;
  let peak = 0;
  const curvatures: number[] = [];
  const spans: number[] = [];

  for (let i = 2; i < points.length; i++) {
    const ax = points[i - 1].x - points[i - 2].x;
    const ay = points[i - 1].y - points[i - 2].y;
    const bx = points[i].x - points[i - 1].x;
    const by = points[i].y - points[i - 1].y;

    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la < 1e-12 || lb < 1e-12) continue;

    const cos = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (la * lb)));
    const span = (la + lb) / 2;
    const curvature = Math.acos(cos) / span;

    curvatures.push(curvature);
    spans.push(span);
    weighted += curvature * span;
    length += span;
    if (curvature > peak) peak = curvature;
  }

  if (length < 1e-12) return { straightFraction: 0, peakOverMean: 1 };

  const mean = weighted / length;
  if (mean < 1e-12) return { straightFraction: 1, peakOverMean: 1 };

  let straight = 0;
  for (let i = 0; i < curvatures.length; i++) {
    if (
      curvatures[i] < mean * STRAIGHT_RUN_FRACTION &&
      curvatures[i] < STRAIGHT_ABSOLUTE_CURVATURE
    ) {
      straight += spans[i];
    }
  }

  return { straightFraction: straight / length, peakOverMean: peak / mean };
}

export function maxTurnInWindow(points: Vec2[], window: number): number {
  if (points.length < 3 || window <= 0) return 0;

  // Turn at each interior vertex, and the length of the step leaving it.
  const turns: number[] = [];
  const steps: number[] = [];

  for (let i = 2; i < points.length; i++) {
    const ax = points[i - 1].x - points[i - 2].x;
    const ay = points[i - 1].y - points[i - 2].y;
    const bx = points[i].x - points[i - 1].x;
    const by = points[i].y - points[i - 1].y;

    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la < 1e-12 || lb < 1e-12) continue;

    const cos = (ax * bx + ay * by) / (la * lb);
    turns.push(Math.acos(Math.min(1, Math.max(-1, cos))));
    steps.push(lb);
  }

  // Sliding window over arc length. Both ends only advance, so this is linear
  // in the number of points despite the nested loop.
  let worst = 0;
  let total = 0;
  let length = 0;
  let start = 0;

  for (let end = 0; end < turns.length; end++) {
    total += turns[end];
    length += steps[end];

    while (length > window && start < end) {
      total -= turns[start];
      length -= steps[start];
      start++;
    }

    if (total > worst) worst = total;
  }

  return worst;
}

/**
 * Number of sign changes in the signed offset from the chord — i.e. how many
 * times the curve crosses to the other side. A plain C-curve has 0; an S-curve
 * has 1; anything more is a wobble worth penalising.
 */
/** Turns shallower than this are treated as straight, not as a change of side. */
const REVERSAL_EPSILON = 0.02;

/**
 * How many times a drawn curve actually reverses its direction of turn.
 *
 * The honest version of {@link inflectionCount}, which can only read the two
 * control points of a *single* cubic and is therefore blind to a curve made of
 * several. A chain of segments can bulge one way, come back, and bulge again
 * while every individual piece looks innocent, and that undulation is what reads
 * as a wobbly arrow rather than a clean one.
 *
 * A plain C reverses nothing. A proper S reverses exactly once, in the middle.
 * Anything more is the curve wandering.
 *
 * Small wiggles are ignored deliberately: flattening leaves tiny alternations in
 * the cross product where a curve is almost straight, and counting those would
 * report noise as wobble. Only turns carrying real angle are counted.
 */
export function turnReversals(points: Vec2[]): number {
  if (points.length < 3) return 0;

  let reversals = 0;
  let previousSign = 0;

  for (let i = 2; i < points.length; i++) {
    const ax = points[i - 1].x - points[i - 2].x;
    const ay = points[i - 1].y - points[i - 2].y;
    const bx = points[i].x - points[i - 1].x;
    const by = points[i].y - points[i - 1].y;

    const cross = ax * by - ay * bx;
    const scale = Math.hypot(ax, ay) * Math.hypot(bx, by);
    if (scale < 1e-12) continue;

    // sin of the turn angle; below this the step is effectively straight.
    if (Math.abs(cross / scale) < REVERSAL_EPSILON) continue;

    const sign = cross > 0 ? 1 : -1;
    if (previousSign !== 0 && sign !== previousSign) reversals++;
    previousSign = sign;
  }

  return reversals;
}

export function inflectionCount(h1: number, h2: number): number {
  const epsilon = 1e-6;
  if (Math.abs(h1) < epsilon || Math.abs(h2) < epsilon) return 0;
  return Math.sign(h1) === Math.sign(h2) ? 0 : 1;
}

// ─── distance primitives ────────────────────────────────────────────────────

/**
 * Allocation-free scalar forms of the two hottest primitives.
 *
 * The vector versions below allocate several `Vec2` objects per call. That is
 * irrelevant when called a few times, but clearance testing calls them once per
 * polyline segment per obstacle per candidate — tens of thousands of times for
 * a single arrow — and the garbage that produces dominated the entire routing
 * cost. Routing runs on every mouse move, so the inner loop works on raw
 * numbers.
 */
export function pointSegmentDistanceXY(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;

  if (lengthSquared < 1e-18) return Math.hypot(px - ax, py - ay);

  let t = ((px - ax) * abx + (py - ay) * aby) / lengthSquared;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;

  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

export function segmentSegmentDistanceXY(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  const cross = (
    ox: number,
    oy: number,
    px: number,
    py: number,
    qx: number,
    qy: number,
  ) => (px - ox) * (qy - oy) - (py - oy) * (qx - ox);

  const d1 = cross(cx, cy, dx, dy, ax, ay);
  const d2 = cross(cx, cy, dx, dy, bx, by);
  const d3 = cross(ax, ay, bx, by, cx, cy);
  const d4 = cross(ax, ay, bx, by, dx, dy);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return 0;
  }

  return Math.min(
    pointSegmentDistanceXY(ax, ay, cx, cy, dx, dy),
    pointSegmentDistanceXY(bx, by, cx, cy, dx, dy),
    pointSegmentDistanceXY(cx, cy, ax, ay, bx, by),
    pointSegmentDistanceXY(dx, dy, ax, ay, bx, by),
  );
}

export function pointSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = b.sub(a);
  const lengthSquared = ab.x * ab.x + ab.y * ab.y;
  if (lengthSquared < 1e-18) return Vec2.dist(p, a);

  const ap = p.sub(a);
  let t = (ap.x * ab.x + ap.y * ab.y) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Vec2.dist(p, a.addScaled(ab, t));
}

/**
 * Whether two segments properly cross.
 *
 * Strict on both sides: touching endpoints and collinear overlap do not count.
 * That is what makes it safe to count crossings for a parity test, where a
 * grazing contact counted once would flip the answer.
 */
export function segmentsIntersect(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
): boolean {
  const cross = (o: Vec2, p: Vec2, q: Vec2) =>
    (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);

  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

export function segmentSegmentDistance(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
): number {
  if (segmentsIntersect(a1, a2, b1, b2)) return 0;

  return Math.min(
    pointSegmentDistance(a1, b1, b2),
    pointSegmentDistance(a2, b1, b2),
    pointSegmentDistance(b1, a1, a2),
    pointSegmentDistance(b2, a1, a2),
  );
}

export function pointBoxDistance(p: Vec2, box: Box): number {
  const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
  const dy = Math.max(box.min.y - p.y, 0, p.y - box.max.y);
  return Math.hypot(dx, dy);
}

export function segmentBoxDistance(a: Vec2, b: Vec2, box: Box): number {
  // Cheap accept: an endpoint inside the box means distance zero.
  if (pointBoxDistance(a, box) === 0 || pointBoxDistance(b, box) === 0)
    return 0;

  const corners = [
    new Vec2(box.min.x, box.min.y),
    new Vec2(box.max.x, box.min.y),
    new Vec2(box.max.x, box.max.y),
    new Vec2(box.min.x, box.max.y),
  ];

  let best = Infinity;
  for (let i = 0; i < 4; i++) {
    const edgeStart = corners[i];
    const edgeEnd = corners[(i + 1) % 4];
    best = Math.min(best, segmentSegmentDistance(a, b, edgeStart, edgeEnd));
    if (best === 0) return 0;
  }
  return best;
}

// ─── clearance: positive means clear, negative means penetrating ────────────

export function polylineCapsuleClearance(
  points: Vec2[],
  capsule: Capsule,
): number {
  const { a, b, r } = capsule;
  let best = Infinity;

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    const distance = segmentSegmentDistanceXY(
      previous.x,
      previous.y,
      current.x,
      current.y,
      a.x,
      a.y,
      b.x,
      b.y,
    );
    if (distance < best) best = distance;
    if (best === 0) break;
  }
  return best - r;
}

/**
 * How deep inside the box a point is: zero outside, otherwise the shortest
 * distance out through an edge.
 */
function depthInsideBox(p: Vec2, box: Box): number {
  if (pointBoxDistance(p, box) > 0) return 0;
  return Math.min(
    p.x - box.min.x,
    box.max.x - p.x,
    p.y - box.min.y,
    box.max.y - p.y,
  );
}

/**
 * Signed clearance to a box: positive outside, **negative inside**.
 *
 * The sign matters more than it looks. Scoring counts a collision with
 * `clearance < 0`, and a plain distance function bottoms out at zero — so for
 * as long as this returned an unsigned distance, an arrow drawn straight
 * through an atom label scored exactly 0 and was never counted as colliding at
 * all. Labels were being tested against and could not fail.
 */
export function polylineBoxClearance(points: Vec2[], box: Box): number {
  let best = Infinity;
  let deepest = 0;

  for (let i = 1; i < points.length; i++) {
    best = Math.min(best, segmentBoxDistance(points[i - 1], points[i], box));
    deepest = Math.max(deepest, depthInsideBox(points[i], box));
  }
  if (points.length > 0) {
    deepest = Math.max(deepest, depthInsideBox(points[0], box));
  }

  if (best > 0) return best;
  // Touching or crossing. Report a real penetration depth so a route that
  // clips a corner scores better than one ploughing through the middle, and
  // never report zero, which would read as "just clear".
  return -Math.max(deepest, 1e-6);
}

/**
 * How deep the polyline penetrates the obstacle, integrated along its length.
 *
 * A single deep stab and a long shallow graze both read as "collides", but the
 * first is much worse to look at, so scoring needs the magnitude and not just
 * a boolean.
 */
export function penetrationDepth(clearance: number): number {
  return clearance < 0 ? -clearance : 0;
}

// ─── arrowhead polygon ──────────────────────────────────────────────────────

/**
 * The filled head as drawn: a swept-back triangle whose tip sits at the curve
 * end and whose barbs trail back along the tangent.
 *
 * Scoring tests this separately from the centreline. A route can have a
 * perfectly clear shaft and still bury its head in a charge glyph, which is
 * exactly the defect visible in the current renders.
 */
/**
 * The direction an arrowhead should point.
 *
 * The chord of the last `length` of curve, not the tangent at the very tip. A
 * head is a rigid triangle roughly 23 degrees wide at its point; on a curve of
 * radius 0.3 the tip tangent differs from the direction the shaft actually
 * arrives along by around 17 degrees, so aligning to it left the shaft grazing
 * one edge of the triangle instead of running into its point. Averaging over
 * the head's own length is what the eye reads as "the way the arrow came in".
 */
export function headChordDirection(
  p0: Vec2,
  p1: Vec2,
  shape: CurveShape,
  length: number,
): Vec2 {
  const t = parameterAtDistanceFromEnd(p0, p1, shape, length);
  const base = cubicPoint(
    p0,
    p1,
    shape.h1,
    shape.h2,
    t,
    shape.along1,
    shape.along2,
  );

  const chord = p1.sub(base);
  const size = chord.length();
  if (size < 1e-9) {
    return headTangent(p0, p1, shape.h1, shape.h2, shape.along1, shape.along2);
  }
  return chord.scaled(1 / size);
}

export function arrowheadPolygon(
  tip: Vec2,
  tangent: Vec2,
  length: number,
  halfWidth: number,
  notch: number,
): Vec2[] {
  const back = perpendicularOfChord(tangent).negated();
  const base = tip.addScaled(tangent, -length);

  return [
    new Vec2(tip),
    base.addScaled(back, halfWidth),
    tip.addScaled(tangent, -(length - notch)),
    base.addScaled(back, -halfWidth),
  ];
}

export function polygonEdges(polygon: Vec2[]): Array<[Vec2, Vec2]> {
  return polygon.map((point, i) => [point, polygon[(i + 1) % polygon.length]]);
}

export function pointInPolygon(p: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = a.y > p.y !== b.y > p.y;
    if (
      straddles &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y || 1e-18) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonCapsuleClearance(
  polygon: Vec2[],
  capsule: Capsule,
): number {
  if (
    pointInPolygon(capsule.a, polygon) ||
    pointInPolygon(capsule.b, polygon)
  ) {
    return -capsule.r;
  }

  let best = Infinity;
  for (const [a, b] of polygonEdges(polygon)) {
    best = Math.min(best, segmentSegmentDistance(a, b, capsule.a, capsule.b));
    if (best === 0) break;
  }
  return best - capsule.r;
}

/** Signed clearance from the arrowhead to a box; negative when overlapping. */
export function polygonBoxClearance(polygon: Vec2[], box: Box): number {
  const centre = new Vec2(
    (box.min.x + box.max.x) / 2,
    (box.min.y + box.max.y) / 2,
  );

  let deepest = 0;
  for (const point of polygon) {
    deepest = Math.max(deepest, depthInsideBox(point, box));
  }
  if (pointInPolygon(centre, polygon)) {
    deepest = Math.max(
      deepest,
      Math.min((box.max.x - box.min.x) / 2, (box.max.y - box.min.y) / 2),
    );
  }

  let best = Infinity;
  for (const [a, b] of polygonEdges(polygon)) {
    best = Math.min(best, segmentBoxDistance(a, b, box));
    if (best === 0) break;
  }

  if (best > 0 && deepest === 0) return best;
  return -Math.max(deepest, 1e-6);
}

// ─── angles ─────────────────────────────────────────────────────────────────

/** Signed shortest difference between two angles, in (-pi, pi]. */
export function angleDelta(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Unsigned angle between two unit vectors, in radians. */
export function angleBetween(a: Vec2, b: Vec2): number {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y));
  return Math.acos(dot);
}

export function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function radians(deg: number): number {
  return (deg * Math.PI) / 180;
}
