import { Atom, SGroup, Struct, Vec2, type SdfItem } from 'ketcher-core';
import { searchLocalChemicals } from './localSearch';

function item(name: string, group: string): SdfItem {
  const struct = new Struct();
  struct.name = name;
  struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
  return {
    struct,
    props: { name, abbreviation: name, group },
  } as SdfItem;
}

describe('local chemical search', () => {
  it('searches templates, functional groups, and salts/solvents together', () => {
    const results = searchLocalChemicals('acid', {
      templates: [item('benzoic acid', 'User Templates')],
      functionalGroups: [item('carboxylic acid', 'Functional Groups')],
      saltsAndSolvents: [item('acetic acid', 'Salts and Solvents')],
    });

    expect(results.map(({ name, source }) => [name, source])).toEqual([
      ['benzoic acid', 'template'],
      ['carboxylic acid', 'functional-group'],
      ['acetic acid', 'salt-or-solvent'],
    ]);
  });

  it('removes a contracted abbreviation wrapper but keeps its molecule', () => {
    const isopropanol = item('isopropanol', 'Salts and Solvents');
    const secondAtomId = isopropanol.struct.atoms.add(
      new Atom({ label: 'O', pp: new Vec2(1, 0) }),
    );
    const superatom = new SGroup(SGroup.TYPES.SUP);
    superatom.data.name = '2-propanol';
    const superatomId = isopropanol.struct.sgroups.add(superatom);
    superatom.id = superatomId;
    isopropanol.struct.atomAddToSGroup(superatomId, 0);
    isopropanol.struct.atomAddToSGroup(superatomId, secondAtomId);

    const [result] = searchLocalChemicals('isopropanol', {
      templates: [],
      functionalGroups: [],
      saltsAndSolvents: [isopropanol],
    });

    expect(typeof result.structure).not.toBe('string');
    if (typeof result.structure === 'string') return;
    expect(result.structure.atoms.size).toBe(2);
    expect(result.structure.sgroups.size).toBe(0);
    expect(isopropanol.struct.sgroups.size).toBe(1);
  });
});
