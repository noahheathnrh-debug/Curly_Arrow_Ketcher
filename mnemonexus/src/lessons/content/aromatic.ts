import { Drawing, type LessonDef } from '../kit';

/**
 * Electrophilic aromatic substitution, from the standard first-year account: the nitration of benzene. The ring is
 * drawn with H on C1 and C2: the editor moves the end of a π bond with fewer drawn bonds, so the attacked carbon's π
 * partner shows its hydrogen too.
 */

function nitration(): LessonDef {
  const d = new Drawing();
  const ring = [90, 30, 330, 270, 210, 150].map((deg, i) => d.atom(`C${i + 1}`, 'C', Math.round(Math.cos((deg * Math.PI) / 180) * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * 100) / 100));
  ([2, 1, 2, 1, 2, 1] as const).forEach((order, i) => d.bond(ring[i], ring[(i + 1) % 6], order));
  d.grow('H1', 'H', 'C1', 90);
  d.grow('H2', 'H', 'C2', 30);
  // The nitronium ion, O=N+=O, upper left; water upper right, for step 2.
  d.atom('N', 'N', -1.3, 2.3, { charge: 1 });
  d.grow('Oa', 'O', 'N', 60, 2);
  d.grow('Ob', 'O', 'N', 240, 2);
  d.atom('Ow', 'O', 1.5, 2.6);
  return {
    id: 'lesson-nitration',
    title: 'Nitrating benzene',
    unit: 'Aromatic substitution',
    skill: 'aromatic-substitution',
    level: 2,
    summary: 'Concentrated nitric and sulfuric acids make the nitronium ion, NO2+. Benzene’s π electrons attack it, giving a cation that is no longer aromatic, and loss of a proton makes the ring aromatic again: an electrophilic aromatic substitution.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Benzene attacks the nitronium ion',
        prompt: 'Show the ring’s π electrons attacking the nitrogen of the nitronium ion.',
        arrows: [
          { from: 'C1-C2', to: 'C1-N', says: 'Two of the ring’s π electrons attack the nitrogen of the nitronium ion.' },
          { from: 'N-Oa', to: 'Oa', says: 'One N=O π bond moves onto oxygen, so nitrogen keeps an octet.' },
        ],
        hints: ['Benzene is the nucleophile: start the arrow from a C=C of the ring.', 'Nitrogen cannot take a fifth bond: an N=O π bond moves onto oxygen.'],
        explanation: 'The arenium ion (Wheland intermediate). The positive charge is shared by resonance over three ring carbons, but the ring is no longer aromatic, so this step is slow: it sets the rate.',
        move: { H1: [0.5, 1.87], N: [-0.5, 1.87], Oa: [0, 2.74], Ob: [-1.5, 1.87] },
      },
      {
        name: 'Water takes the proton',
        prompt: 'Show water taking the proton from the carbon that carries the nitro group.',
        arrows: [
          { from: 'Ow', to: 'Ow-H1', says: 'A water molecule (or hydrogensulfate) takes the proton on the carbon that carries the nitro group.' },
          { from: 'C1-H1', to: 'C1-C2', side: -1, says: 'The C–H electrons move back into the ring, next to the positive carbon, so the ring is aromatic again.' },
        ],
        hints: ['The ring regains its aromaticity by losing H+, not by adding a nucleophile.', 'Two arrows: base to hydrogen, C–H into the ring.'],
        explanation: 'Nitrobenzene. Losing a proton restores the six π electrons of the aromatic ring, which is why benzene does substitution where an alkene would do addition.',
        move: { H1: [1.0, 2.3] },
      },
    ],
    predict: { step: 0, prompt: 'Draw the cation that forms when benzene attacks the nitronium ion.', hints: ['C1 gains a bond to nitrogen; which ring carbon is left positive?'] },
    expect: { bonds: ['C1-N', 'C1-C2:2', 'Ow-H1', 'N-Oa:1', 'N-Ob:2'], absent: ['C1-H1'], charges: { N: 1, Oa: -1, Ow: 1 } },
    practise: { template: 'arenium-formation' },
  };
}

function snar(): LessonDef {
  const d = new Drawing();
  const ring = [90, 30, 330, 270, 210, 150].map((deg, i) => d.atom(`C${i + 1}`, 'C', Math.round(Math.cos((deg * Math.PI) / 180) * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * 100) / 100));
  ([2, 1, 2, 1, 2, 1] as const).forEach((order, i) => d.bond(ring[i], ring[(i + 1) % 6], order));
  d.grow('F', 'F', 'C1', 90);
  // The nitro group para to fluorine, drawn N+(=Ob)–Oa−.
  d.grow('N', 'N', 'C4', 270, 1, { charge: 1 });
  d.grow('Oa', 'O', 'N', 210, 1, { charge: -1 });
  d.grow('Ob', 'O', 'N', 330, 2);
  d.atom('Om', 'O', -1.3, 2.3, { charge: -1 });
  d.grow('Me', 'C', 'Om', 150);
  return {
    id: 'lesson-snar',
    title: 'Nucleophilic aromatic substitution',
    unit: 'Aromatic substitution',
    skill: 'aromatic-substitution',
    level: 3,
    summary: 'Methoxide replaces fluorine on 1-fluoro-4-nitrobenzene. A nitro group ortho or para to the leaving group makes the ring electron-poor enough for a strong nucleophile to add, giving an anion (the Meisenheimer complex) whose charge spreads onto the nitro group; the leaving group then goes.',
    atoms: d.atoms, bonds: d.bonds,
    steps: [
      {
        name: 'Methoxide adds',
        prompt: 'Show methoxide adding to the carbon that carries fluorine, and the negative charge moving onto the nitro group.',
        arrows: [
          { from: 'Om', to: 'Om-C1', says: 'Methoxide attacks the carbon that carries fluorine: an electron-poor carbon, para to the nitro group and carrying the electronegative fluorine.' },
          { from: 'C1-C2', to: 'C2-C3', says: 'The ring’s C1=C2 π electrons move along to C2–C3.' },
          { from: 'C3-C4', to: 'C4-N', says: 'The C3=C4 π electrons move on, onto the C–N bond.' },
          { from: 'N-Ob', to: 'Ob', says: 'An N=O π bond moves onto oxygen, so the negative charge ends on the nitro group.' },
        ],
        hints: ['The nucleophile attacks the carbon with the leaving group; C1 cannot take a fifth bond there, so π electrons move along the ring.', 'Follow the electrons round the ring to the nitro group: four arrows.'],
        explanation: 'The Meisenheimer complex. The ring is no longer aromatic, but the negative charge is spread over the ring and onto the oxygens of the nitro group. This is why a nitro group ortho or para to the leaving group activates the ring far more than one meta to it: from the meta position it cannot take the charge by resonance, so only its inductive pull helps.',
        move: { F: [0.5, 1.87], Om: [-0.5, 1.87], Me: [-1.37, 2.37] },
      },
      {
        name: 'Fluoride leaves',
        prompt: 'Show the electrons moving back round the ring and fluoride leaving.',
        arrows: [
          { from: 'Ob', to: 'Ob-N', pair: 2, says: 'A lone pair on the nitro oxygen moves back to re-form the N=O.' },
          { from: 'N-C4', to: 'C4-C3', says: 'The C=N π electrons move back into the ring.' },
          { from: 'C3-C2', to: 'C2-C1', says: 'And on round the ring to C1.' },
          { from: 'C1-F', to: 'F', says: 'The C–F bond breaks, and fluoride leaves.' },
        ],
        hints: ['The same path as step 1, in reverse, ending with a bond to C1 breaking.', 'Which group on C1 leaves: methoxide or fluoride?'],
        explanation: '1-Methoxy-4-nitrobenzene and fluoride, with the ring aromatic again. Fluorine is the best halogen for SNAr (F > Cl ≈ Br > I, the opposite order to SN2), although fluoride is a poor leaving group. The slow step is the addition, and the electronegative fluorine makes C1 more electron-poor and stabilises the anion; the strong C–F bond only breaks in the fast second step.',
        move: { F: [1.2, 2.6] },
      },
    ],
    predict: { step: 0, prompt: 'Draw the anion that forms when methoxide adds.', hints: ['C1 gains a bond to oxygen; follow the π electrons to the nitro group.'] },
    expect: { bonds: ['Om-C1', 'C1-C2:2', 'C3-C4:2', 'N-Ob:2', 'C5-C6:2'], absent: ['C1-F'], charges: { N: 1, Oa: -1, F: -1 } },
  };
}

export const AROMATIC: readonly LessonDef[] = [nitration(), snar()];
