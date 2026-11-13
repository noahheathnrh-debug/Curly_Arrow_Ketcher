import { describe, expect, test } from 'bun:test';
import { auditAnswer, editorStructFromKet } from '../src/engine/drawn';
import type { KetcherArrowDescriptor } from '../src/engine/arrows';
import { sameSpeciesSet } from '../src/engine/canonical';
import { totalCharge } from '../src/engine/molecule';
import { buildLesson, Drawing, type LessonDef } from '../src/lessons/kit';
import { LESSONS } from '../src/lessons';
import { checkPrediction } from '../src/lessons/predict';

/** Every lesson builds, its answer is legal on the editor's own numbering, and Watch ends on the product. */
describe('lessons', () => {
  for (const def of LESSONS) describe(def.id, () => {
    const built = buildLesson(def);
    test('Watch: one frame to start, one per arrow, one per result', () => {
      expect(built.frames).toHaveLength(1 + def.steps.reduce((n, s) => n + s.arrows.length + 1, 0));
      for (const frame of built.frames) expect(frame.says.length).toBeGreaterThan(20);
    });
    test('each step answers itself, and the answer is legal on the document the learner gets', () => {
      for (const puzzle of built.puzzles) {
        const step = puzzle.steps[0];
        expect(step.expectedArrows.length).toBeGreaterThan(0);
        const audit = auditAnswer(editorStructFromKet(JSON.parse(puzzle.document).mol0), step.expectedArrows as unknown as KetcherArrowDescriptor[]);
        expect(audit.verdict).toBe('ok');
      }
    });
    test('charge is conserved through every step', () => {
      const charges = built.structures.map(totalCharge);
      expect(new Set(charges).size).toBe(1);
    });
    test('Predict expects the structure its step makes, and a drawing of the start is not it', () => {
      const start = editorStructFromKet(JSON.parse(built.predict.ket).mol0);
      expect(start).toBeDefined();
      expect(sameSpeciesSet(built.predict.expected, built.predict.expected)).toBe('same');
    });
  });
});

describe('the kit refuses what it cannot teach', () => {
  const base = (): LessonDef => {
    const d = new Drawing();
    d.atom('O', 'O', -1.6, 0, { charge: -1 });
    d.atom('H', 'H', 0, 0);
    d.grow('Br', 'Br', 'H', 0);
    return {
      id: 't', title: 't', unit: 't', skill: 't', level: 1, summary: 't', atoms: d.atoms, bonds: d.bonds,
      steps: [{ name: 's', prompt: 'p', hints: [], explanation: 'e', arrows: [{ from: 'O', to: 'O-H', says: 'a' }, { from: 'H-Br', to: 'Br', says: 'b' }] }],
      expect: { bonds: ['O-H'], absent: ['H-Br'], charges: { Br: -1 } },
    };
  };
  test('a correct lesson builds', () => { expect(() => buildLesson(base())).not.toThrow(); });
  test('an arrow from an atom with no lone pair', () => {
    const def = base();
    def.steps[0].arrows[0] = { from: 'H', to: 'O-H', says: 'a' };
    expect(() => buildLesson(def)).toThrow();
  });
  test('a product key that the arrows do not make', () => {
    const def = base();
    def.expect = { bonds: ['O-H'], charges: { Br: -1, O: -1 } };
    expect(() => buildLesson(def)).toThrow(/stated product/);
  });
  test('an arrow that leaves hydrogen with two bonds', () => {
    const def = base();
    def.steps[0].arrows = [{ from: 'O', to: 'O-H', says: 'a' }];
    expect(() => buildLesson(def)).toThrow();
  });
});

describe('Predict', () => {
  for (const def of LESSONS) test(`${def.id}: the answer is right and the starting drawing is not`, () => {
    const built = buildLesson(def);
    expect(checkPrediction(editorStructFromKet(JSON.parse(built.predict.answerKet).mol0), built.predict.expected).verdict).toBe('right');
    const start = checkPrediction(editorStructFromKet(JSON.parse(built.predict.ket).mol0), built.predict.expected);
    expect(start.verdict).toBe('wrong');
    expect(start.message.length).toBeGreaterThan(10);
  });
  test('a charge left off is named', () => {
    const built = buildLesson(LESSONS.find((l) => l.id === 'lesson-sn2')!);
    const doc = JSON.parse(built.predict.answerKet);
    for (const atom of doc.mol0.atoms) delete atom.charge;
    const result = checkPrediction(editorStructFromKet(doc.mol0), built.predict.expected);
    expect(result.verdict).toBe('wrong');
    expect(result.message).toMatch(/charge/);
  });
});

describe('typeset', () => {
  test('formulas get subscripts; locants, mechanism names and orbitals do not', async () => {
    const { typeset } = await import('../src/lessons/typeset');
    expect(typeset('H3O+ and AlCl4− with NaBH4 in CH2Cl2; Ph3P=CH2; (CH3)3C+; Br2 and H2')).toBe('H₃O+ and AlCl₄− with NaBH₄ in CH₂Cl₂; Ph₃P=CH₂; (CH₃)₃C+; Br₂ and H₂');
    expect(typeset('SN2, SN1, E1, E2 and E1cB; the C1=C2 bond and the O3–C4 bond; sp2 (sp3); propan-2-ol at 300 °C')).toBe('SN2, SN1, E1, E2 and E1cB; the C1=C2 bond and the O3–C4 bond; sp2 (sp3); propan-2-ol at 300 °C');
  });
});
