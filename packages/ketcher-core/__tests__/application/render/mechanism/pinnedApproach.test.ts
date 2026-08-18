import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { buildObstacles } from 'application/render/mechanism/obstacles';
import { routeArrow } from 'application/render/mechanism/route';
import { curvatureProfile } from 'application/render/mechanism/geometry';
import { phenolAndBenzylBromide, TEST_OPTIONS } from './structures';
import type { ElectronSource } from 'application/render/mechanism/types';

/**
 * Arrows whose arrival direction the user pinned.
 *
 * Dropping on an approach lobe fixes which way the head comes in, and that is a
 * far harder routing problem than letting the router choose: when the pinned
 * direction faces away from the incoming electrons, the arrow has to travel
 * across and then curl around the target to enter from the far side.
 *
 * This file exists because every other test in this directory routes to
 * *unpinned* destinations, where the router picks the best-aligned sector and
 * the result was always fine. Months of reported bad shapes were invisible to
 * the suite for that reason, and a long series of fixes measured against
 * unpinned cases all came back as null results — they were being tested on
 * arrows that were never broken.
 *
 * Measured as:
 *
 * - **spread** — furthest stray from the chord midpoint, over the chord. Floors
 *   at 0.5 because the endpoints are themselves that far out, so the useful
 *   range starts there.
 * - **straight run** — the share of the length bending far less than the curve's
 *   own average, which is what distinguishes a real S made of two C shapes from
 *   a long diagonal with a corner crammed at each end.
 */

const { struct, atomId } = phenolAndBenzylBromide();
const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
const obstacles = buildObstacles(struct, metrics);

/**
 * One approach the current construction cannot serve well, pinned at its
 * measured values so it cannot quietly get worse.
 *
 * It was briefly fixed, by a three-segment curve at 0.67 of its chord, and the
 * fix was given up deliberately. Those curves were built with each segment
 * handled from its own chord, which left the two sides of a turn point meeting
 * at very different curvature — the arrows visibly flattened on one side of a
 * join and tightened on the other, which is what was reported as looking
 * squared-off. Matching the handles across joins fixes that everywhere and
 * happens to remove the particular shape that served this lobe.
 *
 * Smoothness everywhere beat one lobe, so this is the trade. Its straight-run
 * figure was then relaxed again when single-cubic S curves were forbidden: the
 * curve serving this lobe was one, and what replaces it runs straighter. Both
 * trades went the same way deliberately — the S was the shape being reported,
 * and one awkward lobe is a smaller price than leaving it constructible.
 *
 * Its straight-run figure was re-baselined once more when `curvatureProfile`
 * gained an absolute flatness requirement — a stretch now has to be genuinely
 * flat, not merely flatter than its own curve's average — which changes what
 * the number means rather than what the arrow does.
 *
 * Shrinking this map is the next piece of work, and nothing joins it without the
 * same evidence.
 */
const KNOWN_UNREACHABLE: Record<string, { spread: number; straight: number }> =
  {
    'lp1 @225deg': { spread: 1.2, straight: 0.7 },
  };

/** Ceilings that the well-formed arrows in this grid clear comfortably. */
const MAX_SPREAD = 0.8;
const MAX_STRAIGHT_RUN = 0.45;

interface Shape {
  label: string;
  spread: number;
  straight: number;
}

function grid(): Shape[] {
  const out: Shape[] = [];

  for (const pairIdx of [0, 1]) {
    const source: ElectronSource = {
      kind: 'lone-pair',
      atomId: atomId.O,
      pairIdx,
    };

    for (let deg = 0; deg < 360; deg += 45) {
      const route = routeArrow(
        {
          source,
          destination: {
            kind: 'atom',
            atomId: atomId.CH2,
            approach: (deg * Math.PI) / 180,
          },
        },
        struct,
        metrics,
        TEST_OPTIONS,
        obstacles,
      );
      if (!route) continue;

      const chord = Vec2.dist(route.p0, route.p1);
      if (chord < 1e-6) continue;

      const midpoint = Vec2.centre(route.p0, route.p1);
      let spread = 0;
      for (const point of route.polyline) {
        spread = Math.max(spread, Vec2.dist(point, midpoint));
      }

      out.push({
        label: `lp${pairIdx} @${deg}deg`,
        spread: spread / chord,
        straight: curvatureProfile(route.polyline).straightFraction,
      });
    }
  }

  return out;
}

describe('an arrow with a pinned arrival', () => {
  const shapes = grid();

  it('covers every drop lobe', () => {
    expect(shapes).toHaveLength(16);
  });

  it('is compact and evenly bent, or a documented limitation', () => {
    const offenders = shapes
      .filter((shape) => !KNOWN_UNREACHABLE[shape.label])
      .filter(
        (shape) =>
          shape.spread > MAX_SPREAD || shape.straight > MAX_STRAIGHT_RUN,
      )
      .map(
        (shape) =>
          `${shape.label}: spread ${shape.spread.toFixed(2)} straight ${(
            shape.straight * 100
          ).toFixed(0)}%`,
      );

    expect(offenders).toEqual([]);
  });

  it('does not let the known limitation get worse', () => {
    for (const [label, limit] of Object.entries(KNOWN_UNREACHABLE)) {
      const shape = shapes.find((s) => s.label === label);
      expect(shape).toBeDefined();
      expect(shape!.spread).toBeLessThanOrEqual(limit.spread);
      expect(shape!.straight).toBeLessThanOrEqual(limit.straight);
    }
  });
});
