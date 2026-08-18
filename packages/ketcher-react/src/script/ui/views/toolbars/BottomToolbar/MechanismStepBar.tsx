import type { MechanismStepSummary } from '../../../state/mechanismSteps';
import classes from './BottomToolbar.module.less';

interface MechanismStepBarProps {
  summary: MechanismStepSummary;
  onPrevious: () => void;
  onNext: () => void;
  onArrange: () => void;
  onDuplicate: () => void;
  onAddChemical: () => void;
}

export const MechanismStepBar = ({
  summary,
  onPrevious,
  onNext,
  onArrange,
  onDuplicate,
  onAddChemical,
}: MechanismStepBarProps) => (
  <div className={classes.mechanismBar} data-testid="mechanism-step-bar">
    <div className={classes.stepControls}>
      <button
        type="button"
        className={classes.stepArrow}
        title="Previous mechanism step (Alt+Up)"
        aria-label="Previous mechanism step"
        disabled={!summary.canGoPrevious}
        onClick={onPrevious}
      >
        ‹
      </button>
      <span className={classes.stepLabel} data-testid="mechanism-step-label">
        Step {summary.current} of {summary.total}
      </span>
      <button
        type="button"
        className={classes.stepArrow}
        title="Next mechanism step (Alt+Down)"
        aria-label="Next mechanism step"
        disabled={!summary.canGoNext}
        onClick={onNext}
      >
        ›
      </button>
      <button
        type="button"
        className={classes.commandButton}
        disabled={!summary.hasChemistry}
        onClick={onArrange}
      >
        Arrange
      </button>
      <button
        type="button"
        className={classes.commandButton}
        disabled={!summary.hasChemistry}
        onClick={onDuplicate}
      >
        Duplicate next
      </button>
      <button
        type="button"
        className={classes.primaryCommandButton}
        onClick={onAddChemical}
      >
        Add molecule
      </button>
    </div>
    <div className={classes.shortcutHints} aria-label="Mechanism shortcuts">
      <span>
        <kbd>Ctrl+K</kbd> Add molecule
      </span>
      <span>
        <kbd>Ctrl+Enter</kbd> Next step
      </span>
      <span>
        <kbd>Ctrl+Shift+A</kbd> Arrange
      </span>
      <span>
        <kbd>Alt+↑/↓</kbd> Change step
      </span>
    </div>
  </div>
);
