import { Atom, Struct, Vec2, type Editor } from 'ketcher-core';
import { applyParticipantProperties } from '../services/chemicalComposer';
import {
  getMechanismStepSummary,
  mechanismStepNumbers,
  navigateMechanismStep,
  selectMechanismStep,
} from './mechanismSteps';

function twoStepStructure(): Struct {
  const structure = new Struct();
  structure.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
  structure.atoms.add(new Atom({ label: 'O', pp: new Vec2(4, 0) }));
  structure.markFragments();
  const firstFragment = structure.frags.get(0);
  const secondFragment = structure.frags.get(1);
  if (!firstFragment || !secondFragment) {
    throw new Error('Expected one fragment for each test atom.');
  }
  firstFragment.properties = applyParticipantProperties(undefined, {
    step: 1,
    slot: 1,
    role: 'reactant',
  });
  secondFragment.properties = applyParticipantProperties(undefined, {
    step: 2,
    slot: 1,
    role: 'intermediate',
  });
  return structure;
}

function mockEditor(structure: Struct, selectedAtoms: number[]): Editor {
  return {
    struct: () => structure,
    explicitSelected: () => ({ atoms: selectedAtoms }),
    selection: jest.fn(),
  } as unknown as Editor;
}

describe('mechanism step workflow', () => {
  it('discovers metadata-backed steps and reports the selected one', () => {
    const structure = twoStepStructure();
    const editor = mockEditor(structure, [0]);

    expect(mechanismStepNumbers(structure)).toEqual([1, 2]);
    expect(getMechanismStepSummary(editor)).toEqual({
      current: 1,
      total: 2,
      canGoPrevious: false,
      canGoNext: true,
      hasChemistry: true,
    });
  });

  it('selects all chemistry belonging to the requested step', () => {
    const editor = mockEditor(twoStepStructure(), [0]);

    expect(selectMechanismStep(editor, 2)).toBe(true);
    expect(editor.selection).toHaveBeenCalledWith({ atoms: [1], bonds: [] });
  });

  it('navigates to the adjacent existing step', () => {
    const editor = mockEditor(twoStepStructure(), [0]);
    const thunk = navigateMechanismStep(1);

    thunk(jest.fn(), () => ({ editor }));
    expect(editor.selection).toHaveBeenCalledWith({ atoms: [1], bonds: [] });
  });
});
