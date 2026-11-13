import { Drawing, type LessonDef } from '../kit';

/**
 * Radicals, from the standard first-year account: the chlorination of methane in ultraviolet light, a radical chain.
 * Initiation, the two propagation steps, and a termination step, all with fishhook arrows (one electron each).
 */

function chlorination(): LessonDef {
  const d = new Drawing();
  d.atom('C', 'C', 0, 0);
  d.grow('H', 'H', 'C', 150);
  // The chlorine molecule that is split, upper left; a second one, upper right, for step 3.
  d.atom('Cl1', 'Cl', -1.9, 1.1);
  d.grow('Cl2', 'Cl', 'Cl1', 150);
  d.atom('Cl3', 'Cl', 1.6, 0.9);
  d.grow('Cl4', 'Cl', 'Cl3', 30);
  return {
    id: 'lesson-radical-chlorination',
    title: 'Chlorinating methane: a radical chain',
    unit: 'Radicals',
    skill: 'radicals',
    level: 2,
    summary: 'In ultraviolet light, chlorine and methane give chloromethane and hydrogen chloride by a radical chain. Initiation makes chlorine atoms; two propagation steps make the products and give back a chlorine atom; termination ends a chain. Each fishhook arrow moves one electron.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Initiation',
        prompt: 'Show ultraviolet light splitting a chlorine molecule evenly, with two fishhook arrows.',
        arrows: [
          { from: 'Cl1-Cl2', to: 'Cl1', single: true, says: 'Ultraviolet light breaks the Cl–Cl bond evenly: one electron goes to this chlorine…' },
          { from: 'Cl1-Cl2', to: 'Cl2', single: true, side: -1, says: '…and one to the other.' },
        ],
        hints: ['Homolysis: the bond splits evenly, one electron to each atom.', 'Two fishhooks, both starting from the Cl–Cl bond.'],
        explanation: 'Two chlorine atoms, each with an unpaired electron: radicals. The Cl–Cl bond is weak (about 243 kJ/mol), so ultraviolet light can break it.',
        move: { Cl2: [-3.0, 1.9] },
      },
      {
        name: 'Propagation: a chlorine atom takes a hydrogen',
        prompt: 'Show the chlorine atom taking a hydrogen from methane, with three fishhook arrows.',
        arrows: [
          { from: 'Cl1', to: 'Cl1-H', single: true, approach: 120, says: 'The chlorine atom’s unpaired electron goes towards a new H–Cl bond.' },
          { from: 'H-C', to: 'Cl1-H', single: true, side: -1, approach: 300, says: 'One electron of the C–H bond pairs with it.' },
          { from: 'H-C', to: 'C', single: true, side: 1, approach: 210, says: 'The other stays on carbon, which becomes the methyl radical.' },
        ],
        hints: ['A new bond needs two fishhooks, one electron from each side.', 'The C–H bond splits evenly.'],
        explanation: 'Hydrogen chloride and a methyl radical. A radical is used and a radical is made, which is what makes this a chain.',
        move: { H: [-1.3, 0.75], Cl1: [-2.2, 1.27] },
      },
      {
        name: 'Propagation: the methyl radical takes a chlorine atom',
        prompt: 'Show the methyl radical taking a chlorine atom from a second chlorine molecule.',
        arrows: [
          { from: 'C', to: 'C-Cl3', single: true, says: 'The methyl radical’s unpaired electron goes towards a new C–Cl bond.' },
          { from: 'Cl3-Cl4', to: 'C-Cl3', single: true, says: 'One electron of the Cl–Cl bond pairs with it.' },
          { from: 'Cl3-Cl4', to: 'Cl4', single: true, side: -1, approach: 255, says: 'The other stays on the far chlorine, a new chlorine atom.' },
        ],
        hints: ['The same pattern as the last step: two fishhooks make the new bond, one goes to the atom left behind.'],
        explanation: 'Chloromethane and a new chlorine atom, which can take a hydrogen from another methane: steps 2 and 3 repeat, typically thousands of times for each initiation. With more chlorine, chloromethane goes on to CH2Cl2, CHCl3 and CCl4.',
        move: { Cl3: [0.87, 0.5], Cl4: [-1.2, 2.6] },
      },
      {
        name: 'Termination',
        prompt: 'Show two chlorine atoms meeting to end the chain.',
        arrows: [
          { from: 'Cl2', to: 'Cl2-Cl4', single: true, says: 'Each chlorine atom gives its unpaired electron…' },
          { from: 'Cl4', to: 'Cl2-Cl4', single: true, says: '…to a new Cl–Cl bond.' },
        ],
        hints: ['Two radicals pair their electrons: two fishhooks into one new bond.'],
        explanation: 'Chlorine again, and two fewer radicals. Any two radicals can end a chain: two chlorine atoms, two methyl radicals (giving ethane, a small by-product) or one of each. Radicals are scarce, so termination is rare and each chain is long.',
        move: { Cl4: [-2.0, 2.4] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when the chlorine atom takes a hydrogen.', hints: ['Which atom is left with the unpaired electron?'] },
    expect: { bonds: ['Cl1-H', 'C-Cl3', 'Cl2-Cl4'], absent: ['Cl1-Cl2', 'C-H', 'Cl3-Cl4'] },
    practise: { template: 'hydrogen-abstraction' },
  };
}

export const RADICALS: readonly LessonDef[] = [chlorination()];
