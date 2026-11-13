import { describe, expect, test } from 'bun:test';
import { vseprShape, type Centre } from '../src/engine/geometry3d';
import { shapeOptions, shapeQuestions } from '../src/molecules/ShapesActivity';
import { rngOf } from '../src/practice/generate';

const centre = (bonded: number, lonePairs: number): Centre =>
  ({ atom: 'X', domains: bonded + lonePairs, lonePairs, angles: [], ...vseprShape(bonded, lonePairs) });
const KINDS: [number, number][] = [[2, 0], [3, 0], [2, 1], [4, 0], [3, 1], [2, 2], [5, 0], [4, 1], [3, 2], [2, 3], [6, 0], [5, 1], [4, 2]];

describe('shapes quiz', () => {
  test('every arrangement gets four different choices, one of them right', () => {
    for (const [bonded, lp] of KINDS) for (let seed = 1; seed <= 30; seed++) {
      const c = centre(bonded, lp);
      const options = shapeOptions(c, rngOf(seed));
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options.filter((o) => o === c.shape)).toHaveLength(1);
    }
  });
  test('the wrong choices always include the shapes with the same number of bonded atoms', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(shapeOptions(centre(3, 1), rngOf(seed))).toContain('trigonal planar');
      expect(shapeOptions(centre(2, 2), rngOf(seed))).toContain('linear');
    }
  });
  test('a quiz builds its molecules and never asks about one twice', () => {
    const qs = shapeQuestions(5, rngOf(7));
    expect(new Set(qs.map((q) => q.example.id)).size).toBe(5);
    for (const q of qs) expect(q.options).toContain(q.centre.shape!);
  });
});
