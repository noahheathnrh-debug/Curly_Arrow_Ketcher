import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * The Diels–Alder reaction: an s-cis diene and an electron-poor alkene give a cyclohexene in one step. The diene is
 * drawn opening to the right on the hexagon the ring will fill, the dienophile standing to its right with its
 * electron-withdrawing group on the top carbon, pointing away.
 *
 * A group on the diene sits on C3, the inner carbon next to C4, so the product drawn is the 1,4 ("para") one.
 *
 * The arrows run C1=C2 → C1–C6, C5=C6 → C5–C4, C3=C4 → C2–C3. The other way round the ring is refused: the editor
 * reads a bond source's moving end as the end with fewer drawn bonds, which for C5=C6 is C5, not C6.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Diene { name: string; on2?: 'C'; on3?: 'C' | 'OC'; prefix: string; note: string }
const DIENES: readonly Diene[] = [
  { name: 'buta-1,3-diene', prefix: '', note: '' },
  { name: '2,3-dimethylbuta-1,3-diene', on2: 'C', on3: 'C', prefix: '3,4-dimethyl', note: ' The two methyl groups push electron density into the diene, so it reacts faster than buta-1,3-diene.' },
  { name: '2-methylbuta-1,3-diene (isoprene)', on3: 'C', prefix: '4-methyl', note: ' With one group on the diene and one on the dienophile, two products are possible. The 1,4 ("para") product is the main one: the diene end next to the methyl-bearing carbon and the CH2 end of the dienophile have the largest orbital coefficients, so the bond between them is the more developed one in the transition state. The 1,3 ("meta") product is minor (roughly 70:30 without a Lewis acid catalyst).' },
  { name: '2-methoxybuta-1,3-diene', on3: 'OC', prefix: '4-methoxy', note: ' The methoxy group donates strongly, so the diene is very reactive and the 1,4 ("para") product is almost the only one. The product is still an enol ether (C=C–OCH3), so mild aqueous acid then hydrolyses it to a cyclohexanone.' },
];

/** The electron-withdrawing group, built on the dienophile's top carbon. */
interface Dienophile { name: string; product: (ring: string) => string; build: (b: Builder, c: string) => void }
const DIENOPHILES: readonly Dienophile[] = [
  { name: 'propenal', product: (r) => `${r}cyclohex-3-ene-1-carbaldehyde`, build: (b, c) => { const a = b.grow(c, 'C', 30); b.grow(a, 'O', 90, 2); } },
  { name: 'methyl propenoate', product: (r) => `methyl ${r}cyclohex-3-ene-1-carboxylate`, build: (b, c) => { const a = b.grow(c, 'C', 30); b.grow(a, 'O', 90, 2); const o = b.grow(a, 'O', 330); b.grow(o, 'C', 30); } },
  { name: 'propenenitrile', product: (r) => `${r}cyclohex-3-ene-1-carbonitrile`, build: (b, c) => { const a = b.grow(c, 'C', 30); b.grow(a, 'N', 30, 3); } },
  { name: 'but-3-en-2-one', product: (r) => `1-(${r}cyclohex-3-en-1-yl)ethan-1-one`, build: (b, c) => { const a = b.grow(c, 'C', 30); b.grow(a, 'O', 90, 2); b.grow(a, 'C', 330); } },
];

const sets = DIENES.flatMap((diene) => DIENOPHILES.map((dienophile) => ({ diene, dienophile })));

export const dielsAlder: Template = {
  id: 'diels-alder',
  title: 'The Diels–Alder reaction',
  phrase: 'Diels–Alder',
  skill: 'pericyclic',
  variants: sets.length,
  make(rng) {
    const { diene, dienophile } = pick(rng, sets);
    const b = new Builder();
    const c1 = b.atom('C', 0, 1);
    const c2 = b.atom('C', -0.866, 0.5);
    const c3 = b.atom('C', -0.866, -0.5);
    const c4 = b.atom('C', 0, -1);
    b.d.bond(c1, c2, 2); b.d.bond(c2, c3); b.d.bond(c3, c4, 2);
    if (diene.on2) b.grow(c2, diene.on2, 150);
    if (diene.on3 === 'C') b.grow(c3, 'C', 210);
    if (diene.on3 === 'OC') { const o = b.grow(c3, 'O', 210); b.grow(o, 'C', 270); }
    const c5 = b.atom('C', 1.8, -0.5);
    const c6 = b.grow(c5, 'C', 90, 2);
    dienophile.build(b, c6);
    const product = dienophile.product(diene.prefix);
    return {
      id: 'practice-diels-alder', title: `${cap(diene.name)} and ${dienophile.name}`, unit: 'Pericyclic reactions', skill: 'pericyclic', level: 3,
      summary: `${cap(diene.name)} and ${dienophile.name} join in one step to give ${product}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'The ring forms in one step', prompt: `Show the three arrows that join ${diene.name.split(' (')[0]} and ${dienophile.name} into a ring.`,
        arrows: [
          { from: `${c1}-${c2}`, to: `${c1}-${c6}`, says: 'The diene’s upper C=C forms a new σ bond to the dienophile’s top carbon.' },
          { from: `${c5}-${c6}`, to: `${c5}-${c4}`, says: 'The dienophile’s π electrons form the second new σ bond, to the lower end of the diene.' },
          { from: `${c3}-${c4}`, to: `${c2}-${c3}`, says: 'The diene’s lower C=C moves into the middle, making the ring’s C=C.' },
        ],
        hints: ['Three arrows chasing each other round the ring, each starting at a π bond.', 'The diene’s middle single bond becomes the ring’s one C=C.'],
        explanation: `${cap(product)}. All three arrows happen at once, through a cyclic transition state with six electrons: no intermediate and no charges. The electron-withdrawing group on ${dienophile.name} makes it a good dienophile.${diene.note}`,
      }],
      expect: { bonds: [`${c4}-${c5}:1`, `${c6}-${c1}:1`, `${c2}-${c3}:2`, `${c1}-${c2}:1`, `${c3}-${c4}:1`, `${c5}-${c6}:1`] },
    };
  },
};

/**
 * [3,3]-Sigmatropic rearrangements: the Claisen rearrangement of allyl vinyl ethers and the Cope rearrangement of
 * hexa-1,5-dienes. The six atoms sit on a hexagon (C1 top, then anticlockwise C2, X3, C4, C5, C6), with the σ bond
 * X3–C4 that breaks lower left and the C1···C6 gap where the new bond forms at the top right. The arrows run
 * C1=C2 → C1–C6, C5=C6 → C4–C5, X3–C4 → C2–X3: C1 always has the fewer drawn bonds of C1=C2, so the editor accepts it.
 */
type Position = 1 | 2 | 3 | 4 | 5 | 6;
interface Sigmatropic { name: string; product: string; cope?: boolean; methyls: Position[]; hydroxy?: boolean; note?: string }
const SIGMATROPIC: readonly Sigmatropic[] = [
  { name: 'allyl vinyl ether', product: 'pent-4-enal', methyls: [] },
  { name: 'allyl isopropenyl ether', product: 'hex-5-en-2-one', methyls: [2] },
  { name: 'but-2-enyl vinyl ether', product: '3-methylpent-4-enal', methyls: [6] },
  { name: '2-methylallyl vinyl ether', product: '4-methylpent-4-enal', methyls: [5] },
  { name: 'allyl prop-1-enyl ether', product: '2-methylpent-4-enal', methyls: [1] },
  { name: 'but-3-en-2-yl vinyl ether', product: 'hex-4-enal', methyls: [4] },
  { name: 'but-2-enyl isopropenyl ether', product: '4-methylhex-5-en-2-one', methyls: [2, 6] },
  { name: '2-methylallyl isopropenyl ether', product: '5-methylhex-5-en-2-one', methyls: [2, 5] },
  { name: 'but-2-enyl prop-1-enyl ether', product: '2,3-dimethylpent-4-enal', methyls: [1, 6] },
  { name: 'allyl but-2-en-2-yl ether', product: '3-methylhex-5-en-2-one', methyls: [1, 2] },
  { name: '3-methylhexa-1,5-diene', product: 'hepta-1,5-diene', cope: true, methyls: [3], note: ' The equilibrium favours the product, whose new C=C carries more alkyl groups.' },
  { name: '3,3-dimethylhexa-1,5-diene', product: '6-methylhepta-1,5-diene', cope: true, methyls: [3, 3], note: ' The equilibrium favours the product, whose new C=C carries two methyl groups.' },
  { name: 'hexa-1,5-dien-3-ol', product: 'hexa-1,5-dien-1-ol', cope: true, methyls: [], hydroxy: true, note: ' The product is an enol, which tautomerises to hex-5-enal; that tautomerisation pulls this oxy-Cope rearrangement forward, and as the alkoxide (anionic oxy-Cope) it is very much faster.' },
];
/** Hexagon vertex of each position, and the outward direction from the ring centre. */
const VERTEX: Record<Position, number> = { 1: 90, 2: 150, 3: 210, 4: 270, 5: 330, 6: 30 };

export const sigmatropic: Template = {
  id: 'sigmatropic-33',
  title: 'A [3,3]-sigmatropic rearrangement',
  phrase: '[3,3]-sigmatropic',
  skill: 'pericyclic',
  variants: SIGMATROPIC.length,
  make(rng) {
    const r = pick(rng, SIGMATROPIC);
    const b = new Builder();
    const at = (p: Position, el: string) => { const a = (VERTEX[p] * Math.PI) / 180; return b.atom(el, Math.cos(a), Math.sin(a)); };
    const ids = { 1: at(1, 'C'), 2: at(2, 'C'), 3: at(3, r.cope ? 'C' : 'O'), 4: at(4, 'C'), 5: at(5, 'C'), 6: at(6, 'C') } as Record<Position, string>;
    b.d.bond(ids[1], ids[2], 2); b.d.bond(ids[2], ids[3]); b.d.bond(ids[3], ids[4]); b.d.bond(ids[4], ids[5]); b.d.bond(ids[5], ids[6], 2);
    const twice = r.methyls.filter((p) => p === 3).length === 2;
    for (const p of new Set(r.methyls)) {
      if (p === 3 && twice) { b.grow(ids[3], 'C', 180); b.grow(ids[3], 'C', 240); } else b.grow(ids[p], 'C', VERTEX[p]);
    }
    if (r.hydroxy) b.grow(ids[3], 'O', VERTEX[3]);
    const [c1, c2, x3, c4, c5, c6] = [ids[1], ids[2], ids[3], ids[4], ids[5], ids[6]];
    const kind = r.cope ? 'Cope' : 'Claisen';
    return {
      id: 'practice-sigmatropic-33', title: `The ${kind} rearrangement of ${r.name}`, unit: 'Pericyclic reactions', skill: 'pericyclic', level: 3,
      summary: `Heated, ${r.name} rearranges in one step to ${r.product}: a [3,3]-sigmatropic (${kind}) rearrangement.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Six atoms, three arrows', prompt: `Show the three arrows of the ${kind} rearrangement: a new σ bond at the top right, the σ bond at the lower left breaking.`,
        arrows: [
          { from: `${c1}-${c2}`, to: `${c1}-${c6}`, says: 'The upper C=C forms the new σ bond across the gap, C1 to C6.' },
          { from: `${c5}-${c6}`, to: `${c4}-${c5}`, says: 'The other C=C moves along one bond.' },
          { from: `${x3}-${c4}`, to: `${c2}-${x3}`, says: `The ${r.cope ? 'C–C' : 'C–O'} σ bond breaks, its electrons making the new ${r.cope ? 'C=C' : 'C=O'}.` },
        ],
        hints: ['Three arrows round the ring: two π bonds and the σ bond between atoms 3 and 4.', 'A σ bond breaks at one end of the six-atom chain and a new one forms at the other.'],
        explanation: `${cap(r.product)}. All three arrows happen at once, through a cyclic six-electron transition state, usually chair-shaped.${r.cope ? '' : ' The new C–C σ and C=O π bonds outweigh the C–O σ and C=C π bonds lost, so the Claisen rearrangement is strongly downhill.'}${r.note ?? ''}`,
      }],
      expect: { bonds: [`${c1}-${c6}:1`, `${c4}-${c5}:2`, `${c2}-${x3}:2`, `${c1}-${c2}:1`, `${c5}-${c6}:1`], absent: [`${x3}-${c4}`] },
    };
  },
};

export const PERICYCLIC_TEMPLATES: readonly Template[] = [dielsAlder, sigmatropic];
