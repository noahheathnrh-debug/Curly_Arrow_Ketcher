import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * The Beckmann rearrangement, from the O-protonated oxime: the group anti to the leaving water moves from carbon to
 * nitrogen as the N–O bond breaks, giving a nitrilium ion, which water then attacks. The C=N is drawn upright (carbon
 * below), the OH2+ upper right of nitrogen, the anti group lower left of carbon and the syn group lower right.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

type Group = 'Me' | 'Et' | 'Pr' | 'iPr' | 'tBu';
const GROUP_NAME: Record<Group, string> = { Me: 'methyl', Et: 'ethyl', Pr: 'propyl', iPr: 'propan-2-yl', tBu: 'tert-butyl' };
/** stereo: E when the OH is anti to the higher-priority group on carbon (tBu > iPr > Pr > Et > Me). */
interface Oxime { ketone: string; anti: Group; syn: Group; stereo: '' | 'E' | 'Z'; amide: string }
const OXIMES: readonly Oxime[] = [
  { ketone: 'propanone', anti: 'Me', syn: 'Me', stereo: '', amide: 'N-methylethanamide' },
  { ketone: 'pentan-3-one', anti: 'Et', syn: 'Et', stereo: '', amide: 'N-ethylpropanamide' },
  { ketone: '2,4-dimethylpentan-3-one', anti: 'iPr', syn: 'iPr', stereo: '', amide: '2-methyl-N-(propan-2-yl)propanamide' },
  { ketone: 'butanone', anti: 'Et', syn: 'Me', stereo: 'E', amide: 'N-ethylethanamide' },
  { ketone: 'butanone', anti: 'Me', syn: 'Et', stereo: 'Z', amide: 'N-methylpropanamide' },
  { ketone: 'pentan-2-one', anti: 'Pr', syn: 'Me', stereo: 'E', amide: 'N-propylethanamide' },
  { ketone: 'pentan-2-one', anti: 'Me', syn: 'Pr', stereo: 'Z', amide: 'N-methylbutanamide' },
  { ketone: '3-methylbutan-2-one', anti: 'iPr', syn: 'Me', stereo: 'E', amide: 'N-(propan-2-yl)ethanamide' },
  { ketone: '3-methylbutan-2-one', anti: 'Me', syn: 'iPr', stereo: 'Z', amide: 'N,2-dimethylpropanamide' },
  { ketone: '3,3-dimethylbutan-2-one', anti: 'Me', syn: 'tBu', stereo: 'Z', amide: 'N,2,2-trimethylpropanamide' },
  { ketone: 'hexan-3-one', anti: 'Pr', syn: 'Et', stereo: 'E', amide: 'N-propylpropanamide' },
  { ketone: 'hexan-3-one', anti: 'Et', syn: 'Pr', stereo: 'Z', amide: 'N-ethylbutanamide' },
  { ketone: '2-methylpentan-3-one', anti: 'iPr', syn: 'Et', stereo: 'E', amide: 'N-(propan-2-yl)propanamide' },
  { ketone: '2-methylpentan-3-one', anti: 'Et', syn: 'iPr', stereo: 'Z', amide: 'N-ethyl-2-methylpropanamide' },
  { ketone: '2,2-dimethylpentan-3-one', anti: 'Et', syn: 'tBu', stereo: 'Z', amide: 'N-ethyl-2,2-dimethylpropanamide' },
];

/** Draws a group on `from`, its first bond at `angle`, zigzagging towards `turn`; returns its atom ids, first first. */
function group(b: Builder, from: string, g: Group, angle: number, turn: 1 | -1): string[] {
  const first = b.grow(from, 'C', angle);
  const ids = [first];
  if (g === 'Et' || g === 'Pr') {
    const second = b.grow(first, 'C', angle - 60 * turn);
    ids.push(second);
    if (g === 'Pr') ids.push(b.grow(second, 'C', angle));
  }
  if (g === 'iPr' || g === 'tBu') ids.push(b.grow(first, 'C', angle - 60), b.grow(first, 'C', angle + 60));
  if (g === 'tBu') ids.push(b.grow(first, 'C', angle));
  return ids;
}

export const beckmann: Template = {
  id: 'beckmann',
  title: 'The Beckmann rearrangement',
  phrase: 'Beckmann rearrangement',
  skill: 'rearrangement',
  variants: OXIMES.length,
  make(rng) {
    const ox = pick(rng, OXIMES);
    const b = new Builder();
    const c = b.atom('C', 0, 0);
    const n = b.grow(c, 'N', 90, 2);
    const o = b.grow(n, 'O', 30, 1, { charge: 1 });
    const anti = group(b, c, ox.anti, 210, 1);
    const syn = group(b, c, ox.syn, 330, -1);
    const at = (id: string) => b.atoms.find((a) => a.id === id)!;
    /** Turns atoms about the carbon by `deg`, then shifts them by (dx, dy). */
    const turn = (ids: string[], deg: number, dx = 0, dy = 0) => {
      const r = (deg * Math.PI) / 180;
      return Object.fromEntries(ids.map((id) => {
        const { x, y } = at(id);
        return [id, [x * Math.cos(r) - y * Math.sin(r) + dx, x * Math.sin(r) + y * Math.cos(r) + dy] as [number, number]];
      }));
    };
    const oxime = `${ox.stereo ? `(${ox.stereo})-` : ''}${ox.ketone} oxime`;
    const mover = GROUP_NAME[ox.anti];
    const same = ox.anti === ox.syn;
    const close = ox.anti === 'Et' && ox.syn === 'Pr';
    const minor = ox.stereo !== 'Z' ? ''
      : close ? ' Ethyl and propyl are similar in size, so this Z oxime and its E isomer form in similar amounts; acid can also interconvert them.'
      : ' This Z oxime is the minor isomer: oximes form mainly with the OH anti to the larger group, and acid can interconvert the two, so in practice the larger group usually moves.';
    return {
      id: 'practice-beckmann', title: `The Beckmann rearrangement of ${oxime}`, unit: 'Rearrangements', skill: 'rearrangement', level: 3,
      summary: `In acid, ${oxime} rearranges to ${ox.amide}: the ${mover} group anti to the OH moves from carbon to nitrogen as water leaves.`, atoms: b.atoms, bonds: b.bonds,
      steps: [
        {
          name: 'A group moves to nitrogen as water leaves', prompt: 'Show the group anti to the OH2+ moving from carbon to nitrogen as water leaves.',
          arrows: [
            { from: `${anti[0]}-${c}`, to: `${anti[0]}-${n}`, side: -1, says: `The ${mover} group, anti to the leaving water, moves from carbon to nitrogen with its bonding pair.` },
            { from: `${n}-${o}`, to: o, says: 'At the same time the N–O bond breaks and water leaves.' },
          ],
          hints: ['Two arrows at once: a group moves to nitrogen as water leaves.', 'Which group on carbon is on the opposite side of the C=N from the OH2+?'],
          explanation: `A cation shared between carbon and nitrogen. The nitrogen lone pair can form a third C–N bond, so it is better drawn as a nitrilium ion (R–C≡N+–R′), with a full octet on every atom. The group that moves is the one anti (trans) to the leaving group across the C=N: its bond lies opposite the breaking N–O bond, so it can move to nitrogen as the water leaves.${same ? ' Here the two groups on carbon are the same, so the product is the same whichever is anti.' : ''}${minor}`,
          move: { ...turn(anti, -120, 0, 1), ...turn(syn, -60), [o]: [-1.5, 0] },
        },
        {
          name: 'Water adds to the cation', prompt: 'Show water adding to the positive carbon.',
          arrows: [
            { from: o, to: `${o}-${c}`, pair: 1, says: 'A lone pair on water attacks the positive carbon.' },
          ],
          hints: ['Water is the nucleophile; the carbon with only three bonds is the electrophile.'],
          explanation: `A protonated imidic acid. In the nitrilium picture, one of the C≡N π bonds moves onto nitrogen as water adds; the result is the same. It loses a proton to give the imidic acid, the less stable tautomer of an amide (as an enol is of a ketone): a proton moves from oxygen to nitrogen and the C=N becomes a C=O, giving ${ox.amide}.`,
          move: { ...turn(anti, 180, 0, 1), ...turn(syn, 0), [o]: [-0.866, -0.5] },
        },
      ],
      expect: { bonds: [`${anti[0]}-${n}`, `${c}-${n}:2`, `${o}-${c}`], absent: [`${anti[0]}-${c}`, `${n}-${o}`], charges: { [o]: 1 } },
    };
  },
};

export const BECKMANN_TEMPLATES: readonly Template[] = [beckmann];
