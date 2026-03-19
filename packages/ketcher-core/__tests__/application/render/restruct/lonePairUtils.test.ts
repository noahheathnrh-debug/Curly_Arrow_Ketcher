import {
  calcNonBondingLayout,
  getLonePairModelPositions,
  getRadicalModelPositions,
} from 'application/render/restruct/lonePairUtils';
import { Vec2 } from 'domain/entities';

describe('calcNonBondingLayout', () => {
  it('gives radicals left/right priority and leaves lone pairs on vertical slots', () => {
    const atom = {
      label: 'O',
      charge: 0,
      valence: 1,
      radical: 2,
      implicitH: 0,
      pp: new Vec2(0, 0),
      isQuery: () => false,
      badConn: false,
    };
    const neighbor = {
      label: 'C',
      charge: 0,
      valence: 0,
      radical: 0,
      implicitH: 0,
      pp: new Vec2(1, 0),
      isQuery: () => false,
      badConn: false,
    };
    const struct = {
      atoms: new Map([
        [0, atom],
        [1, neighbor],
      ]),
      bonds: new Map([[0, { begin: 0, end: 1 }]]),
    };

    const layout = calcNonBondingLayout(atom, struct, 0, false);

    expect(layout).not.toBeNull();
    if (!layout) return;

    // Gaps: one bond at 0 rad with width 0.2. Gap is [0.2, 2PI-0.2] = 5.88 rad size.
    // 3 items to allocate. Each spacing = 5.88 / (3+1) = 1.47.
    // Slots: 0.2 + 1.47 = 1.67, 0.2 + 2*1.47 = 3.14 (PI), 0.2 + 3*1.47 = 4.61.
    // hydrogenOnTheLeft=false means baseAngle=0.
    // Distances from 0: 1.67, 3.14, (6.28-4.61)=1.67.
    // Sorting by distance from 0: 1.67, 1.67, 3.14.
    // radicalCount=1. First item should be at 1.67.
    expect(layout.radicalAngles[0]).toBeCloseTo(1.67, 0.1);
  });

  it('prefers the hydrogen side for isolated radicals when hydrogen is on the right', () => {
    const atom = {
      label: 'O',
      charge: 0,
      valence: 0,
      radical: 2,
      implicitH: 0,
      pp: new Vec2(0, 0),
      isQuery: () => false,
      badConn: false,
    };
    const struct = {
      atoms: new Map([[0, atom]]),
      bonds: new Map(),
    };

    const layout = calcNonBondingLayout(atom, struct, 0, false);

    if (!layout) return;
    // O has 6 valence electrons, 0 bonds -> 3 lone pairs. 1 radical. Total 4 slots.
    // 2PI gap / (4+1) = 1.256 rad step.
    // Near 0 (hydrogenOnTheLeft=false) means items at 1.25, 2.51, 3.77, 5.02.
    // Distances from 0: 1.25, 2.51, (6.28-3.77)=2.51, (6.28-5.02)=1.25.
    // Sorted: 1.25, 1.25, 2.51, 2.51.
    // Radical is first. Expect 1.25.
    let angle = layout.radicalAngles[0];
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    expect(Math.abs(angle)).toBeCloseTo(1.256, 1);
  });

  it('prefers the hydrogen side for isolated radicals when hydrogen is on the left', () => {
    const atom = {
      label: 'O',
      charge: 0,
      valence: 0,
      radical: 2,
      implicitH: 0,
      pp: new Vec2(0, 0),
      isQuery: () => false,
      badConn: false,
    };
    const struct = {
      atoms: new Map([[0, atom]]),
      bonds: new Map(),
    };

    const layout = calcNonBondingLayout(atom, struct, 0, true);

    if (!layout) return;
    // Left preference (PI). Items at 1.25, 2.51, 3.77, 5.02.
    // Distances from PI: |1.25-3.14|=1.89, |2.51-3.14|=0.63, |3.77-3.14|=0.63, |5.02-3.14|=1.88.
    // Closest to PI is 2.51. Wait, 3.14 - 1.256 = 1.88. 3.14 - 2.51 = 0.63.
    // Next one is 3.14 + 0.63 = 3.77.
    // So closest is 2.51.
    let angle = layout.radicalAngles[0];
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    expect(Math.abs(angle)).toBeCloseTo(2.51, 1);
  });

  it('still produces radical slots for atoms without lone-pair element data', () => {
    const atom = {
      label: 'R',
      charge: 0,
      valence: 0,
      radical: 2,
      implicitH: 0,
      pp: new Vec2(0, 0),
      isQuery: () => false,
      badConn: false,
    };
    const struct = {
      atoms: new Map([[0, atom]]),
      bonds: new Map(),
    };

    const layout = calcNonBondingLayout(atom, struct, 0, false);

    if (!layout) return;
    expect(layout.radicalAngles.length).toBe(1);
    expect(layout.lonePairAngles).toEqual([]);
  });
});

describe('getLonePairModelPositions', () => {
  it('omits slots occupied by radicals from lone-pair attachment positions', () => {
    const atom = {
      label: 'O',
      charge: 0,
      valence: 1,
      radical: 2,
      implicitH: 0,
      pp: new Vec2(0, 0),
      isQuery: () => false,
      badConn: false,
    };
    const neighbor = {
      label: 'C',
      charge: 0,
      valence: 0,
      radical: 0,
      implicitH: 0,
      pp: new Vec2(1, 0),
      isQuery: () => false,
      badConn: false,
    };
    const struct = {
      atoms: new Map([
        [0, atom],
        [1, neighbor],
      ]),
      bonds: new Map([[0, { begin: 0, end: 1 }]]),
    };
    const options = {
      lineWidth: 1,
      lonePairSize: 4,
      lonePairDistance: 3,
      fontszInPx: 12,
      microModeScale: 40,
    };

    const positions = getLonePairModelPositions(
      atom,
      struct,
      0,
      options,
      false,
    );

    expect(positions).toHaveLength(2);
  });
});

describe('getRadicalModelPositions', () => {
  it('places the radical on its own slot center instead of half of a lone pair', () => {
    const atom = {
      label: 'O',
      charge: 0,
      valence: 1,
      radical: 2,
      implicitH: 0,
      pp: new Vec2(0, 0),
      isQuery: () => false,
      badConn: false,
    };
    const neighbor = {
      label: 'C',
      charge: 0,
      valence: 0,
      radical: 0,
      implicitH: 0,
      pp: new Vec2(1, 0),
      isQuery: () => false,
      badConn: false,
    };
    const struct = {
      atoms: new Map([
        [0, atom],
        [1, neighbor],
      ]),
      bonds: new Map([[0, { begin: 0, end: 1 }]]),
    };
    const options = {
      lineWidth: 1,
      lonePairSize: 4,
      lonePairDistance: 3,
      fontszInPx: 12,
      microModeScale: 40,
    };

    const positions = getRadicalModelPositions(atom, struct, 0, options, false);

    expect(positions).toHaveLength(1);
    expect(positions[0].x).toBeLessThan(0);
  });
});
