import { Drawing, type LessonDef } from '../kit';

/**
 * Enolates, from the standard first-year account: the base-catalysed aldol reaction of ethanal. Hydroxide makes the
 * enolate, the enolate adds through carbon to a second ethanal, and the alkoxide takes back the proton from the water
 * made in step 1, so hydroxide is a catalyst. Then the Claisen condensation of methyl ethanoate, the same enolate addition
 * on an ester, ending with the deprotonation that drives it.
 */

function aldol(): LessonDef {
  const d = new Drawing();
  // The ethanal that becomes the enolate: C=O up, the α-carbon lower right with the proton hydroxide takes.
  d.atom('C1', 'C', 0, 0);
  d.grow('O1', 'O', 'C1', 90, 2);
  d.grow('C2', 'C', 'C1', 330);
  d.grow('Ha', 'H', 'C2', 270);
  d.atom('Oh', 'O', 0.87, -2.8, { charge: -1 });
  d.grow('Hh', 'H', 'Oh', 210);
  // The second ethanal, to the right, its implicit H facing the enolate.
  d.atom('C3', 'C', 2.6, 0);
  d.grow('O3', 'O', 'C3', 90, 2);
  d.grow('C4', 'C', 'C3', 330);
  return {
    id: 'lesson-aldol',
    title: 'The aldol reaction',
    unit: 'Enolates',
    skill: 'carbonyl-addition',
    level: 2,
    summary: 'With a little hydroxide as catalyst, two molecules of ethanal join to give 3-hydroxybutanal, an aldol (aldehyde plus alcohol). Hydroxide makes a small amount of the enolate, which adds to a second ethanal as a carbon nucleophile.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Hydroxide makes the enolate',
        prompt: 'Show hydroxide taking a proton from the α-carbon to make the enolate.',
        arrows: [
          { from: 'Oh', to: 'Oh-Ha', says: 'Hydroxide takes a proton from the α-carbon, the carbon next to the C=O.' },
          { from: 'C2-Ha', to: 'C2-C1', says: 'The C–H electrons move in to make a C=C π bond.' },
          { from: 'C1-O1', to: 'O1', says: 'The C=O π electrons move onto oxygen, so the negative charge ends on oxygen.' },
        ],
        hints: ['Three arrows: base to hydrogen, C–H into C=C, C=O onto oxygen.', 'The α-hydrogen is acidic because the anion left behind is shared with the C=O oxygen.'],
        explanation: 'The enolate ion and water. The negative charge is shared by resonance between oxygen and the α-carbon; the form with the charge on oxygen, drawn here, is the more important. Ethanal’s α-hydrogen has a pKa of about 17 and water’s is 15.7, so only a little enolate forms at equilibrium, but enough to react.',
        move: { Ha: [0.87, -1.8] },
      },
      {
        name: 'The enolate adds to a second ethanal',
        prompt: 'Show the enolate adding, through carbon, to the carbonyl carbon of the second ethanal.',
        arrows: [
          { from: 'O1', to: 'O1-C1', pair: 2, says: 'A lone pair on the enolate oxygen moves back in to re-form the C=O.' },
          { from: 'C2-C1', to: 'C2-C3', says: 'The C=C π electrons attack the carbonyl carbon of the second ethanal: the enolate reacts through carbon.' },
          { from: 'C3-O3', to: 'O3', says: 'That molecule’s C=O π bond moves onto its oxygen.' },
        ],
        hints: ['The new bond is C–C: from the α-carbon to the other molecule’s carbonyl carbon.', 'Three arrows: the O− pushes, the C=C attacks, the other C=O breaks.'],
        explanation: 'A new C–C bond, and an alkoxide. This is a carbonyl addition with the enolate as the nucleophile: the key step of every aldol reaction.',
        move: { C3: [1.73, 0], O3: [1.73, 1], C4: [2.6, -0.5], Oh: [3.47, 2.1], Ha: [2.6, 1.6], Hh: [4.34, 1.6] },
      },
      {
        name: 'Water protonates the alkoxide',
        prompt: 'Show the alkoxide taking a proton from water.',
        arrows: [
          { from: 'O3', to: 'O3-Ha', says: 'The alkoxide is a strong base: a lone pair takes a proton from water.' },
          { from: 'Ha-Oh', to: 'Oh', says: 'The O–H electrons stay on oxygen: hydroxide is given back, so it is a catalyst.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The acid is the water made in step 1.'],
        explanation: '3-Hydroxybutanal, the aldol, and hydroxide again. Warmed with more base, the aldol loses water through its enolate (an E1cB elimination) to give but-2-enal: that addition plus dehydration is an aldol condensation.',
        move: { Ha: [2.2, 1.75] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when the enolate adds to the second ethanal.', hints: ['A new C–C bond forms; where do the second ethanal’s C=O π electrons go?'] },
    expect: { bonds: ['C2-C3', 'C1-O1:2', 'O3-Ha', 'Oh-Hh'], absent: ['C2-Ha', 'Ha-Oh'], charges: { Oh: -1 } },
    practise: { template: 'aldol-addition' },
  };
}

function claisen(): LessonDef {
  const d = new Drawing();
  // The ester that becomes the enolate: C=O up, OMe lower left, the α-carbon lower right with two of its three hydrogens drawn.
  d.atom('C1', 'C', 0, 0);
  d.grow('O1', 'O', 'C1', 90, 2);
  d.grow('Oe1', 'O', 'C1', 210);
  d.grow('Me1', 'C', 'Oe1', 150);
  d.grow('C2', 'C', 'C1', 330);
  d.grow('Ha', 'H', 'C2', 240);
  d.grow('Hb', 'H', 'C2', 300);
  d.atom('Ob', 'O', -0.29, -2.31, { charge: -1 });
  d.grow('Mb', 'C', 'Ob', 180);
  // The second ester, to the right, its C=O upper left and OMe lower left, the gap between them facing the enolate.
  d.atom('C3', 'C', 3.0, -0.3);
  d.grow('O3', 'O', 'C3', 120, 2);
  d.grow('Oe3', 'O', 'C3', 240);
  d.grow('Me3', 'C', 'Oe3', 300);
  d.grow('C4', 'C', 'C3', 0);
  return {
    id: 'lesson-claisen',
    title: 'The Claisen condensation',
    unit: 'Enolates',
    skill: 'leaving-group',
    level: 2,
    summary: 'Two molecules of methyl ethanoate join, with methoxide as the base, to give methyl 3-oxobutanoate (methyl acetoacetate), a β-keto ester. An ester enolate adds to a second ester, the tetrahedral intermediate expels methoxide, and that methoxide removes the proton between the two C=O groups, which drives the reaction.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Methoxide makes the ester enolate',
        prompt: 'Show methoxide taking an α-proton to make the ester enolate.',
        arrows: [
          { from: 'Ob', to: 'Ob-Ha', says: 'Methoxide takes a proton from the α-carbon.' },
          { from: 'C2-Ha', to: 'C2-C1', side: -1, toSide: -1, says: 'The C–H electrons move in to make a C=C π bond.' },
          { from: 'C1-O1', to: 'O1', says: 'The C=O π electrons move onto oxygen.' },
        ],
        hints: ['Three arrows: base to hydrogen, C–H into C=C, C=O onto oxygen.', 'Any α-hydrogen will do; take the one nearer the base.'],
        explanation: 'An ester enolate and methanol. An ester’s α-hydrogen has a pKa of about 25 and methanol’s is about 15.5, so only a trace of enolate forms. Methoxide is used with a methyl ester so that if it attacks the ester C=O instead, it only swaps methoxy for methoxy.',
      },
      {
        name: 'The enolate adds to a second ester',
        prompt: 'Show the enolate adding, through carbon, to the carbonyl carbon of the second ester.',
        arrows: [
          { from: 'O1', to: 'O1-C1', pair: 2, says: 'A lone pair on the enolate oxygen moves back in to re-form the C=O.' },
          { from: 'C2-C1', to: 'C2-C3', says: 'The C=C π electrons attack the carbonyl carbon of the second ester.' },
          { from: 'C3-O3', to: 'O3', says: 'That ester’s C=O π bond moves onto its oxygen.' },
        ],
        hints: ['The new bond is C–C, from the α-carbon to the other ester’s carbonyl carbon.', 'Three arrows, as in an aldol addition.'],
        explanation: 'A new C–C bond and a tetrahedral intermediate, as in any nucleophilic acyl substitution.',
        move: { C3: [1.87, -0.5], O3: [1.87, 0.5], C4: [2.74, 0], Oe3: [2.37, -1.37], Me3: [3.37, -1.37] },
      },
      {
        name: 'Methoxide leaves',
        prompt: 'Show the intermediate collapsing: the C=O re-forms and methoxide leaves.',
        arrows: [
          { from: 'O3', to: 'O3-C3', pair: 2, says: 'A lone pair on the negative oxygen moves back in to re-form the C=O.' },
          { from: 'C3-Oe3', to: 'Oe3', says: 'The bond to the methoxy oxygen breaks, and methoxide leaves.' },
        ],
        hints: ['Two arrows: one re-forms the C=O, one breaks a bond to carbon.', 'The leaving group is methoxide, the same group the base was.'],
        explanation: 'Methyl 3-oxobutanoate, a β-keto ester, and methoxide. Every step so far can run back, and on its own the equilibrium does not favour this product.',
        move: { Oe3: [2.3, -2.0], Me3: [3.3, -2.0] },
      },
      {
        name: 'Methoxide takes the doubly activated proton',
        prompt: 'Show methoxide removing the proton on the carbon between the two C=O groups.',
        arrows: [
          { from: 'Oe3', to: 'Oe3-Hb', says: 'Methoxide takes the proton on the carbon between the two C=O groups.' },
          { from: 'C2-Hb', to: 'C2-C3', toSide: -1, says: 'The C–H electrons move in to make a C=C π bond.' },
          { from: 'C3-O3', to: 'O3', says: 'The ketone’s C=O π electrons move onto oxygen.' },
        ],
        hints: ['The same three arrows as step 1, now on the new CH2.', 'This CH2 sits between two C=O groups, so its anion is shared with both oxygens.'],
        explanation: 'The enolate of the β-keto ester. A CH2 between two C=O groups has a pKa of about 11, so methoxide removes it almost completely, and that pulls every earlier equilibrium over. That is why a full equivalent of base is used, and why acid is added at the end to give the neutral β-keto ester. An ester whose α-carbon carries only one hydrogen (such as methyl 2-methylpropanoate) gives a β-keto ester with no hydrogen between the two C=O groups, so this last step cannot happen and little product forms.',
        move: { Hb: [1.75, -1.75] },
      },
    ],
    predict: { step: 2, prompt: 'Draw what forms when the intermediate collapses.', hints: ['The C=O re-forms; which group leaves?'] },
    expect: { bonds: ['C2-C3:2', 'C3-O3:1', 'C1-O1:2', 'Oe3-Hb', 'Ob-Ha'], absent: ['C3-Oe3', 'C2-Ha', 'C2-Hb'], charges: { O3: -1 } },
    practise: { template: 'enolate-formation' },
  };
}

export const ENOLATES: readonly LessonDef[] = [aldol(), claisen()];
