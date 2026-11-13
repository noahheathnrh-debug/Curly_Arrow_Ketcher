import { describe, expect, it } from 'bun:test';
import { allForms, bestForms, checkLewis, type LewisForm } from '../src/lewis/check';
import { LEWIS_SPECIES, type LewisSpecies } from '../src/lewis/species';
import type { EditorStructLike } from '../src/engine/drawn';

/** The editor's view of a skeleton drawn with these bond orders and charges (hydrogens left for the checker to count). */
function drawn(species: LewisSpecies, orders?: number[], charges?: number[]): EditorStructLike {
  const { atoms, bonds } = species.skeleton;
  const index = new Map(atoms.map((a, i) => [a.id, i]));
  return {
    atoms: atoms.map((a, i) => [i, { label: a.el, charge: charges?.[i] ?? 0 }] as const),
    bonds: bonds.map((b, i) => [i, { begin: index.get(b.a)!, end: index.get(b.b)!, type: orders?.[i] ?? 1 }] as const),
  };
}
const of = (id: string) => LEWIS_SPECIES.find((s) => s.id === id)!;
const check = (species: LewisSpecies, form?: Partial<LewisForm>) => checkLewis(drawn(species, form?.orders, form?.charges), species, bestForms(species));

describe('Draw & check (Lewis structures)', () => {
  it('finds the textbook number of resonance forms for every species', () => {
    const forms: Record<string, number> = {
      co2: 1, hcn: 1, n2: 1, o2: 1, ethene: 1, ethyne: 1, methanal: 1, ammonium: 1, oxonium: 1, hydroxide: 1, hypochlorite: 1, bf3: 1,
      co: 1, cyanide: 1, nitrite: 2, nitrate: 3, carbonate: 3, ozone: 2, methanoate: 2, ethanoate: 2, nitronium: 1, nitromethane: 2,
      diazomethane: 2, 'nitric-acid': 2, ethanenitrile: 1, 'ethanoic-acid': 1,
    };
    expect(LEWIS_SPECIES.map((s) => s.id).sort()).toEqual(Object.keys(forms).sort());
    for (const species of LEWIS_SPECIES) expect([species.id, bestForms(species).length]).toEqual([species.id, forms[species.id]]);
  });

  it('puts the charges where the textbooks do', () => {
    const charged = (id: string) => bestForms(of(id)).map((f) => of(id).skeleton.atoms.map((a, i) => (f.charges[i] ? `${a.id}${f.charges[i] > 0 ? '+' : '-'}` : '')).filter(Boolean).join(' '));
    expect(charged('co')).toEqual(['C- O+']);
    expect(charged('cyanide')).toEqual(['C-']);
    expect(charged('hypochlorite')).toEqual(['O-']);
    expect(charged('bf3')).toEqual(['']);
    expect(charged('ethanoic-acid')).toEqual(['']);
    expect(bestForms(of('nitrate')).every((f) => f.score === 3)).toBe(true);
  });

  it('accepts every best form', () => {
    for (const species of LEWIS_SPECIES) for (const form of bestForms(species)) expect([species.id, check(species, form).verdict]).toEqual([species.id, 'right']);
  });

  it('calls an octet-complete form with extra charges close, not right', () => {
    for (const species of LEWIS_SPECIES) {
      const fewest = bestForms(species)[0].score;
      for (const form of allForms(species).filter((f) => f.score > fewest)) expect([species.id, check(species, form).verdict]).toEqual([species.id, 'close']);
    }
    expect(allForms(of('co2')).length).toBeGreaterThan(1);
  });

  it('refuses the bare skeleton except where it is already the answer', () => {
    for (const species of LEWIS_SPECIES) expect([species.id, check(species).verdict]).toEqual([species.id, species.id === 'bf3' ? 'right' : 'wrong']);
  });

  it('explains what is missing', () => {
    const hydroxide = check(of('hydroxide'));
    expect(hydroxide.verdict).toBe('wrong');
    if (hydroxide.verdict === 'wrong') expect(hydroxide.notes.join(' ')).toContain('a hydrogen the editor added');
    // As the editor reads it: a neutral nitrogen with four bonds gets an implicit hydrogen ("NH"), which is not the problem.
    const ammoniumStruct = drawn(of('ammonium'));
    const ammonium = checkLewis({ atoms: [...ammoniumStruct.atoms].map(([i, a]) => [i, i === 0 ? { ...a, implicitH: 1 } : a] as const), bonds: ammoniumStruct.bonds }, of('ammonium'), bestForms(of('ammonium')));
    if (ammonium.verdict === 'wrong') expect(ammonium.notes.join(' ')).toContain('with a + charge it makes 4');
    else throw new Error('neutral ammonium should be wrong');
    expect(ammonium.notes.join(' ')).not.toContain('the editor added');
    const carbonate = check(of('carbonate'), { orders: [2, 1, 1], charges: [0, 0, -1, 0] });
    if (carbonate.verdict === 'wrong') expect(carbonate.notes.join(' ')).toContain('add up to −1');
    else throw new Error('carbonate with one charge should be wrong');
  });

  it('notices a skeleton joined differently', () => {
    // Nitromethane with one oxygen moved from nitrogen to carbon.
    const species = of('nitromethane');
    const struct = drawn(species);
    const rejoined: EditorStructLike = { atoms: struct.atoms, bonds: [...struct.bonds].map(([i, bond]) => [i, i === 5 ? { begin: 0, end: 6, type: 1 } : bond] as const) };
    expect(checkLewis(rejoined, species, bestForms(species)).message).toContain('joined differently');
  });
});
