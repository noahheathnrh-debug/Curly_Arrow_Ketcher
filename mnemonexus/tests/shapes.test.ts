import { describe, expect, test } from 'bun:test';
import { buildGeometry } from '../src/engine/geometry3d';
import { buildStructure } from '../src/engine/molecule';
import { SHAPE_EXAMPLES } from '../src/molecules/shapes';

/** Every example in the Shapes tab builds, and its centre comes out as the textbook says. */
const EXPECTED: Record<string, string> = {
  becl2: 'linear', co2: 'linear', bf3: 'trigonal planar', so2: 'bent', ch4: 'tetrahedral', nh3: 'trigonal pyramidal',
  nh4: 'tetrahedral', h2o: 'bent', h3o: 'trigonal pyramidal', pcl5: 'trigonal bipyramidal', sf4: 'seesaw',
  clf3: 'T-shaped', xef2: 'linear', sf6: 'octahedral', brf5: 'square pyramidal', xef4: 'square planar',
};

describe('the Shapes examples', () => {
  test('every example has an expected shape', () => {
    expect(SHAPE_EXAMPLES.map((e) => e.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });
  for (const example of SHAPE_EXAMPLES) test(`${example.formula} is ${EXPECTED[example.id]}`, () => {
    const { structure, issues } = buildStructure(example.spec, 'structure', { expandedOctets: true });
    expect(issues.map((i) => i.message)).toEqual([]);
    const centre = buildGeometry(structure!).centres.find((c) => c.atom === 'X')!;
    expect(centre.shape).toBe(EXPECTED[example.id]);
  });
});
