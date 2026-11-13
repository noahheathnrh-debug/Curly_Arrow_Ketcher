import type { ExperienceProps, ExperienceResult } from '@mnemonexus/addon-sdk';

export interface ExperienceHostProps extends Omit<ExperienceProps, 'kind'> {
  readonly onComplete: (result: ExperienceResult) => void;
  readonly onExit: () => void;
}
