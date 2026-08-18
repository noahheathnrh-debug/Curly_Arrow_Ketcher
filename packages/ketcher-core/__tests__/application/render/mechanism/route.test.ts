import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { buildObstacles } from 'application/render/mechanism/obstacles';
import { routeArrow } from 'application/render/mechanism/route';
import {
  degrees,
  polygonBoxClearance,
  polygonCapsuleClearance,
  polylineCapsuleClearance,
} from 'application/render/mechanism/geometry';
import {
  LENGTH_LIMIT_OFFSET,
  LENGTH_LIMIT_SCALE,
} from 'application/render/mechanism/constants';
import type {
  ElectronDestination,
  ElectronSource,
  MechanismStruct,
  Obstacle,
  Route,
} from 'application/render/mechanism/types';
import {
  allylResonance,
  bondIndex,
  carbocationAttack,
  hydrideShift,
  TEST_OPTIONS,
} from './structures';

/**
 * Fixture tests for the arrow router.
 *
 * These assert *invariants* — no bond crossed, head clear of labels and
 * charges, arrival through a free sector — and never exact `h1`/`h2` values.
 * The curve parameters are an implementation detail of the scoring function;
 * pinning them would turn every genuine improvement into a failing test, while
 * the invariants are what actually make a drawing readable.
 */

function setup(fixture: { struct: MechanismStruct }) {
  const metrics = new AnalyticMechanismMetrics(fixture.struct, TEST_OPTIONS);
  return { metrics, obstacles: buildObstacles(fixture.struct, metrics) };
}

function route(
  struct: MechanismStruct,
  source: ElectronSource,
  destination: ElectronDestination,
): Route {
  const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
  const result = routeArrow(
    { source, destination },
    struct,
    metrics,
    TEST_OPTIONS,
  );
  expect(result).not.toBeNull();
  return result as Route;
}

function obstacle(obstacles: Obstacle[], id: string): Obstacle {
  const found = obstacles.find((item) => item.id === id);
  if (!found)
    throw new Error(
      `no obstacle ${id}; have ${obstacles.map((o) => o.id).join(', ')}`,
    );
  return found;
}

function clearanceOf(result: Route, target: Obstacle): number {
  return target.shape === 'capsule'
    ? polylineCapsuleClearance(result.polyline, target.capsule)
    : Infinity;
}

function headClearanceOf(result: Route, target: Obstacle): number {
  return target.shape === 'capsule'
    ? polygonCapsuleClearance(result.head, target.capsule)
    : polygonBoxClearance(result.head, target.box);
}

/** Index of the lone pair whose direction best faces a target point. */
function pairFacing(
  struct: MechanismStruct,
  atomId: number,
  target: Vec2,
): number {
  const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
  const atom = struct.atoms.get(atomId);
  if (!atom) throw new Error('no such atom');

  const wanted = target.sub(atom.pp).normalized();
  const dots = metrics.lonePairDots(atomId);
  expect(dots.length).toBeGreaterThan(0);

  let best = 0;
  let bestAlignment = -Infinity;
  dots.forEach((dot, index) => {
    const direction = dot.sub(atom.pp).normalized();
    const alignment = direction.x * wanted.x + direction.y * wanted.y;
    if (alignment > bestAlignment) {
      bestAlignment = alignment;
      best = index;
    }
  });
  return best;
}

describe('Visual Test 1 — lone pair to carbocation', () => {
  const fixture = carbocationAttack();
  const { struct, atomId, bondId } = fixture;
  const { obstacles } = setup(fixture);

  const source: ElectronSource = {
    kind: 'lone-pair',
    atomId: atomId.I,
    pairIdx: pairFacing(struct, atomId.I, struct.atoms.get(atomId.C0)!.pp),
  };
  const destination: ElectronDestination = {
    kind: 'new-bond',
    atomId1: atomId.I,
    atomId2: atomId.C0,
  };

  const result = route(struct, source, destination);

  /**
   * The headline defect: the previous router only tested distance to atom
   * *centres*, so the vertical C0-C1 bond was invisible to it and the arrow
   * was drawn straight through it.
   */
  it.each(['C0-C1', 'C0-C2', 'C0-C3'])('does not cross the %s bond', (name) => {
    const bond = obstacle(obstacles, `bond:${bondIndex(bondId, name)}`);
    expect(clearanceOf(result, bond)).toBeGreaterThanOrEqual(0);
  });

  it('keeps the arrowhead off the positive charge glyph', () => {
    expect(
      headClearanceOf(result, obstacle(obstacles, `charge:${atomId.C0}`)),
    ).toBeGreaterThanOrEqual(0);
  });

  it('keeps the arrowhead off the carbon label', () => {
    expect(
      headClearanceOf(result, obstacle(obstacles, `label:${atomId.C0}`)),
    ).toBeGreaterThanOrEqual(0);
  });

  it('approaches through the free sector between the C0-C1 and C0-C3 bonds', () => {
    const C0 = struct.atoms.get(atomId.C0)!.pp;
    const approach = result.p1.sub(C0);
    const angle = degrees(Math.atan2(approach.y, approach.x));

    // C0-C3 lies at -30 degrees and C0-C1 at +90; the open wedge is between.
    expect(angle).toBeGreaterThan(-30);
    expect(angle).toBeLessThan(90);
  });

  it('points the head into the atom rather than past it', () => {
    expect(result.metrics.headTangentErrorDeg).toBeLessThanOrEqual(25);
  });

  it('stops short of the carbon rather than landing on it', () => {
    const C0 = struct.atoms.get(atomId.C0)!.pp;
    expect(Vec2.dist(result.p1, C0)).toBeGreaterThan(0);
  });

  it('does not wander', () => {
    const chord = Vec2.dist(result.p0, result.p1);
    expect(result.metrics.pathLengthOverChord * chord).toBeLessThanOrEqual(
      LENGTH_LIMIT_SCALE * chord + LENGTH_LIMIT_OFFSET,
    );
  });

  it('finds a fully collision-free route', () => {
    expect(result.fallback).toBe(false);
    expect(result.metrics.collidedWith).toEqual([]);
  });
});

describe('Visual Test 5 — 1,2-hydride shift', () => {
  const fixture = hydrideShift();
  const { struct, atomId, bondId } = fixture;
  const { obstacles } = setup(fixture);

  const source: ElectronSource = {
    kind: 'bond',
    bondId: bondIndex(bondId, 'C1-H'),
  };
  const destination: ElectronDestination = {
    kind: 'new-bond',
    atomId1: atomId.H,
    atomId2: atomId.C2,
  };

  const result = route(struct, source, destination);

  it('does not cross the C1-C2 bond it arcs over', () => {
    const bond = obstacle(obstacles, `bond:${bondIndex(bondId, 'C1-C2')}`);
    expect(clearanceOf(result, bond)).toBeGreaterThanOrEqual(0);
  });

  it('starts on the migrating C1-H bond, not at either carbon', () => {
    const C1 = struct.atoms.get(atomId.C1)!.pp;
    const H = struct.atoms.get(atomId.H)!.pp;
    const midpoint = Vec2.centre(C1, H);

    expect(Vec2.dist(result.p0, midpoint)).toBeLessThan(0.3);
    expect(Vec2.dist(result.p0, C1)).toBeGreaterThan(0.3);
  });

  it('keeps the arrowhead clear of the receiving carbon and its charge', () => {
    expect(
      headClearanceOf(result, obstacle(obstacles, `charge:${atomId.C2}`)),
    ).toBeGreaterThanOrEqual(0);
  });

  it('ends nearer the receiving carbon than the migrating hydrogen', () => {
    const C2 = struct.atoms.get(atomId.C2)!.pp;
    const H = struct.atoms.get(atomId.H)!.pp;
    expect(Vec2.dist(result.p1, C2)).toBeLessThan(Vec2.dist(result.p1, H));
  });

  it('uses a simple arc for this uncrowded case', () => {
    expect(result.metrics.inflections).toBe(0);
  });
});

describe('Visual Test 6 — resonance, pi bond to adjacent bond', () => {
  const fixture = allylResonance();
  const { struct, atomId, bondId } = fixture;
  const { obstacles } = setup(fixture);

  const sourceBond = bondIndex(bondId, 'C1-C2');
  const targetBond = bondIndex(bondId, 'C2-C3');

  const source: ElectronSource = {
    kind: 'bond',
    bondId: sourceBond,
    side: 1,
    component: 'pi',
  };
  const destination: ElectronDestination = {
    kind: 'bond',
    bondId: targetBond,
    side: 1,
  };

  const result = route(struct, source, destination);

  /**
   * C2 is a plain skeletal vertex with three neighbours, so the renderer draws
   * no label for it and there is no label box to test against. The junction
   * itself still has to stay clear — an arrow through a bond intersection
   * reads as connecting to it.
   */
  it('arcs over the central carbon junction rather than through it', () => {
    const C2 = struct.atoms.get(atomId.C2)!.pp;
    const nearest = Math.min(
      ...result.polyline.map((point) => Vec2.dist(point, C2)),
    );
    expect(nearest).toBeGreaterThan(0.1);
  });

  it('ends beside the C2-C3 bond, not on the cationic carbon', () => {
    const C3 = struct.atoms.get(atomId.C3)!.pp;
    const C2 = struct.atoms.get(atomId.C2)!.pp;
    const midpoint = Vec2.centre(C2, C3);

    expect(Vec2.dist(result.p1, midpoint)).toBeLessThan(
      Vec2.dist(result.p1, C3),
    );
  });

  it('keeps the head off the positive charge', () => {
    expect(
      headClearanceOf(result, obstacle(obstacles, `charge:${atomId.C3}`)),
    ).toBeGreaterThanOrEqual(0);
  });

  it('stays on one side of the conjugated chain', () => {
    const sameSide = result.polyline.every(
      (point) => Math.sign(point.y) === Math.sign(result.p0.y) || point.y === 0,
    );
    expect(sameSide).toBe(true);
  });

  it('does not undulate on this simple shift', () => {
    // `inflections` counts how many times the *drawn* curve reverses its
    // direction of turn, which is not the same question as whether a single
    // cubic was classified an S — the meaning it had when this was written.
    // A curve built from two arcs reverses once at its crossover by
    // construction, and that is the shape rather than a defect. What must not
    // happen is reversing repeatedly, which is what reads as a wobbly arrow.
    expect(result.metrics.inflections).toBeLessThanOrEqual(1);
  });
});

describe('route determinism', () => {
  it('produces identical output for identical input', () => {
    const { struct, atomId } = carbocationAttack();
    const source: ElectronSource = {
      kind: 'lone-pair',
      atomId: atomId.I,
      pairIdx: pairFacing(struct, atomId.I, struct.atoms.get(atomId.C0)!.pp),
    };
    const destination: ElectronDestination = {
      kind: 'new-bond',
      atomId1: atomId.I,
      atomId2: atomId.C0,
    };

    const first = route(struct, source, destination);
    const second = route(struct, source, destination);

    expect(first.h1).toBe(second.h1);
    expect(first.h2).toBe(second.h2);
    expect(first.sectorId).toBe(second.sectorId);
  });

  it('respects a gesture side when it costs nothing', () => {
    const { struct, atomId } = carbocationAttack();
    const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
    const source: ElectronSource = {
      kind: 'lone-pair',
      atomId: atomId.I,
      pairIdx: pairFacing(struct, atomId.I, struct.atoms.get(atomId.C0)!.pp),
    };
    const destination: ElectronDestination = {
      kind: 'new-bond',
      atomId1: atomId.I,
      atomId2: atomId.C0,
    };

    const positive = routeArrow(
      { source, destination, gestureSide: 1 },
      struct,
      metrics,
      TEST_OPTIONS,
    );
    const negative = routeArrow(
      { source, destination, gestureSide: -1 },
      struct,
      metrics,
      TEST_OPTIONS,
    );

    expect(positive).not.toBeNull();
    expect(negative).not.toBeNull();
    // Both must still be collision-free — a gesture never buys a bond crossing.
    expect(positive!.metrics.obstacleIntersections).toBe(0);
    expect(negative!.metrics.obstacleIntersections).toBe(0);
  });
});

describe('metric snapshots', () => {
  /**
   * Records the shape-independent metrics so a scoring change that quietly
   * degrades a route shows up in review, without pinning the curve itself.
   */
  it('matches the recorded route metrics', () => {
    const fixtures: Array<[string, () => Route]> = [
      [
        'carbocation-attack',
        () => {
          const { struct, atomId } = carbocationAttack();
          return route(
            struct,
            {
              kind: 'lone-pair',
              atomId: atomId.I,
              pairIdx: pairFacing(
                struct,
                atomId.I,
                struct.atoms.get(atomId.C0)!.pp,
              ),
            },
            { kind: 'new-bond', atomId1: atomId.I, atomId2: atomId.C0 },
          );
        },
      ],
      [
        'hydride-shift',
        () => {
          const { struct, atomId, bondId } = hydrideShift();
          return route(
            struct,
            { kind: 'bond', bondId: bondIndex(bondId, 'C1-H') },
            { kind: 'new-bond', atomId1: atomId.H, atomId2: atomId.C2 },
          );
        },
      ],
    ];

    const summary = fixtures.map(([name, make]) => {
      const result = make();
      return {
        name,
        routeClass: result.routeClass,
        sectorId: result.sectorId,
        fallback: result.fallback,
        intersections: result.metrics.obstacleIntersections,
        inflections: result.metrics.inflections,
        minimumClearance: Number(result.metrics.minimumClearance.toFixed(3)),
        headTangentErrorDeg: Number(
          result.metrics.headTangentErrorDeg.toFixed(1),
        ),
        pathLengthOverChord: Number(
          result.metrics.pathLengthOverChord.toFixed(3),
        ),
      };
    });

    expect(summary).toMatchSnapshot();
  });
});
