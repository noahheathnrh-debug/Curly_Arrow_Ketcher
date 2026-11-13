import type { Rng, Template } from './templates';
import { ACIDS, Builder } from './species';

/**
 * Addition to alkenes: the first step of adding HX (or water, with acid), where the π bond takes a proton and leaves
 * the more substituted carbocation (Markovnikov). Only alkenes whose carbocation cannot improve by a shift.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `a`: carbon counts of the two groups on the carbon that becomes positive (0 is H); `b`: the group on the other carbon. */
export const ALKENES: readonly { name: string; a: [number, number]; b: number; cation: 'secondary' | 'tertiary' }[] = [
  { name: 'propene', a: [1, 0], b: 0, cation: 'secondary' },
  { name: 'but-1-ene', a: [2, 0], b: 0, cation: 'secondary' },
  { name: '2-methylprop-1-ene', a: [1, 1], b: 0, cation: 'tertiary' },
  { name: '2-methylbut-1-ene', a: [2, 1], b: 0, cation: 'tertiary' },
  { name: '2-methylbut-2-ene', a: [1, 1], b: 1, cation: 'tertiary' },
  { name: '2-methylpent-1-ene', a: [3, 1], b: 0, cation: 'tertiary' },
];
const STRONG_ACIDS = ACIDS.filter((acid) => ['hydrogen chloride', 'hydrogen bromide', 'hydronium'].includes(acid.name));

/** A group of `n` carbons from `from`, starting along `angle` and zigzagging outwards. */
function group(b: Builder, from: string, angle: number, n: number) {
  if (!n) return;
  const first = b.grow(from, 'C', angle);
  if (n > 1) b.chain(first, n - 1, angle);
}

const sets = ALKENES.flatMap((alkene) => STRONG_ACIDS.map((acid) => ({ alkene, acid })));
export const alkeneProtonation: Template = {
  id: 'alkene-protonation',
  title: 'An alkene takes a proton',
  phrase: 'alkene protonation',
  skill: 'alkene-addition',
  variants: sets.length,
  make(rng) {
    const { alkene, acid } = pick(rng, sets);
    const b = new Builder();
    // The carbon that becomes positive at the origin, the double bond east, the other carbon's group below it and the
    // acid up and to the right. The arrow from the π bond curves through the open space above: with a group there, the
    // editor's arrow router took 10 to 40 seconds (timed 2026-11-11).
    const ca = b.atom('C', 0, 0);
    const cb = b.grow(ca, 'C', 0, 2);
    group(b, ca, 120, alkene.a[0]);
    group(b, ca, 240, alkene.a[1]);
    group(b, cb, 300, alkene.b);
    const A = acid.build(b, 2.3, 0.8, 0);
    const charges = { ...A.charges, [A.x]: (A.charges[A.x] ?? 0) - 1, [ca]: 1 };
    return {
      id: 'practice-alkene-protonation', title: `${cap(alkene.name)} and ${acid.name}`, unit: 'Addition to alkenes', skill: 'alkene-addition', level: 1,
      summary: `The first step of an addition: the π bond of ${alkene.name} takes a proton from ${acid.name}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Protonation', prompt: `Show the π bond of ${alkene.name} taking the proton from ${acid.name}, to give the more stable carbocation.`,
        arrows: [
          { from: `${ca}-${cb}`, to: `${cb}-${A.h}`, says: 'The π electrons make a bond to the proton, on the carbon with more hydrogens.' },
          { from: `${A.h}-${A.x}`, to: A.x, says: 'The old bond to the proton breaks; its electrons stay behind.' },
        ],
        hints: ['Start at the double bond: the alkene is the nucleophile.', 'Put the proton where it leaves the positive charge on the carbon with more alkyl groups.'],
        explanation: `A ${alkene.cation} carbocation. Protonating the other carbon would leave a less substituted, less stable one (Markovnikov's rule).`,
      }],
      expect: { bonds: [`${cb}-${A.h}`, `${ca}-${cb}:1`], absent: [`${A.h}-${A.x}`], charges: Object.fromEntries(Object.entries(charges).filter(([, c]) => c)) },
    };
  },
};

export const ALKENE_TEMPLATES: readonly Template[] = [alkeneProtonation];
