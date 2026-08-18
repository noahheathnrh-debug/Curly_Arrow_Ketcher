import {
  Action,
  fromPaste,
  fromMultipleMove,
  Pile,
  type Struct,
  type Editor,
  type EditorSelection,
  KetcherLogger,
  Vec2,
} from 'ketcher-core';
import { load, parseStruct } from './shared';
import { setAnalyzingFile } from './request';
import {
  planHorizontalPlacement,
  applyParticipantMetadata,
  applyParticipantProperties,
  calculateUniformGap,
  highestMechanismStep,
  highestSlotForStep,
  readParticipantMetadata,
  type ChemicalPlacementInput,
  type PlacementDensity,
} from '../services/chemicalComposer';

export type ChemicalStructureInput = string | Struct;

function prepareForInsertion(
  structure: Struct,
  metadata?: Parameters<typeof applyParticipantMetadata>[1],
): Struct {
  const prepared = structure.clone();
  prepared.rescale();
  prepared.findConnectedComponents();
  prepared.setImplicitHydrogen();
  prepared.setStereoLabelsToAtoms();
  prepared.markFragments();
  prepared.applyMonomersTransformations();
  if (metadata) applyParticipantMetadata(prepared, metadata);
  return prepared;
}

function requireMolecularStructure(structure: Struct): Struct {
  if (!structure.atoms.size) {
    throw new Error(
      'The selected result did not resolve to a molecular structure.',
    );
  }
  return structure;
}

export function placeChemicalManually(structure: ChemicalStructureInput) {
  const insertionStructure =
    typeof structure === 'string' ? structure : structure.clone();

  return load(insertionStructure, {
    fragment: true,
    requireAtoms: true,
    skipCenter: true,
  });
}

/** Places a complete tray as one history entry using one shared row gap. */
export function placeChemicalsAutomatically(
  participants: ChemicalPlacementInput[],
  density: PlacementDensity,
) {
  return async (dispatch, getState) => {
    if (!participants.length) return;

    const state = getState();
    const editor = state.editor as Editor;
    const serverSettings = state.options.getServerSettings();
    dispatch(setAnalyzingFile(true));

    try {
      const parsedStructures = await Promise.all(
        participants.map((participant) =>
          parseStruct(participant.structure, state.server, serverSettings),
        ),
      );
      const canvas = editor.struct();
      const step = highestMechanismStep(canvas) || 1;
      const firstSlot = highestSlotForStep(canvas, step) + 1;
      const preparedStructures = parsedStructures.map((structure, index) =>
        prepareForInsertion(requireMolecularStructure(structure), {
          step,
          slot: firstSlot + index,
          role: participants[index].role,
          name: participants[index].name,
        }),
      );
      const plan = planHorizontalPlacement(canvas, preparedStructures, density);
      const combinedAction = new Action();

      preparedStructures.forEach((structure, index) => {
        const [pasteAction] = fromPaste(
          editor.render.ctab,
          structure,
          plan.positions[index],
          0,
          false,
          true,
        );
        combinedAction.mergeWith(pasteAction);
      });

      editor.update(combinedAction);
      editor.centerViewportAccordingToStruct(editor.struct());
      dispatch({ type: 'MODAL_CLOSE' });
    } catch (error: unknown) {
      KetcherLogger.error('chemicalComposer::placeAutomatically', error);
      const message =
        error instanceof Error
          ? error.message
          : 'The selected chemical could not be added.';
      editor.errorHandler?.(message);
    } finally {
      dispatch(setAnalyzingFile(false));
    }
  };
}

interface ParticipantComponent {
  atoms: number[];
  bonds: number[];
  structure: Struct;
  bounds: ReturnType<Struct['getCoordBoundingBox']>;
}

function selectionForAtoms(
  structure: Struct,
  atoms: number[],
): EditorSelection {
  const atomSet = new Set(atoms);
  const bonds: number[] = [];
  structure.bonds.forEach((bond, id) => {
    if (atomSet.has(bond.begin) && atomSet.has(bond.end)) bonds.push(id);
  });
  return { atoms, bonds };
}

function selectedParticipantComponents(editor: Editor): ParticipantComponent[] {
  const structure = editor.struct();
  const selectedAtoms = new Set(editor.explicitSelected().atoms ?? []);
  if (!selectedAtoms.size) return [];

  const groups = new Map<string, Set<number>>();
  structure.findConnectedComponents(true).forEach((component, index) => {
    const [firstAtomId] = component;
    const fragmentId = structure.atoms.get(firstAtomId)?.fragment;
    const metadata =
      fragmentId === undefined
        ? null
        : readParticipantMetadata(structure.frags.get(fragmentId)?.properties);
    const key = metadata
      ? `slot:${metadata.step}:${metadata.slot}`
      : `component:${index}`;
    const group = groups.get(key) ?? new Set<number>();
    component.forEach((atomId) => group.add(atomId));
    groups.set(key, group);
  });

  return Array.from(groups.values())
    .filter((atoms) => Array.from(atoms).some((id) => selectedAtoms.has(id)))
    .map((atoms) => {
      const atomIds = Array.from(atoms);
      const selection = selectionForAtoms(structure, atomIds);
      return {
        atoms: atomIds,
        bonds: selection.bonds ?? [],
        structure: editor.structSelected(selection),
        bounds: structure.getCoordBoundingBox(new Pile(atomIds)),
      };
    })
    .sort((left, right) => left.bounds.min.x - right.bounds.min.x);
}

function reportParticipantActionError(editor: Editor, message: string): void {
  editor.errorHandler?.(message);
}

/** Aligns selected participants into one deterministic row and one undo step. */
export function arrangeSelectedParticipants(density: PlacementDensity) {
  return (_dispatch, getState) => {
    const editor = getState().editor as Editor;
    const components = selectedParticipantComponents(editor);
    if (components.length < 2) {
      reportParticipantActionError(
        editor,
        'Select at least two separate molecular participants to arrange.',
      );
      return;
    }

    const gap = calculateUniformGap(
      editor.struct(),
      components.map((component) => component.structure),
      density,
    );
    const anchorCenterY =
      (components[0].bounds.min.y + components[0].bounds.max.y) / 2;
    let nextX = components[0].bounds.min.x;
    const combinedAction = new Action();

    components.forEach((component) => {
      const width = component.bounds.max.x - component.bounds.min.x;
      const centerY = (component.bounds.min.y + component.bounds.max.y) / 2;
      const offset = new Vec2(
        nextX - component.bounds.min.x,
        anchorCenterY - centerY,
      );
      const action = fromMultipleMove(
        editor.render.ctab,
        { atoms: component.atoms, bonds: component.bonds },
        offset,
      );
      combinedAction.mergeWith(action);
      nextX += width + gap;
    });

    editor.update(combinedAction);
    editor.centerViewportAccordingToStruct(editor.struct());
  };
}

/** Copies selected participants into the next metadata-backed mechanism step. */
export function duplicateSelectedAsNextStep(density: PlacementDensity) {
  return (dispatch, getState) => {
    const editor = getState().editor as Editor;
    const components = selectedParticipantComponents(editor);
    if (!components.length) {
      reportParticipantActionError(
        editor,
        'Select one or more molecular participants to duplicate.',
      );
      return;
    }

    const structure = editor.struct();
    const atoms = components.flatMap((component) => component.atoms);
    const selection = selectionForAtoms(structure, atoms);
    const copy = editor.structSelected(selection);
    const currentStep = Math.max(
      highestMechanismStep(copy),
      highestMechanismStep(structure),
      1,
    );
    let fallbackSlot = 0;
    copy.frags.forEach((fragment) => {
      if (!fragment) return;
      const metadata = readParticipantMetadata(fragment.properties);
      fallbackSlot += 1;
      fragment.properties = applyParticipantProperties(fragment.properties, {
        step: currentStep + 1,
        slot: metadata?.slot ?? fallbackSlot,
        role: metadata?.role ?? 'intermediate',
        name: metadata?.name,
      });
    });

    const bounds = copy.getCoordBoundingBox();
    const height = bounds.max.y - bounds.min.y;
    const gap = calculateUniformGap(structure, [copy], density);
    const target = new Vec2(bounds.min.x, bounds.min.y - height - gap * 1.5);
    const [action] = fromPaste(
      editor.render.ctab,
      copy,
      target,
      0,
      false,
      true,
    );
    editor.update(action);
    editor.centerViewportAccordingToStruct(editor.struct());
    dispatch({ type: 'MODAL_CLOSE' });
  };
}
