import type { LessonDef } from '../kit';
import { ACID_SETS, BASE_SETS, epoxideAcid, epoxideBase } from '../../practice/templatesEpoxide';

/**
 * Epoxide opening as two lessons on the same epoxide, 2,2-dimethyloxirane: methoxide opens it at the CH2 carbon,
 * methanol with acid at the other one. Each is its practice template's case, drawn with a fixed pick.
 */
const draw = <T>(sets: readonly T[], match: (s: T) => boolean) => {
  const k = sets.findIndex(match);
  if (k < 0) throw new Error('epoxide lesson: no such set');
  return () => (k + 0.5) / sets.length;
};

function baseLesson(): LessonDef {
  const base = epoxideBase.make(draw(BASE_SETS, (s) => s.epoxide.name === '2,2-dimethyloxirane' && s.nu === 'methoxide'));
  return {
    ...base,
    id: 'lesson-epoxide-base',
    title: 'Opening an epoxide with a nucleophile',
    summary: 'Methoxide opens 2,2-dimethyloxirane by SN2 at the less hindered CH2 carbon; the alkoxide is then protonated, giving 1-methoxy-2-methylpropan-2-ol. The strain of the three-membered ring is what lets an alkoxide leave.',
    predict: { step: 0, prompt: 'Draw what forms when methoxide opens the ring.', hints: ['Which carbon is less hindered?'] },
    practise: { template: 'epoxide-opening-base' },
  };
}

function acidLesson(): LessonDef {
  const base = epoxideAcid.make(draw(ACID_SETS, (s) => s.epoxide.name === '2,2-dimethyloxirane' && s.nu.name === 'methanol'));
  return {
    ...base,
    id: 'lesson-epoxide-acid',
    title: 'Opening an epoxide in acid',
    summary: 'With an acid catalyst, methanol opens 2,2-dimethyloxirane at the more substituted carbon, the opposite end to methoxide, giving 2-methoxy-2-methylpropan-1-ol. The protonated epoxide behaves like a bromonium ion.',
    predict: { step: 0, prompt: 'Draw what forms when methanol opens the protonated epoxide.', hints: ['Which carbon carries more of the positive charge?'] },
    practise: { template: 'epoxide-opening-acid' },
  };
}

export const EPOXIDES: LessonDef[] = [baseLesson(), acidLesson()];
