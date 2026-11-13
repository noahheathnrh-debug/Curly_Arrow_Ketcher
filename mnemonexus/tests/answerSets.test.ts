import { describe, expect, test } from 'bun:test';
import { acceptableSets } from '../src/alternatives';

describe('answer sets', () => {
  const arrow = (n: number) => ({ kind: 'curly' as const, source: { kind: 'lone-pair' as const, atomId: n, pairIdx: 0 }, destination: { kind: 'atom' as const, atomId: n + 1 } });
  test('a step with no alternatives has exactly one acceptable set, the earlier steps first', () => {
    const steps = [{ expectedArrows: [arrow(1)] }, { expectedArrows: [arrow(2), arrow(3)] }];
    expect(acceptableSets(steps, 0)).toEqual([[arrow(1)]]);
    expect(acceptableSets(steps, 1)).toEqual([[arrow(1), arrow(2), arrow(3)]]);
  });
  test('alternatives multiply across steps and are capped', () => {
    const steps = [
      { expectedArrows: [arrow(1)], acceptedAlternatives: [[arrow(4)]] },
      { expectedArrows: [arrow(2)], acceptedAlternatives: [[arrow(5)], [arrow(6)]] },
    ];
    expect(acceptableSets(steps, 1)).toHaveLength(6);
    expect(acceptableSets(steps, 1, 4)).toHaveLength(4);
  });
});
