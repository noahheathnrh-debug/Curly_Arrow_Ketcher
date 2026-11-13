import { describe, expect, it } from 'bun:test';
import { LESSONS } from '../src/lessons';
import { follow, leaves, MECHANISM_KEY, pathTo, questions } from '../src/key/mechanismKey';
import { SCENARIOS } from '../src/key/scenarios';
import { quizScenarios, QUIZ_LENGTH } from '../src/key/KeyActivity';

describe('the mechanism key', () => {
  const all = leaves();

  it('has unique leaf and question ids', () => {
    const ids = [...all.map((leaf) => leaf.id), ...questions().map((question) => question.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reaches every leaf by its path, and the path follows back to it', () => {
    for (const leaf of all) {
      const path = pathTo(leaf.id)!;
      expect(path.length).toBeGreaterThan(0);
      expect(follow(path.map((step) => step.answer))).toBe(leaf);
    }
    expect(follow([])).toBe(MECHANISM_KEY);
  });

  it('names every lesson that teaches a reaction exactly once, and only lessons that exist', () => {
    const named = all.flatMap((leaf) => leaf.lessons);
    expect(new Set(named).size).toBe(named.length);
    const lessonIds = new Set(LESSONS.map((lesson) => lesson.id));
    for (const id of named) expect(lessonIds.has(id)).toBe(true);
    // Resonance forms are not a reaction, so the key has no place for them.
    expect(LESSONS.map((lesson) => lesson.id).filter((id) => !named.includes(id))).toEqual(['lesson-resonance']);
  });

  it('has at least two worded reactions for every mechanism, and none for a mechanism it lacks', () => {
    const ids = new Set(all.map((leaf) => leaf.id));
    for (const scenario of SCENARIOS) expect(ids.has(scenario.leaf)).toBe(true);
    for (const leaf of all) expect(SCENARIOS.filter((scenario) => scenario.leaf === leaf.id).length).toBeGreaterThanOrEqual(2);
    expect(new Set(SCENARIOS.map((scenario) => scenario.text)).size).toBe(SCENARIOS.length);
  });

  it('picks quiz reactions for different mechanisms', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let round = 0; round < 20; round++) {
      const picked = quizScenarios(QUIZ_LENGTH, random);
      expect(picked).toHaveLength(QUIZ_LENGTH);
      expect(new Set(picked.map((scenario) => scenario.leaf)).size).toBe(QUIZ_LENGTH);
    }
  });
});
