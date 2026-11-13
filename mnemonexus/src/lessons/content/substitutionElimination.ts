import { Drawing, type LessonDef } from '../kit';

/**
 * Substitution and elimination after SN2: SN1, E2 and E1, from the standard first-year account (2-bromo-2-methylpropane
 * for the two that go through a carbocation, 2-bromopropane for E2). Arrows checked by the engine, products by `expect`.
 */

/** 2-bromo-2-methylpropane: the central carbon C with bromine pointing down and three methyls M1 (up), M2, M3. */
function tertButylBromide(d: Drawing) {
  d.atom('C', 'C', 0, 0);
  d.grow('Br', 'Br', 'C', 270);
  d.grow('M1', 'C', 'C', 90);
  d.grow('M2', 'C', 'C', 210);
  d.grow('M3', 'C', 'C', 330);
}

function sn1(): LessonDef {
  const d = new Drawing();
  tertButylBromide(d);
  d.atom('Ow', 'O', -1.9, -1.5);
  d.grow('Hw', 'H', 'Ow', 180);
  d.atom('Ox', 'O', -4.0, -1.5);
  return {
    id: 'lesson-sn1',
    title: 'SN1: substitution through a carbocation',
    unit: 'Substitution and elimination',
    skill: 'substitution',
    level: 2,
    summary: 'Water replaces bromide on 2-bromo-2-methylpropane in three steps: the bromide leaves on its own first, water captures the flat carbocation, and a second water takes a proton.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The leaving group leaves',
        prompt: 'Show the C–Br bond breaking on its own.',
        arrows: [{ from: 'C-Br', to: 'Br', says: 'The C–Br bond breaks with both electrons going to bromine. No nucleophile takes part: the polar solvent stabilises the ions as they form. This slow step is why the rate depends only on the halide.' }],
        hints: ['One arrow, from the C–Br bond to bromine.', 'Carbon is left with three bonds and a positive charge.'],
        explanation: 'A tertiary carbocation and bromide. Three alkyl groups stabilise the positive carbon, mainly by hyperconjugation (their C–H bonds overlap with its empty p orbital) and by pushing electron density towards it. That is why tertiary halides ionise and primary ones do not.',
        move: { Br: [0.9, -2.3] },
      },
      {
        name: 'Water captures the carbocation',
        prompt: 'Show water bonding to the carbocation.',
        arrows: [{ from: 'Ow', to: 'Ow-C', says: 'A lone pair on water’s oxygen fills the empty p orbital of the flat carbocation. It could attack from either face.' }],
        hints: ['One arrow: a lone pair on water to the positive carbon.', 'Water is neutral, so after giving a pair, its oxygen is positive.'],
        explanation: 'An oxonium ion: oxygen has three bonds and the positive charge. If the carbon had been a stereocentre, attack from both faces would give both mirror images.',
        // Water takes the place bromine left; the second water comes up beside it, ready for step 3.
        move: { Ow: [0, -1], Hw: [-0.87, -1.5], Ox: [-2.3, -1.5] },
      },
      {
        name: 'A second water takes the proton',
        prompt: 'Show the second water molecule taking a proton from the oxonium ion.',
        arrows: [
          { from: 'Ox', to: 'Ox-Hw', says: 'A lone pair on the second water takes a proton from the positive oxygen.' },
          { from: 'Hw-Ow', to: 'Ow', says: 'The O–H bond’s electrons stay on the first oxygen, which loses its charge.' },
        ],
        hints: ['This is a proton transfer: two arrows.', 'The base is the water molecule on the left.'],
        explanation: '2-methylpropan-2-ol and H3O+. Overall, water has replaced bromide, and HBr has formed as H3O+ and Br−.',
        move: { Hw: [-2.3, -2.45] },
      },
    ],
    predict: { step: 0, prompt: 'Draw what the first step makes: break the C–Br bond and put both charges where they belong.', hints: ['Bromine takes both electrons of the bond.'] },
    expect: { bonds: ['Ow-C', 'Ox-Hw'], absent: ['C-Br', 'Ow-Hw'], charges: { Br: -1, Ox: 1 } },
    practise: { template: 'sn1-capture' },
  };
}

function e2(): LessonDef {
  const d = new Drawing();
  d.atom('Ca', 'C', 0, 0);
  d.grow('Br', 'Br', 'Ca', 90);
  d.grow('Cm', 'C', 'Ca', 210);
  d.grow('Cb', 'C', 'Ca', 330);
  d.grow('H', 'H', 'Cb', 270);
  d.atom('O', 'O', 0.866, -2.7, { charge: -1 });
  d.grow('E1', 'C', 'O', 240);
  d.grow('E2', 'C', 'E1', 180);
  return {
    id: 'lesson-e2',
    title: 'E2: elimination in one step',
    unit: 'Substitution and elimination',
    skill: 'elimination',
    level: 2,
    summary: 'Ethoxide removes a proton from 2-bromopropane as bromide leaves, all in one step, making propene. The proton and the leaving group are anti to each other.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [{
      name: 'E2',
      prompt: 'Show ethoxide removing the proton shown as bromide leaves, in one step.',
      arrows: [
        { from: 'O', to: 'O-H', says: 'Ethoxide is a strong base: a lone pair takes the proton on the carbon next to the one holding bromine.' },
        { from: 'Cb-H', to: 'Cb-Ca', says: 'The C–H electrons do not leave with the proton. They swing in between the two carbons and make the π bond.' },
        { from: 'Ca-Br', to: 'Br', says: 'At the same time the C–Br bond breaks and bromide leaves with both electrons.' },
      ],
      hints: [
        'Three arrows, all in one step.',
        'Start at the base: a lone pair on the charged oxygen.',
        'The C–H bond becomes the new C=C bond; the C–Br bond goes to bromine.',
      ],
      explanation: 'Propene, ethanol and bromide. The proton and bromine are drawn anti to each other: in that shape the C–H and C–Br orbitals line up as the π bond forms. A strong base, a secondary or tertiary halide, and heat favour E2 over SN2; a bulky base such as tert-butoxide favours it even more.',
      move: { H: [0.866, -1.75], Br: [-0.2, 1.6] },
    }],
    predict: { prompt: 'Draw the products of this E2: the alkene, the alcohol and the halide.', hints: ['Three bonds change: O–H forms, C–H breaks into C=C, and C–Br breaks.'] },
    expect: { bonds: ['O-H', 'Ca-Cb:2'], absent: ['Cb-H', 'Ca-Br'], charges: { Br: -1 } },
    practise: { template: 'e2' },
  };
}

function e1(): LessonDef {
  const d = new Drawing();
  tertButylBromide(d);
  d.grow('Hm', 'H', 'M1', 150);
  d.atom('Ow', 'O', -2.1, 2.2);
  return {
    id: 'lesson-e1',
    title: 'E1: elimination through a carbocation',
    unit: 'Substitution and elimination',
    skill: 'elimination',
    level: 2,
    summary: 'The same carbocation as SN1 can instead lose a proton: water takes a proton from a neighbouring carbon and 2-methylprop-1-ene forms. Heat favours this over capture.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The leaving group leaves',
        prompt: 'Show the C–Br bond breaking on its own.',
        arrows: [{ from: 'C-Br', to: 'Br', says: 'As in SN1, the slow first step is ionisation: the C–Br bond breaks and bromide leaves.' }],
        hints: ['One arrow, from the C–Br bond to bromine.'],
        explanation: 'The tertiary carbocation again. What happens next decides between SN1 and E1.',
        move: { Br: [0.9, -2.3] },
      },
      {
        name: 'Water takes a proton',
        prompt: 'Show water removing the proton shown, making an alkene.',
        arrows: [
          { from: 'Ow', to: 'Ow-Hm', says: 'Water acts as a base this time: a lone pair takes a proton from a carbon next to the positive one.' },
          { from: 'M1-Hm', to: 'M1-C', says: 'The C–H electrons move towards the positive carbon and make the C=C π bond, cancelling the charge.' },
        ],
        hints: ['Two arrows: one to the proton, one from the C–H bond.', 'The C–H bond becomes the π bond of the alkene.'],
        explanation: '2-methylprop-1-ene and H3O+. E1 and SN1 share their first step, so they compete; heat favours elimination, because it makes more molecules.',
        move: { Hm: [-1.25, 1.75] },
      },
    ],
    predict: { step: 1, prompt: 'Draw the alkene this step makes.', hints: ['Which two carbons share the new double bond?'] },
    expect: { bonds: ['Ow-Hm', 'C-M1:2'], absent: ['C-Br', 'M1-Hm'], charges: { Br: -1, Ow: 1 } },
    practise: { template: 'e1' },
  };
}

export const SUBSTITUTION_ELIMINATION: readonly LessonDef[] = [sn1(), e2(), e1()];
