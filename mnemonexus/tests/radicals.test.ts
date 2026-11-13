import { describe, expect, test } from 'bun:test';
import { applyArrows, arrowsFromKetcher, describeMoves } from '../src/engine/arrows';
import { sameStructure, speciesOf } from '../src/engine/canonical';
import { defaultHydrogens, structureFromKet } from '../src/engine/ket';
import { buildStructure, components, formulaOf, totalValenceElectrons, type StructureSpec } from '../src/engine/molecule';

/** Radicals and fishhook arrows: one electron per arrow, every bond ending with whole pairs. */

const build = (spec: StructureSpec) => {
  const { structure, issues } = buildStructure(spec);
  if (!structure) throw new Error(issues.map((i) => i.message).join(' '));
  return structure;
};
const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

const bromine = build({ atoms: [{ id: 'Br1', el: 'Br' }, { id: 'Br2', el: 'Br' }], bonds: [{ a: 'Br1', b: 'Br2', order: 1 }] });
const homolysis = [
  { from: 'Br1-Br2', to: 'Br1', single: true },
  { from: 'Br1-Br2', to: 'Br2', single: true },
];

describe('radicals in structures', () => {
  test('a radical must be declared, so a miscounted atom is still caught', () => {
    expect(codes(buildStructure({ atoms: [{ id: 'C1', el: 'C', h: 3 }], bonds: [] }))).toContain('radical-undeclared');
    const methyl = build({ atoms: [{ id: 'C1', el: 'C', h: 3, rad: 1 }], bonds: [] });
    expect(methyl.atoms[0]).toMatchObject({ lp: 0, rad: 1, charge: 0 });
    expect(formulaOf(methyl)).toBe('CH3•');
    // The hydroxyl radical is neutral; a charged one has every electron paired.
    expect(codes(buildStructure({ atoms: [{ id: 'O1', el: 'O', h: 1, charge: -1, rad: 1 }], bonds: [] }))).toContain('radical-count');
    expect(build({ atoms: [{ id: 'O1', el: 'O', h: 1, rad: 1 }], bonds: [] }).atoms[0]).toMatchObject({ lp: 2, rad: 1, charge: 0 });
  });

  test('the unpaired electron counts in the octet: a carbon radical has seven, noted but not refused', () => {
    const r = buildStructure({ atoms: [{ id: 'C1', el: 'C', h: 3, rad: 1 }], bonds: [] });
    expect(r.structure).toBeDefined();
    expect(r.issues[0].message).toContain('7 electrons');
    expect(r.issues[0].message).toContain('radical');
  });

  test('a radical and the same species without it are different answers', () => {
    const methyl = build({ atoms: [{ id: 'C1', el: 'C', h: 3, rad: 1 }], bonds: [] });
    const cation = build({ atoms: [{ id: 'C1', el: 'C', h: 3, charge: 1 }], bonds: [] });
    expect(sameStructure(methyl, cation)).toBe('different');
  });
});

describe('fishhook arrows', () => {
  test('homolysis: two fishhooks split Br-Br into two bromine atoms', () => {
    const r = applyArrows(bromine, homolysis);
    expect(r.issues).toEqual([]);
    expect(components(r.next!)).toHaveLength(2);
    expect(r.next!.atoms.map((a) => [a.lp, a.rad, a.charge])).toEqual([[3, 1, 0], [3, 1, 0]]);
    expect(describeMoves(r.moves, bromine, r.next!).join(' ')).toContain('Br1 now has an unpaired electron');
  });

  test('one fishhook alone would leave a one-electron bond, and is refused', () => {
    expect(codes(applyArrows(bromine, [homolysis[0]]))).toContain('fishhook-half-bond');
  });

  test('a full arrow is heterolysis instead: Br- and Br+, different chemistry', () => {
    const r = applyArrows(bromine, [{ from: 'Br1-Br2', to: 'Br1' }]);
    expect(r.issues.filter((i) => i.code !== 'octet-incomplete')).toEqual([]);
    expect(r.next!.atoms.map((a) => a.charge)).toEqual([-1, 1]);
  });

  test('radical addition: Br adds to ethene and leaves the radical on the other carbon', () => {
    const start = build({
      atoms: [{ id: 'Br1', el: 'Br', rad: 1 }, { id: 'C1', el: 'C', h: 2 }, { id: 'C2', el: 'C', h: 2 }],
      bonds: [{ a: 'C1', b: 'C2', order: 2 }],
    });
    const r = applyArrows(start, [
      { from: 'Br1', to: 'Br1-C1', single: true },
      { from: 'C1-C2', to: 'Br1-C1', single: true },
      { from: 'C1-C2', to: 'C2', single: true },
    ]);
    expect(r.issues).toEqual([]);
    const product = build({
      atoms: [{ id: 'a', el: 'Br' }, { id: 'b', el: 'C', h: 2 }, { id: 'c', el: 'C', h: 2, rad: 1 }],
      bonds: [{ a: 'a', b: 'b', order: 1 }, { a: 'b', b: 'c', order: 1 }],
    });
    expect(sameStructure(r.next!, product)).toBe('same');
    // Bromine and the radical on the same carbon is a different species.
    const wrong = build({
      atoms: [{ id: 'a', el: 'Br' }, { id: 'b', el: 'C', h: 1, rad: 1 }, { id: 'c', el: 'C', h: 3 }],
      bonds: [{ a: 'a', b: 'b', order: 1 }, { a: 'b', b: 'c', order: 1 }],
    });
    expect(sameStructure(r.next!, wrong)).toBe('different');
  });

  test('hydrogen abstraction: Cl takes H from methane, leaving methyl radical and HCl', () => {
    const start = build({
      atoms: [{ id: 'Cl1', el: 'Cl', rad: 1 }, { id: 'H1', el: 'H' }, { id: 'C1', el: 'C', h: 3 }],
      bonds: [{ a: 'H1', b: 'C1', order: 1 }],
    });
    const r = applyArrows(start, [
      { from: 'Cl1', to: 'Cl1-H1', single: true },
      { from: 'C1-H1', to: 'Cl1-H1', single: true },
      { from: 'C1-H1', to: 'C1', single: true },
    ]);
    expect(r.issues).toEqual([]);
    expect(speciesOf(r.next!, 'C1')!.atoms[0]).toMatchObject({ rad: 1, charge: 0, h: 3 });
    expect(speciesOf(r.next!, 'Cl1')!.atoms.map((a) => a.rad)).toEqual([0, 0]);
    expect(totalValenceElectrons(r.next!)).toBe(totalValenceElectrons(start));
  });

  test('termination: two methyl radicals pair up into ethane', () => {
    const start = build({ atoms: [{ id: 'C1', el: 'C', h: 3, rad: 1 }, { id: 'C2', el: 'C', h: 3, rad: 1 }], bonds: [] });
    const r = applyArrows(start, [{ from: 'C1', to: 'C1-C2', single: true }, { from: 'C2', to: 'C1-C2', single: true }]);
    expect(r.issues).toEqual([]);
    expect(r.next!.bonds).toEqual([{ a: 'C1', b: 'C2', order: 1 }]);
    expect(r.next!.atoms.every((a) => a.rad === 0 && a.charge === 0)).toBe(true);
  });

  test('a fishhook needs an unpaired electron, and a full arrow needs a pair', () => {
    const hydroxide = build({ atoms: [{ id: 'O1', el: 'O', h: 1, charge: -1 }, { id: 'C1', el: 'C', h: 3, rad: 1 }], bonds: [] });
    const noRadical = applyArrows(hydroxide, [{ from: 'O1', to: 'C1', single: true }]);
    expect(codes(noRadical)).toContain('fishhook-start-no-radical');
    expect(noRadical.issues[0].message).toContain('a lone pair moves as a pair');
    const noPair = applyArrows(hydroxide, [{ from: 'C1', to: 'O1' }]);
    expect(codes(noPair)).toContain('arrow-start-no-lone-pair');
    expect(noPair.issues[0].message).toContain('fishhook');
  });

  test('a bond gives at most its own electrons', () => {
    const r = applyArrows(bromine, [...homolysis, { from: 'Br1-Br2', to: 'Br1', single: true }]);
    expect(codes(r)).toContain('arrow-start-overused');
  });
});

describe('arrows and radicals from the Ketcher drawing', () => {
  test('a fishhook stays a single-electron arrow; a full arrow from a radical dot is refused', () => {
    const ok = arrowsFromKetcher([
      { kind: 'fishhook', source: { kind: 'bond', bondId: 0 }, destination: { kind: 'atom', atomId: 0 } },
      { kind: 'curly', source: { kind: 'lone-pair', atomId: 1 }, destination: { kind: 'new-bond', atomId1: 1, atomId2: 0 } },
    ], ['Br1', 'Br2'], [['Br1', 'Br2']]);
    expect(ok).toEqual({ arrows: [{ from: 'Br1-Br2', to: 'Br1', single: true }, { from: 'Br2', to: 'Br2-Br1' }] });
    const bad = arrowsFromKetcher([{ kind: 'curly', source: { kind: 'radical', atomId: 0 }, destination: { kind: 'atom', atomId: 1 } }], ['C1', 'Br1'], []);
    expect('issues' in bad && bad.issues[0].code).toBe('arrow-pair-from-radical');
  });

  test('a radical dot in the drawing becomes an unpaired electron with one fewer hydrogen', () => {
    const mol0 = { type: 'molecule', atoms: [{ label: 'C', location: [0, 0, 0], radical: 2 }] };
    const { structure, issues } = structureFromKet({ root: { nodes: [{ $ref: 'mol0' }] }, mol0 });
    expect(issues.filter((i) => i.code !== 'octet-incomplete')).toEqual([]);
    expect(structure!.atoms[0]).toMatchObject({ el: 'C', h: 3, rad: 1, charge: 0 });
    const carbene = { ...mol0, atoms: [{ label: 'C', location: [0, 0, 0], radical: 1 }] };
    expect(codes(structureFromKet({ root: { nodes: [{ $ref: 'mol0' }] }, mol0: carbene }))).toContain('ket-unsupported');
  });
});

describe('hydrogens the editor draws on boron and aluminium', () => {
  test('borohydride and aluminium hydride anions take four', () => {
    expect(defaultHydrogens('B', -1, 0)).toBe(4);
    expect(defaultHydrogens('Al', -1, 0)).toBe(4);
    expect(defaultHydrogens('Al', 0, 1)).toBe(2);
    expect(defaultHydrogens('B', 0, 3)).toBe(0);
  });
});
