import { Atom, Struct, Vec2 } from 'ketcher-core';
import {
  deleteMechanismSet,
  loadSavedMechanismSets,
  saveMechanismSet,
} from './savedSets';
import type { TrayChemical } from './types';

function trayChemical(structure: TrayChemical['structure']): TrayChemical {
  return {
    id: 'ethanol',
    trayId: 'tray-1',
    name: 'Ethanol',
    source: 'pubchem',
    representation: 'molecule',
    role: 'reactant',
    structure,
  };
}

describe('reusable mechanism sets', () => {
  beforeEach(() => localStorage.clear());

  it('saves and reloads ordered participants and density', () => {
    const saved = saveMechanismSet(
      'Reduction conditions',
      [trayChemical('CCO')],
      'comfortable',
      localStorage,
    );

    expect(saved[0]).toEqual(
      expect.objectContaining({
        name: 'Reduction conditions',
        density: 'comfortable',
      }),
    );
    expect(loadSavedMechanismSets(localStorage)[0].participants[0]).toEqual(
      expect.objectContaining({ structure: 'CCO', role: 'reactant' }),
    );
  });

  it('serializes local structures to KET and deletes sets', () => {
    const structure = new Struct();
    structure.atoms.add(new Atom({ label: 'O', pp: new Vec2(0, 0) }));
    structure.markFragments();
    const [saved] = saveMechanismSet(
      'Water-like',
      [trayChemical(structure)],
      'standard',
      localStorage,
    );

    expect(saved.participants[0].structure).toContain('root');
    expect(deleteMechanismSet(saved.id, localStorage)).toEqual([]);
  });

  it('ignores malformed or obsolete saved sets', () => {
    localStorage.setItem(
      'ketcher.chemicalComposer.savedSets.v1',
      JSON.stringify([
        {
          id: 'invalid',
          name: 'Invalid role',
          density: 'standard',
          createdAt: new Date().toISOString(),
          participants: [
            { structure: 'CCO', name: 'Ethanol', role: 'spectator' },
          ],
        },
      ]),
    );

    expect(loadSavedMechanismSets(localStorage)).toEqual([]);
  });
});
