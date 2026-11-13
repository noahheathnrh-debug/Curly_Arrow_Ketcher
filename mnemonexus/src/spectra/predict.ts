/**
 * Spectra predicted from a structure, to the depth of a school and first-year data sheet: ¹³C and ¹H NMR environments
 * (from the molecule's symmetry), ¹H integration and n + 1 splitting, shifts placed in the data-sheet ranges, the IR
 * bands its bonds give, and the mass spectrum's molecular ion, M + 1, chlorine and bromine patterns and the fragments
 * one broken bond can give. Shifts are estimates inside each range; counts, areas and splitting are exact for the
 * molecules taught (the tests hold them to the app's hand-checked spectra).
 */

export interface SAtom { el: string; h: number; charge?: number }
export interface SBond { a: number; b: number; order: number }
export interface SGraph { atoms: SAtom[]; bonds: SBond[] }

const MASS: Readonly<Record<string, number>> = { H: 1, C: 12, N: 14, O: 16, F: 19, S: 32, Cl: 35, Br: 79, I: 127 };

const around = (g: SGraph, i: number) => g.bonds.flatMap((b) => (b.a === i ? [{ j: b.b, order: b.order }] : b.b === i ? [{ j: b.a, order: b.order }] : []));

/** Benzene rings drawn in Kekulé form: six carbons in a ring of alternating single and double bonds. */
export function aromaticAtoms(g: SGraph): Set<number> {
  const out = new Set<number>();
  const ring = (start: number) => {
    // Depth-first walk for a 6-cycle back to the start, alternating bond orders.
    const walk = (path: number[], lastOrder: number): number[] | null => {
      const at = path[path.length - 1];
      for (const { j, order } of around(g, at)) {
        if (g.atoms[j].el !== 'C' || order === lastOrder || (order !== 1 && order !== 2)) continue;
        if (path.length === 6) { if (j === start) return path; continue; }
        if (path.includes(j)) continue;
        const found = walk([...path, j], order);
        if (found) return found;
      }
      return null;
    };
    return walk([start], 0);
  };
  g.atoms.forEach((a, i) => { if (a.el === 'C' && !out.has(i)) ring(i)?.forEach((k) => out.add(k)); });
  return out;
}

/** Atoms the molecule's symmetry makes equivalent share a class (colour refinement; aromatic bonds count as one kind). */
export function classes(g: SGraph): number[] {
  const arom = aromaticAtoms(g);
  const label = (i: number, j: number, order: number) => (arom.has(i) && arom.has(j) && order <= 2 ? 'a' : String(order));
  let colour = g.atoms.map((a) => `${a.el}${a.h}${a.charge ?? 0}`);
  for (let round = 0; round < g.atoms.length + 1; round++) {
    const next = g.atoms.map((_, i) => `${colour[i]}|${around(g, i).map(({ j, order }) => `${label(i, j, order)}${colour[j]}`).sort().join(',')}`);
    const ids = new Map<string, string>();
    for (const c of [...next].sort()) if (!ids.has(c)) ids.set(c, String(ids.size));
    const renamed = next.map((c) => ids.get(c)!);
    const before = new Set(colour).size;
    colour = renamed;
    if (new Set(renamed).size === before) break;
  }
  const ids = new Map<string, number>();
  return colour.map((c) => { if (!ids.has(c)) ids.set(c, ids.size); return ids.get(c)!; });
}

// ── What each carbon is ──────────────────────────────────────────────────────────────────────────────────────────

export type CarbonKind = 'acyl-acid' | 'acyl-ester' | 'aldehyde' | 'ketone' | 'nitrile' | 'aromatic' | 'alkene'
  | 'c-o' | 'c-halogen' | 'c-n' | 'alpha-carbonyl' | 'alkyl';

function carbonKind(g: SGraph, i: number, arom: Set<number>): CarbonKind {
  const n = around(g, i);
  const dbO = n.some(({ j, order }) => order === 2 && g.atoms[j].el === 'O');
  if (dbO) {
    const singleO = n.find(({ j, order }) => order === 1 && g.atoms[j].el === 'O');
    if (singleO) return g.atoms[singleO.j].h > 0 ? 'acyl-acid' : 'acyl-ester';
    return g.atoms[i].h > 0 ? 'aldehyde' : 'ketone';
  }
  if (n.some(({ j, order }) => order === 3 && g.atoms[j].el === 'N')) return 'nitrile';
  if (arom.has(i)) return 'aromatic';
  if (n.some(({ j, order }) => order === 2 && g.atoms[j].el === 'C')) return 'alkene';
  if (n.some(({ j }) => g.atoms[j].el === 'O')) return 'c-o';
  if (n.some(({ j }) => ['Cl', 'Br', 'I', 'F'].includes(g.atoms[j].el))) return 'c-halogen';
  if (n.some(({ j }) => g.atoms[j].el === 'N')) return 'c-n';
  if (n.some(({ j }) => g.atoms[j].el === 'C' && around(g, j).some(({ j: k, order }) => order === 2 && g.atoms[k].el === 'O'))) return 'alpha-carbonyl';
  return 'alkyl';
}

/** The data sheet's ¹³C ranges, with a typical value inside each. */
export const C13_RANGES: Readonly<Record<CarbonKind, { range: [number, number]; about: string }>> = {
  'acyl-acid': { range: [160, 185], about: 'C=O of an acid' },
  'acyl-ester': { range: [160, 185], about: 'C=O of an ester' },
  aldehyde: { range: [190, 220], about: 'C=O of an aldehyde' },
  ketone: { range: [190, 220], about: 'C=O of a ketone' },
  nitrile: { range: [110, 125], about: 'C≡N' },
  aromatic: { range: [110, 160], about: 'aromatic ring carbon' },
  alkene: { range: [90, 150], about: 'C=C' },
  'c-o': { range: [50, 90], about: 'carbon bonded to O' },
  'c-halogen': { range: [10, 70], about: 'carbon bonded to a halogen' },
  'c-n': { range: [25, 60], about: 'carbon bonded to N' },
  'alpha-carbonyl': { range: [20, 50], about: 'carbon next to a C=O' },
  alkyl: { range: [5, 40], about: 'carbon in an alkyl chain' },
};

const HALOGENS = ['F', 'Cl', 'Br', 'I'];
/** Is atom j bonded to an O, N or halogen (other than through `not`)? A pull felt one bond further away. */
const pulled = (g: SGraph, j: number, not: number) => around(g, j).some(({ j: k }) => k !== not && ['O', 'N', ...HALOGENS].includes(g.atoms[k].el));
const carbonyl = (g: SGraph, j: number) => around(g, j).some(({ j: k, order }) => (order === 2 && g.atoms[k].el === 'O') || (order === 3 && g.atoms[k].el === 'N'));

/** A non-alkyl group as seen from the carbon it is bonded to, for the additive shift rules. */
type Group = 'OH' | 'OR' | 'OCOR' | 'NH' | 'F' | 'Cl' | 'Br' | 'I' | 'CHO' | 'COR' | 'COOH' | 'COOR' | 'CN' | 'Ph' | 'vinyl';
const sp3 = (g: SGraph, k: number, arom: Set<number>) => g.atoms[k].el === 'C' && !arom.has(k) && around(g, k).every(({ order }) => order === 1);

function groupAt(g: SGraph, k: number, from: number, arom: Set<number>): Group | null {
  const el = g.atoms[k].el;
  if (el === 'O') return g.atoms[k].h ? 'OH' : around(g, k).some(({ j }) => j !== from && carbonyl(g, j)) ? 'OCOR' : 'OR';
  if (el === 'N') return 'NH';
  if (HALOGENS.includes(el)) return el as Group;
  if (el !== 'C' || sp3(g, k, arom)) return null;
  if (arom.has(k)) return 'Ph';
  const n = around(g, k);
  if (n.some(({ j, order }) => order === 3 && g.atoms[j].el === 'N')) return 'CN';
  if (n.some(({ j, order }) => order === 2 && g.atoms[j].el === 'O')) {
    const single = n.find(({ j, order }) => order === 1 && g.atoms[j].el === 'O');
    if (single) return g.atoms[single.j].h ? 'COOH' : 'COOR';
    return g.atoms[k].h ? 'CHO' : 'COR';
  }
  return 'vinyl';
}

/** Substituent increments for an sp³ carbon, α, β and γ to the group (ppm; standard additivity tables, rounded). */
const ALKYL_INCREMENTS: Readonly<Record<Group, [number, number, number]>> = {
  OH: [49, 10, -5], OR: [58, 7, -4], OCOR: [54, 6, -3], NH: [29, 11, -5],
  F: [70, 8, -7], Cl: [31, 11, -4], Br: [20, 11, -3], I: [-6, 11, -1],
  CHO: [31, 0, -2], COR: [30, 1, -2], COOH: [21, 3, -2], COOR: [20, 3, -2], CN: [4, 3, -3], Ph: [23, 9, -2], vinyl: [20, 6, -0.5],
};
/** α increments on a carbon inside a chain (two or more carbons on it), where they differ from a chain end's. */
const INTERNAL_ALPHA: Readonly<Partial<Record<Group, number>>> = { Cl: 37, Br: 29, I: 6, NH: 26 };
/** Grant and Paul's branching corrections: [this carbon's degree][a neighbouring carbon's degree]. */
const BRANCHING: Readonly<Record<number, Readonly<Record<number, number>>>> = {
  1: { 3: -1.1, 4: -3.4 }, 2: { 3: -2.5, 4: -7.2 }, 3: { 2: -3.7, 3: -9.5, 4: -15 }, 4: { 1: -1.5, 2: -8.4, 3: -15, 4: -25 },
};

/**
 * An sp³ carbon by Grant and Paul's rule (−2.3 + 9.1 per α carbon + 9.4 per β − 2.5 per γ, with branching corrections),
 * plus each group's α, β or γ increment. Pentane comes out 13.7, 22.8, 34.7 against 13.9, 22.6, 34.5 measured.
 */
function sp3Shift(g: SGraph, i: number, arom: Set<number>): number {
  let shift = -2.3;
  const degree = (k: number) => around(g, k).filter(({ j }) => g.atoms[j].el === 'C').length;
  const dist = new Map([[i, 0]]), queue = [i];
  while (queue.length) {
    const at = queue.shift()!, d = dist.get(at)!;
    if (d === 3) continue;
    for (const { j } of around(g, at)) {
      if (dist.has(j)) continue;
      dist.set(j, d + 1);
      if (sp3(g, j, arom)) { shift += [9.1, 9.4, -2.5][d]; queue.push(j); continue; }
      const group = groupAt(g, j, at, arom);
      if (group) shift += (d === 0 && degree(i) >= 2 ? INTERNAL_ALPHA[group] : undefined) ?? ALKYL_INCREMENTS[group][d];
    }
  }
  for (const { j } of around(g, i)) if (sp3(g, j, arom)) shift += BRANCHING[degree(i)]?.[degree(j)] ?? 0;
  return shift;
}

/** Ring increments [ipso, ortho, meta, para] for a substituent on benzene (128.5). */
const RING_INCREMENTS: Readonly<Partial<Record<Group | 'alkyl', [number, number, number, number]>>> = {
  alkyl: [9.3, 0.7, -0.1, -2.9], CHO: [8.2, 1.2, 0.5, 5.8], COR: [9.1, 0.1, 0, 4.2], COOH: [2.1, 1.6, -0.1, 5.2], COOR: [2, 1.2, -0.1, 4.3],
  OH: [26.9, -12.7, 1.4, -7.3], OR: [31.4, -14.4, 1, -7.7], NH: [18.2, -13.4, 0.8, -10], Cl: [6.4, 0.2, 1, -2], Br: [-5.4, 3.4, 2.2, -1],
  CN: [-15.7, 3.6, 0.7, 4.3], vinyl: [9.1, -2.4, 0.2, -0.5],
};
function ringShift(g: SGraph, i: number, arom: Set<number>): number {
  const dist = new Map([[i, 0]]), queue = [i];
  while (queue.length) { const at = queue.shift()!; for (const { j } of around(g, at)) if (arom.has(j) && !dist.has(j)) { dist.set(j, dist.get(at)! + 1); queue.push(j); } }
  let shift = 128.5;
  for (const [k, d] of dist) {
    for (const { j } of around(g, k)) {
      if (arom.has(j)) continue;
      const group = sp3(g, j, arom) ? 'alkyl' : groupAt(g, j, k, arom);
      shift += (group && RING_INCREMENTS[group]?.[Math.min(3, d)]) || 0;
    }
  }
  return shift;
}

function carbonShift(g: SGraph, i: number, kind: CarbonKind, arom: Set<number>): number {
  const h = g.atoms[i].h;
  const n = around(g, i);
  if (sp3(g, i, arom)) return sp3Shift(g, i, arom);
  switch (kind) {
    case 'acyl-acid': return 178;
    case 'acyl-ester': return 172;
    case 'aldehyde': return 200;
    case 'ketone': return 208;
    case 'nitrile': return 118;
    case 'aromatic': return ringShift(g, i, arom);
    case 'alkene': {
      const partner = n.find(({ j, order }) => order === 2 && g.atoms[j].el === 'C')?.j;
      if (h === 2) return partner !== undefined && g.atoms[partner].h === 2 ? 123 : 115;
      return h === 1 ? 132 : 142;
    }
    default: return 128;
  }
}

export interface CarbonPeak { atoms: number[]; shift: number; kind: CarbonKind }

/** One peak per carbon environment, highest shift first. */
export function carbonPeaks(g: SGraph): CarbonPeak[] {
  const cls = classes(g), arom = aromaticAtoms(g);
  const peaks = new Map<number, CarbonPeak>();
  g.atoms.forEach((a, i) => {
    if (a.el !== 'C') return;
    const peak = peaks.get(cls[i]);
    if (peak) { peak.atoms.push(i); return; }
    const kind = carbonKind(g, i, arom);
    peaks.set(cls[i], { atoms: [i], shift: Math.round(carbonShift(g, i, kind, arom) * 10) / 10, kind });
  });
  return [...peaks.values()].sort((x, y) => y.shift - x.shift);
}

// ── ¹H NMR ───────────────────────────────────────────────────────────────────────────────────────────────────────

export type ProtonKind = 'acid' | 'aldehyde' | 'formate' | 'aromatic' | 'alkene' | 'h-c-o' | 'h-c-halogen' | 'h-c-n' | 'alpha-carbonyl'
  | 'alpha-nitrile' | 'benzylic' | 'allylic' | 'alkyl' | 'alcohol' | 'amine';

export const H1_RANGES: Readonly<Record<ProtonKind, { range: [number, number]; about: string }>> = {
  acid: { range: [10, 12], about: 'O–H of an acid' },
  aldehyde: { range: [9, 10], about: 'H on the C=O of an aldehyde' },
  formate: { range: [8, 8.2], about: 'H on the C=O of a methanoate' },
  aromatic: { range: [6.5, 8], about: 'H on an aromatic ring' },
  alkene: { range: [4.5, 6], about: 'H on a C=C' },
  'h-c-o': { range: [3.3, 4.3], about: 'H on a carbon bonded to O' },
  'h-c-halogen': { range: [3, 4.2], about: 'H on a carbon bonded to a halogen' },
  'h-c-n': { range: [2.3, 2.9], about: 'H on a carbon bonded to N' },
  'alpha-carbonyl': { range: [2, 2.9], about: 'H on a carbon next to a C=O' },
  'alpha-nitrile': { range: [2, 2.9], about: 'H on a carbon next to a C≡N' },
  benzylic: { range: [2.3, 2.7], about: 'H on a carbon next to a benzene ring' },
  allylic: { range: [1.6, 2.2], about: 'H on a carbon next to a C=C' },
  alkyl: { range: [0.7, 2], about: 'H in an alkyl chain' },
  alcohol: { range: [0.5, 5], about: 'O–H of an alcohol (varies; no splitting)' },
  amine: { range: [1, 5], about: 'N–H (varies; no splitting)' },
};

function protonKind(g: SGraph, i: number, arom: Set<number>): ProtonKind {
  const el = g.atoms[i].el;
  const n = around(g, i);
  if (el === 'O') return n.some(({ j }) => around(g, j).some(({ j: k, order }) => order === 2 && g.atoms[k].el === 'O')) ? 'acid' : 'alcohol';
  if (el === 'N') return 'amine';
  const cKind = carbonKind(g, i, arom);
  if (cKind === 'aldehyde') return 'aldehyde';
  if (cKind === 'acyl-acid' || cKind === 'acyl-ester') return 'formate';
  if (cKind === 'aromatic') return 'aromatic';
  if (cKind === 'alkene') return 'alkene';
  if (cKind === 'c-o') return 'h-c-o';
  if (cKind === 'c-halogen') return 'h-c-halogen';
  if (cKind === 'c-n') return 'h-c-n';
  if (cKind === 'alpha-carbonyl') return 'alpha-carbonyl';
  if (n.some(({ j }) => around(g, j).some(({ j: k, order }) => order === 3 && g.atoms[k].el === 'N'))) return 'alpha-nitrile';
  if (n.some(({ j }) => arom.has(j))) return 'benzylic';
  if (n.some(({ j }) => g.atoms[j].el === 'C' && around(g, j).some(({ j: k, order }) => order === 2 && g.atoms[k].el === 'C'))) return 'allylic';
  return 'alkyl';
}

function protonShift(g: SGraph, i: number, kind: ProtonKind): number {
  const h = g.atoms[i].h;
  const pick = (ch3: number, ch2: number, ch: number) => (h >= 3 ? ch3 : h === 2 ? ch2 : ch);
  const n = around(g, i);
  switch (kind) {
    case 'acid': return 11.5;
    case 'aldehyde': return 9.8;
    case 'formate': return 8.1;
    case 'aromatic': return 7.3;
    case 'alkene': return h >= 2 ? 4.9 : 5.5;
    case 'h-c-o': {
      // An ester's O–CH next to the C=O's oxygen sits higher than an alcohol's or ether's.
      const ester = n.some(({ j }) => g.atoms[j].el === 'O' && around(g, j).some(({ j: k }) => k !== i && around(g, k).some(({ j: m, order }) => order === 2 && g.atoms[m].el === 'O')));
      return pick(3.4, 3.6, 4.0) + (ester ? 0.4 : 0);
    }
    case 'h-c-halogen': return pick(3.0, 3.5, 4.2) + 1.6 * (n.filter(({ j }) => HALOGENS.includes(g.atoms[j].el)).length - 1);
    case 'h-c-n': return pick(2.4, 2.7, 2.9);
    case 'alpha-carbonyl': return pick(2.1, 2.4, 2.6);
    case 'alpha-nitrile': return pick(2.0, 2.4, 2.7);
    case 'benzylic': return 2.3;
    case 'allylic': return 1.7;
    case 'alcohol': return 2.0;
    case 'amine': return 1.5;
    case 'alkyl': {
      // A pull from one bond further away: an O, N or halogen on the next carbon, less for a C=O, C≡N or ring there.
      const beta = n.some(({ j }) => g.atoms[j].el === 'C' && pulled(g, j, i)) ? 0.3
        : n.some(({ j }) => g.atoms[j].el === 'C' && around(g, j).some(({ j: k }) => k !== i && (carbonyl(g, k) || aromaticAtoms(g).has(k)))) ? 0.2 : 0;
      return Math.round((pick(0.9, 1.3, 1.5) + beta) * 10) / 10;
    }
  }
}

export interface ProtonPeak {
  /** The atoms carrying these hydrogens. */
  atoms: number[];
  /** Hydrogens in the environment: the peak's relative area. */
  count: number;
  shift: number;
  kind: ProtonKind;
  /** n in n + 1: hydrogens on neighbouring carbons; −1 for a multiplet (ring H that are not all alike). */
  next: number;
}
export const SPLITTING = ['singlet', 'doublet', 'triplet', 'quartet', 'quintet', 'sextet', 'septet', 'octet', 'nonet'] as const;
export const splittingName = (next: number) => (next < 0 ? 'multiplet' : SPLITTING[next] ?? `${next + 1} lines`);

/** One peak per hydrogen environment, highest shift first. */
export function protonPeaks(g: SGraph): ProtonPeak[] {
  const cls = classes(g), arom = aromaticAtoms(g);
  const peaks = new Map<number, ProtonPeak>();
  g.atoms.forEach((a, i) => {
    if (!a.h) return;
    const peak = peaks.get(cls[i]);
    if (peak) { peak.atoms.push(i); peak.count += a.h; return; }
    const kind = protonKind(g, i, arom);
    // O–H and N–H exchange and are not split; a C–H is split by the H on neighbouring carbons only, and never by
    // hydrogens of its own environment (the two CH₂ of ClCH₂CH₂Cl give one singlet).
    let next = kind === 'alcohol' || kind === 'acid' || kind === 'amine' ? 0
      : around(g, i).reduce((s, { j }) => s + (g.atoms[j].el === 'C' && cls[j] !== cls[i] ? g.atoms[j].h : 0), 0);
    if (kind === 'aromatic') next = 0;
    peaks.set(cls[i], { atoms: [i], count: a.h, shift: Math.round(protonShift(g, i, kind) * 10) / 10, kind, next });
  });
  const list = [...peaks.values()];
  // Ring hydrogens that are not all alike overlap into one multiplet, as a school spectrum shows them.
  const ring = list.filter((p) => p.kind === 'aromatic');
  if (ring.length > 1) {
    const merged: ProtonPeak = { atoms: ring.flatMap((p) => p.atoms), count: ring.reduce((s, p) => s + p.count, 0), shift: 7.2, kind: 'aromatic', next: -1 };
    return [...list.filter((p) => p.kind !== 'aromatic'), merged].sort((x, y) => y.shift - x.shift);
  }
  return list.sort((x, y) => y.shift - x.shift);
}

// ── Infrared ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface IrBand { bond: string; range: [number, number]; centre: number; broad: boolean; atoms: number[] }

export function irBands(g: SGraph): IrBand[] {
  const out: IrBand[] = [];
  const add = (bond: string, range: [number, number], centre: number, atoms: number[], broad = false) => {
    const known = out.find((b) => b.bond === bond);
    if (known) known.atoms.push(...atoms); else out.push({ bond, range, centre, broad, atoms });
  };
  const arom = aromaticAtoms(g);
  g.atoms.forEach((a, i) => {
    const n = around(g, i);
    if (a.el === 'O' && a.h) {
      const acid = n.some(({ j }) => around(g, j).some(({ j: k, order }) => order === 2 && g.atoms[k].el === 'O'));
      add(acid ? 'O–H (acid)' : 'O–H (alcohol)', acid ? [2500, 3000] : [3230, 3550], acid ? 2950 : 3350, [i], true);
    }
    if (a.el === 'N' && a.h) add('N–H', [3300, 3500], 3380, [i]);
    if (a.el === 'C' && a.h) add('C–H', [2850, 3100], 2960, [i]);
  });
  for (const b of g.bonds) {
    const [x, y] = [g.atoms[b.a].el, g.atoms[b.b].el].sort();
    const atoms = [b.a, b.b];
    const c = g.atoms[b.a].el === 'C' ? b.a : b.b;
    if (x === 'C' && y === 'O' && b.order === 2) {
      // Where in the range: esters highest, then aldehydes, ketones and acids; a ring next to it lowers it.
      const kind = carbonKind(g, c, arom);
      const centre = { 'acyl-ester': 1740, aldehyde: 1730, ketone: 1715, 'acyl-acid': 1710 }[kind as string] ?? 1715;
      add('C=O', [1680, 1750], centre - (around(g, c).some(({ j }) => arom.has(j)) ? 25 : 0), atoms);
    }
    if (x === 'C' && y === 'N' && b.order === 3) add('C≡N', [2220, 2260], 2250, atoms);
    if (x === 'C' && y === 'C' && b.order === 2 && !(arom.has(b.a) && arom.has(b.b))) add('C=C', [1620, 1680], 1650, atoms);
    if (x === 'C' && y === 'O' && b.order === 1) {
      const o = c === b.a ? b.b : b.a;
      const acyl = carbonyl(g, c) || around(g, o).some(({ j }) => j !== c && carbonyl(g, j));
      const carbons = around(g, c).filter(({ j }) => g.atoms[j].el === 'C').length;
      add('C–O', [1000, 1300], acyl ? 1240 : g.atoms[o].h ? [1030, 1050, 1100, 1150][Math.min(3, carbons)] : 1120, atoms);
    }
  }
  return out.sort((p, q) => q.centre - p.centre);
}

// ── Mass spectrum ────────────────────────────────────────────────────────────────────────────────────────────────

export interface MassPeak {
  mz: number;
  /** Relative to the tallest peak (100). */
  height: number;
  /** The ion: its formula, or M⁺, M + 1, M + 2. */
  label: string;
  kind: 'molecular' | 'isotope' | 'fragment';
  /** The atoms the fragment keeps (empty for the molecular ion's peaks). */
  atoms: number[];
}

const formulaOfAtoms = (g: SGraph, atoms: Iterable<number>) => {
  const counts = new Map<string, number>();
  for (const i of atoms) { const a = g.atoms[i]; counts.set(a.el, (counts.get(a.el) ?? 0) + 1); if (a.h) counts.set('H', (counts.get('H') ?? 0) + a.h); }
  const order = (el: string) => (el === 'C' ? '0' : el === 'H' ? '1' : `2${el}`);
  return [...counts].sort(([p], [q]) => (order(p) < order(q) ? -1 : 1)).map(([el, n]) => `${el}${n > 1 ? n : ''}`).join('');
};
export const formulaOfGraph = (g: SGraph) => formulaOfAtoms(g, g.atoms.map((_, i) => i));
const massOf = (g: SGraph, atoms: Iterable<number>) => [...atoms].reduce((s, i) => s + (MASS[g.atoms[i].el] ?? 0) + g.atoms[i].h, 0);
export const nominalMass = (g: SGraph) => massOf(g, g.atoms.map((_, i) => i));

/** Chlorine is 3 : 1 in ³⁵Cl : ³⁷Cl and bromine about 1 : 1 in ⁷⁹Br : ⁸¹Br: the M, M + 2, M + 4 … heights, combined atom by atom. */
export function halogenPattern(cl: number, br: number): number[] {
  let pattern = [1];
  const times = (p: number[], q: number[]) => { const r = new Array(p.length + q.length - 1).fill(0); p.forEach((x, i) => q.forEach((y, j) => { r[i + j] += x * y; })); return r; };
  for (let k = 0; k < cl; k++) pattern = times(pattern, [1, 0, 1 / 3]);
  for (let k = 0; k < br; k++) pattern = times(pattern, [1, 0, 0.973]);
  const top = Math.max(...pattern);
  return pattern.map((p) => p / top);
}

/** The two pieces a single bond breaks into: atoms on each side, the first holding `a`; null for a ring bond. */
function sidesOf(g: SGraph, b: SBond): [number[], number[]] | null {
  const side = new Set([b.a]), queue = [b.a];
  while (queue.length) { const at = queue.shift()!; for (const { j } of around(g, at)) if (!side.has(j) && !(at === b.a && j === b.b)) { side.add(j); queue.push(j); } }
  if (side.has(b.b)) return null;
  return [[...side], g.atoms.map((_, i) => i).filter((i) => !side.has(i))];
}

/**
 * How readily a piece forms as the positive ion when the bond at `site` breaks: an ion whose charge a neighbouring lone
 * pair or a ring can share is common, a bare primary or methyl cation less so, a bare heteroatom ion rare. A rough
 * ranking, so heights are estimates; which m/z values appear is exact.
 */
function ionScore(g: SGraph, piece: Set<number>, site: number, arom: Set<number>): number {
  if (g.atoms[site].el !== 'C') return 4;
  const inside = around(g, site).filter(({ j }) => piece.has(j));
  // Acylium, R–C≡O⁺; less when the C=O carbon keeps an O as well (COOH⁺, COOCH₃⁺).
  if (inside.some(({ j, order }) => order === 2 && g.atoms[j].el === 'O')) return inside.some(({ j, order }) => order === 1 && g.atoms[j].el === 'O') ? 45 : 90;
  // Oxonium and iminium ions, CH₂=OH⁺ and CH₂=NH₂⁺: not from an ester's or acid's O, whose lone pair the C=O already shares.
  if (inside.some(({ j, order }) => order === 1 && (g.atoms[j].el === 'N' || (g.atoms[j].el === 'O' && !around(g, j).some(({ j: k }) => k !== site && carbonyl(g, k)))))) return 100;
  // A ring carbon's cation is poor, unless the piece keeps a CH₃ or CH₂ on the ring to become a tropylium ion.
  if (arom.has(site)) return [...piece].some((k) => sp3(g, k, arom) && around(g, k).some(({ j }) => arom.has(j))) ? 100 : 20;
  if (inside.some(({ j }) => arom.has(j))) return 100; // benzyl, which becomes the tropylium ion
  if (inside.some(({ j }) => g.atoms[j].el === 'C' && around(g, j).some(({ j: k, order }) => order === 2 && g.atoms[k].el === 'C'))) return 75; // allyl
  const carbons = inside.filter(({ j }) => g.atoms[j].el === 'C').length;
  return [10, 40, 70, 85][Math.min(3, carbons)];
}

/** The molecular ion's own height before scaling: strong for rings and small molecules, weak for branched alcohols. */
function molecularScore(g: SGraph, arom: Set<number>): number {
  if (arom.size) return 130;
  const carbons = g.atoms.filter((a) => a.el === 'C').length;
  const alcohol = g.atoms.findIndex((a, i) => a.el === 'O' && a.h > 0 && !around(g, i).some(({ j }) => around(g, j).some(({ j: k, order }) => order === 2 && g.atoms[k].el === 'O')));
  if (alcohol >= 0) {
    const c = around(g, alcohol).find(({ j }) => g.atoms[j].el === 'C')?.j;
    const carbonsOnC = c === undefined ? 0 : around(g, c).filter(({ j }) => g.atoms[j].el === 'C').length;
    return carbons <= 1 ? 70 : [30, 15, 8, 1][Math.min(3, carbonsOnC)];
  }
  if (g.atoms.some((x, i) => x.el === 'C' && around(g, i).filter(({ j }) => g.atoms[j].el === 'C').length === 4)) return 2;
  if (g.bonds.some((b) => b.order > 1)) return 60;
  return carbons <= 2 ? 80 : 35;
}

/**
 * The spectrum: M⁺ with its M + 1 (carbon-13) and chlorine and bromine M + 2 peaks, and the ions one broken bond gives
 * (with their own chlorine and bromine partners).
 */
export function massSpectrum(g: SGraph): MassPeak[] {
  const arom = aromaticAtoms(g);
  const all = g.atoms.map((_, i) => i);
  const m = nominalMass(g), formula = formulaOfGraph(g);
  const count = (atoms: Iterable<number>, el: string) => [...atoms].filter((i) => g.atoms[i].el === el).length;
  const raw: MassPeak[] = [];
  const molecular = molecularScore(g, arom);
  halogenPattern(count(all, 'Cl'), count(all, 'Br')).forEach((p, k) => {
    if (p > 0) raw.push({ mz: m + k, height: molecular * p, label: k === 0 ? `M⁺ ${formula}` : `M + ${k}`, kind: k === 0 ? 'molecular' : 'isotope', atoms: [] });
  });
  raw.push({ mz: m + 1, height: molecular * 0.011 * count(all, 'C'), label: 'M + 1', kind: 'isotope', atoms: [] });
  for (const b of g.bonds) {
    if (b.order !== 1) continue;
    const sides = sidesOf(g, b);
    if (!sides) continue;
    // A weak C–Br or C–I bond breaks more often; and losing the larger radical is preferred (Stevenson's rule, roughly).
    const ends = [g.atoms[b.a].el, g.atoms[b.b].el];
    const weak = ends.includes('I') ? 2.5 : ends.includes('Br') ? 2 : ends.includes('Cl') ? 1.2 : 1;
    sides.forEach((side, k) => {
      const lost = sides[1 - k].length;
      const score = ionScore(g, new Set(side), k === 0 ? b.a : b.b, arom) * weak * Math.min(1.6, 0.5 + 0.35 * lost);
      const mz = massOf(g, side), label = formulaOfAtoms(g, side);
      halogenPattern(count(side, 'Cl'), count(side, 'Br')).forEach((p, step) => {
        if (p > 0) raw.push({ mz: mz + step, height: score * p, label: step ? `${label} + ${step}` : label, kind: 'fragment', atoms: side });
      });
    });
  }
  // An arene with a CH₃ on the ring loses one H from it and rearranges to the tropylium ion, C₇H₇⁺ (methylbenzene's 91).
  // With more than one group on the ring, losing a CH₃ to the same ion is the commoner path (the dimethylbenzenes' 91).
  const methyls = all.filter((k) => sp3(g, k, arom) && g.atoms[k].h === 3 && around(g, k).some(({ j }) => arom.has(j)));
  const substituents = all.filter((k) => !arom.has(k) && around(g, k).some(({ j }) => arom.has(j))).length;
  if (methyls.length) raw.push({ mz: m - 1, height: substituents === 1 ? 110 : 30, label: `${formula} − H`, kind: 'fragment', atoms: all });
  // One peak per m/z: the tallest reason for it (isotope peaks of the molecular ion add up).
  const byMz = new Map<number, MassPeak>();
  for (const peak of raw) {
    const known = byMz.get(peak.mz);
    if (!known) byMz.set(peak.mz, { ...peak });
    else if (peak.kind === 'isotope' && known.kind === 'isotope') known.height += peak.height;
    else if (peak.height > known.height) byMz.set(peak.mz, { ...peak });
  }
  const peaks = [...byMz.values()];
  const top = Math.max(...peaks.map((p) => p.height));
  return peaks.map((p) => ({ ...p, height: Math.round((1000 * p.height) / top) / 10 })).filter((p) => p.height >= 0.5).sort((p, q) => p.mz - q.mz);
}

// ── Reading a drawing ────────────────────────────────────────────────────────────────────────────────────────────

/** A structure the engine built (atom ids) as an indexed graph, with the engine id of each index. */
export function graphOfStructure(structure: { atoms: { id: string; el: string; h: number; charge: number }[]; bonds: { a: string; b: string; order: number }[] }): { graph: SGraph; ids: string[] } {
  const ids = structure.atoms.map((a) => a.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  return {
    graph: {
      atoms: structure.atoms.map((a) => ({ el: a.el, h: a.h, ...(a.charge ? { charge: a.charge } : {}) })),
      bonds: structure.bonds.map((b) => ({ a: index.get(b.a)!, b: index.get(b.b)!, order: b.order })),
    },
    ids,
  };
}
