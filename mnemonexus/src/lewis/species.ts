import { Drawing } from '../lessons/kit';

/**
 * Draw & check (Molecules): species whose Lewis structure the learner completes. Each starts as a skeleton, with every
 * atom (hydrogens included) joined by single bonds and no charges; the learner changes bond orders and charges until
 * every atom has its octet with as few formal charges as possible. Lone pairs are never drawn by hand: the editor shows
 * the ones each atom's bonds and charge imply. Level 1 needs only multiple bonds or one charge; level 2 needs charges
 * placed with care, and many have resonance forms.
 */
export interface LewisSpecies {
  id: string
  name: string
  /** As shown, with sub- and superscripts. */
  formula: string
  charge: number
  level: 1 | 2
  /** Shown once the structure is right: why it looks like this. */
  about: string
  hint: string
  skeleton: Drawing
}

const H3 = (d: Drawing, at: string, prefix: string, angles: [number, number, number]) => angles.forEach((a, i) => d.grow(`${prefix}${i + 1}`, 'H', at, a));

function species(id: string, name: string, formula: string, charge: number, level: 1 | 2, hint: string, about: string, draw: (d: Drawing) => void): LewisSpecies {
  const skeleton = new Drawing();
  draw(skeleton);
  return { id, name, formula, charge, level, hint, about, skeleton };
}

export const LEWIS_SPECIES: readonly LewisSpecies[] = [
  species('co2', 'Carbon dioxide', 'CO₂', 0, 1,
    'Carbon makes four bonds and each oxygen two.',
    'Two C=O double bonds give every atom an octet and no formal charges. With two electron domains round carbon, the molecule is linear.',
    (d) => { d.atom('C', 'C', 0, 0); d.grow('O1', 'O', 'C', 180); d.grow('O2', 'O', 'C', 0); }),
  species('hcn', 'Hydrogen cyanide', 'HCN', 0, 1,
    'Carbon needs four bonds, nitrogen three.',
    'A C≡N triple bond: carbon has four bonds, and nitrogen three bonds and a lone pair.',
    (d) => { d.atom('H', 'H', -1, 0); d.grow('C', 'C', 'H', 0); d.grow('N', 'N', 'C', 0); }),
  species('n2', 'Nitrogen', 'N₂', 0, 1,
    'Each nitrogen makes three bonds.',
    'N≡N, with a lone pair on each nitrogen. The triple bond is very strong, which is why nitrogen gas is so unreactive.',
    (d) => { d.atom('N1', 'N', 0, 0); d.grow('N2', 'N', 'N1', 0); }),
  species('o2', 'Oxygen', 'O₂', 0, 1,
    'Each oxygen makes two bonds.',
    'O=O, with two lone pairs on each oxygen. (Oxygen in fact has two unpaired electrons, which no Lewis structure shows; molecular orbital theory explains them.)',
    (d) => { d.atom('O1', 'O', 0, 0); d.grow('O2', 'O', 'O1', 0); }),
  species('ethene', 'Ethene', 'C₂H₄', 0, 1,
    'Each carbon has three bonds so far; it needs four.',
    'A C=C double bond: one σ bond and one π bond. Each carbon is trigonal planar.',
    (d) => {
      d.atom('C1', 'C', 0, 0); d.grow('C2', 'C', 'C1', 0);
      d.grow('H1', 'H', 'C1', 150); d.grow('H2', 'H', 'C1', 210); d.grow('H3', 'H', 'C2', 30); d.grow('H4', 'H', 'C2', 330);
    }),
  species('ethyne', 'Ethyne', 'C₂H₂', 0, 1,
    'Each carbon has two bonds so far; it needs four.',
    'A C≡C triple bond: one σ bond and two π bonds, so the molecule is linear.',
    (d) => { d.atom('H1', 'H', -1, 0); d.grow('C1', 'C', 'H1', 0); d.grow('C2', 'C', 'C1', 0); d.grow('H2', 'H', 'C2', 0); }),
  species('methanal', 'Methanal', 'HCHO', 0, 1,
    'Carbon has three bonds so far, and oxygen one.',
    'A C=O double bond, with two lone pairs on oxygen: the carbonyl group of every aldehyde and ketone.',
    (d) => { d.atom('C', 'C', 0, 0); d.grow('O', 'O', 'C', 0); d.grow('H1', 'H', 'C', 120); d.grow('H2', 'H', 'C', 240); }),
  species('ammonium', 'Ammonium ion', 'NH₄⁺', 1, 1,
    'Neutral nitrogen makes three bonds. What charge lets it make four?',
    'Nitrogen with four bonds and no lone pair has a formal charge of +1: its lone pair is now shared with the fourth hydrogen.',
    (d) => { d.atom('N', 'N', 0, 0); for (const [i, a] of [0, 90, 180, 270].entries()) d.grow(`H${i + 1}`, 'H', 'N', a); }),
  species('oxonium', 'Oxonium ion', 'H₃O⁺', 1, 1,
    'Neutral oxygen makes two bonds. What charge lets it make three?',
    'Oxygen with three bonds and one lone pair has a formal charge of +1. This is the ion that makes a solution acidic.',
    (d) => { d.atom('O', 'O', 0, 0); H3(d, 'O', 'H', [90, 210, 330]); }),
  species('hydroxide', 'Hydroxide ion', 'OH⁻', -1, 1,
    'Oxygen has one bond here. A negative charge gives it a third lone pair instead of a second bond.',
    'Oxygen with one bond and three lone pairs has a formal charge of −1.',
    (d) => { d.atom('O', 'O', 0, 0); d.grow('H', 'H', 'O', 0); }),
  species('hypochlorite', 'Chlorate(I) ion', 'ClO⁻', -1, 1,
    'Which atom is short of a bond? Chlorine with one bond already has its octet.',
    'The negative charge is on oxygen: chlorine with one bond and three lone pairs has its octet and no formal charge, and oxygen with one bond needs the extra lone pair. This is the ion in bleach.',
    (d) => { d.atom('Cl', 'Cl', 0, 0); d.grow('O', 'O', 'Cl', 0); }),
  species('bf3', 'Boron trifluoride', 'BF₃', 0, 1,
    'Boron has only three valence electrons. Is a double bond to fluorine worth it?',
    'Boron has only six electrons around it, and that is the best structure: a B=F double bond would put a positive charge on fluorine, the most electronegative element. The empty space on boron is why BF₃ is a Lewis acid, taking a lone pair from ammonia, for example.',
    (d) => { d.atom('B', 'B', 0, 0); for (const [i, a] of [90, 210, 330].entries()) d.grow(`F${i + 1}`, 'F', 'B', a); }),

  species('co', 'Carbon monoxide', 'CO', 0, 2,
    'Only one bond order gives both atoms an octet. Then work out each formal charge.',
    'Only a triple bond gives both atoms an octet, and it leaves carbon −1 and oxygen +1. The lone pair on carbon is why carbon monoxide binds to metals through carbon, as it does to the iron in haemoglobin.',
    (d) => { d.atom('C', 'C', 0, 0); d.grow('O', 'O', 'C', 0); }),
  species('cyanide', 'Cyanide ion', 'CN⁻', -1, 2,
    'Give both atoms an octet first, then see which one carries the charge.',
    'A triple bond, with the negative charge on carbon: carbon has three bonds and a lone pair. Cyanide usually reacts through that carbon, making a new C–C bond.',
    (d) => { d.atom('C', 'C', 0, 0); d.grow('N', 'N', 'C', 0); }),
  species('nitrite', 'Nitrite ion', 'NO₂⁻', -1, 2,
    'One N=O double bond and one N–O single bond. Which atom has the charge?',
    'One N=O and one N–O⁻. Either oxygen can have the double bond, so there are two resonance forms; the real ion is a blend, with both N–O bonds the same length.',
    (d) => { d.atom('N', 'N', 0, 0); d.grow('O1', 'O', 'N', 210); d.grow('O2', 'O', 'N', 330); }),
  species('nitrate', 'Nitrate ion', 'NO₃⁻', -1, 2,
    'Nitrogen can make four bonds if it is N⁺.',
    'N⁺ with one N=O and two N–O⁻: the charges add up to −1. Any of the three oxygens can have the double bond, so there are three resonance forms, and all three N–O bonds are the same length.',
    (d) => { d.atom('N', 'N', 0, 0); for (const [i, a] of [90, 210, 330].entries()) d.grow(`O${i + 1}`, 'O', 'N', a); }),
  species('carbonate', 'Carbonate ion', 'CO₃²⁻', -2, 2,
    'Carbon makes four bonds. How many oxygens can it double-bond to?',
    'One C=O and two C–O⁻. There are three resonance forms, and all three C–O bonds are the same length in the real ion.',
    (d) => { d.atom('C', 'C', 0, 0); for (const [i, a] of [90, 210, 330].entries()) d.grow(`O${i + 1}`, 'O', 'C', a); }),
  species('ozone', 'Ozone', 'O₃', 0, 2,
    'The middle oxygen needs three bonds, so it is O⁺.',
    'O=O⁺–O⁻: the middle oxygen has three bonds and a lone pair. There are two resonance forms, and the molecule is bent, with both bonds the same length.',
    (d) => { d.atom('O1', 'O', 0, 0); d.grow('O2', 'O', 'O1', 210); d.grow('O3', 'O', 'O1', 330); }),
  species('methanoate', 'Methanoate ion', 'HCOO⁻', -1, 2,
    'Carbon needs one double bond. Where does the charge go?',
    'One C=O and one C–O⁻, with two resonance forms: the charge is shared by both oxygens, which is why carboxylic acids are acidic.',
    (d) => { d.atom('C', 'C', 0, 0); d.grow('H', 'H', 'C', 270); d.grow('O1', 'O', 'C', 30); d.grow('O2', 'O', 'C', 150); }),
  species('ethanoate', 'Ethanoate ion', 'CH₃COO⁻', -1, 2,
    'The methyl group is already complete. Look at the other carbon and the two oxygens.',
    'One C=O and one C–O⁻, with two resonance forms that share the charge between the oxygens.',
    (d) => {
      d.atom('C', 'C', 0, 0); d.grow('O1', 'O', 'C', 30); d.grow('O2', 'O', 'C', 150); d.grow('Me', 'C', 'C', 270);
      H3(d, 'Me', 'H', [180, 270, 0]);
    }),
  species('nitronium', 'Nitronium ion', 'NO₂⁺', 1, 2,
    'Nitrogen with four bonds is N⁺.',
    'O=N⁺=O, linear like carbon dioxide (it has the same number of electrons). It is the electrophile in the nitration of benzene.',
    (d) => { d.atom('N', 'N', 0, 0); d.grow('O1', 'O', 'N', 180); d.grow('O2', 'O', 'N', 0); }),
  species('nitromethane', 'Nitromethane', 'CH₃NO₂', 0, 2,
    'The nitro group is drawn like the nitrite ion, with nitrogen as N⁺.',
    'N⁺ with one N=O and one N–O⁻: the molecule is neutral overall, but a nitro group always carries these two formal charges. There are two resonance forms.',
    (d) => {
      d.atom('C', 'C', 0, 0); H3(d, 'C', 'H', [90, 180, 270]);
      d.grow('N', 'N', 'C', 0); d.grow('O1', 'O', 'N', 60); d.grow('O2', 'O', 'N', 300);
    }),
  species('diazomethane', 'Diazomethane', 'CH₂N₂', 0, 2,
    'The middle nitrogen has four bonds in every good structure.',
    'H₂C=N⁺=N⁻ and H₂C⁻–N⁺≡N are both good structures, each with two formal charges. Either is right: they are resonance forms of the same molecule.',
    (d) => { d.atom('C', 'C', 0, 0); d.grow('H1', 'H', 'C', 120); d.grow('H2', 'H', 'C', 240); d.grow('N1', 'N', 'C', 0); d.grow('N2', 'N', 'N1', 0); }),
  species('nitric-acid', 'Nitric acid', 'HNO₃', 0, 2,
    'Nitrogen needs four bonds, so it is N⁺; one oxygen without a hydrogen takes the negative charge.',
    'N⁺ with one N=O, one N–O⁻ and the N–OH. The two oxygens without a hydrogen swap roles in the two resonance forms.',
    (d) => {
      d.atom('N', 'N', 0, 0); d.grow('O1', 'O', 'N', 90); d.grow('O2', 'O', 'N', 330); d.grow('O3', 'O', 'N', 210); d.grow('H', 'H', 'O3', 150);
    }),
  species('ethanenitrile', 'Ethanenitrile', 'CH₃CN', 0, 2,
    'The methyl carbon is complete. The other carbon has two bonds so far.',
    'A C≡N triple bond, as in hydrogen cyanide; the C–C≡N part is linear.',
    (d) => { d.atom('C1', 'C', 0, 0); H3(d, 'C1', 'H', [90, 180, 270]); d.grow('C2', 'C', 'C1', 0); d.grow('N', 'N', 'C2', 0); }),
  species('ethanoic-acid', 'Ethanoic acid', 'CH₃COOH', 0, 2,
    'Only one oxygen can have the double bond without a charge.',
    'One C=O and one C–OH. Unlike the ethanoate ion, there is no second form without charges: moving the double bond to the OH oxygen would make it O⁺ and the other O⁻.',
    (d) => {
      d.atom('C', 'C', 0, 0); d.grow('O1', 'O', 'C', 30); d.grow('O2', 'O', 'C', 150); d.grow('H', 'H', 'O2', 210); d.grow('Me', 'C', 'C', 270);
      H3(d, 'Me', 'Hm', [180, 270, 0]);
    }),
];
