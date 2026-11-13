import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * Radical halogenation of alkanes, as its two propagation steps: a halogen atom taking a hydrogen (giving HX and an
 * alkyl radical), and the alkyl radical taking a halogen atom from X2 (giving the haloalkane and a new halogen atom).
 * Fishhook arrows: each moves one electron.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type X = 'Cl' | 'Br';
const HALOGEN: Record<X, { atom: string; molecule: string; prefix: string }> = {
  Cl: { atom: 'chlorine atom', molecule: 'chlorine', prefix: 'chloro' },
  Br: { atom: 'bromine atom', molecule: 'bromine', prefix: 'bromo' },
};

/**
 * The C–H being attacked: the carbon at the origin, the hydrogen (or the radical's free side) upper left, and the
 * carbons drawn around it. `kind` is the radical's class; `site` names the carbon in the product.
 */
interface Site {
  alkane: string; radical: string; kind: 'methyl' | 'primary' | 'secondary' | 'tertiary'; groups: number[][]; product: (prefix: string) => string;
  /** Every hydrogen of the alkane is equivalent, so there is one monohalo product. */
  equivalent?: boolean;
}
// Groups sit at 30 and 270 where they can, so with the hydrogen at 150 the carbon is drawn trigonal.
const SITES: readonly Site[] = [
  { alkane: 'methane', radical: 'methyl', kind: 'methyl', groups: [], product: (p) => `${p}methane`, equivalent: true },
  { alkane: 'ethane', radical: 'ethyl', kind: 'primary', groups: [[30]], product: (p) => `${p}ethane`, equivalent: true },
  { alkane: 'propane (at the end carbon)', radical: 'propyl', kind: 'primary', groups: [[30, 330]], product: (p) => `1-${p}propane` },
  { alkane: 'propane (at the middle carbon)', radical: 'propan-2-yl (isopropyl)', kind: 'secondary', groups: [[30], [270]], product: (p) => `2-${p}propane` },
  { alkane: '2-methylpropane', radical: 'tert-butyl', kind: 'tertiary', groups: [[330], [270], [30]], product: (p) => `2-${p}-2-methylpropane` },
  { alkane: 'butane (at an end carbon)', radical: 'butyl', kind: 'primary', groups: [[30, 330, 30]], product: (p) => `1-${p}butane` },
  { alkane: 'butane (at a middle carbon)', radical: 'butan-2-yl (sec-butyl)', kind: 'secondary', groups: [[30], [270, 210]], product: (p) => `2-${p}butane` },
  { alkane: 'pentane (at the middle carbon)', radical: 'pentan-3-yl', kind: 'secondary', groups: [[30, 330], [270, 210]], product: (p) => `3-${p}pentane` },
];
/** Each group is a chain of headings: the first bond from the reacting carbon, then on along the chain. */
function carbonWith(b: Builder, site: Site, opts: { rad?: number } = {}) {
  const c = b.atom('C', 0, 0, opts);
  for (const path of site.groups) { let at = c; for (const deg of path) at = b.grow(at, 'C', deg); }
  return c;
}
const HYPERCONJUGATION = 'neighbouring C–H and C–C bonds donate a little electron density into the singly occupied p orbital (hyperconjugation).';
const STABILITY: Record<Site['kind'], string> = {
  methyl: 'The methyl radical is the least stable alkyl radical.',
  primary: 'A primary radical: one alkyl group on the radical carbon, so more stable than methyl but less than secondary.',
  secondary: `A secondary radical, more stable than a primary one: with two alkyl groups on the radical carbon, ${HYPERCONJUGATION}`,
  tertiary: `A tertiary radical, the most stable alkyl radical: with three alkyl groups on the radical carbon, ${HYPERCONJUGATION}`,
};
/** What the step says about which hydrogen a halogen atom takes, for this alkane. */
function selectivity(site: Site, x: X): string {
  const slow = 'A bromine atom reacts slowly here, though: taking a hydrogen from a methyl or primary carbon is endothermic for bromine, by roughly 55–70 kJ/mol.';
  if (site.equivalent) return `All the hydrogens here are equivalent, so there is only one mono${HALOGEN[x].prefix} product.${x === 'Br' ? ` ${slow}` : ''}`;
  if (x === 'Cl') return 'Chlorine atoms are very reactive and only slightly selective: they take a hydrogen from any C–H, though a tertiary or secondary C–H is somewhat faster than a primary one (per hydrogen, roughly 5 : 4 : 1). So chlorination of an alkane with different kinds of C–H gives a mixture.';
  const selective = 'Bromine atoms are much less reactive and so far more selective: bromination mostly takes the hydrogen that gives the most stable radical (tertiary, then secondary, then primary).';
  return site.kind === 'primary'
    ? `${selective} This end carbon is the least favoured site: for a bromine atom the step is endothermic by roughly 55–70 kJ/mol, so bromination mostly happens at a middle carbon instead.`
    : selective;
}

const sets = SITES.flatMap((site) => (['Cl', 'Br'] as X[]).map((x) => ({ site, x })));

export const hydrogenAbstraction: Template = {
  id: 'hydrogen-abstraction',
  title: 'A halogen atom takes a hydrogen',
  phrase: 'hydrogen abstraction',
  skill: 'radicals',
  variants: sets.length,
  make(rng) {
    const { site, x } = pick(rng, sets);
    const hal = HALOGEN[x];
    const b = new Builder();
    const c = carbonWith(b, site);
    const h = b.grow(c, 'H', 150);
    const xr = b.atom(x, -1.9, 1.1, { rad: 1 });
    return {
      id: 'practice-hydrogen-abstraction', title: `A ${hal.atom} and ${site.alkane}`, unit: 'Radicals', skill: 'radicals', level: 2,
      summary: `The first propagation step of the radical ${hal.molecule === 'chlorine' ? 'chlorination' : 'bromination'} of ${site.alkane.split(' (')[0]}: a ${hal.atom} takes a hydrogen.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'The hydrogen is taken', prompt: `Show the ${hal.atom} taking the hydrogen with fishhook arrows.`,
        arrows: [
          { from: xr, to: `${xr}-${h}`, single: true, approach: 120, says: `The ${hal.atom}’s unpaired electron goes towards a new H–${x} bond.` },
          { from: `${h}-${c}`, to: `${xr}-${h}`, single: true, side: -1, approach: 300, says: `One electron of the C–H bond pairs with it in the new H–${x} bond.` },
          { from: `${h}-${c}`, to: c, single: true, side: 1, approach: 210, says: 'The other C–H electron stays on carbon, which becomes a radical.' },
        ],
        hints: ['Fishhook arrows: each moves one electron, so a new bond needs two of them.', 'The C–H bond breaks evenly: one electron each way.'],
        explanation: `H${x} and the ${site.radical} radical. ${STABILITY[site.kind]} ${selectivity(site, x)}`,
      }],
      expect: { bonds: [`${xr}-${h}`], absent: [`${c}-${h}`] },
    };
  },
};

export const halogenTransfer: Template = {
  id: 'halogen-transfer',
  title: 'An alkyl radical takes a halogen atom',
  phrase: 'halogen transfer',
  skill: 'radicals',
  variants: sets.length,
  make(rng) {
    const { site, x } = pick(rng, sets);
    const hal = HALOGEN[x];
    const b = new Builder();
    const c = carbonWith(b, site, { rad: 1 });
    const near = b.atom(x, -1.6, 0.9);
    const far = b.grow(near, x, 150);
    const product = site.product(hal.prefix);
    return {
      id: 'practice-halogen-transfer', title: `The ${site.radical} radical and ${x}2`, unit: 'Radicals', skill: 'radicals', level: 2,
      summary: `The second propagation step: the ${site.radical} radical takes a ${hal.atom} from a ${hal.molecule} molecule, giving ${product} and a new ${hal.atom} to carry the chain on.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'The halogen atom is taken', prompt: `Show the ${site.radical} radical taking a ${hal.atom} from a ${hal.molecule} molecule, with fishhook arrows.`,
        arrows: [
          { from: c, to: `${c}-${near}`, single: true, approach: 300, says: `The carbon’s unpaired electron goes towards a new C–${x} bond.` },
          { from: `${near}-${far}`, to: `${c}-${near}`, single: true, side: -1, approach: 120, says: `One electron of the ${x}–${x} bond pairs with it.` },
          { from: `${near}-${far}`, to: far, single: true, side: 1, approach: 240, says: `The other stays on the far ${x === 'Cl' ? 'chlorine' : 'bromine'}, now a radical.` },
        ],
        hints: ['Three fishhooks: two make the new C–halogen bond, and the halogen–halogen bond splits evenly.', 'A radical is used and a radical is made: the chain goes on.'],
        explanation: `${cap(product)} and a ${hal.atom}, which can take a hydrogen from another alkane molecule, so one initiation can lead to many product molecules.`,
      }],
      expect: { bonds: [`${c}-${near}`], absent: [`${near}-${far}`] },
    };
  },
};

export const RADICAL_TEMPLATES: readonly Template[] = [hydrogenAbstraction, halogenTransfer];
