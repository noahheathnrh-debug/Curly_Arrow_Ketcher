import fs from 'fs';
import path from 'path';
import { KetSerializer } from 'domain/serializers';
import {
  Struct,
  RxnArrow,
  RxnArrowMode,
  Atom,
  Bond,
  Vec2,
} from 'domain/entities';

/**
 * Mechanism arrow anchors name atoms and bonds by *global* `Struct` Pool id.
 * Nothing on the save path remaps them: `serialize` renumbers atoms three times
 * over (per-fragment `getFragmentOnly`, `mergeInto` into a fresh `Struct`, then
 * a per-fragment `clone` in `prepareStructForKet`), and `moleculeToKet` writes
 * atoms positionally with no identity of their own.
 *
 * For a single-fragment structure the numbering happens to survive. For a
 * structure with two disconnected fragments — a nucleophile and a substrate,
 * i.e. most real mechanisms — every anchor silently repoints at a different
 * atom.
 *
 * These tests assert on the *chemistry* an anchor names rather than on the id
 * itself, because the id is allowed to change; what may never change is which
 * atom the arrow is attached to.
 */

const FIXTURE_DIR = path.resolve(
  __dirname,
  '../../../../../../ketcher-autotests/tests/test-data/KET/Mechanism-Arrows',
);

/**
 * Everything about an atom that identifies it chemically without reference to
 * its id: what it is, what it carries, and what it is bonded to.
 */
function atomSignature(struct: Struct, atomId: number): string {
  const atom = struct.atoms.get(atomId);
  if (!atom) return `missing-atom(${atomId})`;

  const neighbours: string[] = [];
  struct.bonds.forEach((bond) => {
    const other =
      bond.begin === atomId
        ? bond.end
        : bond.end === atomId
        ? bond.begin
        : null;
    if (other === null) return;
    const label = struct.atoms.get(other)?.label ?? '?';
    neighbours.push(`${label}${bond.type}`);
  });

  return `${atom.label}/q${atom.charge ?? 0}/r${atom.radical ?? 0}/[${neighbours
    .sort()
    .join(',')}]`;
}

function bondSignature(struct: Struct, bondId: number): string {
  const bond = struct.bonds.get(bondId);
  if (!bond) return `missing-bond(${bondId})`;
  const ends = [
    struct.atoms.get(bond.begin)?.label ?? '?',
    struct.atoms.get(bond.end)?.label ?? '?',
  ].sort();
  return `${ends.join('-')}/t${bond.type}`;
}

/**
 * The chemical meaning of one arrow: where the electrons leave from and where
 * they land, expressed so that it survives any legitimate renumbering.
 */
function arrowSignature(struct: Struct, arrow: RxnArrow): string {
  const parts: string[] = [arrow.mode];

  if (arrow.lpAttach) {
    parts.push(`lp:${atomSignature(struct, arrow.lpAttach.atomId)}`);
  }
  if (arrow.raAttach) {
    parts.push(`ra:${atomSignature(struct, arrow.raAttach.atomId)}`);
  }
  if (arrow.bdAttach) {
    parts.push(`bd:${bondSignature(struct, arrow.bdAttach.bondId)}`);
  }

  const dest = arrow.destAttach;
  if (dest) {
    switch (dest.kind) {
      case 'atom':
        parts.push(`dest-atom:${atomSignature(struct, dest.atomId)}`);
        break;
      case 'bond':
        parts.push(`dest-bond:${bondSignature(struct, dest.bondId)}`);
        break;
      case 'new-bond':
        parts.push(
          `dest-new-bond:${atomSignature(
            struct,
            dest.atomId1,
          )}=>${atomSignature(struct, dest.atomId2)}`,
        );
        break;
    }
  }

  return parts.join(' | ');
}

function signatures(struct: Struct): string[] {
  return Array.from(struct.rxnArrows.values()).map((arrow) =>
    arrowSignature(struct, arrow),
  );
}

/** How many disconnected fragments the structure's atoms fall into. */
function fragmentCount(struct: Struct): number {
  const parent = new Map<number, number>();
  struct.atoms.forEach((_atom, id) => parent.set(id, id));

  const find = (id: number): number => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as number;
    return root;
  };

  struct.bonds.forEach((bond) => {
    const a = find(bond.begin);
    const b = find(bond.end);
    if (a !== b) parent.set(a, b);
  });

  const roots = new Set<number>();
  struct.atoms.forEach((_atom, id) => roots.add(find(id)));
  return roots.size;
}

const ket = new KetSerializer();

const FIXTURES = [
  'mechanism-allyl-resonance.ket',
  'mechanism-carbocation-attack.ket',
  'mechanism-carbonyl-addition.ket',
  'mechanism-hydride-shift.ket',
  'mechanism-proton-transfer.ket',
  'mechanism-sn2-backside.ket',
];

function load(name: string): Struct {
  return ket.deserialize(
    fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf-8'),
  );
}

describe('mechanism anchors survive a KET round trip', () => {
  it.each(FIXTURES)('%s keeps every anchor on the same atoms', (name) => {
    const original = load(name);
    const before = signatures(original);
    expect(before.length).toBeGreaterThan(0);

    const restored = ket.deserialize(ket.serialize(original));

    expect(signatures(restored)).toEqual(before);
  });

  it('covers both single- and multi-fragment structures', () => {
    // Guards the suite itself: if every fixture were single-fragment the tests
    // above would pass without exercising the renumbering at all.
    const counts = FIXTURES.map((name) => fragmentCount(load(name)));
    expect(Math.min(...counts)).toBe(1);
    expect(Math.max(...counts)).toBeGreaterThan(1);
  });
});

describe('mechanism anchors survive renumbering hazards', () => {
  it('keeps anchors correct when two fragments have interleaved ids', () => {
    // The committed fixtures happen to number each fragment contiguously, so
    // concatenating them on export lands the atoms back on their original ids
    // by luck. Real editing does not: build one fragment, then another, then
    // extend the first, and the ids interleave. Export groups by fragment and
    // the numbering no longer coincides.
    const struct = new Struct();

    // Hydroxide (O with a lone pair) and a C-Br substrate, added alternately.
    const o = struct.atoms.add(new Atom({ label: 'O', charge: -1 }));
    const c = struct.atoms.add(new Atom({ label: 'C' }));
    const h = struct.atoms.add(new Atom({ label: 'H' }));
    const br = struct.atoms.add(new Atom({ label: 'Br' }));

    // Fragment A = {o, h}; fragment B = {c, br}. Ids alternate between them.
    struct.bonds.add(new Bond({ begin: o, end: h, type: 1 }));
    const cbr = struct.bonds.add(new Bond({ begin: c, end: br, type: 1 }));

    struct.initHalfBonds();
    struct.initNeighbors();
    struct.markFragments();

    struct.addRxnArrow(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 0), new Vec2(1, 0)],
        lpAttach: { atomId: o, pairIdx: 0 },
        destAttach: { kind: 'new-bond', atomId1: o, atomId2: c },
      }),
    );
    struct.addRxnArrow(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 1), new Vec2(1, 1)],
        bdAttach: { bondId: cbr },
        destAttach: { kind: 'atom', atomId: br },
      }),
    );

    const before = signatures(struct);
    const restored = ket.deserialize(ket.serialize(struct));

    expect(signatures(restored)).toEqual(before);
  });

  it('keeps anchors correct when the atom pool is sparse', () => {
    // `Pool.add` never reuses ids, so deleting an atom leaves a hole and a
    // round trip re-keys the survivors densely from zero. The deleted atom is
    // placed *below* every anchored one so that closing the hole shifts them
    // all — a hole above the anchors would renumber nothing that matters.
    const struct = new Struct();

    // Sacrificial, unbonded, and first in the pool.
    const spectator = struct.atoms.add(new Atom({ label: 'Ne' }));

    const n = struct.atoms.add(new Atom({ label: 'N', charge: -1 }));
    const c = struct.atoms.add(new Atom({ label: 'C' }));
    const cl = struct.atoms.add(new Atom({ label: 'Cl' }));
    const ccl = struct.bonds.add(new Bond({ begin: c, end: cl, type: 1 }));

    struct.initHalfBonds();
    struct.initNeighbors();
    struct.markFragments();

    struct.addRxnArrow(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 0), new Vec2(1, 0)],
        lpAttach: { atomId: n, pairIdx: 0 },
        destAttach: { kind: 'new-bond', atomId1: n, atomId2: c },
      }),
    );
    struct.addRxnArrow(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 1), new Vec2(1, 1)],
        bdAttach: { bondId: ccl },
        destAttach: { kind: 'atom', atomId: cl },
      }),
    );

    struct.atoms.delete(spectator);

    const before = signatures(struct);
    expect(before.join()).not.toContain('missing-');

    const restored = ket.deserialize(ket.serialize(struct));

    expect(signatures(restored)).toEqual(before);
  });
});
