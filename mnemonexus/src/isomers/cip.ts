import { defaultHydrogens } from '../engine/ket';

/**
 * R/S and E/Z by the Cahn–Ingold–Prelog rules, for the Isomers tab. Indigo (in the pack) can label a structure, but it
 * does not say why; this ranks the groups itself so the feedback can show priorities 1 to 4 and the first point of
 * difference. Every taught molecule's labels are checked against Indigo's in the tests.
 *
 * Groups are compared on a hierarchical digraph from the stereocentre: atomic number first, then the sets of atoms one
 * bond further out, sphere by sphere, exploring the higher-ranked branches first. A double bond adds a duplicate of
 * each partner; a ring closure adds a duplicate of the atom reached again. Duplicates carry phantom atoms (atomic
 * number 0). Rule 1a with duplicates is all the taught molecules need: no isotopes, and no centres told apart only by
 * the stereochemistry of their groups (rules 2 to 5).
 */

export const ATOMIC_NUMBER: Readonly<Record<string, number>> = { H: 1, B: 5, C: 6, N: 7, O: 8, F: 9, Si: 14, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };
const SYMBOL: Readonly<Record<number, string>> = Object.fromEntries(Object.entries(ATOMIC_NUMBER).map(([el, z]) => [z, el]));
/** How many bonds a duplicate's element would have, so its phantom atoms fill the rest. */
const BONDS: Readonly<Record<string, number>> = { H: 1, B: 3, C: 4, N: 3, O: 2, F: 1, Si: 4, P: 3, S: 2, Cl: 1, Br: 1, I: 1 };

export interface StereoAtom { el: string; x: number; y: number; charge: number; h: number }
/** `stereo` is a wedge (up, towards the viewer) or a hash (down), narrow end at `a`, as KET writes it. */
export interface StereoBond { a: number; b: number; order: number; stereo?: 'up' | 'down' }
export interface StereoMolecule { atoms: StereoAtom[]; bonds: StereoBond[] }

/** The first molecule of a KET document (as Indigo lays one out), with implicit hydrogens counted. */
export function moleculeFromKet(ket: string | Record<string, unknown>): StereoMolecule {
  const doc = (typeof ket === 'string' ? JSON.parse(ket) : ket) as { root: { nodes: { $ref?: string }[] } } & Record<string, unknown>;
  const ref = doc.root.nodes.find((node) => node.$ref)?.$ref;
  const mol = doc[ref ?? 'mol0'] as { atoms: { label: string; location: number[]; charge?: number; implicitHCount?: number }[]; bonds?: { type: number; atoms: number[]; stereo?: number }[] };
  const orders = mol.atoms.map(() => 0);
  const bonds: StereoBond[] = (mol.bonds ?? []).map((raw) => {
    if (![1, 2, 3].includes(raw.type)) throw new Error(`Bond type ${raw.type} is not taught here: write the SMILES in Kekulé form.`);
    const [a, b] = raw.atoms;
    orders[a] += raw.type; orders[b] += raw.type;
    return { a, b, order: raw.type, ...(raw.stereo === 1 ? { stereo: 'up' as const } : raw.stereo === 6 ? { stereo: 'down' as const } : {}) };
  });
  const atoms = mol.atoms.map((raw, i) => {
    const charge = raw.charge ?? 0;
    return { el: raw.label, x: raw.location[0], y: raw.location[1], charge, h: raw.implicitHCount ?? defaultHydrogens(raw.label, charge, orders[i]) };
  });
  return { atoms, bonds };
}

// ── The digraph ──────────────────────────────────────────────────────────────────────────────────────────────────

/** A node of the hierarchical digraph: a real atom, a duplicate, an implicit hydrogen or a phantom. */
export interface Node {
  z: number;
  /** The atom it stands for (a duplicate's original too); null for implicit hydrogens and phantoms. */
  atom: number | null;
  kind: 'atom' | 'duplicate' | 'hydrogen' | 'phantom';
  /** Atoms from the root to here, for ring closures. */
  path: readonly number[];
  children?: Node[];
  ordered?: Node[];
}

const neighbours = (m: StereoMolecule, atom: number) =>
  m.bonds.flatMap((bond) => (bond.a === atom ? [{ other: bond.b, bond }] : bond.b === atom ? [{ other: bond.a, bond }] : []));

const leaf = (z: number, kind: 'hydrogen' | 'phantom', path: readonly number[]): Node => ({ z, atom: null, kind, path, children: [], ordered: [] });
function duplicate(m: StereoMolecule, atom: number, path: readonly number[]): Node {
  const el = m.atoms[atom].el;
  const phantoms = Math.max(0, (BONDS[el] ?? 1) - 1);
  return { z: ATOMIC_NUMBER[el] ?? 0, atom, kind: 'duplicate', path, children: Array.from({ length: phantoms }, () => leaf(0, 'phantom', path)), ordered: [] };
}

export function rootNode(m: StereoMolecule, atom: number): Node {
  return { z: ATOMIC_NUMBER[m.atoms[atom].el] ?? 0, atom, kind: 'atom', path: [atom] };
}

function childrenOf(m: StereoMolecule, node: Node): Node[] {
  if (node.children) return node.children;
  const atom = node.atom!;
  const parent = node.path.length > 1 ? node.path[node.path.length - 2] : null;
  const out: Node[] = [];
  for (const { other, bond } of neighbours(m, atom)) {
    const extra = bond.order - 1;
    if (other === parent) {
      for (let i = 0; i < extra; i++) out.push(duplicate(m, other, node.path));
      continue;
    }
    if (node.path.includes(other)) out.push(duplicate(m, other, node.path));
    else out.push({ z: ATOMIC_NUMBER[m.atoms[other].el] ?? 0, atom: other, kind: 'atom', path: [...node.path, other] });
    for (let i = 0; i < extra; i++) out.push(duplicate(m, other, node.path));
  }
  for (let i = 0; i < m.atoms[atom].h; i++) out.push(leaf(1, 'hydrogen', node.path));
  node.children = out;
  return out;
}

const MAX_SPHERES = 14;

/** A node's children, highest priority first. */
export function ordered(m: StereoMolecule, node: Node): Node[] {
  if (node.ordered) return node.ordered;
  node.ordered = [...childrenOf(m, node)].sort((a, b) => compareNodes(m, b, a));
  return node.ordered;
}

/** Where two branches first differ: the sphere (0 is the first atom) and the sets of atomic numbers compared there. */
export interface Difference { sphere: number; a: number[]; b: number[] }

function firstDifference(m: StereoMolecule, a: Node, b: Node): Difference | null {
  if (a.z !== b.z) return { sphere: 0, a: [a.z], b: [b.z] };
  let fa = [a], fb = [b];
  for (let sphere = 1; sphere <= MAX_SPHERES; sphere++) {
    const sa = fa.map((n) => ordered(m, n).map((c) => c.z)), sb = fb.map((n) => ordered(m, n).map((c) => c.z));
    for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
      const x = sa[i] ?? [], y = sb[i] ?? [];
      for (let j = 0; j < Math.max(x.length, y.length); j++) {
        if ((x[j] ?? -1) !== (y[j] ?? -1)) return { sphere, a: x, b: y };
      }
    }
    fa = fa.flatMap((n) => ordered(m, n));
    fb = fb.flatMap((n) => ordered(m, n));
    if (!fa.length && !fb.length) return null;
  }
  return null;
}

/** Positive when `a` outranks `b`, negative when `b` does, 0 when the rules cannot tell them apart. */
export function compareNodes(m: StereoMolecule, a: Node, b: Node): number {
  const d = firstDifference(m, a, b);
  if (!d) return 0;
  const { a: x, b: y } = d;
  for (let j = 0; j < Math.max(x.length, y.length); j++) if ((x[j] ?? -1) !== (y[j] ?? -1)) return (x[j] ?? -1) - (y[j] ?? -1);
  return 0;
}

// ── Stereocentres (R/S) ──────────────────────────────────────────────────────────────────────────────────────────

export interface RankedGroup {
  /** The first atom of the group, or null for a hydrogen the drawing leaves implicit. */
  atom: number | null;
  /** The group written out, e.g. "CH2CH3" or "OH". */
  name: string;
}
export interface Centre {
  atom: number;
  label: 'R' | 'S';
  /** Highest priority first. */
  groups: RankedGroup[];
  /** Why each group outranks the next: three sentences. */
  reasons: string[];
  /** Where the lowest-priority group points: the turn seen on the page is reversed when it points towards the viewer. */
  fourth: 'away' | 'towards' | 'plane';
}

const unit = (x: number, y: number) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l] as const; };

/** Every atom with four different groups and a wedge or hash bond drawn from it. */
export function stereocentres(m: StereoMolecule): Centre[] {
  const out: Centre[] = [];
  m.atoms.forEach((atom, index) => {
    const around = neighbours(m, index);
    if (atom.el !== 'C' || around.length + atom.h !== 4 || atom.h > 1 || around.some(({ bond }) => bond.order !== 1)) return;
    if (!around.some(({ bond }) => bond.stereo && bond.a === index)) return;
    const root = rootNode(m, index);
    const groups = ordered(m, root);
    for (let i = 0; i < 3; i++) if (compareNodes(m, groups[i], groups[i + 1]) === 0) return;
    // Directions out of the centre: in the plane, or 0.8 towards (wedge) or away from (hash) the viewer.
    const vector = (group: Node): [number, number, number] => {
      if (group.atom === null) {
        const sum = around.reduce((s, { other }) => { const v = vector({ ...group, atom: other }); return [s[0] + v[0], s[1] + v[1], s[2] + v[2]]; }, [0, 0, 0]);
        return [-sum[0], -sum[1], -sum[2]];
      }
      const other = m.atoms[group.atom];
      const [ux, uy] = unit(other.x - atom.x, other.y - atom.y);
      const bond = around.find((n) => n.other === group.atom)!.bond;
      const z = bond.stereo && bond.a === index ? (bond.stereo === 'up' ? 0.8 : -0.8) : 0;
      return [ux * 0.6, uy * 0.6, z];
    };
    const [v1, v2, v3] = groups.slice(0, 3).map(vector);
    // With x right, y up and the viewer on +z, 1 → 2 → 3 clockwise (lowest priority away) gives a negative triple product.
    const triple = v1[0] * (v2[1] * v3[2] - v2[2] * v3[1]) - v1[1] * (v2[0] * v3[2] - v2[2] * v3[0]) + v1[2] * (v2[0] * v3[1] - v2[1] * v3[0]);
    const z4 = vector(groups[3])[2];
    out.push({
      atom: index, label: triple < 0 ? 'R' : 'S', fourth: z4 < -0.1 ? 'away' : z4 > 0.1 ? 'towards' : 'plane',
      groups: groups.map((g) => ({ atom: g.kind === 'hydrogen' ? null : g.atom, name: groupName(m, g, index) })),
      reasons: [0, 1, 2].map((i) => reason(m, groups[i], groups[i + 1], index)),
    });
  });
  return out;
}

// ── Double bonds (E/Z) ───────────────────────────────────────────────────────────────────────────────────────────

export interface DoubleBond {
  a: number;
  b: number;
  /** null when one end has two identical groups, so there is no E or Z. */
  label: 'E' | 'Z' | null;
  /** The higher-priority group on each end (null on an end that has none). */
  high: [RankedGroup | null, RankedGroup | null];
  /** Per end: why one group outranks the other, or why the end has two the same. */
  reasons: [string, string];
}

/** Atoms on a ring through this bond: E/Z in small rings is fixed by the ring and is not asked about. */
function inRing(m: StereoMolecule, a: number, b: number): boolean {
  const seen = new Set([a]);
  const queue = [a];
  while (queue.length) {
    const at = queue.shift()!;
    for (const { other } of neighbours(m, at)) {
      if (at === a && other === b) continue;
      if (other === b) return true;
      if (!seen.has(other)) { seen.add(other); queue.push(other); }
    }
  }
  return false;
}

export function doubleBonds(m: StereoMolecule): DoubleBond[] {
  const out: DoubleBond[] = [];
  for (const bond of m.bonds) {
    if (bond.order !== 2 || m.atoms[bond.a].el !== 'C' || m.atoms[bond.b].el !== 'C' || inRing(m, bond.a, bond.b)) continue;
    const ends = [[bond.a, bond.b], [bond.b, bond.a]].map(([end, partner]) => {
      const groups = ordered(m, rootNode(m, end)).filter((g) => g.atom !== partner);
      const tie = groups.length < 2 || compareNodes(m, groups[0], groups[1]) === 0;
      return { end, partner, groups, tie };
    });
    const [pa, pb] = [m.atoms[bond.a], m.atoms[bond.b]];
    // Which side of the double bond a group sits on; an implicit hydrogen sits opposite the end's other group.
    const side = (end: number, group: Node, others: Node[]): number => {
      if (group.atom === null) { const other = others.find((g) => g !== group && g.atom !== null); return other ? -side(end, other, others) : 0; }
      const p = m.atoms[group.atom], e = m.atoms[end];
      return Math.sign((pb.x - pa.x) * (p.y - e.y) - (pb.y - pa.y) * (p.x - e.x));
    };
    const label = ends.some((e) => e.tie) ? null : side(ends[0].end, ends[0].groups[0], ends[0].groups) === side(ends[1].end, ends[1].groups[0], ends[1].groups) ? 'Z' : 'E';
    const named = (e: typeof ends[number]) => (e.tie ? null : { atom: e.groups[0].kind === 'hydrogen' ? null : e.groups[0].atom, name: groupName(m, e.groups[0], e.end) });
    const why = (e: typeof ends[number]) => (e.tie
      ? `This end carries two ${groupName(m, e.groups[0], e.end)} groups, which cannot be told apart.`
      : reason(m, e.groups[0], e.groups[1], e.end));
    out.push({ a: bond.a, b: bond.b, label, high: [named(ends[0]), named(ends[1])], reasons: [why(ends[0]), why(ends[1])] });
  }
  return out;
}

// ── Words ────────────────────────────────────────────────────────────────────────────────────────────────────────

const symbols = (zs: number[]) => zs.map((z) => (z === 0 ? '0' : SYMBOL[z] ?? '?')).join(', ');
const SUB: Readonly<Record<string, string>> = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
export const subscripts = (text: string) => text.replace(/(?<=[A-Za-z)])(\d+)/g, (d) => [...d].map((c) => SUB[c]).join(''));

/** A group written out from its first atom, e.g. CH2CH3, CH(CH3)2, C(=O)OH or OH; rings and long chains are cut short. */
export function groupName(m: StereoMolecule, group: Node, from: number): string {
  if (group.kind === 'hydrogen') return 'H';
  let budget = 6;
  const write = (atom: number, parent: number, path: number[]): string => {
    budget -= 1;
    const a = m.atoms[atom];
    let text = a.el + (a.h ? `H${a.h > 1 ? a.h : ''}` : '');
    const next = neighbours(m, atom).filter(({ other }) => other !== parent);
    if (next.some(({ other }) => path.includes(other))) return `${text} (in a ring)`;
    const parts = next.map(({ other, bond }) => {
      if (budget <= 0) return '…';
      const inner = write(other, atom, [...path, other]);
      return bond.order === 2 ? `(=${inner})` : bond.order === 3 ? `(≡${inner})` : inner;
    });
    // The last single-bonded branch continues the chain; the others go in brackets.
    const last = parts.length && !parts[parts.length - 1].startsWith('(') ? parts.pop()! : '';
    text += parts.map((p) => (p.startsWith('(') ? p : `(${p})`)).join('') + last;
    return text;
  };
  return write(group.atom!, from, [from, group.atom!]).replace(/\((CH3)\)\((CH3)\)$/, '(CH3)2');
}

/** Why `high` outranks `low`, in a sentence a student can follow. */
export function reason(m: StereoMolecule, high: Node, low: Node, from: number): string {
  const [hn, ln] = [groupName(m, high, from), groupName(m, low, from)];
  const d = firstDifference(m, high, low);
  if (!d) return `${hn} and ${ln} cannot be told apart.`;
  if (d.sphere === 0) return `${hn} beats ${ln}: the first atom, ${SYMBOL[high.z]}, has the higher atomic number (${high.z} against ${low.z}).`;
  const where = d.sphere === 1 ? 'The first atoms are both ' + SYMBOL[high.z] + '. One bond further out' : `They stay level for ${d.sphere} spheres. Then`;
  return `${hn} beats ${ln}. ${where}, compare the atoms attached: (${symbols(d.a)}) against (${symbols(d.b)}); the first difference decides.`;
}
