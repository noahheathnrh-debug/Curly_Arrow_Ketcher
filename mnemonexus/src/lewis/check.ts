import { sameStructure } from '../engine/canonical';
import type { EditorStructLike } from '../engine/drawn';
import { defaultHydrogens } from '../engine/ket';
import { ELEMENTS, type Structure } from '../engine/molecule';
import type { LewisSpecies } from './species';

/**
 * The Draw & check rules. A good Lewis structure here keeps the skeleton's atoms and connections, shows every hydrogen
 * (the editor adds hydrogens to an atom short of bonds, and each one it adds means a bond or charge is missing), gives
 * every atom its octet (boron, beryllium and aluminium may stop at the bonds they can make; hydrogen has two), adds up
 * to the species' charge, and has as few formal charges as possible. Expanded octets and radicals are outside this set.
 *
 * The right answers are not written by hand: every bond order of the skeleton is tried, and the forms with complete
 * octets and the fewest formal charges are the answers. Two or more such forms are resonance forms.
 */
export interface LewisForm { orders: number[]; charges: number[]; score: number }

const MAY_STOP_SHORT = new Set(['B', 'Be', 'Al']);
const OCTET = new Set(['C', 'N', 'O', 'F', 'Cl', 'Br', 'I']);
/**
 * The bonds an atom can make with a charge: from nitrogen rightwards a + charge adds one (ammonium, oxonium, bromonium)
 * and a − charge takes one away; carbon loses one either way; boron and its group gain one with a − charge (BH4−).
 */
function allowedBonds(el: string, charge: number): number {
  if (el === 'H') return 1 - Math.abs(charge);
  const v = ELEMENTS[el].valence;
  return v >= 5 ? usualBonds(el) + charge : v === 4 ? usualBonds(el) - Math.abs(charge) : usualBonds(el) - charge;
}

/** The bonds an element makes when neutral with a full octet (or all its valence electrons, for boron and the like). */
export function usualBonds(el: string): number {
  if (el === 'H') return 1;
  const v = ELEMENTS[el].valence;
  return MAY_STOP_SHORT.has(el) ? v : 8 - v;
}

/** The charge that gives an atom with `bonds` bonds its octet, within ±1; null when none does. */
function octetCharge(el: string, bonds: number): number | null {
  if (el === 'H') return bonds === 1 ? 0 : null;
  if (bonds > 4) return null;
  if (MAY_STOP_SHORT.has(el) && bonds === ELEMENTS[el].valence) return 0;
  const charge = bonds + ELEMENTS[el].valence - 8;
  return Math.abs(charge) <= 1 ? charge : null;
}

/** Every complete-octet form of the skeleton with the species' charge, best (fewest formal charges) first. */
export function allForms(species: LewisSpecies): LewisForm[] {
  const { atoms, bonds } = species.skeleton;
  const free = bonds.map((b, i) => (atoms.find((a) => a.id === b.a)!.el === 'H' || atoms.find((a) => a.id === b.b)!.el === 'H' ? -1 : i)).filter((i) => i >= 0);
  if (free.length > 9) throw new Error(`${species.id}: too many bonds to try every order`);
  const forms: LewisForm[] = [];
  for (let n = 0; n < 3 ** free.length; n++) {
    const orders = bonds.map(() => 1);
    free.forEach((bond, k) => { orders[bond] = 1 + (Math.floor(n / 3 ** k) % 3); });
    const charges: number[] = [];
    for (const atom of atoms) {
      const sum = bonds.reduce((s, b, i) => s + (b.a === atom.id || b.b === atom.id ? orders[i] : 0), 0);
      const charge = octetCharge(atom.el, sum);
      if (charge === null) break;
      charges.push(charge);
    }
    if (charges.length !== atoms.length || charges.reduce((s, c) => s + c, 0) !== species.charge) continue;
    forms.push({ orders, charges, score: charges.reduce((s, c) => s + Math.abs(c), 0) });
  }
  return forms.sort((a, b) => a.score - b.score);
}

/** The answers: the forms with the fewest formal charges. */
export function bestForms(species: LewisSpecies): LewisForm[] {
  const forms = allForms(species);
  return forms.filter((f) => f.score === forms[0]?.score);
}

/** The skeleton (or a form of it) as a KET document for the editor. */
export function lewisKet(species: LewisSpecies, form?: LewisForm): string {
  const { atoms, bonds } = species.skeleton;
  const index = new Map(atoms.map((a, i) => [a.id, i]));
  const mol = {
    type: 'molecule',
    atoms: atoms.map((a, i) => ({ label: a.el, location: [a.x, a.y, 0], ...(form?.charges[i] ? { charge: form.charges[i] } : {}) })),
    bonds: bonds.map((b, i) => ({ type: form?.orders[i] ?? 1, atoms: [index.get(b.a), index.get(b.b)] })),
  };
  return JSON.stringify({ root: { nodes: [{ $ref: 'mol0' }] }, mol0: mol });
}

export type LewisVerdict =
  | { verdict: 'right'; message: string; forms: number }
  | { verdict: 'close' | 'wrong'; message: string; notes: string[]; atoms: number[] }
  | { verdict: 'unreadable'; message: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const skeletonOnly = (atoms: { id: string; el: string }[], bonds: { a: string; b: string }[]): Structure => ({
  atoms: atoms.map((a) => ({ id: a.id, el: a.el, h: 0, lp: 0, rad: 0, charge: 0 })),
  bonds: bonds.map((b) => ({ a: b.a, b: b.b, order: 1 })),
});

export function checkLewis(struct: EditorStructLike, species: LewisSpecies, best: readonly LewisForm[]): LewisVerdict {
  const atoms = [...struct.atoms], bonds = [...struct.bonds];
  for (const [, atom] of atoms) {
    const info = ELEMENTS[atom.label];
    if (!info || info.metal || atom.alias || atom.pseudo) return { verdict: 'unreadable', message: `This drawing has an atom the checker does not handle (${atom.alias || atom.label}). Use only the atoms you were given.` };
  }
  if (bonds.some(([, b]) => ![1, 2, 3].includes(b.type))) return { verdict: 'unreadable', message: 'Use single, double or triple bonds only.' };

  const drawnSkeleton = skeletonOnly(atoms.map(([id, a]) => ({ id: `a${id}`, el: a.label })), bonds.map(([, b]) => ({ a: `a${b.begin}`, b: `a${b.end}` })));
  if (sameStructure(drawnSkeleton, skeletonOnly(species.skeleton.atoms, species.skeleton.bonds)) !== 'same')
    return { verdict: 'wrong', message: 'The atoms are joined differently from the skeleton you were given. Keep every atom and every connection; change only bond orders and charges. Start again to get the skeleton back.', notes: [], atoms: [] };

  const notes: string[] = [], flagged = new Set<number>();
  const flag = (id: number, note: string) => { flagged.add(id); if (!notes.includes(note)) notes.push(note); };
  let total = 0, score = 0, large = 0, radicals = 0;
  for (const [id, atom] of atoms) {
    const el = atom.label, info = ELEMENTS[el], name = cap(info.name);
    const charge = atom.charge ?? 0, rad = atom.radical === 2 ? 1 : 0;
    const sum = bonds.reduce((s, [, b]) => s + (b.begin === id || b.end === id ? b.type : 0), 0);
    const h = Number.isInteger(atom.implicitH) ? atom.implicitH! : defaultHydrogens(el, charge, sum, rad);
    total += charge; score += Math.abs(charge);
    if (Math.abs(charge) > 1) large += 1;
    if (rad) radicals += 1;
    // Too many bonds first: the editor shows a neutral nitrogen with four bonds as "NH", which is not a missing bond.
    const pairElectrons = info.valence - charge - sum - rad;
    const tooMany = sum > allowedBonds(el, charge) || pairElectrons < 0;
    if (h > 0 && !tooMany) {
      flag(id, `${name} has ${h === 1 ? 'a hydrogen' : `${h} hydrogens`} the editor added, because it has fewer bonds than it usually makes. Give it another bond, or a charge.`);
      continue;
    }
    if (tooMany) {
      flag(id, ELEMENTS[el].valence >= 5
        ? `${name} has more bonds than its charge allows: neutral ${info.name} makes ${usualBonds(el)}, and with a + charge it makes ${usualBonds(el) + 1}.`
        : `${name} has more bonds than it can make: ${usualBonds(el)} when neutral${el === 'H' ? '' : ', and fewer with a charge'}.`);
      continue;
    }
    if (pairElectrons % 2) {
      flag(id, `${name}’s bonds and charge leave it an unpaired electron. Change its charge or its bonds.`);
      continue;
    }
    const around = 2 * sum + pairElectrons + rad;
    const most = el === 'H' ? 2 : 8;
    if (around > most) flag(id, `${name} has ${around} electrons around it; it can hold ${most}.`);
    else if ((OCTET.has(el) && around < 8) || (el === 'H' && around < 2))
      flag(id, `${name} has only ${around} electrons around it. Give it another bond (a lone pair on a neighbour can become a π bond), or a lone pair (a negative charge).`);
  }
  if (radicals) notes.push('This drawing has an unpaired electron; every species here has its electrons in pairs.');
  if (total !== species.charge) notes.push(`The charges add up to ${signed(total)}, but ${species.formula} has a charge of ${signed(species.charge)}.`);
  if (notes.length) return { verdict: 'wrong', message: 'Not yet.', notes, atoms: [...flagged] };

  const fewest = best[0]?.score ?? 0;
  if (large) return { verdict: 'close', message: 'Every atom has its octet, but a charge of 2 on one atom is very unlikely. Share the charge out with a different bond.', notes: [], atoms: atoms.filter(([, a]) => Math.abs(a.charge ?? 0) > 1).map(([id]) => id) };
  if (score > fewest)
    return { verdict: 'close', message: `Every atom has its octet, but this structure has ${score} charged atoms where ${fewest === 0 ? 'none are' : fewest === 1 ? 'one is' : `${fewest} are`} needed. The best Lewis structure has as few formal charges as it can.`, notes: [], atoms: atoms.filter(([, a]) => a.charge).map(([id]) => id) };
  return { verdict: 'right', message: `Right. ${species.about}`, forms: best.length };
}
