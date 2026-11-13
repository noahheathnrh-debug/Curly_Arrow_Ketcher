import { Drawing, type LessonDef } from '../kit';

/**
 * A halohydrin: propene with bromine in water. The bromonium ion forms as in the bromination lesson, but water, the
 * solvent, opens it instead of bromide, at the more substituted carbon; a second water molecule takes the proton.
 */

function bromohydrin(): LessonDef {
  const d = new Drawing();
  // Propene: C1 (the CH, its methyl lower left) and C2 (the CH2) to its right; bromine above; two waters below C1.
  d.atom('C1', 'C', 0, 0);
  d.grow('C2', 'C', 'C1', 0, 2);
  d.grow('Me', 'C', 'C1', 210);
  d.atom('Br1', 'Br', 0.5, 1.3);
  d.grow('Br2', 'Br', 'Br1', 90);
  d.atom('Ow', 'O', 0.2, -1.8);
  d.grow('Hw', 'H', 'Ow', 300);
  d.atom('Ow2', 'O', 1.4, -3.4);
  return {
    id: 'lesson-halohydrin',
    title: 'A bromohydrin from propene',
    unit: 'Addition to alkenes',
    skill: 'alkene-addition',
    level: 2,
    summary: 'With bromine in water, propene gives mainly 1-bromopropan-2-ol rather than the dibromide. Water, the solvent, outnumbers bromide and opens the bromonium ion, at the more substituted carbon.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'A bromonium ion forms',
        prompt: 'Show the alkene attacking bromine to make a bromonium ion.',
        arrows: [
          { from: 'C2-C1', to: 'C2-Br1', approach: 250, says: 'The π electrons attack the near bromine, made electron-poor as the alkene approaches.' },
          { from: 'Br1', to: 'Br1-C1', pair: 2, says: 'A lone pair on that bromine bonds to the other carbon, so no open carbocation forms.' },
          { from: 'Br1-Br2', to: 'Br2', approach: 180, says: 'The Br–Br bond breaks and bromide leaves.' },
        ],
        hints: ['The same first step as adding bromine to ethene: three arrows.'],
        explanation: 'The bromonium ion and bromide. The ring is not symmetrical: the C1–Br bond, to the carbon carrying the methyl group, is longer and weaker, and C1 carries more of the positive charge.',
        move: { Br1: [0.5, 0.87], Br2: [1.9, 1.9] },
      },
      {
        name: 'Water opens the ring',
        prompt: 'Show water opening the bromonium ion at the more substituted carbon.',
        arrows: [
          { from: 'Ow', to: 'Ow-C1', says: 'A lone pair on water attacks C1, the more substituted carbon, from the face opposite the bromine.' },
          { from: 'C1-Br1', to: 'Br1', says: 'The C1–Br bond breaks and bromine, now bonded only to C2, is neutral.' },
        ],
        hints: ['Water is the solvent, so it meets the ion far more often than bromide does.', 'Attack where the positive charge is greater.'],
        explanation: 'A protonated alcohol. The nucleophile goes to the more substituted carbon, which carries more of the positive charge, even though it is more hindered: the Markovnikov orientation.',
        move: { Ow: [0, -1], Hw: [0.5, -1.866], Br1: [1.5, 0.866] },
      },
      {
        name: 'Water takes the proton',
        prompt: 'Show a second water molecule taking a proton from the oxygen.',
        arrows: [
          { from: 'Ow2', to: 'Ow2-Hw', says: 'A lone pair on a second water molecule takes the proton.' },
          { from: 'Hw-Ow', to: 'Ow', says: 'The O–H electrons stay on oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: '1-Bromopropan-2-ol, a bromohydrin, with H3O+ and bromide. The Br and OH are added anti, to opposite faces: cyclohexene would give only trans-2-bromocyclohexan-1-ol.',
        move: { Hw: [1.0, -2.6] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when water opens the bromonium ion.', hints: ['Which carbon does the oxygen bond to?'] },
    expect: { bonds: ['Ow-C1', 'C2-Br1', 'C1-C2:1', 'Ow2-Hw'], absent: ['Br1-Br2', 'C1-Br1', 'Hw-Ow'], charges: { Br2: -1, Ow2: 1 } },
    practise: { template: 'halonium-opening' },
  };
}

export const HALOHYDRIN: LessonDef[] = [bromohydrin()];
