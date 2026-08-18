import { fireEvent, render, screen } from '@testing-library/react';
import { MechanismStepBar } from './MechanismStepBar';

describe('MechanismStepBar', () => {
  it('shows the active step, commands, and non-obvious shortcuts', () => {
    const onNext = jest.fn();
    const onArrange = jest.fn();
    const onDuplicate = jest.fn();
    const onAddChemical = jest.fn();
    render(
      <MechanismStepBar
        summary={{
          current: 1,
          total: 2,
          canGoPrevious: false,
          canGoNext: true,
          hasChemistry: true,
        }}
        onPrevious={jest.fn()}
        onNext={onNext}
        onArrange={onArrange}
        onDuplicate={onDuplicate}
        onAddChemical={onAddChemical}
      />,
    );

    expect(screen.getByTestId('mechanism-step-label')).toHaveTextContent(
      'Step 1 of 2',
    );
    expect(screen.getByText('Ctrl+Enter')).toBeInTheDocument();
    expect(screen.queryByText(/Space/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Next mechanism step'));
    fireEvent.click(screen.getByRole('button', { name: 'Arrange' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add molecule' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onArrange).toHaveBeenCalledTimes(1);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onAddChemical).toHaveBeenCalledTimes(1);
  });
});
