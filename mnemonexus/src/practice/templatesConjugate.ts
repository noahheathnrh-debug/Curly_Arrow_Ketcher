import type { Rng, Template } from './templates';
import { Builder, NUCLEOPHILES, type Donor } from './species';

/**
 * Conjugate addition: a soft nucleophile adds at the β-carbon of an α,β-unsaturated carbonyl compound, giving an
 * enolate. The acceptor keeps the enolate lessons' layout (C=O up, its other group lower left, the α-carbon lower right),
 * with the β-carbon right of the α-carbon and the nucleophile below right of it.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Acceptor { name: string; group: 'H' | 'C' | 'OC'; betaMethyl?: boolean; kind: 'aldehyde' | 'ketone' | 'ester' }
const ACCEPTORS: readonly Acceptor[] = [
  { name: 'propenal', group: 'H', kind: 'aldehyde' },
  { name: 'but-3-en-2-one', group: 'C', kind: 'ketone' },
  { name: 'methyl propenoate', group: 'OC', kind: 'ester' },
  { name: 'pent-3-en-2-one', group: 'C', betaMethyl: true, kind: 'ketone' },
];

const ethanethiolate: Donor = {
  name: 'ethanethiolate', charge: -1,
  build: (b, x, y, heading) => { const at = b.atom('S', x, y, { charge: -1 }); b.chain(at, 2, heading); return { at, charges: { [at]: -1 } }; },
};
const donor = (name: string) => NUCLEOPHILES.find((n) => n.name === name)!;

/** The saturated product, once the enolate is protonated on carbon, by nucleophile and acceptor. */
const PRODUCT: Record<string, Record<string, string>> = {
  hydrosulfide: { propenal: '3-sulfanylpropanal', 'but-3-en-2-one': '4-sulfanylbutan-2-one', 'methyl propenoate': 'methyl 3-sulfanylpropanoate', 'pent-3-en-2-one': '4-sulfanylpentan-2-one' },
  methanethiolate: { propenal: '3-(methylsulfanyl)propanal', 'but-3-en-2-one': '4-(methylsulfanyl)butan-2-one', 'methyl propenoate': 'methyl 3-(methylsulfanyl)propanoate', 'pent-3-en-2-one': '4-(methylsulfanyl)pentan-2-one' },
  ethanethiolate: { propenal: '3-(ethylsulfanyl)propanal', 'but-3-en-2-one': '4-(ethylsulfanyl)butan-2-one', 'methyl propenoate': 'methyl 3-(ethylsulfanyl)propanoate', 'pent-3-en-2-one': '4-(ethylsulfanyl)pentan-2-one' },
  // Not propenal: cyanide adds to an aldehyde's C=O as fast as to its C=C.
  cyanide: { 'but-3-en-2-one': '4-oxopentanenitrile', 'methyl propenoate': 'methyl 3-cyanopropanoate', 'pent-3-en-2-one': '2-methyl-4-oxopentanenitrile' },
};
const DONORS: readonly Donor[] = [donor('hydrosulfide'), donor('methanethiolate'), ethanethiolate, donor('cyanide')];
const sets = DONORS.flatMap((nu) => ACCEPTORS.filter((a) => PRODUCT[nu.name][a.name]).map((acceptor) => ({ nu, acceptor })));

const note = (nu: Donor, acceptor: Acceptor) => {
  if (nu.name === 'hydrosulfide') return ' The product is itself a thiol, so if the enone is in excess it can add to a second molecule and give a sulfide (R–S–R).';
  if (nu.name !== 'cyanide') return '';
  return acceptor.kind === 'ester'
    ? ' It needs a proton source (HCN, or ethanoic acid) to protonate the enolate.'
    : ' Cyanide is a harder nucleophile than a thiolate: it also adds reversibly to the C=O, but the conjugate product is the more stable and builds up, given a proton source (HCN, or ethanoic acid) to protonate the enolate.';
};

export const conjugateAddition: Template = {
  id: 'conjugate-addition',
  title: 'Conjugate addition',
  phrase: 'conjugate addition',
  skill: 'conjugate-addition',
  variants: sets.length,
  make(rng) {
    const { nu, acceptor } = pick(rng, sets);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const o = b.grow(c, 'O', 90, 2);
    if (acceptor.group === 'C') b.grow(c, 'C', 210);
    if (acceptor.group === 'OC') { const oe = b.grow(c, 'O', 210); b.grow(oe, 'C', 150); }
    const alpha = b.grow(c, 'C', 330);
    const beta = b.grow(alpha, 'C', 30, 2);
    if (acceptor.betaMethyl) b.grow(beta, 'C', 90);
    const N = nu.build(b, 2.6, -1.4, 330);
    const product = PRODUCT[nu.name][acceptor.name];
    const charges: Record<string, number> = { ...N.charges, [o]: -1 };
    delete charges[N.at];
    return {
      id: 'practice-conjugate-addition', title: `${cap(nu.name)} and ${acceptor.name}`, unit: 'Conjugate addition', skill: 'conjugate-addition', level: 2,
      summary: `${cap(nu.name)} adds to the β-carbon of ${acceptor.name}, giving an enolate; protonation on carbon then gives ${product}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'The nucleophile adds at the β-carbon', prompt: `Show ${nu.name} adding to the β-carbon of ${acceptor.name}.`,
        arrows: [
          { from: N.at, to: `${N.at}-${beta}`, says: `A lone pair on ${nu.name} attacks the β-carbon, the end of the C=C furthest from the C=O.` },
          { from: `${alpha}-${beta}`, to: `${c}-${alpha}`, says: 'The C=C π electrons move into the bond between the α-carbon and the carbonyl carbon, making it a C=C.' },
          { from: `${c}-${o}`, to: o, says: 'The C=O π electrons move onto oxygen.' },
        ],
        hints: ['Conjugation with the C=O makes the β-carbon electron-poor.', 'Three arrows: nucleophile to the β-carbon, the C=C towards the C=O, the C=O onto oxygen.'],
        explanation: `An enolate, its charge shared between oxygen and the α-carbon. It is protonated, by the solvent or the conjugate acid of the nucleophile, on oxygen or on carbon (an enol formed first tautomerises), giving ${product}.${note(nu, acceptor)}`,
      }],
      expect: { bonds: [`${N.at}-${beta}`, `${alpha}-${beta}:1`, `${c}-${alpha}:2`, `${c}-${o}:1`], charges },
    };
  },
};

export const CONJUGATE_TEMPLATES: readonly Template[] = [conjugateAddition];
