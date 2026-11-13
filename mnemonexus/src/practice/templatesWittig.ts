import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * The Wittig reaction: a phosphorus ylide and an aldehyde or ketone give an alkene and a phosphine oxide, through an
 * oxaphosphetane. The carbonyl compound is on the left (C=O up, its groups left and lower left), the ylide on the
 * right (P above its carbon). Phosphorus carries methyl groups in place of the usual phenyls, to keep the drawing small.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The carbonyl compound by the carbons on its C=O carbon: left (0 = H for an aldehyde) and lower left. */
interface Carbonyl { name: string; left: number; lower: number }
const CARBONYLS: readonly Carbonyl[] = [
  { name: 'ethanal', left: 1, lower: 0 },
  { name: 'propanal', left: 2, lower: 0 },
  { name: 'butanal', left: 3, lower: 0 },
  { name: 'propanone', left: 1, lower: 1 },
  { name: 'butanone', left: 2, lower: 1 },
  { name: 'pentan-3-one', left: 2, lower: 2 },
];
interface Ylide { carbon: string; methyl: boolean; products: Record<string, string>; note: (c: Carbonyl) => string }
const YLIDES: readonly Ylide[] = [
  {
    carbon: 'methylidene', methyl: false,
    products: { ethanal: 'propene', propanal: 'but-1-ene', butanal: 'pent-1-ene', propanone: '2-methylpropene', butanone: '2-methylbut-1-ene', 'pentan-3-one': '2-ethylbut-1-ene' },
    note: () => '',
  },
  {
    carbon: 'ethylidene', methyl: true,
    products: { ethanal: 'but-2-ene', propanal: 'pent-2-ene', butanal: 'hex-2-ene', propanone: '2-methylbut-2-ene', butanone: '3-methylpent-2-ene', 'pentan-3-one': '3-ethylpent-2-ene' },
    note: (c) => (c.lower === 0
      ? ' An unstabilised ylide like this one gives mainly the Z alkene, under the usual salt-free conditions.'
      : c.left !== c.lower ? ' Both groups on the ketone are alkyl, so the alkene forms as a mixture of E and Z.' : ''),
  },
];
const sets = YLIDES.flatMap((ylide) => CARBONYLS.map((carbonyl) => ({ ylide, carbonyl })));

export const wittig: Template = {
  id: 'wittig',
  title: 'The Wittig reaction',
  phrase: 'Wittig',
  skill: 'carbonyl-addition',
  variants: sets.length,
  make(rng) {
    const { ylide, carbonyl } = pick(rng, sets);
    const b = new Builder();
    const c2 = b.atom('C', 0, 0);
    const o = b.grow(c2, 'O', 90, 2);
    // An aldehyde's chain starts lower left, on the side of the ylide's methyl, so the alkene is drawn Z (its main isomer).
    if (carbonyl.left) b.chain(c2, carbonyl.left, 180, carbonyl.lower ? -1 : 1);
    if (carbonyl.lower) { const first = b.grow(c2, 'C', 240); if (carbonyl.lower === 2) b.grow(first, 'C', 180); }
    const c1 = b.atom('C', 1.8, 0, { charge: -1 });
    if (ylide.methyl) b.grow(c1, 'C', 300);
    const p = b.grow(c1, 'P', 90, 1, { charge: 1 });
    for (const deg of [0, 60, 120]) b.grow(p, 'C', deg);
    const product = ylide.products[carbonyl.name];
    const name = `the ${ylide.carbon} ylide`;
    // The ylide moves in to close the four-membered ring, then the products separate.
    const ylideAtoms = b.atoms.filter((a) => a.x > 1.2).map((a) => a.id);
    const shift = (dx: number, dy: number, ids: string[]) => Object.fromEntries(ids.map((id) => { const a = b.atoms.find((x) => x.id === id)!; return [id, [a.x + dx, a.y + dy] as [number, number]]; }));
    const phosphorus = [p, ...b.bonds.filter((x) => x.a === p && x.b !== c1).map((x) => x.b)];
    return {
      id: 'practice-wittig', title: `${cap(carbonyl.name)} and the ${ylide.carbon} ylide`, unit: 'Carbonyl addition', skill: 'carbonyl-addition', level: 3,
      summary: `A phosphorus ylide turns the C=O of ${carbonyl.name} into a C=C, giving ${product}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [
        {
          name: 'The oxaphosphetane forms', prompt: `Show ${name} adding to the C=O to make a four-membered ring.`,
          arrows: [
            { from: c1, to: `${c1}-${c2}`, says: 'The ylide carbon’s lone pair attacks the carbonyl carbon.' },
            { from: `${c2}-${o}`, to: `${o}-${p}`, side: -1, says: 'The C=O π electrons form a bond from oxygen to phosphorus.' },
          ],
          hints: ['Two arrows, both at once: a new C–C bond and a new O–P bond.', 'The ylide carbon is the nucleophile; phosphorus takes the oxygen.'],
          explanation: 'An oxaphosphetane: a four-membered ring of C, C, O and P. Phosphorus is in the third row and can form five bonds, as it does in this ring.',
          move: shift(-0.8, 0, ylideAtoms),
        },
        {
          name: 'The ring breaks the other way', prompt: 'Show the ring opening to give the alkene and the phosphine oxide.',
          arrows: [
            { from: `${c1}-${p}`, to: `${c1}-${c2}`, says: 'The C–P bond electrons form the new C=C π bond.' },
            { from: `${o}-${c2}`, to: `${o}-${p}`, side: -1, says: 'The C–O bond electrons form the P=O π bond.' },
          ],
          hints: ['The ring has four bonds. The C–C and O–P bonds made in step 1 stay; the other two, C–P and C–O, break.', 'Both new π bonds form at once.'],
          explanation: `${cap(product)} and the phosphine oxide. The very strong P=O bond drives the reaction.${ylide.note(carbonyl)} In the laboratory the phosphorus usually carries phenyl groups (Ph3P=CHR, from Ph3P, an alkyl halide and a strong base).`,
          move: shift(0, 0.7, [o, ...phosphorus]),
        },
      ],
      expect: { bonds: [`${c1}-${c2}:2`, `${o}-${p}:2`], absent: [`${c1}-${p}`, `${c2}-${o}`] },
    };
  },
};

export const WITTIG_TEMPLATES: readonly Template[] = [wittig];
