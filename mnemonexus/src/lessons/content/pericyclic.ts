import { Drawing, type LessonDef } from '../kit';

/**
 * Pericyclic reactions, from the standard second-year account: the Diels–Alder reaction of buta-1,3-diene with
 * propenal. Three arrows in a ring, all in one concerted step: no intermediate, no charges.
 */

function dielsAlder(): LessonDef {
  const d = new Drawing();
  // The diene, s-cis, opening to the right: C1 top, C4 bottom, on the hexagon the product ring will fill.
  d.atom('C1', 'C', 0, 1);
  d.atom('C2', 'C', -0.866, 0.5);
  d.atom('C3', 'C', -0.866, -0.5);
  d.atom('C4', 'C', 0, -1);
  d.bond('C1', 'C2', 2);
  d.bond('C2', 'C3');
  d.bond('C3', 'C4', 2);
  // Propenal, standing to the right: C5 (the CH2, the β-carbon) facing C4, C6 facing C1, the CHO pointing away.
  d.atom('C5', 'C', 1.8, -0.5);
  d.grow('C6', 'C', 'C5', 90, 2);
  d.grow('Ca', 'C', 'C6', 30);
  d.grow('Oa', 'O', 'Ca', 90, 2);
  return {
    id: 'lesson-diels-alder',
    title: 'The Diels–Alder reaction',
    unit: 'Pericyclic reactions',
    skill: 'pericyclic',
    level: 3,
    summary: 'Buta-1,3-diene and propenal join to give a six-membered ring, cyclohex-3-ene-1-carbaldehyde, in one step. Two new C–C σ bonds form and three C=C π bonds become one, with six electrons moving round a ring at once.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The ring forms in one step',
        prompt: 'Show the three arrows of the Diels–Alder reaction: the diene’s two π bonds and the dienophile’s π bond.',
        arrows: [
          { from: 'C1-C2', to: 'C1-C6', says: 'The upper C=C of the diene forms a new σ bond from C1 to C6, the carbon of propenal that carries the CHO.' },
          { from: 'C5-C6', to: 'C5-C4', says: 'Propenal’s C=C π electrons form the second new σ bond, from its CH2 end (C5) to the bottom of the diene.' },
          { from: 'C3-C4', to: 'C2-C3', says: 'The lower C=C of the diene moves into the middle, making a new C=C between C2 and C3.' },
        ],
        hints: [
          'Three arrows that chase each other round the ring: each starts at a π bond.',
          'Two new σ bonds join the ends of the diene to the two carbons of the dienophile.',
          'The diene’s middle bond, single before, ends up as the ring’s one C=C.',
        ],
        explanation: 'Cyclohex-3-ene-1-carbaldehyde. All three arrows happen together, so there is no first or last arrow; the order shown is only a drawing convention. The reaction is concerted, with six electrons moving round a cyclic transition state, so there is no intermediate and no charge to stabilise. The diene must be s-cis: its two C=C bonds lie on the same side of the central C–C single bond, so both ends can reach the dienophile. An electron-withdrawing group such as CHO makes the dienophile far more reactive: ethene itself needs high temperature and pressure. Both new bonds form on the same face of each partner, so groups cis on the dienophile stay cis in the ring; with cyclic dienes the endo product, where the CHO lies under the diene in the transition state, is usually the faster-forming (kinetic) one.',
        move: { C5: [0.866, -0.5], C6: [0.866, 0.5], Ca: [1.732, 1], Oa: [1.732, 2] },
      },
    ],
    predict: { prompt: 'Draw the ring that forms when buta-1,3-diene and propenal react.', hints: ['Six carbons in a ring: four from the diene, two from propenal.', 'Where does the one C=C end up?'] },
    expect: { bonds: ['C4-C5:1', 'C6-C1:1', 'C1-C2:1', 'C2-C3:2', 'C3-C4:1', 'C5-C6:1', 'Ca-Oa:2'] },
    practise: { template: 'diels-alder' },
  };
}

function claisen(): LessonDef {
  const d = new Drawing();
  // Allyl vinyl ether on a hexagon: C1 top, C2 and O3 on the left, C4 bottom, C5 and C6 on the right; C1 and C6 not yet bonded.
  d.atom('C1', 'C', 0, 1);
  d.atom('C2', 'C', -0.866, 0.5);
  d.atom('O3', 'O', -0.866, -0.5);
  d.atom('C4', 'C', 0, -1);
  d.atom('C5', 'C', 0.866, -0.5);
  d.atom('C6', 'C', 0.866, 0.5);
  d.bond('C1', 'C2', 2);
  d.bond('C2', 'O3');
  d.bond('O3', 'C4');
  d.bond('C4', 'C5');
  d.bond('C5', 'C6', 2);
  return {
    id: 'lesson-claisen-rearrangement',
    title: 'The Claisen rearrangement',
    unit: 'Pericyclic reactions',
    skill: 'pericyclic',
    level: 3,
    summary: 'Heated to about 200 °C, allyl vinyl ether rearranges to pent-4-enal in one step. A C–O σ bond breaks at one end of a six-atom chain and a C–C σ bond forms at the other: a [3,3]-sigmatropic rearrangement.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Six atoms, three arrows',
        prompt: 'Show the three arrows: the new C–C bond across the top right, the C–O bond at the lower left breaking.',
        arrows: [
          { from: 'C1-C2', to: 'C1-C6', says: 'The vinyl C=C forms a new σ bond from C1 across the gap to C6.' },
          { from: 'C5-C6', to: 'C4-C5', says: 'The allyl C=C moves along one bond, to between C4 and C5.' },
          { from: 'O3-C4', to: 'C2-O3', says: 'The O3–C4 σ bond breaks, and its electrons make a C=O with C2.' },
        ],
        hints: [
          'Like the Diels–Alder reaction, three arrows chase each other round six atoms, but here one of them starts at a σ bond.',
          'Number the six atoms along the chain: the bond between atoms 3 and 4 breaks, and atoms 1 and 6 gain one.',
        ],
        explanation: 'Pent-4-enal. Everything happens at once, through a six-membered, usually chair-shaped, transition state: there is no intermediate. "[3,3]" counts the atoms on each side of the breaking σ bond, starting from it, up to the atoms that join: three on each side. The new C–C σ bond and C=O π bond are together much stronger than the C–O σ bond and C=C π bond lost, which makes the Claisen rearrangement strongly downhill. With six carbons (a hexa-1,5-diene) the same shift is the Cope rearrangement.',
      },
    ],
    predict: { prompt: 'Draw what forms when allyl vinyl ether rearranges.', hints: ['Which σ bond breaks and which forms?', 'Where do the C=O and the C=C end up?'] },
    expect: { bonds: ['C1-C6:1', 'C4-C5:2', 'C2-O3:2', 'C1-C2:1', 'C5-C6:1'], absent: ['O3-C4'] },
    practise: { template: 'sigmatropic-33' },
  };
}

function cope(): LessonDef {
  const d = new Drawing();
  // 3-Methylhexa-1,5-diene on a hexagon, as allyl vinyl ether is in the Claisen lesson: C1 top, C2 and C3 on the left,
  // C4 bottom, C5 and C6 on the right; C1 and C6 not yet bonded.
  d.atom('C1', 'C', 0, 1);
  d.atom('C2', 'C', -0.866, 0.5);
  d.atom('C3', 'C', -0.866, -0.5);
  d.atom('C4', 'C', 0, -1);
  d.atom('C5', 'C', 0.866, -0.5);
  d.atom('C6', 'C', 0.866, 0.5);
  d.bond('C1', 'C2', 2);
  d.bond('C2', 'C3');
  d.bond('C3', 'C4');
  d.bond('C4', 'C5');
  d.bond('C5', 'C6', 2);
  d.grow('M', 'C', 'C3', 210);
  return {
    id: 'lesson-cope-rearrangement',
    title: 'The Cope rearrangement',
    unit: 'Pericyclic reactions',
    skill: 'pericyclic',
    level: 3,
    summary: 'Heated to about 300 °C, 3-methylhexa-1,5-diene rearranges to hepta-1,5-diene. It is the all-carbon version of the Claisen rearrangement: the C–C σ bond in the middle of a six-carbon chain breaks and a new one forms between its ends, a [3,3]-sigmatropic shift.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Six carbons, three arrows',
        prompt: 'Show the three arrows: the new C–C bond between the two ends, and the old one in the middle breaking.',
        arrows: [
          { from: 'C1-C2', to: 'C1-C6', says: 'The C1=C2 π bond forms a new σ bond from C1 across the gap to C6.' },
          { from: 'C5-C6', to: 'C4-C5', says: 'The C5=C6 π bond moves along one bond, to between C4 and C5.' },
          { from: 'C3-C4', to: 'C2-C3', says: 'The C3–C4 σ bond breaks, and its electrons make a C=C between C2 and C3.' },
        ],
        hints: ['As in the Claisen rearrangement: three arrows round six atoms, one of them starting at a σ bond.', 'The σ bond that breaks joins the two allyl halves.'],
        explanation: 'Hepta-1,5-diene, mostly the E isomer, through a chair-shaped transition state with the methyl group equatorial. Unlike the Claisen, no C=O forms, so the two sides are close in energy and the reaction is reversible: this one goes forward because the new C=C carries more alkyl groups. In the oxy-Cope variant an OH on C3 ends up on a C=C, as an enol, which becomes a C=O and drives the reaction to completion.',
      },
    ],
    predict: { prompt: 'Draw what forms when 3-methylhexa-1,5-diene rearranges.', hints: ['Which σ bond breaks and which forms?', 'Where do the two C=C bonds end up?'] },
    expect: { bonds: ['C1-C6:1', 'C2-C3:2', 'C4-C5:2', 'C1-C2:1', 'C5-C6:1'], absent: ['C3-C4'] },
    practise: { template: 'sigmatropic-33' },
  };
}

export const PERICYCLIC: LessonDef[] = [dielsAlder(), claisen(), cope()];
