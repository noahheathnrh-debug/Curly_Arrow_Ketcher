import type { Rng, Template } from './templates';
import { Builder, CARBONYL_PARTNERS, CARBONYLS, GRIGNARDS, SOLVENTS } from './species';

/**
 * The carbonyl unit beyond simple addition: a Grignard reagent adding, a weak nucleophile adding to a protonated
 * carbonyl (on the way to a hydrate, hemiacetal or acetal), and water pushed out by a neighbouring lone pair (the step
 * that makes an oxocarbenium or iminium ion). Each is one step, drawn from where it starts.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nonZero = (charges: Record<string, number>) => Object.fromEntries(Object.entries(charges).filter(([, c]) => c));

/** The carbonyl carbon at the origin, its two groups zigzagging west; returns the carbon. */
function carbonylGroups(b: Builder, c: string, groups: readonly number[]) {
  const [g1, g2] = groups;
  if (g1) b.chain(c, g1, 150, -1);
  if (g2) b.chain(c, g2, 210);
}

/** The alcohol a Grignard addition gives after work-up, by what the carbonyl carbon carried. */
const alcoholClass = (groups: readonly number[]) => (groups.filter(Boolean).length === 0 ? 'primary' : groups.filter(Boolean).length === 1 ? 'secondary' : 'tertiary');

const grignardSets = CARBONYLS.flatMap((carbonyl) => GRIGNARDS.map((reagent) => ({ carbonyl, reagent })));
export const grignardAddition: Template = {
  id: 'grignard-addition',
  title: 'A Grignard reagent adds to a carbonyl',
  phrase: 'Grignard addition',
  skill: 'carbonyl-addition',
  variants: grignardSets.length,
  make(rng) {
    const { carbonyl, reagent } = pick(rng, grignardSets);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const o = b.grow(c, 'O', 0, 2);
    carbonylGroups(b, c, carbonyl.groups);
    const N = reagent.build(b, 0.95, 1.65, 60);
    const kind = alcoholClass(carbonyl.groups);
    return {
      id: 'practice-grignard-addition', title: `${cap(reagent.name)} and ${carbonyl.name}`, unit: 'Carbonyl addition', skill: 'carbonyl-addition', level: 1,
      summary: `The ${reagent.group} group of ${reagent.name} adds to the carbonyl carbon of ${carbonyl.name}, making a new C–C bond.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Grignard addition', prompt: `Show the ${reagent.group} group of ${reagent.name}, drawn as the carbanion it behaves as, adding to ${carbonyl.name}.`,
        arrows: [
          { from: N.at, to: `${N.at}-${c}`, says: 'The C–Mg bond is polarised towards carbon, so the carbon reacts as a carbanion: its electron pair attacks the carbonyl carbon.' },
          { from: `${c}-${o}`, to: o, says: 'The C=O π bond moves onto oxygen.' },
        ],
        hints: ['The nucleophile is the carbon that was bonded to magnesium.', 'Carbon cannot take a fifth bond: the C=O π bond moves onto oxygen.'],
        explanation: `A magnesium alkoxide, drawn here as the free alkoxide. Adding dilute acid afterwards (the work-up) protonates it to a ${kind} alcohol. The reaction is run in dry ether: water would protonate the Grignard reagent first and destroy it.`,
      }],
      expect: { bonds: [`${N.at}-${c}`, `${c}-${o}:1`], charges: { [o]: -1 } },
    };
  },
};

/** Water or an alcohol adding to a carbonyl that an acid catalyst has already protonated. */
const captureSets = CARBONYLS.flatMap((carbonyl) => SOLVENTS.map((n) => ({ carbonyl, n })));
export const protonatedCarbonylAddition: Template = {
  id: 'protonated-carbonyl-addition',
  title: 'Water or an alcohol adds to a protonated carbonyl',
  phrase: 'acid-catalysed addition',
  skill: 'carbonyl-addition',
  variants: captureSets.length,
  make(rng) {
    const { carbonyl, n } = pick(rng, captureSets);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const o = b.grow(c, 'O', 0, 2, { charge: 1 });
    b.grow(o, 'H', 300);
    carbonylGroups(b, c, carbonyl.groups);
    const N = n.build(b, 0.95, 1.65, 60);
    const ketone = carbonyl.groups[1] > 0;
    const product = n.name === 'water' ? 'hydrate' : ketone ? 'hemiketal (the hemiacetal of a ketone)' : 'hemiacetal';
    return {
      id: 'practice-protonated-carbonyl-addition', title: `${cap(n.name)} and protonated ${carbonyl.name}`, unit: 'Carbonyl addition', skill: 'carbonyl-addition', level: 2,
      summary: `${cap(n.name)}, a weak nucleophile, adds to ${carbonyl.name} after an acid has protonated its oxygen.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Addition', prompt: `Show ${n.name} adding to the protonated carbonyl.`,
        arrows: [
          { from: N.at, to: `${N.at}-${c}`, says: `A lone pair on the oxygen of ${n.name} attacks the carbonyl carbon.` },
          { from: `${c}-${o}`, to: o, says: 'The C=O π bond moves onto the positive oxygen, which becomes a neutral OH.' },
        ],
        hints: ['The nucleophile is a neutral oxygen with lone pairs.', 'The π electrons go to the oxygen that carries the positive charge.'],
        explanation: `An oxonium ion: the oxygen that attacked now has three bonds and the positive charge. Protonating the carbonyl made its carbon much more electron-poor, so even a weak nucleophile adds. Losing a proton next gives the ${product}.${ketone ? ' For a ketone little of it is present at equilibrium: the ketone is favoured.' : ''}`,
      }],
      expect: { bonds: [`${N.at}-${c}`, `${c}-${o}:1`], charges: nonZero({ ...N.charges, [N.at]: n.charge + 1 }) },
    };
  },
};

/** A protonated hemiacetal or carbinolamine losing water, pushed out by the lone pair next door. */
const lossSets = CARBONYLS.flatMap((carbonyl) => CARBONYL_PARTNERS.map((partner) => ({ carbonyl, partner })));
export const waterLoss: Template = {
  id: 'water-loss',
  title: 'A lone pair pushes out water',
  phrase: 'loss of water',
  skill: 'leaving-group',
  variants: lossSets.length,
  make(rng) {
    const { carbonyl, partner } = pick(rng, lossSets);
    const b = new Builder();
    // The pushing atom up with its chain to the right, so its lone pair faces the open left side; the carbonyl's groups
    // either side of the protonated OH, which leaves downwards. With a group up on the left the editor's arrow router
    // took 4 to 12 seconds; this layout routes in a third of a second (timed 2026-11-11).
    const c = b.atom('C', 0, 0);
    const x = b.grow(c, partner.el, 90);
    b.chain(x, partner.carbons, 0);
    const [g1, g2] = carbonyl.groups;
    if (g1) b.chain(c, g1, 180);
    if (g2) b.chain(c, g2, 0, -1);
    const leaving = b.grow(c, 'O', 270, 1, { charge: 1 });
    const oxygen = partner.el === 'O', ketone = carbonyl.groups[1] > 0;
    const start = oxygen ? (ketone ? 'hemiketal' : 'hemiacetal') : 'carbinolamine';
    const pusher = oxygen ? 'alkoxy oxygen (the one carrying the alkyl group)' : 'nitrogen';
    const ion = oxygen ? 'an oxocarbenium ion' : 'an iminium ion';
    return {
      id: 'practice-water-loss', title: `Protonated ${start} from ${carbonyl.name} and ${partner.name}`, unit: 'Carbonyl addition', skill: 'leaving-group', level: 2,
      summary: `The protonated ${start} from ${carbonyl.name} and ${partner.name} loses water, helped by the lone pair on its ${oxygen ? 'alkoxy oxygen' : 'nitrogen'}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Loss of water', prompt: `Show the lone pair on the ${pusher} pushing water out of the protonated ${start}.`,
        arrows: [
          { from: x, to: `${x}-${c}`, says: `A lone pair on the ${oxygen ? 'alkoxy oxygen' : 'nitrogen'} next door moves in to make a π bond to carbon.` },
          { from: `${c}-${leaving}`, to: leaving, says: 'The C–O bond to the protonated OH breaks, and water leaves with both electrons.' },
        ],
        hints: ['Two arrows: a lone pair makes the new π bond, and the C–OH2+ bond breaks.', 'Water is a good leaving group; hydroxide is not, which is why the OH was protonated first.'],
        explanation: `${cap(ion)} and water. The ${oxygen ? 'oxygen' : 'nitrogen'} gives its lone pair to the carbon, so it now carries the formal positive charge, and the ion is stabilised by resonance (C+–X and C=X+, with a full octet on every atom in the second form). ${oxygen ? `A second alcohol adds to this ion next, and losing a proton gives the ${ketone ? 'ketal (the acetal of a ketone)' : 'acetal'}.` : 'Losing the proton from nitrogen next gives the imine. Nitrogen gives up its lone pair more readily than oxygen, so an iminium ion forms more easily than an oxocarbenium ion.'}`,
      }],
      expect: { bonds: [`${x}-${c}:2`], absent: [`${c}-${leaving}`], charges: { [x]: 1 } },
    };
  },
};

export const CARBONYL_TEMPLATES: readonly Template[] = [grignardAddition, protonatedCarbonylAddition, waterLoss];
