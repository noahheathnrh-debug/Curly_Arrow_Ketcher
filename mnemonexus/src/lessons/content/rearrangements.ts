import { Drawing, type LessonDef } from '../kit';

/**
 * Rearrangements: a group moves, with its bonding pair, to a neighbouring electron-poor atom. First the pinacol
 * rearrangement: acid turns 2,3-dimethylbutane-2,3-diol into 3,3-dimethylbutan-2-one, through a carbocation and a
 * 1,2-methyl shift that leaves the positive charge next to an oxygen that can share a lone pair.
 */

function pinacol(): LessonDef {
  const d = new Drawing();
  // C2 on the left keeps its OH (up, its H explicit, upper left) and two methyls (left, and Mm below, the one that moves).
  d.atom('C2', 'C', 0, 0);
  d.grow('O2', 'O', 'C2', 120);
  d.grow('H2', 'H', 'O2', 150);
  d.grow('Me1', 'C', 'C2', 180);
  d.grow('Mm', 'C', 'C2', 270);
  // C3 on the right: the OH that leaves (up) and two methyls.
  d.grow('C3', 'C', 'C2', 0);
  d.grow('O3', 'O', 'C3', 60);
  d.grow('Me3', 'C', 'C3', 0);
  d.grow('Me4', 'C', 'C3', 270);
  // The acid, upper right of O3, and a water molecule upper left of O2 to take the last proton.
  d.atom('Ow', 'O', 3.0, 2.4, { charge: 1 });
  d.grow('Ha', 'H', 'Ow', 225);
  d.atom('Ow2', 'O', -2.2, 2.2);
  return {
    id: 'lesson-pinacol',
    title: 'The pinacol rearrangement',
    unit: 'Rearrangements',
    skill: 'rearrangement',
    level: 3,
    summary: 'Warmed with acid, 2,3-dimethylbutane-2,3-diol (pinacol) loses water and rearranges to 3,3-dimethylbutan-2-one (pinacolone). A methyl group moves to a carbocation, and the neighbouring oxygen’s lone pair stabilises the new cation, giving a protonated C=O.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'An OH is protonated',
        prompt: 'Show the acid protonating the OH on the right-hand carbon.',
        arrows: [
          { from: 'O3', to: 'O3-Ha', says: 'A lone pair on oxygen takes a proton from H3O+.' },
          { from: 'Ha-Ow', to: 'Ow', says: 'The O–H electrons stay on the water.' },
        ],
        hints: ['OH is a poor leaving group; protonated, it can leave as water.'],
        explanation: 'An oxonium ion: the OH has become –OH2+, which can leave as a neutral water molecule. The diol is symmetrical, so either OH would do. Protonation is reversible.',
        move: { Ha: [2.366, 1.366], Ow: [3.6, 1.0] },
      },
      {
        name: 'Water leaves',
        prompt: 'Show water leaving, to make a carbocation.',
        arrows: [
          { from: 'C3-O3', to: 'O3', says: 'The C–O bond breaks and both electrons go with the oxygen: water leaves.' },
        ],
        hints: ['One arrow: the bond to the leaving group breaks towards it.'],
        explanation: 'A tertiary carbocation and water. The positive carbon is trigonal planar (sp2), with an empty p orbital.',
        move: { O3: [2.2, 2.1], Ha: [3.066, 2.6], Me3: [1.5, 0.866], Me4: [1.5, -0.866] },
      },
      {
        name: 'A methyl group moves',
        prompt: 'Show a methyl group moving from the neighbouring carbon to the cation, and the oxygen lone pair stabilising what is left.',
        arrows: [
          { from: 'Mm-C2', to: 'Mm-C3', says: 'The methyl group moves to the positive carbon, taking its bonding pair with it: a 1,2-shift.' },
          { from: 'O2', to: 'O2-C2', pair: 0, toSide: -1, says: 'C2 is left with only three bonds; a lone pair on its oxygen forms a C=O π bond.' },
        ],
        hints: ['The group moves together with the two electrons of its bond, so the arrow starts at that bond and ends at the cation.', 'Which atom next to the new positive carbon has a lone pair to share?'],
        explanation: 'A protonated ketone. The carbon that lost the methyl group is positive, but the oxygen next to it shares a lone pair with it, so the charge is spread onto oxygen (C=O+–H, where every atom has a full octet). This resonance-stabilised ion is more stable than the tertiary cation it came from, and that gain drives the rearrangement.',
        move: { Mm: [1, -1], Me3: [1, 1], Me4: [2, 0] },
      },
      {
        name: 'Water takes the proton',
        prompt: 'Show water taking the proton from the oxygen.',
        arrows: [
          { from: 'Ow2', to: 'Ow2-H2', pair: 1, says: 'A lone pair on water takes the proton.' },
          { from: 'H2-O2', to: 'O2', says: 'The O–H electrons stay on oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: '3,3-Dimethylbutan-2-one and H3O+: the acid is given back, so it is a catalyst. When the diol is not symmetrical, the OH that leaves is the one that gives the more stable carbocation, and a group then moves from the neighbouring carbon, the one that keeps its OH and becomes the C=O. Roughly, hydrogen and aryl groups move most readily, then alkyl groups in the order tertiary > secondary > primary > methyl.',
        move: { H2: [-1.493, 1.493] },
      },
    ],
    predict: { step: 2, prompt: 'Draw what forms when the methyl group has moved and the oxygen has shared a lone pair.', hints: ['Count the bonds on C2 and C3 after the shift.'] },
    expect: { bonds: ['Mm-C3', 'C2-O2:2', 'Ow2-H2', 'O3-Ha', 'C2-C3:1'], absent: ['Mm-C2', 'C3-O3', 'H2-O2'], charges: { Ow2: 1 } },
    practise: { template: 'carbocation-shift' },
  };
}

/**
 * The Baeyer–Villiger oxidation of 3,3-dimethylbutan-2-one (the pinacol product) with peroxyethanoic acid: the peroxy
 * acid adds to the C=O, a proton moves, then the tert-butyl group moves from carbon to oxygen as the weak O–O bond
 * breaks, and the ethanoate takes the last proton. The ketone becomes an ester, tert-butyl ethanoate.
 */
function baeyerVilliger(): LessonDef {
  const d = new Drawing();
  // The ketone: C=O upper left, its methyl left, the tert-butyl group below right.
  d.atom('C1', 'C', 0, 0);
  d.grow('O1', 'O', 'C1', 120, 2);
  d.grow('Me1', 'C', 'C1', 210);
  d.grow('Ct', 'C', 'C1', 300);
  d.grow('Mt1', 'C', 'Ct', 210);
  d.grow('Mt2', 'C', 'Ct', 270);
  d.grow('Mt3', 'C', 'Ct', 330);
  // Peroxyethanoic acid upper right: its OH oxygen (Op) faces the carbonyl carbon.
  d.atom('Op', 'O', 1.6, 1.0);
  d.grow('Hp', 'H', 'Op', 120);
  d.grow('Oq', 'O', 'Op', 330);
  d.grow('Ca', 'C', 'Oq', 30);
  d.grow('Ob', 'O', 'Ca', 90, 2);
  d.grow('Mc', 'C', 'Ca', 330);
  return {
    id: 'lesson-baeyer-villiger',
    title: 'The Baeyer–Villiger oxidation',
    unit: 'Rearrangements',
    skill: 'rearrangement',
    level: 3,
    summary: 'A peroxy acid turns a ketone into an ester by putting an oxygen atom between the carbonyl carbon and one of its groups. Here 3,3-dimethylbutan-2-one becomes tert-butyl ethanoate: the tert-butyl group moves from carbon to oxygen.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The peroxy acid adds to the C=O',
        prompt: 'Show the OH oxygen of the peroxy acid attacking the carbonyl carbon.',
        arrows: [
          { from: 'Op', to: 'Op-C1', says: 'A lone pair on the peroxy acid’s OH oxygen attacks the carbonyl carbon.' },
          { from: 'C1-O1', to: 'O1', says: 'The C=O π electrons move onto oxygen.' },
        ],
        hints: ['A carbonyl addition: the nucleophile is an oxygen of the peroxy acid.'],
        explanation: 'A tetrahedral intermediate with a positive oxygen and a negative one. In practice an acid catalyst (often the peroxy acid itself) protonates the C=O first, which makes it a better electrophile.',
        move: { Op: [0.866, 0.5], Hp: [0.366, 1.366], Oq: [1.732, 0], Ca: [2.598, 0.5], Ob: [2.598, 1.5], Mc: [3.464, 0] },
      },
      {
        name: 'A proton moves',
        prompt: 'Show the negative oxygen taking the proton from the positive one.',
        arrows: [
          { from: 'O1', to: 'O1-Hp', pair: 1, says: 'The O− takes the proton.' },
          { from: 'Hp-Op', to: 'Op', says: 'The O–H electrons stay on the peroxy oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: 'The Criegee intermediate: a carbon carrying an OH and an O–O group. The O–O bond is weak, and the carboxylate on its far side is a good leaving group. (In solution the proton is passed on by the solvent or another peroxy acid molecule; the arrows show only the result.)',
        move: { Hp: [0, 1.732] },
      },
      {
        name: 'The tert-butyl group moves to oxygen',
        prompt: 'Show the tert-butyl group moving from carbon to the near oxygen as the O–O bond breaks.',
        arrows: [
          { from: 'O1', to: 'O1-C1', pair: 1, says: 'A lone pair on the OH oxygen moves in to form a C=O.' },
          { from: 'Ct-C1', to: 'Ct-Op', says: 'The tert-butyl group moves, with its bonding pair, from carbon to the neighbouring oxygen.' },
          { from: 'Op-Oq', to: 'Oq', says: 'The O–O bond breaks and ethanoate leaves, taking both electrons.' },
        ],
        hints: ['Three arrows at once: the OH pushes, a group moves, the O–O bond breaks.', 'The group moves to an electron-poor oxygen, just as a methyl group moved to an electron-poor carbon in the pinacol rearrangement.'],
        explanation: 'A protonated ester and ethanoate. The group that moves must lie anti to the breaking O–O bond, and it keeps its configuration as it moves. Which group moves is decided by migratory aptitude: tertiary alkyl > secondary alkyl ≈ aryl > primary alkyl > methyl (aryl varies with its substituents). The group best able to carry the developing positive charge moves, so here the tert-butyl group moves, not the methyl.',
        move: { Ct: [1.366, -0.366], Mt1: [0.5, -0.866], Mt2: [1.366, -1.366], Mt3: [2.232, -0.866], Oq: [1.0, 2.2], Ca: [2.0, 2.2], Ob: [2.5, 3.066], Mc: [2.5, 1.334] },
      },
      {
        name: 'Ethanoate takes the proton',
        prompt: 'Show ethanoate taking the proton from the protonated ester.',
        arrows: [
          { from: 'Oq', to: 'Oq-Hp', says: 'A lone pair on ethanoate takes the proton.' },
          { from: 'Hp-O1', to: 'O1', says: 'The O–H electrons stay on oxygen: a neutral ester.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: 'tert-Butyl ethanoate and ethanoic acid. A ketone has become an ester; a cyclic ketone becomes a lactone, its ring one atom larger. In the laboratory the usual reagent is mCPBA (3-chloroperoxybenzoic acid).',
        move: { Hp: [0, 2.2] },
      },
    ],
    predict: { step: 2, prompt: 'Draw what forms when the tert-butyl group has moved and the O–O bond has broken.', hints: ['Which oxygen does the tert-butyl group end up on?'] },
    expect: { bonds: ['C1-O1:2', 'C1-Op:1', 'Op-Ct:1', 'Oq-Hp', 'Ca-Ob:2', 'Oq-Ca:1'], absent: ['C1-Ct', 'Op-Oq', 'Hp-O1', 'Hp-Op'] },
  };
}

/**
 * The Beckmann rearrangement of (E)-butanone oxime: acid protonates the OH, the ethyl group (anti to it) moves from
 * carbon to nitrogen as water leaves, water adds to the nitrilium ion, and a proton is lost. The imidic acid then
 * tautomerises to N-ethylethanamide.
 */
function beckmann(): LessonDef {
  const d = new Drawing();
  // The C=N upright, carbon below; the OH upper right of nitrogen; the ethyl group (anti to the OH) lower left of
  // carbon and the methyl (syn) lower right.
  d.atom('C1', 'C', 0, 0);
  d.grow('N', 'N', 'C1', 90, 2);
  d.grow('Oo', 'O', 'N', 30);
  d.grow('Ho', 'H', 'Oo', 330);
  d.grow('Ce1', 'C', 'C1', 210);
  d.grow('Ce2', 'C', 'Ce1', 150);
  d.grow('Cm', 'C', 'C1', 330);
  // H3O+ upper right of the OH.
  d.atom('Ow', 'O', 2.4, 2.9, { charge: 1 });
  d.grow('Ha', 'H', 'Ow', 225);
  return {
    id: 'lesson-beckmann',
    title: 'The Beckmann rearrangement',
    unit: 'Rearrangements',
    skill: 'rearrangement',
    level: 3,
    summary: 'In acid, a ketone oxime rearranges to an amide. Here (E)-butanone oxime gives N-ethylethanamide: the ethyl group, anti to the OH, moves from carbon to nitrogen as water leaves.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The OH is protonated',
        prompt: 'Show the acid protonating the oxime’s OH.',
        arrows: [
          { from: 'Oo', to: 'Oo-Ha', says: 'A lone pair on the OH oxygen takes a proton from H3O+.' },
          { from: 'Ha-Ow', to: 'Ow', says: 'The O–H electrons stay on the water.' },
        ],
        hints: ['OH is a poor leaving group; protonated, it can leave as water.'],
        explanation: 'The OH has become –OH2+, which can leave as water. Nitrogen is the more basic atom, but protonation there is a dead end that simply reverses; only the O-protonated oxime can lose water. In the laboratory concentrated sulfuric acid is used, or a reagent such as PCl5 or TsCl that turns the OH into a leaving group another way.',
        move: { Ha: [0.866, 2.5], Ow: [2.2, 3.2] },
      },
      {
        name: 'The ethyl group moves as water leaves',
        prompt: 'Show the group anti to the OH2+ moving from carbon to nitrogen as water leaves.',
        arrows: [
          { from: 'Ce1-C1', to: 'Ce1-N', side: -1, says: 'The ethyl group, anti to the leaving water, moves from carbon to nitrogen with its bonding pair.' },
          { from: 'N-Oo', to: 'Oo', says: 'At the same time the N–O bond breaks and water leaves.' },
        ],
        hints: ['Two arrows at once: a group moves to nitrogen as water leaves.', 'Which group on carbon is on the opposite side of the C=N from the OH2+?'],
        explanation: 'A cation shared between carbon and nitrogen. The nitrogen lone pair can form a third C–N bond, so it is better drawn as a nitrilium ion, CH3–C≡N+–CH2CH3, with a full octet on every atom. The ethyl group moves, not the methyl, because it is anti (trans) to the leaving group across the C=N: its bond lies opposite the breaking N–O bond, so it can move to nitrogen as the water leaves. A group with a stereocentre keeps its configuration as it moves.',
        move: { Ce1: [0, 2], Ce2: [0.866, 2.5], Cm: [0, -1], Oo: [-1.5, 0.1], Ho: [-2.0, -0.766], Ha: [-2.0, 0.966] },
      },
      {
        name: 'Water adds to the cation',
        prompt: 'Show the water molecule adding to the positive carbon.',
        arrows: [
          { from: 'Oo', to: 'Oo-C1', says: 'A lone pair on water attacks the positive carbon.' },
        ],
        hints: ['Water is the nucleophile; the carbon with only three bonds is the electrophile.'],
        explanation: 'A protonated imidic acid. In the nitrilium picture, one of the C≡N π bonds moves onto nitrogen as water adds; the result is the same. Water adds here just as it adds to a protonated nitrile.',
        move: { Oo: [-0.866, -0.5], Ho: [-1.732, 0], Ha: [-0.866, -1.5], Cm: [0.866, -0.5], Ce1: [0.866, 1.5], Ce2: [1.732, 1.0], Ow: [-0.866, -2.8] },
      },
      {
        name: 'Water takes a proton',
        prompt: 'Show the other water molecule taking a proton from the OH2+.',
        arrows: [
          { from: 'Ow', to: 'Ow-Ha', says: 'A lone pair on water takes the proton.' },
          { from: 'Ha-Oo', to: 'Oo', says: 'The O–H electrons stay on oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: 'An imidic acid, and H3O+ given back. An imidic acid is the less stable tautomer of an amide, as an enol is of a ketone: a proton moves from oxygen to nitrogen and the C=N becomes a C=O, giving N-ethylethanamide. A cyclic oxime gives a lactam with a ring one atom larger: cyclohexanone oxime gives caprolactam, which is polymerised to make nylon-6.',
        move: { Ha: [-0.866, -1.9] },
      },
    ],
    predict: { step: 2, prompt: 'Draw what forms when water adds to the cation.', hints: ['The ethyl group is now on nitrogen; water bonds to the carbon.'] },
    expect: { bonds: ['Ce1-N', 'C1-N:2', 'Oo-C1:1', 'Ow-Ha', 'Oo-Ho'], absent: ['Ce1-C1', 'N-Oo', 'Ha-Oo'], charges: { Ow: 1 } },
    practise: { template: 'beckmann' },
  };
}

export const REARRANGEMENTS: LessonDef[] = [pinacol(), baeyerVilliger(), beckmann()];
