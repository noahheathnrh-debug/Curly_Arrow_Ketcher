import { moleculeFromKet } from '../isomers/cip';
import { isomerKet } from '../isomers/layouts';
import { carbonPeaks, formulaOfGraph, irBands, protonPeaks, splittingName, type SGraph } from './predict';
import { SPECTRA_MOLECULES, type SpectraMolecule } from './species';

/**
 * The Spectra questions: how many peaks, which of a few isomers gave these spectra, and draw a molecule that gives
 * them. Two molecules "give the same spectra" when every predicted peak agrees (formula, each ¹H peak's area,
 * splitting and shift, each ¹³C shift, and the IR bonds), which is all a learner is shown.
 */

export const graphOf = (m: SpectraMolecule): SGraph => moleculeFromKet(isomerKet(m.smiles));

export function fingerprint(g: SGraph): string {
  const h = protonPeaks(g).map((p) => `${p.count}:${p.next}:${p.shift}`).sort().join(',');
  const c = carbonPeaks(g).map((p) => p.shift).sort((a, b) => a - b).join(',');
  const ir = irBands(g).map((b) => b.bond).sort().join(',');
  return `${formulaOfGraph(g)}|${h}|${c}|${ir}`;
}
export const sameSpectra = (a: SGraph, b: SGraph) => fingerprint(a) === fingerprint(b);

/** Molecules that share a formula, two or more to a set: the options of a "Which molecule?" question. */
export function spectraSets(): SpectraMolecule[][] {
  const by = new Map<string, SpectraMolecule[]>();
  for (const m of SPECTRA_MOLECULES) {
    const f = formulaOfGraph(graphOf(m));
    by.set(f, [...(by.get(f) ?? []), m]);
  }
  return [...by.values()].filter((set) => set.length >= 2);
}

const shuffle = <T,>(xs: readonly T[], random: () => number): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

export interface PeaksQuestion { molecule: SpectraMolecule; nucleus: 'H' | 'C'; answer: number }
/** Five molecules, alternating ¹H and ¹³C: three easy ones, then two that need more care with symmetry. */
export function peaksRound(random: () => number): PeaksQuestion[] {
  const easy = shuffle(SPECTRA_MOLECULES.filter((m) => m.level === 1), random).slice(0, 3);
  const hard = shuffle(SPECTRA_MOLECULES.filter((m) => m.level === 2 && !easy.includes(m)), random).slice(0, 2);
  return [...easy, ...hard].map((molecule, i) => {
    const nucleus = i % 2 === 0 ? 'H' : 'C';
    const g = graphOf(molecule);
    return { molecule, nucleus, answer: nucleus === 'H' ? protonPeaks(g).length : carbonPeaks(g).length };
  });
}

export interface WhichQuestion { options: SpectraMolecule[]; answer: SpectraMolecule }
/** Five unknowns, each from a different formula, with up to four of its isomers to choose from. */
export function whichRound(random: () => number): WhichQuestion[] {
  return shuffle(spectraSets(), random).slice(0, 5).map((set) => {
    const options = shuffle(set, random).slice(0, 4);
    return { options, answer: options[Math.floor(random() * options.length)] };
  });
}

/** Two unknowns to draw: a level 1 molecule, then a level 2 one. */
export function solveRound(random: () => number): SpectraMolecule[] {
  return [1, 2].map((level) => shuffle(SPECTRA_MOLECULES.filter((m) => m.level === level), random)[0]);
}

/** "a C=O band", "an O–H band": the article by how the bond's first letter is said. */
const an = (bond: string) => (/^[AEFHILMNORSX]/.test(bond) ? `an ${bond}` : `a ${bond}`);

/**
 * What one molecule's spectra would show that the unknown's do not: the first difference a learner can check.
 * `subject` names the molecule ("Your molecule", "Propan-2-ol").
 */
export function spectraDifference(drawn: SGraph, target: SGraph, subject = 'Your molecule'): string | null {
  const fd = formulaOfGraph(drawn), ft = formulaOfGraph(target);
  if (fd !== ft) return `${subject} is ${fd}; the molecular ion and the formula say ${ft}.`;
  const ir = (g: SGraph) => irBands(g).map((b) => b.bond).filter((b) => b !== 'C–H');
  const missing = ir(target).filter((b) => !ir(drawn).includes(b)), extra = ir(drawn).filter((b) => !ir(target).includes(b));
  // Mid-sentence the name loses its capital (molecule names are lower case: propylamine, 2-methylpropanal).
  if (missing.length) return `The IR spectrum has ${an(missing[0])} band; ${subject.charAt(0).toLowerCase() + subject.slice(1)} would not give one.`;
  if (extra.length) return `${subject} would give ${an(extra[0])} band in the IR spectrum, which is not there.`;
  const hd = protonPeaks(drawn), ht = protonPeaks(target);
  if (hd.length !== ht.length) return `${subject} would give ${hd.length} peaks in the ¹H NMR spectrum; the spectrum has ${ht.length}.`;
  const areas = (ps: typeof hd) => ps.map((p) => p.count).sort((a, b) => a - b).join(' : ');
  if (areas(hd) !== areas(ht)) return `${subject} would give ¹H peaks with areas ${areas(hd)}; the spectrum's are ${areas(ht)}.`;
  const split = (ps: typeof hd) => ps.map((p) => `${p.count}H ${splittingName(p.next)}`).sort();
  const st = split(ht);
  const odd = split(hd).find((x) => !st.includes(x));
  if (odd) return `${subject} would give a ${odd} in the ¹H NMR spectrum, which is not there: look at the hydrogens on the carbons next door.`;
  const cd = carbonPeaks(drawn).length, ct = carbonPeaks(target).length;
  if (cd !== ct) return `${subject} would give ${cd} peaks in the ¹³C NMR spectrum; the spectrum has ${ct}.`;
  if (fingerprint(drawn) !== fingerprint(target)) return `${subject} gives peaks that match in number, area and splitting, but some sit at different shifts: check what each group is bonded to.`;
  return null;
}

/** A short name for the group an environment's atoms are: CH₃, CH₂, OH, ring CH, C=O. */
export function groupLabel(g: SGraph, atom: number, nucleus: 'H' | 'C'): string {
  const a = g.atoms[atom];
  const sub = (n: number) => (n > 1 ? String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]) : '');
  const bonds = g.bonds.filter((b) => b.a === atom || b.b === atom);
  const other = (b: { a: number; b: number }) => (b.a === atom ? b.b : b.a);
  if (a.el !== 'C') return `${a.el}H${sub(a.h)}`;
  if (bonds.some((b) => b.order === 2 && g.atoms[other(b)].el === 'O')) return a.h ? 'CHO' : 'C=O';
  if (bonds.some((b) => b.order === 3)) return 'C≡N';
  const ring = bonds.filter((b) => g.atoms[other(b)].el === 'C').length >= 2 && bonds.some((b) => b.order === 2) && !bonds.some((b) => b.order === 2 && bonds.length === 1);
  const self = a.h ? `CH${sub(a.h)}` : 'C';
  if (nucleus === 'H' && bonds.some((b) => b.order === 2 && g.atoms[other(b)].el === 'C')) return ring ? 'ring H' : `=${self}`;
  return self;
}
