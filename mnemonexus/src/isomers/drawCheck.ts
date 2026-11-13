import { readEditorStruct, type EditorStructLike } from '../engine/drawn';
import { sameStructure } from '../engine/canonical';
import { buildStructure, components, formulaOf, type Structure } from '../engine/molecule';
import { moleculeFromKet } from './cip';
import { condensed, enumerateIsomers, smilesOf } from './enumerate';
import { isomerKet } from './layouts';
import type { DrawTask } from './species';

/**
 * "Draw the isomers": which isomer a drawing is, if any. A drawing is compared as a graph with each isomer of the
 * formula, so the same chain drawn bent or the other way round is recognised as the one already found.
 */

export interface TaskIsomer { smiles: string; name: string; structure: Structure }

export function isomersOf(task: DrawTask): TaskIsomer[] {
  return enumerateIsomers(task.heavy).map((tree) => {
    const smiles = smilesOf(tree);
    const m = moleculeFromKet(isomerKet(smiles));
    const built = buildStructure({
      atoms: m.atoms.map((a, i) => ({ id: `i${i}`, el: a.el, h: a.h })),
      bonds: m.bonds.map((b) => ({ a: `i${b.a}`, b: `i${b.b}`, order: b.order })),
    }, smiles);
    if (!built.structure) throw new Error(`Isomer ${smiles} does not build.`);
    return { smiles, name: condensed(tree), structure: built.structure };
  });
}

export type DrawVerdict =
  | { kind: 'new'; index: number }
  | { kind: 'again'; index: number }
  | { kind: 'formula'; drawn: string; wanted: string }
  | { kind: 'several' }
  | { kind: 'empty' }
  | { kind: 'unreadable'; message: string };

export function checkDrawn(struct: EditorStructLike, isomers: readonly TaskIsomer[], found: readonly number[]): DrawVerdict {
  if (![...struct.atoms].length) return { kind: 'empty' };
  const read = readEditorStruct(struct);
  if ('outside' in read) return { kind: 'unreadable', message: `This drawing has something the checker does not read (${read.outside}). Use single bonds and the elements in the formula.` };
  if ('invalid' in read) return { kind: 'unreadable', message: read.invalid[0]?.message ?? 'An atom has more bonds than it can make.' };
  const drawn = read.structure;
  if (components(drawn).length > 1) return { kind: 'several' };
  const wanted = formulaOf(isomers[0].structure);
  const formula = formulaOf(drawn);
  const index = isomers.findIndex((iso) => sameStructure(drawn, iso.structure) === 'same');
  if (index < 0) return { kind: 'formula', drawn: formula, wanted };
  return found.includes(index) ? { kind: 'again', index } : { kind: 'new', index };
}
