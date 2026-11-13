import { Drawing, type LessonDef } from '../kit';

/**
 * The carbonyl unit after cyanohydrins, from the standard first-year account: reduction by sodium borohydride, a
 * Grignard addition, hemiacetal and acetal formation under acid, and imine formation. Hydride and the Grignard
 * reagent's carbon are drawn as the anions they behave as (the engine treats metals as spectator ions, and borohydride
 * is shown only by the hydride it gives), and the text says so.
 */

function hydrideReduction(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 90, 2);
  d.grow('Ma', 'C', 'C1', 210);
  d.grow('Mb', 'C', 'C1', 330);
  d.atom('Hh', 'H', 0, -1.7, { charge: -1 });
  d.atom('Hm', 'H', 1.1, 1.5);
  d.grow('Om', 'O', 'Hm', 0);
  d.grow('Cm', 'C', 'Om', 60);
  return {
    id: 'lesson-hydride-reduction',
    title: 'Reducing a ketone with sodium borohydride',
    unit: 'Carbonyl addition',
    skill: 'carbonyl-addition',
    level: 1,
    summary: 'Sodium borohydride reduces propanone to propan-2-ol. A hydride ion from borohydride adds to the carbonyl carbon, and the solvent, methanol, protonates the alkoxide.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Hydride adds',
        prompt: 'Show hydride adding to the carbonyl carbon.',
        arrows: [
          { from: 'Hh', to: 'Hh-C1', says: 'Borohydride, BH4−, delivers a hydride ion: a hydrogen with two electrons. Drawn here on its own, it attacks the electron-poor carbonyl carbon.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['The nucleophile is the hydride: hydrogen with a negative charge and a pair of electrons.', 'It attacks carbon, and the C=O π bond moves onto oxygen.'],
        explanation: 'An alkoxide. The carbon now carries a new C–H bond: the ketone has been reduced. In principle each borohydride can deliver all four of its hydrogens, so a quarter of a mole of NaBH4 reduces a mole of ketone.',
        move: { Hh: [0, -1] },
      },
      {
        name: 'Methanol protonates the alkoxide',
        prompt: 'Show the alkoxide taking a proton from methanol.',
        arrows: [
          { from: 'O', to: 'O-Hm', says: 'The negative oxygen is a strong base: a lone pair takes methanol’s O–H proton.' },
          { from: 'Hm-Om', to: 'Om', says: 'The O–H bond’s electrons stay on methanol’s oxygen, which becomes methoxide.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The acid is the solvent, methanol.'],
        explanation: 'Propan-2-ol, a secondary alcohol. A ketone reduces to a secondary alcohol and an aldehyde to a primary one. Sodium borohydride is mild enough to use in methanol or water, and it leaves esters and carboxylic acids alone.',
        move: { Hm: [0.87, 1.5], Om: [2.3, 1.3], Cm: [2.8, 2.17] },
      },
    ],
    predict: { step: 0, prompt: 'Draw what the hydride attack makes.', hints: ['Carbon gains a C–H bond; where do the C=O π electrons go?'] },
    expect: { bonds: ['Hh-C1', 'C1-O:1', 'O-Hm'], absent: ['Hm-Om'], charges: { Om: -1 } },
    practise: { template: 'carbonyl-addition' },
  };
}

function grignard(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 90, 2);
  d.grow('C2', 'C', 'C1', 210);
  d.atom('Cg', 'C', 1.5, -0.9, { charge: -1 });
  d.atom('Hw', 'H', 1.2, 1.6);
  d.grow('Ow', 'O', 'Hw', 0, 1, { charge: 1 });
  return {
    id: 'lesson-grignard',
    title: 'A Grignard reagent adds to an aldehyde',
    unit: 'Carbonyl addition',
    skill: 'carbonyl-addition',
    level: 1,
    summary: 'Methylmagnesium bromide adds its methyl group to ethanal, making a new C–C bond; dilute acid then protonates the alkoxide to give propan-2-ol.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The methyl group adds',
        prompt: 'Show the methyl carbanion adding to the carbonyl carbon.',
        arrows: [
          { from: 'Cg', to: 'Cg-C1', says: 'Carbon is far more electronegative than magnesium, so the C–Mg bond’s electrons sit on carbon. Drawn here as a carbanion, its pair attacks the carbonyl carbon.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['The nucleophile is the methyl carbon, which carries the negative charge.', 'A new C–C bond forms; the C=O π bond moves onto oxygen.'],
        explanation: 'A magnesium alkoxide (the MgBr+ is left off). The reaction is run in dry ether: water or an alcohol would protonate the Grignard reagent first, giving methane.',
        move: { Cg: [0.87, -0.5] },
      },
      {
        name: 'Work-up with dilute acid',
        prompt: 'Show the alkoxide taking a proton from hydronium.',
        arrows: [
          { from: 'O', to: 'O-Hw', says: 'Once the addition is over, dilute acid is added: the alkoxide takes a proton from hydronium.' },
          { from: 'Hw-Ow', to: 'Ow', says: 'The O–H bond’s electrons stay on oxygen, leaving water.' },
        ],
        hints: ['A proton transfer: two arrows.', 'Start at a lone pair on the negative oxygen.'],
        explanation: 'Propan-2-ol. Grignard additions build carbon chains: methanal gives a primary alcohol, other aldehydes secondary alcohols, and ketones tertiary ones.',
        move: { Hw: [0.87, 1.5], Ow: [2.1, 1.7] },
      },
    ],
    predict: { step: 0, prompt: 'Draw what the addition makes.', hints: ['Which new C–C bond forms, and where does the charge go?'] },
    expect: { bonds: ['Cg-C1', 'C1-O:1', 'O-Hw'], absent: ['Hw-Ow'], charges: {} },
    practise: { template: 'grignard-addition' },
  };
}

function hemiacetal(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 90, 2);
  d.grow('C2', 'C', 'C1', 210);
  // The acid catalyst (protonated methanol) by the carbonyl oxygen; the methanol that adds below and to the right.
  d.atom('Hp', 'H', 1.0, 1.6);
  d.grow('Op', 'O', 'Hp', 0, 1, { charge: 1 });
  d.grow('Cp', 'C', 'Op', 60);
  d.atom('Oa', 'O', 1.6, -0.95);
  d.grow('Ha', 'H', 'Oa', 270);
  d.grow('Ca', 'C', 'Oa', 0);
  d.atom('Ob', 'O', 0.2, -3.0);
  d.grow('Cb', 'C', 'Ob', 210);
  return {
    id: 'lesson-hemiacetal',
    title: 'Hemiacetal formation, catalysed by acid',
    unit: 'Carbonyl addition',
    skill: 'carbonyl-addition',
    level: 2,
    summary: 'Methanol adds to ethanal with an acid catalyst, giving the hemiacetal 1-methoxyethan-1-ol. The acid protonates the carbonyl, methanol adds, and a proton passes to another methanol, regenerating the acid catalyst.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The carbonyl is protonated',
        prompt: 'Show the carbonyl oxygen taking a proton from the acid.',
        arrows: [
          { from: 'O', to: 'O-Hp', says: 'A lone pair on the carbonyl oxygen takes a proton from protonated methanol, the acid in this solution.' },
          { from: 'Hp-Op', to: 'Op', says: 'The O–H bond’s electrons stay on the acid’s oxygen, which becomes a neutral methanol.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The base is the carbonyl oxygen.'],
        explanation: 'A protonated carbonyl. The positive charge is shared with the carbon (the resonance form C+–OH), so the carbon is now far more electron-poor than before.',
        move: { Hp: [0.87, 1.5], Op: [2.3, 1.9], Cp: [2.8, 2.77] },
      },
      {
        name: 'Methanol adds',
        prompt: 'Show methanol adding to the protonated carbonyl.',
        arrows: [
          { from: 'Oa', to: 'Oa-C1', says: 'Methanol is a weak nucleophile, but the protonated carbonyl is a strong electrophile: a lone pair on its oxygen attacks the carbon.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto the positive oxygen, which becomes a neutral OH.' },
        ],
        hints: ['The nucleophile is the oxygen of the methanol below.', 'The π electrons go to the positive oxygen.'],
        explanation: 'An oxonium ion: the oxygen that attacked has three bonds and the positive charge.',
        move: { Oa: [0.87, -0.5], Ha: [0.87, -1.5], Ca: [1.74, 0] },
      },
      {
        name: 'A proton is lost',
        prompt: 'Show a second methanol taking the proton from the oxonium ion.',
        arrows: [
          { from: 'Ob', to: 'Ob-Ha', says: 'A lone pair on another methanol takes the proton from the positive oxygen.' },
          { from: 'Ha-Oa', to: 'Oa', says: 'The O–H bond’s electrons stay on oxygen, which loses its charge.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The base is the methanol at the bottom.'],
        explanation: '1-methoxyethan-1-ol, a hemiacetal: one carbon carrying both an OH and an OR. Protonated methanol has formed again, so the acid is a catalyst. Each step can run backwards: in excess methanol a simple aldehyde is largely converted to its hemiacetal, but an open-chain hemiacetal cannot usually be isolated, because it falls back to the aldehyde and alcohol. Cyclic hemiacetals, such as sugars, are stable.',
        move: { Ha: [0.87, -2.0] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what methanol’s addition makes.', hints: ['The new O–C bond leaves which oxygen positive?'] },
    expect: { bonds: ['Oa-C1', 'C1-O:1', 'O-Hp', 'Ob-Ha'], absent: ['Hp-Op', 'Ha-Oa'], charges: { Ob: 1 } },
    practise: { template: 'protonated-carbonyl-addition' },
  };
}

function acetal(): LessonDef {
  const d = new Drawing();
  // The hemiacetal from the lesson before: C1 with its methoxy group up, a methyl, and the OH down and to the right.
  d.atom('C1', 'C', 0, 0);
  d.grow('Om', 'O', 'C1', 90);
  d.grow('Cm', 'C', 'Om', 30);
  d.grow('C2', 'C', 'C1', 210);
  d.grow('Oh', 'O', 'C1', 330);
  d.atom('Hp', 'H', 1.9, -0.2);
  d.grow('Op', 'O', 'Hp', 0, 1, { charge: 1 });
  d.grow('Cp', 'C', 'Op', 60);
  d.atom('On', 'O', 0.3, -2.4);
  d.grow('Hn', 'H', 'On', 330);
  d.grow('Cn', 'C', 'On', 210);
  return {
    id: 'lesson-acetal',
    title: 'From hemiacetal to acetal',
    unit: 'Carbonyl addition',
    skill: 'leaving-group',
    level: 2,
    summary: 'With acid and more methanol, the hemiacetal becomes the acetal 1,1-dimethoxyethane. Its OH is protonated and leaves as water, pushed out by the methoxy group’s lone pair, and a second methanol adds.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The OH is protonated',
        prompt: 'Show the OH group taking a proton from the acid.',
        arrows: [
          { from: 'Oh', to: 'Oh-Hp', says: 'A lone pair on the OH oxygen takes a proton from protonated methanol.' },
          { from: 'Hp-Op', to: 'Op', says: 'The O–H bond’s electrons stay on the acid’s oxygen.' },
        ],
        hints: ['A proton transfer: two arrows.', 'Hydroxide is a poor leaving group; water is a good one.'],
        explanation: 'The OH has become OH2+, which can leave as a neutral water molecule.',
        move: { Hp: [1.37, -1.37], Op: [3.2, -0.2], Cp: [3.7, 0.67] },
      },
      {
        name: 'Water leaves',
        prompt: 'Show the methoxy lone pair pushing out water.',
        arrows: [
          { from: 'Om', to: 'Om-C1', says: 'A lone pair on the methoxy oxygen moves in to make a π bond to carbon.' },
          { from: 'C1-Oh', to: 'Oh', says: 'At the same time the C–O bond to the protonated OH breaks, and water leaves.' },
        ],
        hints: ['Two arrows: a lone pair makes the new π bond, and the C–OH2+ bond breaks.', 'The lone pair comes from the oxygen already on the carbon.'],
        explanation: 'An oxocarbenium ion and water. Oxygen’s lone pair makes up the carbon’s missing electrons, so every atom has an octet. The positive charge sits formally on oxygen but is shared with carbon (C+–OMe and C=O+Me), which is why the carbon is attacked next.',
        move: { Oh: [1.9, -0.9], Hp: [2.4, -1.77] },
      },
      {
        name: 'Methanol adds',
        prompt: 'Show a second methanol adding to the oxocarbenium ion.',
        arrows: [
          { from: 'On', to: 'On-C1', says: 'A lone pair on methanol attacks the carbon of the oxocarbenium ion.' },
          { from: 'C1-Om', to: 'Om', says: 'The C=O π bond moves back onto the methoxy oxygen, which loses its charge.' },
        ],
        hints: ['The nucleophile is the methanol below.', 'The π electrons return to the oxygen they came from.'],
        explanation: 'An oxonium ion, one proton away from the acetal.',
        // The new methoxy group takes the place water left; the water drifts below it, ready to take the proton.
        move: { On: [0.87, -0.5], Hn: [0.87, -1.5], Cn: [1.74, 0], Oh: [2.2, -2.2], Hp: [2.7, -3.07] },
      },
      {
        name: 'A proton is lost',
        prompt: 'Show water taking the proton from the oxonium ion.',
        arrows: [
          { from: 'Oh', to: 'Oh-Hn', says: 'A lone pair on the water released in step 2 takes the proton from the positive oxygen. Methanol could do the same.' },
          { from: 'Hn-On', to: 'On', says: 'The O–H bond’s electrons stay on oxygen, which loses its charge.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The base is the water molecule below.'],
        explanation: '1,1-dimethoxyethane, an acetal: one carbon carrying two OR groups. The acid catalyst forms again, as hydronium. Every step is reversible, so an excess of alcohol, or removing the water, drives the reaction forward, and aqueous acid turns an acetal back into the aldehyde.',
        move: { Hn: [1.6, -1.5] },
      },
    ],
    predict: { step: 1, prompt: 'Draw the ion that forms when water leaves.', hints: ['Which oxygen ends up double-bonded to carbon, and charged?'] },
    expect: { bonds: ['On-C1', 'C1-Om:1', 'Oh-Hn', 'Oh-Hp'], absent: ['C1-Oh', 'Hn-On', 'Hp-Op'], charges: { Oh: 1 } },
    practise: { template: 'water-loss' },
  };
}

function imine(): LessonDef {
  const d = new Drawing();
  // Propanone with its oxygen down and the amine coming in from above. Nitrogen keeps its methyl straight up and its
  // last H to the right, so its lone pair faces the open left side when it pushes water out (step 4): any other
  // arrangement took the editor's arrow router 3 to 18 seconds to draw (timed 2026-11-11).
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 270, 2);
  d.grow('Ma', 'C', 'C1', 150);
  d.grow('Mb', 'C', 'C1', 30);
  d.atom('Nn', 'N', 0, 1.8);
  d.grow('Cn', 'C', 'Nn', 90);
  d.grow('Hx', 'H', 'Nn', 30);
  d.grow('Hn', 'H', 'Nn', 150);
  d.atom('Hp', 'H', 1.3, -1.6);
  d.grow('Ow', 'O', 'Hp', 0, 1, { charge: 1 });
  return {
    id: 'lesson-imine',
    title: 'Imine formation',
    unit: 'Carbonyl addition',
    skill: 'carbonyl-addition',
    level: 2,
    summary: 'Methylamine and propanone give an imine in weak acid. The amine adds, a proton moves from nitrogen to oxygen, the OH is protonated and pushed out as water by nitrogen’s lone pair, and nitrogen loses its last proton.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The amine adds',
        prompt: 'Show methylamine adding to the carbonyl carbon.',
        arrows: [
          { from: 'Nn', to: 'Nn-C1', says: 'The lone pair on nitrogen attacks the carbonyl carbon.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['The nucleophile is the nitrogen of methylamine.', 'Nitrogen gives a pair, so it ends up positive; oxygen ends up negative.'],
        explanation: 'A zwitterion: positive nitrogen and negative oxygen in the same molecule.',
        // The carbon is tetrahedral now: its methyls are redrawn either side of the oxygen.
        move: { Nn: [0, 1], Cn: [0, 2], Hx: [0.87, 1.5], Hn: [-0.87, 1.5], Ma: [-0.87, -0.5], Mb: [0.87, -0.5] },
      },
      {
        name: 'A proton moves to oxygen',
        prompt: 'Show the proton moving from nitrogen to oxygen.',
        arrows: [
          { from: 'O', to: 'O-Hn', says: 'The negative oxygen takes a proton from the positive nitrogen. In solution, water molecules pass it along; it is drawn here as one move.' },
          { from: 'Hn-Nn', to: 'Nn', says: 'The N–H bond’s electrons stay on nitrogen, which loses its charge.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The base is the negative oxygen.'],
        explanation: 'A carbinolamine: a carbon with both an OH and an amino group. It is the nitrogen version of a hemiacetal.',
        move: { Hn: [-0.5, -1.87] },
      },
      {
        name: 'The OH is protonated',
        prompt: 'Show the OH taking a proton from hydronium.',
        arrows: [
          { from: 'O', to: 'O-Hp', says: 'A lone pair on the OH oxygen takes a proton from hydronium.' },
          { from: 'Hp-Ow', to: 'Ow', says: 'The O–H bond’s electrons stay on oxygen, leaving water.' },
        ],
        hints: ['A proton transfer: two arrows.', 'Turning OH into OH2+ makes it a good leaving group.'],
        explanation: 'The OH is now OH2+, ready to leave as water.',
        move: { Hp: [0.5, -1.87] },
      },
      {
        name: 'Water leaves',
        prompt: 'Show nitrogen’s lone pair pushing out water.',
        arrows: [
          { from: 'Nn', to: 'Nn-C1', says: 'The lone pair on nitrogen moves in to make a C=N π bond.' },
          { from: 'C1-O', to: 'O', says: 'The C–O bond breaks and water leaves with both electrons.' },
        ],
        hints: ['Two arrows: a lone pair makes the new π bond, and the C–OH2+ bond breaks.', 'The lone pair comes from nitrogen.'],
        explanation: 'An iminium ion and water. Nitrogen gives up its lone pair more readily than oxygen, so this step is easier than the matching step in acetal formation.',
        move: { O: [0, -2.1], Hn: [-0.5, -2.97], Hp: [0.5, -2.97], Ow: [2.5, 2.1] },
      },
      {
        name: 'Nitrogen loses a proton',
        prompt: 'Show water taking the proton from nitrogen.',
        arrows: [
          { from: 'Ow', to: 'Ow-Hx', says: 'A lone pair on water takes the proton from the positive nitrogen.' },
          { from: 'Hx-Nn', to: 'Nn', says: 'The N–H bond’s electrons stay on nitrogen as its lone pair.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The base is the water molecule on the right.'],
        explanation: 'N-methylpropan-2-imine and hydronium. Imine formation is typically fastest at about pH 4 to 5: enough acid to protonate the OH, but not so much that the amine is protonated and can no longer add.',
        move: { Hx: [1.6, 1.75] },
      },
    ],
    predict: { step: 3, prompt: 'Draw the ion that forms when water leaves.', hints: ['Which atom ends up double-bonded to carbon, and charged?'] },
    expect: { bonds: ['Nn-C1:2', 'O-Hn', 'O-Hp', 'Ow-Hx'], absent: ['C1-O', 'Hx-Nn', 'Hp-Ow', 'Hn-Nn'], charges: { Ow: 1 } },
    practise: { template: 'water-loss' },
  };
}

function enamine(): LessonDef {
  const d = new Drawing();
  // The imine lesson's layout, which the arrow router draws quickly (see imine()). Dimethylamine has a methyl where
  // methylamine had its last H, and the right-hand methyl of propanone carries the H that is lost at the end.
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 270, 2);
  d.grow('Ma', 'C', 'C1', 150);
  d.grow('Mb', 'C', 'C1', 30);
  d.grow('Ha', 'H', 'Mb', 330);
  d.atom('Nn', 'N', 0, 1.8);
  d.grow('Cn', 'C', 'Nn', 90);
  d.grow('Cm', 'C', 'Nn', 30);
  d.grow('Hn', 'H', 'Nn', 150);
  d.atom('Hp', 'H', 1.3, -1.6);
  d.grow('Ow', 'O', 'Hp', 0, 1, { charge: 1 });
  return {
    id: 'lesson-enamine',
    title: 'Enamine formation',
    unit: 'Carbonyl addition',
    skill: 'carbonyl-addition',
    level: 3,
    summary: 'Dimethylamine, a secondary amine, reacts with propanone in weak acid just as a primary amine does in imine formation, as far as the iminium ion, a cation with a C=N+ bond. That nitrogen has no hydrogen left to lose, so a proton is lost from the carbon next to the C=N+ instead, giving an enamine: an amino group on a C=C.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The amine adds',
        prompt: 'Show dimethylamine adding to the carbonyl carbon.',
        arrows: [
          { from: 'Nn', to: 'Nn-C1', says: 'The lone pair on nitrogen attacks the carbonyl carbon.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['The nucleophile is the nitrogen of dimethylamine, which has only one N–H.', 'Nitrogen gives a pair, so it ends up positive; oxygen ends up negative.'],
        explanation: 'A zwitterion, as in imine formation: positive nitrogen and negative oxygen in the same molecule.',
        move: { Nn: [0, 1], Cn: [0, 2], Cm: [0.87, 1.5], Hn: [-0.87, 1.5], Ma: [-0.87, -0.5], Mb: [0.87, -0.5] },
      },
      {
        name: 'A proton moves to oxygen',
        prompt: 'Show the proton moving from nitrogen to oxygen.',
        arrows: [
          { from: 'O', to: 'O-Hn', says: 'The negative oxygen takes a proton from the positive nitrogen. In solution, water molecules pass it along; it is drawn here as one move.' },
          { from: 'Hn-Nn', to: 'Nn', says: 'The N–H bond’s electrons stay on nitrogen, which loses its charge.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The base is the negative oxygen.'],
        explanation: 'A carbinolamine. The proton that was on nitrogen is now on oxygen, so nitrogen has no hydrogen left, which decides how the last step goes.',
        move: { Hn: [-0.5, -1.87] },
      },
      {
        name: 'The OH is protonated',
        prompt: 'Show the OH taking a proton from hydronium.',
        arrows: [
          { from: 'O', to: 'O-Hp', says: 'A lone pair on the OH oxygen takes a proton from hydronium.' },
          { from: 'Hp-Ow', to: 'Ow', says: 'The O–H bond’s electrons stay on oxygen, leaving water.' },
        ],
        hints: ['A proton transfer: two arrows.', 'Turning OH into OH2+ makes it a good leaving group.'],
        explanation: 'The OH is now OH2+, ready to leave as water.',
        move: { Hp: [0.5, -1.87] },
      },
      {
        name: 'Water leaves',
        prompt: 'Show nitrogen’s lone pair pushing out water.',
        arrows: [
          { from: 'Nn', to: 'Nn-C1', says: 'The lone pair on nitrogen moves in to make a C=N π bond.' },
          { from: 'C1-O', to: 'O', says: 'The C–O bond breaks and water leaves with both electrons.' },
        ],
        hints: ['Two arrows: a lone pair makes the new π bond, and the C–OH2+ bond breaks.', 'The lone pair comes from nitrogen.'],
        explanation: 'An iminium ion. Its nitrogen carries two methyl groups and no hydrogen, so, unlike in imine formation, it cannot lose a proton from nitrogen to become neutral.',
        move: { O: [0, -2.1], Hn: [-0.5, -2.97], Hp: [0.5, -2.97], Ow: [3.2, 0.85] },
      },
      {
        name: 'A proton leaves from carbon',
        prompt: 'Show water taking a proton from the carbon next to the C=N+.',
        arrows: [
          { from: 'Ow', to: 'Ow-Ha', says: 'A lone pair on water takes a proton from the carbon next to the C=N+.' },
          { from: 'Ha-Mb', to: 'Mb-C1', says: 'The C–H bond’s electrons move in to make a C=C π bond.' },
          { from: 'C1-Nn', to: 'Nn', says: 'The C=N π bond’s electrons move back onto nitrogen, which loses its charge.' },
        ],
        hints: ['Three arrows: the base takes the proton, the C–H electrons make a C=C, and the C=N π electrons move onto nitrogen.', 'The same pattern as an enol forming from a protonated ketone, with nitrogen in place of oxygen.'],
        explanation: 'N,N-Dimethylprop-1-en-2-amine, an enamine, and hydronium. Every step is reversible, so in the laboratory the water is removed as it forms. The usual example is cyclohexanone with pyrrolidine. Nitrogen’s lone pair makes the carbon at the other end of the C=C (the CH2 here) nucleophilic, like an enolate’s but in a neutral molecule: in the Stork enamine reaction that carbon is alkylated or acylated, and the iminium ion formed is then hydrolysed back to a ketone.',
        move: { Ha: [2.2, 0.85] },
      },
    ],
    predict: { prompt: 'Draw the enamine that forms when the iminium ion loses a proton from carbon.', hints: ['Nitrogen keeps its two methyl groups and ends up neutral.', 'Which carbon–carbon bond becomes double?'] },
    expect: { bonds: ['C1-Mb:2', 'C1-Nn:1', 'O-Hn', 'O-Hp', 'Ow-Ha'], absent: ['C1-O', 'Hn-Nn', 'Hp-Ow', 'Ha-Mb'], charges: { Ow: 1 } },
    practise: { template: 'water-loss' },
  };
}

export const CARBONYLS: readonly LessonDef[] = [hydrideReduction(), grignard(), hemiacetal(), acetal(), imine(), enamine()];
