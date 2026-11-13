import type { MechanismArrowDescriptor } from 'ketcher-core';

/** The part of a puzzle step that decides what counts as right. (Kept apart from the editor so it can be tested alone.) */
export interface AnswerStep {
  readonly expectedArrows: readonly MechanismArrowDescriptor[];
  readonly acceptedAlternatives?: ReadonlyArray<readonly MechanismArrowDescriptor[]>;
}

/**
 * Every set of arrows that would be completely right once step `upTo` is answered: the answers of the earlier steps
 * (or an accepted alternative of one) followed by this step's. Most puzzles have only one. An alternative exists
 * where one drawing gesture can be read two ways, such as a lone pair dropped on the bond to an atom or on the atom.
 * Capped, so a step with many such arrows cannot grow without limit.
 */
export function acceptableSets(steps: readonly AnswerStep[], upTo: number, cap = 64): MechanismArrowDescriptor[][] {
  let sets: MechanismArrowDescriptor[][] = [[]];
  for (let i = 0; i <= upTo; i++) {
    const options = [steps[i].expectedArrows, ...(steps[i].acceptedAlternatives ?? [])];
    sets = sets.flatMap((set) => options.map((option) => [...set, ...option])).slice(0, cap);
  }
  return sets;
}
