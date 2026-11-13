import { Drawing, type LessonDef } from '../kit';

/**
 * Ethanenitrile and hot aqueous hydroxide, as far as ethanamide: hydroxide adds to the C≡N, water protonates the
 * nitrogen, and two proton transfers (a tautomerism, like an enol becoming a ketone) give the amide. One water
 * molecule (Ow, lower right) carries the protons and is hydroxide again at the end. The nitrile is drawn straight,
 * hydroxide above it.
 */
function nitrileHydrolysis(): LessonDef {
  const d = new Drawing();
  d.atom('C', 'C', 0, 0);
  d.grow('Me', 'C', 'C', 180);
  d.grow('N', 'N', 'C', 0, 3);
  d.atom('Oh', 'O', 0, 1.6, { charge: -1 });
  d.grow('Hh', 'H', 'Oh', 30);
  d.atom('Ow', 'O', 2.3, -1.9);
  d.grow('Hw', 'H', 'Ow', 150);
  d.grow('Hx', 'H', 'Ow', 30);
  return {
    id: 'lesson-nitrile-hydrolysis',
    title: 'Hydrolysing a nitrile',
    unit: 'Acyl substitution',
    skill: 'carbonyl-addition',
    level: 2,
    summary: 'Heated with aqueous sodium hydroxide, ethanenitrile is hydrolysed to ethanamide, and then on to ethanoate ions and ammonia. This lesson follows the first part: hydroxide adds to the C≡N carbon, and proton transfers turn the product into the amide. A haloalkane and cyanide give a nitrile, so this is a way to add one carbon to a chain and end with a carboxylic acid (after acidifying, when the hydrolysis is done in alkali).',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Hydroxide adds to the C≡N',
        prompt: 'Show hydroxide attacking the nitrile carbon.',
        arrows: [
          { from: 'Oh', to: 'Oh-C', says: 'A lone pair on hydroxide attacks the nitrile carbon.' },
          { from: 'C-N', to: 'N', says: 'One C≡N π bond moves onto nitrogen.' },
        ],
        hints: ['Nitrogen is more electronegative than carbon, so the nitrile carbon is electrophilic, like a carbonyl carbon.'],
        explanation: 'The nitrogen now carries the negative charge, much as oxygen does after a nucleophile adds to a C=O.',
        move: { Me: [-0.866, -0.5], N: [0.866, -0.5], Oh: [0, 1], Hh: [0.866, 1.5] },
      },
      {
        name: 'Water protonates the nitrogen',
        prompt: 'Show the nitrogen taking a proton from water.',
        arrows: [
          { from: 'N', to: 'N-Hw', says: 'A lone pair on the negative nitrogen takes a proton from water.' },
          { from: 'Hw-Ow', to: 'Ow', says: 'The O–H electrons stay on oxygen: hydroxide.' },
        ],
        hints: ['N− is a strong base, and water is all around it.'],
        explanation: 'An imidic acid, HO–C=NH: the enol-like form of an amide. Hydroxide is given back.',
        move: { Hw: [1.366, -1.366], Ow: [1.85, 1.85], Hx: [2.79, 2.19] },
      },
      {
        name: 'Hydroxide takes the O–H proton',
        prompt: 'Show hydroxide removing the proton from the OH group.',
        arrows: [
          { from: 'Ow', to: 'Ow-Hh', says: 'A lone pair on hydroxide takes the proton.' },
          { from: 'Hh-Oh', to: 'Oh', says: 'The O–H electrons stay on oxygen.' },
        ],
        hints: ['Base takes the proton from oxygen, as it would from an enol.'],
        explanation: 'An anion whose charge is shared by the oxygen and the nitrogen, like an enolate.',
        move: { Ow: [2.7, 0.25], Hx: [1.75, -0.05], Hh: [3.2, 1.1] },
      },
      {
        name: 'The C=O forms as nitrogen is protonated',
        prompt: 'Show the C=O forming as the nitrogen takes a proton from water.',
        arrows: [
          { from: 'Oh', to: 'Oh-C', pair: 2, says: 'A lone pair on the O− moves in to make a C=O.' },
          { from: 'C-N', to: 'N-Hx', says: 'The C=N π electrons swing out to make a bond from nitrogen to a proton of water.' },
          { from: 'Hx-Ow', to: 'Ow', says: 'The O–H electrons stay on oxygen: hydroxide.' },
        ],
        hints: ['Three arrows: oxygen pushes in, the C=N π bond swings out to the proton, and the water lets go of it.'],
        explanation: 'Ethanamide, and hydroxide given back. Steps 3 and 4 have moved a proton from oxygen to nitrogen, the way an enol becomes a ketone. Heated for longer in the alkali, the amide is hydrolysed in turn: hydroxide adds to its C=O, ammonia leaves (the nitrogen taking a proton from water as the C–N bond breaks), and the acid formed gives its proton to hydroxide, leaving ethanoate ions and ammonia. In acid, a nitrile gives the carboxylic acid and ammonium ions.',
      },
    ],
    predict: { step: 0, prompt: 'Draw what forms when hydroxide adds to the nitrile.', hints: ['Which atom of the C≡N does hydroxide attack?'] },
    expect: { bonds: ['C-Oh:2', 'C-N:1', 'N-Hw', 'N-Hx', 'Ow-Hh'], absent: ['Oh-Hh', 'Ow-Hw', 'Ow-Hx'], charges: { Ow: -1 } },
    practise: { template: 'nitrile-addition' },
  };
}

export const NITRILE_HYDROLYSIS: LessonDef[] = [nitrileHydrolysis()];
