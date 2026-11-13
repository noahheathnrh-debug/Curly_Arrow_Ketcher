import { Drawing, type LessonDef } from '../kit';

/**
 * Five mechanisms every A-level course asks for that the units before did not have: an amide from an acyl chloride,
 * an amine from a halogenoalkane, the hydration of ethene, Friedel–Crafts acylation and an ester from an acid
 * anhydride. Each copies the layout of its nearest lesson (acyl chloride and alcohol, SN2, HBr addition, nitration), so
 * the arrows route as those do.
 */

function acylChlorideAmine(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 90, 2);
  d.grow('Ma', 'C', 'C1', 210);
  d.grow('Cl', 'Cl', 'C1', 330);
  d.atom('N', 'N', 0, -1.8);
  d.grow('Hn', 'H', 'N', 330);
  d.grow('Cm', 'C', 'N', 210);
  return {
    id: 'lesson-acyl-chloride-amine',
    title: 'An acyl chloride and an amine',
    unit: 'Acyl substitution',
    skill: 'substitution',
    level: 2,
    summary: 'Ethanoyl chloride reacts with methylamine to give N-methylethanamide: the amine’s nitrogen adds to the C=O, chloride is expelled, and a proton is lost from nitrogen. The same addition–elimination as with an alcohol, with nitrogen as the nucleophile.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Methylamine adds',
        prompt: 'Show methylamine adding to the carbonyl carbon.',
        arrows: [
          { from: 'N', to: 'N-C1', says: 'The lone pair on nitrogen attacks the carbonyl carbon, made very electron-poor by both the oxygen and the chlorine.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['Nitrogen’s lone pair is the nucleophile. Amines are better nucleophiles than alcohols: nitrogen is less electronegative, so it holds its lone pair less tightly.', 'Carbon cannot take a fifth bond: the C=O π bond moves onto oxygen.'],
        explanation: 'The tetrahedral intermediate: the oxygen is negative, and the nitrogen, now with four bonds, is positive.',
        move: { N: [0, -1], Hn: [0.5, -1.87], Cm: [-0.5, -1.87] },
      },
      {
        name: 'Chloride leaves',
        prompt: 'Show the intermediate collapsing: the C=O re-forms and chloride leaves.',
        arrows: [
          { from: 'O', to: 'O-C1', pair: 2, says: 'A lone pair on the negative oxygen moves back in to re-form the C=O π bond.' },
          { from: 'C1-Cl', to: 'Cl', says: 'The C–Cl bond breaks and chloride leaves with both electrons.' },
        ],
        hints: ['Two arrows: one re-forms the C=O, one breaks a bond to carbon.', 'Chloride is the best leaving group on that carbon.'],
        explanation: 'The C=O is back and chloride has gone. The nitrogen still carries an extra proton.',
        move: { Cl: [1.9, -1.2] },
      },
      {
        name: 'The proton is lost from nitrogen',
        prompt: 'Show chloride removing the proton from the positive nitrogen.',
        arrows: [
          { from: 'Cl', to: 'Cl-Hn', says: 'A lone pair on chloride takes the proton on the positive nitrogen.' },
          { from: 'Hn-N', to: 'N', says: 'The N–H electrons stay on nitrogen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows.'],
        explanation: 'N-methylethanamide, a secondary amide. Chloride takes the proton here so the whole path stays on the page; in the flask a second molecule of methylamine does, giving methylammonium chloride, so two moles of amine are used for each mole of acyl chloride. Ammonia gives a primary amide (ethanamide) the same way, and a diacyl chloride with a diamine gives a polyamide such as nylon.',
        move: { Hn: [1.25, -1.55] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when the intermediate collapses.', hints: ['The C=O re-forms; which group on carbon leaves?'] },
    expect: { bonds: ['N-C1', 'C1-O:2', 'Cl-Hn'], absent: ['C1-Cl', 'Hn-N'] },
    practise: { template: 'acyl-addition' },
  };
}

function ammoniaHalogenoalkane(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('Br', 'Br', 'C1', 0);
  d.grow('C2', 'C', 'C1', 120);
  d.atom('N', 'N', -1.9, -0.3);
  d.grow('Hn', 'H', 'N', 240);
  // A second ammonia molecule, lower left, takes the proton in step 2.
  d.atom('N2', 'N', -2.6, -2.6);
  return {
    id: 'lesson-ammonia-halogenoalkane',
    title: 'Ammonia and a halogenoalkane',
    unit: 'Substitution and elimination',
    skill: 'substitution',
    level: 1,
    summary: 'Bromoethane heated with excess ammonia in ethanol, in a sealed tube, gives ethylamine. Ammonia’s lone pair replaces bromide in an SN2 step, and a second ammonia molecule takes a proton from the nitrogen.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Ammonia replaces bromide',
        prompt: 'Show ammonia replacing bromide in one step.',
        arrows: [
          { from: 'N', to: 'N-C1', says: 'The lone pair on ammonia’s nitrogen attacks the carbon bonded to bromine, from the side opposite the bromine.' },
          { from: 'C1-Br', to: 'Br', says: 'As the new bond forms, the C–Br bond breaks and bromide leaves with both electrons.' },
        ],
        hints: ['Ammonia is neutral, but its lone pair makes it a nucleophile.', 'The carbon cannot keep both bonds, so the C–Br bond breaks as the C–N bond forms.'],
        explanation: 'The ethylammonium ion, CH3CH2NH3+, and bromide. Nitrogen has four bonds, so it is positive.',
        move: { N: [-1, -0.2], Hn: [-1.5, -1.07], Br: [1.8, 0] },
      },
      {
        name: 'A second ammonia takes a proton',
        prompt: 'Show the second ammonia molecule taking a proton from the nitrogen.',
        arrows: [
          { from: 'N2', to: 'N2-Hn', says: 'The lone pair on a second ammonia molecule takes a proton from the positive nitrogen.' },
          { from: 'Hn-N', to: 'N', says: 'The N–H electrons stay on nitrogen, which becomes neutral: ethylamine.' },
        ],
        hints: ['A proton transfer: base to hydrogen, and the N–H electrons stay on nitrogen.'],
        explanation: 'Ethylamine and an ammonium ion (with the bromide, ammonium bromide). Ethylamine has a lone pair too, so it can attack another bromoethane to give diethylamine, then triethylamine and a quaternary ammonium salt. A large excess of ammonia makes ethylamine the main product. Heating a halogenoalkane with potassium cyanide instead, then reducing the nitrile, gives an amine with one more carbon and no further substitution.',
        move: { Hn: [-2.1, -1.8] },
      },
    ],
    predict: { step: 0, prompt: 'Draw what forms when ammonia replaces bromide.', hints: ['Nitrogen gains a bond to carbon; count its bonds to find its charge.'] },
    expect: { bonds: ['N-C1', 'N2-Hn'], absent: ['C1-Br', 'Hn-N'], charges: { N2: 1, Br: -1 } },
    practise: { template: 'sn2' },
  };
}

function hydration(): LessonDef {
  const d = new Drawing();
  d.atom('Ca', 'C', 0, 0);
  d.grow('Cb', 'C', 'Ca', 0, 2);
  d.grow('M', 'C', 'Ca', 120);
  // The oxonium ion up and to the right, as HBr is in "Adding HBr to an alkene"; water below left.
  d.atom('Hx', 'H', 2.3, 0.8);
  d.grow('Ox', 'O', 'Hx', 0, 1, { charge: 1 });
  d.atom('Ow', 'O', -1.4, -1.6);
  d.grow('Hw', 'H', 'Ow', 180);
  return {
    id: 'lesson-alkene-hydration',
    title: 'Hydrating an alkene',
    unit: 'Addition to alkenes',
    skill: 'alkene-addition',
    level: 2,
    summary: 'An alkene and steam with an acid catalyst give an alcohol: propene gives propan-2-ol. The acid’s proton adds to the π bond, water bonds to the carbocation, and a proton is lost again, so the acid is not used up. The acid is shown as the oxonium ion, H3O+. Industry makes ethanol this way, from ethene and steam over phosphoric acid at about 300 °C and 60–70 atm.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The π bond takes a proton',
        prompt: 'Show the C=C π bond taking a proton from the oxonium ion, so that the more stable carbocation forms.',
        arrows: [
          { from: 'Ca-Cb', to: 'Cb-Hx', says: 'The π electrons make a bond from one carbon to a proton of the oxonium ion.' },
          { from: 'Hx-Ox', to: 'Ox', says: 'The O–H bond breaks and its electrons stay on oxygen: a water molecule.' },
        ],
        hints: ['The alkene is the nucleophile: start at the double bond.', 'The proton goes to the CH2 end, leaving the positive charge on the carbon with more alkyl groups.', 'Hydrogen keeps one bond, so the O–H bond breaks.'],
        explanation: 'A secondary carbocation and water. Adding the proton to the other end would give a primary carbocation, which is less stable because fewer alkyl groups push electron density towards the positive carbon, so propan-1-ol is only a minor product. Ethene can only give a primary carbocation, one reason its conditions are harsh.',
        move: { Hx: [1.5, 0.87], Ox: [-1.0, -2.6] },
      },
      {
        name: 'Water bonds to the carbocation',
        prompt: 'Show a water molecule bonding to the positive carbon.',
        arrows: [{ from: 'Ow', to: 'Ow-Ca', says: 'A lone pair on water’s oxygen fills the empty p orbital of the positive carbon.' }],
        hints: ['One arrow, from a lone pair on water to the positive carbon.'],
        explanation: 'The oxygen now has three bonds and is positive: a protonated alcohol.',
        move: { Ow: [-0.5, -0.87], Hw: [-1.5, -0.87] },
      },
      {
        name: 'Water takes the proton back',
        prompt: 'Show the water molecule from step 1 taking the extra proton from the oxygen.',
        arrows: [
          { from: 'Ox', to: 'Ox-Hw', says: 'A lone pair on water takes the proton from the positive oxygen.' },
          { from: 'Hw-Ow', to: 'Ow', says: 'The O–H electrons stay on oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows. The base is the water molecule made in step 1.'],
        explanation: 'Propan-2-ol, and the oxonium ion is back: the acid catalyst is regenerated. Every step is reversible, and the reverse is the acid-catalysed dehydration of an alcohol. In the industrial hydration of ethene only about 5% of the ethene reacts in each pass, so the unreacted ethene is recycled.',
        move: { Hw: [-1.6, -1.8] },
      },
    ],
    predict: { step: 0, prompt: 'Draw the carbocation that forms when propene takes the proton.', hints: ['The CH2 carbon gains a C–H bond; the other is left with only three bonds.'] },
    expect: { bonds: ['Cb-Hx', 'Ca-Ow', 'Ox-Hw', 'Ca-Cb:1'], absent: ['Hx-Ox', 'Ow-Hw'], charges: { Ox: 1 } },
    practise: { template: 'alkene-protonation' },
  };
}

function friedelCraftsAcylation(): LessonDef {
  const d = new Drawing();
  const ring = [90, 30, 330, 270, 210, 150].map((deg, i) => d.atom(`C${i + 1}`, 'C', Math.round(Math.cos((deg * Math.PI) / 180) * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * 100) / 100));
  ([2, 1, 2, 1, 2, 1] as const).forEach((order, i) => d.bond(ring[i], ring[(i + 1) % 6], order));
  d.grow('H1', 'H', 'C1', 90);
  d.grow('H2', 'H', 'C2', 30);
  // The acylium ion, CH3–C+=O, upper left where the nitronium ion sits in "Nitrating benzene"; AlCl4− upper right.
  d.atom('Ck', 'C', -1.3, 2.3, { charge: 1 });
  d.grow('Ok', 'O', 'Ck', 60, 2);
  d.grow('Mk', 'C', 'Ck', 240);
  d.atom('Al', 'Al', 2.8, 3.0, { charge: -1 });
  d.grow('Cla', 'Cl', 'Al', 45);
  d.grow('Clb', 'Cl', 'Al', 135);
  d.grow('Clc', 'Cl', 'Al', 225);
  d.grow('Cld', 'Cl', 'Al', 315);
  return {
    id: 'lesson-friedel-crafts-acylation',
    title: 'Friedel–Crafts acylation',
    unit: 'Aromatic substitution',
    skill: 'aromatic-substitution',
    level: 2,
    summary: 'Benzene heated with ethanoyl chloride and anhydrous aluminium chloride gives phenylethanone. Aluminium chloride takes chloride from the acyl chloride (CH3COCl + AlCl3 → CH3CO+ + AlCl4−); the acylium ion is the electrophile that benzene attacks, and AlCl4− takes the proton that is lost, giving back AlCl3.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Benzene attacks the acylium ion',
        prompt: 'Show the ring’s π electrons attacking the positive carbon of the acylium ion.',
        arrows: [{ from: 'C1-C2', to: 'C1-Ck', says: 'Two of the ring’s π electrons make a bond to the positive carbon of the acylium ion.' }],
        hints: ['Benzene is the nucleophile: start the arrow from a C=C of the ring.', 'The acylium carbon has only three bonds, so it can take the electrons without anything else moving.'],
        explanation: 'The arenium ion: the positive charge is shared over three ring carbons, and the ring is no longer aromatic.',
        move: { H1: [0.5, 1.87], Ck: [-0.5, 1.87], Ok: [0, 2.74], Mk: [-1.5, 1.87] },
      },
      {
        name: 'AlCl4− takes the proton',
        prompt: 'Show AlCl4− giving up a chloride that takes the proton, as the ring becomes aromatic again.',
        arrows: [
          { from: 'Al-Clc', to: 'Clc-H1', says: 'The electrons of one Al–Cl bond in AlCl4− make a bond from that chlorine to the proton on the carbon that carries the acyl group, giving back AlCl3.' },
          { from: 'C1-H1', to: 'C1-C2', side: -1, says: 'The C–H electrons move back into the ring, so it is aromatic again.' },
        ],
        hints: ['Two arrows: from an Al–Cl bond to the proton, and from the C–H bond into the ring.', 'The ring regains its aromaticity by losing H+, as in nitration.'],
        explanation: 'Phenylethanone, hydrogen chloride and AlCl3 again: the mechanism gives the AlCl3 back, which is why it is called a catalyst. In the flask, though, the ketone’s oxygen then binds to it, so slightly more than one equivalent is used and the product is freed by adding water. An acyl group on the ring makes it less reactive, so, unlike alkylation, the reaction stops after one substitution.',
        move: { H1: [2.2, -0.6], Clc: [3.2, -0.6] },
      },
    ],
    predict: { step: 0, prompt: 'Draw the cation that forms when benzene attacks the acylium ion.', hints: ['The ring carbon that is attacked gains a bond to the acyl carbon; which ring carbon is left positive?'] },
    expect: { bonds: ['C1-Ck', 'C1-C2:2', 'Clc-H1', 'Ck-Ok:2'], absent: ['C1-H1', 'Al-Clc'] },
    practise: { template: 'arenium-formation' },
  };
}

function anhydrideAlcohol(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O', 'O', 'C1', 90, 2);
  d.grow('Ma', 'C', 'C1', 210);
  d.grow('Ob', 'O', 'C1', 330);
  d.grow('C2', 'C', 'Ob', 30);
  d.grow('O2', 'O', 'C2', 90, 2);
  d.grow('Mb', 'C', 'C2', 330);
  d.atom('Om', 'O', 0, -1.8);
  d.grow('Hm', 'H', 'Om', 330);
  d.grow('Cm', 'C', 'Om', 210);
  return {
    id: 'lesson-anhydride-alcohol',
    title: 'An acid anhydride and an alcohol',
    unit: 'Acyl substitution',
    skill: 'substitution',
    level: 2,
    summary: 'Ethanoic anhydride reacts with methanol to give methyl ethanoate and ethanoic acid: the same addition–elimination as an acyl chloride, with ethanoate as the leaving group instead of chloride.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Methanol adds',
        prompt: 'Show methanol adding to one of the carbonyl carbons.',
        arrows: [
          { from: 'Om', to: 'Om-C1', says: 'A lone pair on methanol’s oxygen attacks a carbonyl carbon.' },
          { from: 'C1-O', to: 'O', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['Either C=O will do: the anhydride is the same on both sides.', 'Carbon cannot take a fifth bond: the C=O π bond moves onto oxygen.'],
        explanation: 'The tetrahedral intermediate, negative on the old carbonyl oxygen and positive on methanol’s oxygen.',
        move: { Om: [0, -1], Hm: [0.5, -1.87], Cm: [-0.5, -1.87] },
      },
      {
        name: 'Ethanoate leaves',
        prompt: 'Show the intermediate collapsing: the C=O re-forms and ethanoate leaves.',
        arrows: [
          { from: 'O', to: 'O-C1', pair: 2, says: 'A lone pair on the negative oxygen moves back in to re-form the C=O.' },
          { from: 'C1-Ob', to: 'Ob', says: 'The bond to the central oxygen breaks: ethanoate leaves, its charge shared by its two oxygens.' },
        ],
        hints: ['The leaving group is the other half of the anhydride.', 'Ethanoate is a weak base, so it is a good leaving group, though not as good as chloride.'],
        explanation: 'The ester has formed, still protonated on its oxygen, and an ethanoate ion has left.',
        move: { Ob: [1.9, -1.2], C2: [2.77, -0.7], O2: [2.77, 0.3], Mb: [3.63, -1.2] },
      },
      {
        name: 'Ethanoate takes the proton',
        prompt: 'Show ethanoate removing the proton from the positive oxygen.',
        arrows: [
          { from: 'Ob', to: 'Ob-Hm', says: 'A lone pair on ethanoate’s oxygen takes the proton.' },
          { from: 'Hm-Om', to: 'Om', says: 'The O–H electrons stay on oxygen, which is neutral again.' },
        ],
        hints: ['A proton transfer: two arrows. The base is the ethanoate that just left.'],
        explanation: 'Methyl ethanoate and ethanoic acid. Industry makes aspirin this way, from 2-hydroxybenzoic acid and ethanoic anhydride, rather than with ethanoyl chloride: the anhydride is cheaper, less corrosive, reacts less violently with water, and gives ethanoic acid instead of hydrogen chloride.',
        move: { Hm: [1.3, -1.6] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when the intermediate collapses.', hints: ['The C=O re-forms; which group leaves?'] },
    expect: { bonds: ['Om-C1', 'C1-O:2', 'Ob-Hm'], absent: ['C1-Ob', 'Hm-Om'] },
    practise: { template: 'acyl-addition' },
  };
}

function radicalHbrAddition(): LessonDef {
  const d = new Drawing();
  d.atom('Ca', 'C', 0, 0);
  d.grow('Cb', 'C', 'Ca', 0, 2);
  d.grow('M', 'C', 'Ca', 120);
  // The peroxide, CH3O–OCH3, upper right, with the first HBr below it; a second HBr below left of the alkene.
  d.atom('Mo1', 'C', 1.0, 3.2);
  d.grow('O1', 'O', 'Mo1', 330);
  d.grow('O2', 'O', 'O1', 30);
  d.grow('Mo2', 'C', 'O2', 330);
  d.atom('Br1', 'Br', 2.4, 0.6);
  d.grow('H1', 'H', 'Br1', 90);
  d.atom('H2', 'H', -0.6, -1.3);
  d.grow('Br2', 'Br', 'H2', 240);
  return {
    id: 'lesson-radical-hbr-addition',
    title: 'HBr and peroxides: radical addition',
    unit: 'Radicals',
    skill: 'radicals',
    level: 3,
    summary: 'With a peroxide present, hydrogen bromide adds to propene the other way round: 1-bromopropane, not 2-bromopropane. The peroxide starts a radical chain; a bromine atom adds to the end of the C=C that leaves the more stable radical, and that radical takes a hydrogen atom from HBr. The peroxide is drawn as CH3O–OCH3; any ROOR works the same way.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Initiation: the peroxide splits',
        prompt: 'Show the peroxide’s O–O bond splitting evenly, with two fishhook arrows.',
        arrows: [
          { from: 'O1-O2', to: 'O1', single: true, says: 'Heat or light breaks the weak O–O bond evenly: one electron goes to this oxygen…' },
          { from: 'O1-O2', to: 'O2', single: true, side: -1, says: '…and one to the other.' },
        ],
        hints: ['Homolysis: one electron to each oxygen.', 'Two fishhooks, both starting from the O–O bond.'],
        explanation: 'Two alkoxyl radicals, RO•. The O–O bond is weak (about 150 kJ/mol), so heat or ultraviolet light breaks it, and a trace of peroxide is enough to start many chains.',
        move: { O2: [3.6, 3.4], Mo2: [4.47, 2.9] },
      },
      {
        name: 'Initiation: a bromine atom is made',
        prompt: 'Show the alkoxyl radical taking the hydrogen atom from hydrogen bromide.',
        arrows: [
          { from: 'O1', to: 'O1-H1', single: true, says: 'The oxygen’s unpaired electron goes towards a new O–H bond.' },
          { from: 'H1-Br1', to: 'O1-H1', single: true, says: 'One electron of the H–Br bond pairs with it.' },
          { from: 'H1-Br1', to: 'Br1', single: true, says: 'The other stays on bromine: a bromine atom.' },
        ],
        hints: ['A new bond needs two fishhooks, one electron from each side.', 'The H–Br bond splits evenly.'],
        explanation: 'Methanol and a bromine atom. The O–H bond made is stronger than the H–Br bond broken, so this step runs downhill.',
        move: { H1: [1.87, 1.7] },
      },
      {
        name: 'Propagation: the bromine atom adds',
        prompt: 'Show the bromine atom adding to the CH2 end of the C=C.',
        arrows: [
          { from: 'Br1', to: 'Br1-Cb', single: true, says: 'The bromine atom’s unpaired electron goes towards a new C–Br bond at the CH2 end.' },
          { from: 'Ca-Cb', to: 'Br1-Cb', single: true, says: 'One π electron pairs with it.' },
          { from: 'Ca-Cb', to: 'Ca', single: true, side: -1, says: 'The other π electron stays on the middle carbon, which becomes a radical.' },
        ],
        hints: ['Bromine adds to the end that leaves the more stable radical: secondary, not primary.', 'Three fishhooks: one from bromine, two from the π bond.'],
        explanation: 'A secondary radical. Alkyl groups next to the radical carbon stabilise it, as they do a carbocation. In the ionic mechanism the proton adds first and goes to the CH2 end, so bromine ends on the middle carbon; here bromine adds first and goes to the CH2 end, so it ends there.',
        move: { Br1: [1.5, 0.87] },
      },
      {
        name: 'Propagation: the radical takes a hydrogen',
        prompt: 'Show the radical taking a hydrogen atom from a second molecule of hydrogen bromide.',
        arrows: [
          { from: 'Ca', to: 'Ca-H2', single: true, says: 'The radical’s unpaired electron goes towards a new C–H bond.' },
          { from: 'H2-Br2', to: 'Ca-H2', single: true, says: 'One electron of the H–Br bond pairs with it.' },
          { from: 'H2-Br2', to: 'Br2', single: true, approach: 0, says: 'The other stays on bromine: a new bromine atom.' },
        ],
        hints: ['The same pattern as step 2: two fishhooks make the new bond, one goes to the atom left behind.'],
        explanation: '1-Bromopropane and a new bromine atom, which adds to another propene: steps 3 and 4 repeat until two radicals meet. Of the hydrogen halides, only HBr adds this way. With HCl the second propagation step is uphill (the H–Cl bond is too strong), and with HI the first is (the C–I bond is too weak), so neither chain runs.',
        move: { H2: [-0.5, -0.87], Br2: [-1.5, -2.0] },
      },
    ],
    predict: { step: 2, prompt: 'Draw the radical that forms when the bromine atom adds to propene.', hints: ['Bromine bonds to the CH2 end; which carbon is left with the unpaired electron?'] },
    expect: { bonds: ['O1-H1', 'Cb-Br1', 'Ca-H2', 'Ca-Cb:1'], absent: ['O1-O2', 'H1-Br1', 'H2-Br2'] },
    practise: { template: 'hydrogen-abstraction' },
  };
}

function aromaticChlorination(): LessonDef {
  const d = new Drawing();
  const ring = [90, 30, 330, 270, 210, 150].map((deg, i) => d.atom(`C${i + 1}`, 'C', Math.round(Math.cos((deg * Math.PI) / 180) * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * 100) / 100));
  ([2, 1, 2, 1, 2, 1] as const).forEach((order, i) => d.bond(ring[i], ring[(i + 1) % 6], order));
  d.grow('H1', 'H', 'C1', 90);
  d.grow('H2', 'H', 'C2', 30);
  // Chlorine upper right of the ring, and aluminium chloride beyond it, where AlCl4− sits in "Friedel–Crafts acylation".
  d.atom('Cl1', 'Cl', 1.2, 2.4);
  d.grow('Cl2', 'Cl', 'Cl1', 30);
  d.atom('Al', 'Al', 3.2, 4.0);
  d.grow('Cla', 'Cl', 'Al', 45);
  d.grow('Clb', 'Cl', 'Al', 135);
  d.grow('Clc', 'Cl', 'Al', 315);
  return {
    id: 'lesson-benzene-chlorination',
    title: 'Chlorinating benzene',
    unit: 'Aromatic substitution',
    skill: 'aromatic-substitution',
    level: 2,
    summary: 'Benzene and chlorine with aluminium chloride, at room temperature, give chlorobenzene. Chlorine alone is not electrophilic enough to attack the ring; aluminium chloride, a halogen carrier, bonds to one chlorine atom and makes the other the electrophile. Iron(III) chloride works the same way, as does iron(III) bromide with bromine.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Aluminium chloride takes hold of chlorine',
        prompt: 'Show a lone pair on chlorine bonding to the aluminium of AlCl3.',
        arrows: [{ from: 'Cl2', to: 'Cl2-Al', says: 'A lone pair on the nearer chlorine atom bonds to aluminium, which has only six outer electrons.' }],
        hints: ['AlCl3 is a Lewis acid: aluminium can accept a lone pair.', 'One arrow, from a lone pair on the chlorine nearer the aluminium.'],
        explanation: 'The chlorine bonded to aluminium is now positive, so it pulls the Cl–Cl electrons towards itself and leaves the far chlorine very electron-poor. A-level courses write this as Cl2 + AlCl3 → Cl+ + AlCl4−: a shorthand for this complex.',
        move: { Al: [2.78, 3.61], Cla: [3.49, 4.32], Clb: [2.07, 4.32], Clc: [3.49, 2.9] },
      },
      {
        name: 'Benzene attacks chlorine',
        prompt: 'Show the ring’s π electrons attacking the far chlorine as the Cl–Cl bond breaks.',
        arrows: [
          { from: 'C1-C2', to: 'C1-Cl1', says: 'Two of the ring’s π electrons make a bond to the far chlorine atom.' },
          { from: 'Cl1-Cl2', to: 'Cl2', says: 'The Cl–Cl bond breaks, its electrons going to the chlorine on aluminium: AlCl4−.' },
        ],
        hints: ['Benzene is the nucleophile: start the arrow from a C=C of the ring.', 'Chlorine keeps only one bond, so the Cl–Cl bond breaks.'],
        explanation: 'The arenium ion and AlCl4−. The ring has lost its aromaticity, which is why this step is slow and needs so reactive an electrophile.',
        move: { H1: [0.5, 1.87], Cl1: [-0.5, 1.87], Al: [2.2, 3.2], Cl2: [1.49, 2.49], Cla: [2.91, 3.91], Clb: [1.49, 3.91], Clc: [2.91, 2.49] },
      },
      {
        name: 'AlCl4− takes the proton',
        prompt: 'Show AlCl4− taking the proton as the ring becomes aromatic again.',
        arrows: [
          { from: 'Al-Cl2', to: 'Cl2-H1', says: 'The electrons of an Al–Cl bond make a bond from that chlorine to the proton on the carbon carrying the new chlorine, giving back AlCl3.' },
          { from: 'C1-H1', to: 'C1-C2', side: -1, says: 'The C–H electrons move back into the ring, so it is aromatic again.' },
        ],
        hints: ['Two arrows: from an Al–Cl bond to the proton, and from the C–H bond into the ring.'],
        explanation: 'Chlorobenzene, hydrogen chloride and AlCl3 again: the halogen carrier is a catalyst. By this electrophilic route the ring substitutes rather than adds, because adding across a C=C would destroy its aromatic stability. (In ultraviolet light, with no carrier, chlorine does add, by radicals.)',
        move: { H1: [2.2, -0.6], Cl2: [3.2, -0.6], Cl1: [0, 2] },
      },
    ],
    predict: { step: 1, prompt: 'Draw the cation that forms when the ring attacks chlorine.', hints: ['The ring carbon that is attacked gains a bond to chlorine; which ring carbon is left positive?'] },
    expect: { bonds: ['C1-Cl1', 'C1-C2:2', 'Cl2-H1', 'Al-Cla'], absent: ['Cl1-Cl2', 'C1-H1', 'Al-Cl2'] },
    practise: { template: 'arenium-formation' },
  };
}

function cannizzaro(): LessonDef {
  const d = new Drawing();
  d.atom('C1', 'C', 0, 0);
  d.grow('O1', 'O', 'C1', 90, 2);
  d.grow('Ha', 'H', 'C1', 330);
  d.atom('Oh', 'O', -1.5, -0.4, { charge: -1 });
  d.grow('Hh', 'H', 'Oh', 270);
  // The second methanal, lower right, where the hydride arrives.
  d.atom('C2', 'C', 1.5, -1.6);
  d.grow('O2', 'O', 'C2', 210, 2);
  return {
    id: 'lesson-cannizzaro',
    title: 'The Cannizzaro reaction',
    unit: 'Carbonyl addition',
    skill: 'hydride-transfer',
    level: 3,
    summary: 'An aldehyde with no α-hydrogen, such as methanal or benzaldehyde, cannot form an enolate. In concentrated hydroxide it reacts with itself instead: a hydride ion moves from one molecule to another, so one is oxidised to a carboxylate and the other reduced to an alcohol. Methanal gives methanoate and methanol.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Hydroxide adds',
        prompt: 'Show hydroxide adding to the C=O carbon of one methanal molecule.',
        arrows: [
          { from: 'Oh', to: 'Oh-C1', says: 'A lone pair on hydroxide attacks the carbonyl carbon.' },
          { from: 'C1-O1', to: 'O1', says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['Hydroxide is the nucleophile; the carbonyl carbon is the electrophile.', 'Carbon cannot take a fifth bond: the C=O π bond moves onto oxygen.'],
        explanation: 'A tetrahedral intermediate, negative on oxygen. Hydroxide could simply leave again, but this anion can give away something else.',
        move: { Oh: [-0.87, -0.5], Hh: [-0.87, -1.5] },
      },
      {
        name: 'A hydride moves across',
        prompt: 'Show the intermediate re-forming its C=O and pushing a hydride ion onto a second methanal.',
        arrows: [
          { from: 'O1', to: 'O1-C1', pair: 2, says: 'A lone pair on the negative oxygen moves back in to re-form the C=O.' },
          { from: 'C1-Ha', to: 'Ha-C2', says: 'The C–H bond breaks, and the hydrogen moves with both electrons, as a hydride ion, to the carbon of a second methanal.' },
          { from: 'C2-O2', to: 'O2', says: 'That molecule’s C=O π bond moves onto its oxygen.' },
        ],
        hints: ['The intermediate acts like NaBH4: it gives a hydride ion to a C=O.', 'Three arrows: re-form the C=O, move the hydride, and push the second C=O onto its oxygen.'],
        explanation: 'Methanoic acid and methoxide. The first carbon has lost a hydrogen and kept two bonds to oxygen (oxidised); the second has gained a hydrogen (reduced).',
        move: { Ha: [2.37, -1.1] },
      },
      {
        name: 'The acid gives up its proton',
        prompt: 'Show methoxide taking the proton from methanoic acid.',
        arrows: [
          { from: 'O2', to: 'O2-Hh', says: 'A lone pair on methoxide takes the acidic proton.' },
          { from: 'Hh-Oh', to: 'Oh', says: 'The O–H electrons stay on oxygen: methanoate.' },
        ],
        hints: ['A proton transfer: two arrows. Methoxide is a far stronger base than methanoate.'],
        explanation: 'Methanoate and methanol. This last step is very favourable (methanoic acid is about 10¹² times more acidic than methanol) and pulls the whole reaction forward. Benzaldehyde gives benzoate and phenylmethanol the same way; an aldehyde with an α-hydrogen gives an aldol reaction instead.',
        move: { Hh: [-0.37, -2.1] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when the hydride moves across.', hints: ['One carbon keeps both oxygens; the other gains the hydrogen.'] },
    expect: { bonds: ['Oh-C1', 'C1-O1:2', 'Ha-C2', 'C2-O2:1', 'O2-Hh'], absent: ['C1-Ha', 'Hh-Oh'], charges: { Oh: -1 } },
    practise: { template: 'carbonyl-addition' },
  };
}

function dieneHbr(): LessonDef {
  const d = new Drawing();
  // Buta-1,3-diene drawn s-cis, so both ends face the HBr below.
  d.atom('C2', 'C', -0.5, 0);
  d.grow('C1', 'C', 'C2', 240, 2);
  d.grow('C3', 'C', 'C2', 0);
  d.grow('C4', 'C', 'C3', 300, 2);
  d.atom('H', 'H', -1.0, -2.1);
  d.grow('Br', 'Br', 'H', 0);
  return {
    id: 'lesson-diene-hbr',
    title: 'HBr and a conjugated diene',
    unit: 'Addition to alkenes',
    skill: 'alkene-addition',
    level: 3,
    summary: 'Hydrogen bromide adds to buta-1,3-diene in two ways: across one C=C (1,2-addition, giving 3-bromobut-1-ene) or across both ends (1,4-addition, giving 1-bromobut-2-ene, with the C=C moved to the middle). Both come from the same allylic carbocation, whose positive charge is shared between two carbons.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The diene takes a proton',
        prompt: 'Show an end C=C taking the proton from HBr.',
        arrows: [
          { from: 'C1-C2', to: 'C1-H', says: 'The π electrons of the end C=C make a bond from the end carbon to the proton.' },
          { from: 'H-Br', to: 'Br', says: 'The H–Br bond breaks, and bromide leaves with both electrons.' },
        ],
        hints: ['Protonate an end carbon: the positive charge then sits next to the other C=C.', 'Hydrogen keeps one bond, so the H–Br bond breaks.'],
        explanation: 'An allylic carbocation: the positive carbon is next to a C=C, whose π electrons spread over it. Adding the proton to an inner carbon would give a primary cation with no such help.',
        move: { H: [-1.87, -1.37] },
      },
      {
        name: 'The charge is shared',
        prompt: 'Draw the other resonance form of the allylic cation.',
        arrows: [{ from: 'C3-C4', to: 'C2-C3', says: 'The C=C π electrons move across towards the positive carbon, so the charge now sits on the far end.' }],
        hints: ['A resonance arrow: no atoms move, only π electrons.', 'Move the π electrons of the neighbouring C=C towards the positive carbon.'],
        explanation: 'The same ion drawn another way: the real cation is a blend of the two forms, partly positive at both the middle carbon and the end carbon, so bromide can bond to either.',
      },
      {
        name: 'Bromide adds at the far end',
        prompt: 'Show bromide bonding to the end carbon that is positive in this form.',
        arrows: [{ from: 'Br', to: 'Br-C4', says: 'A lone pair on bromide bonds to the positive end carbon.' }],
        hints: ['One arrow, from bromide to the positive carbon.'],
        explanation: '1-Bromobut-2-ene, the 1,4-adduct. Bromide bonding at the middle carbon next to the CH3 instead gives 3-bromobut-1-ene, the 1,2-adduct. At −80 °C the 1,2-adduct is the main product because it forms faster (kinetic control). At 40 °C the two interconvert, and the 1,4-adduct, the more stable because its C=C is more substituted, becomes the main product (thermodynamic control).',
        move: { C4: [1.0, 0.87], Br: [2.0, 0.87] },
      },
    ],
    predict: { step: 2, prompt: 'Draw the 1,4-adduct that forms when bromide bonds to the far end.', hints: ['The C=C ends up between the two middle carbons.'] },
    expect: { bonds: ['C1-H', 'C4-Br', 'C2-C3:2', 'C1-C2:1', 'C3-C4:1'], absent: ['H-Br'] },
    practise: { template: 'alkene-protonation' },
  };
}

function hydrideShift(): LessonDef {
  const d = new Drawing();
  d.atom('C2', 'C', 0, 0);
  d.grow('C1', 'C', 'C2', 210);
  d.grow('O', 'O', 'C2', 90);
  d.grow('C3', 'C', 'C2', 330);
  d.grow('C4', 'C', 'C3', 30);
  d.grow('C5', 'C', 'C3', 300);
  d.grow('Hs', 'H', 'C3', 240);
  d.atom('Ha', 'H', 1.0, 1.9);
  d.grow('Br', 'Br', 'Ha', 0);
  return {
    id: 'lesson-hydride-shift',
    title: 'A hydride shift',
    unit: 'Substitution and elimination',
    skill: 'hydride-transfer',
    level: 3,
    summary: '3-Methylbutan-2-ol and hydrogen bromide give 2-bromo-2-methylbutane, with the bromine on a different carbon from the one that carried the OH. Water leaves to give a secondary carbocation, and a hydrogen moves across with its electrons to make it tertiary before bromide adds.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The OH is protonated',
        prompt: 'Show the OH group taking a proton from HBr.',
        arrows: [
          { from: 'O', to: 'O-Ha', says: 'A lone pair on the OH oxygen takes the proton from HBr.' },
          { from: 'Ha-Br', to: 'Br', says: 'The H–Br bond breaks, and bromide leaves with both electrons.' },
        ],
        hints: ['Hydroxide is a poor leaving group; protonating the OH makes water, a good one.'],
        explanation: 'An oxonium ion: the leaving group is now a water molecule.',
        move: { Ha: [0.87, 1.5] },
      },
      {
        name: 'Water leaves',
        prompt: 'Show water leaving to give a carbocation.',
        arrows: [{ from: 'C2-O', to: 'O', says: 'The C–O bond breaks, and both electrons go with the oxygen as water leaves.' }],
        hints: ['One arrow, from the C–O bond onto oxygen.'],
        explanation: 'A secondary carbocation. The carbon next door carries a hydrogen and two methyl groups: if it held the charge, the cation would be tertiary.',
        move: { O: [-1.3, 2.0], Ha: [-0.43, 2.5] },
      },
      {
        name: 'A hydride shifts',
        prompt: 'Show the hydrogen on the next carbon moving across, with its bonding pair, to the positive carbon.',
        arrows: [{ from: 'C3-Hs', to: 'Hs-C2', side: -1, says: 'The C–H bonding pair, and the hydrogen with it, moves to the positive carbon: a 1,2-hydride shift.' }],
        hints: ['One arrow, from the C–H bond on the neighbouring carbon to the positive carbon.', 'Which is more stable: a secondary or a tertiary carbocation?'],
        explanation: 'A tertiary carbocation, more stable because three alkyl groups now push electron density towards the positive carbon. Had the next carbon carried a methyl group instead of the hydrogen, as in 3,3-dimethylbutan-2-ol, the methyl group would shift the same way.',
        move: { Hs: [0, 1], Br: [-0.2, -1.6] },
      },
      {
        name: 'Bromide adds',
        prompt: 'Show bromide bonding to the new positive carbon.',
        arrows: [{ from: 'Br', to: 'Br-C3', says: 'A lone pair on bromide bonds to the tertiary positive carbon.' }],
        hints: ['One arrow, from bromide to the positive carbon.'],
        explanation: '2-Bromo-2-methylbutane, not the 2-bromo-3-methylbutane you might expect. A product whose new group sits on a different carbon, or whose carbon skeleton has changed, is a sign that the reaction went through a carbocation (SN1 or E1), not SN2.',
        move: { Br: [0.37, -1.37] },
      },
    ],
    predict: { step: 2, prompt: 'Draw the carbocation after the hydride shift.', hints: ['The hydrogen ends on the carbon that had the OH; which carbon is positive now?'] },
    expect: { bonds: ['O-Ha', 'C2-Hs', 'C3-Br'], absent: ['C2-O', 'C3-Hs'] },
    practise: { template: 'carbocation-shift' },
  };
}

function phenolBromination(): LessonDef {
  const d = new Drawing();
  const ring = [90, 30, 330, 270, 210, 150].map((deg, i) => d.atom(`C${i + 1}`, 'C', Math.round(Math.cos((deg * Math.PI) / 180) * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * 100) / 100));
  ([2, 1, 2, 1, 2, 1] as const).forEach((order, i) => d.bond(ring[i], ring[(i + 1) % 6], order));
  d.grow('O', 'O', 'C1', 90);
  // Hydrogens drawn on C3 and C4 so the editor moves the C4 end of the C3=C4 π bond, as the arrow says.
  d.grow('H3', 'H', 'C3', 330);
  d.grow('H4', 'H', 'C4', 270);
  d.atom('Br1', 'Br', 1.3, -2.2);
  d.grow('Br2', 'Br', 'Br1', 330);
  return {
    id: 'lesson-phenol-bromination',
    title: 'Brominating phenol',
    unit: 'Aromatic substitution',
    skill: 'aromatic-substitution',
    level: 2,
    summary: 'Phenol decolourises bromine water at room temperature, with no halogen carrier, and gives a white precipitate of 2,4,6-tribromophenol. A lone pair on the OH oxygen feeds electron density into the ring, so the ring is far more nucleophilic than benzene, above all at the carbons ortho and para to the OH. This lesson shows the first substitution, at the para carbon.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The ring attacks bromine',
        prompt: 'Show the oxygen’s lone pair pushing electrons round the ring so that the para carbon attacks bromine.',
        arrows: [
          { from: 'O', to: 'O-C1', says: 'A lone pair on oxygen moves in to make a C=O π bond.' },
          { from: 'C1-C2', to: 'C2-C3', says: 'The C=C π electrons next to it move along the ring.' },
          { from: 'C4-C3', to: 'C4-Br1', says: 'The next C=C π electrons, at the carbon para to the OH, make a bond to bromine.' },
          { from: 'Br1-Br2', to: 'Br2', says: 'The Br–Br bond breaks, and bromide leaves with both electrons.' },
        ],
        hints: ['The OH is the source of the electrons: start from a lone pair on oxygen.', 'Follow the electrons round the ring to the para carbon: four arrows in all.', 'The bromine molecule is polarised as it nears the electron-rich ring, so no catalyst is needed.'],
        explanation: 'The cation formed carries its positive charge on oxygen, in a form where every atom has an octet: that is why it forms so easily. The cation from benzene has no such form, so benzene needs a halogen carrier.',
        move: { H4: [0.5, -1.87], Br1: [-0.5, -1.87], Br2: [1.6, -2.6] },
      },
      {
        name: 'Bromide takes the proton',
        prompt: 'Show bromide taking the proton as the ring becomes aromatic again and the oxygen becomes neutral.',
        arrows: [
          { from: 'Br2', to: 'Br2-H4', says: 'A lone pair on bromide takes the proton on the carbon carrying the bromine.' },
          { from: 'C4-H4', to: 'C3-C4', says: 'The C–H electrons move into the ring.' },
          { from: 'C2-C3', to: 'C1-C2', says: 'The C=C π electrons move along…' },
          { from: 'C1-O', to: 'O', says: '…and the C=O π electrons go back onto oxygen.' },
        ],
        hints: ['Bromide takes the proton first; then the electrons run back round the ring and end on oxygen. Four arrows in all.'],
        explanation: '4-Bromophenol and hydrogen bromide. With bromine water the two ortho carbons react the same way, so the product is 2,4,6-tribromophenol. In a non-polar solvent, with one equivalent of bromine, 2- and 4-bromophenol form instead.',
        move: { H4: [2.4, -2.2], Br2: [3.4, -2.2], Br1: [0, -2] },
      },
    ],
    predict: { step: 0, prompt: 'Draw the cation that forms when the ring attacks bromine.', hints: ['The para carbon gains a bond to bromine; draw the form in which every atom has an octet.'] },
    expect: { bonds: ['C4-Br1', 'Br2-H4', 'C1-C2:2', 'C3-C4:2', 'C1-O:1'], absent: ['Br1-Br2', 'C4-H4'] },
    practise: { template: 'arenium-formation' },
  };
}

function friedelCraftsAlkylation(): LessonDef {
  const d = new Drawing();
  const ring = [90, 30, 330, 270, 210, 150].map((deg, i) => d.atom(`C${i + 1}`, 'C', Math.round(Math.cos((deg * Math.PI) / 180) * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * 100) / 100));
  ([2, 1, 2, 1, 2, 1] as const).forEach((order, i) => d.bond(ring[i], ring[(i + 1) % 6], order));
  d.grow('H1', 'H', 'C1', 90);
  d.grow('H2', 'H', 'C2', 30);
  // 2-Chloro-2-methylpropane upper left, its chlorine towards aluminium chloride above the ring.
  d.atom('Ct', 'C', -1.6, 2.6);
  d.grow('Ma', 'C', 'Ct', 150);
  d.grow('Mb', 'C', 'Ct', 210);
  d.grow('Mc', 'C', 'Ct', 270);
  d.grow('Cl', 'Cl', 'Ct', 30);
  d.atom('Al', 'Al', 1.2, 3.6);
  d.grow('Cla', 'Cl', 'Al', 90);
  d.grow('Clb', 'Cl', 'Al', 330);
  d.grow('Clc', 'Cl', 'Al', 30);
  return {
    id: 'lesson-friedel-crafts-alkylation',
    title: 'Friedel–Crafts alkylation',
    unit: 'Aromatic substitution',
    skill: 'aromatic-substitution',
    level: 2,
    summary: 'Benzene with 2-chloro-2-methylpropane and anhydrous aluminium chloride gives (1,1-dimethylethyl)benzene, tert-butylbenzene. Aluminium chloride takes chloride from the halogenoalkane, leaving a carbocation that the ring attacks; AlCl4− then takes the proton that is lost, giving back AlCl3.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Aluminium chloride takes the chloride',
        prompt: 'Show the C–Cl bond’s electrons moving to make a bond from chlorine to aluminium.',
        arrows: [{ from: 'Ct-Cl', to: 'Cl-Al', says: 'The C–Cl bond breaks as chlorine bonds to aluminium: AlCl3 becomes AlCl4−, and the carbon is left as a carbocation.' }],
        hints: ['AlCl3 is a Lewis acid: aluminium has only six outer electrons.', 'One arrow, from the C–Cl bond to a new Cl–Al bond.'],
        explanation: 'A tertiary carbocation and AlCl4−. A tertiary halogenoalkane gives a carbocation, held beside AlCl4− as an ion pair; with a primary one, such as chloromethane, the electrophile is the RCl–AlCl3 complex, and A-level courses write it as CH3+.',
        move: { Ct: [-1.6, 2.6], Ma: [-2.47, 3.1], Mb: [-1.6, 1.6], Mc: [-0.73, 3.1], Al: [2.8, 3.0], Cl: [2.09, 3.71], Cla: [3.51, 3.71], Clb: [2.09, 2.29], Clc: [3.51, 2.29] },
      },
      {
        name: 'Benzene attacks the carbocation',
        prompt: 'Show the ring’s π electrons attacking the positive carbon.',
        arrows: [{ from: 'C1-C2', to: 'C1-Ct', says: 'Two of the ring’s π electrons make a bond to the positive carbon.' }],
        hints: ['Benzene is the nucleophile: start the arrow from a C=C of the ring.', 'The carbocation has an empty orbital, so nothing else needs to move.'],
        explanation: 'The arenium ion: the positive charge is shared over three ring carbons, and the ring is no longer aromatic.',
        move: { H1: [0.5, 1.87], Ct: [-0.5, 1.87], Ma: [-0.5, 2.87], Mb: [-1.37, 1.37], Mc: [-1.37, 2.37] },
      },
      {
        name: 'AlCl4− takes the proton',
        prompt: 'Show AlCl4− taking the proton as the ring becomes aromatic again.',
        arrows: [
          { from: 'Al-Clb', to: 'Clb-H1', says: 'The electrons of an Al–Cl bond make a bond from that chlorine to the proton, giving back AlCl3.' },
          { from: 'C1-H1', to: 'C1-C2', side: -1, says: 'The C–H electrons move back into the ring, so it is aromatic again.' },
        ],
        hints: ['Two arrows: from an Al–Cl bond to the proton, and from the C–H bond into the ring.', 'The same last step as nitration and acylation.'],
        explanation: 'tert-Butylbenzene, hydrogen chloride and AlCl3 again: here AlCl3 really is a catalyst, because the product has no C=O to hold on to it. Two problems limit alkylation. The alkyl group makes the ring more reactive, so a second and third alkylation follow unless benzene is in large excess. And a carbocation can rearrange first: 1-chloropropane gives mainly (1-methylethyl)benzene, not propylbenzene. Acylation, then reduction of the C=O, avoids both.',
        move: { H1: [2.2, -0.6], Clb: [3.2, -0.6], Ct: [0, 2], Ma: [0, 3], Mb: [-0.87, 2.5], Mc: [0.87, 2.5] },
      },
    ],
    predict: { step: 1, prompt: 'Draw the cation that forms when the ring attacks the carbocation.', hints: ['The ring carbon that is attacked gains a bond to the tertiary carbon; which ring carbon is left positive?'] },
    expect: { bonds: ['C1-Ct', 'C1-C2:2', 'Clb-H1', 'Cl-Al'], absent: ['Ct-Cl', 'C1-H1', 'Al-Clb'] },
    practise: { template: 'arenium-formation' },
  };
}

function azoCoupling(): LessonDef {
  const d = new Drawing();
  const at = (x: number, y: number, deg: number, len = 1): [number, number] => [Math.round((x + len * Math.cos((deg * Math.PI) / 180)) * 100) / 100, Math.round((y + len * Math.sin((deg * Math.PI) / 180)) * 100) / 100];
  const ring = [90, 30, 330, 270, 210, 150].map((deg, i) => d.atom(`C${i + 1}`, 'C', ...at(0, 0, deg)));
  ([2, 1, 2, 1, 2, 1] as const).forEach((order, i) => d.bond(ring[i], ring[(i + 1) % 6], order));
  d.grow('O', 'O', 'C1', 90, 1, { charge: -1 });
  // Hydrogens drawn on C3 and C4 so the editor moves the C4 end of the C3=C4 π bond, as in brominating phenol.
  d.grow('H3', 'H', 'C3', 330);
  d.grow('H4', 'H', 'C4', 270);
  // Benzenediazonium, linear, at the lower right with its end nitrogen towards C4. After the attack it is redrawn as a
  // trans azo zigzag: C4–Na down and right, Na=Nb across, Nb–phenyl down and right again.
  const phenyl = (cx: number, cy: number, first: number) => [0, 1, 2, 3, 4, 5].map((i) => at(cx, cy, first - 60 * i));
  const before = { Na: [1.3, -2.2] as [number, number] };
  const nb0 = at(...before.Na, 330);
  const p0 = phenyl(...at(...before.Na, 330, 3), 150);
  d.atom('Na', 'N', ...before.Na);
  d.atom('Nb', 'N', ...nb0, { charge: 1 });
  d.bond('Na', 'Nb', 3);
  p0.forEach((xy, i) => d.atom(`P${i + 1}`, 'C', ...xy));
  d.bond('Nb', 'P1');
  ([2, 1, 2, 1, 2, 1] as const).forEach((order, i) => d.bond(`P${i + 1}`, `P${((i + 1) % 6) + 1}`, order));
  d.atom('Oh', 'O', -1.8, -2.4, { charge: -1 });
  const na1 = at(0, -1, 300);
  const nb1 = at(...na1, 0);
  const p1 = phenyl(...at(...nb1, 300, 2), 120);
  return {
    id: 'lesson-azo-coupling',
    title: 'Azo coupling',
    unit: 'Aromatic substitution',
    skill: 'aromatic-substitution',
    level: 2,
    summary: 'Benzenediazonium chloride, added to phenol in cold sodium hydroxide solution, gives a yellow-orange azo dye: in the alkali it forms as the anion of 4-(phenylazo)phenol, and acid then gives the phenol. In the alkali phenol is present as the phenoxide ion, whose ring is very electron-rich. The diazonium ion is only a weak electrophile, so it reacts with rings like this one, or aromatic amines, but not with benzene; its end nitrogen is attacked by the carbon para to the oxygen.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'The ring attacks the diazonium ion',
        prompt: 'Show the O− lone pair pushing electrons round the ring so that the para carbon attacks the end nitrogen.',
        arrows: [
          { from: 'O', to: 'O-C1', says: 'A lone pair on the O− moves in to make a C=O π bond.' },
          { from: 'C1-C2', to: 'C2-C3', says: 'The π electrons of the ring C=C at the carbon bearing the oxygen move one bond along the ring.' },
          { from: 'C4-C3', to: 'C4-Na', says: 'The next C=C π electrons, at the carbon para to the oxygen, make a bond to the end nitrogen.' },
          { from: 'Na-Nb', to: 'Nb', says: 'One of the N≡N π bonds moves onto the positive nitrogen, which becomes neutral.' },
        ],
        hints: ['The electrons start from the negative oxygen.', 'Follow them round the ring to the para carbon, then on to the nitrogen that is not joined to a ring. Four arrows in all.'],
        explanation: 'A neutral intermediate: the oxygen is now a C=O, and the N≡N has become an N=N. Coupling is done in alkali because the phenoxide ion is a far better nucleophile than phenol itself. The carbon para to the oxygen is attacked unless that position is already taken.',
        move: { H4: [-0.5, -1.87], Na: na1, Nb: nb1, ...Object.fromEntries(p1.map((xy, i) => [`P${i + 1}`, xy])) },
      },
      {
        name: 'Hydroxide takes the proton',
        prompt: 'Show hydroxide taking the proton as the ring becomes aromatic again and the oxygen becomes O− once more.',
        arrows: [
          { from: 'Oh', to: 'Oh-H4', says: 'A lone pair on hydroxide takes the proton on the carbon carrying the nitrogen.' },
          { from: 'C4-H4', to: 'C4-C5', says: 'The C–H electrons move into the ring.' },
          { from: 'C6-C5', to: 'C6-C1', says: 'The C=C π electrons move along…' },
          { from: 'C1-O', to: 'O', says: '…and the C=O π electrons go back onto oxygen.' },
        ],
        hints: ['Hydroxide takes the proton first; then the electrons run round the ring and end on oxygen. Four arrows in all.'],
        explanation: 'The phenoxide ion of 4-(phenylazo)phenol, and water; acid turns it into the phenol. The N=N links the two rings into one long delocalised system, which absorbs blue light, so the compound looks yellow-orange: this is why azo compounds are used as dyes. The diazonium salt is made from phenylamine with nitrous acid (sodium nitrite and hydrochloric acid) below 10 °C and used at once while cold, because when warmed it decomposes, giving phenol and nitrogen.',
        move: { H4: [-1.4, -2.85], Oh: [-2.4, -2.85] },
      },
    ],
    predict: { step: 0, prompt: 'Draw the intermediate that forms when the ring attacks the diazonium ion.', hints: ['The para carbon gains a bond to the end nitrogen, and the two nitrogens are now joined by a double bond.'] },
    expect: { bonds: ['C4-Na', 'Na-Nb:2', 'Oh-H4', 'C4-C5:2', 'C6-C1:2', 'C1-O:1'], absent: ['C4-H4'], charges: { O: -1 } },
    practise: { template: 'arenium-formation' },
  };
}

function epoxidation(): LessonDef {
  const d = new Drawing();
  // Propene along the bottom; peroxyethanoic acid above it, curled round so its O–H points at its own C=O oxygen
  // (the intramolecular hydrogen bond), with the outer oxygen Ot over the middle of the C=C.
  d.atom('Cb', 'C', -0.5, 0);
  d.atom('Ca', 'C', 0.5, 0);
  d.bond('Cb', 'Ca', 2);
  d.grow('M', 'C', 'Ca', 330);
  d.atom('Ot', 'O', 0, 1.6);
  d.grow('Op', 'O', 'Ot', 0);
  d.grow('Cc', 'C', 'Op', 72);
  d.grow('Oc', 'O', 'Cc', 144, 2);
  d.grow('Cm', 'C', 'Cc', 0);
  d.grow('Ht', 'H', 'Ot', 108);
  return {
    id: 'lesson-epoxidation',
    title: 'Epoxidation with a peroxyacid',
    unit: 'Addition to alkenes',
    skill: 'alkene-addition',
    level: 3,
    summary: 'Propene and a peroxyacid, such as mCPBA (drawn here as the simpler peroxyethanoic acid), give 2-methyloxirane, an epoxide, and a carboxylic acid. It all happens in one concerted step: the alkene takes the outer oxygen of the weak O–O bond, and the proton passes to the acid’s C=O oxygen.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'One step, five arrows',
        prompt: 'Show the alkene taking the OH oxygen of the peroxyacid (the outer oxygen) as the O–O bond breaks and the proton moves across.',
        arrows: [
          { from: 'Ca-Cb', to: 'Cb-Ot', says: 'The C=C π electrons attack the outer oxygen, making a C–O bond.' },
          { from: 'Ot', to: 'Ot-Ca', says: 'At the same time a lone pair on that oxygen bonds to the other alkene carbon, closing the three-membered ring.' },
          { from: 'Op-Ot', to: 'Op-Cc', says: 'The weak O–O bond breaks, and its electrons make a new C=O π bond.' },
          { from: 'Cc-Oc', to: 'Oc-Ht', says: 'The old C=O π electrons move onto its oxygen, which takes the proton.' },
          { from: 'Ht-Ot', to: 'Ot', says: 'The O–H bond’s electrons stay on the outer oxygen, in place of the lone pair it used.' },
        ],
        hints: ['The alkene is the nucleophile. The electrophile is the oxygen of the peroxyacid’s O–H group, the outer oxygen, on the weak O–O bond.', 'Five arrows: the C=C and a lone pair on the outer oxygen make the two C–O bonds, the O–O bond becomes a C=O, the old C=O takes the proton, and the O–H electrons return to the outer oxygen.'],
        explanation: '2-Methyloxirane and ethanoic acid. Both C–O bonds form on the same face of the alkene at once, so the reaction is stereospecific: (Z)-but-2-ene gives only the cis epoxide, and (E)-but-2-ene only the trans one. The alkene is the nucleophile, so alkenes with more alkyl groups on the C=C react faster. The three-membered ring is strained and opens easily, with acid or with a strong nucleophile: see the two epoxide-opening lessons.',
        move: { Ot: [0, 0.87], Op: [1.6, 2.1], Cc: [1.91, 3.05], Oc: [1.1, 3.64], Cm: [2.91, 3.05], Ht: [0.1, 3.64] },
      },
    ],
    predict: { prompt: 'Draw the products when propene reacts with a peroxyacid.', hints: ['Both alkene carbons end up bonded to the same oxygen, in a three-membered ring.', 'What is left of the peroxyacid?'] },
    expect: { bonds: ['Ca-Ot', 'Cb-Ot', 'Ca-Cb:1', 'Op-Cc:2', 'Cc-Oc:1', 'Oc-Ht'], absent: ['Op-Ot', 'Ht-Ot'] },
  };
}

export const CORE_ACYL: LessonDef[] = [acylChlorideAmine(), anhydrideAlcohol()];
export const CORE_SUBSTITUTION: LessonDef[] = [ammoniaHalogenoalkane(), hydrideShift()];
export const CORE_ALKENES: LessonDef[] = [hydration(), dieneHbr(), epoxidation()];
export const CORE_AROMATIC: LessonDef[] = [aromaticChlorination(), friedelCraftsAlkylation(), friedelCraftsAcylation(), phenolBromination(), azoCoupling()];
export const CORE_CARBONYL: LessonDef[] = [cannizzaro()];
export const CORE_RADICALS: LessonDef[] = [radicalHbrAddition()];
