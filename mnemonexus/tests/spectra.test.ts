import { describe, expect, test } from 'bun:test';
import { moleculeFromKet } from '../src/isomers/cip';
import { isomerKet, LAYOUTS } from '../src/isomers/layouts';
import { carbonPeaks, classes, formulaOfGraph, halogenPattern, irBands, massSpectrum, nominalMass, protonPeaks, splittingName } from '../src/spectra/predict';
import { SPECTRA_MOLECULES } from '../src/spectra/species';
import { fingerprint, spectraDifference, spectraSets, sameSpectra } from '../src/spectra/questions';
import { editorStructFromKet, readEditorStruct } from '../src/engine/drawn';
import { graphOfStructure } from '../src/spectra/predict';

const graph = (smiles: string) => moleculeFromKet(isomerKet(smiles));
const byName = (name: string) => {
  const m = SPECTRA_MOLECULES.find((x) => x.name === name);
  if (!m) throw new Error(`No molecule ${name}`);
  return graph(m.smiles);
};

/**
 * The app's hand-checked spectra (learning_interactives/spectra/model.ts, ORGANICS): ¹H environments as
 * [hydrogens, n in n + 1, shift], ¹³C shifts, and the IR class. The add-on predicts these from the structure.
 */
const HAND: ReadonlyArray<{ name: string; h?: [number, number, number][]; c?: number[]; ir?: string }> = [
  { name: 'methanol', h: [[3, 0, 3.4], [1, 0, 1.6]], c: [50], ir: 'alcohol' },
  { name: 'ethanol', h: [[3, 2, 1.2], [2, 3, 3.7], [1, 0, 2.6]], c: [18, 58], ir: 'alcohol' },
  { name: 'propan-1-ol', h: [[3, 2, 0.9], [2, 5, 1.6], [2, 2, 3.6], [1, 0, 2.3]], c: [10, 26, 64], ir: 'alcohol' },
  { name: 'propan-2-ol', h: [[6, 1, 1.2], [1, 6, 4.0], [1, 0, 2.2]], c: [25, 64], ir: 'alcohol' },
  { name: '2-methylpropan-2-ol', h: [[9, 0, 1.3], [1, 0, 1.9]], c: [31, 69], ir: 'alcohol' },
  { name: 'methoxymethane', h: [[6, 0, 3.3]], c: [60] },
  { name: 'ethanal', h: [[3, 1, 2.2], [1, 3, 9.8]], c: [31, 200], ir: 'carbonyl' },
  { name: 'propanal', h: [[3, 2, 1.1], [2, 4, 2.5], [1, 2, 9.8]], c: [6, 37, 203], ir: 'carbonyl' },
  { name: 'propanone', h: [[6, 0, 2.2]], c: [30, 206], ir: 'carbonyl' },
  { name: 'butanone', h: [[3, 0, 2.1], [2, 3, 2.4], [3, 2, 1.1]], c: [8, 29, 37, 209], ir: 'carbonyl' },
  { name: 'pentan-3-one', h: [[6, 2, 1.1], [4, 3, 2.4]], c: [8, 35, 211], ir: 'carbonyl' },
  { name: 'ethanoic acid', h: [[3, 0, 2.1], [1, 0, 11.5]], c: [21, 178], ir: 'acid' },
  { name: 'propanoic acid', h: [[3, 2, 1.2], [2, 3, 2.4], [1, 0, 11.7]], c: [9, 27, 181], ir: 'acid' },
  { name: 'methyl ethanoate', h: [[3, 0, 2.0], [3, 0, 3.7]], c: [21, 52, 171], ir: 'ester' },
  { name: 'ethyl ethanoate', h: [[3, 0, 2.0], [2, 3, 4.1], [3, 2, 1.3]], c: [14, 21, 60, 171], ir: 'ester' },
  { name: 'methyl propanoate', h: [[3, 2, 1.1], [2, 3, 2.3], [3, 0, 3.7]], c: [9, 27, 51, 175], ir: 'ester' },
  { name: 'chloromethane', h: [[3, 0, 3.1]], c: [26] },
  { name: 'chloroethane', h: [[3, 2, 1.5], [2, 3, 3.6]], c: [19, 40] },
  { name: '1-chloropropane', h: [[3, 2, 1.0], [2, 5, 1.8], [2, 2, 3.5]], c: [11, 26, 47] },
  { name: '2-chloropropane', h: [[6, 1, 1.5], [1, 6, 4.1]], c: [27, 54] },
  { name: 'bromoethane', h: [[3, 2, 1.7], [2, 3, 3.4]], c: [20, 28] },
  { name: '1-bromopropane', h: [[3, 2, 1.0], [2, 5, 1.9], [2, 2, 3.4]], c: [13, 26, 36] },
  { name: '2-bromopropane', h: [[6, 1, 1.7], [1, 6, 4.3]], c: [29, 45] },
  { name: '1,2-dichloroethane', h: [[4, 0, 3.7]], c: [44] },
  { name: 'ethylamine', h: [[3, 2, 1.1], [2, 3, 2.7], [2, 0, 1.5]], c: [19, 37], ir: 'amine' },
  { name: 'propylamine', ir: 'amine' },
  { name: 'ethanenitrile', h: [[3, 0, 2.0]], c: [2, 117], ir: 'nitrile' },
  { name: 'propanenitrile', h: [[3, 2, 1.3], [2, 3, 2.4]], ir: 'nitrile' },
  { name: 'ethene', h: [[4, 0, 5.3]], c: [123], ir: 'alkene' },
  { name: 'propene', ir: 'alkene' },
  { name: 'but-2-ene', h: [[6, 1, 1.6], [2, 3, 5.5]], c: [17, 126], ir: 'alkene' },
  { name: 'cyclohexane', h: [[12, 0, 1.4]], c: [27], ir: 'alkane' },
  { name: '2,2-dimethylpropane', h: [[12, 0, 0.9]], c: [28, 32], ir: 'alkane' },
  { name: 'hexane', ir: 'alkane' },
  { name: 'benzene', h: [[6, 0, 7.3]], c: [128] },
  { name: 'methylbenzene', h: [[5, -1, 7.2], [3, 0, 2.3]] },
];
const IR_OF: Readonly<Record<string, string[]>> = {
  alcohol: ['O–H (alcohol)', 'C–O'], acid: ['O–H (acid)', 'C=O', 'C–O'], carbonyl: ['C=O'], ester: ['C=O', 'C–O'],
  nitrile: ['C≡N'], amine: ['N–H'], alkene: ['C=C'], alkane: [],
};

describe('spectra predicted from the structure', () => {
  test('every molecule is laid out and reads as its formula', () => {
    for (const m of SPECTRA_MOLECULES) {
      expect(LAYOUTS[m.smiles], m.name).toBeDefined();
      expect(formulaOfGraph(graph(m.smiles)), m.name).toMatch(/^C\d*H\d+/);
    }
  });

  test('¹H environments, areas and splitting equal the hand-checked spectra; shifts within 0.6 ppm', () => {
    for (const hand of HAND) {
      if (!hand.h) continue;
      const peaks = protonPeaks(byName(hand.name));
      const key = (count: number, next: number) => `${count}H ${splittingName(next)}`;
      expect(peaks.map((p) => key(p.count, p.next)).sort(), hand.name).toEqual(hand.h.map(([c, n]) => key(c, n)).sort());
      for (const [count, next, shift] of hand.h) {
        // O–H and N–H shifts depend on the solvent and concentration; only their place in the data-sheet range is fixed.
        const peak = peaks.find((p) => p.count === count && p.next === next && Math.abs(p.shift - shift) < 0.6);
        const exchangeable = peaks.some((p) => p.count === count && p.next === next && ['alcohol', 'amine'].includes(p.kind));
        expect(peak || exchangeable ? true : `${hand.name}: no ${key(count, next)} near δ ${shift}`).toBe(true);
      }
    }
  });

  test('¹³C peak counts equal the hand-checked spectra; shifts within 8 ppm', () => {
    for (const hand of HAND) {
      if (!hand.c) continue;
      const shifts = carbonPeaks(byName(hand.name)).map((p) => p.shift).sort((a, b) => a - b);
      expect(shifts.length, hand.name).toBe(hand.c.length);
      [...hand.c].sort((a, b) => a - b).forEach((want, i) => expect(Math.abs(shifts[i] - want), `${hand.name} δ ${want}`).toBeLessThan(8));
    }
  });

  test('IR bands are the bonds the molecule has', () => {
    for (const hand of HAND) {
      if (!hand.ir) continue;
      const bonds = irBands(byName(hand.name)).map((b) => b.bond).filter((b) => b !== 'C–H').sort();
      expect(bonds, hand.name).toEqual([...IR_OF[hand.ir]].sort());
    }
  });

  test('symmetry: equivalent atoms share an environment', () => {
    const count = (name: string) => new Set(classes(byName(name)).filter((_, i) => byName(name).atoms[i].el === 'C')).size;
    expect(count('benzene')).toBe(1);
    expect(count('methylbenzene')).toBe(5);
    expect(count('1,4-dimethylbenzene')).toBe(3);
    expect(count('1,2-dimethylbenzene')).toBe(4);
    expect(count('1,3-dimethylbenzene')).toBe(5);
    expect(count('2,3-dimethylbutane')).toBe(2);
    expect(count('cyclohexane')).toBe(1);
  });

  test('mass: the molecular ion, the halogen patterns and the classic fragments', () => {
    expect(nominalMass(byName('ethanol'))).toBe(46);
    expect(halogenPattern(1, 0).map((x) => Math.round(x * 100))).toEqual([100, 0, 33]);
    expect(halogenPattern(0, 1).map((x) => Math.round(x * 100))).toEqual([100, 0, 97]);
    expect(halogenPattern(2, 0).map((x) => Math.round(x * 100))).toEqual([100, 0, 67, 0, 11]);
    const peaks = (name: string) => massSpectrum(byName(name));
    const tallest = (name: string) => peaks(name).reduce((a, b) => (b.height > a.height ? b : a)).mz;
    const has = (name: string, mz: number) => peaks(name).some((p) => p.mz === mz);
    // Base peaks the textbooks quote: CH₂OH⁺ 31, CH₃CO⁺ 43, C₂H₅CO⁺ 57, CH₂NH₂⁺ 30, (CH₃)₃C⁺ 57, the tropylium ion 91.
    expect(tallest('ethanol')).toBe(31);
    expect(tallest('propanone')).toBe(43);
    expect(tallest('pentan-3-one')).toBe(57);
    expect(tallest('ethylamine')).toBe(30);
    expect(tallest('2,2-dimethylpropane')).toBe(57);
    expect(tallest('2-bromo-2-methylpropane')).toBe(57);
    expect(has('methylbenzene', 91)).toBe(true);
    // M and M + 2: 3 : 1 for one chlorine, 1 : 1 for one bromine.
    const ratio = (name: string) => { const p = peaks(name), m = nominalMass(byName(name)); return p.find((x) => x.mz === m + 2)!.height / p.find((x) => x.mz === m)!.height; };
    expect(ratio('chloroethane')).toBeCloseTo(1 / 3, 1);
    expect(ratio('bromoethane')).toBeCloseTo(0.97, 1);
  });
});

describe('spectra questions', () => {
  test('every "Which molecule?" set can be told apart from its spectra', () => {
    const sets = spectraSets();
    expect(sets.length).toBeGreaterThanOrEqual(8);
    for (const set of sets) {
      const prints = set.map((m) => fingerprint(graph(m.smiles)));
      expect(new Set(prints).size, set.map((m) => m.name).join(', ')).toBe(set.length);
    }
  });

  test('a drawing is read from the editor and compared with the unknown', () => {
    const drawn = (smiles: string) => {
      const read = readEditorStruct(editorStructFromKet(JSON.parse(isomerKet(smiles)).mol0));
      if (!('structure' in read)) throw new Error('unreadable');
      return graphOfStructure(read.structure).graph;
    };
    expect(spectraDifference(drawn('CCO'), byName('ethanol'))).toBeNull();
    expect(spectraDifference(drawn('CC1=CC=CC=C1'), byName('methylbenzene'))).toBeNull();
    expect(spectraDifference(drawn('CCO'), byName('methoxymethane'))).toBe('Your molecule would give an O–H (alcohol) band in the IR spectrum, which is not there.');
    expect(spectraDifference(drawn('COC'), byName('ethanol'))).toBe('The IR spectrum has an O–H (alcohol) band; your molecule would not give one.');
    expect(spectraDifference(drawn('CCCO'), byName('propan-2-ol'))).toContain('¹H NMR');
    expect(spectraDifference(drawn('CCO'), byName('propan-1-ol'))).toContain('C2H6O');
  });

  test('a molecule matches its own spectra and not an isomer\'s', () => {
    expect(sameSpectra(byName('propan-1-ol'), byName('propan-1-ol'))).toBe(true);
    expect(sameSpectra(byName('propan-1-ol'), byName('propan-2-ol'))).toBe(false);
    expect(sameSpectra(byName('methyl ethanoate'), byName('ethyl methanoate'))).toBe(false);
  });
});
