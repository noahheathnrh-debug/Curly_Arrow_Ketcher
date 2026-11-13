import { Drawing, type LessonDef } from '../kit';

/**
 * E1cB: the dehydration that completes an aldol condensation. Hydroxide takes the α-proton of 3-hydroxybutanal (the
 * aldol lesson's product), and the enolate pushes hydroxide out from the β-carbon, giving but-2-enal.
 */

function aldolDehydration(): LessonDef {
  const d = new Drawing();
  // 3-Hydroxybutanal: C=O up, the α-carbon lower right with the H hydroxide takes, the β-carbon upper right with its OH up.
  d.atom('C1', 'C', 0, 0);
  d.grow('O1', 'O', 'C1', 90, 2);
  d.grow('C2', 'C', 'C1', 330);
  d.grow('Ha', 'H', 'C2', 270);
  d.grow('C3', 'C', 'C2', 30);
  d.grow('O3', 'O', 'C3', 90);
  d.grow('C4', 'C', 'C3', 330);
  d.atom('Oh', 'O', 0.87, -2.8, { charge: -1 });
  d.grow('Hh', 'H', 'Oh', 210);
  return {
    id: 'lesson-e1cb',
    title: 'E1cB: dehydrating an aldol',
    unit: 'Enolates',
    skill: 'elimination',
    level: 2,
    summary: 'Warmed with hydroxide, 3-hydroxybutanal (the aldol from ethanal) loses water to give but-2-enal. It goes through the enolate: an elimination through the conjugate base, E1cB.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Hydroxide makes the enolate',
        prompt: 'Show hydroxide taking the proton on the α-carbon.',
        arrows: [
          { from: 'Oh', to: 'Oh-Ha', says: 'Hydroxide takes a proton from the α-carbon, between the C=O and the carbon carrying the OH.' },
          { from: 'C2-Ha', to: 'C2-C1', side: -1, toSide: -1, says: 'The C–H electrons move in to make a C=C π bond.' },
          { from: 'C1-O1', to: 'O1', says: 'The C=O π electrons move onto oxygen.' },
        ],
        hints: ['The same first step as in the aldol reaction.', 'Which hydrogen is acidic? The one on the carbon next to the C=O.'],
        explanation: 'The enolate of 3-hydroxybutanal, and water. Only a little forms at equilibrium, but it is enough to react.',
        move: { Ha: [0.87, -1.8] },
      },
      {
        name: 'The enolate pushes out hydroxide',
        prompt: 'Show the enolate re-forming the C=O and pushing hydroxide out from the β-carbon.',
        arrows: [
          { from: 'O1', to: 'O1-C1', pair: 2, says: 'A lone pair on oxygen moves back in to re-form the C=O.' },
          { from: 'C2-C1', to: 'C2-C3', says: 'The C=C π electrons move along one bond, to between the α- and β-carbons.' },
          { from: 'C3-O3', to: 'O3', says: 'The C–O bond breaks and hydroxide leaves.' },
        ],
        hints: ['Three arrows: the O− pushes, the C=C moves along, the OH goes.', 'Hydroxide is the leaving group here, although it is a poor one.'],
        explanation: 'But-2-enal, mainly the E isomer, and hydroxide again: the base is a catalyst. Hydroxide is far too poor a leaving group for E2 or SN2, but here an anion pushes it out and the new C=C is conjugated with the C=O, which pays for it. Because the enolate (the conjugate base) forms first and the leaving group then departs from it in a second step, this is E1cB. An aldol addition followed by this dehydration is an aldol condensation.',
      },
    ],
    predict: { prompt: 'Draw what forms when the enolate pushes out hydroxide.', hints: ['Where is the new C=C?'] },
    expect: { bonds: ['C1-O1:2', 'C2-C3:2', 'C1-C2:1', 'Oh-Ha'], absent: ['C3-O3', 'C2-Ha'], charges: { O3: -1 } },
    practise: { template: 'e1cb' },
  };
}

export const E1CB: LessonDef[] = [aldolDehydration()];
