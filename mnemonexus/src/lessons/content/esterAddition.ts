import type { LessonDef } from '../kit';
import { ESTER_ADDITION_SETS, esterDoubleAddition } from '../../practice/templatesEsterAddition';

/** An ester and a Grignard reagent as a lesson: the template's methyl ethanoate and methylmagnesium bromide case. */
function grignardEsterLesson(): LessonDef {
  const k = ESTER_ADDITION_SETS.findIndex((s) => s.acyl === 1 && s.alkyl === 1 && s.reagent.name === 'methylmagnesium bromide');
  const base = esterDoubleAddition.make(() => (k + 0.5) / ESTER_ADDITION_SETS.length);
  return {
    ...base,
    id: 'lesson-grignard-ester',
    title: 'An ester and two Grignard equivalents',
    summary: 'Methyl ethanoate and methylmagnesium bromide give 2-methylpropan-2-ol: the first methyl group substitutes for the methoxy group, making propanone, which is more reactive than the ester and takes a second methyl group at once.',
    predict: { step: 1, prompt: 'Draw what forms when the intermediate collapses.', hints: ['Which group leaves: the methyl just added, or the methoxy group?'] },
    practise: { template: 'ester-double-addition' },
  };
}

export const ESTER_ADDITION: LessonDef[] = [grignardEsterLesson()];
