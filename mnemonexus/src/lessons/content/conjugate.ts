import { Drawing, type LessonDef } from '../kit';

/**
 * Conjugate addition: a thiol adding to an α,β-unsaturated ketone, with its thiolate as catalyst. The thiolate adds at
 * the β-carbon, the far end of the C=C, giving an enolate; the enolate takes a proton back from the thiol on carbon,
 * which gives the thiolate back.
 */

function thiolAddition(): LessonDef {
  const d = new Drawing();
  // But-3-en-2-one: C=O up, the methyl lower left, the α-carbon lower right and the β-carbon right of it.
  d.atom('C1', 'C', 0, 0);
  d.grow('O1', 'O', 'C1', 90, 2);
  d.grow('Me1', 'C', 'C1', 210);
  d.grow('C2', 'C', 'C1', 330);
  d.grow('C3', 'C', 'C2', 30, 2);
  // Methanethiolate below right of the β-carbon; methanethiol below the α-carbon, its H pointing up at it.
  d.atom('S1', 'S', 2.6, -1.4, { charge: -1 });
  d.grow('Me2', 'C', 'S1', 330);
  d.atom('S2', 'S', 0.866, -2.6);
  d.grow('H2', 'H', 'S2', 90);
  d.grow('Me3', 'C', 'S2', 210);
  return {
    id: 'lesson-thiol-conjugate-addition',
    title: 'Conjugate addition of a thiol',
    unit: 'Conjugate addition',
    skill: 'conjugate-addition',
    level: 2,
    summary: 'Methanethiol adds across the C=C of but-3-en-2-one, catalysed by a little methanethiolate, to give 4-(methylsulfanyl)butan-2-one. The nucleophile adds at the β-carbon, not at the C=O: a conjugate (1,4-) addition.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The thiolate adds at the β-carbon',
        prompt: 'Show methanethiolate adding to the far end of the C=C, the β-carbon.',
        arrows: [
          { from: 'S1', to: 'S1-C3', says: 'A lone pair on sulfur attacks the β-carbon, the end of the C=C furthest from the C=O.' },
          { from: 'C2-C3', to: 'C1-C2', says: 'The C=C π electrons move into the bond between the α-carbon and the carbonyl carbon, making it a C=C.' },
          { from: 'C1-O1', to: 'O1', says: 'The C=O π electrons move onto oxygen, which takes the negative charge.' },
        ],
        hints: [
          'The C=O pulls electrons from the C=C through the π system, so the β-carbon is electron-poor.',
          'Three arrows: sulfur to the β-carbon, the C=C towards the C=O, the C=O onto oxygen.',
        ],
        explanation: 'An enolate, its negative charge shared between oxygen and the α-carbon. Conjugation with the C=O makes the β-carbon electrophilic: in one resonance form of the enone it carries a positive charge. A soft, weakly basic nucleophile such as a thiolate adds here; a hard, very reactive one such as a Grignard reagent or a hydride usually adds straight to the C=O instead (1,2-addition).',
        move: { S1: [2.6, -0.5], Me2: [3.466, -1] },
      },
      {
        name: 'The enolate takes a proton on carbon',
        prompt: 'Show the enolate taking the proton of methanethiol on its α-carbon.',
        arrows: [
          { from: 'O1', to: 'O1-C1', pair: 2, says: 'A lone pair on oxygen moves back in to re-form the C=O.' },
          { from: 'C2-C1', to: 'C2-H2', side: -1, approach: 90, says: 'The C=C π electrons take the proton of methanethiol on the α-carbon.' },
          { from: 'H2-S2', to: 'S2', says: 'The S–H electrons stay on sulfur: methanethiolate is made again.' },
        ],
        hints: ['The enolate reacts through carbon, the way it adds to a C=O in the aldol reaction.', 'The acid is methanethiol.'],
        explanation: '4-(Methylsulfanyl)butan-2-one, and methanethiolate, which can add to another enone: the thiolate is a catalyst. The overall change is H and SCH3 added across the C=C, with the C=O kept. In practice the enolate is often protonated on oxygen first and the enol then tautomerises; the arrows show the net result. The same pattern with a stabilised enolate (for example from a 1,3-dicarbonyl compound) as the nucleophile is the Michael reaction.',
        move: { H2: [0.866, -1.5] },
      },
    ],
    predict: { step: 0, prompt: 'Draw what forms when methanethiolate adds to the β-carbon.', hints: ['Where do the C=O π electrons end up?'] },
    expect: { bonds: ['S1-C3', 'C2-C3:1', 'C1-C2:1', 'C1-O1:2', 'C2-H2'], absent: ['H2-S2'], charges: { S2: -1 } },
    practise: { template: 'conjugate-addition' },
  };
}

export const CONJUGATE: LessonDef[] = [thiolAddition()];
