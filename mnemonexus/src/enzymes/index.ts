import type { MechanismPuzzle } from 'ketcher-core';
import { ENZYME_ACTIVITIES } from '@private-content';
import { buildActivity, type BuiltActivity, type EnzymeActivity, type EnzymeSkill } from './engine';

/**
 * The enzyme mechanisms as the rest of the add-on sees them: a level for the browser, and the labels that make a
 * practice result say what was right in plain words.
 */

export { ENZYME_ACTIVITIES };
export type { EnzymeActivity, EnzymeSkill };

export const ENZYME_TAG = 'enzyme mechanism';

export const BUILT_ENZYMES: BuiltActivity[] = ENZYME_ACTIVITIES.map(buildActivity);

export interface EnzymeLevel {
  id: string;
  title: string;
  puzzles: MechanismPuzzle[];
  collection: 'Enzymes';
  withheldSteps: 0;
}

export const ENZYME_LEVELS: EnzymeLevel[] = BUILT_ENZYMES.map(({ def, steps }) => ({
  id: def.id,
  title: def.title,
  puzzles: steps.map((step) => step.puzzle),
  collection: 'Enzymes',
  withheldSteps: 0,
}));

/** What each stage of each puzzle teaches, by puzzle id, for the criteria of a practice result. */
export const ENZYME_STAGE_LABELS: Record<string, string[]> = Object.fromEntries(
  BUILT_ENZYMES.flatMap(({ steps }) => steps.map((step) => [step.puzzle.id, step.stageLabels] as const)),
);

export const isEnzymePuzzle = (puzzle: MechanismPuzzle): boolean => puzzle.tags?.includes(ENZYME_TAG) ?? false;

export const SKILL_LABELS: Record<EnzymeSkill, string> = {
  'enzyme-acid-base': 'Acid–base catalysis in enzymes',
  'enzyme-covalent': 'Covalent (nucleophilic) catalysis in enzymes',
  'enzyme-metal': 'Metal-ion catalysis in enzymes',
  'enzyme-glycosidase': 'Glycosidase mechanisms',
  'enzyme-hydride': 'Hydride transfer by nicotinamide coenzymes',
  'enzyme-plp': 'Pyridoxal phosphate mechanisms',
  'enzyme-flavin': 'Flavin coenzyme mechanisms',
  'enzyme-phosphoryl': 'Phosphoryl transfer and ribozymes',
};
