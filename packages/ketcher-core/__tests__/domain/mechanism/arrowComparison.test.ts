import fs from 'fs';
import path from 'path';
import { KetSerializer } from 'domain/serializers';
import {
  arrowTouches,
  compareArrows,
  describeArrows,
  matchArrowSet,
  type MechanismArrowDescriptor,
} from 'domain/mechanism';

const FIXTURE_DIR = path.resolve(
  __dirname,
  '../../../../../ketcher-autotests/tests/test-data/KET/Mechanism-Arrows',
);

const ket = new KetSerializer();

function load(name: string) {
  return ket.deserialize(
    fs.readFileSync(path.join(FIXTURE_DIR, `${name}.ket`), 'utf-8'),
  );
}

const FIXTURES = [
  'mechanism-allyl-resonance',
  'mechanism-carbocation-attack',
  'mechanism-carbonyl-addition',
  'mechanism-hydride-shift',
  'mechanism-proton-transfer',
  'mechanism-sn2-backside',
];

const arrowsOf = (name: string) => describeArrows(load(name));

describe('reading arrows off a structure', () => {
  it.each(FIXTURES)('%s describes every arrow', (name) => {
    const arrows = arrowsOf(name);
    expect(arrows.length).toBeGreaterThan(0);
    arrows.forEach((arrow) => {
      expect(arrow.source).toBeDefined();
      expect(arrow.destination).toBeDefined();
      expect(['curly', 'fishhook']).toContain(arrow.kind);
    });
  });
});

describe('an answer matches itself and nothing else', () => {
  it.each(FIXTURES)('%s matches its own arrows exactly', (name) => {
    const arrows = arrowsOf(name);
    const result = matchArrowSet(arrows, arrows);

    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
  });

  it('does not accept one mechanism as the answer to another', () => {
    // The whole point of checking answers: a plausible-looking arrow from a
    // different reaction must not pass.
    const sn2 = arrowsOf('mechanism-sn2-backside');
    const carbonyl = arrowsOf('mechanism-carbonyl-addition');

    expect(matchArrowSet(sn2, carbonyl).complete).toBe(false);
  });
});

describe('what a comparison ignores', () => {
  const base = (): MechanismArrowDescriptor => ({
    kind: 'curly',
    source: { kind: 'lone-pair', atomId: 3, pairIdx: 0 },
    destination: { kind: 'new-bond', atomId1: 3, atomId2: 7 },
  });

  it('ignores which of an atom’s lone pairs was grabbed', () => {
    // `pairIdx` is a position in a recomputed layout, not an identity. An
    // oxygen's two lone pairs are the same chemistry.
    const drawn = base();
    drawn.source = { kind: 'lone-pair', atomId: 3, pairIdx: 1 };

    expect(compareArrows(drawn, base())).toBe(true);
  });

  it('ignores which side of a bond the tail hangs off', () => {
    const expected: MechanismArrowDescriptor = {
      kind: 'curly',
      source: { kind: 'bond', bondId: 2, side: 1, component: 'pi' },
      destination: { kind: 'atom', atomId: 5 },
    };
    const drawn: MechanismArrowDescriptor = {
      kind: 'curly',
      source: { kind: 'bond', bondId: 2, side: -1, component: 'sigma' },
      destination: { kind: 'atom', atomId: 5 },
    };

    expect(compareArrows(drawn, expected)).toBe(true);
  });

  it('ignores the approach angle', () => {
    const expected: MechanismArrowDescriptor = {
      kind: 'curly',
      source: { kind: 'lone-pair', atomId: 1, pairIdx: 0 },
      destination: { kind: 'atom', atomId: 4, approach: 0.5 },
    };
    const drawn: MechanismArrowDescriptor = {
      kind: 'curly',
      source: { kind: 'lone-pair', atomId: 1, pairIdx: 0 },
      destination: { kind: 'atom', atomId: 4, approach: 2.9 },
    };

    expect(compareArrows(drawn, expected)).toBe(true);
  });
});

describe('what a comparison insists on', () => {
  const expected: MechanismArrowDescriptor = {
    kind: 'curly',
    source: { kind: 'lone-pair', atomId: 3, pairIdx: 0 },
    destination: { kind: 'new-bond', atomId1: 3, atomId2: 7 },
  };

  it('rejects a different atom', () => {
    expect(
      compareArrows(
        { ...expected, source: { kind: 'lone-pair', atomId: 4, pairIdx: 0 } },
        expected,
      ),
    ).toBe(false);
  });

  it('rejects a fishhook drawn where a curly arrow belongs', () => {
    // Homolytic and heterolytic cleavage are different chemistry, not a near
    // miss — one electron moving is not the same claim as two.
    expect(compareArrows({ ...expected, kind: 'fishhook' }, expected)).toBe(
      false,
    );
  });

  it('rejects a reversed new bond by default', () => {
    // Direction is the substance of the answer: which species is the nucleophile.
    const reversed: MechanismArrowDescriptor = {
      ...expected,
      destination: { kind: 'new-bond', atomId1: 7, atomId2: 3 },
    };

    expect(compareArrows(reversed, expected)).toBe(false);
    expect(
      compareArrows(reversed, expected, { ignoreBondDirection: true }),
    ).toBe(true);
  });

  it('rejects a bond source where a lone pair belongs', () => {
    expect(
      compareArrows(
        { ...expected, source: { kind: 'bond', bondId: 3 } },
        expected,
      ),
    ).toBe(false);
  });
});

describe('matching a set', () => {
  const a: MechanismArrowDescriptor = {
    kind: 'curly',
    source: { kind: 'lone-pair', atomId: 1, pairIdx: 0 },
    destination: { kind: 'atom', atomId: 2 },
  };
  const b: MechanismArrowDescriptor = {
    kind: 'curly',
    source: { kind: 'bond', bondId: 0 },
    destination: { kind: 'atom', atomId: 3 },
  };

  it('does not care what order the arrows were drawn in', () => {
    // A step's arrows happen at once; insisting on a sequence would test recall
    // of the tool rather than of the chemistry.
    expect(matchArrowSet([b, a], [a, b]).complete).toBe(true);
  });

  it('reports a missing arrow', () => {
    const result = matchArrowSet([a], [a, b]);
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual([1]);
    expect(result.extra).toEqual([]);
  });

  it('reports an arrow that answers nothing', () => {
    const result = matchArrowSet([a, b], [a]);
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([1]);
  });

  it('counts a duplicate as extra rather than accepting it twice', () => {
    // One-to-one matching, so drawing the right arrow twice is not a way to
    // fill in for a second arrow the learner has not worked out.
    const result = matchArrowSet([a, a], [a, b]);
    expect(result.matched).toHaveLength(1);
    expect(result.missing).toEqual([1]);
    expect(result.extra).toEqual([1]);
  });

  it('treats an empty answer as incomplete rather than trivially correct', () => {
    const result = matchArrowSet([], [a]);
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual([0]);
  });
});

describe('pointing at what an arrow touches', () => {
  it('names the atoms and bonds a host can highlight', () => {
    const touched = arrowTouches({
      kind: 'curly',
      source: { kind: 'bond', bondId: 4 },
      destination: { kind: 'new-bond', atomId1: 1, atomId2: 6 },
    });

    expect(touched.bonds).toEqual([4]);
    expect(touched.atoms).toEqual([1, 6]);
  });
});
