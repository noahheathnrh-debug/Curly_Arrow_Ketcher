import { describe, expect, it } from 'bun:test';
import { doubleBonds, moleculeFromKet, stereocentres, type StereoMolecule } from '../src/isomers/cip';
import { relate } from '../src/isomers/relation';
import { PAIRS, STEREO_ITEMS } from '../src/isomers/species';
import { isomerKet, LAYOUTS } from '../src/isomers/layouts';
import { buildLayouts } from '../tools/isomers/layout';
import { indigoLabels } from '../tools/isomers/indigoNode';

const molecule = (smiles: string): StereoMolecule => moleculeFromKet(isomerKet(smiles));

describe('isomers', () => {
  it('has a layout for every molecule, as Indigo lays it out now', async () => {
    expect(LAYOUTS).toEqual(await buildLayouts());
  }, 60_000);

  it("labels every stereocentre and C=C as Indigo does, and finds no others", async () => {
    for (const item of STEREO_ITEMS) {
      const m = molecule(item.smiles);
      const indigo = await indigoLabels(isomerKet(item.smiles));
      const ours = Object.fromEntries(stereocentres(m).map((c) => [c.atom, c.label]));
      const theirs = Object.fromEntries(Object.entries(indigo.atoms).map(([i, l]) => [Number(i), l.replace(/[()]/g, '')]));
      expect({ id: item.id, centres: ours }).toEqual({ id: item.id, centres: theirs });
      const bondIndex = (a: number, b: number) => m.bonds.findIndex((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
      const ourBonds = Object.fromEntries(doubleBonds(m).filter((d) => d.label).map((d) => [bondIndex(d.a, d.b), d.label]));
      const theirBonds = Object.fromEntries(Object.entries(indigo.bonds).map(([i, l]) => [Number(i), l.replace(/[()]/g, '')]));
      expect({ id: item.id, bonds: ourBonds }).toEqual({ id: item.id, bonds: theirBonds });
    }
  }, 60_000);

  it('asks something about every molecule', () => {
    for (const item of STEREO_ITEMS) {
      const m = molecule(item.smiles);
      const targets = item.kind === 'rs' ? stereocentres(m).length : doubleBonds(m).length;
      expect({ id: item.id, targets: targets > 0 }).toEqual({ id: item.id, targets: true });
      if (item.level === 3) expect({ id: item.id, many: targets > 1 }).toEqual({ id: item.id, many: true });
    }
  });

  it('names the groups and says why they rank as they do', () => {
    const [centre] = stereocentres(molecule('C[C@H](O)CC'));
    expect(centre.groups.map((g) => g.name)).toEqual(['OH', 'CH2CH3', 'CH3', 'H']);
    expect(centre.reasons[0]).toContain('atomic number');
    expect(centre.reasons[1]).toContain('(C, H, H) against (H, H, H)');
    const [vinyl] = stereocentres(molecule('C=C[C@H](C)CC'));
    expect(vinyl.groups.map((g) => g.name)).toEqual(['CH(=CH2)', 'CH2CH3', 'CH3', 'H']);
    const [ez] = doubleBonds(molecule('CC/C(C)=C/C'));
    expect(ez.reasons.some((r) => r.includes('CH2CH3 beats CH3'))).toBe(true);
    expect(doubleBonds(molecule('CC=C(C)C'))[0].label).toBeNull();
  });

  it('works out how each pair is related, as it was written to show', () => {
    for (const p of PAIRS) expect({ id: p.id, relation: relate(molecule(p.a), molecule(p.b)).relation }).toEqual({ id: p.id, relation: p.meant });
  });
});
