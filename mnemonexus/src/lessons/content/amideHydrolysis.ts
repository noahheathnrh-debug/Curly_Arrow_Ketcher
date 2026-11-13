import { Drawing, type LessonDef } from '../kit';

/**
 * Ethanamide hydrolysed by hot aqueous acid: ethanoic acid and ammonium. The layout is Fischer esterification's (C=O up,
 * NH2 lower left, methyl lower right): H3O+ (Ow) upper left carries the protons, and a second water (Ow2) upper right
 * is the nucleophile. Ammonia, once it has left, takes the last proton itself, which is why the reaction goes to
 * completion.
 */
function amideHydrolysis(): LessonDef {
  const d = new Drawing();
  d.atom('C', 'C', 0, 0);
  d.grow('O1', 'O', 'C', 90, 2);
  d.grow('N', 'N', 'C', 210);
  d.grow('Me', 'C', 'C', 330);
  d.atom('Ow', 'O', -1.6, 2.2, { charge: 1 });
  d.grow('Ha', 'H', 'Ow', 330);
  d.atom('Ow2', 'O', 1.5, 0.9);
  d.grow('Hb', 'H', 'Ow2', 90);
  d.grow('Hc', 'H', 'Ow2', 0);
  return {
    id: 'lesson-amide-hydrolysis',
    title: 'Hydrolysing an amide in acid',
    unit: 'Acyl substitution',
    skill: 'substitution',
    level: 2,
    summary: 'Heated with aqueous acid, ethanamide gives ethanoic acid and ammonium ions. Amides are the least reactive of the usual acyl compounds (acyl chlorides, anhydrides, esters, amides), so this needs heat for hours. Protonation makes the C=O carbon electrophilic enough for water, and protonating the nitrogen turns NH2 into a leaving group.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The C=O is protonated',
        prompt: 'Show H3O+ protonating the C=O oxygen of ethanamide.',
        arrows: [
          { from: 'O1', to: 'O1-Ha', says: 'A lone pair on the C=O oxygen takes a proton from H3O+.' },
          { from: 'Ha-Ow', to: 'Ow', says: 'The O–H electrons stay on the water.' },
        ],
        hints: ['An amide is protonated on oxygen, not nitrogen: the nitrogen lone pair is shared with the C=O.'],
        explanation: 'The protonated amide, its positive charge shared by the oxygen and the nitrogen. Its carbonyl carbon is now electrophilic enough for water to attack.',
        move: { Ha: [-0.866, 1.5], Ow: [-1.9, 2.3] },
      },
      {
        name: 'Water adds',
        prompt: 'Show a water molecule attacking the carbonyl carbon.',
        arrows: [
          { from: 'Ow2', to: 'Ow2-C', says: 'A lone pair on water attacks the carbonyl carbon.' },
          { from: 'C-O1', to: 'O1', says: 'The C=O π electrons move onto the positive oxygen, which is neutral again.' },
        ],
        hints: ['Two arrows: the nucleophile in, the π bond out.'],
        explanation: 'A tetrahedral intermediate, positive on the oxygen that came from water.',
        move: { Ow2: [0.866, 0.5], Hb: [1.366, 1.366], Hc: [1.866, 0.5], Ow: [2.4, 1.3] },
      },
      {
        name: 'The shuttle water takes a proton',
        prompt: 'Show the other water taking a proton from the positive oxygen.',
        arrows: [
          { from: 'Ow', to: 'Ow-Hb', says: 'A lone pair on water takes the proton.' },
          { from: 'Hb-Ow2', to: 'Ow2', says: 'The O–H electrons stay on oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: 'A neutral tetrahedral intermediate with two OH groups and an NH2 group, and H3O+.',
        move: { Hb: [-1.966, -0.5], Ow: [-2.966, -0.5] },
      },
      {
        name: 'The nitrogen is protonated',
        prompt: 'Show H3O+ protonating the NH2 group.',
        arrows: [
          { from: 'N', to: 'N-Hb', says: 'The nitrogen lone pair, no longer shared with a C=O, takes a proton from H3O+.' },
          { from: 'Hb-Ow', to: 'Ow', says: 'The O–H electrons stay on the water.' },
        ],
        hints: ['NH2⁻ would be a very poor leaving group; NH3 is a fair one.'],
        explanation: 'The NH2 is now NH3+, which can leave as ammonia. Here one water molecule carries the protons to keep the drawing small; in the flask many water molecules pass them along.',
        move: { Hb: [-1.732, -1.0], Ow: [-2.8, -0.2] },
      },
      {
        name: 'Ammonia leaves',
        prompt: 'Show an OH group pushing ammonia out.',
        arrows: [
          { from: 'O1', to: 'O1-C', toSide: -1, says: 'A lone pair on the upper OH moves in to make a C=O.' },
          { from: 'C-N', to: 'N', says: 'The C–N bond breaks and ammonia leaves.' },
        ],
        hints: ['Two arrows: a lone pair pushes in, the leaving group goes.'],
        explanation: 'Protonated ethanoic acid and a molecule of ammonia.',
        move: { N: [-1.85, 1.75], Hb: [-2.716, 2.25], Ow: [-2.8, -0.2] },
      },
      {
        name: 'Ammonia takes the last proton',
        prompt: 'Show ammonia taking the proton from the protonated acid.',
        arrows: [
          { from: 'N', to: 'N-Ha', says: 'The lone pair on ammonia takes the proton.' },
          { from: 'Ha-O1', to: 'O1', says: 'The O–H electrons stay on oxygen: ethanoic acid.' },
        ],
        hints: ['Ammonia is a base, far stronger than water.'],
        explanation: 'Ethanoic acid and an ammonium ion. Ammonium is not a nucleophile, so it cannot attack the acid and turn it back into the amide: this step pulls the whole reaction through, and the acid is used up rather than being a catalyst. In base, the same hydrolysis gives a carboxylate and ammonia.',
      },
    ],
    predict: { step: 4, prompt: 'Draw what forms when ammonia leaves.', hints: ['Which oxygen ends up double-bonded to carbon?'] },
    expect: { bonds: ['C-O1:2', 'C-Ow2:1', 'Ow2-Hc', 'N-Hb', 'N-Ha'], absent: ['C-N', 'Ha-O1', 'Hb-Ow2'], charges: { N: 1 } },
    practise: { template: 'tetrahedral-collapse' },
  };
}

export const AMIDE_HYDROLYSIS: LessonDef[] = [amideHydrolysis()];
