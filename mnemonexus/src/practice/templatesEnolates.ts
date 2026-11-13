import type { Rng, Template } from './templates';
import { Builder, NUCLEOPHILES } from './species';

/**
 * Enolates: a base taking the α-proton of a carbonyl compound, and an enolate adding to an aldehyde (the aldol
 * addition). The carbonyl carbon keeps one layout throughout (C=O up, the α-carbon lower right, its other group lower
 * left), the layout that routes the arrows quickly.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A carbonyl compound with α-hydrogens, by what hangs off the carbonyl carbon: `group` carbons on the far side (0 for
 * an aldehyde's H), `alkoxy` carbons on an ester oxygen, and `alphaMethyl` for a methyl on the α-carbon.
 */
interface Carbonyl { name: string; group: number; alkoxy?: number; alphaMethyl?: boolean; kind: 'aldehyde' | 'ketone' | 'ester' }
const ALDEHYDES_KETONES: readonly Carbonyl[] = [
  { name: 'ethanal', group: 0, kind: 'aldehyde' },
  { name: 'propanal', group: 0, alphaMethyl: true, kind: 'aldehyde' },
  { name: 'propanone', group: 1, kind: 'ketone' },
  { name: 'butanone', group: 2, kind: 'ketone' },
];
const ESTERS: readonly { carbonyl: Carbonyl; base: string }[] = [
  { carbonyl: { name: 'methyl ethanoate', group: 0, alkoxy: 1, kind: 'ester' }, base: 'methoxide' },
  { carbonyl: { name: 'ethyl ethanoate', group: 0, alkoxy: 2, kind: 'ester' }, base: 'ethoxide' },
  { carbonyl: { name: 'ethyl propanoate', group: 0, alkoxy: 2, alphaMethyl: true, kind: 'ester' }, base: 'ethoxide' },
];
const BASES = ['hydroxide', 'methoxide', 'ethoxide'] as const;
/** How much enolate the base makes, by the kind of carbonyl compound. */
const EXTENT: Record<Carbonyl['kind'], (base: string) => string> = {
  aldehyde: (base) => `${base} makes only a little enolate at equilibrium, enough to react. A much stronger base would convert it completely, but an aldehyde’s C=O is so reactive that it is usually attacked or self-condenses first, so aldehyde enolates are made indirectly.`,
  ketone: (base) => `${base} makes only a little enolate at equilibrium, enough to react; a much stronger base such as LDA converts it completely.`,
  ester: (base) => `${base} makes only a trace of enolate at equilibrium, enough to react; a much stronger base such as LDA converts it completely.`,
};
const sideNote = (c: Carbonyl) => (c.name === 'butanone' ? ' Butanone has two α-carbons. This puzzle uses the CH3 side, the less substituted (kinetic) enolate; the CH2 side gives the more substituted enolate and a branched product.' : '');
const donor = (name: string) => NUCLEOPHILES.find((n) => n.name === name)!;

/** The carbonyl carbon at the origin, C=O up (`order` 2, or 1 for an enolate's C–O−), its far group lower left. */
function carbonylCore(b: Builder, carbonyl: Carbonyl, enolate: boolean) {
  const c = b.atom('C', 0, 0);
  const o = b.grow(c, 'O', 90, enolate ? 1 : 2, enolate ? { charge: -1 } : {});
  if (carbonyl.alkoxy) { const oe = b.grow(c, 'O', 210); b.chain(oe, carbonyl.alkoxy, 180); }
  else if (carbonyl.group) b.chain(c, carbonyl.group, 180);
  const alpha = b.grow(c, 'C', 330, enolate ? 2 : 1);
  if (carbonyl.alphaMethyl) b.grow(alpha, 'C', enolate ? 270 : 30);
  return { c, o, alpha };
}

const formationSets = [
  ...ALDEHYDES_KETONES.flatMap((carbonyl) => BASES.map((base) => ({ carbonyl, base: base as string }))),
  ...ESTERS,
];
const PKA: Record<Carbonyl['kind'], string> = {
  aldehyde: 'An aldehyde’s α-hydrogen has a pKa of about 17',
  ketone: 'A ketone’s α-hydrogen has a pKa of about 19 to 20',
  ester: 'An ester’s α-hydrogen has a pKa of about 25',
};
export const enolateFormation: Template = {
  id: 'enolate-formation',
  title: 'Making an enolate',
  phrase: 'enolate formation',
  skill: 'proton-transfer',
  variants: formationSets.length,
  make(rng) {
    const { carbonyl, base } = pick(rng, formationSets);
    const b = new Builder();
    const { c, o, alpha } = carbonylCore(b, carbonyl, false);
    const h = b.grow(alpha, 'H', 270);
    const ob = donor(base).build(b, 0.87, -2.8, 210).at;
    return {
      id: 'practice-enolate-formation', title: `${cap(base)} and ${carbonyl.name}`, unit: 'Enolates', skill: 'proton-transfer', level: 2,
      summary: `${cap(base)} removes a proton from the α-carbon of ${carbonyl.name}, the carbon next to the C=O, giving its enolate.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'The enolate forms', prompt: `Show ${base} taking the α-proton of ${carbonyl.name} to make the enolate.`,
        arrows: [
          { from: ob, to: `${ob}-${h}`, says: `A lone pair on ${base} takes the proton on the α-carbon, the carbon next to the C=O.` },
          { from: `${alpha}-${h}`, to: `${alpha}-${c}`, says: 'The C–H electrons move in to make a C=C π bond.' },
          { from: `${c}-${o}`, to: o, says: 'The C=O π electrons move onto oxygen, so the negative charge ends on oxygen.' },
        ],
        hints: ['Three arrows: base to hydrogen, C–H into C=C, C=O onto oxygen.', 'The α-hydrogen is acidic because the anion left behind is shared with the C=O oxygen.'],
        explanation: `The enolate of ${carbonyl.name}. Its negative charge is shared by resonance between oxygen and the α-carbon; the form with the charge on oxygen, drawn here, is the more important. ${PKA[carbonyl.kind]}, so ${EXTENT[carbonyl.kind](base)}${sideNote(carbonyl)}${carbonyl.alphaMethyl ? ' The enolate can form with either geometry (E or Z); one is drawn.' : ''}${carbonyl.kind === 'ester' ? ` ${cap(base)} is used with this ester so that if it attacks the C=O instead, it only swaps the alkoxy group for the same one.` : ''}`,
      }],
      expect: { bonds: [`${ob}-${h}`, `${alpha}-${c}:2`, `${c}-${o}:1`], absent: [`${alpha}-${h}`], charges: { [o]: -1 } },
    };
  },
};

/** The aldol product's name, from the enolate's parent and the aldehyde's R (0 to 3 carbons). */
const ALDOL_NAME: Record<string, (r: number) => string> = {
  ethanal: (r) => `3-hydroxy${['prop', 'but', 'pent', 'hex'][r]}anal`,
  propanal: (r) => `3-hydroxy-2-methyl${['prop', 'but', 'pent', 'hex'][r]}anal`,
  propanone: (r) => `4-hydroxy${['but', 'pent', 'hex', 'hept'][r]}an-2-one`,
  butanone: (r) => (r ? `5-hydroxy${['', 'hex', 'hept', 'oct'][r]}an-3-one` : '1-hydroxypentan-3-one'),
};
const ELECTROPHILES = ['methanal', 'ethanal', 'propanal', 'butanal'];
const additionSets = ALDEHYDES_KETONES.flatMap((carbonyl) => ELECTROPHILES.map((_, r) => ({ carbonyl, r })));
export const aldolAddition: Template = {
  id: 'aldol-addition',
  title: 'An enolate adds to an aldehyde',
  phrase: 'aldol addition',
  skill: 'carbonyl-addition',
  variants: additionSets.length,
  make(rng) {
    const { carbonyl, r } = pick(rng, additionSets);
    const aldehyde = ELECTROPHILES[r];
    const b = new Builder();
    const { c, o, alpha } = carbonylCore(b, carbonyl, true);
    // The aldehyde to the right, C=O up and its R lower right; its H (implicit) faces the enolate.
    const e = b.atom('C', 2.6, 0);
    const oe = b.grow(e, 'O', 90, 2);
    if (r) b.chain(e, r, 0, -1);
    const product = ALDOL_NAME[carbonyl.name](r);
    const self = aldehyde === carbonyl.name;
    return {
      id: 'practice-aldol-addition', title: `The enolate of ${carbonyl.name} and ${aldehyde}`, unit: 'Enolates', skill: 'carbonyl-addition', level: 2,
      summary: `The enolate of ${carbonyl.name} adds to ${self ? 'a second molecule of ' : ''}${aldehyde} through its α-carbon: the key step of an aldol reaction.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'The enolate adds', prompt: `Show the enolate of ${carbonyl.name} adding to the carbonyl carbon of ${aldehyde}.`,
        arrows: [
          { from: o, to: `${o}-${c}`, pair: 2, says: 'A lone pair on the enolate oxygen moves back in to re-form the C=O.' },
          { from: `${alpha}-${c}`, to: `${alpha}-${e}`, says: `The C=C π electrons attack the carbonyl carbon of ${aldehyde}: the enolate reacts through carbon.` },
          { from: `${e}-${oe}`, to: oe, says: `The C=O π bond of ${aldehyde} moves onto its oxygen.` },
        ],
        hints: ['The new bond is C–C: from the enolate’s α-carbon to the aldehyde’s carbonyl carbon.', 'Three arrows: the O− pushes, the C=C attacks, the aldehyde’s C=O breaks.'],
        explanation: `A new C–C bond and an alkoxide; once protonated (by water or the alcohol solvent) it is ${product}, an aldol (aldehyde or ketone plus alcohol). ${r === 0 ? 'Methanal has no α-hydrogen, so it can only be the electrophile, which makes crossed aldols with it more selective, though it is reactive enough to add more than once.' : self ? 'Both partners are the same compound, so there is no crossed product.' : carbonyl.kind === 'ketone' ? 'An enolisable aldehyde also reacts with itself faster than a ketone enolate adds to it, so in one flask this gives a mixture; this puzzle follows one pair.' : 'In one flask, two partners that can both form enolates give a mixture; this puzzle follows one pair.'}${sideNote(carbonyl)}${carbonyl.alphaMethyl ? (r ? ' The enolate geometry drawn is one of two possible; this product has two stereocentres and forms as a mixture of diastereomers (syn and anti), so the name carries no R/S labels.' : ' The enolate geometry drawn is one of two possible; the product has one stereocentre and forms as a racemate.') : ''}`,
      }],
      expect: { bonds: [`${alpha}-${e}`, `${c}-${o}:2`, `${e}-${oe}:1`], charges: { [oe]: -1 } },
    };
  },
};

export const ENOLATE_TEMPLATES: readonly Template[] = [enolateFormation, aldolAddition];
