import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * A halonium ion opened by a solvent molecule: water or methanol attacks the more substituted ring carbon, anti to the
 * halogen. The ring sits with the more substituted carbon on the left, the halogen above, and the nucleophile below
 * left of that carbon.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The alkene by what its more substituted carbon carries: a chain lower left (1 to 2 carbons, or a branch) and a methyl upper left. */
interface Alkene { name: string; chain: 1 | 2 | 'branch'; methyl?: boolean; parent: string; locant: string }
const ALKENES: readonly Alkene[] = [
  { name: 'propene', chain: 1, parent: 'propan', locant: '' },
  { name: 'but-1-ene', chain: 2, parent: 'butan', locant: '' },
  { name: '2-methylpropene', chain: 1, methyl: true, parent: 'propan', locant: '2-methyl' },
  { name: '3-methylbut-1-ene', chain: 'branch', parent: 'butan', locant: '3-methyl' },
  { name: '2-methylbut-1-ene', chain: 2, methyl: true, parent: 'butan', locant: '2-methyl' },
];
type X = 'Cl' | 'Br';
const HALO: Record<X, { prefix: string; molecule: string }> = { Cl: { prefix: 'chloro', molecule: 'chlorine' }, Br: { prefix: 'bromo', molecule: 'bromine' } };
type Solvent = 'water' | 'methanol';

/** The neutral product's name, once the oxonium ion has lost its proton. */
function productName(a: Alkene, x: X, solvent: Solvent): string {
  const halo = `1-${HALO[x].prefix}`;
  if (solvent === 'water') return `${halo}${a.locant ? `-${a.locant}` : ''}${a.parent}-2-ol`;
  // Substituents in alphabetical order: bromo/chloro, methoxy, methyl.
  return `${halo}-2-methoxy${a.locant ? `-${a.locant}` : ''}${a.parent}e`;
}

const sets = ALKENES.flatMap((alkene) => (['Br', 'Cl'] as X[]).flatMap((x) => (['water', 'methanol'] as Solvent[]).map((solvent) => ({ alkene, x, solvent }))));

export const haloniumOpening: Template = {
  id: 'halonium-opening',
  title: 'A halonium ion opened by the solvent',
  phrase: 'halonium opening',
  skill: 'alkene-addition',
  variants: sets.length,
  make(rng) {
    const { alkene, x, solvent } = pick(rng, sets);
    const b = new Builder();
    const c1 = b.atom('C', 0, 0);
    const c2 = b.grow(c1, 'C', 0);
    const hal = b.atom(x, 0.5, 0.866, { charge: 1 });
    b.d.bond(hal, c1); b.d.bond(hal, c2);
    if (alkene.chain === 'branch') { const ch = b.grow(c1, 'C', 210); b.grow(ch, 'C', 150); b.grow(ch, 'C', 210); }
    else { const first = b.grow(c1, 'C', 210); if (alkene.chain === 2) b.grow(first, 'C', 150); }
    if (alkene.methyl) b.grow(c1, 'C', 150);
    const o = b.atom('O', 0.2, -1.7);
    const me = solvent === 'methanol' ? b.grow(o, 'C', 300) : undefined;
    const product = productName(alkene, x, solvent);
    const ionName = x === 'Br' ? 'bromonium' : 'chloronium';
    return {
      id: 'practice-halonium-opening', title: `${cap(alkene.name)}, ${HALO[x].molecule} and ${solvent}`, unit: 'Addition to alkenes', skill: 'alkene-addition', level: 2,
      summary: `${cap(alkene.name)} with ${HALO[x].molecule} in ${solvent} gives a ${ionName} ion, which ${solvent} opens at the more substituted carbon; loss of a proton then gives ${product}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: `${cap(solvent)} opens the ${ionName} ion`, prompt: `Show ${solvent} opening the ${ionName} ion at the more substituted carbon.`,
        arrows: [
          { from: o, to: `${o}-${c1}`, says: `A lone pair on the ${solvent} oxygen attacks the more substituted ring carbon, from the face opposite the ${x === 'Br' ? 'bromine' : 'chlorine'}.` },
          { from: `${c1}-${hal}`, to: hal, says: `That C–${x} bond breaks and the halogen, now bonded only to the other carbon, is neutral again.` },
        ],
        hints: [`${cap(solvent)} is present in far greater amounts than ${x === 'Br' ? 'bromide' : 'chloride'}, so it is the nucleophile that wins.`, 'Which ring carbon carries more of the positive charge?'],
        move: { [o]: [0.5, -0.866], [hal]: [1.5, 0.866], ...(me ? { [me]: [1, -1.732] as [number, number] } : {}) },
        explanation: `A protonated ${solvent === 'water' ? 'alcohol' : 'ether'}; losing a proton gives ${product}. In the ${ionName} ion the more substituted carbon carries more of the positive charge (the C–${x} bond to that carbon is the longer, weaker one), so the nucleophile attacks there, even though it is more hindered. The attack is anti to the ring halogen; that shows in a ring, where cyclohexene gives the trans product. ${alkene.methyl && alkene.chain === 1 ? 'Here the product has no stereocentre.' : 'Here the product has one stereocentre and forms as a racemate.'}${x === 'Cl' ? ' A chloronium ion is bridged less strongly than a bromonium ion, so it is more like an open carbocation, but it is still opened at the same carbon.' : ''}`,
      }],
      expect: { bonds: [`${o}-${c1}`, `${c2}-${hal}`, `${c1}-${c2}:1`], absent: [`${c1}-${hal}`], charges: { [o]: 1 } },
    };
  },
};

export const HALONIUM_TEMPLATES: readonly Template[] = [haloniumOpening];
