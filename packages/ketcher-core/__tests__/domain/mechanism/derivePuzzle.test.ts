import fs from 'fs';
import path from 'path';
import { KetSerializer } from 'domain/serializers';
import {
  derivePuzzleFromSolvedKet,
  describeArrows,
  isMechanismPuzzle,
  matchArrowSet,
} from 'domain/mechanism';

const FIXTURE_DIR = path.resolve(
  __dirname,
  '../../../../../ketcher-autotests/tests/test-data/KET/Mechanism-Arrows',
);

const read = (name: string) =>
  fs.readFileSync(path.join(FIXTURE_DIR, `${name}.ket`), 'utf-8');

const ket = new KetSerializer();

describe('deriving an exercise from a worked mechanism', () => {
  const solved = read('mechanism-sn2-backside');
  const puzzle = derivePuzzleFromSolvedKet(solved, {
    id: 'sn2-backside',
    title: 'SN2 backside attack',
  });

  it('produces a usable puzzle', () => {
    expect(isMechanismPuzzle(puzzle)).toBe(true);
  });

  it('takes the arrows out of the document', () => {
    // The question is the structures; the arrows are the answer, so they must
    // not be sitting on the canvas when the learner arrives.
    const struct = ket.deserialize(puzzle.document);
    expect(describeArrows(struct)).toHaveLength(0);
  });

  it('keeps the structures intact', () => {
    const original = ket.deserialize(solved);
    const stripped = ket.deserialize(puzzle.document);

    expect(stripped.atoms.size).toBe(original.atoms.size);
    expect(stripped.bonds.size).toBe(original.bonds.size);
  });

  it('keeps the arrows as the expected answer', () => {
    const original = describeArrows(ket.deserialize(solved));
    const expected = puzzle.steps.flatMap((step) => [...step.expectedArrows]);

    expect(expected).toHaveLength(original.length);
  });

  it('accepts the original arrows as a correct answer', () => {
    // The round trip that matters: draw exactly what the worked mechanism had,
    // against the document the learner is given, and it should be complete.
    const expected = puzzle.steps.flatMap((step) => [...step.expectedArrows]);
    const drawnByAModelStudent = describeArrows(ket.deserialize(solved));

    expect(matchArrowSet(drawnByAModelStudent, expected).complete).toBe(true);
  });

  it('locks the chemistry while the step is answered', () => {
    puzzle.steps.forEach((step) =>
      expect(step.profile).toBe('puzzle-arrow-only'),
    );
  });
});

describe('anchors still name the right atoms in the stripped document', () => {
  // Removing arrow nodes must not disturb the atom numbering, or every expected
  // anchor would point somewhere else — the failure this whole design exists to
  // prevent.
  it.each([
    'mechanism-allyl-resonance',
    'mechanism-carbocation-attack',
    'mechanism-carbonyl-addition',
    'mechanism-hydride-shift',
    'mechanism-proton-transfer',
    'mechanism-sn2-backside',
  ])('%s', (name) => {
    const solved = read(name);
    const puzzle = derivePuzzleFromSolvedKet(solved, { id: name, title: name });

    const original = ket.deserialize(solved);
    const stripped = ket.deserialize(puzzle.document);

    const expected = puzzle.steps.flatMap((step) => [...step.expectedArrows]);

    // Collected first, then asserted, so the comparison is one unconditional
    // check over everything the anchors name.
    const atomIds: number[] = [];
    const bondIds: number[] = [];

    expected.forEach(({ source, destination }) => {
      if (source.kind === 'bond') bondIds.push(source.bondId);
      else atomIds.push(source.atomId);

      if (destination.kind === 'atom') atomIds.push(destination.atomId);
      if (destination.kind === 'bond') bondIds.push(destination.bondId);
      if (destination.kind === 'new-bond') {
        atomIds.push(destination.atomId1, destination.atomId2);
      }
    });

    const labels = (struct: typeof original) =>
      atomIds.map((id) => struct.atoms.get(id)?.label);
    const bondTypes = (struct: typeof original) =>
      bondIds.map((id) => struct.bonds.get(id)?.type);

    expect(atomIds.length + bondIds.length).toBeGreaterThan(0);
    expect(labels(stripped)).toEqual(labels(original));
    expect(bondTypes(stripped)).toEqual(bondTypes(original));
  });
});

describe('splitting a mechanism into steps', () => {
  it('deals the arrows out in the requested sizes', () => {
    const puzzle = derivePuzzleFromSolvedKet(read('mechanism-sn2-backside'), {
      id: 'sn2-stepped',
      title: 'SN2, one arrow at a time',
      stepSizes: [1, 1],
    });

    expect(puzzle.steps).toHaveLength(2);
    expect(puzzle.steps[0].expectedArrows).toHaveLength(1);
    expect(puzzle.steps[1].expectedArrows).toHaveLength(1);
  });

  it('does not lose arrows the step sizes forgot', () => {
    // A miscounted split would otherwise quietly drop part of the answer,
    // making the puzzle completable without it.
    const puzzle = derivePuzzleFromSolvedKet(read('mechanism-sn2-backside'), {
      id: 'sn2-short-count',
      title: 'SN2',
      stepSizes: [1],
    });

    const total = puzzle.steps.reduce(
      (sum, step) => sum + step.expectedArrows.length,
      0,
    );
    expect(total).toBe(2);
  });
});

describe('refusing to make a puzzle with no answer', () => {
  it('throws when the document has no arrows', () => {
    const puzzle = derivePuzzleFromSolvedKet(read('mechanism-sn2-backside'), {
      id: 'x',
      title: 'x',
    });

    expect(() =>
      derivePuzzleFromSolvedKet(puzzle.document, { id: 'y', title: 'y' }),
    ).toThrow(/no mechanism arrows/);
  });
});
