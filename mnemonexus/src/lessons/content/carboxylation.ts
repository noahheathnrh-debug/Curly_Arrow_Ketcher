import { Drawing, type LessonDef } from '../kit';

/**
 * Ethylmagnesium bromide (drawn as its carbanion) and carbon dioxide give propanoate; H3O+ in the work-up gives
 * propanoic acid. CO2 is drawn straight across, the carbanion to its upper right, H3O+ to the lower right.
 */
function grignardCo2(): LessonDef {
  const d = new Drawing();
  d.atom('C', 'C', 0, 0);
  d.grow('Oa', 'O', 'C', 180, 2);
  d.grow('Ob', 'O', 'C', 0, 2);
  d.atom('Ca', 'C', 0.95, 1.65, { charge: -1 });
  d.grow('Cb', 'C', 'Ca', 60);
  d.atom('Ow', 'O', 2.4, -1.2, { charge: 1 });
  d.grow('Ha', 'H', 'Ow', 150);
  return {
    id: 'lesson-grignard-co2',
    title: 'A Grignard reagent and carbon dioxide',
    unit: 'Carbonyl addition',
    skill: 'carbonyl-addition',
    level: 2,
    summary: 'Ethylmagnesium bromide adds to carbon dioxide, giving propanoate, and acid work-up gives propanoic acid: the chain is one carbon longer than the ethyl group.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The carbanion adds to CO2',
        prompt: 'Show the ethyl carbanion adding to carbon dioxide.',
        arrows: [
          { from: 'Ca', to: 'Ca-C', approach: 30, says: 'The carbanion’s lone pair attacks the carbon of CO2.' },
          { from: 'C-Ob', to: 'Ob', says: 'One C=O π bond moves onto its oxygen.' },
        ],
        hints: [
          'In ethylmagnesium bromide the C–Mg bond is very polar, so the carbon behaves as a carbanion (CH3CH2−). It is drawn that way here, with MgBr+ left out.',
          'Both oxygens pull electrons from the carbon of CO2, so it is an electrophile, like the carbon of a C=O group.',
        ],
        explanation: 'Propanoate, its negative charge shared by the two oxygens. In practice the Grignard reagent is poured onto dry ice, solid CO2, kept dry: water would destroy the reagent first.',
        move: { Oa: [-0.866, -0.5], Ob: [0.866, -0.5], Ca: [0, 1], Cb: [0.866, 1.5] },
      },
      {
        name: 'Acid work-up',
        prompt: 'Show H3O+ protonating the carboxylate.',
        arrows: [
          { from: 'Ob', to: 'Ob-Ha', says: 'A lone pair on the O− takes a proton from H3O+.' },
          { from: 'Ha-Ow', to: 'Ow', says: 'The O–H electrons stay on the water.' },
        ],
        hints: ['Dilute acid is added once the reagent has reacted: a proton transfer.'],
        explanation: 'Propanoic acid. Making the Grignard reagent from bromoethane and then adding CO2 turns the haloalkane into a carboxylic acid with one more carbon.',
      },
    ],
    predict: { step: 0, prompt: 'Draw what forms when the carbanion adds to CO2.', hints: ['Which atom of CO2 is the electrophile?'] },
    expect: { bonds: ['Ca-C', 'C-Oa:2', 'C-Ob:1', 'Ob-Ha'], absent: ['Ha-Ow'], charges: {} },
    practise: { template: 'carboxylation' },
  };
}

export const CARBOXYLATION: LessonDef[] = [grignardCo2()];
