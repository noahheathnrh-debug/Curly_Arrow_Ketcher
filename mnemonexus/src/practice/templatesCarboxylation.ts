import type { Rng, Template } from './templates';
import { Builder, type Placed } from './species';

/**
 * A Grignard reagent or an organolithium (drawn as the carbanion it behaves as) adds to carbon dioxide: a carboxylate,
 * which acid work-up turns into a carboxylic acid with one more carbon than the reagent's group. CO2 is drawn
 * straight, east to west, with the reagent waiting to its upper right; once it has added, the carboxylate is drawn trigonal.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Reagent { name: string; carbons: 1 | 2 | 3 | 4 | 5 | 6 }
/** Each reagent is drawn as its carbanion: a charged carbon and the rest of its straight chain. */
function carbanion(b: Builder, x: number, y: number, heading: number, carbons: number): Placed {
  const at = b.atom('C', x, y, { charge: -1 });
  b.chain(at, carbons - 1, heading);
  return { at, charges: { [at]: -1 } };
}
/** Different groups only: two reagents with the same group would draw the same puzzle. */
export const CARBOXYLATION_REAGENTS: readonly Reagent[] = [
  { name: 'methylmagnesium bromide', carbons: 1 }, { name: 'ethylmagnesium bromide', carbons: 2 }, { name: 'propylmagnesium bromide', carbons: 3 },
  { name: 'butyllithium', carbons: 4 }, { name: 'pentylmagnesium bromide', carbons: 5 }, { name: 'hexyllithium', carbons: 6 },
];
const GROUP = ['', 'methyl', 'ethyl', 'propyl', 'butyl', 'pentyl', 'hexyl'];
const ANION = ['', 'CH3−', 'CH3CH2−', 'CH3(CH2)2−', 'CH3(CH2)3−', 'CH3(CH2)4−', 'CH3(CH2)5−'];
const ACID = ['', 'ethanoic acid', 'propanoic acid', 'butanoic acid', 'pentanoic acid', 'hexanoic acid', 'heptanoic acid'];
const SALT = ['', 'ethanoate', 'propanoate', 'butanoate', 'pentanoate', 'hexanoate', 'heptanoate'];

export const carboxylation: Template = {
  id: 'carboxylation',
  title: 'A Grignard reagent or organolithium adds to carbon dioxide',
  phrase: 'carboxylation',
  skill: 'carbonyl-addition',
  variants: CARBOXYLATION_REAGENTS.length,
  make(rng) {
    const reagent = pick(rng, CARBOXYLATION_REAGENTS);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const oa = b.grow(c, 'O', 180, 2);
    const ob = b.grow(c, 'O', 0, 2);
    const before = b.atoms.length;
    // The chain points straight away from CO2 (its first bond at 60°), so the lone pair, drawn opposite it, faces the carbon.
    const n = carbanion(b, 0.95, 1.65, 30, reagent.carbons);
    const ids = b.atoms.slice(before).map((a) => a.id);
    const at = (id: string) => b.atoms.find((a) => a.id === id)!;
    const dx = -at(n.at).x, dy = 1 - at(n.at).y;
    const isLi = reagent.name.endsWith('lithium');
    const group = GROUP[reagent.carbons];
    return {
      id: 'practice-carboxylation', title: `${cap(reagent.name)} and carbon dioxide`, unit: 'Carbonyl addition', skill: 'carbonyl-addition', level: 2,
      summary: `The ${group} group of ${reagent.name} adds to the carbon of CO2, giving ${SALT[reagent.carbons]}; acid work-up gives ${ACID[reagent.carbons]}, one carbon longer than the ${group} group.`,
      atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Addition to CO2', prompt: `Show the ${group} carbanion adding to carbon dioxide.`,
        arrows: [
          { from: n.at, to: `${n.at}-${c}`, approach: 30, says: `The carbanion’s lone pair attacks the carbon of CO2, which both oxygens leave short of electrons.` },
          { from: `${c}-${ob}`, to: ob, says: 'One C=O π bond moves onto its oxygen.' },
        ],
        hints: [
          `In ${reagent.name} the C–${isLi ? 'Li' : 'Mg'} bond is very polar, so the carbon behaves as a carbanion (${ANION[reagent.carbons]}). It is drawn that way here, with ${isLi ? 'Li+' : 'MgBr+'} left out.`,
          'CO2 is an electrophile at carbon, like the carbon of a C=O group.',
        ],
        explanation: `${cap(SALT[reagent.carbons])}, its charge shared by the two oxygens. In practice the reagent is poured onto dry ice (solid CO2), then dilute acid is added (the work-up), which protonates the carboxylate to ${ACID[reagent.carbons]}. This is a way to add one carbon to a chain: the haloalkane the reagent was made from becomes a carboxylic acid.`,
        move: {
          [oa]: [-0.866, -0.5], [ob]: [0.866, -0.5],
          ...Object.fromEntries(ids.map((id) => [id, [at(id).x + dx, at(id).y + dy] as [number, number]])),
        },
      }],
      expect: { bonds: [`${n.at}-${c}`, `${c}-${oa}:2`, `${c}-${ob}:1`], charges: { [ob]: -1 } },
    };
  },
};

export const CARBOXYLATION_TEMPLATES: readonly Template[] = [carboxylation];
