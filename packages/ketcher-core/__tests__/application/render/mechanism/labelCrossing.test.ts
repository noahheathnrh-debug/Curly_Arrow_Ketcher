import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { buildObstacles } from 'application/render/mechanism/obstacles';
import { routeArrow } from 'application/render/mechanism/route';
import { pointBoxDistance } from 'application/render/mechanism/geometry';
import { EXEMPTION_REACH } from 'application/render/mechanism/constants';
import type {
  ElectronDestination,
  ElectronSource,
} from 'application/render/mechanism/types';
import { phenol, phenolAndEthylbenzene, TEST_OPTIONS } from './structures';

/**
 * An arrow may not be drawn through a group's text.
 *
 * Stated as a ban, not a preference: running between the `H` and the `O` of a
 * hydroxyl, or straight through the `H`, reads as the arrow pointing at
 * something it is not pointing at.
 *
 * It used to happen constantly, and the cause was not the scoring. An arrow
 * anchored to a lone pair has that pair's own atom label exempted — the pair is
 * drawn beside the text, so an arrow leaving it necessarily touches the label
 * and without the exemption no route exists. But the exemption applied to the
 * *obstacle* for the whole curve rather than to the *place* it was needed, so
 * once an arrow was attached to an oxygen it could cross that oxygen's label
 * anywhere along its journey and still be scored as touching nothing.
 *
 * The endpoints are excluded here for the same reason they are exempted in the
 * router: an arrow that starts inside its own label is not the defect. What is
 * checked is the rest of the journey.
 */

const OUTSIDE = EXEMPTION_REACH;

function labelIncursions(
  fixture: ReturnType<typeof phenol>,
  source: ElectronSource,
  destination: ElectronDestination,
): string[] {
  const { struct } = fixture;
  const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
  const obstacles = buildObstacles(struct, metrics);
  const route = routeArrow(
    { source, destination },
    struct,
    metrics,
    TEST_OPTIONS,
    obstacles,
  );
  if (!route) return [];

  const hits: string[] = [];
  struct.atoms.forEach((_atom, atomId) => {
    const box = metrics.labelBox(atomId);
    if (!box) return;

    for (const point of route.polyline) {
      if (pointBoxDistance(point, box) > 0) continue;
      // Inside the text. Only a defect if it happened away from the arrow's own
      // ends, where reaching into a label is the whole intent.
      if (
        Vec2.dist(point, route.p0) <= OUTSIDE ||
        Vec2.dist(point, route.p1) <= OUTSIDE
      ) {
        continue;
      }
      const id = `label:${atomId}`;
      if (!hits.includes(id)) hits.push(id);
    }
  });

  return hits;
}

describe('an arrow never crosses a label in mid-flight', () => {
  it('holds for every route out of a hydroxyl on phenol', () => {
    const fixture = phenol();
    const { atomId, bondId } = fixture;
    const offenders: string[] = [];

    for (let pairIdx = 0; pairIdx < 2; pairIdx++) {
      const source: ElectronSource = {
        kind: 'lone-pair',
        atomId: atomId.O,
        pairIdx,
      };
      const targets: Array<[string, ElectronDestination]> = [];
      Object.entries(atomId).forEach(([name, id]) => {
        if (id === atomId.O) return;
        targets.push([`atom ${name}`, { kind: 'atom', atomId: id }]);
      });
      bondId.forEach((name, id) =>
        targets.push([`bond ${name}`, { kind: 'bond', bondId: id }]),
      );

      for (const [name, destination] of targets) {
        const hits = labelIncursions(fixture, source, destination);
        if (hits.length) {
          offenders.push(`lp${pairIdx} -> ${name}: ${hits.join(',')}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('holds across a gap, where the arrow has room to wander', () => {
    const fixture = phenolAndEthylbenzene();
    const { atomId } = fixture;
    const offenders: string[] = [];

    for (let pairIdx = 0; pairIdx < 2; pairIdx++) {
      for (const target of ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'A', 'B']) {
        const hits = labelIncursions(
          fixture,
          { kind: 'lone-pair', atomId: atomId.O, pairIdx },
          { kind: 'atom', atomId: atomId[target] },
        );
        if (hits.length) {
          offenders.push(`lp${pairIdx} -> ${target}: ${hits.join(',')}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
