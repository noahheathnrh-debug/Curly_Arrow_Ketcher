import { Vec2 } from 'domain/entities/vec2';
import {
  angleBetween,
  arrowheadPolygon,
  cubicControlPoints,
  cubicPoint,
  degrees,
  flattenCubic,
  headTangent,
  inflectionCount,
  makeDisc,
  perpendicularOfChord,
  pointInPolygon,
  pointSegmentDistance,
  polylineBoxClearance,
  polylineCapsuleClearance,
  polylineLength,
  segmentSegmentDistance,
  tailTangent,
} from 'application/render/mechanism/geometry';

const p0 = new Vec2(0, 0);
const p1 = new Vec2(2, 0);

describe('cubic parameterisation', () => {
  /**
   * The renderer offsets its control points by h*4/3 precisely so that a
   * symmetric cubic peaks at h. The previous router sampled without that
   * factor and so measured a curve 25% flatter than the one being drawn,
   * which let arrows collide with things the collision check believed were
   * clear. This test is the guard against that regression.
   */
  it('peaks at exactly h for a symmetric curve', () => {
    const h = 0.6;
    const mid = cubicPoint(p0, p1, h, h, 0.5);

    expect(mid.x).toBeCloseTo(1, 9);
    expect(Math.abs(mid.y)).toBeCloseTo(h, 9);
  });

  it('places control points at the chord thirds', () => {
    const [c1, c2] = cubicControlPoints(p0, p1, 0.3, -0.3);

    expect(c1.x).toBeCloseTo(2 / 3, 9);
    expect(c2.x).toBeCloseTo(4 / 3, 9);
    expect(c1.y).toBeCloseTo(-c2.y, 9);
  });

  it('starts at the source and ends at the destination', () => {
    expect(Vec2.dist(cubicPoint(p0, p1, 0.5, -0.2, 0), p0)).toBeCloseTo(0, 9);
    expect(Vec2.dist(cubicPoint(p0, p1, 0.5, -0.2, 1), p1)).toBeCloseTo(0, 9);
  });

  it('keeps positive h on a consistent side of the chord', () => {
    const perp = perpendicularOfChord(new Vec2(1, 0));
    const mid = cubicPoint(p0, p1, 0.4, 0.4, 0.5);
    const offset = mid.sub(new Vec2(1, 0));

    expect(Math.sign(offset.y)).toBe(Math.sign(perp.y));
  });
});

describe('tangents', () => {
  it('leaves along the chord when the curve is flat', () => {
    const tangent = tailTangent(p0, p1, 0);
    expect(degrees(angleBetween(tangent, new Vec2(1, 0)))).toBeCloseTo(0, 6);
  });

  /**
   * The router inverts these relations to seed candidates analytically, so if
   * the forward direction is wrong the seeds aim at the wrong angle entirely.
   */
  it('matches the analytic relation tan(phi) = -4*h1/d at the tail', () => {
    const h1 = 0.35;
    const d = 2;
    const expected = Math.atan2(-4 * h1, d);
    const tangent = tailTangent(p0, p1, h1);
    const actual = Math.atan2(tangent.y, tangent.x);

    expect(actual).toBeCloseTo(expected, 6);
  });

  it('matches the analytic relation tan(phi) = 4*h2/d at the head', () => {
    const h2 = -0.25;
    const d = 2;
    const expected = Math.atan2(4 * h2, d);
    const tangent = headTangent(p0, p1, 0.1, h2);
    const actual = Math.atan2(tangent.y, tangent.x);

    expect(actual).toBeCloseTo(expected, 6);
  });
});

describe('flattening', () => {
  it('stays within tolerance of the true curve', () => {
    const polyline = flattenCubic(p0, p1, 0.8, -0.5, 0.004);

    // Sample the real curve densely and check each sample is near the polyline.
    for (let i = 0; i <= 200; i++) {
      const truePoint = cubicPoint(p0, p1, 0.8, -0.5, i / 200);
      let nearest = Infinity;
      for (let j = 1; j < polyline.length; j++) {
        nearest = Math.min(
          nearest,
          pointSegmentDistance(truePoint, polyline[j - 1], polyline[j]),
        );
      }
      expect(nearest).toBeLessThanOrEqual(0.004);
    }
  });

  it('is deterministic for identical inputs', () => {
    const a = flattenCubic(p0, p1, 0.3, 0.3);
    const b = flattenCubic(p0, p1, 0.3, 0.3);

    expect(a.length).toBe(b.length);
    a.forEach((point, i) => expect(Vec2.dist(point, b[i])).toBeCloseTo(0, 12));
  });

  it('never exceeds the segment cap', () => {
    expect(flattenCubic(p0, p1, 5, -5, 1e-9, 64).length).toBeLessThanOrEqual(
      65,
    );
  });

  it('measures a straight run as its chord length', () => {
    expect(polylineLength(flattenCubic(p0, p1, 0, 0))).toBeCloseTo(2, 6);
  });
});

describe('inflection classification', () => {
  it.each([
    [0.3, 0.3, 0],
    [-0.3, -0.3, 0],
    [0.3, -0.3, 1],
    [-0.3, 0.3, 1],
    [0, 0.3, 0],
  ])('h1=%p h2=%p gives %p inflections', (h1, h2, expected) => {
    expect(inflectionCount(h1, h2)).toBe(expected);
  });
});

describe('distance primitives', () => {
  it('clamps point-to-segment distance to the segment ends', () => {
    const a = new Vec2(0, 0);
    const b = new Vec2(1, 0);

    expect(pointSegmentDistance(new Vec2(0.5, 2), a, b)).toBeCloseTo(2, 9);
    expect(pointSegmentDistance(new Vec2(-3, 0), a, b)).toBeCloseTo(3, 9);
    expect(pointSegmentDistance(new Vec2(4, 0), a, b)).toBeCloseTo(3, 9);
  });

  it('reports zero distance for crossing segments', () => {
    const distance = segmentSegmentDistance(
      new Vec2(-1, 0),
      new Vec2(1, 0),
      new Vec2(0, -1),
      new Vec2(0, 1),
    );
    expect(distance).toBe(0);
  });

  it('measures the gap between parallel segments', () => {
    const distance = segmentSegmentDistance(
      new Vec2(0, 0),
      new Vec2(1, 0),
      new Vec2(0, 0.4),
      new Vec2(1, 0.4),
    );
    expect(distance).toBeCloseTo(0.4, 9);
  });
});

describe('clearance', () => {
  /**
   * The defect this whole module exists to fix: an arrow drawn straight
   * through a bond. A bond is a capsule, not a point, and must read as
   * penetrated.
   */
  it('reports negative clearance when a route crosses a bond capsule', () => {
    const route = flattenCubic(new Vec2(0, -1), new Vec2(0, 1), 0, 0);
    const bond = { a: new Vec2(-1, 0), b: new Vec2(1, 0), r: 0.13 };

    expect(polylineCapsuleClearance(route, bond)).toBeLessThan(0);
  });

  it('reports positive clearance when a route passes beside a bond', () => {
    const route = flattenCubic(new Vec2(-1, 1), new Vec2(1, 1), 0, 0);
    const bond = { a: new Vec2(-1, 0), b: new Vec2(1, 0), r: 0.13 };

    expect(polylineCapsuleClearance(route, bond)).toBeCloseTo(1 - 0.13, 6);
  });

  it('accounts for the capsule radius rather than just the axis', () => {
    const route = flattenCubic(new Vec2(-1, 0.2), new Vec2(1, 0.2), 0, 0);
    const thin = { a: new Vec2(-1, 0), b: new Vec2(1, 0), r: 0.05 };
    const fat = { a: new Vec2(-1, 0), b: new Vec2(1, 0), r: 0.5 };

    expect(polylineCapsuleClearance(route, thin)).toBeGreaterThan(0);
    expect(polylineCapsuleClearance(route, fat)).toBeLessThan(0);
  });

  /**
   * Negative, not zero. Scoring counts a collision with `clearance < 0`, so an
   * unsigned distance here meant a route drawn straight through an atom label
   * could never be registered as colliding.
   */
  it('reports negative clearance for a route entering a label box', () => {
    const route = flattenCubic(new Vec2(-1, 0), new Vec2(1, 0), 0, 0);
    const box = { min: new Vec2(-0.2, -0.2), max: new Vec2(0.2, 0.2) };

    expect(polylineBoxClearance(route, box)).toBeLessThan(0);
  });

  it('measures the gap to a label box it misses', () => {
    const route = flattenCubic(new Vec2(-1, 1), new Vec2(1, 1), 0, 0);
    const box = { min: new Vec2(-0.2, -0.2), max: new Vec2(0.2, 0.2) };

    expect(polylineBoxClearance(route, box)).toBeCloseTo(0.8, 6);
  });

  it('treats a dot as a zero-length capsule', () => {
    const disc = makeDisc(new Vec2(0, 0), 0.07);
    const through = flattenCubic(new Vec2(-1, 0), new Vec2(1, 0), 0, 0);
    const beside = flattenCubic(new Vec2(-1, 0.5), new Vec2(1, 0.5), 0, 0);

    expect(polylineCapsuleClearance(through, disc)).toBeLessThan(0);
    expect(polylineCapsuleClearance(beside, disc)).toBeGreaterThan(0);
  });
});

describe('arrowhead polygon', () => {
  it('puts the tip at the curve end and trails back along the tangent', () => {
    const head = arrowheadPolygon(
      new Vec2(1, 0),
      new Vec2(1, 0),
      0.18,
      0.075,
      0.05,
    );

    expect(head[0].x).toBeCloseTo(1, 9);
    // Every other vertex sits behind the tip.
    head.slice(1).forEach((point) => expect(point.x).toBeLessThan(1));
  });

  it('spans twice the half width across the barbs', () => {
    const head = arrowheadPolygon(
      new Vec2(0, 0),
      new Vec2(1, 0),
      0.18,
      0.075,
      0.05,
    );
    expect(Vec2.dist(head[1], head[3])).toBeCloseTo(0.15, 6);
  });

  it('contains points just behind the tip and excludes points ahead of it', () => {
    const head = arrowheadPolygon(
      new Vec2(0, 0),
      new Vec2(1, 0),
      0.18,
      0.075,
      0.05,
    );

    expect(pointInPolygon(new Vec2(-0.05, 0), head)).toBe(true);
    expect(pointInPolygon(new Vec2(0.5, 0), head)).toBe(false);
  });
});
