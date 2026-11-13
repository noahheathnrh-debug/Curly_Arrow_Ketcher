import { Drawing, type LessonDef } from '../kit';

/**
 * The first three lessons, end to end: a proton transfer, an SN2 and a two-step carbonyl addition. Written from the
 * standard first-year account; the arrows are checked by the engine and the product against `expect`.
 */

function protonTransfer(): LessonDef {
  const d = new Drawing();
  d.atom('O', 'O', -1.6, 0, { charge: -1 });
  d.atom('H', 'H', 0, 0);
  d.grow('Br', 'Br', 'H', 0);
  return {
    id: 'lesson-proton-transfer',
    title: 'Proton transfer',
    unit: 'Acids and bases',
    skill: 'proton-transfer',
    level: 1,
    summary: 'Hydroxide is a base: it uses a lone pair to take a proton from hydrogen bromide. Every Brønsted acid–base reaction, a proton transfer, is these same two arrows.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [{
      name: 'Hydroxide takes the proton',
      prompt: 'Show hydroxide taking the proton from hydrogen bromide.',
      arrows: [
        { from: 'O', to: 'O-H', says: 'A lone pair on the negatively charged oxygen reaches for the hydrogen and starts a new O–H bond.' },
        { from: 'H-Br', to: 'Br', says: 'At the same time the H–Br bond breaks, and both of its electrons go to bromine, which can hold a negative charge.' },
      ],
      hints: [
        'Start at a lone pair on the oxygen: the base gives the electrons.',
        'Hydrogen can only have one bond, so as the new bond forms, the H–Br bond must break.',
        'The electrons of the H–Br bond stay with bromine.',
      ],
      explanation: 'Water and bromide. The oxygen lost its charge because it now shares the pair it gave; bromine gained the pair from the bond, so it carries the negative charge. The proton moves on its own, without any electrons.',
      move: { H: [-0.6, 0.8], Br: [1.4, 0] },
    }],
    predict: { prompt: 'Draw the products: make the new bond, break the old one and put the charges where they belong.', hints: ['Count the bonds on oxygen and bromine before and after.'] },
    expect: { bonds: ['O-H'], absent: ['H-Br'], charges: { Br: -1 } },
    practise: { template: 'proton-transfer' },
  };
}

function sn2(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('Br', 'Br', 'C1', 0);
  d.grow('C2', 'C', 'C1', 120);
  d.atom('O', 'O', -1.9, -0.3, { charge: -1 });
  return {
    id: 'lesson-sn2',
    title: 'SN2: substitution in one step',
    unit: 'Substitution and elimination',
    skill: 'substitution',
    level: 1,
    summary: 'Hydroxide replaces bromide on bromoethane in one concerted step: the new bond forms as the old one breaks, with the nucleophile coming in from the side opposite the leaving group.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [{
      name: 'Backside attack',
      prompt: 'Show hydroxide replacing bromide in one step.',
      arrows: [
        { from: 'O', to: 'O-C1', says: 'A lone pair on hydroxide attacks the carbon bonded to bromine. That carbon is slightly positive, because bromine pulls the bond electrons towards itself.' },
        { from: 'C1-Br', to: 'Br', says: 'As the new bond forms, the C–Br bond breaks and bromine leaves with both electrons as bromide. In the transition state carbon is partly bonded to both; in the product it has four bonds again.' },
      ],
      hints: [
        'The nucleophile has a lone pair to give; here it also carries the negative charge.',
        'It attacks the carbon that carries the leaving group, from the opposite side.',
        'Carbon can only have four bonds, so one must break as the new one forms.',
      ],
      explanation: 'Ethanol and bromide, made in a single step. Because the nucleophile comes in opposite bromine, a stereocentre at that carbon would be inverted, like an umbrella in the wind.',
      move: { O: [-1, -0.2], Br: [1.8, 0] },
    }],
    predict: { prompt: 'Draw the products of this SN2 reaction.', hints: ['One bond to carbon forms and one breaks; carbon keeps four bonds.'] },
    expect: { bonds: ['O-C1', 'C1-C2'], absent: ['C1-Br'], charges: { Br: -1 } },
    practise: { template: 'sn2' },
  };
}

function cyanohydrin(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 90, 2);
  d.grow('C2', 'C', 'C1', 210);
  d.atom('Cn', 'C', 1.5, -0.9, { charge: -1 });
  d.grow('N', 'N', 'Cn', 0, 3);
  d.atom('H', 'H', 1.3, 1.6);
  d.grow('Ch', 'C', 'H', 0);
  d.grow('Nh', 'N', 'Ch', 0, 3);
  return {
    id: 'lesson-cyanohydrin',
    title: 'Nucleophilic addition to a carbonyl',
    unit: 'Carbonyl addition',
    skill: 'carbonyl-addition',
    level: 1,
    summary: 'Cyanide adds to ethanal. The carbonyl carbon is electron-poor, so a nucleophile attacks it and the C=O π bond moves onto oxygen; the alkoxide then takes a proton from hydrogen cyanide.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Cyanide attacks the carbonyl',
        prompt: 'Show cyanide attacking the carbonyl carbon.',
        arrows: [
          { from: 'Cn', to: 'Cn-C1', says: 'The lone pair on cyanide’s carbon attacks the carbonyl carbon, which is positive because oxygen pulls the C=O electrons towards itself.' },
          { from: 'C1-O', to: 'O', says: 'Carbon cannot take a fifth bond, so the weaker π bond of C=O breaks and its electrons move onto oxygen.' },
        ],
        hints: [
          'The nucleophile is the carbon of cyanide, which carries the negative charge and a lone pair.',
          'It attacks the carbon of C=O, not the oxygen.',
          'Only one of the two C=O bonds breaks: its electrons go to oxygen.',
        ],
        explanation: 'An alkoxide: carbon now has four single bonds, and oxygen carries the negative charge with three lone pairs.',
        move: { Cn: [0.87, -0.5], N: [1.74, -1] },
      },
      {
        name: 'The alkoxide is protonated',
        prompt: 'Show the alkoxide taking a proton from hydrogen cyanide.',
        arrows: [
          { from: 'O', to: 'O-H', says: 'The negatively charged oxygen is a strong base: a lone pair takes the proton from hydrogen cyanide.' },
          { from: 'H-Ch', to: 'Ch', says: 'The H–C bond breaks and its electrons stay on carbon, giving back a cyanide ion to start the cycle again.' },
        ],
        hints: ['This is a proton transfer: two arrows.', 'Start at a lone pair on the charged oxygen.'],
        explanation: 'The cyanohydrin, 2-hydroxypropanenitrile, and a new cyanide ion. Cyanide is only needed in a small amount, because each proton transfer gives it back.',
        move: { H: [0.6, 2.75] },
      },
    ],
    predict: { step: 0, prompt: 'Draw what the attack makes: the new C–C bond, the C=O that becomes C–O, and the charge.', hints: ['Carbon keeps four bonds: which bond to it broke?'] },
    expect: { bonds: ['Cn-C1', 'C1-O:1', 'O-H', 'Ch-Nh:3'], absent: ['H-Ch'], charges: { Ch: -1 } },
    practise: { template: 'carbonyl-addition' },
  };
}

export const FIRST_SLICE: readonly LessonDef[] = [protonTransfer(), sn2(), cyanohydrin()];
