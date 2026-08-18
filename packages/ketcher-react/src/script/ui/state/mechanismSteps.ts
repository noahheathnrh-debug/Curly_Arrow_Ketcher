import type { Editor, EditorSelection, Struct } from 'ketcher-core';
import {
  readParticipantMetadata,
  type PlacementDensity,
} from '../services/chemicalComposer';
import {
  arrangeSelectedParticipants,
  duplicateSelectedAsNextStep,
} from './chemicalComposer';

export interface MechanismStepSummary {
  current: number;
  total: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  hasChemistry: boolean;
}

function stepForAtom(structure: Struct, atomId: number): number {
  const fragmentId = structure.atoms.get(atomId)?.fragment;
  if (fragmentId === undefined) return 1;
  return (
    readParticipantMetadata(structure.frags.get(fragmentId)?.properties)
      ?.step ?? 1
  );
}

export function mechanismStepNumbers(structure: Struct): number[] {
  const steps = new Set<number>();
  structure.atoms.forEach((_atom, atomId) =>
    steps.add(stepForAtom(structure, atomId)),
  );
  return Array.from(steps).sort((left, right) => left - right);
}

function selectedStep(editor: Editor, steps: number[]): number {
  const selectedAtoms = editor.explicitSelected().atoms ?? [];
  if (selectedAtoms.length) {
    return stepForAtom(editor.struct(), selectedAtoms[0]);
  }
  return steps[steps.length - 1] ?? 1;
}

export function getMechanismStepSummary(
  editor: Editor | null | undefined,
): MechanismStepSummary {
  if (!editor) {
    return {
      current: 1,
      total: 1,
      canGoPrevious: false,
      canGoNext: false,
      hasChemistry: false,
    };
  }

  const steps = mechanismStepNumbers(editor.struct());
  const current = selectedStep(editor, steps);
  const currentIndex = steps.indexOf(current);
  return {
    current,
    total: Math.max(steps[steps.length - 1] ?? 1, 1),
    canGoPrevious: currentIndex > 0,
    canGoNext: currentIndex >= 0 && currentIndex < steps.length - 1,
    hasChemistry: steps.length > 0,
  };
}

function selectionForStep(structure: Struct, step: number): EditorSelection {
  const atoms: number[] = [];
  structure.atoms.forEach((_atom, atomId) => {
    if (stepForAtom(structure, atomId) === step) atoms.push(atomId);
  });
  const atomSet = new Set(atoms);
  const bonds: number[] = [];
  structure.bonds.forEach((bond, bondId) => {
    if (atomSet.has(bond.begin) && atomSet.has(bond.end)) bonds.push(bondId);
  });
  return { atoms, bonds };
}

export function selectMechanismStep(editor: Editor, step: number): boolean {
  const selection = selectionForStep(editor.struct(), step);
  if (!selection.atoms?.length) return false;
  editor.selection(selection);
  return true;
}

export function navigateMechanismStep(offset: -1 | 1) {
  return (_dispatch, getState) => {
    const editor = getState().editor as Editor;
    const steps = mechanismStepNumbers(editor.struct());
    const current = selectedStep(editor, steps);
    const currentIndex = steps.indexOf(current);
    const target = steps[currentIndex + offset];
    if (target !== undefined) selectMechanismStep(editor, target);
  };
}

export function arrangeActiveMechanismStep(
  density: PlacementDensity = 'standard',
) {
  return (dispatch, getState) => {
    const editor = getState().editor as Editor;
    const summary = getMechanismStepSummary(editor);
    if (!selectMechanismStep(editor, summary.current)) return;
    dispatch(arrangeSelectedParticipants(density));
  };
}

export function duplicateActiveMechanismStep(
  density: PlacementDensity = 'standard',
) {
  return (dispatch, getState) => {
    const editor = getState().editor as Editor;
    const summary = getMechanismStepSummary(editor);
    if (!selectMechanismStep(editor, summary.current)) return;
    dispatch(duplicateSelectedAsNextStep(density));
    const steps = mechanismStepNumbers(editor.struct());
    const latestStep = steps[steps.length - 1];
    if (latestStep !== undefined) selectMechanismStep(editor, latestStep);
  };
}
