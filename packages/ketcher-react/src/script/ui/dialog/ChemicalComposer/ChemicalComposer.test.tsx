import { act, fireEvent, render, screen } from '@testing-library/react';
import { AUTO_SEARCH_DELAY_MS, ChemicalComposer } from './ChemicalComposer';

const dispatch = jest.fn();
const fetchMock = jest.fn();
const storeState = {
  templates: { lib: [] },
  functionalGroups: { lib: [] },
  saltsAndSolvents: { lib: [] },
  editor: { render: { options: {} } },
};

jest.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector(storeState),
}));

jest.mock('components', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Icon: () => null,
  MemoizedStructRender: () => null,
}));

describe('ChemicalComposer live search', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
    } as Response);
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fetchMock.mockReset();
    jest.useRealTimers();
  });

  it('searches the latest text automatically after a short typing pause', async () => {
    render(
      <ChemicalComposer
        className="test-composer"
        onCancel={jest.fn()}
        onOk={jest.fn()}
      />,
    );
    const input = screen.getByTestId('chemical-search-input');

    fireEvent.change(input, { target: { value: 'e' } });
    act(() => jest.advanceTimersByTime(AUTO_SEARCH_DELAY_MS / 2));
    fireEvent.change(input, { target: { value: 'et' } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('chemical-search-button'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('chemical-search-status')).toHaveTextContent(
      'Searching',
    );

    await act(async () => {
      jest.advanceTimersByTime(AUTO_SEARCH_DELAY_MS);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/name/et/'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByTestId('chemical-search-status')).toHaveTextContent(
      'Updated',
    );
  });
});
