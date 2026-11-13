import { Drawing, type LessonDef } from '../kit';

/**
 * Fischer esterification: ethanoic acid and methanol with an acid catalyst give methyl ethanoate and water. One water
 * molecule (Ow) carries every proton: it starts as H3O+, protonates the C=O, takes the proton from the added methanol,
 * puts it on an OH, and finally takes the last proton. The acid's C=O is up, its OH lower left, its methyl lower right;
 * H3O+ upper left; methanol upper right.
 */
function fischer(): LessonDef {
  const d = new Drawing();
  d.atom('C', 'C', 0, 0);
  d.grow('O1', 'O', 'C', 90, 2);
  d.grow('O2', 'O', 'C', 210);
  d.grow('H2', 'H', 'O2', 270);
  d.grow('Me', 'C', 'C', 330);
  d.atom('Ow', 'O', -1.6, 2.2, { charge: 1 });
  d.grow('Ha', 'H', 'Ow', 330);
  d.atom('Om', 'O', 1.5, 0.9);
  d.grow('Hm', 'H', 'Om', 90);
  d.grow('Cm', 'C', 'Om', 0);
  return {
    id: 'lesson-fischer-esterification',
    title: 'Fischer esterification',
    unit: 'Acyl substitution',
    skill: 'substitution',
    level: 2,
    summary: 'Warmed with methanol and an acid catalyst, ethanoic acid gives methyl ethanoate and water. Protonation makes the acid a better electrophile, and a proton shuttle turns an OH into water, which leaves. Every step is reversible.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The C=O is protonated',
        prompt: 'Show H3O+ protonating the C=O oxygen of ethanoic acid.',
        arrows: [
          { from: 'O1', to: 'O1-Ha', says: 'A lone pair on the C=O oxygen takes a proton from H3O+.' },
          { from: 'Ha-Ow', to: 'Ow', says: 'The O–H electrons stay on the water.' },
        ],
        hints: ['The C=O oxygen is the basic site of a carboxylic acid.'],
        explanation: 'The protonated acid. Its carbonyl carbon is now much more electrophilic, which a weak nucleophile like methanol needs. In practice a few drops of concentrated sulfuric acid are the catalyst; H3O+ stands for it here.',
        move: { Ha: [-0.866, 1.5], Ow: [-1.9, 2.3] },
      },
      {
        name: 'Methanol adds',
        prompt: 'Show methanol attacking the carbonyl carbon.',
        arrows: [
          { from: 'Om', to: 'Om-C', says: 'A lone pair on the methanol oxygen attacks the carbonyl carbon.' },
          { from: 'C-O1', to: 'O1', says: 'The C=O π electrons move onto the positive oxygen, which is neutral again.' },
        ],
        hints: ['Two arrows: the nucleophile in, the π bond out.'],
        explanation: 'A tetrahedral intermediate, positive on the oxygen that came from methanol.',
        move: { Om: [0.866, 0.5], Hm: [1.366, 1.366], Cm: [1.866, 0.5], Ow: [2.4, 1.3] },
      },
      {
        name: 'The shuttle water takes a proton',
        prompt: 'Show water taking the proton from the positive oxygen.',
        arrows: [
          { from: 'Ow', to: 'Ow-Hm', says: 'A lone pair on water takes the proton.' },
          { from: 'Hm-Om', to: 'Om', says: 'The O–H electrons stay on oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: 'A neutral tetrahedral intermediate with two OH groups and a methoxy group, and H3O+.',
        move: { Hm: [-1.966, -0.5], Ow: [-2.966, -0.5] },
      },
      {
        name: 'An OH is protonated',
        prompt: 'Show H3O+ protonating the OH at the lower left.',
        arrows: [
          { from: 'O2', to: 'O2-Hm', says: 'A lone pair on the OH oxygen takes a proton from H3O+.' },
          { from: 'Hm-Ow', to: 'Ow', says: 'The O–H electrons stay on the water.' },
        ],
        hints: ['OH is a poor leaving group; protonated, it can leave as water.'],
        explanation: 'The OH is now –OH2+, a good leaving group. Over steps 3 and 4 a proton has in effect moved from one oxygen to another. Here one water molecule carries every proton, to keep the drawing small; in the flask the solvent is mostly methanol, and several molecules pass the protons along.',
        move: { Hm: [-1.732, -1.0], Ow: [-2.6, 1.2] },
      },
      {
        name: 'A new water molecule leaves',
        prompt: 'Show the other OH pushing water out.',
        arrows: [
          { from: 'O1', to: 'O1-C', toSide: -1, says: 'A lone pair on the remaining OH moves in to make a C=O.' },
          { from: 'C-O2', to: 'O2', says: 'The C–O bond breaks and water leaves.' },
        ],
        hints: ['Two arrows: a lone pair pushes in, the leaving group goes.'],
        explanation: 'A protonated ester and a water molecule.',
        move: { O2: [-1.5, -1.2], H2: [-1.5, -2.2], Hm: [-2.366, -0.7], Ow: [-1.9, 2.3] },
      },
      {
        name: 'The shuttle water takes the last proton',
        prompt: 'Show water taking the proton from the protonated ester.',
        arrows: [
          { from: 'Ow', to: 'Ow-Ha', says: 'A lone pair on water takes the proton.' },
          { from: 'Ha-O1', to: 'O1', says: 'The O–H electrons stay on oxygen: a neutral ester.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: 'Methyl ethanoate, and H3O+ given back: the acid is a catalyst. Every step is reversible, so the equilibrium is pushed towards the ester by using excess methanol or by removing the water as it forms. Run in reverse, with excess water, these steps are acid-catalysed ester hydrolysis.',
      },
    ],
    predict: { step: 4, prompt: 'Draw what forms when water leaves.', hints: ['Which oxygen ends up double-bonded to carbon?'] },
    expect: { bonds: ['C-O1:2', 'C-Om:1', 'Om-Cm', 'Ow-Ha', 'O2-H2', 'O2-Hm'], absent: ['C-O2', 'Hm-Om', 'Ha-O1'], charges: { Ow: 1 } },
    practise: { template: 'acyl-addition' },
  };
}

export const FISCHER: LessonDef[] = [fischer()];
