import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import {
  approachLobes,
  enclosingBonds,
  sameRegion,
} from 'application/render/mechanism/anchors';
import { routeArrow } from 'application/render/mechanism/route';
import {
  headTangent,
  pointSegmentDistance,
  segmentsIntersect,
  tailTangent,
} from 'application/render/mechanism/geometry';
import {
  MECH_HEAD_HALF_WIDTH,
  MECH_HEAD_LENGTH,
} from 'application/render/mechanism/constants';
import type { RoutingRequest } from 'application/render/mechanism/types';
import {
  alkaneChain,
  bondIndex,
  branchedChain,
  phenol,
  propylbenzene,
  TEST_OPTIONS,
} from './structures';

/**
 * An arrow may not cross out of the region it starts in.
 *
 * Not the same thing as avoiding obstacles, and not covered by it. The inside
 * of a benzene ring is empty space: an arrow that dives through the middle
 * touches nothing at all, so collision scoring has no objection. Delocalisation
 * arrows between adjacent ring bonds were being drawn straight through the ring.
 */

const { struct, bondId } = phenol();
const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
const boundary = enclosingBonds(struct);

function crossesTheRing(polyline: Vec2[]): boolean {
  for (let i = 1; i < polyline.length; i++) {
    for (const [begin, end] of boundary) {
      if (segmentsIntersect(polyline[i - 1], polyline[i], begin, end)) {
        return true;
      }
    }
  }
  return false;
}

/** Every adjacent pair of ring bonds, from both faces of the source bond. */
function delocalisations(): RoutingRequest[] {
  const requests: RoutingRequest[] = [];
  for (let i = 0; i < 6; i++) {
    for (const side of [1, -1] as const) {
      requests.push({
        source: {
          kind: 'bond',
          bondId: bondIndex(bondId, `C${i}-C${(i + 1) % 6}`),
          component: 'pi',
          side,
        },
        destination: {
          kind: 'bond',
          bondId: bondIndex(bondId, `C${(i + 1) % 6}-C${(i + 2) % 6}`),
        },
      });
    }
  }
  return requests;
}

describe('the boundary of a structure', () => {
  it('is made of the bonds that lie on a cycle', () => {
    // The six ring bonds. The hydroxyl hanging off C0 is a bridge and bounds
    // nothing, so it is not part of any boundary.
    expect(boundary).toHaveLength(6);
  });
});

describe('delocalisation around a ring', () => {
  const routes = delocalisations().map((request) =>
    routeArrow(request, struct, metrics, TEST_OPTIONS),
  );

  it('routes every one of them', () => {
    for (const route of routes) expect(route).not.toBeNull();
  });

  it('never cuts through a ring bond', () => {
    for (const route of routes) {
      if (!route) continue;
      expect(crossesTheRing(route.polyline)).toBe(false);
    }
  });

  /**
   * Crossing and ending up inside are different failures. An arrow anchored to
   * the inner face of a bond legitimately lives inside the ring; what it may
   * not do is get there from outside.
   *
   * Tested with the region predicate itself rather than distance from the
   * centre, which does not separate inside from outside for a hexagon — a point
   * just outside a bond's midpoint is nearer the centre than any vertex is.
   */
  it('stays on the side of the ring its tail started on', () => {
    for (const route of routes) {
      if (!route) continue;
      for (const point of route.polyline) {
        expect(sameRegion(route.p0, point, struct)).toBe(true);
      }
    }
  });
});

/**
 * An arrow may not pass through the bond it is attached to.
 *
 * Its own source and destination bonds are exempt from collision scoring —
 * necessarily, because an arrow leaving a bond starts right beside it, and
 * without the exemption every cleavage arrow collided with its own source. But
 * that exemption was written as a proximity allowance when it should have been
 * a tangency one: it asks what fraction of the curve lies *inside* the bond
 * capsule, and a curve that cuts clean through has almost none of its length in
 * there. Chain bonds make this visible because they lie on no cycle, so the
 * region rule has nothing to say about them either.
 */
describe('an arrow and the bond it comes from', () => {
  const chain = propylbenzene();
  const chainMetrics = new AnalyticMechanismMetrics(chain.struct, TEST_OPTIONS);

  const pairs: Array<[string, string]> = [
    ['C0-A', 'A-B'],
    ['A-B', 'B-D'],
    ['A-B', 'C0-A'],
  ];

  it('never cuts through either of its own endpoint bonds', () => {
    for (const [from, to] of pairs) {
      for (const side of [1, -1] as const) {
        const sourceId = bondIndex(chain.bondId, from);
        const targetId = bondIndex(chain.bondId, to);

        const route = routeArrow(
          {
            source: { kind: 'bond', bondId: sourceId, side },
            destination: { kind: 'bond', bondId: targetId },
          },
          chain.struct,
          chainMetrics,
          TEST_OPTIONS,
        );
        expect(route).not.toBeNull();
        if (!route) continue;

        for (const bondId of [sourceId, targetId]) {
          const extent = chainMetrics.bondExtent(bondId);
          expect(extent).not.toBeNull();
          if (!extent) continue;

          const cuts = route.polyline.some(
            (point, index) =>
              index > 0 &&
              segmentsIntersect(
                route.polyline[index - 1],
                point,
                extent[0],
                extent[1],
              ),
          );
          expect(cuts).toBe(false);
        }
      }
    }
  });

  /** A curly arrow that loops back through its own body is not a curly arrow. */
  it('never crosses itself', () => {
    for (const [from, to] of pairs) {
      for (const side of [1, -1] as const) {
        const route = routeArrow(
          {
            source: {
              kind: 'bond',
              bondId: bondIndex(chain.bondId, from),
              side,
            },
            destination: {
              kind: 'bond',
              bondId: bondIndex(chain.bondId, to),
            },
          },
          chain.struct,
          chainMetrics,
          TEST_OPTIONS,
        );
        if (!route) continue;

        const points = route.polyline;
        for (let i = 1; i < points.length; i++) {
          for (let j = i + 2; j < points.length; j++) {
            expect(
              segmentsIntersect(
                points[i - 1],
                points[i],
                points[j - 1],
                points[j],
              ),
            ).toBe(false);
          }
        }
      }
    }
  });
});

/**
 * A chosen approach may not force an arrow through the structure.
 *
 * Picking a lobe pins which face of a bond the head arrives at. That pin used
 * to be absolute — the pinned face was the only anchor offered — so when
 * nothing could reach it without cutting through the bond, every candidate
 * collided and the least-bad one won: an arrow drawn straight through a chain.
 *
 * The pin now decides between *clean* routes and no more than that. Not
 * crossing the structure outranks honouring the pick, and the preview shows the
 * arrow snap to the other face so the choice is never silently ignored.
 */
describe('a pinned approach and the collision rule', () => {
  const chain = alkaneChain();
  const chainMetrics = new AnalyticMechanismMetrics(chain.struct, TEST_OPTIONS);

  it('never cuts a bond, whichever face is asked for', () => {
    for (let i = 1; i < 5; i++) {
      const sourceId = bondIndex(chain.bondId, `C${i - 1}-C${i}`);
      const targetId = bondIndex(chain.bondId, `C${i}-C${i + 1}`);

      for (const tail of [1, -1] as const) {
        for (const head of [undefined, 1, -1] as const) {
          const route = routeArrow(
            {
              source: { kind: 'bond', bondId: sourceId, side: tail },
              destination: { kind: 'bond', bondId: targetId, side: head },
            },
            chain.struct,
            chainMetrics,
            TEST_OPTIONS,
          );
          expect(route).not.toBeNull();
          if (!route) continue;

          // Nothing on the whole chain, not merely the two it is attached to.
          chain.struct.bonds.forEach((_bond, bondId) => {
            const extent = chainMetrics.bondExtent(bondId);
            if (!extent) return;

            const cuts = route.polyline.some(
              (point, index) =>
                index > 0 &&
                segmentsIntersect(
                  route.polyline[index - 1],
                  point,
                  extent[0],
                  extent[1],
                ),
            );
            expect(cuts).toBe(false);
          });

          // And it found a genuinely clean route rather than settling.
          expect(route.fallback).toBe(false);
        }
      }
    }
  });
});

/**
 * Every approach the user can pick must be reachable.
 *
 * The only rule is that an arrow may not pass through the structure. Anything
 * else — a long sweep around the outside, a curve that crosses its own tail —
 * is an unusual arrow rather than a forbidden one, and refusing to draw it, or
 * silently arriving somewhere else, is the tool overruling a choice that was
 * the user's to make.
 *
 * One cubic cannot always oblige. With both end tangents pinned by chemistry
 * only the two handle lengths are free, and some ways round simply are not in
 * that two-parameter family however long the handles get. A waypoint restores
 * the freedom; the halves share a tangent there, so it stays one smooth stroke.
 */
describe('reaching every face of a bond', () => {
  const chain = alkaneChain(8);
  const chainMetrics = new AnalyticMechanismMetrics(chain.struct, TEST_OPTIONS);

  /** Which face of `bondId` the point lies on. */
  function faceOf(point: Vec2, bondId: number): -1 | 1 {
    const extent = chainMetrics.bondExtent(bondId)!;
    const direction = extent[1].sub(extent[0]).normalized();
    const relative = point.sub(
      extent[0].addScaled(extent[1].sub(extent[0]), 0.5),
    );
    return relative.x * direction.y - relative.y * direction.x >= 0 ? 1 : -1;
  }

  it('arrives on whichever face was asked for, without cutting anything', () => {
    for (let i = 2; i < 5; i++) {
      const sourceId = bondIndex(chain.bondId, `C${i - 1}-C${i}`);
      const targetId = bondIndex(chain.bondId, `C${i}-C${i + 1}`);

      for (const tail of [1, -1] as const) {
        for (const face of [1, -1] as const) {
          const route = routeArrow(
            {
              source: { kind: 'bond', bondId: sourceId, side: tail },
              destination: { kind: 'bond', bondId: targetId, side: face },
            },
            chain.struct,
            chainMetrics,
            TEST_OPTIONS,
          );
          expect(route).not.toBeNull();
          if (!route) continue;

          expect(faceOf(route.p1, targetId)).toBe(face);

          chain.struct.bonds.forEach((_bond, bondId) => {
            const extent = chainMetrics.bondExtent(bondId);
            if (!extent) return;

            const cuts = route.polyline.some(
              (point, index) =>
                index > 0 &&
                segmentsIntersect(
                  route.polyline[index - 1],
                  point,
                  extent[0],
                  extent[1],
                ),
            );
            expect(cuts).toBe(false);
          });
        }
      }
    }
  });

  /** The join is smooth: both halves share their direction of travel there. */
  it('turns without a corner', () => {
    const route = routeArrow(
      {
        source: {
          kind: 'bond',
          bondId: bondIndex(chain.bondId, 'C2-C3'),
          side: 1,
        },
        destination: {
          kind: 'bond',
          bondId: bondIndex(chain.bondId, 'C3-C4'),
          side: -1,
        },
      },
      chain.struct,
      chainMetrics,
      TEST_OPTIONS,
    )!;

    expect(route.leads?.length).toBeGreaterThan(0);
    const leads = route.leads ?? [];
    if (leads.length === 0) return;

    // Every join must be smooth, whichever turn point it is: the segment
    // arriving at a turn point and the one leaving it share a direction.
    for (let i = 0; i < leads.length; i++) {
      const from = i === 0 ? route.p0 : leads[i - 1].at;
      const arriving = headTangent(
        from,
        leads[i].at,
        leads[i].h1,
        leads[i].h2,
        leads[i].along1,
        leads[i].along2,
      );
      const next = leads[i + 1];
      const leaving = next
        ? tailTangent(leads[i].at, next.at, next.h1, next.along1)
        : tailTangent(leads[i].at, route.p1, route.h1, route.along1);

      const alignment = arriving.x * leaving.x + arriving.y * leaving.y;
      expect(alignment).toBeGreaterThan(0.999);
    }
  });
});

/**
 * An arrow never has a corner in it.
 *
 * A cubic can bring its own velocity to zero and reverse, drawing a sharp V.
 * Nothing else rejects that shape — it crosses nothing, encloses nothing, and
 * is no longer than an ordinary curve — but a curly arrow with a corner is not
 * a curly arrow.
 */
describe('smoothness', () => {
  /** Sharpest direction change along a path, in degrees. */
  function sharpestTurn(points: Vec2[]): number {
    let sharpest = 0;
    for (let i = 2; i < points.length; i++) {
      const a = points[i - 1].sub(points[i - 2]);
      const b = points[i].sub(points[i - 1]);
      if (a.length() < 1e-9 || b.length() < 1e-9) continue;
      const cos = (a.x * b.x + a.y * b.y) / (a.length() * b.length());
      sharpest = Math.max(
        sharpest,
        (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI,
      );
    }
    return sharpest;
  }

  /**
   * Every source, every target, every approach. The branch is load-bearing: a
   * bond hanging square off the chain gives arrows a departure direction at
   * odds with everything else, and that is where the cusps appeared. A plain
   * chain produces none at all, so testing one proves nothing.
   */
  it('bends smoothly everywhere, on every approach', () => {
    const branched = branchedChain();
    const metrics = new AnalyticMechanismMetrics(branched.struct, TEST_OPTIONS);
    let checked = 0;

    branched.bondId.forEach((_name, sourceId) => {
      for (const tail of [1, -1] as const) {
        const source = { kind: 'bond' as const, bondId: sourceId, side: tail };
        const from = metrics.bondExtent(sourceId)![0];

        for (let atomId = 0; atomId < branched.struct.atoms.size; atomId++) {
          const destination = { kind: 'atom' as const, atomId };

          for (const lobe of approachLobes(
            destination,
            source,
            from,
            branched.struct,
            metrics,
          )) {
            const route = routeArrow(
              { source, destination: { ...destination, approach: lobe.angle } },
              branched.struct,
              metrics,
              TEST_OPTIONS,
            );
            if (!route) continue;

            checked++;
            expect(sharpestTurn(route.polyline)).toBeLessThan(60);
          }
        }
      }
    });

    expect(checked).toBeGreaterThan(200);
  });
});

/**
 * The shaft runs into the head's point, not along one of its edges.
 *
 * An arrowhead is a rigid triangle only about 23 degrees wide at its tip. Aimed
 * along the tangent at the very tip, it leans off the direction the shaft
 * actually arrives from — on a curve of radius 0.3 by some 17 degrees — and the
 * last stretch of shaft then grazes an edge instead of entering the point,
 * which reads as a bent or broken arrowhead.
 */
describe('arrowheads', () => {
  const chain = branchedChain();
  const metrics = new AnalyticMechanismMetrics(chain.struct, TEST_OPTIONS);

  it('keeps the last stretch of shaft inside the head', () => {
    let checked = 0;

    chain.bondId.forEach((_name, sourceId) => {
      for (const tail of [1, -1] as const) {
        const source = { kind: 'bond' as const, bondId: sourceId, side: tail };
        const from = metrics.bondExtent(sourceId)![0];

        for (let atomId = 0; atomId < chain.struct.atoms.size; atomId++) {
          const destination = { kind: 'atom' as const, atomId };

          for (const lobe of approachLobes(
            destination,
            source,
            from,
            chain.struct,
            metrics,
          )) {
            const route = routeArrow(
              { source, destination: { ...destination, approach: lobe.angle } },
              chain.struct,
              metrics,
              TEST_OPTIONS,
            );
            if (!route) continue;

            // Read the axis off the head the route actually produced — tip to
            // notch — rather than recomputing it, so this measures the arrow
            // that gets drawn.
            const [tip, , notch] = route.head;
            const axis = tip.sub(notch).normalized();
            const base = tip.addScaled(axis, -MECH_HEAD_LENGTH);

            for (const point of route.polyline) {
              if (Vec2.dist(point, tip) > MECH_HEAD_LENGTH) continue;
              checked++;
              expect(
                pointSegmentDistance(point, base, tip),
              ).toBeLessThanOrEqual(MECH_HEAD_HALF_WIDTH);
            }
          }
        }
      }
    });

    expect(checked).toBeGreaterThan(200);
  });
});
