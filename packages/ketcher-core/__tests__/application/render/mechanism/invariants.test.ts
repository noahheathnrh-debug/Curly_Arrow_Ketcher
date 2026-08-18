import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { buildObstacles } from 'application/render/mechanism/obstacles';
import { routeArrowSet } from 'application/render/mechanism/route';
import {
  polygonBoxClearance,
  polygonCapsuleClearance,
  polylineBoxClearance,
  polylineCapsuleClearance,
} from 'application/render/mechanism/geometry';
import type {
  MechanismStruct,
  Route,
  RoutingRequest,
} from 'application/render/mechanism/types';
import {
  allylResonance,
  bondIndex,
  carbocationAttack,
  carbonylAddition,
  crossStructureSCurve,
  hydrideShift,
  protonTransfer,
  ringSweep,
  sn2Backside,
  TEST_OPTIONS,
} from './structures';

/**
 * Invariants every fixture must satisfy, checked uniformly.
 *
 * The per-fixture suites assert what each drawing should look like. This one
 * asserts the things that must hold for *all* of them, because the gap between
 * those two is where defects hid: an arrow was found penetrating a methyl label
 * by a fraction of a pixel, and no test caught it — the router had knowingly
 * accepted a collision as its least-bad option and nothing asserted that it
 * must not.
 */

function pairFacing(struct: MechanismStruct, atomId: number, target: Vec2) {
  const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
  const atom = struct.atoms.get(atomId)!;
  const wanted = target.sub(atom.pp).normalized();

  let best = 0;
  let bestAlignment = -Infinity;
  metrics.lonePairDots(atomId).forEach((dot, index) => {
    const direction = dot.sub(atom.pp).normalized();
    const alignment = direction.x * wanted.x + direction.y * wanted.y;
    if (alignment > bestAlignment) {
      bestAlignment = alignment;
      best = index;
    }
  });
  return best;
}

interface Case {
  name: string;
  struct: MechanismStruct;
  requests: RoutingRequest[];
}

/**
 * Obstacle ids belonging to the arrow's own endpoints.
 *
 * These are legitimately touched: an arrow leaving a lone pair starts *on* that
 * lone pair, and an arrowhead pointing at an atom necessarily enters its
 * immediate vicinity. Asserting clearance against them would demand a route
 * that cannot exist. Everything else must be clear.
 */
function ownObstacleIds(
  request: RoutingRequest,
  struct: MechanismStruct,
): Set<string> {
  const ids = new Set<string>();

  const forAtom = (atomId: number) => {
    ids.add(`label:${atomId}`);
    ids.add(`charge:${atomId}`);
    for (let i = 0; i < 8; i++) {
      ids.add(`lonepair:${atomId}:${i}`);
      ids.add(`radical:${atomId}:${i}`);
    }
    struct.bonds.forEach((bond, bondId) => {
      if (bond.begin === atomId || bond.end === atomId) {
        ids.add(`bond:${bondId}`);
      }
    });
  };

  const { source, destination } = request;
  if (source.kind === 'bond') {
    ids.add(`bond:${source.bondId}`);
    const bond = struct.bonds.get(source.bondId);
    if (bond) {
      ids.add(`label:${bond.begin}`);
      ids.add(`label:${bond.end}`);
    }
  } else {
    forAtom(source.atomId);
  }

  if (destination.kind === 'atom') forAtom(destination.atomId);
  else if (destination.kind === 'bond') ids.add(`bond:${destination.bondId}`);
  else {
    forAtom(destination.atomId1);
    forAtom(destination.atomId2);
  }

  return ids;
}

function cases(): Case[] {
  const list: Case[] = [];

  {
    const f = carbocationAttack();
    list.push({
      name: 'carbocation attack',
      struct: f.struct,
      requests: [
        {
          source: {
            kind: 'lone-pair',
            atomId: f.atomId.I,
            pairIdx: pairFacing(
              f.struct,
              f.atomId.I,
              f.struct.atoms.get(f.atomId.C0)!.pp,
            ),
          },
          destination: {
            kind: 'new-bond',
            atomId1: f.atomId.I,
            atomId2: f.atomId.C0,
          },
        },
      ],
    });
  }

  {
    const f = sn2Backside();
    list.push({
      name: 'SN2',
      struct: f.struct,
      requests: [
        {
          source: {
            kind: 'lone-pair',
            atomId: f.atomId.O,
            pairIdx: pairFacing(
              f.struct,
              f.atomId.O,
              f.struct.atoms.get(f.atomId.C)!.pp,
            ),
          },
          destination: {
            kind: 'new-bond',
            atomId1: f.atomId.O,
            atomId2: f.atomId.C,
          },
        },
        {
          source: { kind: 'bond', bondId: bondIndex(f.bondId, 'C-Br') },
          destination: { kind: 'atom', atomId: f.atomId.Br },
        },
      ],
    });
  }

  {
    const f = carbonylAddition();
    list.push({
      name: 'carbonyl addition',
      struct: f.struct,
      requests: [
        {
          source: {
            kind: 'lone-pair',
            atomId: f.atomId.Nu,
            pairIdx: pairFacing(
              f.struct,
              f.atomId.Nu,
              f.struct.atoms.get(f.atomId.C0)!.pp,
            ),
          },
          destination: {
            kind: 'new-bond',
            atomId1: f.atomId.Nu,
            atomId2: f.atomId.C0,
          },
        },
        {
          source: {
            kind: 'bond',
            bondId: bondIndex(f.bondId, 'C0-O'),
            side: -1,
            component: 'pi',
          },
          destination: { kind: 'atom', atomId: f.atomId.O },
        },
      ],
    });
  }

  {
    const f = hydrideShift();
    list.push({
      name: 'hydride shift',
      struct: f.struct,
      requests: [
        {
          source: { kind: 'bond', bondId: bondIndex(f.bondId, 'C1-H') },
          destination: {
            kind: 'new-bond',
            atomId1: f.atomId.H,
            atomId2: f.atomId.C2,
          },
        },
      ],
    });
  }

  {
    const f = allylResonance();
    list.push({
      name: 'allyl resonance',
      struct: f.struct,
      requests: [
        {
          source: {
            kind: 'bond',
            bondId: bondIndex(f.bondId, 'C1-C2'),
            side: 1,
            component: 'pi',
          },
          destination: {
            kind: 'bond',
            bondId: bondIndex(f.bondId, 'C2-C3'),
            side: 1,
          },
        },
      ],
    });
  }

  {
    const f = protonTransfer();
    list.push({
      name: 'proton transfer',
      struct: f.struct,
      requests: [
        {
          source: {
            kind: 'lone-pair',
            atomId: f.atomId.O,
            pairIdx: pairFacing(
              f.struct,
              f.atomId.O,
              f.struct.atoms.get(f.atomId.H)!.pp,
            ),
          },
          destination: { kind: 'atom', atomId: f.atomId.H },
        },
        {
          source: { kind: 'bond', bondId: bondIndex(f.bondId, 'H-Br') },
          destination: { kind: 'atom', atomId: f.atomId.Br },
        },
      ],
    });
  }

  {
    const f = crossStructureSCurve();
    list.push({
      name: 'cross-structure S-curve',
      struct: f.struct,
      requests: [
        {
          source: {
            kind: 'lone-pair',
            atomId: f.atomId.O,
            pairIdx: pairFacing(
              f.struct,
              f.atomId.O,
              f.struct.atoms.get(f.atomId.CH2)!.pp,
            ),
          },
          destination: {
            kind: 'new-bond',
            atomId1: f.atomId.O,
            atomId2: f.atomId.CH2,
          },
        },
      ],
    });
  }

  {
    const f = ringSweep();
    list.push({
      name: 'ring sweep',
      struct: f.struct,
      requests: [
        {
          source: {
            kind: 'lone-pair',
            atomId: f.atomId.O,
            pairIdx: pairFacing(
              f.struct,
              f.atomId.O,
              f.struct.atoms.get(f.atomId.C4)!.pp,
            ),
          },
          destination: {
            kind: 'new-bond',
            atomId1: f.atomId.O,
            atomId2: f.atomId.C4,
          },
        },
      ],
    });
  }

  return list;
}

const routed = cases().map((testCase) => {
  const metrics = new AnalyticMechanismMetrics(testCase.struct, TEST_OPTIONS);
  const routes = routeArrowSet(
    testCase.requests,
    testCase.struct,
    metrics,
    TEST_OPTIONS,
  );
  return {
    ...testCase,
    metrics,
    obstacles: buildObstacles(testCase.struct, metrics),
    routes,
  };
});

describe.each(routed.map((r) => [r.name, r] as const))('%s', (_name, item) => {
  it('routes every arrow', () => {
    item.routes.forEach((route) => expect(route).not.toBeNull());
  });

  /**
   * The assertion that was missing. A route marked `fallback` is one the router
   * could not find a clean option for and drew anyway; a fixture reaching that
   * state is a routing failure even though the arrow exists.
   */
  it('never settles for a collision', () => {
    (item.routes.filter(Boolean) as Route[]).forEach((route) => {
      expect(route.metrics.collidedWith).toEqual([]);
      expect(route.fallback).toBe(false);
    });
  });

  it('keeps the arrowhead polygon clear of unrelated obstacles', () => {
    item.routes.forEach((route, index) => {
      if (!route) return;
      const own = ownObstacleIds(item.requests[index], item.struct);

      for (const obstacle of item.obstacles) {
        if (own.has(obstacle.id)) continue;
        const clearance =
          obstacle.shape === 'capsule'
            ? polygonCapsuleClearance(route.head, obstacle.capsule)
            : polygonBoxClearance(route.head, obstacle.box);
        expect(clearance).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it('keeps the shaft out of unrelated atom labels', () => {
    item.routes.forEach((route, index) => {
      if (!route) return;
      const own = ownObstacleIds(item.requests[index], item.struct);

      for (const obstacle of item.obstacles) {
        if (obstacle.shape !== 'box' || obstacle.cls !== 'label') continue;
        if (own.has(obstacle.id)) continue;
        expect(
          polylineBoxClearance(route.polyline, obstacle.box),
        ).toBeGreaterThan(0);
      }
    });
  });

  it('starts each arrow on the thing it claims to come from', () => {
    item.routes.forEach((route, index) => {
      if (!route) return;
      const source = item.requests[index].source;

      // How far the tail sits from the thing it comes from, as one number
      // whichever kind of source it is: clearance from the bond's capsule, or
      // distance to the dot. A missing bond extent becomes Infinity, so it
      // fails here rather than needing an assertion of its own.
      let offset: number;
      let limit: number;

      if (source.kind === 'bond') {
        const extent = item.metrics.bondExtent(source.bondId);
        offset = extent
          ? polylineCapsuleClearance([route.p0, route.p0], {
              a: extent[0],
              b: extent[1],
              r: item.metrics.bondHalfWidth(source.bondId),
            })
          : Infinity;
        // Close enough to read as emerging from the bond rather than floating
        // beside it, without being so close it is drawn on top of it.
        limit = 0.2;
      } else {
        const dots =
          source.kind === 'lone-pair'
            ? item.metrics.lonePairDots(source.atomId)
            : item.metrics.radicalDots(source.atomId);
        const dotIndex =
          source.kind === 'lone-pair' ? source.pairIdx : source.radicalIdx;
        offset = Vec2.dist(route.p0, dots[dotIndex]);
        limit = 1e-6;
      }

      expect(offset).toBeLessThan(limit);
    });
  });

  it('bows short cleavage arrows away from their own bond', () => {
    item.routes.forEach((route, index) => {
      if (!route) return;
      if (item.requests[index].source.kind !== 'bond') return;

      const chord = Vec2.dist(route.p0, route.p1);
      if (chord < 1e-9) return;
      const dir = route.p1.sub(route.p0).scaled(1 / chord);

      const bulge = Math.max(
        ...route.polyline.map((point) => {
          const rel = point.sub(route.p0);
          return Math.abs(rel.x * -dir.y + rel.y * dir.x);
        }),
      );
      expect(bulge).toBeGreaterThan(0.1);
    });
  });
});

describe('ring sweep geometry', () => {
  /**
   * Guards the fixture itself, not the router.
   *
   * An earlier version of this fixture left the target carbon's free direction
   * facing the nucleophile, so a direct route existed and the sweep test passed
   * without ever exercising a sweep. A capability test that can be satisfied
   * trivially is worse than no test, so the premise is asserted explicitly.
   */
  const f = ringSweep();
  const ringCentre = new Vec2(0, 0);

  it('points the target carbon away from the nucleophile', () => {
    const target = f.struct.atoms.get(f.atomId.C4)!.pp;
    const nucleophile = f.struct.atoms.get(f.atomId.O)!.pp;

    const outward = target.sub(ringCentre).normalized();
    const toNucleophile = nucleophile.sub(target).normalized();
    const alignment = outward.x * toNucleophile.x + outward.y * toNucleophile.y;

    // Strongly negative: the only clear side faces away from the attacker.
    expect(alignment).toBeLessThan(-0.5);
  });

  it('puts the ring between the nucleophile and the target', () => {
    const target = f.struct.atoms.get(f.atomId.C4)!.pp;
    const nucleophile = f.struct.atoms.get(f.atomId.O)!.pp;

    // Distance from the ring centre to the straight line between them.
    const axis = target.sub(nucleophile);
    const length = axis.length();
    const dir = axis.scaled(1 / length);
    const rel = ringCentre.sub(nucleophile);
    const perpendicular = Math.abs(rel.x * -dir.y + rel.y * dir.x);

    expect(perpendicular).toBeLessThan(1);
  });
});

describe('curve expressiveness', () => {
  /**
   * The acceptance test for freeing the control points.
   *
   * With them pinned at fixed thirds of the chord, a cubic cannot arrive more
   * than about 90 degrees off that chord at any parameter value — so an arrow
   * that has to travel around the outside of a ring and come back in was not
   * merely scored badly, it was unreachable.
   */
  it('routes an arrow that arrives well off its own chord', () => {
    const sweep = routed.find((r) => r.name === 'ring sweep');
    expect(sweep).toBeDefined();
    const route = sweep!.routes[0];
    expect(route).not.toBeNull();
    if (!route) return;

    const chord = route.p1.sub(route.p0).normalized();
    const arrival = route.p1
      .sub(route.polyline[route.polyline.length - 2])
      .normalized();
    const offChordDeg =
      (Math.acos(
        Math.max(-1, Math.min(1, chord.x * arrival.x + chord.y * arrival.y)),
      ) *
        180) /
      Math.PI;

    expect(offChordDeg).toBeGreaterThan(60);
    expect(route.metrics.collidedWith).toEqual([]);
  });

  it('still produces the cross-structure S-curve', () => {
    const s = routed.find((r) => r.name === 'cross-structure S-curve');
    const route = s!.routes[0];
    expect(route).not.toBeNull();
    expect(route!.metrics.collidedWith).toEqual([]);
  });
});
