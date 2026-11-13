import { sameSpeciesSet, sameStructure } from '../engine/canonical';
import { readEditorStruct, type EditorStructLike } from '../engine/drawn';
import { components, formulaOf, substructure, totalCharge, type Structure } from '../engine/molecule';

/**
 * The Predict check: the learner edits the starting structure into what the step makes, and the drawing is compared
 * with the engine's product species by species (a graph comparison: where things are drawn does not matter, which
 * atoms are bonded, with what charges, does).
 */
export type Prediction =
  | { verdict: 'right'; message: string }
  | { verdict: 'wrong'; message: string; missing: string[]; unexpected: string[] }
  | { verdict: 'unreadable'; message: string };

const speciesOf = (s: Structure) => components(s).map((ids) => substructure(s, ids));
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const pretty = (formula: string) => formula.replace(/(\d+)/g, (d) => d.split('').map((c) => '₀₁₂₃₄₅₆₇₈₉'[Number(c)]).join('')).replace(/-$/, '⁻').replace(/\+$/, '⁺');

export function checkPrediction(struct: EditorStructLike, expected: Structure): Prediction {
  const read = readEditorStruct(struct);
  if ('outside' in read) return { verdict: 'unreadable', message: `This drawing has something the checker does not handle (${read.outside}). Use plain atoms and single, double or triple bonds.` };
  if ('invalid' in read) return { verdict: 'unreadable', message: 'An atom in the drawing has more bonds or electrons than it can hold. Check each atom’s bonds and its charge.' };
  const drawn = read.structure;
  const same = sameSpeciesSet(drawn, expected);
  if (same === 'same') return { verdict: 'right', message: 'Right: every species matches what the arrows make.' };

  const want = speciesOf(expected), have = speciesOf(drawn);
  const left = [...have];
  const missing: string[] = [];
  for (const species of want) {
    const at = left.findIndex((s) => sameStructure(s, species) === 'same');
    if (at >= 0) left.splice(at, 1);
    else missing.push(pretty(formulaOf(species)));
  }
  const unexpected = left.map((s) => pretty(formulaOf(s)));
  const notes: string[] = [];
  if (totalCharge(drawn) !== totalCharge(expected))
    notes.push(`The charges add up to ${signed(totalCharge(drawn))}, but charge is conserved: the total should still be ${signed(totalCharge(expected))}.`);
  if (missing.length && unexpected.length && missing.length === unexpected.length && missing.every((m, i) => m === unexpected[i]))
    notes.push('The formulas are right, but the atoms are connected differently or a charge sits on the wrong atom.');
  else {
    if (have.length !== want.length) notes.push(`There should be ${want.length} separate ${want.length === 1 ? 'species' : 'species'}; the drawing has ${have.length}.`);
    if (missing.length) notes.push(`Still to draw: ${missing.join(', ')}.`);
    if (unexpected.length) notes.push(`Not made by this step: ${unexpected.join(', ')}.`);
  }
  return { verdict: 'wrong', message: notes.join(' ') || 'Not quite: compare each atom’s bonds and charge with what the arrows do.', missing, unexpected };
}
