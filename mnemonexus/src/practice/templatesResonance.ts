import type { Rng, Template } from './templates';
import type { LessonArrow, LessonDef } from '../lessons/kit';
import { Builder } from './species';

/**
 * Resonance forms: curly arrows that turn one drawing of an ion or molecule into another, moving electrons only. Each
 * species is drawn around a carbon at the origin: carboxylates, enolates, amides and esters with the C=O (or C–O−) up,
 * their other group lower left and the atom that pushes lower right; allyl cations as a zigzag from the origin.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Kind = 'carboxylate' | 'enolate' | 'allyl' | 'amide' | 'ester';
interface Species { name: string; kind: Kind; group?: 'H' | 'Me' | 'Et' | 'iPr'; on?: 0 | 1 | 2; alpha?: 0 | 1; note?: string }
const SPECIES: readonly Species[] = [
  { name: 'the methanoate ion', kind: 'carboxylate', group: 'H' },
  { name: 'the ethanoate ion', kind: 'carboxylate', group: 'Me' },
  { name: 'the propanoate ion', kind: 'carboxylate', group: 'Et' },
  { name: 'the 2-methylpropanoate ion', kind: 'carboxylate', group: 'iPr' },
  { name: 'the enolate of ethanal', kind: 'enolate', group: 'H', alpha: 0 },
  { name: 'the enolate of propanal', kind: 'enolate', group: 'H', alpha: 1 },
  { name: 'the enolate of propanone', kind: 'enolate', group: 'Me', alpha: 0 },
  { name: 'the more substituted enolate of butanone', kind: 'enolate', group: 'Me', alpha: 1 },
  { name: 'the enolate of pentan-3-one', kind: 'enolate', group: 'Et', alpha: 1 },
  { name: 'the prop-2-en-1-ylium (allyl) cation', kind: 'allyl', on: 0 },
  { name: 'the but-2-en-1-ylium cation', kind: 'allyl', on: 1 },
  { name: 'the 3-methylbut-2-en-1-ylium cation', kind: 'allyl', on: 2 },
  { name: 'methanamide', kind: 'amide', group: 'H', on: 0 },
  { name: 'ethanamide', kind: 'amide', group: 'Me', on: 0 },
  { name: 'N-methylethanamide', kind: 'amide', group: 'Me', on: 1 },
  { name: 'N,N-dimethylethanamide', kind: 'amide', group: 'Me', on: 2 },
  { name: 'methyl methanoate', kind: 'ester', group: 'H' },
  { name: 'methyl ethanoate', kind: 'ester', group: 'Me' },
];

const ABOUT: Record<Kind, (s: Species) => string> = {
  carboxylate: () => 'The two forms are the same, so they contribute equally: the charge is shared by both oxygens, and both C–O bonds have the same length, between a single and a double bond. This sharing is the main reason carboxylic acids are far more acidic than alcohols.',
  enolate: () => 'This form puts the negative charge on carbon. Oxygen is more electronegative, so the form with the charge on oxygen contributes more, but the carbon end is where an enolate usually forms new C–C bonds.',
  allyl: (s) => `The positive charge is shared by the two end carbons.${s.on ? ' The form with the charge on the more substituted carbon contributes more, so a nucleophile often adds there under kinetic control.' : ' The two forms are the same, so the ends share the charge equally.'}`,
  amide: () => 'This form has separated charges, so it contributes less, but enough to matter: the C–N bond has some double-bond character, so an amide is planar, its C–N bond does not rotate freely at room temperature, and its nitrogen is hardly basic.',
  ester: () => 'As in an amide, but oxygen shares its lone pair less readily than nitrogen, so this form contributes less. That is one reason esters react with nucleophiles more readily than amides.',
};

function draw(b: Builder, s: Species): { arrows: LessonArrow[]; expect: LessonDef['expect'] } {
  const c = b.atom('C', 0, 0, s.kind === 'allyl' ? { charge: 1 } : {});
  const groupOn = (at: string) => {
    if (s.group === 'H') { if (s.kind === 'enolate') b.grow(at, 'H', 210); return; }
    const first = b.grow(at, 'C', 210);
    if (s.group === 'Et') b.grow(first, 'C', 150);
    if (s.group === 'iPr') { b.grow(first, 'C', 150); b.grow(first, 'C', 270); }
  };
  if (s.kind === 'allyl') {
    // C1+ at the origin, C2 upper right, C3 lower right of that: C1(+)–C2=C3.
    const c2 = b.grow(c, 'C', 30);
    const c3 = b.grow(c2, 'C', 330, 2);
    if (s.on && s.on >= 1) b.grow(c3, 'C', 30);
    if (s.on === 2) b.grow(c3, 'C', 270);
    return {
      arrows: [{ from: `${c2}-${c3}`, to: `${c}-${c2}`, says: 'The C=C π electrons move into the bond next to the positive carbon, making a new C=C.' }],
      expect: { bonds: [`${c}-${c2}:2`, `${c2}-${c3}:1`], charges: { [c3]: 1 } },
    };
  }
  if (s.kind === 'enolate') {
    const o = b.grow(c, 'O', 90, 1, { charge: -1 });
    groupOn(c);
    const alpha = b.grow(c, 'C', 330, 2);
    if (s.alpha) b.grow(alpha, 'C', 30);
    return {
      arrows: [
        { from: o, to: `${o}-${c}`, toSide: -1, says: 'A lone pair on the negative oxygen moves in to make a C=O.' },
        { from: `${c}-${alpha}`, to: alpha, side: -1, approach: 250, says: 'The C=C π electrons move onto the α-carbon, as a lone pair.' },
      ],
      expect: { bonds: [`${c}-${o}:2`, `${c}-${alpha}:1`], charges: { [alpha]: -1 } },
    };
  }
  // Carboxylate, amide, ester: C=O up, the pushing atom lower right.
  const o = b.grow(c, 'O', 90, 2);
  groupOn(c);
  if (s.kind === 'carboxylate') {
    const o2 = b.grow(c, 'O', 330, 1, { charge: -1 });
    return {
      arrows: [
        { from: o2, to: `${o2}-${c}`, pair: 1, toSide: -1, says: 'A lone pair on the negative oxygen moves in to make a C=O.' },
        { from: `${c}-${o}`, to: o, says: 'The other C=O π electrons move onto that oxygen.' },
      ],
      expect: { bonds: [`${c}-${o2}:2`, `${c}-${o}:1`], charges: { [o]: -1 } },
    };
  }
  const x = b.grow(c, s.kind === 'amide' ? 'N' : 'O', 330);
  if (s.kind === 'ester') b.grow(x, 'C', 30);
  if (s.kind === 'amide' && s.on && s.on >= 1) b.grow(x, 'C', 30);
  if (s.kind === 'amide' && s.on === 2) b.grow(x, 'C', 270);
  const atom = s.kind === 'amide' ? 'nitrogen' : 'oxygen';
  return {
    arrows: [
      { from: x, to: `${x}-${c}`, toSide: -1, says: `A lone pair on the ${atom} next to the C=O moves in to make a C=${s.kind === 'amide' ? 'N' : 'O'}.` },
      { from: `${c}-${o}`, to: o, says: 'The C=O π electrons move onto oxygen.' },
    ],
    expect: { bonds: [`${c}-${x}:2`, `${c}-${o}:1`], charges: { [x]: 1, [o]: -1 } },
  };
}

export const resonanceForms: Template = {
  id: 'resonance-forms',
  title: 'Resonance forms',
  phrase: 'resonance',
  skill: 'resonance',
  variants: SPECIES.length,
  make(rng) {
    const s = pick(rng, SPECIES);
    const b = new Builder();
    const { arrows, expect } = draw(b, s);
    return {
      id: 'practice-resonance-forms', title: `${cap(s.name)}: another resonance form`, unit: 'Arrow rules and resonance', skill: 'resonance', level: 1,
      summary: `Curly arrows that turn one drawing of ${s.name} into another. Only electrons move; the atoms stay where they are.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Draw the other resonance form', prompt: `Draw the curly arrows that give the other resonance form of ${s.name}.`,
        arrows,
        hints: ['Arrows start at a lone pair or a π bond, never at a σ bond, and no atom moves.', 'The total charge is the same in every resonance form.'],
        explanation: `The other resonance form. Neither drawing is the real ${s.kind === 'amide' || s.kind === 'ester' ? 'molecule' : 'ion'}, which is a blend of both; the double-headed arrow ↔ between resonance forms is not an equilibrium. ${ABOUT[s.kind](s)}`,
      }],
      expect,
    };
  },
};

export const RESONANCE_TEMPLATES: readonly Template[] = [resonanceForms];
