import type { Rng, Template } from './templates';
import { Builder, NUCLEOPHILES, type Placed } from './species';

/**
 * Epoxide opening. With a strong nucleophile and no acid, the ring is opened by SN2 at the less hindered carbon; in
 * acid the protonated epoxide is opened at the more substituted carbon, as a halonium ion is. The ring sits with the
 * more substituted carbon C1 on the left (its groups lower left and upper left), C2 on the right and the oxygen above,
 * between them.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Carbons on C1: one or two lower left, optionally one or two upper left; c2Methyl puts a methyl on C2. */
interface Epoxide { name: string; lower: 1 | 2; upper?: 1 | 2; c2Methyl?: boolean }

function ring(b: Builder, e: Epoxide, oCharge: number) {
  const c1 = b.atom('C', 0, 0);
  const c2 = b.grow(c1, 'C', 0);
  const o = b.atom('O', 0.5, 0.866, oCharge ? { charge: oCharge } : {});
  b.d.bond(o, c1); b.d.bond(o, c2);
  // A second carbon goes straight down or up, away from the other group.
  const low = b.grow(c1, 'C', 210);
  if (e.lower === 2) b.grow(low, 'C', e.upper ? 270 : 150);
  if (e.upper) { const up = b.grow(c1, 'C', 150); if (e.upper === 2) b.grow(up, 'C', 90); }
  if (e.c2Methyl) b.grow(c2, 'C', 330);
  return { c1, c2, o };
}

/** Builds a reagent with `build`, then gives the moves that bring its reacting atom to (x, y). */
function placed(b: Builder, build: () => Placed) {
  const before = b.atoms.length;
  const p = build();
  const ids = b.atoms.slice(before).map((a) => a.id);
  const at = (id: string) => b.atoms.find((a) => a.id === id)!;
  const to = (x: number, y: number) => {
    const dx = x - at(p.at).x, dy = y - at(p.at).y;
    return Object.fromEntries(ids.map((id) => [id, [at(id).x + dx, at(id).y + dy] as [number, number]]));
  };
  return { ...p, to };
}

const BASE_EPOXIDES: readonly Epoxide[] = [
  { name: 'methyloxirane', lower: 1 },
  { name: 'ethyloxirane', lower: 2 },
  { name: '2,2-dimethyloxirane', lower: 1, upper: 1 },
  { name: '2-ethyl-2-methyloxirane', lower: 2, upper: 1 },
];
const BASE_NU = ['hydroxide', 'methoxide', 'ethoxide', 'hydrosulfide', 'methanethiolate', 'cyanide', 'azide'] as const;
/** Products after the alkoxide is protonated, by nucleophile, in BASE_EPOXIDES order. */
const BASE_PRODUCT: Record<(typeof BASE_NU)[number], readonly string[]> = {
  hydroxide: ['propane-1,2-diol', 'butane-1,2-diol', '2-methylpropane-1,2-diol', '2-methylbutane-1,2-diol'],
  methoxide: ['1-methoxypropan-2-ol', '1-methoxybutan-2-ol', '1-methoxy-2-methylpropan-2-ol', '1-methoxy-2-methylbutan-2-ol'],
  ethoxide: ['1-ethoxypropan-2-ol', '1-ethoxybutan-2-ol', '1-ethoxy-2-methylpropan-2-ol', '1-ethoxy-2-methylbutan-2-ol'],
  hydrosulfide: ['1-sulfanylpropan-2-ol', '1-sulfanylbutan-2-ol', '2-methyl-1-sulfanylpropan-2-ol', '2-methyl-1-sulfanylbutan-2-ol'],
  methanethiolate: ['1-(methylsulfanyl)propan-2-ol', '1-(methylsulfanyl)butan-2-ol', '2-methyl-1-(methylsulfanyl)propan-2-ol', '2-methyl-1-(methylsulfanyl)butan-2-ol'],
  cyanide: ['3-hydroxybutanenitrile', '3-hydroxypentanenitrile', '3-hydroxy-3-methylbutanenitrile', '3-hydroxy-3-methylpentanenitrile'],
  azide: ['1-azidopropan-2-ol', '1-azidobutan-2-ol', '1-azido-2-methylpropan-2-ol', '1-azido-2-methylbutan-2-ol'],
};
export const BASE_SETS = BASE_EPOXIDES.flatMap((epoxide, e) => BASE_NU.map((nu) => ({ epoxide, nu, product: BASE_PRODUCT[nu][e] })));

export const epoxideBase: Template = {
  id: 'epoxide-opening-base',
  title: 'An epoxide opened by a nucleophile',
  phrase: 'epoxide opening',
  skill: 'substitution',
  variants: BASE_SETS.length,
  make(rng) {
    const { epoxide, nu: nuName, product } = pick(rng, BASE_SETS);
    const b = new Builder();
    const { c1, c2, o } = ring(b, epoxide, 0);
    const donor = NUCLEOPHILES.find((n) => n.name === nuName)!;
    // Anti to the oxygen: lower right of C2.
    const nu = placed(b, () => donor.build(b, 1.85, -1.47, 300));
    const charges: Record<string, number> = { ...nu.charges, [o]: -1 };
    delete charges[nu.at];
    return {
      id: 'practice-epoxide-opening-base', title: `${cap(nuName)} and ${epoxide.name}`, unit: 'Epoxides', skill: 'substitution', level: 2,
      summary: `${cap(nuName)} opens ${epoxide.name} at the less hindered carbon, giving ${product} once the alkoxide is protonated.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: `${cap(nuName)} opens the ring`, prompt: `Show ${nuName} opening the epoxide.`,
        arrows: [
          { from: nu.at, to: `${nu.at}-${c2}`, says: `A lone pair on ${nuName} attacks the CH2 carbon, from the side opposite the oxygen.` },
          { from: `${c2}-${o}`, to: o, says: 'The C–O bond breaks and its electrons go to oxygen: the ring opens.' },
        ],
        hints: ['With no acid present this is an SN2 reaction, so the nucleophile goes to the less hindered carbon.', 'Two arrows: the nucleophile to carbon, and the C–O bond onto oxygen.'],
        explanation: `An alkoxide. With a strong nucleophile and no acid this is an SN2 reaction, at the less hindered CH2 carbon. An alkoxide is normally far too poor a leaving group for SN2, but opening the strained three-membered ring (about 110 kJ mol−1 of strain) makes up for it. The solvent or the work-up then protonates the alkoxide, giving ${product}.${epoxide.upper ? ' In acid the same epoxide is opened at the other carbon, the more substituted one.' : ''}`,
        move: { ...nu.to(1.5, -0.866), [o]: [0, 1] },
      }],
      expect: { bonds: [`${nu.at}-${c2}`, `${o}-${c1}`], absent: [`${c2}-${o}`], charges },
    };
  },
};

const ACID_EPOXIDES: readonly Epoxide[] = [
  { name: '2,2-dimethyloxirane', lower: 1, upper: 1 },
  { name: '2-ethyl-2-methyloxirane', lower: 2, upper: 1 },
  { name: '2,2-diethyloxirane', lower: 2, upper: 2 },
  { name: '2,2,3-trimethyloxirane', lower: 1, upper: 1, c2Methyl: true },
];
interface AcidNu { name: string; reagent: string; build: (b: Builder, x: number, y: number) => Placed; halide?: boolean; ether?: boolean }
const oxygen = (carbons: 0 | 1 | 2) => (b: Builder, x: number, y: number): Placed => {
  const at = b.atom('O', x, y);
  if (carbons) { const c = b.grow(at, 'C', 300); if (carbons === 2) b.grow(c, 'C', 0); }
  return { at, charges: {} };
};
const halide = (el: 'Br' | 'Cl') => (b: Builder, x: number, y: number): Placed => { const at = b.atom(el, x, y, { charge: -1 }); return { at, charges: { [at]: -1 } }; };
const ACID_NU: readonly AcidNu[] = [
  { name: 'water', reagent: 'water with an acid catalyst', build: oxygen(0) },
  { name: 'methanol', reagent: 'methanol with an acid catalyst', build: oxygen(1), ether: true },
  { name: 'ethanol', reagent: 'ethanol with an acid catalyst', build: oxygen(2), ether: true },
  { name: 'bromide', reagent: 'hydrogen bromide', build: halide('Br'), halide: true },
  { name: 'chloride', reagent: 'hydrogen chloride', build: halide('Cl'), halide: true },
];
/** Products by nucleophile, in ACID_EPOXIDES order. */
const ACID_PRODUCT: Record<string, readonly string[]> = {
  water: ['2-methylpropane-1,2-diol', '2-methylbutane-1,2-diol', '2-ethylbutane-1,2-diol', '2-methylbutane-2,3-diol'],
  methanol: ['2-methoxy-2-methylpropan-1-ol', '2-methoxy-2-methylbutan-1-ol', '2-ethyl-2-methoxybutan-1-ol', '3-methoxy-3-methylbutan-2-ol'],
  ethanol: ['2-ethoxy-2-methylpropan-1-ol', '2-ethoxy-2-methylbutan-1-ol', '2-ethoxy-2-ethylbutan-1-ol', '3-ethoxy-3-methylbutan-2-ol'],
  bromide: ['2-bromo-2-methylpropan-1-ol', '2-bromo-2-methylbutan-1-ol', '2-bromo-2-ethylbutan-1-ol', '3-bromo-3-methylbutan-2-ol'],
  chloride: ['2-chloro-2-methylpropan-1-ol', '2-chloro-2-methylbutan-1-ol', '2-chloro-2-ethylbutan-1-ol', '3-chloro-3-methylbutan-2-ol'],
};
export const ACID_SETS = ACID_EPOXIDES.flatMap((epoxide, e) => ACID_NU.map((nu) => ({ epoxide, nu, product: ACID_PRODUCT[nu.name][e] })));

export const epoxideAcid: Template = {
  id: 'epoxide-opening-acid',
  title: 'A protonated epoxide opened',
  phrase: 'acid-catalysed epoxide opening',
  skill: 'substitution',
  variants: ACID_SETS.length,
  make(rng) {
    const { epoxide, nu: n, product } = pick(rng, ACID_SETS);
    const b = new Builder();
    const { c1, c2, o } = ring(b, epoxide, 1);
    // Below C1, anti to the oxygen as far as the groups allow.
    const nu = placed(b, () => n.build(b, 0.6, -1.8));
    const c2Kind = epoxide.c2Methyl ? 'the less substituted carbon' : 'the CH2 carbon';
    return {
      id: 'practice-epoxide-opening-acid', title: `${cap(epoxide.name)} and ${n.reagent}`, unit: 'Epoxides', skill: 'substitution', level: 2,
      summary: `In acid, ${n.name} opens protonated ${epoxide.name} at the more substituted carbon, giving ${product}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: `${cap(n.name)} opens the protonated epoxide`, prompt: `Show ${n.name} opening the protonated epoxide at the more substituted carbon.`,
        arrows: [
          { from: nu.at, to: `${nu.at}-${c1}`, says: `A lone pair on ${n.name} attacks the more substituted carbon, from the side opposite the oxygen.` },
          { from: `${c1}-${o}`, to: o, says: 'The C–O bond breaks and its electrons go to the positive oxygen, which is neutral again.' },
        ],
        hints: ['A protonated epoxide is opened like a bromonium ion: at the carbon better able to carry positive charge.', 'Two arrows: the nucleophile to carbon, and the C–O bond onto oxygen.'],
        explanation: `${n.halide ? cap(product) : `A protonated ${n.ether ? 'ether' : 'alcohol'}; losing a proton gives ${product}`}. Protonation makes the epoxide oxygen a good leaving group, and the C–O bond to the more substituted carbon is the longer, weaker one: that carbon carries more of the positive charge, so the nucleophile attacks there even though it is more hindered, still from the side opposite the oxygen. With a strong nucleophile and no acid, the same epoxide is opened at ${c2Kind} instead.${n.name === 'water' ? (epoxide.c2Methyl ? ' With water both routes give the same diol, though for this epoxide they invert different carbons, so their stereochemistry differs.' : ' With water both routes give the same diol; the difference shows with other nucleophiles.') : ''}${n.halide ? ' Halide ions are good nucleophiles, so in practice some attack at the other carbon also occurs.' : ''}`,
        move: { ...nu.to(0.5, -0.866), [o]: [1.5, 0.866] },
      }],
      expect: { bonds: [`${nu.at}-${c1}`, `${o}-${c2}`], absent: [`${c1}-${o}`], charges: n.halide ? {} : { [nu.at]: 1 } },
    };
  },
};

export const EPOXIDE_TEMPLATES: readonly Template[] = [epoxideBase, epoxideAcid];
