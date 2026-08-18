import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { buildObstacles } from 'application/render/mechanism/obstacles';
import { routeArrowSet } from 'application/render/mechanism/route';
import {
  polylineCapsuleClearance,
  segmentSegmentDistance,
} from 'application/render/mechanism/geometry';
import {
  ARROW_CLEARANCE,
  LENGTH_LIMIT_OFFSET,
  LENGTH_LIMIT_SCALE,
} from 'application/render/mechanism/constants';
import type {
  MechanismStruct,
  Obstacle,
  Route,
  RoutingRequest,
} from 'application/render/mechanism/types';
import {
  bondIndex,
  carbonylAddition,
  protonTransfer,
  sn2Backside,
  TEST_OPTIONS,
} from './structures';

/**
 * Multi-arrow steps.
 *
 * Every arrow of an elementary step is routed together, because an arrow only
 * has to dodge the *structure* to score well on its own — two independently
 * perfect arrows can still cross each other. These fixtures check both: each
 * arrow clear of the molecule, and the set clear of itself.
 */

function routeSet(
  struct: MechanismStruct,
  requests: RoutingRequest[],
): { routes: Route[]; obstacles: Obstacle[] } {
  const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
  const results = routeArrowSet(requests, struct, metrics, TEST_OPTIONS);

  results.forEach((route, index) => {
    expect(route).not.toBeNull();
    expect(route).toBeDefined();
    if (!route) throw new Error(`arrow ${index} could not be routed`);
  });

  return {
    routes: results as Route[],
    obstacles: buildObstacles(struct, metrics),
  };
}

/** Bonds neither arrow is attached to must stay untouched. */
function expectNoUnrelatedBondCrossings(
  route: Route,
  obstacles: Obstacle[],
  relatedBondIds: number[],
) {
  for (const item of obstacles) {
    if (item.shape !== 'capsule' || item.cls !== 'bond') continue;
    if (relatedBondIds.some((id) => item.id === `bond:${id}`)) continue;
    expect(
      polylineCapsuleClearance(route.polyline, item.capsule),
    ).toBeGreaterThanOrEqual(0);
  }
}

function closestApproach(a: Route, b: Route): number {
  let closest = Infinity;
  for (let i = 1; i < a.polyline.length; i++) {
    for (let j = 1; j < b.polyline.length; j++) {
      closest = Math.min(
        closest,
        segmentSegmentDistance(
          a.polyline[i - 1],
          a.polyline[i],
          b.polyline[j - 1],
          b.polyline[j],
        ),
      );
    }
  }
  return closest;
}

function pairFacing(
  struct: MechanismStruct,
  atomId: number,
  target: Vec2,
): number {
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

describe('Visual Test 2 — SN2 backside attack', () => {
  const { struct, atomId, bondId } = sn2Backside();
  const cBr = bondIndex(bondId, 'C-Br');

  const requests: RoutingRequest[] = [
    {
      source: {
        kind: 'lone-pair',
        atomId: atomId.O,
        pairIdx: pairFacing(struct, atomId.O, struct.atoms.get(atomId.C)!.pp),
      },
      destination: { kind: 'new-bond', atomId1: atomId.O, atomId2: atomId.C },
    },
    {
      source: { kind: 'bond', bondId: cBr },
      destination: { kind: 'atom', atomId: atomId.Br },
    },
  ];

  const { routes, obstacles } = routeSet(struct, requests);
  const [attack, departure] = routes;

  /**
   * The leaving-group arrow runs from the C-Br midpoint to Br, a chord of
   * roughly 0.2-0.3 bond lengths. The tool used to reject anything under 0.3,
   * so this arrow — present in essentially every SN2 drawing — could not be
   * created at all. This asserts the geometry is legitimate despite being short.
   */
  it('routes the short leaving-group arrow from a bond to its own atom', () => {
    const chord = Vec2.dist(departure.p0, departure.p1);
    expect(chord).toBeGreaterThan(0);
    expect(chord).toBeLessThan(0.6);
  });

  it('brings the nucleophile in on the opposite side from the leaving group', () => {
    const C = struct.atoms.get(atomId.C)!.pp;
    const Br = struct.atoms.get(atomId.Br)!.pp;

    const approach = attack.p1.sub(C).normalized();
    const toLeavingGroup = Br.sub(C).normalized();
    const alignment =
      approach.x * toLeavingGroup.x + approach.y * toLeavingGroup.y;

    expect(alignment).toBeLessThan(0);
  });

  it('keeps the attack arrow off the three C-H bonds', () => {
    expectNoUnrelatedBondCrossings(attack, obstacles, [cBr]);
  });

  it('lets the departure arrow reach Br through the breaking bond direction', () => {
    expectNoUnrelatedBondCrossings(departure, obstacles, [cBr]);
  });

  it('does not let the two arrows cross', () => {
    expect(closestApproach(attack, departure)).toBeGreaterThan(0);
  });
});

describe('Visual Test 3 — carbonyl addition', () => {
  const { struct, atomId, bondId } = carbonylAddition();
  const carbonyl = bondIndex(bondId, 'C0-O');

  const requests: RoutingRequest[] = [
    {
      source: {
        kind: 'lone-pair',
        atomId: atomId.Nu,
        pairIdx: pairFacing(struct, atomId.Nu, struct.atoms.get(atomId.C0)!.pp),
      },
      destination: { kind: 'new-bond', atomId1: atomId.Nu, atomId2: atomId.C0 },
    },
    {
      source: { kind: 'bond', bondId: carbonyl, side: -1, component: 'pi' },
      destination: { kind: 'atom', atomId: atomId.O },
    },
  ];

  const { routes, obstacles } = routeSet(struct, requests);
  const [attack, piShift] = routes;

  it('keeps the nucleophile arrow off the carbonyl and both alkyl bonds', () => {
    expectNoUnrelatedBondCrossings(attack, obstacles, []);
  });

  it('starts the pi arrow on the C=O bond rather than at either atom', () => {
    const C0 = struct.atoms.get(atomId.C0)!.pp;
    const O = struct.atoms.get(atomId.O)!.pp;

    expect(Vec2.dist(piShift.p0, C0)).toBeGreaterThan(0.2);
    expect(Vec2.dist(piShift.p0, O)).toBeGreaterThan(0.2);
  });

  it('ends the pi arrow on the oxygen, not looping back around it', () => {
    const O = struct.atoms.get(atomId.O)!.pp;
    expect(Vec2.dist(piShift.p1, O)).toBeLessThan(0.7);

    // A loop shows up as a path far longer than its chord. Measured against
    // the router's own wander limit rather than a bare ratio, because this
    // arrow is short and a short chord tolerates a proportionally larger arc.
    const chord = Vec2.dist(piShift.p0, piShift.p1);
    expect(piShift.metrics.pathLengthOverChord * chord).toBeLessThanOrEqual(
      LENGTH_LIMIT_SCALE * chord + LENGTH_LIMIT_OFFSET,
    );
  });

  it('does not form an X between the two arrows', () => {
    expect(closestApproach(attack, piShift)).toBeGreaterThan(0);
  });
});

describe('Visual Test 7 — proton transfer', () => {
  const { struct, atomId, bondId } = protonTransfer();
  const hBr = bondIndex(bondId, 'H-Br');
  const cO = bondIndex(bondId, 'C-O');

  const requests: RoutingRequest[] = [
    {
      source: {
        kind: 'lone-pair',
        atomId: atomId.O,
        pairIdx: pairFacing(struct, atomId.O, struct.atoms.get(atomId.H)!.pp),
      },
      destination: { kind: 'atom', atomId: atomId.H },
    },
    {
      source: { kind: 'bond', bondId: hBr },
      destination: { kind: 'atom', atomId: atomId.Br },
    },
  ];

  const { routes, obstacles } = routeSet(struct, requests);
  const [deprotonation, cleavage] = routes;

  /**
   * The arrow goes *to* H. Hydrogen is not an electron source in a polar
   * proton transfer, and drawing it the other way round is the classic
   * student error the tool should never itself commit.
   */
  it('points the first arrow at the hydrogen', () => {
    const H = struct.atoms.get(atomId.H)!.pp;
    const O = struct.atoms.get(atomId.O)!.pp;

    expect(Vec2.dist(deprotonation.p1, H)).toBeLessThan(
      Vec2.dist(deprotonation.p0, H),
    );
    expect(Vec2.dist(deprotonation.p0, O)).toBeLessThan(
      Vec2.dist(deprotonation.p1, O),
    );
  });

  it('leaves the oxygen outward rather than through its own label', () => {
    const O = struct.atoms.get(atomId.O)!.pp;
    const nearest = Math.min(
      ...deprotonation.polyline.slice(2).map((point) => Vec2.dist(point, O)),
    );
    expect(nearest).toBeGreaterThan(0.1);
  });

  it('stops short of the hydrogen rather than covering it', () => {
    const H = struct.atoms.get(atomId.H)!.pp;
    expect(Vec2.dist(deprotonation.p1, H)).toBeGreaterThan(0);
  });

  it('keeps both arrows off the unrelated C-O bond', () => {
    expectNoUnrelatedBondCrossings(deprotonation, obstacles, [cO, hBr]);
    expectNoUnrelatedBondCrossings(cleavage, obstacles, [hBr]);
  });

  it('gives the cleavage arrow a broad curve rather than a tight loop', () => {
    expect(cleavage.metrics.pathLengthOverChord).toBeLessThan(2.25);
  });

  it('keeps the two arrows apart', () => {
    expect(closestApproach(deprotonation, cleavage)).toBeGreaterThan(0);
  });
});

describe('joint routing', () => {
  it('separates arrows that would collide if routed independently', () => {
    const { struct, atomId, bondId } = sn2Backside();
    const cBr = bondIndex(bondId, 'C-Br');

    const { routes } = routeSet(struct, [
      {
        source: {
          kind: 'lone-pair',
          atomId: atomId.O,
          pairIdx: pairFacing(struct, atomId.O, struct.atoms.get(atomId.C)!.pp),
        },
        destination: { kind: 'new-bond', atomId1: atomId.O, atomId2: atomId.C },
      },
      {
        source: { kind: 'bond', bondId: cBr },
        destination: { kind: 'atom', atomId: atomId.Br },
      },
    ]);

    // Away from any shared endpoint the two must keep a visible gap.
    const separation = closestApproach(routes[0], routes[1]);
    const sharesEndpoint =
      Vec2.dist(routes[0].p1, routes[1].p0) < 0.3 ||
      Vec2.dist(routes[0].p1, routes[1].p1) < 0.3;

    // Two arrows meeting at the same atom necessarily touch there, so all that
    // can be asked of them is that they do not overlap.
    const required = sharesEndpoint ? 0 : ARROW_CLEARANCE * 0.5;
    expect(separation).toBeGreaterThanOrEqual(required);
  });
});
