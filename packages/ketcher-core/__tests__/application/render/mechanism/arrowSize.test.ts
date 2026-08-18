import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { buildObstacles } from 'application/render/mechanism/obstacles';
import { routeArrow } from 'application/render/mechanism/route';
import { bondIndex, phenolAndEthylbenzene, TEST_OPTIONS } from './structures';
import type {
  ElectronDestination,
  ElectronSource,
} from 'application/render/mechanism/types';
/**
 * The largest an arrow may get here, as a fraction of its own chord.
 *
 * Deliberately its own number rather than {@link ESCALATION_SPREAD}, which this
 * was originally tied to. That constant is a *search trigger* — how oversized a
 * curve must be before it is worth paying for the expensive stages — and tying
 * an assertion to it quietly claims that escalating always succeeds. It does
 * not: two arrows here escalate, exhaust the whole search and still come back at
 * 0.73, because nothing better exists in the construction space. Tightening the
 * trigger then broke the test for a reason that had nothing to do with the
 * arrows getting worse.
 */
const MAX_SPREAD_RATIO = 0.8;

/**
 * An arrow takes up no more room than it needs.
 *
 * The complaint this encodes is that arrows were "massive for no reason" — and
 * the reason mattered for the tool's purpose, which is drawing mechanisms in
 * tight layouts where one sprawling arrow ruins the diagram.
 *
 * Measured as how far the curve strays from the midpoint of its own chord,
 * relative to that chord. Path length does not capture it: a tall thin loop and
 * a compact curve can travel the same distance while occupying quite different
 * amounts of canvas, and it is the canvas that reads as "too big". Note the
 * floor of 0.5 — the endpoints are themselves half a chord from the midpoint —
 * so the interesting range starts there and well-shaped arrows measure 0.50-0.65.
 *
 * The cause was never the scoring. The search stopped as soon as it found a
 * curve that avoided the structure, and a curve that avoids everything by
 * ballooning across the page satisfies that perfectly well — so the two-segment
 * construction that could have drawn the same arrow tidily was never tried.
 * Fixing it meant making "did we find something?" mean "clean *and* a sensible
 * size", which is `ESCALATION_SPREAD` in the router.
 */

const { struct, atomId, bondId } = phenolAndEthylbenzene();
const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
const obstacles = buildObstacles(struct, metrics);

function spreadRatio(
  source: ElectronSource,
  destination: ElectronDestination,
): { ratio: number; fallback: boolean } | null {
  const route = routeArrow(
    { source, destination },
    struct,
    metrics,
    TEST_OPTIONS,
    obstacles,
  );
  if (!route) return null;

  const chord = Vec2.dist(route.p0, route.p1);
  if (chord < 1e-6) return null;

  const midpoint = Vec2.centre(route.p0, route.p1);
  let spread = 0;
  for (const point of route.polyline) {
    spread = Math.max(spread, Vec2.dist(point, midpoint));
  }
  return { ratio: spread / chord, fallback: route.fallback };
}

describe('arrows across a gap between two molecules', () => {
  const lonePairs: ElectronSource[] = [
    { kind: 'lone-pair', atomId: atomId.O, pairIdx: 0 },
    { kind: 'lone-pair', atomId: atomId.O, pairIdx: 1 },
  ];

  it('are no larger than they need to be', () => {
    const oversized: string[] = [];

    for (const [index, source] of lonePairs.entries()) {
      const targets: Array<[string, ElectronDestination]> = [
        ...['E0', 'E2', 'E3', 'E4', 'E5', 'A'].map(
          (name) =>
            [`atom ${name}`, { kind: 'atom', atomId: atomId[name] }] as [
              string,
              ElectronDestination,
            ],
        ),
        ...['E1-E2', 'E2-E3', 'E0-E1', 'E2-A'].map(
          (name) =>
            [
              `bond ${name}`,
              { kind: 'bond', bondId: bondIndex(bondId, name) },
            ] as [string, ElectronDestination],
        ),
      ];

      for (const [name, destination] of targets) {
        const measured = spreadRatio(source, destination);
        // A fallback is a different defect — nothing collision-free existed at
        // all — and is excluded here so this test keeps measuring one thing.
        if (!measured || measured.fallback) continue;
        if (measured.ratio > MAX_SPREAD_RATIO) {
          oversized.push(`lp${index} -> ${name}: ${measured.ratio.toFixed(2)}`);
        }
      }
    }

    expect(oversized).toEqual([]);
  });

  it('reaches the far ring with a two-segment curve rather than a sprawl', () => {
    // The specific case from the 2026-08-12 review: as a single cubic this is a
    // wide S at 1.01, and as a two-segment curve it is 0.66 with the head and
    // tail both dead on their cones.
    const measured = spreadRatio(lonePairs[1], {
      kind: 'bond',
      bondId: bondIndex(bondId, 'E1-E2'),
    });

    expect(measured).not.toBeNull();
    expect(measured!.fallback).toBe(false);
    expect(measured!.ratio).toBeLessThan(0.8);
  });
});
