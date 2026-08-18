import { RxnArrowMode } from 'domain/entities/rxnArrow';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { buildObstacles } from 'application/render/mechanism/obstacles';
import { routeArrow } from 'application/render/mechanism/route';
import { polylineCapsuleClearance } from 'application/render/mechanism/geometry';
import type {
  MechanismArrowShape,
  MechanismStruct,
  Obstacle,
  Route,
  RoutingRequest,
} from 'application/render/mechanism/types';
import { Vec2 } from 'domain/entities/vec2';
import {
  bondIndex,
  protonTransfer,
  sn2Backside,
  TEST_OPTIONS,
} from './structures';

/**
 * Arrows already on the canvas are obstacles for the next one.
 *
 * The alternative — jointly optimising a whole step — was rejected because an
 * arrow must never move because a *later* arrow was drawn. Putting finished
 * arrows in the obstacle set gives the same "arrows do not overlap" result
 * while leaving earlier arrows exactly where the user last saw them.
 */

function arrowFrom(route: Route): MechanismArrowShape {
  return {
    mode: RxnArrowMode.CurlyMechanism,
    pos: [route.p0, route.p1],
    height: route.h1,
    height2: route.h2,
    along1: route.along1,
    along2: route.along2,
  };
}

function arrowCapsules(obstacles: Obstacle[]) {
  return obstacles.filter((obstacle) => obstacle.cls === 'arrow');
}

/** How close a route comes to an arrow's capsule chain; negative means overlap. */
function clearanceFrom(route: Route, obstacles: Obstacle[]): number {
  let closest = Infinity;
  for (const obstacle of arrowCapsules(obstacles)) {
    if (obstacle.shape !== 'capsule') continue;
    closest = Math.min(
      closest,
      polylineCapsuleClearance(route.polyline, obstacle.capsule),
    );
  }
  return closest;
}

const { struct, atomId, bondId } = protonTransfer();
const hBr = bondIndex(bondId, 'H-Br');
const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);

const cleavage: RoutingRequest = {
  source: { kind: 'bond', bondId: hBr },
  destination: { kind: 'atom', atomId: atomId.Br },
};

const unobstructed = routeArrow(cleavage, struct, metrics, TEST_OPTIONS)!;

/** The same struct, with one arrow already drawn on it. */
function withArrows(arrows: MechanismArrowShape[]): MechanismStruct {
  return {
    ...struct,
    rxnArrows: new Map(arrows.map((arrow, index) => [index, arrow])),
  };
}

describe('existing arrows as obstacles', () => {
  it('contributes nothing when the canvas has no arrows', () => {
    expect(arrowCapsules(buildObstacles(struct, metrics))).toHaveLength(0);
  });

  it('turns a mechanism arrow into a chain of capsules along its curve', () => {
    const populated = withArrows([arrowFrom(unobstructed)]);
    const capsules = arrowCapsules(buildObstacles(populated, metrics));

    expect(capsules.length).toBeGreaterThan(1);
    expect(
      capsules.every((obstacle) => obstacle.id.startsWith('arrow:0:')),
    ).toBe(true);
  });

  /**
   * Reaction arrows, equilibria and the rest share the entity but have nothing
   * to do with mechanisms. Treating them as obstacles would make a curly arrow
   * swerve around the reaction arrow in the middle of a scheme.
   */
  it('ignores arrows that are not mechanism arrows', () => {
    const reactionArrow: MechanismArrowShape = {
      ...arrowFrom(unobstructed),
      mode: RxnArrowMode.OpenAngle,
    };
    expect(
      arrowCapsules(buildObstacles(withArrows([reactionArrow]), metrics)),
    ).toHaveLength(0);
  });

  /**
   * Without this an arrow would be repelled by the curve it drew last frame,
   * shifting a little further every redraw and never settling.
   */
  it('excludes an arrow from its own obstacle set', () => {
    const self = arrowFrom(unobstructed);
    const populated = withArrows([self]);

    expect(
      arrowCapsules(buildObstacles(populated, metrics, self)),
    ).toHaveLength(0);
  });

  it('routes a re-routed arrow identically to how it routed alone', () => {
    const self = arrowFrom(unobstructed);
    const again = routeArrow(
      { ...cleavage, excludeArrow: self },
      withArrows([self]),
      metrics,
      TEST_OPTIONS,
    )!;

    expect(again.h1).toBeCloseTo(unobstructed.h1, 12);
    expect(again.h2).toBeCloseTo(unobstructed.h2, 12);
  });
});

/**
 * The capability itself.
 *
 * The blocker is the arrow's own natural curve, shifted sideways so it lies
 * along the corridor the arrow wanted to use without sharing its endpoints.
 * Two arrows that *do* share endpoints necessarily touch there whatever shape
 * either takes, so that arrangement cannot demonstrate anything.
 */
describe('giving way to an arrow already drawn', () => {
  const sn2 = sn2Backside();
  const sn2Metrics = new AnalyticMechanismMetrics(sn2.struct, TEST_OPTIONS);
  const attack: RoutingRequest = {
    source: { kind: 'lone-pair', atomId: sn2.atomId.O, pairIdx: 0 },
    destination: {
      kind: 'new-bond',
      atomId1: sn2.atomId.O,
      atomId2: sn2.atomId.C,
    },
  };

  const alone = routeArrow(attack, sn2.struct, sn2Metrics, TEST_OPTIONS)!;

  /** `alone`, shifted perpendicular to its own chord. */
  function shifted(distance: number): MechanismArrowShape {
    const direction = alone.p1.sub(alone.p0).normalized();
    const offset = new Vec2(-direction.y, direction.x).scaled(distance);
    return {
      ...arrowFrom(alone),
      pos: [alone.p0.add(offset), alone.p1.add(offset)],
    };
  }

  const blocker = shifted(-0.18);
  const populated: MechanismStruct = {
    ...sn2.struct,
    rxnArrows: new Map([[0, blocker]]),
  };
  const obstacles = buildObstacles(populated, sn2Metrics);
  const rerouted = routeArrow(attack, populated, sn2Metrics, TEST_OPTIONS)!;

  it('confirms the arrow would otherwise lie on top of it', () => {
    expect(clearanceFrom(alone, obstacles)).toBeLessThan(0);
  });

  it('finds a collision-free curve instead', () => {
    expect(clearanceFrom(rerouted, obstacles)).toBeGreaterThanOrEqual(0);
    expect(rerouted.fallback).toBe(false);
  });

  /**
   * Only the shape moves. Which lone pair the electrons come from and where
   * they land are chemistry, and no amount of crowding may change them.
   */
  it('keeps both endpoints where the chemistry put them', () => {
    expect(Vec2.dist(rerouted.p0, alone.p0)).toBeLessThan(1e-9);
    expect(Vec2.dist(rerouted.p1, alone.p1)).toBeLessThan(0.5);
  });
});
