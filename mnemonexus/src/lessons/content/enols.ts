import type { LessonDef } from '../kit';
import { alphaHalogenation, enolisationAcid, ENOL_CARBONYLS, HALOGENATION_SETS } from '../../practice/templatesEnols';

/** Enols as two lessons on propanone: acid-catalysed enol formation, then the enol and bromine. Template cases. */
const draw = (k: number, n: number) => () => (k + 0.5) / n;

function enolisationLesson(): LessonDef {
  const base = enolisationAcid.make(draw(ENOL_CARBONYLS.findIndex((c) => c.name === 'propanone'), ENOL_CARBONYLS.length));
  return {
    ...base,
    id: 'lesson-enolisation',
    title: 'Enol formation in acid',
    summary: 'In acid, propanone is in equilibrium with a tiny amount of its enol, prop-1-en-2-ol. The C=O oxygen is protonated, then water takes a proton from the α-carbon. The enol is what reacts at the α-carbon.',
    predict: { step: 1, prompt: 'Draw the enol that forms.', hints: ['Where is the C=C, and where is the OH?'] },
    practise: { template: 'enolisation-acid' },
  };
}

function brominationLesson(): LessonDef {
  const base = alphaHalogenation.make(draw(HALOGENATION_SETS.findIndex((s) => s.carbonyl.name === 'propanone' && s.x === 'Br'), HALOGENATION_SETS.length));
  return {
    ...base,
    id: 'lesson-alpha-bromination',
    title: 'Bromination next to a C=O',
    summary: 'The enol of propanone attacks bromine at its α-carbon, as an alkene would but faster, pushed by the OH. Losing a proton gives 1-bromopropan-2-one. In acid, one bromine goes in.',
    predict: { step: 0, prompt: 'Draw what forms when the enol attacks bromine.', hints: ['Which carbon of the enol gets the bromine?'] },
    practise: { template: 'alpha-halogenation' },
  };
}

export const ENOLS: LessonDef[] = [enolisationLesson(), brominationLesson()];
