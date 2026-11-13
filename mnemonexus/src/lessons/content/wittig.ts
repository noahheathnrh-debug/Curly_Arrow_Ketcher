import type { LessonDef } from '../kit';
import { wittig } from '../../practice/templatesWittig';

/**
 * The Wittig reaction as a lesson: the practice template's propanal case (the second set, so a fixed draw of 1.5/12),
 * with a lesson's title, summary and prediction.
 */
function wittigLesson(): LessonDef {
  const base = wittig.make(() => 1.5 / 12);
  return {
    ...base,
    id: 'lesson-wittig',
    title: 'The Wittig reaction',
    summary: 'A phosphorus ylide, made from a phosphonium salt and a strong base, turns the C=O of propanal into a C=C: but-1-ene forms, and the oxygen ends up on phosphorus as a phosphine oxide. The new C=C is exactly where the C=O was.',
    predict: { step: 0, prompt: 'Draw the four-membered ring that forms when the ylide adds to propanal.', hints: ['Which atom bonds to the carbonyl carbon, and which to the oxygen?'] },
    practise: { template: 'wittig' },
  };
}

export const WITTIG: LessonDef[] = [wittigLesson()];
