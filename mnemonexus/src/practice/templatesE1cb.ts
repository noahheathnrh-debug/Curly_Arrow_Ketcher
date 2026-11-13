import type { Rng, Template } from './templates';
import { Builder, NUCLEOPHILES } from './species';

/**
 * E1cB: a base takes the α-proton of a carbonyl compound with a leaving group (OH or OCH3) on the β-carbon, and the
 * enolate then pushes the leaving group out, giving an α,β-unsaturated carbonyl compound. The second half of an aldol
 * condensation. The carbonyl carbon keeps the enolate layout (C=O up, its group lower left, the α-carbon lower right
 * with its H down to the base); the β-carbon is upper right of the α-carbon, its leaving group up.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Substrate {
  name: string; product: string;
  /** On the carbonyl carbon besides the C=O and the α-carbon. */
  group: 'H' | 'C';
  alphaMethyl?: boolean;
  /** Carbons on the β-carbon: one chain lower right (1 or 2 carbons), and optionally a methyl upper right. */
  beta: { chain?: 1 | 2; methyl?: boolean };
  leaves: 'OH' | 'OMe';
}
const SUBSTRATES: readonly Substrate[] = [
  { name: '3-hydroxybutanal', product: 'but-2-enal', group: 'H', beta: { chain: 1 }, leaves: 'OH' },
  { name: '3-hydroxypentanal', product: 'pent-2-enal', group: 'H', beta: { chain: 2 }, leaves: 'OH' },
  { name: '3-hydroxy-2-methylpentanal', product: '2-methylpent-2-enal', group: 'H', alphaMethyl: true, beta: { chain: 2 }, leaves: 'OH' },
  { name: '3-hydroxy-3-methylbutanal', product: '3-methylbut-2-enal', group: 'H', beta: { chain: 1, methyl: true }, leaves: 'OH' },
  { name: '4-hydroxypentan-2-one', product: 'pent-3-en-2-one', group: 'C', beta: { chain: 1 }, leaves: 'OH' },
  { name: '4-hydroxyhexan-2-one', product: 'hex-3-en-2-one', group: 'C', beta: { chain: 2 }, leaves: 'OH' },
  { name: '4-hydroxy-4-methylpentan-2-one', product: '4-methylpent-3-en-2-one', group: 'C', beta: { chain: 1, methyl: true }, leaves: 'OH' },
  { name: '4-methoxybutan-2-one', product: 'but-3-en-2-one', group: 'C', beta: {}, leaves: 'OMe' },
];
const BASES = ['hydroxide', 'methoxide', 'ethoxide'] as const;
const sets = SUBSTRATES.flatMap((substrate) => BASES.map((base) => ({ substrate, base })));
const donor = (name: string) => NUCLEOPHILES.find((n) => n.name === name)!;
/** Whether the product has E and Z forms: a β-carbon with one carbon chain and an H. */
const geometric = (s: Substrate) => !!s.beta.chain && !s.beta.methyl;

export const e1cb: Template = {
  id: 'e1cb',
  title: 'E1cB elimination',
  phrase: 'E1cB elimination',
  skill: 'elimination',
  variants: sets.length,
  make(rng) {
    const { substrate: s, base } = pick(rng, sets);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const o = b.grow(c, 'O', 90, 2);
    if (s.group === 'C') b.grow(c, 'C', 210);
    const alpha = b.grow(c, 'C', 330);
    const h = b.grow(alpha, 'H', 270);
    if (s.alphaMethyl) b.grow(alpha, 'C', 330);
    const beta = b.grow(alpha, 'C', 30);
    const x = b.grow(beta, 'O', 90);
    if (s.leaves === 'OMe') b.grow(x, 'C', 30);
    if (s.beta.chain) { const first = b.grow(beta, 'C', 330); if (s.beta.chain === 2) b.grow(first, 'C', 30); }
    if (s.beta.methyl) b.grow(beta, 'C', 30);
    const ob = donor(base).build(b, 0.87, -2.8, 210).at;
    const leaving = s.leaves === 'OH' ? 'hydroxide' : 'methoxide';
    return {
      id: 'practice-e1cb', title: `${cap(base)} and ${s.name}`, unit: 'Enolates', skill: 'elimination', level: 2,
      summary: `${cap(base)} turns ${s.name} into ${s.product}: an enolate forms, then pushes ${leaving} out from the β-carbon.`, atoms: b.atoms, bonds: b.bonds,
      steps: [
        {
          name: 'The enolate forms', prompt: `Show ${base} taking the α-proton to make the enolate.`,
          arrows: [
            { from: ob, to: `${ob}-${h}`, says: `A lone pair on ${base} takes the proton on the α-carbon.` },
            { from: `${alpha}-${h}`, to: `${alpha}-${c}`, side: -1, toSide: -1, says: 'The C–H electrons move in to make a C=C π bond.' },
            { from: `${c}-${o}`, to: o, says: 'The C=O π electrons move onto oxygen.' },
          ],
          hints: ['Take the α-hydrogen on the carbon next to the one carrying the leaving group: that enolate can push it out.', 'The α-hydrogen is acidic because the anion left behind is shared with the C=O oxygen.'],
          explanation: `The enolate. Only a little forms at equilibrium, but it is enough.`,
          move: { [h]: [0.87, -1.8] },
        },
        {
          name: `The enolate pushes out ${leaving}`, prompt: `Show the enolate re-forming the C=O and pushing ${leaving} out from the β-carbon.`,
          arrows: [
            { from: o, to: `${o}-${c}`, pair: 2, says: 'A lone pair on oxygen moves back in to re-form the C=O.' },
            { from: `${alpha}-${c}`, to: `${alpha}-${beta}`, says: 'The C=C π electrons move along to make a new C=C between the α- and β-carbons.' },
            { from: `${beta}-${x}`, to: x, says: `The C–O bond breaks and ${leaving} leaves.` },
          ],
          hints: ['Three arrows: the O− pushes, the C=C moves along one bond, the leaving group goes.', 'The leaving group is on the carbon next to the α-carbon.'],
          explanation: `${cap(s.product)}${geometric(s) ? ', mainly the E isomer' : ''}. This is an E1cB elimination: elimination through the conjugate base (the enolate), in two steps. ${cap(leaving)} is a poor leaving group, too poor for E2 or SN2, but it can leave here because the anion pushing it out is stabilised and the new C=C is conjugated with the C=O. Warming drives it; after an aldol addition, this dehydration completes an aldol condensation.${s.leaves === 'OMe' ? ' The reverse also happens: methoxide adds back to the enone, so this equilibrium needs warming to go forward.' : ' Retro-aldol (the aldol splitting back into its parts) competes, which is why warming, which favours the conjugated product, is used.'}${leaving === base ? '' : ` The ${leaving} released is a base too, so the reaction goes on.`}`,
        },
      ],
      expect: { bonds: [`${c}-${o}:2`, `${alpha}-${beta}:2`, `${c}-${alpha}:1`, `${ob}-${h}`], absent: [`${beta}-${x}`, `${alpha}-${h}`], charges: { [x]: -1 } },
    };
  },
};

export const E1CB_TEMPLATES: readonly Template[] = [e1cb];
