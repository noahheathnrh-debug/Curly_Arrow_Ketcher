import { describe, expect, it } from 'bun:test';
import { canonicalTree, condensed, enumerateIsomers, smilesOf } from '../src/isomers/enumerate';
import { DRAW_TASKS } from '../src/isomers/species';

describe('isomer enumeration', () => {
  it('finds the textbook counts', () => {
    const count = (heavy: Record<string, number>) => enumerateIsomers(heavy).length;
    expect(count({ C: 4 })).toBe(2);
    expect(count({ C: 5 })).toBe(3);
    expect(count({ C: 6 })).toBe(5);
    expect(count({ C: 7 })).toBe(9);
    expect(count({ C: 2, O: 1 })).toBe(2);
    expect(count({ C: 3, O: 1 })).toBe(3);
    expect(count({ C: 4, O: 1 })).toBe(7);
    expect(count({ C: 3, Br: 1 })).toBe(2);
    expect(count({ C: 4, Cl: 1 })).toBe(4);
    expect(count({ C: 3, Cl: 2 })).toBe(4);
    expect(count({ C: 5, Br: 1 })).toBe(8);
  });

  it('keeps each task within reach of a five-minute drill', () => {
    for (const task of DRAW_TASKS) {
      const n = enumerateIsomers(task.heavy).length;
      expect({ id: task.id, ok: task.level === 1 ? n <= 4 : n >= 5 && n <= 8 }).toEqual({ id: task.id, ok: true });
    }
  });

  it('writes each isomer once, as SMILES and as a condensed formula', () => {
    const butanols = enumerateIsomers({ C: 4, O: 1 });
    expect(new Set(butanols.map(canonicalTree)).size).toBe(7);
    expect(new Set(butanols.map(smilesOf)).size).toBe(7);
    const names = butanols.map(condensed);
    expect(names).toContain('CH3CH2CH2CH2OH');
    expect(names).toContain('CH3CH2OCH2CH3');
    expect(names.some((n) => /^CH3C\((CH3|OH)\)/.test(n))).toBe(true);
  });
});

describe('draw the isomers checker', () => {
  // The editor's view of a drawing: heavy atoms only, hydrogens left implicit, as a learner draws them.
  const drawn = (els: string[], bonds: [number, number][]) => ({
    atoms: els.map((label, i) => [i, { label }] as [number, { label: string }]),
    bonds: bonds.map(([begin, end], i) => [i, { begin, end, type: 1 }] as [number, { begin: number; end: number; type: number }]),
  });
  it('knows a new isomer, the same one drawn the other way round, and the wrong formula', async () => {
    const { checkDrawn, isomersOf } = await import('../src/isomers/drawCheck');
    const { DRAW_TASKS } = await import('../src/isomers/species');
    const task = DRAW_TASKS.find((t) => t.id === 'c4h10o')!;
    const list = isomersOf(task);
    expect(list).toHaveLength(7);
    const butan1ol = drawn(['C', 'C', 'C', 'C', 'O'], [[0, 1], [1, 2], [2, 3], [3, 4]]);
    const first = checkDrawn(butan1ol, list, []);
    expect(first.kind).toBe('new');
    const index = (first as { index: number }).index;
    expect(list[index].name).toBe('CH3CH2CH2CH2OH');
    const reversed = drawn(['O', 'C', 'C', 'C', 'C'], [[0, 1], [1, 2], [2, 3], [3, 4]]);
    expect(checkDrawn(reversed, list, [index])).toEqual({ kind: 'again', index });
    expect(checkDrawn(drawn(['C', 'C', 'C', 'O'], [[0, 1], [1, 2], [2, 3]]), list, [])).toEqual({ kind: 'formula', drawn: 'C3H8O', wanted: 'C4H10O' });
    expect(checkDrawn(drawn(['C', 'C', 'O', 'C', 'C'], [[0, 1], [3, 4]]), list, []).kind).toBe('several');
  });
});
