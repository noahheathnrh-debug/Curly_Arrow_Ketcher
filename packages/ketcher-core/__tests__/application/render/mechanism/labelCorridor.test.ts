import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import {
  buildObstacles,
  obstacleIdsForAtom,
} from 'application/render/mechanism/obstacles';
import {
  pointBoxDistance,
  pointSegmentDistance,
} from 'application/render/mechanism/geometry';
import type {
  MechanismMetrics,
  MechanismStruct,
  Obstacle,
} from 'application/render/mechanism/types';
import {
  branchedChain,
  carbonylAddition,
  phenol,
  propylbenzene,
  protonTransfer,
  TEST_OPTIONS,
} from './structures';

/**
 * There is no gap between a group and the bond it hangs off.
 *
 * A bond is *drawn* pulled back from each atom centre so it does not run into
 * the atom's label. Building the bond's collision capsule from that drawn
 * extent left a notch of unblocked canvas between the end of the label's box
 * and the start of the bond's capsule, and arrows threaded straight down it —
 * visually passing between a terminal group and its own bond while touching
 * nothing the router knew about.
 *
 * The notch is only *reachable* when the atom is the arrow's own endpoint,
 * because that is what exempts its label. With the label standing, its
 * clearance margin covers the notch on its own and the defect is invisible —
 * which is exactly how a first version of this test passed with the fix
 * disabled. So the exemption is part of the fixture, not an aside.
 *
 * Asserted on the obstacle field rather than on any particular route: no route
 * can thread a gap that does not exist.
 */

function clearance(
  p: Vec2,
  obstacles: Obstacle[],
  exempt: ReadonlySet<string>,
): number {
  let best = Infinity;
  for (const o of obstacles) {
    if (exempt.has(o.id)) continue;
    const d =
      o.shape === 'capsule'
        ? pointSegmentDistance(p, o.capsule.a, o.capsule.b) - o.capsule.r
        : pointBoxDistance(p, o.box);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Points in the notch of each bond, at each labelled atom it touches.
 *
 * The notch runs from the atom's centre out to where its bond starts being
 * drawn, and spans the drawn bond's width either side of the axis — that strip
 * is what an arrow was squeezing through. Each sample carries the exemption
 * set the router would use if that atom were the arrow's destination.
 */
function notchSamples(
  struct: MechanismStruct,
  metrics: MechanismMetrics,
): Array<{ id: string; point: Vec2; exempt: ReadonlySet<string> }> {
  const samples: Array<{
    id: string;
    point: Vec2;
    exempt: ReadonlySet<string>;
  }> = [];

  struct.bonds.forEach((bond, bondId) => {
    const drawn = metrics.bondExtent(bondId);
    if (!drawn) return;
    const halfWidth = metrics.bondHalfWidth(bondId);

    for (const [atomId, start] of [
      [bond.begin, drawn[0]],
      [bond.end, drawn[1]],
    ] as const) {
      const centre = struct.atoms.get(atomId)?.pp;
      if (!centre) continue;
      const along = start.sub(centre);
      const length = along.length();
      if (length < 1e-6) continue;

      const exempt = obstacleIdsForAtom(atomId, metrics);
      const dir = along.scaled(1 / length);
      const perp = new Vec2(-dir.y, dir.x);

      for (let t = 0; t <= 1.0001; t += 0.1) {
        for (let s = -1; s <= 1.0001; s += 0.25) {
          samples.push({
            id: `bond:${bondId}@atom:${atomId} t=${t.toFixed(1)} s=${s.toFixed(
              2,
            )}`,
            point: centre
              .addScaled(dir, length * t)
              .addScaled(perp, halfWidth * s),
            exempt,
          });
        }
      }
    }
  });

  return samples;
}

describe.each([
  ['propylbenzene', propylbenzene],
  ['phenol', phenol],
  ['a branched chain', branchedChain],
  ['a carbonyl', carbonylAddition],
  ['a proton transfer', protonTransfer],
])('%s', (_name, build) => {
  const { struct } = build();
  const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
  const obstacles = buildObstacles(struct, metrics);
  const samples = notchSamples(struct, metrics);

  it('has bonds that are drawn pulled back from their atoms', () => {
    // Guards the test itself: a structure whose bonds are never trimmed would
    // pass the assertion below vacuously.
    expect(samples.length).toBeGreaterThan(0);
  });

  it('leaves no unblocked canvas between a label and its own bond', () => {
    const free = samples.filter(
      ({ point, exempt }) => clearance(point, obstacles, exempt) > 0,
    );
    expect(free.map((s) => s.id)).toEqual([]);
  });
});
