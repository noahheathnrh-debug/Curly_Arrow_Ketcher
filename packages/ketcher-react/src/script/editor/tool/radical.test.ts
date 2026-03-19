import { Atom } from 'ketcher-core';
import {
  findDeletableHydrogenNeighbor,
  getNextRadicalState,
} from './radical';

describe('radical tool helpers', () => {
  it('cycles radical states in the expected order', () => {
    expect(getNextRadicalState(Atom.PATTERN.RADICAL.NONE)).toBe(
      Atom.PATTERN.RADICAL.DOUPLET,
    );
    expect(getNextRadicalState(Atom.PATTERN.RADICAL.DOUPLET)).toBe(
      Atom.PATTERN.RADICAL.SINGLET,
    );
    expect(getNextRadicalState(Atom.PATTERN.RADICAL.SINGLET)).toBe(
      Atom.PATTERN.RADICAL.TRIPLET,
    );
    expect(getNextRadicalState(Atom.PATTERN.RADICAL.TRIPLET)).toBe(
      Atom.PATTERN.RADICAL.NONE,
    );
  });

  it('finds a terminal explicit hydrogen that can be replaced by a radical', () => {
    const targetAtom = new Atom({ label: 'O' });
    const hydrogen = new Atom({ label: 'H' });
    const carbon = new Atom({ label: 'C' });
    const neighborMap = new Map<number, Array<{ aid: number }>>([
      [1, [{ aid: 2 }, { aid: 3 }]],
      [2, [{ aid: 1 }]],
      [3, [{ aid: 1 }]],
    ]);
    const molecule = {
      atoms: new Map([
        [1, targetAtom],
        [2, hydrogen],
        [3, carbon],
      ]),
      atomGetNeighbors: (atomId: number) => neighborMap.get(atomId),
    };

    expect(findDeletableHydrogenNeighbor(molecule, 1)).toBe(2);
  });

  it('ignores non-terminal or protected hydrogens', () => {
    const targetAtom = new Atom({ label: 'O' });
    const bridgedHydrogen = new Atom({ label: 'H' });
    const protectedHydrogen = new Atom({ label: 'H' });
    protectedHydrogen.sgs.add(10);
    const molecule = {
      atoms: new Map([
        [1, targetAtom],
        [2, bridgedHydrogen],
        [3, protectedHydrogen],
      ]),
      atomGetNeighbors: (atomId: number) => {
        if (atomId === 1) {
          return [{ aid: 2 }, { aid: 3 }];
        }

        if (atomId === 2) {
          return [{ aid: 1 }, { aid: 4 }];
        }

        if (atomId === 3) {
          return [{ aid: 1 }];
        }

        return [];
      },
    };

    expect(findDeletableHydrogenNeighbor(molecule, 1)).toBeNull();
  });
});
