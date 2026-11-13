import type { LessonDef } from './kit';

const SUB: Record<string, string> = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };

/** Names that look like formulas but are not: mechanism labels. */
const NOT_FORMULAS = new Set(['SN1', 'SN2', 'E1', 'E2']);
/** One element and a count is a locant ("C1", "O3") unless it is one of these molecules. */
const ELEMENT_MOLECULES = new Set(['H2', 'N2', 'O2', 'F2', 'Cl2', 'Br2', 'I2']);
const FORMULA = /^(?:\(|\)\d*|[A-Z][a-z]?\d*)+$/;

/**
 * Lesson text is written in plain ASCII ("H3O+", "AlCl4−", "NaBH4"); this sets each formula's counts as subscripts.
 * A word is a formula when it is built only of element-like symbols, counts and brackets and has a count. Mechanism
 * names (SN2, E1, E1cB), orbital names (sp2) and atom locants (C1, the O3–C4 bond) are left alone.
 */
export function typeset(text: string): string {
  return text.replace(/[A-Za-z0-9()]+/g, (word) => {
    if (!/\d/.test(word) || !FORMULA.test(word) || NOT_FORMULAS.has(word)) return word;
    if (/^[A-Z][a-z]?\d+$/.test(word) && !ELEMENT_MOLECULES.has(word)) return word;
    return word.replace(/(?<=[A-Za-z)])\d+/g, (digits) => [...digits].map((c) => SUB[c]).join(''));
  });
}

/** A lesson with every piece of its text typeset. */
export function typesetLesson(def: LessonDef): LessonDef {
  return {
    ...def,
    title: typeset(def.title),
    summary: typeset(def.summary),
    steps: def.steps.map((step) => ({
      ...step,
      name: typeset(step.name),
      prompt: typeset(step.prompt),
      hints: step.hints.map(typeset),
      explanation: typeset(step.explanation),
      arrows: step.arrows.map((arrow) => ({ ...arrow, says: typeset(arrow.says) })),
    })),
    ...(def.predict ? { predict: { ...def.predict, prompt: typeset(def.predict.prompt), ...(def.predict.hints ? { hints: def.predict.hints.map(typeset) } : {}) } } : {}),
  };
}
