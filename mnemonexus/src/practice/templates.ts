import type { LessonDef } from '../lessons/kit';
import {
  Builder, CARBONYL_NUCLEOPHILES, CARBONYLS, HALIDE, HALOGENS, NUCLEOPHILES, PROTON_TRANSFERS, SN2_SUBSTRATES, type Hal,
} from './species';
import { SUBSTITUTION_TEMPLATES } from './templatesSubstitution';
import { ALKENE_TEMPLATES } from './templatesAlkenes';
import { CARBONYL_TEMPLATES } from './templatesCarbonyl';
import { ACYL_TEMPLATES } from './templatesAcyl';
import { ENOLATE_TEMPLATES } from './templatesEnolates';
import { AROMATIC_TEMPLATES } from './templatesAromatic';
import { RADICAL_TEMPLATES } from './templatesRadicals';
import { PERICYCLIC_TEMPLATES } from './templatesPericyclic';
import { CONJUGATE_TEMPLATES } from './templatesConjugate';
import { REARRANGEMENT_TEMPLATES } from './templatesRearrangements';
import { BECKMANN_TEMPLATES } from './templatesBeckmann';
import { EPOXIDE_TEMPLATES } from './templatesEpoxide';
import { DECARBOXYLATION_TEMPLATES } from './templatesDecarboxylation';
import { ENOL_TEMPLATES } from './templatesEnols';
import { RESONANCE_TEMPLATES } from './templatesResonance';
import { ESTER_ADDITION_TEMPLATES } from './templatesEsterAddition';
import { CARBOXYLATION_TEMPLATES } from './templatesCarboxylation';
import { NITRILE_TEMPLATES } from './templatesNitrile';
import { E1CB_TEMPLATES } from './templatesE1cb';
import { WITTIG_TEMPLATES } from './templatesWittig';
import { HALONIUM_TEMPLATES } from './templatesHalonium';
import { HYDROBORATION_TEMPLATES } from './templatesHydroboration';

/**
 * Mechanism templates for Practise: each picks reagents from the curated sets with a seeded random source and draws a
 * one-step puzzle as a lesson definition. The kit then checks it like any lesson (legal arrows, the hydrogens the
 * editor will draw, and a product key written from the template's chemistry rather than read off its arrows).
 */
export type Rng = () => number;
export interface Template {
  id: string;
  title: string;
  /** The title as it reads mid-sentence ("three new SN2 puzzles"). */
  phrase: string;
  /** Practice-catalogue skill. */
  skill: string;
  /** How many different puzzles the sets allow. */
  variants: number;
  make(rng: Rng): LessonDef;
}

const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const protonTransfer: Template = {
  id: 'proton-transfer',
  title: 'Proton transfer',
  phrase: 'proton transfer',
  skill: 'proton-transfer',
  variants: PROTON_TRANSFERS.length,
  make(rng) {
    const { acid, base } = pick(rng, PROTON_TRANSFERS);
    const b = new Builder();
    const B = base.build(b, -1.8, 0, 180);
    const A = acid.build(b, 0, 0, 0);
    const charges = { ...B.charges, ...A.charges, [A.x]: (A.charges[A.x] ?? 0) - 1, [B.at]: base.charge + 1 };
    return {
      id: `practice-proton-transfer`, title: `${cap(base.name)} and ${acid.name}`, unit: 'Acids and bases', skill: 'proton-transfer', level: 1,
      summary: `${cap(base.name)} takes a proton from ${acid.name}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Proton transfer', prompt: `Show ${base.name} taking the proton from ${acid.name}.`,
        arrows: [
          { from: B.at, to: `${B.at}-${A.h}`, says: 'The base uses a lone pair to make a bond to the proton.' },
          { from: `${A.h}-${A.x}`, to: A.x, says: 'The old bond to the proton breaks; its electrons stay behind.' },
        ],
        hints: ['Start at a lone pair on the base.', 'Hydrogen keeps one bond: as the new one forms, the old one breaks.'],
        explanation: `${cap(base.name)} is the stronger base (its conjugate acid has pKa ${base.conj}, against ${acid.pKa} for ${acid.name}), so the proton moves to it.`,
      }],
      expect: { bonds: [`${B.at}-${A.h}`], absent: [`${A.h}-${A.x}`], charges: Object.fromEntries(Object.entries(charges).filter(([, c]) => c)) },
    };
  },
};

const sn2Pairs = SN2_SUBSTRATES.flatMap((s) => HALOGENS.flatMap((x) => NUCLEOPHILES.filter((n) => n.not !== x).map((n) => ({ s, x, n }))));
const sn2: Template = {
  id: 'sn2',
  title: 'SN2',
  phrase: 'SN2',
  skill: 'substitution',
  variants: sn2Pairs.length,
  make(rng) {
    const { s, x, n } = pick(rng, sn2Pairs);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const leaving = b.grow(c, x, 0);
    // The chain zigzags upwards, out of the way of the nucleophile, which comes in opposite the leaving group.
    if (s.carbons > 1) b.chain(c, s.carbons - 1, 90);
    const N = n.build(b, -1.9, 0, 180);
    const charges = { ...N.charges, [N.at]: n.charge + 1, [leaving]: -1 };
    return {
      id: 'practice-sn2', title: `${cap(n.name)} and ${s.name(x as Hal)}`, unit: 'Substitution and elimination', skill: 'substitution', level: 1,
      summary: `${cap(n.name)} replaces ${HALIDE[x]} in one step.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'SN2', prompt: `Show ${n.name} replacing the ${HALIDE[x]} of ${s.name(x as Hal)} in one step.`,
        arrows: [
          { from: N.at, to: `${N.at}-${c}`, says: 'The nucleophile attacks the carbon that holds the halogen, from the far side.' },
          { from: `${c}-${leaving}`, to: leaving, says: 'The carbon–halogen bond breaks as the new bond forms.' },
        ],
        hints: ['The nucleophile attacks the carbon bonded to the halogen.', 'Carbon keeps four bonds, so the carbon–halogen bond breaks at the same time.'],
        explanation: `One concerted step: ${n.name} bonds to carbon as ${HALIDE[x]} leaves.${n.charge ? '' : ' Ammonia is neutral, so the product is an alkylammonium ion; a second ammonia then takes a proton from it to give the amine.'}`,
      }],
      expect: { bonds: [`${N.at}-${c}`], absent: [`${c}-${leaving}`], charges: Object.fromEntries(Object.entries(charges).filter(([, v]) => v)) },
    };
  },
};

const carbonylPairs = CARBONYLS.flatMap((carbonyl) => CARBONYL_NUCLEOPHILES.map((n) => ({ carbonyl, n })));
const carbonylAddition: Template = {
  id: 'carbonyl-addition',
  title: 'Addition to a carbonyl',
  phrase: 'carbonyl addition',
  skill: 'carbonyl-addition',
  variants: carbonylPairs.length,
  make(rng) {
    const { carbonyl, n } = pick(rng, carbonylPairs);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    // C=O points east and the groups zigzag west, leaving the gap at 60 degrees for the nucleophile.
    const o = b.grow(c, 'O', 0, 2);
    const [g1, g2] = carbonyl.groups;
    if (g1) b.chain(c, g1, 150, -1);
    if (g2) b.chain(c, g2, 210);
    const N = n.build(b, 0.95, 1.65, 60);
    const charges = { ...N.charges, [N.at]: n.charge + 1, [o]: -1 };
    return {
      id: 'practice-carbonyl-addition', title: `${cap(n.name.split(' (')[0])} and ${carbonyl.name}`, unit: 'Carbonyl addition', skill: 'carbonyl-addition', level: 1,
      summary: `${cap(n.name)} adds to the carbonyl carbon of ${carbonyl.name}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Nucleophilic addition', prompt: `Show ${n.name} adding to ${carbonyl.name}.`,
        arrows: [
          { from: N.at, to: `${N.at}-${c}`, says: 'The nucleophile attacks the electron-poor carbonyl carbon.' },
          { from: `${c}-${o}`, to: o, says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['The nucleophile attacks carbon, not oxygen.', 'Carbon cannot take a fifth bond: one of the C=O bonds moves onto oxygen.'],
        explanation: `An alkoxide: the carbon that was trigonal is now tetrahedral, with four single bonds, and oxygen carries the negative charge.${['hydroxide', 'methoxide'].includes(n.name) ? ` This addition is reversible: with ${n.name} the equilibrium lies on the side of the carbonyl, especially for a ketone.` : ''}`,
      }],
      expect: { bonds: [`${N.at}-${c}`, `${c}-${o}:1`], charges: Object.fromEntries(Object.entries(charges).filter(([, v]) => v)) },
    };
  },
};

export const TEMPLATES: readonly Template[] = [protonTransfer, sn2, carbonylAddition, ...SUBSTITUTION_TEMPLATES, ...ALKENE_TEMPLATES, ...CARBONYL_TEMPLATES, ...ACYL_TEMPLATES, ...ENOLATE_TEMPLATES, ...E1CB_TEMPLATES, ...CONJUGATE_TEMPLATES, ...AROMATIC_TEMPLATES, ...RADICAL_TEMPLATES, ...PERICYCLIC_TEMPLATES, ...REARRANGEMENT_TEMPLATES, ...BECKMANN_TEMPLATES, ...WITTIG_TEMPLATES, ...HALONIUM_TEMPLATES, ...HYDROBORATION_TEMPLATES, ...EPOXIDE_TEMPLATES, ...DECARBOXYLATION_TEMPLATES, ...ENOL_TEMPLATES, ...RESONANCE_TEMPLATES, ...ESTER_ADDITION_TEMPLATES, ...CARBOXYLATION_TEMPLATES, ...NITRILE_TEMPLATES];
