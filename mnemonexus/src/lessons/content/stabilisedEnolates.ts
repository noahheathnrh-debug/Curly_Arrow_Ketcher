import { Drawing, type LessonDef } from '../kit';

/**
 * Two second-year enolate reactions that build C–C bonds: alkylating a lithium enolate made with LDA (an SN2 step with
 * carbon as the nucleophile), and the Michael reaction, a stabilised enolate adding to the far end of a C=C joined to
 * a C=O. Layouts follow "The aldol reaction": the base below the α-carbon, the electrophile to the right.
 */

function enolateAlkylation(): LessonDef {
  const d = new Drawing();
  d.atom('Ck', 'C', 0, 0);
  d.grow('O', 'O', 'Ck', 90, 2);
  d.grow('Mk', 'C', 'Ck', 210);
  d.grow('Ca', 'C', 'Ck', 330);
  d.grow('Ha', 'H', 'Ca', 270);
  // LDA below the α-carbon: a nitrogen anion between two isopropyl groups.
  d.atom('N', 'N', 0.87, -2.9, { charge: -1 });
  d.grow('Ci1', 'C', 'N', 210);
  d.grow('Ci1a', 'C', 'Ci1', 150);
  d.grow('Ci1b', 'C', 'Ci1', 270);
  d.grow('Ci2', 'C', 'N', 330);
  d.grow('Ci2a', 'C', 'Ci2', 30);
  d.grow('Ci2b', 'C', 'Ci2', 270);
  // Iodomethane to the right, its iodine pointing away from the α-carbon.
  d.atom('Cm', 'C', 2.6, 0.6);
  d.grow('I', 'I', 'Cm', 30);
  return {
    id: 'lesson-enolate-alkylation',
    title: 'Alkylating an enolate',
    unit: 'Enolates',
    skill: 'substitution',
    level: 3,
    summary: 'Propanone with LDA (lithium diisopropylamide) at −78 °C, then iodomethane, gives butan-2-one. LDA is a very strong, bulky base: it turns all of the ketone into its enolate at once, and it is too crowded to add to the C=O. The enolate then attacks iodomethane in an SN2 step, making a new C–C bond.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'LDA makes the enolate',
        prompt: 'Show the nitrogen of LDA taking a proton from the α-carbon.',
        arrows: [
          { from: 'N', to: 'N-Ha', says: 'The negative nitrogen of LDA takes a proton from the α-carbon, the carbon next to the C=O.' },
          { from: 'Ca-Ha', to: 'Ca-Ck', says: 'The C–H electrons move in to make a C=C π bond.' },
          { from: 'Ck-O', to: 'O', says: 'The C=O π electrons move onto oxygen, which carries the negative charge.' },
        ],
        hints: ['Three arrows: base to hydrogen, C–H into C=C, C=O onto oxygen.', 'LDA is too crowded to reach the carbonyl carbon, so it acts only as a base.'],
        explanation: 'The enolate and diisopropylamine. The amine’s N–H has a pKa of about 36 and propanone’s α-hydrogen about 20, so the equilibrium lies almost completely on the enolate side: practically no ketone is left for the enolate to attack in an aldol reaction. The lithium ion, not drawn, sits on the enolate oxygen.',
        move: { Ha: [0.87, -1.9] },
      },
      {
        name: 'The enolate attacks iodomethane',
        prompt: 'Show the enolate’s α-carbon attacking iodomethane as iodide leaves.',
        arrows: [
          { from: 'O', to: 'O-Ck', pair: 2, says: 'A lone pair on the oxygen moves back in to re-form the C=O.' },
          { from: 'Ca-Ck', to: 'Ca-Cm', says: 'The C=C π electrons attack the carbon of iodomethane from the side opposite the iodine.' },
          { from: 'Cm-I', to: 'I', says: 'The C–I bond breaks, and iodide leaves with both electrons.' },
        ],
        hints: ['An SN2 step with the enolate as the nucleophile: it reacts through carbon.', 'Three arrows: the O− pushes, the C=C attacks, iodide leaves.'],
        explanation: 'Butan-2-one and iodide: a new C–C bond at the α-carbon. Methyl and primary halogenoalkanes work best; secondary ones give a poor yield, and with tertiary ones the enolate acts as a base instead and gives elimination. An unsymmetrical ketone has two α-carbons: LDA at −78 °C takes a proton from the less substituted one, where it is removed faster (the kinetic enolate).',
        move: { Cm: [1.73, 0], I: [3.2, 1.2] },
      },
    ],
    predict: { step: 1, prompt: 'Draw the ketone formed when the enolate attacks iodomethane.', hints: ['The new C–C bond is to the α-carbon, and the C=O comes back.'] },
    expect: { bonds: ['Ca-Cm', 'Ck-O:2', 'N-Ha'], absent: ['Ca-Ha', 'Cm-I'], charges: { I: -1 } },
    practise: { template: 'enolate-formation' },
  };
}

function michael(): LessonDef {
  const d = new Drawing();
  // Pentane-2,4-dione across the top, its acidic hydrogen pointing down.
  d.atom('C3', 'C', 0, 0);
  d.grow('C2', 'C', 'C3', 150);
  d.grow('O2', 'O', 'C2', 90, 2);
  d.grow('M1', 'C', 'C2', 210);
  d.grow('C4', 'C', 'C3', 30);
  d.grow('O4', 'O', 'C4', 90, 2);
  d.grow('M5', 'C', 'C4', 330);
  d.grow('H3', 'H', 'C3', 270);
  // Ethoxide lower left; but-3-en-2-one lower right, its CH2 end nearest the dione.
  d.atom('Oe', 'O', -1.3, -1.9, { charge: -1 });
  d.grow('Ce', 'C', 'Oe', 180);
  d.grow('Cme', 'C', 'Ce', 240);
  d.atom('Cb', 'C', 1.4, -1.4);
  d.grow('Ca', 'C', 'Cb', 270, 2);
  d.grow('Ck', 'C', 'Ca', 330);
  d.grow('Ok', 'O', 'Ck', 30, 2);
  d.grow('Mk', 'C', 'Ck', 270);
  return {
    id: 'lesson-michael',
    title: 'The Michael reaction',
    unit: 'Conjugate addition',
    skill: 'conjugate-addition',
    level: 3,
    summary: 'Pentane-2,4-dione and but-3-en-2-one, with a little ethoxide, join to give 3-(3-oxobutyl)pentane-2,4-dione. The enolate of the dione, a stabilised carbon nucleophile, adds to the far end of the C=C joined to the ketone’s C=O (conjugate, or 1,4-, addition), making a new C–C bond.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Ethoxide makes the enolate',
        prompt: 'Show ethoxide taking the proton from the carbon between the two C=O groups.',
        arrows: [
          { from: 'Oe', to: 'Oe-H3', says: 'Ethoxide takes a proton from the carbon between the two C=O groups.' },
          { from: 'C3-H3', to: 'C3-C2', side: -1, says: 'The C–H electrons move in to make a C=C π bond.' },
          { from: 'C2-O2', to: 'O2', says: 'The C=O π electrons move onto oxygen.' },
        ],
        hints: ['The CH2 between two C=O groups is unusually acidic: the anion left behind is shared over both oxygens.', 'Three arrows: base to hydrogen, C–H into C=C, C=O onto oxygen.'],
        explanation: 'The enolate and ethanol. Its charge is shared by both oxygens and the central carbon, so even a modest base removes the proton (pKa about 9, against about 16 for ethanol): a stabilised enolate.',
        move: { Oe: [-1.6, -2.4], Ce: [-2.6, -2.4], Cme: [-3.1, -3.27], H3: [-0.75, -1.9] },
      },
      {
        name: 'Conjugate addition',
        prompt: 'Show the enolate’s central carbon adding to the CH2 end of the C=C of but-3-en-2-one.',
        arrows: [
          { from: 'O2', to: 'O2-C2', pair: 2, says: 'A lone pair on the enolate oxygen moves back in to re-form the C=O.' },
          { from: 'C2-C3', to: 'C3-Cb', says: 'The enolate’s C=C π electrons attack the end carbon of the other molecule’s C=C.' },
          { from: 'Cb-Ca', to: 'Ca-Ck', says: 'That C=C π bond moves along to make a C=C next to the C=O…' },
          { from: 'Ck-Ok', to: 'Ok', says: '…and the C=O π electrons move onto oxygen: an enolate again.' },
        ],
        hints: ['The far end of a C=C joined to a C=O is electron-poor: the C=O draws electrons from it by resonance.', 'Four arrows: push from the enolate oxygen, attack, then pass the electrons along to the other oxygen.'],
        explanation: 'A new C–C bond and a new enolate. Stabilised enolates choose the far carbon because adding to the C=O is easily reversed, while adding at the far carbon trades a weak C=C π bond for a strong C–C σ bond and keeps the C=O, so it gives the more stable product. Thiols and organocuprates behave the same way.',
        move: { Cb: [0, -1], Ca: [0.87, -1.5], Ck: [0.87, -2.5], Ok: [1.73, -3.0], Mk: [0, -3.0] },
      },
      {
        name: 'Ethanol protonates the enolate',
        prompt: 'Show the new enolate taking a proton from ethanol at its α-carbon.',
        arrows: [
          { from: 'Ok', to: 'Ok-Ck', pair: 2, says: 'A lone pair on the oxygen moves back in to re-form the C=O.' },
          { from: 'Ca-Ck', to: 'Ca-H3', says: 'The C=C π electrons take a proton from ethanol.' },
          { from: 'H3-Oe', to: 'Oe', says: 'The O–H electrons stay on oxygen: ethoxide is given back.' },
        ],
        hints: ['A proton transfer through the enolate: three arrows.', 'Ethoxide comes back, so only a catalytic amount is needed.'],
        explanation: 'The Michael adduct, a 1,5-dicarbonyl compound, and ethoxide again. Heated with base, a 1,5-dicarbonyl like this can go on to an intramolecular aldol reaction that closes a six-membered ring; Michael addition followed by that ring closure is the Robinson annulation.',
        move: { H3: [1.73, -1.0] },
      },
    ],
    predict: { step: 1, prompt: 'Draw what forms when the enolate adds to but-3-en-2-one.', hints: ['The new C–C bond joins the central carbon of the dione to the CH2 end of the C=C.'] },
    expect: { bonds: ['C3-Cb', 'Ca-H3', 'Ck-Ok:2', 'C2-O2:2', 'C2-C3:1'], absent: ['Oe-H3'], charges: { Oe: -1 } },
    practise: { template: 'conjugate-addition' },
  };
}

export const ENOLATE_ALKYLATION: LessonDef[] = [enolateAlkylation()];
export const MICHAEL: LessonDef[] = [michael()];
