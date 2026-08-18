import { screen, fireEvent, render as rtlRender } from '@testing-library/react';
import { LeftToolbarContainer } from '../views/toolbars';
import { Provider } from 'react-redux';
import createStore from '../state';
import { initKeydownListener } from './hotkeys';
import { act } from 'react';
import { setMechanismControlsEnabled } from './mechanismControls';

jest.mock('react-intersection-observer', () => {
  return {
    observe: jest.fn(),
    disconnect: jest.fn(),
    useInView: jest.fn().mockReturnValue([]),
  };
});

describe('Hot keys', () => {
  beforeEach(() => localStorage.clear());

  it('should select last chosen selected tool when user press ESC', async () => {
    renderWithMockStore(<LeftToolbarContainer />);
    const text = screen.getByTestId('text');
    // eslint-disable-next-line testing-library/no-unnecessary-act
    act(() => {
      fireEvent.click(text);
      fireEvent.keyDown(text, {
        code: 'Escape',
      });
    });
    const className = screen.getByTestId('select-rectangle').className;
    expect(className).toContain('selected');
  });

  it('Shift+Tab to switch selection tool', async () => {
    renderWithMockStore(<LeftToolbarContainer />);
    // eslint-disable-next-line testing-library/no-unnecessary-act
    act(() => {
      fireEvent.keyDown(document, {
        code: 'Tab',
        shiftKey: true,
      });
    });
    expect(screen.getByTestId('select-lasso').className).toContain('selected');
  });

  it('pans with Space alone without interrupting the active tool or drag', () => {
    const { store, editor, getViewBox } = renderWithMockStore(
      <LeftToolbarContainer />,
    );
    const text = screen.getByTestId('text');

    fireEvent.click(text);
    expect(store.getState().actionState.activeTool).toEqual({ tool: 'text' });

    fireEvent.keyDown(document, { code: 'Space', key: ' ' });
    expect(store.getState().actionState.activeTool).toEqual({ tool: 'text' });

    fireEvent.mouseMove(document, { clientX: 140, clientY: 80, buttons: 0 });
    expect(getViewBox()).toMatchObject({ minX: -20, minY: 10 });

    fireEvent.mouseDown(document, { button: 0 });
    fireEvent.mouseMove(document, { clientX: 160, clientY: 100, buttons: 1 });
    expect(getViewBox()).toMatchObject({ minX: -30, minY: 0 });
    expect(store.getState().actionState.activeTool).toEqual({ tool: 'text' });

    fireEvent.keyUp(document, { code: 'Space', key: ' ' });
    expect(store.getState().actionState.activeTool).toEqual({ tool: 'text' });
    expect(editor.render.update).toHaveBeenCalledWith(false);
  });

  it('shows only the curated mechanism tools when focused controls are on', () => {
    const { store } = renderWithMockStore(<LeftToolbarContainer />);
    expect(screen.getByTestId('arrows-drop-down-button')).toBeInTheDocument();

    act(() => {
      store.dispatch(setMechanismControlsEnabled(true) as never);
    });

    expect(screen.getByTestId('curly-arrow')).toBeInTheDocument();
    expect(screen.getByTestId('reaction-plus')).toBeInTheDocument();
    expect(
      screen.queryByTestId('arrows-drop-down-button'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('text')).not.toBeInTheDocument();
  });
});

function renderWithMockStore(component) {
  const store = createStore({}, {}, () => null);
  let viewBox = { minX: 0, minY: 0, width: 800, height: 600 };
  const setViewBox = jest.fn((update) => {
    viewBox = typeof update === 'function' ? update(viewBox) : update;
  });
  const editor = {
    tool: jest.fn().mockReturnValue(true),
    historySize: () => {
      return { undo: [] };
    },
    selection: jest.fn(),
    struct: () => {
      return { atoms: { keys: () => new Set() } };
    },
    render: {
      ctab: {},
      options: { viewOnlyMode: false, zoom: 2 },
      setViewBox,
      update: jest.fn(),
    },
    event: { cursor: { dispatch: jest.fn() } },
    lastEvent: new MouseEvent('mousemove', {
      clientX: 100,
      clientY: 100,
    }),
    zoom: jest.fn(),
    _tool: { mode: '' },
    rotateController: { isRotating: false },
  };
  store.dispatch(initKeydownListener(document));
  store.dispatch({
    type: 'INIT',
    editor,
  });
  return {
    ...rtlRender(<Provider store={store}>{component}</Provider>),
    store,
    editor,
    getViewBox: () => viewBox,
  };
}
