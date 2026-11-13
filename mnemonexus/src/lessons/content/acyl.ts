import { Drawing, type LessonDef } from '../kit';

/**
 * Nucleophilic acyl substitution, from the standard first-year account: addition to the C=O, then the tetrahedral
 * intermediate collapsing to expel the leaving group. An acyl chloride with an alcohol, and an ester hydrolysed by
 * hydroxide. The acyl carbon keeps the same layout in both (C=O up, its own group lower left), so the attack comes from
 * below and the leaving group sits lower right, the arrangement that routes the curly arrows quickly.
 */

function acylChlorideAlcohol(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 90, 2);
  d.grow('Ma', 'C', 'C1', 210);
  d.grow('Cl', 'Cl', 'C1', 330);
  d.atom('Om', 'O', 0, -1.8);
  d.grow('Hm', 'H', 'Om', 330);
  d.grow('Cm', 'C', 'Om', 210);
  return {
    id: 'lesson-acyl-chloride-alcohol',
    title: 'An acyl chloride and an alcohol',
    unit: 'Acyl substitution',
    skill: 'substitution',
    level: 2,
    summary: 'Ethanoyl chloride reacts with methanol to give methyl ethanoate and hydrogen chloride: nucleophilic addition to the C=O, then elimination of chloride. Overall, methoxy replaces chloro on the acyl carbon.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Methanol adds',
        prompt: 'Show methanol adding to the carbonyl carbon.',
        arrows: [
          { from: 'Om', to: 'Om-C1', says: 'A lone pair on methanol’s oxygen attacks the carbonyl carbon, made very electron-poor by both the oxygen and the chlorine.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['The nucleophile is methanol’s oxygen; it attacks the carbonyl carbon.', 'Carbon cannot take a fifth bond: the C=O π bond moves onto oxygen.'],
        explanation: 'The tetrahedral intermediate. The carbonyl oxygen is now negative, and methanol’s oxygen, with three bonds, is positive.',
        move: { Om: [0, -1], Hm: [0.5, -1.87], Cm: [-0.5, -1.87] },
      },
      {
        name: 'Chloride leaves',
        prompt: 'Show the intermediate collapsing: the C=O re-forms and chloride leaves.',
        arrows: [
          { from: 'O', to: 'O-C1', pair: 2, says: 'A lone pair on the negative oxygen moves back in to re-form the C=O π bond.' },
          { from: 'C1-Cl', to: 'Cl', says: 'Carbon cannot keep five bonds, so the C–Cl bond breaks and chloride leaves with both electrons.' },
        ],
        hints: ['Two arrows: one re-forms the C=O, one breaks a bond to carbon.', 'Chloride is by far the best leaving group of the groups that could go: methyl is not a leaving group, and losing methanol just undoes step 1.'],
        explanation: 'The C=O is back, and chloride has gone. Chloride leaves rather than the CH3 or the methanol oxygen: it is a very weak base, so it is stable on its own, and losing methanol would only reverse the addition. The oxygen of the product is still protonated here. In the flask, a second molecule of methanol (or pyridine) usually removes this proton before or as the intermediate collapses; chloride does it here so the whole path stays on the page.',
        move: { Cl: [1.9, -1.2] },
      },
      {
        name: 'Chloride takes the proton',
        prompt: 'Show chloride removing the proton from the positive oxygen.',
        arrows: [
          { from: 'Cl', to: 'Cl-Hm', says: 'A lone pair on chloride takes the proton on the positive oxygen.' },
          { from: 'Hm-Om', to: 'Om', says: 'The O–H electrons stay on oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The base is the chloride ion that just left.'],
        explanation: 'Methyl ethanoate and hydrogen chloride, given off as steamy fumes. The reaction is fast and goes at room temperature; a weak base such as pyridine is often added to take up the HCl. Acid anhydrides react the same way, more gently, with ethanoate as the leaving group.',
        move: { Hm: [1.25, -1.55] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when the intermediate collapses.', hints: ['The C=O re-forms; which group on carbon leaves?'] },
    expect: { bonds: ['Om-C1', 'C1-O:2', 'Cl-Hm'], absent: ['C1-Cl', 'Hm-Om'] },
    practise: { template: 'acyl-addition' },
  };
}

function esterHydrolysis(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 90, 2);
  d.grow('Ma', 'C', 'C1', 210);
  d.grow('Oe', 'O', 'C1', 330);
  d.grow('Ce', 'C', 'Oe', 30);
  d.atom('Oh', 'O', 0, -1.8, { charge: -1 });
  d.grow('Hh', 'H', 'Oh', 330);
  return {
    id: 'lesson-ester-hydrolysis',
    title: 'Hydrolysing an ester with hydroxide',
    unit: 'Acyl substitution',
    skill: 'leaving-group',
    level: 2,
    summary: 'Sodium hydroxide hydrolyses methyl ethanoate to the ethanoate ion and methanol: hydroxide adds to the C=O, methoxide is expelled, and methoxide then takes the acid’s proton. Making soap from fats is the same reaction, so it is called saponification.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Hydroxide adds',
        prompt: 'Show hydroxide adding to the carbonyl carbon.',
        arrows: [
          { from: 'Oh', to: 'Oh-C1', says: 'A lone pair on hydroxide attacks the carbonyl carbon.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['Hydroxide is the nucleophile; it attacks the carbonyl carbon.', 'The C=O π bond moves onto oxygen.'],
        explanation: 'The tetrahedral intermediate, with the negative charge on the old carbonyl oxygen. Esters are less reactive than acyl chlorides, so a strong nucleophile such as hydroxide and warming are needed.',
        move: { Oh: [0, -1], Hh: [0.87, -1.5] },
      },
      {
        name: 'Methoxide leaves',
        prompt: 'Show the intermediate collapsing: the C=O re-forms and methoxide leaves.',
        arrows: [
          { from: 'O', to: 'O-C1', pair: 2, says: 'A lone pair on the negative oxygen moves back in to re-form the C=O π bond.' },
          { from: 'C1-Oe', to: 'Oe', says: 'The bond to the methoxy oxygen breaks, and methoxide leaves with both electrons.' },
        ],
        hints: ['Two arrows: one re-forms the C=O, one breaks a bond to carbon.', 'Hydroxide could leave again instead; when methoxide leaves, the reaction moves on.'],
        explanation: 'Ethanoic acid and methoxide. Methoxide is a poor leaving group, about as basic as hydroxide, so up to here every step can run back.',
        move: { Oe: [2.1, -1.2], Ce: [2.97, -0.7] },
      },
      {
        name: 'Methoxide takes the proton',
        prompt: 'Show methoxide taking the proton of the carboxylic acid.',
        arrows: [
          { from: 'Oe', to: 'Oe-Hh', says: 'Methoxide, a strong base, takes the acid’s O–H proton.' },
          { from: 'Hh-Oh', to: 'Oh', says: 'The O–H electrons stay on oxygen, giving the carboxylate ion.' },
        ],
        hints: ['A proton transfer: two arrows.', 'The base is the methoxide that just left; the acid is the new carboxylic acid.'],
        explanation: 'The ethanoate ion and methanol. A carboxylic acid is about eleven pKa units more acidic than methanol, so this step is so favourable it is effectively irreversible, and that is why base hydrolysis of an ester goes to completion while acid hydrolysis stops at an equilibrium. Acidify afterwards to get ethanoic acid itself.',
        move: { Hh: [1.3, -1.6] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when the intermediate collapses.', hints: ['The C=O re-forms; which group on carbon leaves?'] },
    expect: { bonds: ['Oh-C1', 'C1-O:2', 'Oe-Hh'], absent: ['C1-Oe', 'Hh-Oh'], charges: { Oh: -1 } },
    practise: { template: 'tetrahedral-collapse' },
  };
}

export const ACYL_SUBSTITUTION: readonly LessonDef[] = [acylChlorideAlcohol(), esterHydrolysis()];
