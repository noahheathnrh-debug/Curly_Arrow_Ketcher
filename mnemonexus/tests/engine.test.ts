import { describe, expect, test } from 'bun:test';
import { applyArrows } from '../src/engine/arrows';
import { sameStructure, speciesOf } from '../src/engine/canonical';
import { buildStructure, components, totalCharge, totalValenceElectrons, type StructureSpec } from '../src/engine/molecule';

/** The one chemistry engine: every arrow is checked for legality before it is compared with an answer. */

const build = (spec: StructureSpec) => {
  const { structure, issues } = buildStructure(spec);
  if (!structure) throw new Error(issues.map((i) => i.message).join(' '));
  return structure;
};

// Hydroxide and bromomethane, side by side.
const sn2Start = build({
  atoms: [{ id: 'O1', el: 'O', h: 1, charge: -1 }, { id: 'C1', el: 'C', h: 3 }, { id: 'Br1', el: 'Br' }],
  bonds: [{ a: 'C1', b: 'Br1', order: 1 }],
});

describe('engine: legal arrows', () => {
  test('SN2: the hydroxide lone pair forms O-C while C-Br breaks to bromide', () => {
    const { next, issues } = applyArrows(sn2Start, [{ from: 'O1', to: 'C1' }, { from: 'C1-Br1', to: 'Br1' }]);
    expect(issues).toEqual([]);
    const product = build({
      atoms: [{ id: 'a', el: 'C', h: 3 }, { id: 'b', el: 'O', h: 1 }, { id: 'c', el: 'Br', charge: -1 }],
      bonds: [{ a: 'a', b: 'b', order: 1 }],
    });
    expect(sameStructure(next!, product)).toBe('same');
    expect(components(next!)).toHaveLength(2);
    expect(speciesOf(next!, 'Br1')?.atoms.map((a) => a.charge)).toEqual([-1]);
  });

  test('electrons and charge are conserved by every legal step', () => {
    const { next } = applyArrows(sn2Start, [{ from: 'O1', to: 'C1' }, { from: 'C1-Br1', to: 'Br1' }]);
    expect(totalCharge(next!)).toBe(totalCharge(sn2Start));
    expect(totalValenceElectrons(next!)).toBe(totalValenceElectrons(sn2Start));
  });
});

describe('engine: illegal arrows are refused with the rule they break', () => {
  test('an arrow cannot start on an atom with no lone pair', () => {
    expect(applyArrows(sn2Start, [{ from: 'C1', to: 'O1' }]).issues.map((i) => i.code)).toContain('arrow-start-no-lone-pair');
  });
  test('attacking carbon without breaking C-Br gives carbon ten electrons', () => {
    expect(applyArrows(sn2Start, [{ from: 'O1', to: 'C1' }]).issues.map((i) => i.code)).toContain('octet-exceeded');
  });
  test('a bond that is not there cannot be broken', () => {
    expect(applyArrows(sn2Start, [{ from: 'O1-C1', to: 'O1' }]).issues.map((i) => i.code)).toContain('arrow-start-no-bond');
  });
});
