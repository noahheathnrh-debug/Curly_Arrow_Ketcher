import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * Hydroboration: BH3 adds across a C=C in one four-centre step, boron to the less substituted carbon and hydrogen to
 * the more substituted one. The more substituted carbon C1 is on the left with its groups, C2 on the right, boron
 * above C2 and the hydrogen it gives above C1.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Group = 'Me' | 'Et' | 'Pr' | 'Bu' | 'iPr' | 'sBu' | 'iBu' | 'tBu';
interface Alkene { name: string; alcohol: string; lower: Group; upper?: 'Me' | 'Et'; onC2?: boolean }
const ALKENES: readonly Alkene[] = [
  { name: 'propene', alcohol: 'propan-1-ol', lower: 'Me' },
  { name: 'but-1-ene', alcohol: 'butan-1-ol', lower: 'Et' },
  { name: 'pent-1-ene', alcohol: 'pentan-1-ol', lower: 'Pr' },
  { name: 'hex-1-ene', alcohol: 'hexan-1-ol', lower: 'Bu' },
  { name: '3-methylbut-1-ene', alcohol: '3-methylbutan-1-ol', lower: 'iPr' },
  { name: '3-methylpent-1-ene', alcohol: '3-methylpentan-1-ol', lower: 'sBu' },
  { name: '4-methylpent-1-ene', alcohol: '4-methylpentan-1-ol', lower: 'iBu' },
  { name: '3,3-dimethylbut-1-ene', alcohol: '3,3-dimethylbutan-1-ol', lower: 'tBu' },
  { name: '2-methylpropene', alcohol: '2-methylpropan-1-ol', lower: 'Me', upper: 'Me' },
  { name: '2-methylbut-1-ene', alcohol: '2-methylbutan-1-ol', lower: 'Et', upper: 'Me' },
  { name: '2-methylpent-1-ene', alcohol: '2-methylpentan-1-ol', lower: 'Pr', upper: 'Me' },
  { name: '2-ethylbut-1-ene', alcohol: '2-ethylbutan-1-ol', lower: 'Et', upper: 'Et' },
  { name: '2,3-dimethylbut-1-ene', alcohol: '2,3-dimethylbutan-1-ol', lower: 'iPr', upper: 'Me' },
  { name: '2-methylbut-2-ene', alcohol: '3-methylbutan-2-ol', lower: 'Me', upper: 'Me', onC2: true },
];

/** The group on C1's lower left, as a zigzag chain or a branch. */
function lowerGroup(b: Builder, c1: string, g: Group) {
  const straight: Partial<Record<Group, number>> = { Me: 1, Et: 2, Pr: 3, Bu: 4 };
  if (straight[g]) { b.chain(c1, straight[g]!, 180); return; }
  const first = b.grow(c1, 'C', 210);
  if (g === 'iPr') { b.grow(first, 'C', 150); b.grow(first, 'C', 270); }
  if (g === 'tBu') { b.grow(first, 'C', 150); b.grow(first, 'C', 270); b.grow(first, 'C', 210); }
  if (g === 'sBu') { b.grow(first, 'C', 270); const e = b.grow(first, 'C', 150); b.grow(e, 'C', 210); }
  if (g === 'iBu') { const second = b.grow(first, 'C', 150); b.grow(second, 'C', 90); b.grow(second, 'C', 210); }
}

export const hydroboration: Template = {
  id: 'hydroboration',
  title: 'Hydroboration',
  phrase: 'hydroboration',
  skill: 'alkene-addition',
  variants: ALKENES.length,
  make(rng) {
    const a = pick(rng, ALKENES);
    const b = new Builder();
    const c1 = b.atom('C', 0, 0);
    const c2 = b.grow(c1, 'C', 0, 2);
    lowerGroup(b, c1, a.lower);
    if (a.upper) { const u = b.grow(c1, 'C', 150); if (a.upper === 'Et') b.grow(u, 'C', 150); }
    if (a.onC2) b.grow(c2, 'C', 330);
    const boron = b.atom('B', 1, 1.4);
    const h = b.grow(boron, 'H', 180);
    const where = a.onC2 ? 'the less substituted carbon (the one with an H)' : 'the CH2 end';
    return {
      id: 'practice-hydroboration', title: `Hydroboration of ${a.name}`, unit: 'Addition to alkenes', skill: 'alkene-addition', level: 2,
      summary: `Borane adds across the C=C of ${a.name}, boron to ${where}; oxidation then puts an OH where the boron was, giving ${a.alcohol}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Borane adds in one step', prompt: `Show BH3 adding across the C=C of ${a.name}: boron to ${where}, hydrogen to the other carbon.`,
        arrows: [
          { from: `${c2}-${c1}`, to: `${c2}-${boron}`, says: 'The π electrons form a bond to boron, which has an empty p orbital.' },
          { from: `${h}-${boron}`, to: `${h}-${c1}`, says: 'At the same time a B–H bond moves its hydrogen, with the pair, to the other carbon.' },
        ],
        hints: ['Two arrows, all in one step: a four-membered transition state of C, C, B and H.', 'Boron is the electrophile. It bonds to the less substituted carbon, which is less hindered and leaves the more substituted carbon to carry the partial positive charge.'],
        move: { [h]: [0, 1], [boron]: [1, 1] },
        explanation: `An alkylborane. Boron goes to the less substituted carbon, for two reasons: in the transition state the more substituted carbon carries a partial positive charge, which its alkyl groups stabilise, and the less substituted carbon is less hindered, so the bulky borane approaches it more easily. B and H add to the same face (syn addition). ${a.onC2 ? 'With an alkene this hindered, only two of the three B–H bonds add before the third is too crowded to react.' : 'Each remaining B–H can add to another alkene, giving a trialkylborane.'} Oxidation with alkaline hydrogen peroxide then replaces boron by OH, with retention, giving ${a.alcohol}: the anti-Markovnikov alcohol, the opposite orientation to acid-catalysed hydration.`,
      }],
      expect: { bonds: [`${c2}-${boron}`, `${h}-${c1}`, `${c1}-${c2}:1`], absent: [`${h}-${boron}`] },
    };
  },
};

export const HYDROBORATION_TEMPLATES: readonly Template[] = [hydroboration];
