import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * Nucleophilic acyl substitution, as its two halves: a nucleophile adding to an acyl chloride or an ester to make the
 * tetrahedral intermediate, and that intermediate collapsing to expel the leaving group. Acyl chlorides react with
 * neutral water, alcohols and amines; esters here only with hydroxide (base hydrolysis), the textbook pairings.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nonZero = (charges: Record<string, number>) => Object.fromEntries(Object.entries(charges).filter(([, c]) => c));

const STEM = ['', 'ethan', 'propan', 'butan'];
const ALKYL = ['', 'methyl', 'ethyl', 'propyl'];
const ALKOXIDE = ['', 'methoxide', 'ethoxide'];
/** Acyl groups by the carbons after the carbonyl carbon. */
const ACYLS = [1, 2, 3] as const;
/** Ester alkyl groups on the single-bonded oxygen. */
const ESTER_ALKYLS = [1, 2] as const;

/** What adds: its reacting atom, element, attached carbons, and the product it leads to from an acyl chloride. */
interface Partner { name: string; el: 'O' | 'N'; carbons: number; charge: number; product: (stem: string) => string }
const NEUTRAL_PARTNERS: readonly Partner[] = [
  { name: 'water', el: 'O', carbons: 0, charge: 0, product: (s) => `${s}oic acid` },
  { name: 'methanol', el: 'O', carbons: 1, charge: 0, product: (s) => `methyl ${s}oate` },
  { name: 'ethanol', el: 'O', carbons: 2, charge: 0, product: (s) => `ethyl ${s}oate` },
  { name: 'ammonia', el: 'N', carbons: 0, charge: 0, product: (s) => `${s}amide` },
  { name: 'methylamine', el: 'N', carbons: 1, charge: 0, product: (s) => `N-methyl${s}amide` },
];
const HYDROXIDE: Partner = { name: 'hydroxide', el: 'O', carbons: 0, charge: -1, product: (s) => `${s}oate` };

/** A partner's reacting atom at (x, y), its carbons heading away. */
function place(b: Builder, partner: Partner, x: number, y: number, heading: number) {
  const at = b.atom(partner.el, x, y, partner.charge ? { charge: partner.charge } : {});
  if (partner.carbons) b.chain(at, partner.carbons, heading);
  return at;
}

type Acyl = { kind: 'chloride'; acyl: number } | { kind: 'ester'; acyl: number; alkyl: number };
const acylName = (a: Acyl) => (a.kind === 'chloride' ? `${STEM[a.acyl]}oyl chloride` : `${ALKYL[a.alkyl]} ${STEM[a.acyl]}oate`);
const CHLORIDES: readonly Acyl[] = ACYLS.map((acyl) => ({ kind: 'chloride', acyl }));
const ESTERS: readonly Acyl[] = ACYLS.flatMap((acyl) => ESTER_ALKYLS.map((alkyl) => ({ kind: 'ester' as const, acyl, alkyl })));

const additionSets = [
  ...CHLORIDES.flatMap((acyl) => NEUTRAL_PARTNERS.map((partner) => ({ acyl, partner }))),
  ...ESTERS.map((acyl) => ({ acyl, partner: HYDROXIDE })),
];
export const acylAddition: Template = {
  id: 'acyl-addition',
  title: 'Addition to an acyl chloride or ester',
  phrase: 'acyl addition',
  skill: 'substitution',
  variants: additionSets.length,
  make(rng) {
    const { acyl, partner } = pick(rng, additionSets);
    const b = new Builder();
    // C=O east, the acyl chain up and left, the leaving group down and left; the nucleophile in the gap above right.
    const c = b.atom('C', 0, 0);
    const o = b.grow(c, 'O', 0, 2);
    b.chain(c, acyl.acyl, 150, -1);
    if (acyl.kind === 'chloride') b.grow(c, 'Cl', 240);
    else { const oe = b.grow(c, 'O', 240); b.chain(oe, acyl.alkyl, 210); }
    const n = place(b, partner, 0.95, 1.65, 60);
    const name = acylName(acyl);
    return {
      id: 'practice-acyl-addition', title: `${cap(partner.name)} and ${name}`, unit: 'Acyl substitution', skill: 'substitution', level: 2,
      summary: `The first half of a nucleophilic acyl substitution: ${partner.name} adds to the carbonyl carbon of ${name}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Addition', prompt: `Show ${partner.name} adding to the carbonyl carbon of ${name}.`,
        arrows: [
          { from: n, to: `${n}-${c}`, says: `A lone pair on the ${partner.el === 'O' ? 'oxygen' : 'nitrogen'} of ${partner.name} attacks the carbonyl carbon.` },
          { from: `${c}-${o}`, to: o, says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['The nucleophile attacks the carbonyl carbon, the one double-bonded to oxygen.', 'Carbon cannot take a fifth bond: the C=O π bond moves onto oxygen.'],
        explanation: acyl.kind === 'chloride'
          ? `The tetrahedral intermediate: oxygen carries the negative charge and the ${partner.el === 'O' ? 'oxygen' : 'nitrogen'} that attacked the positive one. A base (often a second molecule of the nucleophile) then removes the proton from the positive atom; the C=O re-forms and chloride leaves, in one collapse step, and the product is ${partner.product(STEM[acyl.acyl])}. Acyl chlorides react even with neutral nucleophiles because the carbonyl carbon is very electrophilic (chlorine pulls electrons and gives little back) and chloride is such a good leaving group.`
          : `The tetrahedral intermediate. When the C=O re-forms, ${ALKOXIDE[acyl.alkyl]} leaves, and it then takes the proton of the carboxylic acid, so the product is the ${STEM[acyl.acyl]}oate ion. Esters need a strong nucleophile such as hydroxide; neutral water reacts only very slowly without a catalyst.`,
      }],
      expect: { bonds: [`${n}-${c}`, `${c}-${o}:1`], charges: nonZero({ [o]: -1, [n]: partner.charge + 1 }) },
    };
  },
};

/** The neutral group on the tetrahedral intermediate that came from the nucleophile: OH, OR, NH2 or NHR. */
const collapseSets = [
  ...CHLORIDES.flatMap((acyl) => NEUTRAL_PARTNERS.map((partner) => ({ acyl, partner }))),
  ...ESTERS.map((acyl) => ({ acyl, partner: HYDROXIDE })),
];
export const tetrahedralCollapse: Template = {
  id: 'tetrahedral-collapse',
  title: 'The tetrahedral intermediate collapses',
  phrase: 'tetrahedral collapse',
  skill: 'leaving-group',
  variants: collapseSets.length,
  make(rng) {
    const { acyl, partner } = pick(rng, collapseSets);
    const b = new Builder();
    // O− up with its sides free (the arrow from its lone pair curves round one of them), the acyl chain down and
    // left, the group from the nucleophile down and right, and the leaving group straight down.
    const c = b.atom('C', 0, 0);
    const o = b.grow(c, 'O', 90, 1, { charge: -1 });
    b.chain(c, acyl.acyl, 180);
    const nu = b.grow(c, partner.el, 330);
    if (partner.carbons) b.chain(nu, partner.carbons, 0, -1);
    let leaving: string, leavingName: string;
    if (acyl.kind === 'chloride') { leaving = b.grow(c, 'Cl', 270); leavingName = 'chloride'; }
    else { leaving = b.grow(c, 'O', 270); b.chain(leaving, acyl.alkyl, 270); leavingName = ALKOXIDE[acyl.alkyl]; }
    const from = acyl.kind === 'chloride' ? `${acylName(acyl)} and ${partner.name}` : `${acylName(acyl)} and hydroxide`;
    const product = acyl.kind === 'chloride' ? partner.product(STEM[acyl.acyl]) : `${STEM[acyl.acyl]}oic acid`;
    return {
      id: 'practice-tetrahedral-collapse', title: `The intermediate from ${from}`, unit: 'Acyl substitution', skill: 'leaving-group', level: 2,
      summary: `The second half of a nucleophilic acyl substitution: the tetrahedral intermediate from ${from} re-forms its C=O and expels ${leavingName}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Collapse', prompt: `Show the tetrahedral intermediate collapsing: the C=O re-forms and ${leavingName} leaves.`,
        arrows: [
          { from: o, to: `${o}-${c}`, pair: 2, says: 'A lone pair on the negative oxygen moves back in to re-form the C=O π bond.' },
          { from: `${c}-${leaving}`, to: leaving, says: `Carbon cannot keep five bonds, so the bond to the leaving group breaks and ${leavingName} leaves with both electrons.` },
        ],
        hints: ['Two arrows: from the O− lone pair back to the C–O bond, and from the C–leaving group bond to the leaving group.', `The group that leaves is ${leavingName}.`],
        explanation: acyl.kind === 'chloride'
          ? `${cap(product)} and chloride. Chloride leaves rather than the ${partner.el === 'O' ? (partner.carbons ? 'alkoxy group' : 'OH') : 'amino group'} because it is by far the weakest base, so the most stable on its own.${partner.el === 'N' ? ' In practice two equivalents of the amine are used; the second takes up the HCl.' : ''}`
          : `${cap(product)} and ${leavingName}. ${cap(leavingName)} is a strong base, so it at once takes the acid's proton, giving the ${STEM[acyl.acyl]}oate ion and the alcohol. The acid is about 10 pKa units stronger than the alcohol, so that last step is so favourable it is effectively irreversible, which is why base hydrolysis of an ester goes to completion. (Losing hydroxide instead would just undo the addition.)`,
      }],
      expect: { bonds: [`${o}-${c}:2`], absent: [`${c}-${leaving}`], charges: { [leaving]: -1 } },
    };
  },
};

export const ACYL_TEMPLATES: readonly Template[] = [acylAddition, tetrahedralCollapse];
