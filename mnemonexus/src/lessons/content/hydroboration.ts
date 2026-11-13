import type { LessonDef } from '../kit';
import { hydroboration } from '../../practice/templatesHydroboration';

/** Hydroboration as a lesson: the practice template's propene case (the first set, a fixed draw of 0.5/14). */
function hydroborationLesson(): LessonDef {
  const base = hydroboration.make(() => 0.5 / 14);
  return {
    ...base,
    id: 'lesson-hydroboration',
    title: 'Hydroboration of an alkene',
    summary: 'Borane (BH3) adds across the C=C of propene in one step, boron to the CH2 end. Oxidation with alkaline hydrogen peroxide then gives propan-1-ol: water added the opposite way round to acid-catalysed hydration.',
    predict: { step: 0, prompt: 'Draw the alkylborane that forms.', hints: ['Which carbon gets the boron, and which the hydrogen?'] },
    practise: { template: 'hydroboration' },
  };
}

export const HYDROBORATION: LessonDef[] = [hydroborationLesson()];
