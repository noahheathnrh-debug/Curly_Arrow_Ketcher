import { Drawing } from '../lessons/kit';

/**
 * Small molecules for generated puzzles, drawn where they are needed. Every builder places its reacting atom at a
 * given point and grows the rest along a heading (degrees, anticlockwise from east), as a zigzag, so the reacting
 * atom always faces its partner. Textbook reagents only (the same curated sets as the app's chemistry puzzles).
 */

export class Builder {
  readonly d = new Drawing();
  private n = 0;
  private next() { return `a${++this.n}`; }
  atom(el: string, x: number, y: number, opts: { charge?: number; rad?: number } = {}) { return this.d.atom(this.next(), el, x, y, opts); }
  grow(from: string, el: string, angle: number, order: 1 | 2 | 3 = 1, opts: { charge?: number; rad?: number } = {}) { return this.d.grow(this.next(), el, from, angle, order, opts); }
  /** `count` carbons from `from`, heading `heading`, zigzagging 30° either side; returns their ids. */
  chain(from: string, count: number, heading: number, flip: 1 | -1 = 1): string[] {
    const ids: string[] = [];
    let at = from;
    for (let i = 0; i < count; i++) { at = this.grow(at, 'C', heading + (i % 2 === 0 ? 30 : -30) * flip); ids.push(at); }
    return ids;
  }
  get atoms() { return this.d.atoms; }
  get bonds() { return this.d.bonds; }
}

/** What a builder made: the atom that reacts, and the charges it drew (so a product key can list the ones that stay). */
export interface Placed { at: string; charges: Record<string, number> }

const charged = (b: Builder, ids: string[]) => Object.fromEntries(ids.map((id) => [id, b.d.get(id).charge ?? 0]).filter(([, c]) => c));

export type Hal = 'Cl' | 'Br' | 'I';
export const HALOGENS: readonly Hal[] = ['Cl', 'Br', 'I'];
export const HALO: Record<Hal, string> = { Cl: 'chloro', Br: 'bromo', I: 'iodo' };
export const HALIDE: Record<Hal, string> = { Cl: 'chloride', Br: 'bromide', I: 'iodide' };

/** A reagent with a lone pair, its reacting atom at (x, y), the rest heading away. */
export interface Donor {
  name: string;
  /** Charge on the reacting atom before it reacts (a neutral donor ends positive). */
  charge: number;
  not?: Hal;
  build(b: Builder, x: number, y: number, heading: number): Placed;
}

function single(el: string, charge: number) {
  return (b: Builder, x: number, y: number): Placed => { const at = b.atom(el, x, y, { charge }); return { at, charges: charged(b, [at]) }; };
}
function alkylated(el: string, carbons: number) {
  return (b: Builder, x: number, y: number, heading: number): Placed => {
    const at = b.atom(el, x, y, { charge: -1 });
    b.chain(at, carbons, heading);
    return { at, charges: charged(b, [at]) };
  };
}
function carboxylate(b: Builder, x: number, y: number, heading: number, opts: { carbons: number; acid?: boolean }): { o: string; c: string; ids: string[] } {
  const o = b.atom('O', x, y, { charge: opts.acid ? 0 : -1 });
  const c = b.grow(o, 'C', heading + 30);
  const oDouble = b.grow(c, 'O', heading + 90, 2);
  const chain = opts.carbons ? b.chain(c, opts.carbons, heading - 30, -1) : [];
  return { o, c, ids: [o, c, oDouble, ...chain] };
}

export const NUCLEOPHILES: readonly Donor[] = [
  { name: 'hydroxide', charge: -1, build: single('O', -1) },
  { name: 'methoxide', charge: -1, build: alkylated('O', 1) },
  { name: 'ethoxide', charge: -1, build: alkylated('O', 2) },
  { name: 'hydrosulfide', charge: -1, build: single('S', -1) },
  { name: 'methanethiolate', charge: -1, build: alkylated('S', 1) },
  { name: 'cyanide', charge: -1, build: (b, x, y, heading) => { const at = b.atom('C', x, y, { charge: -1 }); b.grow(at, 'N', heading, 3); return { at, charges: { [at]: -1 } }; } },
  { name: 'azide', charge: -1, build: (b, x, y, heading) => {
    const at = b.atom('N', x, y, { charge: -1 });
    const mid = b.grow(at, 'N', heading, 2, { charge: 1 });
    const end = b.grow(mid, 'N', heading, 2, { charge: -1 });
    return { at, charges: { [at]: -1, [mid]: 1, [end]: -1 } };
  } },
  { name: 'iodide', charge: -1, not: 'I', build: single('I', -1) },
  { name: 'ammonia', charge: 0, build: single('N', 0) },
  { name: 'ethanoate', charge: -1, build: (b, x, y, heading) => { const { o } = carboxylate(b, x, y, heading, { carbons: 1 }); return { at: o, charges: { [o]: -1 } }; } },
];

/** An acid, with its proton drawn at (x, y) and the atom holding it one bond along `heading`. pKa in water. */
export interface Acid {
  name: string;
  pKa: number;
  /** The element holding the proton when that atom also carries another heavy atom (see PROTON_TRANSFERS). */
  swap?: string;
  build(b: Builder, x: number, y: number, heading: number): { h: string; x: string; charges: Record<string, number> };
}
const hydrogenOn = (el: string, charge = 0) => (b: Builder, x: number, y: number, heading: number) => {
  const h = b.atom('H', x, y);
  const holder = b.grow(h, el, heading, 1, { charge });
  return { h, x: holder, charges: charged(b, [holder]) };
};
const carboxylic = (carbons: number) => (b: Builder, x: number, y: number, heading: number) => {
  const h = b.atom('H', x, y);
  const a = (heading * Math.PI) / 180;
  const { o, ids } = carboxylate(b, x + Math.cos(a), y + Math.sin(a), heading, { carbons, acid: true });
  b.d.bond(h, o);
  return { h, x: o, charges: charged(b, ids) };
};

export const ACIDS: readonly Acid[] = [
  { name: 'methanoic acid', swap: 'O', pKa: 3.75, build: carboxylic(0) },
  { name: 'ethanoic acid', swap: 'O', pKa: 4.76, build: carboxylic(1) },
  { name: 'propanoic acid', swap: 'O', pKa: 4.87, build: carboxylic(2) },
  { name: 'hydrogen chloride', pKa: -7, build: hydrogenOn('Cl') },
  { name: 'hydrogen bromide', pKa: -9, build: hydrogenOn('Br') },
  { name: 'hydronium', pKa: -1.74, build: hydrogenOn('O', 1) },
  { name: 'ammonium', pKa: 9.25, build: hydrogenOn('N', 1) },
  { name: 'methylammonium', swap: 'N', pKa: 10.6, build: (b, x, y, heading) => { const r = hydrogenOn('N', 1)(b, x, y, heading); b.chain(r.x, 1, heading); return r; } },
  { name: 'ethanethiol', swap: 'S', pKa: 10.6, build: (b, x, y, heading) => { const r = hydrogenOn('S')(b, x, y, heading); b.chain(r.x, 2, heading); return r; } },
  { name: 'hydrogen cyanide', swap: 'C', pKa: 9.2, build: (b, x, y, heading) => { const h = b.atom('H', x, y); const c = b.grow(h, 'C', heading); b.grow(c, 'N', heading, 3); return { h, x: c, charges: {} }; } },
];

/** A base, its reacting atom at (x, y). `conj` is the pKa of its conjugate acid. */
export interface Base extends Donor { conj: number; swap?: string }
export const BASES: readonly Base[] = [
  { name: 'hydroxide', conj: 15.7, charge: -1, build: single('O', -1) },
  { name: 'methoxide', swap: 'O', conj: 15.5, charge: -1, build: alkylated('O', 1) },
  { name: 'ethoxide', swap: 'O', conj: 16, charge: -1, build: alkylated('O', 2) },
  { name: 'ammonia', conj: 9.25, charge: 0, build: single('N', 0) },
  { name: 'methylamine', swap: 'N', conj: 10.6, charge: 0, build: (b, x, y, heading) => { const at = b.atom('N', x, y); b.chain(at, 1, heading); return { at, charges: {} }; } },
  { name: 'water', conj: -1.74, charge: 0, build: single('O', 0) },
  { name: 'ethanoate', swap: 'O', conj: 4.76, charge: -1, build: (b, x, y, heading) => { const { o } = carboxylate(b, x, y, heading, { carbons: 1 }); return { at: o, charges: { [o]: -1 } }; } },
  { name: 'cyanide', swap: 'C', conj: 9.2, charge: -1, build: (b, x, y, heading) => { const at = b.atom('C', x, y, { charge: -1 }); b.grow(at, 'N', heading, 3); return { at, charges: { [at]: -1 } }; } },
];

/**
 * Only proton transfers that clearly go forward (the base's conjugate acid at least 3 pKa units weaker), and never two
 * sites of one element that each carry another heavy atom: there, swapping those heavy atoms gives the same products,
 * so a set of arrows that is not a proton transfer would make the same thing (found by the app's hostile test).
 */
export const PROTON_TRANSFERS = ACIDS.flatMap((acid) => BASES
  .filter((base) => base.conj - acid.pKa >= 3 && !(acid.swap && acid.swap === base.swap))
  .map((base) => ({ acid, base })));

/** Aldehydes and ketones: the two groups on the carbonyl carbon, as carbon counts (0 is a hydrogen). */
export const CARBONYLS: readonly { name: string; groups: [number, number] }[] = [
  { name: 'methanal', groups: [0, 0] },
  { name: 'ethanal', groups: [1, 0] },
  { name: 'propanal', groups: [2, 0] },
  { name: 'butanal', groups: [3, 0] },
  { name: 'propanone', groups: [1, 1] },
  { name: 'butanone', groups: [2, 1] },
  { name: 'pentan-3-one', groups: [2, 2] },
];
/** Nucleophiles that add to a carbonyl in one step (hydride stands for sodium borohydride, as first-year courses draw it). */
export const CARBONYL_NUCLEOPHILES: readonly Donor[] = [
  { name: 'cyanide', charge: -1, build: NUCLEOPHILES.find((n) => n.name === 'cyanide')!.build },
  { name: 'hydride (from sodium borohydride)', charge: -1, build: single('H', -1) },
  { name: 'hydroxide', charge: -1, build: single('O', -1) },
  { name: 'methoxide', charge: -1, build: alkylated('O', 1) },
];

/** Primary halides only, so SN2 is the textbook path. Carbon counts and names. */
export const SN2_SUBSTRATES: readonly { carbons: number; name: (x: Hal) => string }[] = [
  { carbons: 1, name: (x) => `${HALO[x]}methane` },
  { carbons: 2, name: (x) => `${HALO[x]}ethane` },
  { carbons: 3, name: (x) => `1-${HALO[x]}propane` },
  { carbons: 4, name: (x) => `1-${HALO[x]}butane` },
];

/** Halide ions as nucleophiles (carbocation capture). */
export const HALIDE_IONS: readonly Donor[] = HALOGENS.map((x) => ({ name: HALIDE[x], charge: -1, build: single(x, -1) }));
/** Neutral oxygen nucleophiles and weak bases: the solvent in SN1 and E1. */
export const SOLVENTS: readonly Donor[] = [
  { name: 'water', charge: 0, build: single('O', 0) },
  { name: 'methanol', charge: 0, build: (b, x, y, heading) => { const at = b.atom('O', x, y); b.chain(at, 1, heading); return { at, charges: {} }; } },
  { name: 'ethanol', charge: 0, build: (b, x, y, heading) => { const at = b.atom('O', x, y); b.chain(at, 2, heading); return { at, charges: {} }; } },
  { name: 'propan-1-ol', charge: 0, build: (b, x, y, heading) => { const at = b.atom('O', x, y); b.chain(at, 3, heading); return { at, charges: {} }; } },
];
/** Strong bases for E2: alkoxides and hydroxide. */
export const E2_BASES: readonly Donor[] = NUCLEOPHILES.filter((n) => ['hydroxide', 'methoxide', 'ethoxide'].includes(n.name));

/**
 * Halides for E2, as the methyls on the halogen's carbon (alpha) besides the carbon that loses the proton (beta), and
 * the carbons after beta. Secondary and tertiary only: with these bases a primary halide mostly does SN2 (hostile
 * review, 2026-11-11). The proton drawn is on the more substituted beta carbon, so the alkene is the Zaitsev one.
 */
export const E2_SUBSTRATES: readonly { alpha: 1 | 2; beta: number; name: (x: Hal) => string; alkene: string }[] = [
  { alpha: 1, beta: 0, name: (x) => `2-${HALO[x]}propane`, alkene: 'propene' },
  { alpha: 1, beta: 1, name: (x) => `2-${HALO[x]}butane`, alkene: 'but-2-ene' },
  { alpha: 1, beta: 2, name: (x) => `2-${HALO[x]}pentane`, alkene: 'pent-2-ene' },
  { alpha: 2, beta: 0, name: (x) => `2-${HALO[x]}-2-methylpropane`, alkene: '2-methylprop-1-ene' },
  { alpha: 2, beta: 1, name: (x) => `2-${HALO[x]}-2-methylbutane`, alkene: '2-methylbut-2-ene' },
];

/** Tertiary carbocations (no shift can improve them), as the carbon counts of their three groups, each 1 or 2. */
export const CARBOCATIONS: readonly { groups: [number, number, number]; name: string; alkene: string }[] = [
  { groups: [1, 1, 1], name: 'the tert-butyl cation', alkene: '2-methylprop-1-ene' },
  { groups: [1, 1, 2], name: 'the 2-methylbutan-2-ylium ion', alkene: '2-methylbut-2-ene' },
  { groups: [1, 2, 2], name: 'the 3-methylpentan-3-ylium ion', alkene: '3-methylpent-2-ene' },
  { groups: [2, 2, 2], name: 'the 3-ethylpentan-3-ylium ion', alkene: '3-ethylpent-2-ene' },
];

/**
 * Grignard reagents, drawn as the carbanion they behave as: the engine treats a metal as an ion, so the C–Mg bond is
 * shown already broken and the text says so.
 */
export const GRIGNARDS: readonly { name: string; group: string; build: Donor['build'] }[] = [
  { name: 'methylmagnesium bromide', group: 'methyl', build: alkylated('C', 0) },
  { name: 'ethylmagnesium bromide', group: 'ethyl', build: alkylated('C', 1) },
  { name: 'propylmagnesium bromide', group: 'propyl', build: alkylated('C', 2) },
  { name: 'methylmagnesium iodide', group: 'methyl', build: alkylated('C', 0) },
];

/** What adds to a carbonyl before water leaves: an alcohol (towards an acetal) or a primary amine (towards an imine). */
export const CARBONYL_PARTNERS: readonly { name: string; el: 'O' | 'N'; carbons: number }[] = [
  { name: 'methanol', el: 'O', carbons: 1 },
  { name: 'ethanol', el: 'O', carbons: 2 },
  { name: 'methylamine', el: 'N', carbons: 1 },
  { name: 'ethylamine', el: 'N', carbons: 2 },
];
