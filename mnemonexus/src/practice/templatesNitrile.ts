import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * Hydroxide adds to the carbon of a nitrile's C≡N: the first step of hydrolysing a nitrile in base. The nitrile is
 * drawn straight, its chain to the west and N to the east, with hydroxide above; once it has added, the carbon is
 * drawn trigonal and the chain swings down by 30°.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

/** Carbons in the group on the nitrile carbon: 1 is ethanenitrile. Different lengths only, so every puzzle differs. */
export const NITRILE_GROUPS = [1, 2, 3, 4, 5, 6] as const;
const NITRILE = ['', 'ethanenitrile', 'propanenitrile', 'butanenitrile', 'pentanenitrile', 'hexanenitrile', 'heptanenitrile'];
const AMIDE = ['', 'ethanamide', 'propanamide', 'butanamide', 'pentanamide', 'hexanamide', 'heptanamide'];
const SALT = ['', 'ethanoate', 'propanoate', 'butanoate', 'pentanoate', 'hexanoate', 'heptanoate'];

export const nitrileAddition: Template = {
  id: 'nitrile-addition',
  title: 'Hydroxide adds to a nitrile',
  phrase: 'hydroxide adding to a nitrile',
  skill: 'carbonyl-addition',
  variants: NITRILE_GROUPS.length,
  make(rng) {
    const carbons = pick(rng, NITRILE_GROUPS);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const n = b.grow(c, 'N', 0, 3);
    const first = b.grow(c, 'C', 180);
    const chain = [first, ...b.chain(first, carbons - 1, 180)];
    const o = b.atom('O', 0, 1.6, { charge: -1 });
    const h = b.grow(o, 'H', 30);
    const at = (id: string) => b.atoms.find((a) => a.id === id)!;
    // The chain turns 30° anticlockwise about the nitrile carbon, so its first bond points at 210°.
    const turn = (id: string): [number, number] => {
      const { x, y } = at(id);
      return [x * Math.cos(Math.PI / 6) - y * Math.sin(Math.PI / 6), x * Math.sin(Math.PI / 6) + y * Math.cos(Math.PI / 6)];
    };
    const nitrile = NITRILE[carbons];
    return {
      id: 'practice-nitrile-addition', title: `Hydroxide and ${nitrile}`, unit: 'Acyl substitution', skill: 'carbonyl-addition', level: 2,
      summary: `Hydroxide adds to the nitrile carbon of ${nitrile}, the first step in hydrolysing it to ${AMIDE[carbons]} and then ${SALT[carbons]} ions.`,
      atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Addition to the C≡N', prompt: `Show hydroxide adding to ${nitrile}.`,
        arrows: [
          { from: o, to: `${o}-${c}`, says: 'A lone pair on hydroxide attacks the nitrile carbon.' },
          { from: `${c}-${n}`, to: n, says: 'One C≡N π bond moves onto nitrogen.' },
        ],
        hints: [
          'Nitrogen is more electronegative than carbon, so the nitrile carbon is electrophilic, like a carbonyl carbon.',
          'Two arrows: the nucleophile in, one π bond out.',
        ],
        explanation: `The nitrogen now carries the negative charge. Water protonates it, and two more proton transfers turn the product into ${AMIDE[carbons]}; heated for longer in the alkali, that amide is hydrolysed to ${SALT[carbons]} ions and ammonia.`,
        move: {
          [n]: [0.866, -0.5], [o]: [0, 1], [h]: [0.866, 1.5],
          ...Object.fromEntries(chain.map((id) => [id, turn(id)])),
        },
      }],
      expect: { bonds: [`${o}-${c}`, `${c}-${n}:2`], charges: { [n]: -1 } },
    };
  },
};

export const NITRILE_TEMPLATES: readonly Template[] = [nitrileAddition];
