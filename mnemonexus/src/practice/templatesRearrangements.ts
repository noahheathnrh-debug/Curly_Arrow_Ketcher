import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * A 1,2-shift to a carbocation: a hydrogen or a methyl group on the neighbouring carbon moves, with its bonding pair,
 * to a secondary cation, leaving a more stable tertiary one. The cation is drawn at the origin with its chain to the
 * left; the neighbouring carbon is to the right, with the group that moves pointing down.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What the neighbouring carbon carries besides the cation: the group that moves, then the two that stay (carbons). */
interface Neighbour { moves: 'H' | 'C'; stay: [number, number] }
const NEIGHBOURS: readonly Neighbour[] = [
  { moves: 'H', stay: [1, 1] },
  { moves: 'H', stay: [1, 2] },
  { moves: 'H', stay: [2, 2] },
  { moves: 'C', stay: [1, 1] },
];
/** The cation before and after, by the cation's own chain (1 to 3 carbons) and the neighbour above. */
const NAMES: Record<string, [string, string]> = {
  '1:H11': ['3-methylbutan-2-yl', '2-methylbutan-2-yl'],
  '2:H11': ['2-methylpentan-3-yl', '2-methylpentan-2-yl'],
  '3:H11': ['2-methylhexan-3-yl', '2-methylhexan-2-yl'],
  '1:H12': ['3-methylpentan-2-yl', '3-methylpentan-3-yl'],
  '2:H12': ['4-methylhexan-3-yl', '3-methylhexan-3-yl'],
  '3:H12': ['3-methylheptan-4-yl', '3-methylheptan-3-yl'],
  '1:H22': ['3-ethylpentan-2-yl', '3-ethylpentan-3-yl'],
  '2:H22': ['4-ethylhexan-3-yl', '3-ethylhexan-3-yl'],
  '3:H22': ['3-ethylheptan-4-yl', '3-ethylheptan-3-yl'],
  '1:C11': ['3,3-dimethylbutan-2-yl', '2,3-dimethylbutan-2-yl'],
  '2:C11': ['2,2-dimethylpentan-3-yl', '2,3-dimethylpentan-2-yl'],
  '3:C11': ['2,2-dimethylhexan-3-yl', '2,3-dimethylhexan-2-yl'],
};
const sets = [1, 2, 3].flatMap((chain) => NEIGHBOURS.map((n) => ({ chain, n, names: NAMES[`${chain}:${n.moves}${n.stay.join('')}`] })));

export const carbocationShift: Template = {
  id: 'carbocation-shift',
  title: 'A 1,2-shift to a carbocation',
  phrase: '1,2-shift',
  skill: 'rearrangement',
  variants: sets.length,
  make(rng) {
    const { chain, n, names: [before, after] } = pick(rng, sets);
    const hydride = n.moves === 'H';
    const b = new Builder();
    const c = b.atom('C', 0, 0, { charge: 1 });
    b.chain(c, chain, 180);
    const cn = b.grow(c, 'C', 0);
    const m = b.grow(cn, n.moves, 270);
    const [up, right] = n.stay;
    // The groups that stay: one straight up, one straight right, an ethyl's second carbon bending away.
    const upper = b.grow(cn, 'C', 90);
    if (up === 2) b.grow(upper, 'C', 30);
    const side = b.grow(cn, 'C', 0);
    if (right === 2) b.grow(side, 'C', 330);
    const group = hydride ? 'hydrogen' : 'methyl group';
    return {
      id: 'practice-carbocation-shift', title: `The ${before} cation`, unit: 'Rearrangements', skill: 'rearrangement', level: 2,
      summary: `The ${before} cation (secondary) becomes the ${after} cation (tertiary) when a ${group} moves from the next carbon.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: `A ${hydride ? 'hydride' : 'methyl'} shift`, prompt: `Show the ${hydride ? 'hydride (a hydrogen with its bonding pair)' : 'methyl group, with its bonding pair,'} on the neighbouring carbon moving to the positive carbon.`,
        arrows: [
          { from: `${m}-${cn}`, to: `${m}-${c}`, side: -1, says: `The ${group} moves to the positive carbon, taking its bonding pair with it.` },
        ],
        hints: ['One arrow: a bond on the neighbouring carbon becomes a bond to the cation.', 'Which carbon carries the charge afterwards, and how many alkyl groups does it have?'],
        explanation: `The ${after} cation. The ${group} moves with its two electrons${hydride ? ' (as a hydride, H−, would)' : ''}, so the carbon it left is now the positive one; that carbon has three alkyl groups, so the cation is tertiary and more stable than the secondary one it came from. Whatever reacts with the cation next (a nucleophile, or a base taking a proton to make an alkene) does so at the new positive carbon, so the product can have a group on a different carbon${hydride ? '' : ' (and, after a methyl shift, a different carbon skeleton)'} from the starting material. (In practice a simple secondary cation rarely exists on its own: the shift usually happens as the leaving group departs. It is drawn as a separate step to show the electron movement.)`,
      }],
      expect: { bonds: [`${m}-${c}`], absent: [`${m}-${cn}`], charges: { [cn]: 1 } },
    };
  },
};

export const REARRANGEMENT_TEMPLATES: readonly Template[] = [carbocationShift];
