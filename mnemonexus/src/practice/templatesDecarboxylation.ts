import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * Decarboxylation of a β-keto acid or a malonic acid on warming: six atoms in a ring (the C=O oxygen, the acid's H and
 * O, and three carbons) pass electrons round in one step, giving carbon dioxide and an enol. The ring is a hexagon:
 * the C=O carbon Ck lower left, the α-carbon at the bottom, the carboxyl carbon lower right, its OH oxygen upper right,
 * the H at the top and the C=O oxygen upper left.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** r: what the C=O carbon carries besides the ring (OH for a malonic acid); alpha: carbons on the α-carbon. */
type R = 'Me' | 'Et' | 'Pr' | 'iPr' | 'OH';
interface Acid { name: string; r: R; alpha: 0 | 1 | 2 | 'Et'; product: string }
const ACIDS: readonly Acid[] = [
  { name: '3-oxobutanoic acid', r: 'Me', alpha: 0, product: 'propanone' },
  { name: '3-oxopentanoic acid', r: 'Et', alpha: 0, product: 'butanone' },
  { name: '3-oxohexanoic acid', r: 'Pr', alpha: 0, product: 'pentan-2-one' },
  { name: '4-methyl-3-oxopentanoic acid', r: 'iPr', alpha: 0, product: '3-methylbutan-2-one' },
  { name: '2-methyl-3-oxobutanoic acid', r: 'Me', alpha: 1, product: 'butanone' },
  { name: '2,2-dimethyl-3-oxobutanoic acid', r: 'Me', alpha: 2, product: '3-methylbutan-2-one' },
  { name: '2-ethyl-3-oxobutanoic acid', r: 'Me', alpha: 'Et', product: 'pentan-2-one' },
  { name: '2-methyl-3-oxopentanoic acid', r: 'Et', alpha: 1, product: 'pentan-3-one' },
  { name: '2-ethyl-3-oxopentanoic acid', r: 'Et', alpha: 'Et', product: 'hexan-3-one' },
  { name: '2-methyl-3-oxohexanoic acid', r: 'Pr', alpha: 1, product: 'hexan-3-one' },
  { name: 'propanedioic acid', r: 'OH', alpha: 0, product: 'ethanoic acid' },
  { name: '2-methylpropanedioic acid', r: 'OH', alpha: 1, product: 'propanoic acid' },
  { name: '2-ethylpropanedioic acid', r: 'OH', alpha: 'Et', product: 'butanoic acid' },
  { name: '2,2-dimethylpropanedioic acid', r: 'OH', alpha: 2, product: '2-methylpropanoic acid' },
];
export const DECARBOXYLATION_SETS = ACIDS;

export const decarboxylation: Template = {
  id: 'decarboxylation',
  title: 'Decarboxylation of a β-keto acid or malonic acid',
  phrase: 'decarboxylation',
  skill: 'pericyclic',
  variants: ACIDS.length,
  make(rng) {
    const a = pick(rng, ACIDS);
    const b = new Builder();
    const ck = b.atom('C', 0, 0);
    const ok = b.grow(ck, 'O', 90, 2);
    const ca = b.grow(ck, 'C', 330);
    const cc = b.grow(ca, 'C', 30);
    const oa = b.grow(cc, 'O', 90);
    const h = b.grow(oa, 'H', 150);
    const ob = b.grow(cc, 'O', 330, 2);
    if (a.r === 'OH') b.grow(ck, 'O', 210);
    else {
      const first = b.grow(ck, 'C', 210);
      if (a.r === 'Et' || a.r === 'Pr') { const second = b.grow(first, 'C', 150); if (a.r === 'Pr') b.grow(second, 'C', 210); }
      if (a.r === 'iPr') { b.grow(first, 'C', 150); b.grow(first, 'C', 270); }
    }
    if (a.alpha === 1) b.grow(ca, 'C', 270);
    if (a.alpha === 2) { b.grow(ca, 'C', 240); b.grow(ca, 'C', 300); }
    if (a.alpha === 'Et') { const first = b.grow(ca, 'C', 270); b.grow(first, 'C', 210); }
    const malonic = a.r === 'OH';
    const enol = malonic ? `the enol form of ${a.product} (a 1,1-diol)` : `the enol of ${a.product}`;
    return {
      id: 'practice-decarboxylation', title: `Warming ${a.name}`, unit: 'Pericyclic reactions', skill: 'pericyclic', level: 3,
      summary: `On warming, ${a.name} loses carbon dioxide through a six-membered ring of atoms, giving ${enol}, which tautomerises to ${a.product}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Carbon dioxide leaves', prompt: `Show ${a.name} losing carbon dioxide in one step, through the six-membered ring.`,
        arrows: [
          { from: `${ck}-${ok}`, to: `${ok}-${h}`, side: -1, says: 'The C=O π electrons form a bond from that oxygen to the acid’s hydrogen.' },
          { from: `${h}-${oa}`, to: `${oa}-${cc}`, says: 'The O–H electrons move into the C–O bond, making a second C=O: carbon dioxide.' },
          { from: `${cc}-${ca}`, to: `${ca}-${ck}`, says: 'The C–C bond to the carboxyl carbon breaks, and its electrons make a C=C: an enol.' },
        ],
        hints: [`Three arrows round a six-membered ring: ${malonic ? 'one C=O' : 'the ketone C=O'}, the acid’s O–H, and the bond to the CO2H carbon.`, 'The C=O oxygen takes the proton; the C–C bond between the α-carbon and the CO2H carbon breaks.'],
        explanation: `Carbon dioxide and ${enol}. The enol then tautomerises to ${a.product}. The reaction needs a C=O on the carbon next to the one carrying the CO2H (the β-position), to take the proton and the electrons, so a simple carboxylic acid does not decarboxylate like this. ${malonic ? 'This is the last step of the malonic ester synthesis: an alkylated malonic ester, hydrolysed and warmed, gives a carboxylic acid.' : a.r === 'Me' ? 'This is the last step of the acetoacetic ester synthesis: an alkylated 3-oxobutanoate ester, hydrolysed and warmed, gives a methyl ketone.' : 'β-Keto acids like this come from hydrolysing β-keto esters (made, for example, by a Claisen condensation); on warming they lose CO2 and give a ketone.'}`,
        move: { [cc]: [3.0, 0.3], [oa]: [3.0, 1.3], [ob]: [3.0, -0.7] },
      }],
      expect: { bonds: [`${ok}-${h}`, `${ck}-${ca}:2`, `${cc}-${oa}:2`, `${cc}-${ob}:2`, `${ck}-${ok}:1`], absent: [`${cc}-${ca}`, `${h}-${oa}`] },
    };
  },
};

export const DECARBOXYLATION_TEMPLATES: readonly Template[] = [decarboxylation];
