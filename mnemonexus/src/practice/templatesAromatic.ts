import type { Rng, Template } from './templates';
import { Builder } from './species';

/**
 * Electrophilic aromatic substitution, as its two halves: the ring's π electrons attacking an electrophile (the slow
 * step, giving the arenium ion), and a base taking the proton so the ring is aromatic again. Benzene, methylbenzene
 * and methoxybenzene, attacked para to their substituent.
 *
 * The ring is drawn with H on C1 and C2. The editor moves the end of a π bond with fewer drawn bonds, so the attacked
 * carbon's π partner must show its hydrogen too, or the arrow would mean attack from C2.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => (s.startsWith('tert-') ? `tert-${s.charAt(5).toUpperCase()}${s.slice(6)}` : s.charAt(0).toUpperCase() + s.slice(1));
const at = (deg: number): [number, number] => [Math.round(Math.cos((deg * Math.PI) / 180) * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * 100) / 100];

type Sub = 'none' | 'methyl' | 'methoxy';
const RINGS: readonly { sub: Sub; name: string }[] = [
  { sub: 'none', name: 'benzene' },
  { sub: 'methyl', name: 'methylbenzene' },
  { sub: 'methoxy', name: 'methoxybenzene' },
];
const DIRECTING: Record<Sub, string> = {
  none: '',
  methyl: ' Attack para to the methyl group puts the positive charge, in one resonance form, on the carbon carrying the methyl, which stabilises it; ortho attack is favoured for the same reason, so methylbenzene reacts faster than benzene, at the ortho and para positions.',
  methoxy: ' Attack para to the methoxy group lets the oxygen’s lone pair share the positive charge, giving an extra resonance form with every atom an octet; methoxybenzene reacts much faster than benzene, at the ortho and para positions.',
};

/**
 * Benzene with C1 at the top and Kekulé bonds C1=C2, C3=C4, C5=C6, its substituent on C4 (para to C1). For the
 * arenium ion, C1 is sp3 (H upper right, the new group upper left) and C2 carries the positive charge.
 */
function ring(b: Builder, sub: Sub, arenium: boolean) {
  const c = [90, 30, 330, 270, 210, 150].map((deg, i) => b.atom('C', ...at(deg), arenium && i === 1 ? { charge: 1 } : {}));
  const orders: (1 | 2)[] = arenium ? [1, 1, 2, 1, 2, 1] : [2, 1, 2, 1, 2, 1];
  orders.forEach((order, i) => b.d.bond(c[i], c[(i + 1) % 6], order));
  const h1 = b.grow(c[0], 'H', arenium ? 60 : 90);
  b.grow(c[1], 'H', 30);
  if (sub === 'methyl') b.grow(c[3], 'C', 270);
  if (sub === 'methoxy') b.grow(b.grow(c[3], 'O', 270), 'C', 330);
  return { c1: c[0], c2: c[1], h1 };
}

/** An electrophile: what it is called, the product's name for each ring, and how its reacting atom is drawn. */
interface Electrophile {
  name: string;
  /** Where it comes from, on each ring. */
  source: (sub: Sub) => string;
  product: Record<Sub, string>;
  /** Said only for methoxybenzene, whose conditions differ. */
  methoxy?: string;
  hint?: string;
  /**
   * Draws the free electrophile with its reacting atom `e` at (x, y). `push` is the second arrow, which keeps the
   * reacting atom's octet (none for a carbocation); `after` is what the attack leaves.
   */
  free(b: Builder, x: number, y: number): { e: string; push?: { from: string; to: string; says: string }; after: { bonds: string[]; absent?: string[]; charges: Record<string, number> } };
  /** Draws the group as bonded to C1 in the arenium ion. */
  bonded(b: Builder, c1: string): string;
  note: string;
}
const acylium = (carbons: number, name: string, product: Record<Sub, string>): Electrophile => ({
  name, source: () => `made from ${carbons === 1 ? 'ethanoyl' : 'propanoyl'} chloride and AlCl3`, product,
  free(b, x, y) {
    const e = b.atom('C', x, y);
    const o = b.grow(e, 'O', 60, 3, { charge: 1 });
    b.chain(e, carbons, 210);
    return { e, push: { from: `${e}-${o}`, to: o, says: 'One C≡O π bond moves onto oxygen, so carbon keeps an octet.' }, after: { bonds: [`${e}-${o}:2`], charges: {} } };
  },
  bonded(b, c1) { const e = b.grow(c1, 'C', 120); b.grow(e, 'O', 60, 2); b.chain(e, carbons, 150); return e; },
  note: 'AlCl3 pulls chloride off the acyl chloride to make the acylium ion, R–C≡O+, the electrophile (Friedel–Crafts acylation). The ketone product is less reactive than the ring it came from, so only one acyl group goes on. In practice the ketone binds AlCl3, so at least one equivalent is used.',
});
const halogen = (el: 'Br' | 'Cl', name: string, product: Record<Sub, string>, acid: string): Electrophile => ({
  name, source: () => `${el}2 activated by ${acid}`, product,
  methoxy: ' Methoxybenzene would react without the Lewis acid; it is drawn with it so all the rings share one mechanism.',
  hint: `Attack the nearer ${el === 'Br' ? 'bromine' : 'chlorine'} atom; a second arrow breaks the ${el}–${el} bond.`,
  free(b, x, y) {
    const e = b.atom(el, x, y);
    const far = b.grow(e, el, 135);
    return { e, push: { from: `${e}-${far}`, to: far, says: `The ${el}–${el} bond breaks, and the far ${el === 'Br' ? 'bromine' : 'chlorine'} leaves as ${el === 'Br' ? 'bromide' : 'chloride'}.` }, after: { bonds: [], absent: [`${e}-${far}`], charges: { [far]: -1 } } };
  },
  bonded(b, c1) { return b.grow(c1, el, 120); },
  note: `${acid}, a Lewis acid, holds the far ${el === 'Br' ? 'bromine' : 'chlorine'} and makes the near one electron-poor; the ${el === 'Br' ? 'bromide' : 'chloride'} that leaves ends up as ${acid.replace('3', '4')}−.`,
});
const ELECTROPHILES: readonly Electrophile[] = [
  {
    name: 'the nitronium ion', source: (sub) => (sub === 'methoxy' ? 'made from dilute nitric acid' : 'made from concentrated nitric and sulfuric acids'),
    methoxy: ' Methoxybenzene is so reactive that dilute nitric acid is enough; mixed acid would nitrate it more than once.',
    product: { none: 'nitrobenzene', methyl: '1-methyl-4-nitrobenzene', methoxy: '1-methoxy-4-nitrobenzene' },
    free(b, x, y) {
      const e = b.atom('N', x, y, { charge: 1 });
      const oa = b.grow(e, 'O', 60, 2);
      b.grow(e, 'O', 240, 2);
      return { e, push: { from: `${e}-${oa}`, to: oa, says: 'One N=O π bond moves onto oxygen, so nitrogen keeps an octet.' }, after: { bonds: [`${e}-${oa}:1`], charges: { [e]: 1, [oa]: -1 } } };
    },
    bonded(b, c1) { const e = b.grow(c1, 'N', 120, 1, { charge: 1 }); b.grow(e, 'O', 60, 1, { charge: -1 }); b.grow(e, 'O', 180, 2); return e; },
    note: 'Sulfuric acid protonates nitric acid, which loses water to give the nitronium ion, NO2+.',
  },
  halogen('Br', 'bromine', { none: 'bromobenzene', methyl: '1-bromo-4-methylbenzene', methoxy: '1-bromo-4-methoxybenzene' }, 'FeBr3'),
  halogen('Cl', 'chlorine', { none: 'chlorobenzene', methyl: '1-chloro-4-methylbenzene', methoxy: '1-chloro-4-methoxybenzene' }, 'AlCl3'),
  acylium(1, 'the ethanoyl (acetyl) cation', { none: '1-phenylethanone', methyl: '1-(4-methylphenyl)ethanone', methoxy: '1-(4-methoxyphenyl)ethanone' }),
  acylium(2, 'the propanoyl cation', { none: '1-phenylpropan-1-one', methyl: '1-(4-methylphenyl)propan-1-one', methoxy: '1-(4-methoxyphenyl)propan-1-one' }),
  {
    name: 'the tert-butyl cation', source: () => 'made from 2-chloro-2-methylpropane and AlCl3',
    methoxy: ' (A milder Lewis acid suits methoxybenzene.)',
    product: { none: 'tert-butylbenzene', methyl: '1-tert-butyl-4-methylbenzene', methoxy: '1-tert-butyl-4-methoxybenzene' },
    free(b, x, y) {
      const e = b.atom('C', x - 0.2, y + 0.1, { charge: 1 });
      for (const deg of [30, 150, 270]) b.grow(e, 'C', deg);
      return { e, after: { bonds: [], charges: {} } };
    },
    bonded(b, c1) { const e = b.grow(c1, 'C', 120); for (const deg of [60, 120, 180]) b.grow(e, 'C', deg); return e; },
    note: 'AlCl3 pulls chloride off the tertiary alkyl chloride, leaving the tert-butyl cation (Friedel–Crafts alkylation). The alkylated ring is more reactive than benzene, so it can react again; the bulky tert-butyl group keeps a second group away from the ortho positions, so under mild conditions the 1,4-product dominates.',
  },
];

const sets = RINGS.flatMap((r) => ELECTROPHILES.map((e) => ({ r, e })));

export const areniumFormation: Template = {
  id: 'arenium-formation',
  title: 'An aromatic ring attacks an electrophile',
  phrase: 'arenium formation',
  skill: 'aromatic-substitution',
  variants: sets.length,
  make(rng) {
    const { r, e } = pick(rng, sets);
    const b = new Builder();
    const { c1, c2 } = ring(b, r.sub, false);
    const free = e.free(b, -1.3, 2.3);
    const arrows = [{ from: `${c1}-${c2}`, to: `${c1}-${free.e}`, says: `Two of the ring’s π electrons attack ${e.name}.` }, ...(free.push ? [free.push] : [])];
    return {
      id: 'practice-arenium-formation', title: `${cap(r.name)} and ${e.name}`, unit: 'Aromatic substitution', skill: 'aromatic-substitution', level: 2,
      summary: `The slow step of an electrophilic aromatic substitution: ${r.name} attacks ${e.name} (${e.source(r.sub)}).`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'The ring attacks', prompt: `Show ${r.name} attacking ${e.name} through its top carbon.`,
        arrows,
        hints: ['The ring is the nucleophile: start the arrow from a C=C of the ring.', e.hint ?? (free.push ? 'A second arrow moves electrons off the electrophile, so no atom goes past an octet.' : 'The cation has an empty orbital, so one arrow is enough.')],
        explanation: `The arenium ion: the ring has lost its aromaticity, and the positive charge is shared by resonance over three ring carbons. ${e.note}${r.sub === 'methoxy' ? e.methoxy ?? '' : ''}${DIRECTING[r.sub]} A base then takes the proton to give ${e.product[r.sub]}.`,
      }],
      expect: { bonds: [`${c1}-${free.e}`, `${c1}-${c2}:1`, ...free.after.bonds], ...(free.after.absent ? { absent: free.after.absent } : {}), charges: { [c2]: 1, ...free.after.charges } },
    };
  },
};

/** The base that takes the proton, for each electrophile's conditions. */
const BASE: Record<string, { el: 'O' | 'Br' | 'Cl'; name: string; charge: number; acid: string; after: string }> = {
  N: { el: 'O', name: 'water', charge: 0, acid: 'H3O+', after: '' },
  Br: { el: 'Br', name: 'the bromide in FeBr4−', charge: -1, acid: 'HBr', after: ' The proton leaves as HBr, and FeBr3 is regenerated.' },
  Cl: { el: 'Cl', name: 'a chloride of AlCl4−', charge: -1, acid: 'HCl', after: ' The proton leaves as HCl, and AlCl3 is regenerated.' },
  C: { el: 'Cl', name: 'a chloride of AlCl4−', charge: -1, acid: 'HCl', after: ' The proton leaves as HCl.' },
};

export const rearomatisation: Template = {
  id: 'rearomatisation',
  title: 'The arenium ion loses a proton',
  phrase: 'rearomatisation',
  skill: 'aromatic-substitution',
  variants: sets.length,
  make(rng) {
    const { r, e } = pick(rng, sets);
    const b = new Builder();
    const { c1, c2, h1 } = ring(b, r.sub, true);
    const group = e.bonded(b, c1);
    const base = BASE[b.d.get(group).el];
    // Charges the group keeps (a nitro group's N+ and O−); the ring's C+ goes.
    const kept = Object.fromEntries(b.atoms.filter((a) => a.charge && a.id !== c2).map((a) => [a.id, a.charge!]));
    const x = b.atom(base.el, 1.5, 2.6, base.charge ? { charge: base.charge } : {});
    return {
      id: 'practice-rearomatisation', title: `The arenium ion from ${r.name} and ${e.name}`, unit: 'Aromatic substitution', skill: 'aromatic-substitution', level: 2,
      summary: `The fast step of an electrophilic aromatic substitution: ${base.name} takes the proton from the arenium ion, and the ring is aromatic again.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'The proton goes', prompt: `Show ${base.name} taking the proton from the carbon that carries the new group.`,
        arrows: [
          { from: x, to: `${x}-${h1}`, says: `A lone pair on ${base.name} takes the proton on the carbon that carries the new group.` },
          { from: `${c1}-${h1}`, to: `${c1}-${c2}`, side: -1, says: 'The C–H electrons move back into the ring, next to the positive carbon, so the ring is aromatic again.' },
        ],
        hints: ['The ring regains its aromaticity by losing H+, not by adding a nucleophile.', 'Take the proton from the carbon that carries the new group; the C–H electrons go into the ring.'],
        explanation: `${cap(e.product[r.sub])} and ${base.acid}. Losing a proton restores the aromatic π system, which is why an aromatic ring does substitution where an alkene would do addition.${base.after}`,
      }],
      expect: { bonds: [`${x}-${h1}`, `${c1}-${c2}:2`], absent: [`${c1}-${h1}`], charges: { ...kept, ...(base.charge ? {} : { [x]: 1 }) } },
    };
  },
};

export const AROMATIC_TEMPLATES: readonly Template[] = [areniumFormation, rearomatisation];
