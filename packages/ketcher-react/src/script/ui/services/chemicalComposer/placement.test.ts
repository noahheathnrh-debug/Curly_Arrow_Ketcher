import { Atom, Struct, Vec2 } from 'ketcher-core';
import { calculateUniformGap, planHorizontalPlacement } from './placement';

function structureFromBounds(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Struct {
  const struct = new Struct();
  struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(minX, minY) }));
  struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(maxX, maxY) }));
  return struct;
}

describe('chemical composer horizontal placement', () => {
  it('starts an empty canvas at the stable origin', () => {
    const canvas = new Struct();
    const first = structureFromBounds(-2, -1, 2, 1);

    const plan = planHorizontalPlacement(canvas, [first], 'standard');

    expect(plan.positions[0].x).toBe(0);
    expect(plan.positions[0].y).toBe(0);
  });

  it('places the next structure after the occupied right edge', () => {
    const canvas = structureFromBounds(-2, -1, 3, 2);
    const next = structureFromBounds(-1, -1, 1, 1);

    const plan = planHorizontalPlacement(canvas, [next], 'standard');

    expect(plan.positions[0].x).toBeCloseTo(3 + plan.gap);
    expect(plan.positions[0].y).toBe(-1);
  });

  it('uses one equal edge-to-edge gap for differently sized molecules', () => {
    const canvas = new Struct();
    const large = structureFromBounds(-3, -2, 5, 2);
    const small = structureFromBounds(-1, -1, 1, 1);

    const plan = planHorizontalPlacement(canvas, [large, small], 'standard');
    const largeWidth = 8;

    expect(
      plan.positions[1].x - (plan.positions[0].x + largeWidth),
    ).toBeCloseTo(plan.gap);
  });

  it('lets the largest molecule add bounded comfortable breathing room', () => {
    const canvas = new Struct();
    const large = structureFromBounds(0, 0, 20, 12);

    const standard = calculateUniformGap(canvas, [large], 'standard');
    const comfortable = calculateUniformGap(canvas, [large], 'comfortable');

    expect(comfortable).toBeGreaterThan(standard);
    expect(comfortable).toBeLessThanOrEqual(1.5 * 4);
  });
});
