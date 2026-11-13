import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * Enols in acid: an aldehyde or ketone is protonated on oxygen, then water takes an α-proton, giving the enol; the enol
 * then attacks a halogen molecule at its α-carbon. The carbonyl carbon C sits at the origin with the C=O up, its other
 * group lower left and the α-carbon lower right (its H down, its carbons to the right).
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Group = 'H' | 'Me' | 'Et' | 'iPr';
type Alpha = [] | ['Me'] | ['Et'] | ['iPr'] | ['Me', 'Me'];
interface Carbonyl {
  name: string; group: Group; alpha: Alpha; enol: string;
  /** The α-halo product, with {x} for bromo, chloro or iodo. */
  halo: string;
  /** The enol drawn is the more substituted one (unsymmetrical ketones), or either side would do. */
  side?: 'more' | 'either';
}
const CARBONYLS: readonly Carbonyl[] = [
  { name: 'ethanal', group: 'H', alpha: [], enol: 'ethenol', halo: '2-{x}ethanal' },
  { name: 'propanal', group: 'H', alpha: ['Me'], enol: 'prop-1-en-1-ol', halo: '2-{x}propanal' },
  { name: 'butanal', group: 'H', alpha: ['Et'], enol: 'but-1-en-1-ol', halo: '2-{x}butanal' },
  { name: '2-methylpropanal', group: 'H', alpha: ['Me', 'Me'], enol: '2-methylprop-1-en-1-ol', halo: '2-{x}-2-methylpropanal' },
  { name: 'propanone', group: 'Me', alpha: [], enol: 'prop-1-en-2-ol', halo: '1-{x}propan-2-one' },
  { name: 'butanone', group: 'Me', alpha: ['Me'], enol: 'but-2-en-2-ol', halo: '3-{x}butan-2-one', side: 'more' },
  { name: 'pentan-2-one', group: 'Me', alpha: ['Et'], enol: 'pent-2-en-2-ol', halo: '3-{x}pentan-2-one', side: 'more' },
  { name: '3-methylbutan-2-one', group: 'Me', alpha: ['Me', 'Me'], enol: '3-methylbut-2-en-2-ol', halo: '3-{x}-3-methylbutan-2-one', side: 'more' },
  { name: '4-methylpentan-2-one', group: 'Me', alpha: ['iPr'], enol: '4-methylpent-2-en-2-ol', halo: '3-{x}-4-methylpentan-2-one', side: 'more' },
  { name: 'pentan-3-one', group: 'Et', alpha: ['Me'], enol: 'pent-2-en-3-ol', halo: '2-{x}pentan-3-one' },
  { name: 'hexan-3-one', group: 'Et', alpha: ['Et'], enol: 'hex-3-en-3-ol', halo: '4-{x}hexan-3-one', side: 'either' },
  { name: '2-methylpentan-3-one', group: 'Et', alpha: ['Me', 'Me'], enol: '2-methylpent-2-en-3-ol', halo: '2-{x}-2-methylpentan-3-one', side: 'more' },
  { name: '2,4-dimethylpentan-3-one', group: 'iPr', alpha: ['Me', 'Me'], enol: '2,4-dimethylpent-2-en-3-ol', halo: '2-{x}-2,4-dimethylpentan-3-one' },
];
export const ENOL_CARBONYLS = CARBONYLS;

/** The carbonyl skeleton; with `enol` the C=O is single with an OH hydrogen and the C–Cα is double. */
function skeleton(b: Builder, k: Carbonyl, enol: boolean) {
  const c = b.atom('C', 0, 0);
  const o = b.grow(c, 'O', 90, enol ? 1 : 2);
  // An aldehyde's H is drawn, so the carbonyl carbon is never the less bonded end of the C=C an arrow starts from.
  if (k.group === 'H') b.grow(c, 'H', 210);
  else {
    const first = b.grow(c, 'C', 210);
    if (k.group === 'Et') b.grow(first, 'C', 150);
    if (k.group === 'iPr') { b.grow(first, 'C', 150); b.grow(first, 'C', 270); }
  }
  const alpha = b.grow(c, 'C', 330, enol ? 2 : 1);
  const [s1, s2] = k.alpha;
  if (s1) {
    const first = b.grow(alpha, 'C', 30);
    if (s1 === 'Et') b.grow(first, 'C', 330);
    if (s1 === 'iPr') { b.grow(first, 'C', 330); b.grow(first, 'C', 90); }
  }
  if (s2) b.grow(alpha, 'C', 330);
  return { c, o, alpha };
}

const sideNote = (k: Carbonyl) => (k.side === 'more'
  ? ' In acid the more substituted enol is favoured (like the more substituted alkene), so it forms on that side.'
  : k.side === 'either' ? ' Both α-carbons are CH2 groups, so the enol forms on either side; here it is drawn on the propyl side.' : '');

export const enolisationAcid: Template = {
  id: 'enolisation-acid',
  title: 'Enol formation in acid',
  phrase: 'enol formation',
  skill: 'proton-transfer',
  variants: CARBONYLS.length,
  make(rng) {
    const k = pick(rng, CARBONYLS);
    const b = new Builder();
    const { c, o, alpha } = skeleton(b, k, false);
    const h = b.grow(alpha, 'H', 270);
    const ow = b.atom('O', 1.9, 2.3, { charge: 1 });
    const ha = b.grow(ow, 'H', 210);
    return {
      id: 'practice-enolisation-acid', title: `${cap(k.name)} in acid`, unit: 'Enolates', skill: 'proton-transfer', level: 2,
      summary: `Acid turns ${k.name} into its enol, ${k.enol}: the C=O oxygen is protonated, then water takes a proton from the α-carbon.`, atoms: b.atoms, bonds: b.bonds,
      steps: [
        {
          name: 'The C=O oxygen is protonated', prompt: `Show H3O+ protonating the C=O oxygen of ${k.name}.`,
          arrows: [
            { from: o, to: `${o}-${ha}`, says: 'A lone pair on the C=O oxygen takes a proton from H3O+.' },
            { from: `${ha}-${ow}`, to: ow, says: 'The O–H electrons stay on the water.' },
          ],
          hints: ['The C=O oxygen is the basic site.'],
          explanation: 'A protonated carbonyl compound. The positive charge is shared with the carbonyl carbon, which makes the α-hydrogens much more acidic.',
          move: { [ha]: [0.866, 1.5], [ow]: [0.866, -2.7] },
        },
        {
          name: 'Water takes an α-proton', prompt: 'Show water taking the proton on the α-carbon to make the enol.',
          arrows: [
            { from: ow, to: `${ow}-${h}`, says: 'A lone pair on water takes the proton on the α-carbon.' },
            { from: `${alpha}-${h}`, to: `${alpha}-${c}`, side: -1, toSide: -1, says: 'The C–H electrons move in to make a C=C.' },
            { from: `${c}-${o}`, to: o, says: 'The C=O π electrons move onto oxygen, which is neutral again.' },
          ],
          hints: ['Three arrows: water takes the α-H, a C=C forms, the C=O π bond moves onto oxygen.', 'The proton comes from the carbon next to the C=O.'],
          explanation: `The enol, ${k.enol}, and H3O+ given back: acid is a catalyst. At equilibrium only a tiny fraction is enol (for propanone about one molecule in a hundred million), but the enol is a nucleophile at its α-carbon, which is how aldehydes and ketones react there in acid.${sideNote(k)}`,
          move: { [h]: [0.866, -1.9] },
        },
      ],
      expect: { bonds: [`${o}-${ha}`, `${c}-${alpha}:2`, `${c}-${o}:1`, `${ow}-${h}`], absent: [`${alpha}-${h}`, `${ha}-${ow}`], charges: { [ow]: 1 } },
    };
  },
};

type X = 'Br' | 'Cl' | 'I';
const HALOGEN: Record<X, { prefix: string; molecule: string; ion: string }> = {
  Br: { prefix: 'bromo', molecule: 'bromine', ion: 'bromide' },
  Cl: { prefix: 'chloro', molecule: 'chlorine', ion: 'chloride' },
  I: { prefix: 'iodo', molecule: 'iodine', ion: 'iodide' },
};
export const HALOGENATION_SETS = CARBONYLS.flatMap((carbonyl) => (['Br', 'Cl', 'I'] as X[]).map((x) => ({ carbonyl, x })));

export const alphaHalogenation: Template = {
  id: 'alpha-halogenation',
  title: 'An enol and a halogen',
  phrase: 'α-halogenation',
  skill: 'substitution',
  variants: HALOGENATION_SETS.length,
  make(rng) {
    const { carbonyl: k, x } = pick(rng, HALOGENATION_SETS);
    const hal = HALOGEN[x];
    const b = new Builder();
    const { c, o, alpha } = skeleton(b, k, true);
    b.grow(o, 'H', 30);
    const x1 = b.atom(x, 0.866, -1.9);
    const x2 = b.grow(x1, x, 270);
    const product = k.halo.replace('{x}', hal.prefix);
    return {
      id: 'practice-alpha-halogenation', title: `The enol of ${k.name} and ${hal.molecule}`, unit: 'Enolates', skill: 'substitution', level: 2,
      summary: `The enol of ${k.name} attacks ${hal.molecule} with its α-carbon; losing a proton then gives ${product}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: `The enol attacks ${hal.molecule}`, prompt: `Show the enol attacking ${hal.molecule} at its α-carbon.`,
        arrows: [
          { from: o, to: `${o}-${c}`, pair: 1, says: 'A lone pair on the OH oxygen pushes in to make a C=O.' },
          { from: `${alpha}-${c}`, to: `${alpha}-${x1}`, side: -1, says: `The C=C π electrons attack the nearer ${x === 'I' ? 'iodine' : x === 'Cl' ? 'chlorine' : 'bromine'} atom.` },
          { from: `${x1}-${x2}`, to: x2, says: `The ${x}–${x} bond breaks and ${hal.ion} leaves.` },
        ],
        hints: ['The enol is like an alkene with an OH pushing electrons into it: its α-carbon is the nucleophile.', 'Three arrows: the OH lone pair, the C=C, and the halogen–halogen bond.'],
        explanation: `A protonated carbonyl compound and ${hal.ion}; losing the proton gives ${product}. In acid the reaction usually stops after one halogen: the halogen withdraws electron density, so the C=O oxygen is less basic and harder to protonate, and the second enol forms more slowly. In base each halogen makes the next α-hydrogen more acidic, so all of them are replaced (the haloform reaction, for methyl ketones).${sideNote(k)}${k.side === 'either' ? ` The enol on the ethyl side would give ${k.halo.replace('4-{x}', `2-${hal.prefix}`)}.` : ''}${k.group === 'H' ? ' Halogens also oxidise aldehydes, so this is a model of the α-step rather than a clean preparation.' : ''}`,
        move: { [x1]: [0.866, -1.5], [x2]: [0.866, -3.0] },
      }],
      expect: { bonds: [`${alpha}-${x1}`, `${c}-${o}:2`, `${c}-${alpha}:1`], absent: [`${x1}-${x2}`], charges: { [o]: 1, [x2]: -1 } },
    };
  },
};

export const ENOL_TEMPLATES: readonly Template[] = [enolisationAcid, alphaHalogenation];
