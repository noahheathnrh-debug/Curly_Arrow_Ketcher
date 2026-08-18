import { Vec2 } from 'domain/entities/vec2';
import type {
  MechanismBond,
  MechanismStruct,
} from 'application/render/mechanism/types';

/**
 * Hand-built structures for the routing fixtures.
 *
 * Duck-typed rather than real `Struct` instances, following the existing
 * `lonePairUtils.test.ts` pattern: the router only needs atom/bond maps and
 * render options, so no render pass — and therefore no browser — is involved.
 */

export interface TestAtomSpec {
  label: string;
  x: number;
  y: number;
  charge?: number;
  radical?: number;
  implicitH?: number;
  /**
   * Total valence *including* implicit hydrogens, matching Ketcher's `Atom`
   * field. This drives `getLonePairCount`, so getting it wrong invents lone
   * pairs: a methyl carbon recorded with valence 1 rather than 4 is credited
   * with three spare electrons and sprouts a phantom pair.
   */
  valence?: number;
}

export const TEST_OPTIONS = {
  // The fixtures all draw their lone pairs, which is the case worth testing:
  // arrows have to come in between them.
  showLonePairs: true,
  microModeScale: 40,
  lineWidth: 2,
  fontszInPx: 13,
  lonePairSize: 4,
  lonePairDistance: 3,
  chargeSize: 6,
};

export function buildStruct(
  atomSpecs: Record<string, TestAtomSpec>,
  bondSpecs: Array<[string, string, number?, number?]>,
): {
  struct: MechanismStruct;
  atomId: Record<string, number>;
  bondId: string[];
} {
  const atomId: Record<string, number> = {};
  const atoms = new Map();

  Object.entries(atomSpecs).forEach(([name, spec], index) => {
    atomId[name] = index;
    atoms.set(index, {
      label: spec.label,
      charge: spec.charge ?? 0,
      valence: spec.valence ?? 0,
      radical: spec.radical ?? 0,
      implicitH: spec.implicitH ?? 0,
      pp: new Vec2(spec.x, spec.y),
      isQuery: () => false,
      badConn: false,
    });
  });

  const bonds = new Map<number, MechanismBond>();
  const bondId: string[] = [];

  bondSpecs.forEach(([from, to, type, stereo], index) => {
    bonds.set(index, {
      begin: atomId[from],
      end: atomId[to],
      type: type ?? 1,
      stereo: stereo ?? 0,
    });
    bondId.push(`${from}-${to}`);
  });

  return { struct: { atoms, bonds }, atomId, bondId };
}

export function bondIndex(bondId: string[], name: string): number {
  const index = bondId.indexOf(name);
  if (index < 0) throw new Error(`no such bond in fixture: ${name}`);
  return index;
}

/** Visual Test 1 — iodide lone pair attacking a tert-butyl carbocation. */
export function carbocationAttack() {
  return buildStruct(
    {
      C0: { label: 'C', x: 0, y: 0, charge: 1, valence: 3 },
      C1: { label: 'C', x: 0, y: 1, valence: 4, implicitH: 3 },
      C2: { label: 'C', x: -0.866, y: -0.5, valence: 4, implicitH: 3 },
      C3: { label: 'C', x: 0.866, y: -0.5, valence: 4, implicitH: 3 },
      I: { label: 'I', x: 2.35, y: 0.72, charge: -1, valence: 0 },
    },
    [
      ['C0', 'C1'],
      ['C0', 'C2'],
      ['C0', 'C3'],
    ],
  );
}

/** Visual Test 5 — 1,2-hydride shift onto an adjacent carbocation. */
export function hydrideShift() {
  return buildStruct(
    {
      C1: { label: 'C', x: 0, y: 0, valence: 4 },
      C2: { label: 'C', x: 1.2, y: 0, charge: 1, valence: 3 },
      H: { label: 'H', x: -0.15, y: 1, valence: 1 },
      R1: { label: 'C', x: -0.9, y: 0.55, valence: 4, implicitH: 3 },
      R2: { label: 'C', x: -0.9, y: -0.55, valence: 4, implicitH: 3 },
      R3: { label: 'C', x: 2.1, y: 0.6, valence: 4, implicitH: 3 },
      R4: { label: 'C', x: 2.1, y: -0.6, valence: 4, implicitH: 3 },
    },
    [
      ['C1', 'C2'],
      ['C1', 'H'],
      ['C1', 'R1'],
      ['C1', 'R2'],
      ['C2', 'R3'],
      ['C2', 'R4'],
    ],
  );
}

/** Visual Test 6 — allylic resonance, pi bond shifting to the adjacent bond. */
export function allylResonance() {
  return buildStruct(
    {
      C1: { label: 'C', x: -1.2, y: 0, valence: 3 },
      C2: { label: 'C', x: 0, y: 0, valence: 4 },
      C3: { label: 'C', x: 1.2, y: 0, charge: 1, valence: 3 },
      R1: { label: 'C', x: -1.8, y: 0.8, valence: 4, implicitH: 3 },
      R2: { label: 'C', x: 0, y: -1, valence: 4, implicitH: 3 },
      R3: { label: 'C', x: 1.8, y: 0.8, valence: 4, implicitH: 3 },
    },
    [
      ['C1', 'C2', 2],
      ['C2', 'C3'],
      ['C1', 'R1'],
      ['C2', 'R2'],
      ['C3', 'R3'],
    ],
  );
}

/** Visual Test 3 — chloride adding to a ketone carbonyl. */
export function carbonylAddition() {
  return buildStruct(
    {
      C0: { label: 'C', x: 0, y: 0, valence: 4 },
      O: { label: 'O', x: 0, y: 1.2, valence: 2 },
      R1: { label: 'C', x: -0.9, y: -0.6, valence: 4, implicitH: 3 },
      R2: { label: 'C', x: 0.9, y: -0.6, valence: 4, implicitH: 3 },
      Nu: { label: 'Cl', x: 2.2, y: 0.45, charge: -1, valence: 0 },
    },
    [
      ['C0', 'O', 2],
      ['C0', 'R1'],
      ['C0', 'R2'],
    ],
  );
}

/** Visual Test 7 — alkoxide deprotonating hydrogen bromide. */
export function protonTransfer() {
  return buildStruct(
    {
      C: { label: 'C', x: -1.2, y: -0.6, valence: 4, implicitH: 3 },
      O: { label: 'O', x: 0, y: 0, charge: -1, valence: 1 },
      H: { label: 'H', x: 1.5, y: 0.4, valence: 1 },
      Br: { label: 'Br', x: 2.6, y: 0.4, valence: 1 },
    },
    [
      ['C', 'O'],
      ['H', 'Br'],
    ],
  );
}

/** Visual Test 2 — hydroxide attacking a methyl bromide from the backside. */
export function sn2Backside() {
  return buildStruct(
    {
      C: { label: 'C', x: 0, y: 0, valence: 4 },
      Br: { label: 'Br', x: 1.25, y: 0, valence: 1 },
      H1: { label: 'H', x: 0, y: 1, valence: 1 },
      H2: { label: 'H', x: -0.72, y: -0.72, valence: 1 },
      H3: { label: 'H', x: 0.72, y: -0.72, valence: 1 },
      O: { label: 'O', x: -2.1, y: 0, charge: -1, valence: 1, implicitH: 1 },
    },
    [
      ['C', 'Br'],
      ['C', 'H1'],
      ['C', 'H2'],
      ['C', 'H3'],
    ],
  );
}

/**
 * Phenoxide attacking benzyl bromide across a gap — the S-curve case.
 *
 * Reachable before the control points were freed; kept as a regression guard
 * that the reparameterisation did not lose it.
 */
export function crossStructureSCurve() {
  const ring = (cx: number, cy: number, prefix: string) => {
    const atoms: Record<string, TestAtomSpec> = {};
    const bonds: Array<[string, string, number?]> = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      atoms[`${prefix}${i}`] = {
        label: 'C',
        x: cx + Math.cos(angle),
        y: cy + Math.sin(angle),
        valence: 4,
        implicitH: 1,
      };
      bonds.push([
        `${prefix}${i}`,
        `${prefix}${(i + 1) % 6}`,
        i % 2 === 0 ? 2 : 1,
      ]);
    }
    return { atoms, bonds };
  };

  const left = ring(0, 0, 'L');
  const right = ring(6.4, 0, 'R');

  // Substituents sit one full bond length out along the ring radius. Placing
  // them by eye produced a fixture where the benzylic carbon was 0.4 units from
  // the ring instead of 1.0, which crowded the arrow and made the router look
  // broken when the structure was the problem.
  const outward = (cx: number, cy: number, index: number) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    return { x: cx + Math.cos(angle) * 2, y: cy + Math.sin(angle) * 2 };
  };

  const O = outward(0, 0, 0);
  const CH2 = outward(6.4, 0, 2);

  return buildStruct(
    {
      ...left.atoms,
      ...right.atoms,
      O: { label: 'O', ...O, charge: -1, valence: 1 },
      CH2: { label: 'C', ...CH2, valence: 4, implicitH: 2 },
      Br: { label: 'Br', x: CH2.x + 1.0, y: CH2.y - 0.15, valence: 1 },
    },
    [...left.bonds, ...right.bonds, ['L0', 'O'], ['R2', 'CH2'], ['CH2', 'Br']],
  );
}

/**
 * Methoxide attacking the far side of a ring.
 *
 * The target carbon sits on the *west* face, so its only free direction points
 * away from the nucleophile, which is away to the east. A straight line between
 * them runs through the ring, and arriving through the free direction means
 * turning back on the approach — the head ends up travelling roughly opposite
 * to the chord.
 *
 * With the cubic's control points pinned at fixed thirds of the chord that
 * shape does not exist at any parameter value, so this fixture is the
 * acceptance test for freeing them.
 *
 * A first attempt at this fixture put the blocking group on the same side as
 * the nucleophile, which left a direct approach open and made the test pass
 * without ever exercising a sweep. The geometry below is asserted rather than
 * assumed: see `ring sweep geometry` in the invariants suite.
 */
export function ringSweep() {
  const atoms: Record<string, TestAtomSpec> = {};
  const bonds: Array<[string, string, number?]> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    atoms[`C${i}`] = {
      label: 'C',
      x: Math.cos(angle),
      y: Math.sin(angle),
      valence: 4,
      implicitH: 1,
    };
    bonds.push([`C${i}`, `C${(i + 1) % 6}`, i % 2 === 0 ? 2 : 1]);
  }

  // C4 is the west-facing carbon; its outward direction points left and down,
  // directly away from the methoxide sitting out to the east.
  atoms.Me = { label: 'C', x: 5.1, y: 0.35, valence: 4, implicitH: 3 };
  atoms.O = { label: 'O', x: 4.0, y: 0.0, charge: -1, valence: 1 };
  bonds.push(['Me', 'O']);

  return buildStruct(atoms, bonds);
}

/**
 * Phenol: a benzene ring with a hydroxyl at C0, drawn point-up.
 *
 * The case that exposed arrows being routed through the middle of a ring. The
 * interior is empty space, so a curve crossing it hits nothing and collision
 * scoring has no objection — only the region rule does.
 */
export function phenol() {
  const atoms: Record<string, TestAtomSpec> = {};
  const bonds: Array<[string, string, number?]> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    atoms[`C${i}`] = {
      label: 'C',
      x: Math.cos(angle),
      y: Math.sin(angle),
      valence: 4,
      implicitH: 1,
    };
    bonds.push([`C${i}`, `C${(i + 1) % 6}`, i % 2 === 0 ? 2 : 1]);
  }

  atoms.C0.implicitH = 0;
  atoms.O = { label: 'O', x: 0, y: -2, valence: 2, implicitH: 1 };
  bonds.push(['C0', 'O']);

  return buildStruct(atoms, bonds);
}

/**
 * Propylbenzene: a ring with a three-carbon chain hanging off it.
 *
 * The chain is what matters. Its bonds are bridges, on no cycle, so they bound
 * no region — the case that showed an arrow may cut straight through the very
 * bond it comes from without any rule objecting.
 */
export function propylbenzene() {
  const atoms: Record<string, TestAtomSpec> = {};
  const bonds: Array<[string, string, number?]> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    atoms[`C${i}`] = {
      label: 'C',
      x: Math.cos(angle),
      y: Math.sin(angle),
      valence: 4,
      implicitH: 1,
    };
    bonds.push([`C${i}`, `C${(i + 1) % 6}`, i % 2 === 0 ? 2 : 1]);
  }

  atoms.C0.implicitH = 0;
  atoms.A = { label: 'C', x: 1.87, y: 0.5, valence: 4, implicitH: 2 };
  atoms.B = { label: 'C', x: 2.74, y: 0.0, valence: 4, implicitH: 2 };
  atoms.D = { label: 'C', x: 3.61, y: 0.5, valence: 4, implicitH: 3 };
  bonds.push(['C0', 'A'], ['A', 'B'], ['B', 'D']);

  return buildStruct(atoms, bonds);
}

/** A plain zig-zag alkane. Every bond is a bridge, so nothing is enclosed. */
export function alkaneChain(carbons = 7) {
  const atoms: Record<string, TestAtomSpec> = {};
  const bonds: Array<[string, string, number?]> = [];

  for (let i = 0; i < carbons; i++) {
    atoms[`C${i}`] = {
      label: 'C',
      x: i * 0.866,
      y: i % 2 === 0 ? 0 : -0.5,
      valence: 4,
      implicitH: i === 0 || i === carbons - 1 ? 3 : 2,
    };
    if (i > 0) bonds.push([`C${i - 1}`, `C${i}`]);
  }

  return buildStruct(atoms, bonds);
}

/**
 * A zigzag chain with a methyl branch part-way along.
 *
 * The branch is what matters: a bond hanging off the main chain gives arrows a
 * departure direction square to everything else, which is where the cusped
 * curves turned up.
 */
export function branchedChain(carbons = 9, branchAt = 4) {
  const atoms: Record<string, TestAtomSpec> = {};
  const bonds: Array<[string, string, number?]> = [];

  for (let i = 0; i < carbons; i++) {
    atoms[`C${i}`] = {
      label: 'C',
      x: i * 0.866,
      y: i % 2 === 0 ? 0 : -0.5,
      valence: 4,
      implicitH: i === 0 || i === carbons - 1 ? 3 : 2,
    };
    if (i > 0) bonds.push([`C${i - 1}`, `C${i}`]);
  }

  atoms[`C${branchAt}`].implicitH = 1;
  atoms.Me = {
    label: 'C',
    x: branchAt * 0.866,
    y: (branchAt % 2 === 0 ? 0 : -0.5) + 1,
    valence: 4,
    implicitH: 3,
  };
  bonds.push([`C${branchAt}`, 'Me']);

  return buildStruct(atoms, bonds);
}

/**
 * Phenol beside ethylbenzene — two separate molecules with a gap between them.
 *
 * The layout from the shape complaints of 2026-08-12: a nucleophilic hydroxyl
 * on the left, an arene several bond lengths away on the right, and nothing in
 * between. Two things make it the hard case for shape rather than for
 * collisions. The chord is long, so any term scaled by it is generous; and the
 * empty gap means a wildly oversized curve hits nothing and is scored as
 * perfectly clean.
 *
 * `HO` also puts its hydrogen on the far side of the oxygen from the ring, so
 * the label reaches back across the direction most arrows want to leave in.
 */
export function phenolAndEthylbenzene() {
  const atoms: Record<string, TestAtomSpec> = {};
  const bonds: Array<[string, string, number?]> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    atoms[`C${i}`] = {
      label: 'C',
      x: Math.cos(angle),
      y: Math.sin(angle),
      valence: 4,
      implicitH: 1,
    };
    bonds.push([`C${i}`, `C${(i + 1) % 6}`, i % 2 === 0 ? 2 : 1]);
  }
  atoms.C0.implicitH = 0;

  // Up and to the left of the ring, as drawn — so the hydroxyl's own label lies
  // across the path an arrow heading right would naturally take.
  atoms.O = { label: 'O', x: -0.87, y: -1.5, valence: 2, implicitH: 1 };
  bonds.push(['C0', 'O']);

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    atoms[`E${i}`] = {
      label: 'C',
      x: 4.6 + Math.cos(angle),
      y: 0.3 + Math.sin(angle),
      valence: 4,
      implicitH: 1,
    };
    bonds.push([`E${i}`, `E${(i + 1) % 6}`, i % 2 === 0 ? 2 : 1]);
  }
  atoms.E2.implicitH = 0;

  atoms.A = { label: 'C', x: 6.34, y: 0.8, valence: 4, implicitH: 2 };
  atoms.B = { label: 'C', x: 7.21, y: 0.3, valence: 4, implicitH: 3 };
  bonds.push(['E2', 'A'], ['A', 'B']);

  return buildStruct(atoms, bonds);
}

/**
 * Phenol beside benzyl bromide, laid out as in the reported screenshot of
 * 2026-08-13: hydroxyl up and left on the first ring, and on the second a CH2
 * dropping to the lower right with the bromine rising away from it.
 *
 * Built from the screenshot rather than invented, because the invented lookalike
 * used until now — the same two rings with a plain ethyl instead of CH2Br —
 * routed its arrows quite differently and made every per-case claim about the
 * reported shapes unfounded. The bromine matters: it is a labelled atom sitting
 * exactly where an arrow arriving at the CH2 would like to pass.
 */
export function phenolAndBenzylBromide() {
  const atoms: Record<string, TestAtomSpec> = {};
  const bonds: Array<[string, string, number?]> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    atoms[`C${i}`] = {
      label: 'C',
      x: Math.cos(angle),
      y: Math.sin(angle),
      valence: 4,
      implicitH: 1,
    };
    bonds.push([`C${i}`, `C${(i + 1) % 6}`, i % 2 === 0 ? 2 : 1]);
  }
  atoms.C0.implicitH = 0;
  atoms.O = { label: 'O', x: -0.87, y: -1.5, valence: 2, implicitH: 1 };
  bonds.push(['C0', 'O']);

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    atoms[`B${i}`] = {
      label: 'C',
      x: 5.6 + Math.cos(angle),
      y: 0.15 + Math.sin(angle),
      valence: 4,
      implicitH: 1,
    };
    bonds.push([`B${i}`, `B${(i + 1) % 6}`, i % 2 === 0 ? 2 : 1]);
  }
  atoms.B2.implicitH = 0;

  // The benzylic carbon, below and right of the ring, with the bromine above it.
  atoms.CH2 = { label: 'C', x: 7.34, y: 0.65, valence: 4, implicitH: 2 };
  atoms.Br = { label: 'Br', x: 8.21, y: 0.15, valence: 1, implicitH: 0 };
  bonds.push(['B2', 'CH2'], ['CH2', 'Br']);

  return buildStruct(atoms, bonds);
}
