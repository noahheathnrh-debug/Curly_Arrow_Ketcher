import { describe, expect, test } from 'bun:test';
import type { KetcherArrowDescriptor } from '../src/engine/arrows';
import { auditAnswer, editorStructFromKet } from '../src/engine/drawn';
import { buildLesson } from '../src/lessons/kit';
import { freshPuzzles, mix, puzzleFromKey, puzzleKey, rngOf } from '../src/practice/generate';
import { TEMPLATES } from '../src/practice/templates';

/** Every combination a template can draw builds, is legal on the editor's numbering, and a short run is varied. */
describe('practice templates', () => {
  for (const template of TEMPLATES) describe(template.id, () => {
    test('every one of 200 seeds builds and its answer audits ok', () => {
      const failures: string[] = [];
      for (let seed = 1; seed <= 200; seed++) {
        const def = template.make(rngOf(mix(seed)));
        try {
          const puzzle = buildLesson(def).puzzles[0];
          const audit = auditAnswer(editorStructFromKet(JSON.parse(puzzle.document).mol0), puzzle.steps[0].expectedArrows as unknown as KetcherArrowDescriptor[]);
          if (audit.verdict !== 'ok') failures.push(`${def.title}: ${audit.verdict}`);
        } catch (error) {
          failures.push(`${def.title}: ${String(error).slice(0, 200)}`);
        }
      }
      expect([...new Set(failures)]).toEqual([]);
    });
    test('25 seeds give at least 10 different puzzles', () => {
      const docs = new Set(Array.from({ length: 25 }, (_, i) => puzzleFromKey(puzzleKey(template.id, mix(i + 1)))?.document));
      expect(docs.size).toBeGreaterThanOrEqual(Math.min(10, template.variants));
    });
    test('a fresh run of five never repeats', () => {
      const run = freshPuzzles(template.id, 5, 12345);
      expect(run).toHaveLength(5);
      expect(new Set(run.map((p) => p.document)).size).toBe(5);
    });
  });
  test('a key rebuilds the same puzzle', () => {
    const key = puzzleKey('sn2', 99);
    expect(puzzleFromKey(key)?.document).toBe(puzzleFromKey(key)?.document);
    expect(puzzleFromKey('puzzle:nope:1')).toBeNull();
  });
});
