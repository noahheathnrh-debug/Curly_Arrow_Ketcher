import type { UiActionAction } from '../action';

export const MECHANISM_CONTROLS_STORAGE_KEY =
  'ketcher.mechanismControls.enabled.v1';

export const MECHANISM_LEFT_TOOL_IDS = new Set([
  'hand',
  'select',
  'erase',
  'bonds',
  'chain',
  'charge',
  'lone-pair',
  'curly-arrow',
  'reaction-plus',
]);

const MECHANISM_ACTIVE_TOOL_NAMES = new Set([
  'hand',
  'select',
  'fragmentSelection',
  'eraser',
  'bond',
  'chain',
  'charge',
  'radical',
  'lonepair',
  'curlyarrow',
  'reactionplus',
  'atom',
]);

function availableStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadMechanismControlsPreference(
  storage: Storage | null = availableStorage(),
): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(MECHANISM_CONTROLS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMechanismControlsPreference(
  enabled: boolean,
  storage: Storage | null = availableStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(MECHANISM_CONTROLS_STORAGE_KEY, String(enabled));
  } catch {
    // The editor remains usable when browser storage is blocked or full.
  }
}

export function isMechanismToolAction(action: UiActionAction | null): boolean {
  return Boolean(
    action &&
      typeof action !== 'function' &&
      action.tool &&
      MECHANISM_ACTIVE_TOOL_NAMES.has(action.tool),
  );
}

export function setMechanismControlsEnabled(enabled: boolean) {
  return (dispatch, getState) => {
    saveMechanismControlsPreference(enabled);
    dispatch({ type: 'SET_MECHANISM_CONTROLS', data: { enabled } });

    const activeTool = getState().actionState?.activeTool ?? null;
    if (enabled && !isMechanismToolAction(activeTool)) {
      dispatch({
        type: 'ACTION',
        action: { tool: 'select', opts: 'rectangle' },
      });
    }
  };
}

export function toggleMechanismControls() {
  return (dispatch, getState) => {
    dispatch(
      setMechanismControlsEnabled(!getState().toolbar.mechanismControlsEnabled),
    );
  };
}
