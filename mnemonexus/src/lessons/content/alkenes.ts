import { Drawing, type LessonDef } from '../kit';

/**
 * Addition to alkenes, from the standard first-year account: HBr adding to propene (Markovnikov, through the more
 * substituted carbocation) and bromine adding to ethene through a bromonium ion.
 */

function hbrAddition(): LessonDef {
  const d = new Drawing();
  d.atom('Ca', 'C', 0, 0);
  d.grow('Cb', 'C', 'Ca', 0, 2);
  d.grow('M', 'C', 'Ca', 120);
  // HBr up and to the right, where the arrow from the π bond has room (a tighter layout took the editor 20 s to draw).
  d.atom('H', 'H', 2.3, 0.8);
  d.grow('Br', 'Br', 'H', 0);
  return {
    id: 'lesson-hbr-addition',
    title: 'Adding HBr to an alkene',
    unit: 'Addition to alkenes',
    skill: 'alkene-addition',
    level: 1,
    summary: 'The π bond of propene takes a proton from HBr, giving the more stable carbocation; bromide then bonds to it. The product is 2-bromopropane, as Markovnikov’s rule predicts.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The π bond takes a proton',
        prompt: 'Show the C=C π bond taking the proton from HBr.',
        arrows: [
          { from: 'Ca-Cb', to: 'Cb-H', says: 'The π electrons are the alkene’s most reachable electrons. They make a bond from the end carbon to the proton.' },
          { from: 'H-Br', to: 'Br', says: 'The H–Br bond breaks and bromine leaves with both electrons, as bromide.' },
        ],
        hints: [
          'The alkene is the nucleophile: start the arrow at the double bond.',
          'The proton goes to the CH2 end, so the positive charge is left on the carbon with the methyl group.',
          'Hydrogen keeps one bond: the H–Br bond breaks.',
        ],
        explanation: 'A secondary carbocation and bromide. Protonating the other carbon would leave a primary carbocation, which is much less stable: the methyl group pushes electron density towards a neighbouring positive carbon. That is Markovnikov’s rule.',
        move: { H: [1.5, 0.87], Br: [-0.6, -1.7] },
      },
      {
        name: 'Bromide bonds to the carbocation',
        prompt: 'Show bromide bonding to the carbocation.',
        arrows: [{ from: 'Br', to: 'Br-Ca', says: 'A lone pair on bromide fills the empty p orbital of the positive carbon.' }],
        hints: ['One arrow, from a lone pair on bromide to the positive carbon.'],
        explanation: '2-bromopropane. Bromine ends up on the carbon that had fewer hydrogens.',
        move: { Br: [-0.5, -0.87] },
      },
    ],
    predict: { step: 0, prompt: 'Draw the carbocation this step makes: which carbon gains the proton, and which carries the charge?', hints: ['The more alkyl groups next to it, the more stable the carbocation.'] },
    expect: { bonds: ['Cb-H', 'Ca-Br', 'Ca-Cb:1'], absent: ['H-Br'], charges: {} },
    practise: { template: 'alkene-protonation' },
  };
}

function bromination(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('C2', 'C', 'C1', 0, 2);
  d.atom('Br1', 'Br', 0.5, 1.3);
  d.grow('Br2', 'Br', 'Br1', 90);
  return {
    id: 'lesson-bromination',
    title: 'Adding bromine to an alkene',
    unit: 'Addition to alkenes',
    skill: 'alkene-addition',
    level: 2,
    summary: 'Bromine adds to ethene in two steps. The π bond attacks bromine and a three-membered bromonium ion forms; bromide then opens it from the opposite face.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'A bromonium ion forms',
        prompt: 'Show the alkene attacking bromine to make a bromonium ion.',
        arrows: [
          { from: 'C1-C2', to: 'C1-Br1', says: 'As bromine approaches, its electrons are pushed away from the π bond and the near bromine becomes electron-poor. The π electrons attack it.' },
          { from: 'Br1', to: 'Br1-C2', says: 'At the same time a lone pair on that bromine bonds to the other carbon, so no open carbocation forms.' },
          { from: 'Br1-Br2', to: 'Br2', says: 'The Br–Br bond breaks and the far bromine leaves as bromide.' },
        ],
        hints: [
          'Three arrows: the π bond, a lone pair on the near bromine, and the Br–Br bond.',
          'The near bromine ends up bonded to both carbons, with a positive charge.',
        ],
        explanation: 'A bromonium ion: a three-membered ring with a positively charged bromine bonded to both carbons, and bromide.',
        move: { Br1: [0.5, 0.87], Br2: [-0.4, -1.6] },
      },
      {
        name: 'Bromide opens the ring',
        prompt: 'Show bromide opening the bromonium ion.',
        arrows: [
          { from: 'Br2', to: 'Br2-C1', says: 'Bromide attacks a ring carbon from the face opposite the bromonium bromine, as in an SN2.' },
          { from: 'C1-Br1', to: 'Br1', says: 'The C–Br bond to the ring bromine breaks, and it becomes neutral again.' },
        ],
        hints: ['This is an SN2 on the ring: two arrows.', 'Bromide comes in from below, opposite the ring bromine.'],
        explanation: '1,2-dibromoethane. The two bromines added to opposite faces (anti addition), which is why cyclohexene gives only trans-1,2-dibromocyclohexane.',
        move: { Br2: [-0.5, -0.87], Br1: [1.5, 0.87] },
      },
    ],
    predict: { step: 0, prompt: 'Draw the bromonium ion and the bromide this step makes.', hints: ['The near bromine bonds to both carbons; mark its charge.'] },
    expect: { bonds: ['C1-Br2', 'C2-Br1', 'C1-C2:1'], absent: ['Br1-Br2', 'C1-Br1'], charges: {} },
  };
}

export const ALKENES: readonly LessonDef[] = [hbrAddition(), bromination()];
