import { fireEvent, render, screen } from '@testing-library/react';
import { ExternalFuncControls } from './ExternalFuncControls';

jest.mock('./TopToolbarIconButton', () => ({
  TopToolbarIconButton: ({
    testId,
    onClick,
    isActive,
  }: {
    testId: string;
    onClick: () => void;
    isActive?: boolean;
  }) => (
    <button data-testid={testId} data-active={isActive} onClick={onClick} />
  ),
}));

describe('ExternalFuncControls', () => {
  const defaultProps = {
    isCollapsed: false,
    onLayout: jest.fn(),
    onClean: jest.fn(),
    onAromatize: jest.fn(),
    onDearomatize: jest.fn(),
    onCalculate: jest.fn(),
    onCheck: jest.fn(),
    onAnalyse: jest.fn(),
    onMiew: jest.fn(),
    onToggleExplicitHydrogens: jest.fn(),
    onToggleLonePairs: jest.fn(),
    showLonePairs: true,
    disabledButtons: [],
    hiddenButtons: [],
    indigoVerification: false,
    shortcuts: {},
  };

  afterEach(() => jest.clearAllMocks());

  it('keeps only hydrogen and lone-pair controls in the focused set', () => {
    render(
      <ExternalFuncControls
        {...defaultProps}
        visibleButtons={['explicit-hydrogens', 'lone-pairs']}
      />,
    );

    const hydrogens = screen.getByTestId(
      'Add/Remove explicit hydrogens button',
    );
    const lonePairs = screen.getByTestId('Show Lone Pairs button');
    expect(screen.queryByTestId('Clean Up button')).not.toBeInTheDocument();
    expect(lonePairs).toHaveAttribute('data-active', 'true');

    fireEvent.click(hydrogens);
    fireEvent.click(lonePairs);
    expect(defaultProps.onToggleExplicitHydrogens).toHaveBeenCalledTimes(1);
    expect(defaultProps.onToggleLonePairs).toHaveBeenCalledTimes(1);
  });
});
