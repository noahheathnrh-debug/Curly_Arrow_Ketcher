import { KetSerializer } from 'ketcher-core';
import type {
  PlacementDensity,
  SavedMechanismSet,
  TrayChemical,
} from './types';

const STORAGE_KEY = 'ketcher.chemicalComposer.savedSets.v1';

function availableStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const PARTICIPANT_ROLES = new Set([
  'reactant',
  'reagent',
  'intermediate',
  'product',
]);

const PLACEMENT_DENSITIES = new Set(['compact', 'standard', 'comfortable']);

function isSavedSet(value: unknown): value is SavedMechanismSet {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SavedMechanismSet>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'string' &&
    PLACEMENT_DENSITIES.has(candidate.density ?? '') &&
    Array.isArray(candidate.participants) &&
    candidate.participants.every(
      (participant) =>
        typeof participant?.structure === 'string' &&
        typeof participant?.name === 'string' &&
        PARTICIPANT_ROLES.has(participant?.role ?? ''),
    )
  );
}

export function loadSavedMechanismSets(
  storage: Storage | null = availableStorage(),
): SavedMechanismSet[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter(isSavedSet) : [];
  } catch {
    return [];
  }
}

export function saveMechanismSet(
  name: string,
  tray: TrayChemical[],
  density: PlacementDensity,
  storage: Storage | null = availableStorage(),
): SavedMechanismSet[] {
  if (!storage) throw new Error('Local storage is unavailable.');
  const serializer = new KetSerializer();
  const set: SavedMechanismSet = {
    id: `mechanism-set-${Date.now()}`,
    name: name.trim(),
    density,
    createdAt: new Date().toISOString(),
    participants: tray.map(
      ({ trayId: _trayId, structure, ...participant }) => ({
        ...participant,
        structure:
          typeof structure === 'string'
            ? structure
            : serializer.serialize(structure),
      }),
    ),
  };
  const next = [set, ...loadSavedMechanismSets(storage)];
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteMechanismSet(
  id: string,
  storage: Storage | null = availableStorage(),
): SavedMechanismSet[] {
  if (!storage) return [];
  const next = loadSavedMechanismSets(storage).filter((set) => set.id !== id);
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
