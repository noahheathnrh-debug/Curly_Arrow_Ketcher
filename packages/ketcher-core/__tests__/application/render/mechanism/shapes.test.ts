import { Vec2 } from 'domain/entities/vec2';
import {
  HANDLE_PROFILES,
  buildFromTangents,
  clampToCone,
  classifyFamily,
} from 'application/render/mechanism/shapes';
import {
  cubicPoint,
  headTangent,
  maxCurvature,
  parameterAtDistanceFromEnd,
  polylineLength,
  pointSegmentDistance,
  flattenCubic,
  splitCubic,
  tailTangent,
} from 'application/render/mechanism/geometry';

const p0 = new Vec2(0, 0);
const p1 = new Vec2(2, 0);
const deg = (d: number) => (d * Math.PI) / 180;
const angleOf = (v: Vec2) => (Math.atan2(v.y, v.x) * 180) / Math.PI;

/**
 * The shape constructors are closed form, so these assert the *definitions*
 * rather than sampled behaviour: given an angle, does the curve actually leave
 * and arrive at that angle, and does the family discriminator do what it says.
 */

const balanced = HANDLE_PROFILES[0];
const leadIn = HANDLE_PROFILES.find((p) => p.id === 'lead-in')!;

/**
 * Tangent directions come from the anchors, so these assert the construction
 * honours them: whatever direction the caller says the arrow leaves and
 * arrives along is the direction it actually does.
 */
describe('building from tangents', () => {
  it('leaves along the tail direction it was given', () => {
    const tail = new Vec2(Math.cos(deg(40)), Math.sin(deg(40)));
    const head = new Vec2(1, 0);
    const shape = buildFromTangents(p0, p1, tail, head, balanced)!;

    const actual = tailTangent(p0, p1, shape.h1, shape.along1);
    expect(angleOf(actual)).toBeCloseTo(40, 3);
  });

  it('arrives along the head direction it was given', () => {
    const tail = new Vec2(1, 0);
    const head = new Vec2(Math.cos(deg(-25)), Math.sin(deg(-25)));
    const shape = buildFromTangents(p0, p1, tail, head, balanced)!;

    const actual = headTangent(
      p0,
      p1,
      shape.h1,
      shape.h2,
      shape.along1,
      shape.along2,
    );
    expect(angleOf(actual)).toBeCloseTo(-25, 3);
  });

  /**
   * The shape the user singled out as worth keeping: a long first handle holds
   * the departure direction so the arrow leaves straight before turning.
   */
  it('lead-in holds its departure direction further along the curve', () => {
    const tail = new Vec2(Math.cos(deg(50)), Math.sin(deg(50)));
    const head = new Vec2(1, 0);

    const even = buildFromTangents(p0, p1, tail, head, balanced)!;
    const held = buildFromTangents(p0, p1, tail, head, leadIn)!;

    const departure = (shape: typeof even) => {
      const at = cubicPoint(
        p0,
        p1,
        shape.h1,
        shape.h2,
        0.25,
        shape.along1,
        shape.along2,
      );
      return angleOf(at.sub(p0));
    };

    // Still travelling closer to its original heading a quarter of the way in.
    expect(Math.abs(departure(held) - 50)).toBeLessThan(
      Math.abs(departure(even) - 50),
    );
  });
});

describe('classifying the result', () => {
  it('calls a one-sided curve a C', () => {
    const tail = new Vec2(Math.cos(deg(35)), Math.sin(deg(35)));
    const head = new Vec2(Math.cos(deg(-35)), Math.sin(deg(-35)));
    expect(
      classifyFamily(buildFromTangents(p0, p1, tail, head, balanced)!),
    ).toBe('c');
  });

  it('calls a curve that crosses the chord an S', () => {
    const tail = new Vec2(Math.cos(deg(35)), Math.sin(deg(35)));
    const head = new Vec2(Math.cos(deg(35)), Math.sin(deg(35)));
    expect(
      classifyFamily(buildFromTangents(p0, p1, tail, head, balanced)!),
    ).toBe('s');
  });

  it('calls a lopsided one-sided curve uneven', () => {
    const tail = new Vec2(Math.cos(deg(55)), Math.sin(deg(55)));
    const head = new Vec2(Math.cos(deg(-8)), Math.sin(deg(-8)));
    expect(
      classifyFamily(buildFromTangents(p0, p1, tail, head, balanced)!),
    ).toBe('uneven');
  });
});

/**
 * The cone is enforced when the curve is built, not merely penalised
 * afterwards. An earlier version derived tangents from the chord and only
 * scored the deviation, which let arrows leave at angles the convention
 * disallows and plough into their own source atom.
 */
describe('cone clamping', () => {
  const centre = new Vec2(1, 0);

  it('leaves a direction inside the cone untouched', () => {
    const inside = new Vec2(Math.cos(deg(20)), Math.sin(deg(20)));
    expect(angleOf(clampToCone(inside, centre, deg(35)))).toBeCloseTo(20, 6);
  });

  it('pulls a direction outside the cone back to its edge', () => {
    const outside = new Vec2(Math.cos(deg(80)), Math.sin(deg(80)));
    expect(angleOf(clampToCone(outside, centre, deg(35)))).toBeCloseTo(35, 6);
  });

  it('clamps to the nearer edge on either side', () => {
    const below = new Vec2(Math.cos(deg(-80)), Math.sin(deg(-80)));
    expect(angleOf(clampToCone(below, centre, deg(35)))).toBeCloseTo(-35, 6);
  });
});

describe('splitCubic', () => {
  const shape = buildFromTangents(
    p0,
    p1,
    new Vec2(Math.cos(deg(45)), Math.sin(deg(45))),
    new Vec2(Math.cos(deg(-45)), Math.sin(deg(-45))),
    balanced,
  )!;

  /**
   * De Casteljau gives an exact sub-cubic, not an approximation. This is what
   * allows the arrowhead to be trimmed back from the atom centre without the
   * curve's shape changing and without any renderer change.
   */
  it('traces exactly the same path up to the split point', () => {
    const t = 0.6;
    const split = splitCubic(p0, p1, shape, t);

    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const onOriginal = cubicPoint(
        p0,
        p1,
        shape.h1,
        shape.h2,
        u * t,
        shape.along1,
        shape.along2,
      );
      const onSplit = cubicPoint(
        p0,
        split.end,
        split.shape.h1,
        split.shape.h2,
        u,
        split.shape.along1,
        split.shape.along2,
      );
      expect(Vec2.dist(onOriginal, onSplit)).toBeLessThan(1e-9);
    }
  });

  it('ends where the original curve was at that parameter', () => {
    const split = splitCubic(p0, p1, shape, 0.35);
    const expected = cubicPoint(
      p0,
      p1,
      shape.h1,
      shape.h2,
      0.35,
      shape.along1,
      shape.along2,
    );
    expect(Vec2.dist(split.end, expected)).toBeLessThan(1e-9);
  });

  it('is a no-op at t = 1', () => {
    const split = splitCubic(p0, p1, shape, 1);
    expect(Vec2.dist(split.end, p1)).toBeLessThan(1e-9);
  });
});

describe('trimming by arc length', () => {
  const shape = buildFromTangents(
    p0,
    p1,
    new Vec2(Math.cos(deg(35)), Math.sin(deg(35))),
    new Vec2(Math.cos(deg(-35)), Math.sin(deg(-35))),
    balanced,
  )!;

  it('leaves approximately the requested distance beyond the split', () => {
    const trim = 0.3;
    const t = parameterAtDistanceFromEnd(p0, p1, shape, trim);
    const split = splitCubic(p0, p1, shape, t);

    const full = polylineLength(
      flattenCubic(
        p0,
        p1,
        shape.h1,
        shape.h2,
        0.004,
        64,
        shape.along1,
        shape.along2,
      ),
    );
    const kept = polylineLength(
      flattenCubic(
        p0,
        split.end,
        split.shape.h1,
        split.shape.h2,
        0.004,
        64,
        split.shape.along1,
        split.shape.along2,
      ),
    );

    expect(full - kept).toBeCloseTo(trim, 2);
  });

  /**
   * The point of anchoring at the atom centre: changing how much is trimmed
   * must slide the tip along a path that does not itself move.
   */
  it('keeps the path identical when only the trim changes', () => {
    const shallow = splitCubic(
      p0,
      p1,
      shape,
      parameterAtDistanceFromEnd(p0, p1, shape, 0.15),
    );
    const deeper = splitCubic(
      p0,
      p1,
      shape,
      parameterAtDistanceFromEnd(p0, p1, shape, 0.4),
    );

    // Every point of the shorter curve lies on the longer one. Measured
    // against the longer curve's *segments* rather than sampled points —
    // comparing point-to-point would only measure the sampling grid, not the
    // geometry.
    const longer = flattenCubic(
      p0,
      shallow.end,
      shallow.shape.h1,
      shallow.shape.h2,
      0.0005,
      64,
      shallow.shape.along1,
      shallow.shape.along2,
    );

    for (let i = 0; i <= 20; i++) {
      const onDeeper = cubicPoint(
        p0,
        deeper.end,
        deeper.shape.h1,
        deeper.shape.h2,
        i / 20,
        deeper.shape.along1,
        deeper.shape.along2,
      );

      let nearest = Infinity;
      for (let j = 1; j < longer.length; j++) {
        nearest = Math.min(
          nearest,
          pointSegmentDistance(onDeeper, longer[j - 1], longer[j]),
        );
      }
      expect(nearest).toBeLessThan(0.001);
    }
  });
});

describe('curvature', () => {
  it('reports higher curvature for a deeper curve', () => {
    const shallowTail = new Vec2(Math.cos(deg(15)), Math.sin(deg(15)));
    const shallowHead = new Vec2(Math.cos(deg(-15)), Math.sin(deg(-15)));
    const deepTail = new Vec2(Math.cos(deg(65)), Math.sin(deg(65)));
    const deepHead = new Vec2(Math.cos(deg(-65)), Math.sin(deg(-65)));

    const shallow = buildFromTangents(
      p0,
      p1,
      shallowTail,
      shallowHead,
      balanced,
    )!;
    const deep = buildFromTangents(p0, p1, deepTail, deepHead, balanced)!;

    expect(maxCurvature(p0, p1, deep)).toBeGreaterThan(
      maxCurvature(p0, p1, shallow),
    );
  });
});
