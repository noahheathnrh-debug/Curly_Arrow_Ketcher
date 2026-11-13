import type { Rng, Template } from './templates';
import { Builder, GRIGNARDS, type Placed } from './species';

/**
 * An ester with two equivalents of a Grignard reagent (drawn as the carbanion it behaves as) or of hydride from LiAlH4:
 * the first adds, the tetrahedral intermediate expels the alkoxide to give a ketone or aldehyde, and that, more
 * reactive than the ester, takes the second. The ester has its C=O east, the acyl chain upper left, the OR lower left;
 * one reagent waits upper right and the other lower right.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const STEM = ['', 'ethan', 'propan', 'butan'];
const ALKYL = ['', 'methyl', 'ethyl'];
const ALKOXIDE = ['', 'methoxide', 'ethoxide'];
const ALKOXY = ['', 'methoxy', 'ethoxy'];
const ALKANOL = ['', 'methanol', 'ethanol'];
const OR = ['', 'OCH3', 'OCH2CH3'];
const R = ['H', 'CH3', 'CH2CH3', 'CH2CH2CH3'];
const ANION = ['H−', 'CH3−', 'CH3CH2−', 'CH3CH2CH2−'];
interface Reagent { name: string; short: string; carbons: 0 | 1 | 2 | 3; build: (b: Builder, x: number, y: number, heading: number) => Placed }
const hydride: Reagent = { name: 'lithium aluminium hydride (LiAlH4)', short: 'hydride', carbons: 0, build: (b, x, y) => { const at = b.atom('H', x, y, { charge: -1 }); return { at, charges: { [at]: -1 } }; } };
const grignard = (name: string, carbons: 1 | 2 | 3): Reagent => ({ name, short: `${['', 'methyl', 'ethyl', 'propyl'][carbons]} carbanion`, carbons, build: GRIGNARDS.find((g) => g.name === name)!.build });
const REAGENTS: readonly Reagent[] = [grignard('methylmagnesium bromide', 1), grignard('ethylmagnesium bromide', 2), grignard('propylmagnesium bromide', 3), hydride];

/** The intermediate carbonyl compound and the alcohol, by acyl carbons (1-3) and reagent carbons (0 = hydride). */
const KETONE: Record<string, string> = {
  '1-0': 'ethanal', '2-0': 'propanal', '3-0': 'butanal',
  '1-1': 'propanone', '1-2': 'butanone', '1-3': 'pentan-2-one',
  '2-1': 'butanone', '2-2': 'pentan-3-one', '2-3': 'hexan-3-one',
  '3-1': 'pentan-2-one', '3-2': 'hexan-3-one', '3-3': 'heptan-4-one',
};
const ALCOHOL: Record<string, string> = {
  '1-0': 'ethanol', '2-0': 'propan-1-ol', '3-0': 'butan-1-ol',
  '1-1': '2-methylpropan-2-ol', '1-2': '3-methylpentan-3-ol', '1-3': '4-methylheptan-4-ol',
  '2-1': '2-methylbutan-2-ol', '2-2': '3-ethylpentan-3-ol', '2-3': '4-ethylheptan-4-ol',
  '3-1': '2-methylpentan-2-ol', '3-2': '3-ethylhexan-3-ol', '3-3': '4-propylheptan-4-ol',
};
export const ESTER_ADDITION_SETS = [1, 2, 3].flatMap((acyl) => [1, 2].flatMap((alkyl) => REAGENTS.map((reagent) => ({ acyl, alkyl, reagent }))));

/** Builds a reagent, then gives the moves that bring its reacting atom to (x, y). */
function placed(b: Builder, build: () => Placed) {
  const before = b.atoms.length;
  const p = build();
  const ids = b.atoms.slice(before).map((a) => a.id);
  const at = (id: string) => b.atoms.find((a) => a.id === id)!;
  const to = (x: number, y: number) => {
    const dx = x - at(p.at).x, dy = y - at(p.at).y;
    return Object.fromEntries(ids.map((id) => [id, [at(id).x + dx, at(id).y + dy] as [number, number]]));
  };
  return { ...p, ids, to };
}

export const esterDoubleAddition: Template = {
  id: 'ester-double-addition',
  title: 'An ester with a Grignard reagent or LiAlH4',
  phrase: 'ester double addition',
  skill: 'carbonyl-addition',
  variants: ESTER_ADDITION_SETS.length,
  make(rng) {
    const { acyl, alkyl, reagent } = pick(rng, ESTER_ADDITION_SETS);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const o = b.grow(c, 'O', 0, 2);
    b.chain(c, acyl, 150, -1);
    const before = b.atoms.length;
    const or = b.grow(c, 'O', 240);
    b.chain(or, alkyl, 210);
    const leaving = b.atoms.slice(before).map((a) => a.id);
    const at = (id: string) => b.atoms.find((a) => a.id === id)!;
    const n1 = placed(b, () => reagent.build(b, 0.95, 1.65, 60));
    const n2 = placed(b, () => reagent.build(b, 0.95, -1.65, 300));
    const key = `${acyl}-${reagent.carbons}`;
    const ester = `${ALKYL[alkyl]} ${STEM[acyl]}oate`;
    const ketone = KETONE[key], alcohol = ALCOHOL[key];
    const isH = reagent.carbons === 0;
    const aCarbonyl = isH ? 'an aldehyde' : 'a ketone';
    const second = ALKANOL[alkyl] === alcohol ? `a second molecule of ${alcohol}` : ALKANOL[alkyl];
    const nu = isH ? 'hydride' : `the ${reagent.short}`;
    return {
      id: 'practice-ester-double-addition', title: `${cap(ester)} and ${isH ? 'LiAlH4' : reagent.name}`, unit: 'Carbonyl addition', skill: 'carbonyl-addition', level: 3,
      summary: `${cap(ester)} takes two equivalents of ${isH ? 'hydride from LiAlH4' : reagent.name}: one adds and ${ALKOXIDE[alkyl]} leaves, giving ${ketone}, which takes the second. Work-up gives ${alcohol}${isH ? `, and the ${ALKOXIDE[alkyl]} that left becomes ${second}` : ''}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [
        {
          name: `The first ${isH ? 'hydride' : 'equivalent'} adds`, prompt: `Show ${nu} adding to the ester's carbonyl carbon.`,
          arrows: [
            { from: n1.at, to: `${n1.at}-${c}`, says: `${cap(nu)} attacks the carbonyl carbon.` },
            { from: `${c}-${o}`, to: o, says: 'The C=O π electrons move onto oxygen.' },
          ],
          hints: [isH ? 'LiAlH4 delivers hydride, H−, as the nucleophile. NaBH4 is too weak to reduce esters under ordinary conditions; LiAlH4 is not.' : `In ${reagent.name} the C–Mg bond is very polar, so the carbon behaves as a carbanion (${ANION[reagent.carbons]}). It is drawn that way here, with MgBr+ left out.`],
          explanation: `A tetrahedral intermediate. Unlike the one from a ketone, it still carries a leaving group: the ${ALKOXY[alkyl]} group.`,
          move: n1.to(0.5, 0.866),
        },
        {
          name: `${cap(ALKOXIDE[alkyl])} leaves`, prompt: `Show the intermediate re-forming the C=O and expelling ${ALKOXIDE[alkyl]}.`,
          arrows: [
            { from: o, to: `${o}-${c}`, pair: 1, says: 'A lone pair on the O− moves back in to re-form the C=O.' },
            { from: `${c}-${or}`, to: or, says: `The C–O bond to the ${ALKOXY[alkyl]} group breaks, and ${ALKOXIDE[alkyl]} leaves.` },
          ],
          hints: [`The intermediate collapses as in any acyl substitution: the C=O re-forms and the better leaving group goes, which is the alkoxide, not the ${isH ? 'hydride' : 'carbanion'} just added.`],
          explanation: `The product is ${ketone}: overall an acyl substitution, with ${OR[alkyl]} replaced by ${R[reagent.carbons]}. ${cap(ketone)} is more reactive than the ester it came from: the ester's OR oxygen donates a lone pair into its C=O, which makes the carbon less electrophilic, and ${aCarbonyl} has no such donor. So it takes a second ${isH ? 'hydride' : 'equivalent'} at once, and the reaction cannot be stopped here.${isH ? ' (One equivalent of DIBAL at −78 °C can stop at the aldehyde, because its intermediate survives until work-up.)' : ''}`,
          move: Object.fromEntries(leaving.map((id) => [id, [at(id).x - 0.9, at(id).y - 0.6] as [number, number]])),
        },
        {
          name: `The second ${isH ? 'hydride' : 'equivalent'} adds`, prompt: `Show the second ${isH ? 'hydride' : `${reagent.short}`} adding to ${ketone}.`,
          arrows: [
            { from: n2.at, to: `${n2.at}-${c}`, says: `${cap(nu)} attacks the carbonyl carbon of ${ketone}.` },
            { from: `${c}-${o}`, to: o, says: 'The C=O π electrons move onto oxygen.' },
          ],
          hints: [`${cap(aCarbonyl)} addition, as in step 1.`],
          explanation: `An alkoxide; acid work-up protonates it, giving ${alcohol}, ${isH ? 'a primary alcohol' : 'a tertiary alcohol: two of its groups come from the Grignard reagent and one from the ester’s acid part'}. ${isH ? `The ${ALKOXIDE[alkyl]} released in step 2 is protonated at work-up too, giving ${second}` : 'At least two equivalents of the Grignard reagent are used'}; the reaction is run in dry ether or THF, since water would destroy the reagent.`,
          move: n2.to(0.5, -0.866),
        },
      ],
      expect: { bonds: [`${n1.at}-${c}`, `${n2.at}-${c}`, `${c}-${o}:1`], absent: [`${c}-${or}`], charges: { [o]: -1, [or]: -1 } },
    };
  },
};

export const ESTER_ADDITION_TEMPLATES: readonly Template[] = [esterDoubleAddition];
