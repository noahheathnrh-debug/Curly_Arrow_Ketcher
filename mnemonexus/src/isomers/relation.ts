import { doubleBonds, stereocentres, type StereoMolecule } from './cip';
import type { Relation } from './species';

/**
 * How two drawn molecules are related, worked out rather than written down: the formula, then whether the atoms are
 * joined the same way (a graph match), then the R/S and E/Z labels compared through every match. Symmetric molecules
 * have several matches, which is how a meso compound drawn twice comes out as the same molecule.
 */

export function formula(m: StereoMolecule): string {
  const counts = new Map<string, number>();
  for (const atom of m.atoms) {
    counts.set(atom.el, (counts.get(atom.el) ?? 0) + 1);
    if (atom.h) counts.set('H', (counts.get('H') ?? 0) + atom.h);
  }
  const order = (el: string) => (el === 'C' ? '0' : el === 'H' ? '1' : `2${el}`);
  return [...counts].sort(([x], [y]) => (order(x) < order(y) ? -1 : 1)).map(([el, n]) => `${el}${n > 1 ? n : ''}`).join('');
}

const MAX_MATCHES = 5000;

/** Every way to lay `b`'s atoms onto `a`'s with the same elements, hydrogens, charges and bond orders. */
export function matches(a: StereoMolecule, b: StereoMolecule): number[][] {
  if (a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length) return [];
  const adjacency = (m: StereoMolecule) => {
    const out = m.atoms.map(() => new Map<number, number>());
    for (const bond of m.bonds) { out[bond.a].set(bond.b, bond.order); out[bond.b].set(bond.a, bond.order); }
    return out;
  };
  const [adjA, adjB] = [adjacency(a), adjacency(b)];
  const key = (m: StereoMolecule, adj: Map<number, number>[], i: number) =>
    `${m.atoms[i].el}|${m.atoms[i].h}|${m.atoms[i].charge}|${[...adj[i].values()].sort().join('')}`;
  const keysA = a.atoms.map((_, i) => key(a, adjA, i)), keysB = b.atoms.map((_, i) => key(b, adjB, i));
  // Visit a's atoms in breadth-first order, so each one placed has a placed neighbour to check against.
  const order: number[] = [];
  for (let start = 0; start < a.atoms.length; start++) {
    if (order.includes(start)) continue;
    const queue = [start];
    order.push(start);
    while (queue.length) for (const next of adjA[queue.shift()!].keys()) if (!order.includes(next)) { order.push(next); queue.push(next); }
  }
  const found: number[][] = [];
  const map = new Array<number>(a.atoms.length).fill(-1), used = new Set<number>();
  const place = (k: number) => {
    if (found.length >= MAX_MATCHES) return;
    if (k === order.length) { found.push([...map]); return; }
    const i = order[k];
    for (let j = 0; j < b.atoms.length; j++) {
      if (used.has(j) || keysA[i] !== keysB[j]) continue;
      let fits = true;
      for (const [n, bondOrder] of adjA[i]) if (map[n] >= 0 && adjB[j].get(map[n]) !== bondOrder) { fits = false; break; }
      if (!fits) continue;
      map[i] = j; used.add(j);
      place(k + 1);
      map[i] = -1; used.delete(j);
    }
  };
  place(0);
  return found;
}

export interface RelationResult {
  relation: Relation;
  /** The R/S labels on each drawing, and the E/Z labels, for the explanation. */
  labels: [string[], string[]];
  formulas: [string, string];
}

const describe = (m: StereoMolecule) => [
  ...stereocentres(m).map((c) => c.label),
  ...doubleBonds(m).filter((d) => d.label).map((d) => d.label!),
];

export function relate(a: StereoMolecule, b: StereoMolecule): RelationResult {
  const formulas: [string, string] = [formula(a), formula(b)];
  const labels: [string[], string[]] = [describe(a), describe(b)];
  if (formulas[0] !== formulas[1]) return { relation: 'not-isomers', labels, formulas };
  const found = matches(a, b);
  if (!found.length) return { relation: 'structural', labels, formulas };
  const centresA = stereocentres(a), centresB = new Map(stereocentres(b).map((c) => [c.atom, c.label]));
  const bondsA = doubleBonds(a).filter((d) => d.label), bondsB = doubleBonds(b).filter((d) => d.label);
  const ezOf = (x: number, y: number) => bondsB.find((d) => (d.a === x && d.b === y) || (d.a === y && d.b === x))?.label;
  let enantiomers = false;
  for (const map of found) {
    const rs = centresA.map((c) => (centresB.get(map[c.atom]) === c.label ? 'same' : centresB.has(map[c.atom]) ? 'inverted' : 'missing'));
    const ez = bondsA.map((d) => (ezOf(map[d.a], map[d.b]) === d.label ? 'same' : 'different'));
    if (rs.includes('missing')) continue;
    if (rs.every((r) => r === 'same') && ez.every((e) => e === 'same')) return { relation: 'same', labels, formulas };
    if (rs.length && rs.every((r) => r === 'inverted') && ez.every((e) => e === 'same')) enantiomers = true;
  }
  if (enantiomers) return { relation: 'enantiomers', labels, formulas };
  return { relation: centresA.length ? 'diastereomers' : 'ez', labels, formulas };
}

/** Why, in a sentence or two. */
export function explainRelation(result: RelationResult): string {
  const [la, lb] = result.labels.map((l) => (l.length ? l.join(', ') : 'none'));
  switch (result.relation) {
    case 'not-isomers': return `Different molecular formulas (${result.formulas[0]} and ${result.formulas[1]}), so they are not isomers at all.`;
    case 'structural': return `The same formula, ${result.formulas[0]}, but the atoms are joined in a different order: structural isomers.`;
    case 'same': return `The same atoms joined the same way, with the same arrangement in space (left: ${la}; right: ${lb}). It is one molecule, drawn two ways.`;
    case 'enantiomers': return `The same atoms joined the same way, but every stereocentre is inverted (left: ${la}; right: ${lb}). They are mirror images that cannot be laid on each other.`;
    case 'ez': return `The same atoms joined the same way; they differ only in how the groups sit about the C=C (left: ${la}; right: ${lb}), which cannot rotate.`;
    case 'diastereomers': return `The same atoms joined the same way, but only some of the stereocentres differ (left: ${la}; right: ${lb}). They are stereoisomers that are not mirror images.`;
  }
}
