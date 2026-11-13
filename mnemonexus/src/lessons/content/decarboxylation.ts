import type { LessonDef } from '../kit';
import { DECARBOXYLATION_SETS, decarboxylation } from '../../practice/templatesDecarboxylation';

/** Decarboxylation as a lesson: the practice template's 3-oxobutanoic acid case, drawn with a fixed pick. */
function decarboxylationLesson(): LessonDef {
  const k = DECARBOXYLATION_SETS.findIndex((a) => a.name === '3-oxobutanoic acid');
  const base = decarboxylation.make(() => (k + 0.5) / DECARBOXYLATION_SETS.length);
  return {
    ...base,
    id: 'lesson-decarboxylation',
    title: 'Decarboxylation of a β-keto acid',
    summary: 'Warm 3-oxobutanoic acid and it loses carbon dioxide in one step: six atoms in a ring pass electrons round, giving the enol of propanone, which tautomerises to propanone.',
    predict: { step: 0, prompt: 'Draw the two products of the decarboxylation.', hints: ['Which C–C bond breaks, and where does the hydrogen go?'] },
    practise: { template: 'decarboxylation' },
  };
}

export const DECARBOXYLATION: LessonDef[] = [decarboxylationLesson()];
