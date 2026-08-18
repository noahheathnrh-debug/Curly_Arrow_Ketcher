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

    // Lewis structures put non-bonding electrons squarely on the sides of the
    // atom symbol. With the single bond occupying east, the three remaining
    // electrons take north, south and west — and none of them drifts to an
    // in-between angle, which is what made hydroxyls look skewed.
    const all = [...layout.radicalAngles, ...layout.lonePairAngles];
    expect(all).toHaveLength(3);

    const cardinals = all.map((angle) => Math.round((angle * 2) / Math.PI));
    expect(cardinals.slice().sort()).toEqual([-1, 1, 2]); // N, S, W

    for (const angle of all) {
      expect(Math.abs(angle % (Math.PI / 2))).toBeLessThan(1e-6);
    }
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
    // Nothing is bonded, so all four sides are free and the radical takes the
    // one nearest the hydrogen — east, since the hydrogen is on the right.
    let angle = layout.radicalAngles[0];
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    expect(Math.abs(angle)).toBeCloseTo(0, 6);
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
    // Mirror of the previous case: hydrogen on the left puts the radical west.
    let angle = layout.radicalAngles[0];
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    expect(Math.abs(angle)).toBeCloseTo(Math.PI, 6);
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
    // The bond runs east, so the radical must not sit on top of it. Asserting
    // the direction rather than a specific side: any of the three free sides is
    // correct, and pinning one would just re-encode the layout algorithm.
    expect(positions[0].x).toBeLessThan(positions[0].length() * 0.5);
  });
});
