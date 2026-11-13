import type { MechanismPuzzle } from 'ketcher-core';
import { buildLesson } from '../lessons/kit';
import { TEMPLATES, type Template } from './templates';

/**
 * Endless practice: a puzzle is a seeded key, `puzzle:<template>:<seed>`, rebuilt on demand and checked by the lesson
 * kit every time (so a broken combination is skipped, never shown). Nothing about a generated puzzle is stored but
 * its key.
 */

/** A 32-bit integer hash, so nearby seeds give unrelated puzzles. */
export function mix(n: number): number {
  let x = (n >>> 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}
export function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const templateById = (id: string): Template | undefined => TEMPLATES.find((t) => t.id === id);
export const puzzleKey = (template: string, seed: number) => `puzzle:${template}:${seed >>> 0}`;

/** The puzzle a key names, or null when the key is not one or its combination does not pass the kit. */
export function puzzleFromKey(key: string): MechanismPuzzle | null {
  const m = /^puzzle:([a-z0-9-]+):(\d+)$/.exec(key);
  const template = m && templateById(m[1]);
  if (!template) return null;
  try {
    const built = buildLesson(template.make(rngOf(mix(Number(m![2])))));
    return { ...built.puzzles[0], id: key, tags: ['generated', template.id] };
  } catch {
    return null;
  }
}

/**
 * `count` different puzzles from one template, starting from `from` (any number: a time, a run counter). Puzzles with
 * the same starting document count once, so a short run never repeats itself.
 */
export function freshPuzzles(templateId: string, count: number, from: number): MechanismPuzzle[] {
  const out: MechanismPuzzle[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < count && i < count * 20; i++) {
    const puzzle = puzzleFromKey(puzzleKey(templateId, mix(from + i)));
    if (!puzzle || seen.has(puzzle.document)) continue;
    seen.add(puzzle.document);
    out.push(puzzle);
  }
  return out;
}
