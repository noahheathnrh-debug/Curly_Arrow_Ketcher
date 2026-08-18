import { derivePuzzleFromSolvedKet, type MechanismPuzzle } from 'ketcher-core';

import allylResonance from './content/mechanism-allyl-resonance.ket?raw';
import carbocationAttack from './content/mechanism-carbocation-attack.ket?raw';
import carbonylAddition from './content/mechanism-carbonyl-addition.ket?raw';
import hydrideShift from './content/mechanism-hydride-shift.ket?raw';
import protonTransfer from './content/mechanism-proton-transfer.ket?raw';
import sn2Backside from './content/mechanism-sn2-backside.ket?raw';

/**
 * The exercises, derived from worked mechanisms.
 *
 * Each source document has its arrows already drawn — a solved mechanism —
 * which is what makes deriving exercises worthwhile: a worked mechanism can be
 * opened in the editor and checked by eye, whereas a hand-written list of
 * expected anchor ids cannot be checked at all until someone tries to answer it.
 *
 * The documents are copies of the ones the visual tests use. They are copied
 * rather than shared so that content meant for learners and fixtures meant for
 * screenshots can change independently — a fixture may one day be edited to
 * provoke a rendering bug, which would be no reason to change a lesson.
 */

interface Authored {
  ket: string;
  id: string;
  title: string;
  difficulty: MechanismPuzzle['difficulty'];
  tags: string[];
  prompt: string;
  hints: string[];
  explanation: string;
  /** Split the answer across several steps, when the chemistry has an order. */
  stepSizes?: number[];
}

const AUTHORED: Authored[] = [
  {
    ket: protonTransfer,
    id: 'proton-transfer',
    title: 'Proton transfer',
    difficulty: 'introductory',
    tags: ['acid–base', 'proton transfer'],
    prompt:
      'Show the acid–base reaction: the base takes the proton, and the bond to it breaks.',
    hints: [
      'Start at the lone pair doing the attacking, not at the atom itself.',
      'Two things happen at once: a bond forms to the proton, and the old bond to it breaks.',
      'The electrons of the breaking bond end up on the atom the proton left behind.',
    ],
    explanation:
      'A proton transfer is always two arrows: one from the base’s lone pair to the hydrogen, and one from the H–X bond onto X. The proton itself never carries electrons with it.',
  },
  {
    ket: sn2Backside,
    id: 'sn2-backside',
    title: 'SN2 — backside attack',
    difficulty: 'introductory',
    tags: ['substitution', 'SN2', 'concerted'],
    prompt:
      'The nucleophile attacks the carbon and the leaving group departs, in one concerted step.',
    hints: [
      'The nucleophile’s lone pair forms the new bond to carbon.',
      'Carbon cannot exceed four bonds, so the old bond must break as the new one forms.',
      'The electrons of the C–X bond leave with the leaving group.',
    ],
    explanation:
      'SN2 is concerted: both arrows describe one step. The nucleophile attacks opposite the leaving group, which is why the centre inverts.',
  },
  {
    ket: carbonylAddition,
    id: 'carbonyl-addition',
    title: 'Nucleophilic addition to a carbonyl',
    difficulty: 'introductory',
    tags: ['addition', 'carbonyl'],
    prompt:
      'Add the nucleophile to the carbonyl carbon and show where the π electrons go.',
    hints: [
      'The carbonyl carbon is the electrophilic site — it carries a partial positive charge.',
      'Carbon cannot become five-valent, so the π bond must give way.',
      'The π electrons end up on oxygen, which is well able to carry the negative charge.',
    ],
    explanation:
      'The nucleophile adds to carbon while the C=O π bond collapses onto oxygen, giving a tetrahedral alkoxide.',
  },
  {
    ket: carbocationAttack,
    id: 'carbocation-attack',
    title: 'Nucleophile traps a carbocation',
    difficulty: 'introductory',
    tags: ['carbocation', 'addition'],
    prompt: 'Show the nucleophile capturing the carbocation.',
    hints: [
      'The positive carbon has an empty orbital and only three bonds.',
      'One arrow is enough: nothing has to break to make room.',
    ],
    explanation:
      'A carbocation is electron-poor and needs no bond to break before it accepts a pair, so trapping it takes a single arrow.',
  },
  {
    ket: hydrideShift,
    id: 'hydride-shift',
    title: '1,2-hydride shift',
    difficulty: 'intermediate',
    tags: ['rearrangement', 'carbocation'],
    prompt:
      'The carbocation rearranges. Move the hydride to the neighbouring positive carbon.',
    hints: [
      'The arrow starts at a bond, not at a lone pair — there is none to use.',
      'A hydride shift moves the hydrogen *with* its bonding pair.',
      'The positive charge ends up where the hydride came from.',
    ],
    explanation:
      'The C–H bonding pair moves to the adjacent empty orbital, carrying the hydrogen with it. The cation is relocated, not neutralised — worthwhile only when the new cation is more stable.',
  },
  {
    ket: allylResonance,
    id: 'allyl-resonance',
    title: 'Allylic resonance',
    difficulty: 'intermediate',
    tags: ['resonance', 'delocalisation'],
    prompt: 'Draw the arrow relating this structure to its resonance form.',
    hints: [
      'Nothing actually moves here — resonance arrows relate two drawings of one species.',
      'Only electrons may be moved; every atom stays where it is.',
    ],
    explanation:
      'Resonance arrows describe delocalisation, not a reaction. The true structure is a hybrid of both forms, which is why the allyl system shares its charge across the ends.',
  },
];

export const PUZZLES: MechanismPuzzle[] = AUTHORED.map((authored) =>
  derivePuzzleFromSolvedKet(authored.ket, {
    id: authored.id,
    title: authored.title,
    difficulty: authored.difficulty,
    tags: authored.tags,
    prompt: authored.prompt,
    hints: authored.hints,
    explanation: authored.explanation,
    stepSizes: authored.stepSizes,
    provenance: {
      source: 'Derived from a worked mechanism document.',
      note: 'Arrows removed from the document and kept as the expected answer.',
    },
  }),
);
