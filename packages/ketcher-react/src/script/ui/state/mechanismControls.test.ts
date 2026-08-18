import {
  isMechanismToolAction,
  loadMechanismControlsPreference,
  MECHANISM_CONTROLS_STORAGE_KEY,
  saveMechanismControlsPreference,
  setMechanismControlsEnabled,
} from './mechanismControls';

describe('mechanism-focused controls', () => {
  beforeEach(() => localStorage.clear());

  it('persists the focused-controls preference', () => {
    saveMechanismControlsPreference(true, localStorage);

    expect(localStorage.getItem(MECHANISM_CONTROLS_STORAGE_KEY)).toBe('true');
    expect(loadMechanismControlsPreference(localStorage)).toBe(true);
  });

  it('distinguishes mechanism tools from reaction arrows', () => {
    expect(isMechanismToolAction({ tool: 'curlyarrow' })).toBe(true);
    expect(isMechanismToolAction({ tool: 'bond', opts: 1 })).toBe(true);
    expect(isMechanismToolAction({ tool: 'reactionarrow' })).toBe(false);
    expect(isMechanismToolAction({ tool: 'text' })).toBe(false);
  });

  it('returns to selection when a hidden tool was active', () => {
    const dispatch = jest.fn();
    const thunk = setMechanismControlsEnabled(true);

    thunk(dispatch, () => ({
      actionState: { activeTool: { tool: 'reactionarrow' } },
    }));

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: 'SET_MECHANISM_CONTROLS',
      data: { enabled: true },
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: 'ACTION',
      action: { tool: 'select', opts: 'rectangle' },
    });
  });
});
