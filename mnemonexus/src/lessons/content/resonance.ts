import { Drawing, type LessonDef } from '../kit';

/**
 * Resonance, on the anion of pentane-2,4-dione: the negative charge is shared by the central carbon and both oxygens.
 * Each step redraws the same ion with curly arrows; nothing but electrons moves. The central carbon C3 is at the
 * origin with its charge, the two C=O groups up on either side.
 */
function dioneAnion(): LessonDef {
  const d = new Drawing();
  d.atom('C3', 'C', 0, 0, { charge: -1 });
  d.grow('C2', 'C', 'C3', 150);
  d.grow('O2', 'O', 'C2', 90, 2);
  d.grow('C1', 'C', 'C2', 210);
  d.grow('C4', 'C', 'C3', 30);
  d.grow('O4', 'O', 'C4', 90, 2);
  d.grow('C5', 'C', 'C4', 330);
  return {
    id: 'lesson-resonance',
    title: 'Resonance forms',
    unit: 'Arrow rules and resonance',
    skill: 'resonance',
    level: 1,
    summary: 'Pentane-2,4-dione loses a proton easily (pKa about 9) because its anion shares the negative charge over three atoms: the central carbon and both oxygens. Curly arrows turn one resonance form into the next; only electrons move.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The charge moves onto an oxygen',
        prompt: 'Draw the arrows that move the negative charge from the central carbon onto the left-hand oxygen.',
        arrows: [
          { from: 'C3', to: 'C3-C2', says: 'The lone pair on the negative carbon moves in to make a C=C.' },
          { from: 'C2-O2', to: 'O2', says: 'The C=O π electrons move onto oxygen, so C2 keeps four bonds.' },
        ],
        hints: ['Arrows start at a lone pair or a π bond, never at a σ bond, and no atom moves.', 'Making a new π bond to C2 means C2 must lose one: its C=O.'],
        explanation: 'A second resonance form, with the charge on oxygen. These are not two ions in equilibrium: the real ion is one structure, a blend of its resonance forms, and the arrows only show how its electrons are shared. That is why resonance forms are joined by a double-headed arrow (↔), not equilibrium arrows.',
      },
      {
        name: 'The charge moves to the other oxygen',
        prompt: 'Draw the arrows that move the negative charge from the left-hand oxygen to the right-hand one.',
        arrows: [
          { from: 'O2', to: 'O2-C2', pair: 2, says: 'A lone pair on the negative oxygen moves back in to make the C=O.' },
          { from: 'C2-C3', to: 'C3-C4', side: -1, says: 'The C=C π electrons move along to make a C=C on the other side.' },
          { from: 'C4-O4', to: 'O4', says: 'The other C=O π electrons move onto that oxygen.' },
        ],
        hints: ['Three arrows, passing the electrons along from one oxygen to the other.', 'Check that every carbon still has four bonds and the total charge is still −1.'],
        explanation: 'The third form, with the charge on the other oxygen. The two oxygen forms are the same and contribute most, because oxygen is more electronegative than carbon; the carbon form contributes less, yet the central carbon is where this anion usually reacts with carbon electrophiles. The total charge is −1 in every form.',
      },
    ],
    predict: { step: 0, prompt: 'Draw a resonance form with the charge on an oxygen.', hints: ['Which bonds are double in that form?'] },
    expect: { bonds: ['C2-O2:2', 'C3-C4:2', 'C4-O4:1', 'C2-C3:1'], charges: { O4: -1 } },
    practise: { template: 'resonance-forms' },
  };
}

export const RESONANCE: LessonDef[] = [dioneAnion()];
