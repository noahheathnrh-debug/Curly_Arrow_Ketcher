import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
// @ts-expect-error a plain .mjs helper shared with the Vite configs
import { importedCorpusPath } from '../privateContent.mjs';
import { adaptImportedExercise, buildLevels, type ImportedExercise } from '../src/catalogue';

/** The recovered corpus is private (see .gitignore); a public clone skips these tests. */
const raw: ImportedExercise[] = importedCorpusPath ? JSON.parse(readFileSync(importedCorpusPath, 'utf8')) : [];
const first = raw[0] as ImportedExercise;
describe.skipIf(raw.length === 0)('legacy answers in the current editor', () => {
  test('lone-pair attack forms a directed new bond, rather than arriving on a nucleus', () => {
    const puzzle = adaptImportedExercise(first)!;
    expect(puzzle.steps[0].expectedArrows[0].destination).toEqual({ kind: 'new-bond', atomId1: 3, atomId2: 1 });
    expect(puzzle.document).toBe(first.document);
  });
  test('bond cleavage retains the atom destination', () => {
    const document = JSON.stringify({ mol0: { atoms: [{}, {}], bonds: [{ atoms: [0, 1] }] } });
    const puzzle = adaptImportedExercise({ ...first, document, expected: [{ electrons: 2, from: { kind: 'bond', bond: 0 }, to: { kind: 'atom', atom: 1 } }] })!;
    expect(puzzle.steps[0].expectedArrows[0].destination).toEqual({ kind: 'atom', atomId: 1 });
  });
  test('unknown migrating endpoint and invalid anchors withhold the exercise', () => {
    const document = JSON.stringify({ mol0: { atoms: [{}, {}, {}], bonds: [{ atoms: [0, 1] }] } });
    expect(adaptImportedExercise({ ...first, document, expected: [{ electrons: 2, from: { kind: 'bond', bond: 0 }, to: { kind: 'atom', atom: 2 } }] })).toBeNull();
    expect(adaptImportedExercise({ ...first, expected: [{ electrons: 2, from: { kind: 'atom', atom: 9999 }, to: { kind: 'atom', atom: 1 } }] })).toBeNull();
  });
  test('never exposes a truncated level when one step needs review', () => {
    const invalid = { ...first, id: 'invalid', source: { ...first.source, step: 2 }, expected: [] };
    expect(buildLevels([], [first, invalid])).toEqual([]);
    expect(buildLevels([], [{ ...first, source: { ...first.source, step: 2 } }])).toEqual([]);
  });
  test('restored corpus keeps source step order and immutable baked coordinates', () => {
    const levels = buildLevels([], raw as ImportedExercise[]);
    expect(levels.length).toBeGreaterThan(0);
    for (const level of levels) {
      const number = Number(level.id.replace('ocra-level-', ''));
      const source = raw.filter((record) => record.source.puzzle === number).sort((a, b) => a.source.step - b.source.step);
      expect(level.puzzles.map((p) => p.id)).toEqual(source.map((p) => p.id));
      expect(level.puzzles.map((p) => p.document)).toEqual(source.map((p) => p.document));
    }
    console.log(`${levels.length} imported levels; ${levels.reduce((count, level) => count + level.puzzles.length, 0)} steps available; ${new Set(raw.map((p) => p.source.puzzle)).size - levels.length} levels held back`);
  });
});
