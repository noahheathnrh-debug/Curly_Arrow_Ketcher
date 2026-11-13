import type { PracticeActivity } from '@mnemonexus/addon-sdk/practice';
import { BUILT_ENZYMES, SKILL_LABELS } from './index';

/**
 * The enzyme mechanisms as practice-v1 catalogue entries. Terms are the phrases and names the lectures use, never a
 * single ordinary word. Variants of one mechanism share a family, so the host rotates them instead of repeating one.
 * An activity of five minutes or less may also be set for recall; the longer ones are for a study session or a planned
 * block of work.
 */

export const ENZYME_MINUTES = (stages: number, arrows: number) => Math.max(2, Math.round(stages + 0.3 * arrows));

export function enzymeCatalogueActivities(): PracticeActivity[] {
  return BUILT_ENZYMES.map(({ def, steps }): PracticeActivity => {
    const stages = steps.reduce((total, step) => total + step.puzzle.steps.length, 0);
    const arrows = steps.reduce((total, step) => total + step.arrows.flat().length, 0);
    const minutes = ENZYME_MINUTES(stages, arrows);
    return {
      id: def.id,
      title: def.title,
      summary: `${def.summary} ${steps.length === 1 ? 'One step' : `${steps.length} steps`}, ${arrows} arrows, on a cut-down active site with the lecture source named.`.slice(0, 600),
      minutes,
      level: def.level,
      terms: [...def.terms],
      skills: [def.skill, ...def.generalSkills],
      surfaces: minutes <= 5 ? ['study', 'recall'] : ['study', 'planner'],
      family: def.family,
      ...(def.requires?.length ? { requires: [...def.requires] } : {}),
      launch: { kind: 'enzyme', activity: def.id, skill: def.skill },
    };
  });
}

export const enzymeSkills = (): Record<string, { label: string }> =>
  Object.fromEntries(Object.entries(SKILL_LABELS).map(([id, label]) => [id, { label }]));
