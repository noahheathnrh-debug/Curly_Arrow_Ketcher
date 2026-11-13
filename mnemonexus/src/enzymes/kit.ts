import type { AtomDef, BondDef, Element, Order } from './engine';

/**
 * Drawing helpers for enzyme scenes: a scene is a list of atoms with coordinates and a list of bonds. Fragments
 * (a carboxylate, an imidazole, a water) are drawn once here, in their own coordinates, and placed anywhere with a
 * rotation, so the same residue looks the same in every activity.
 *
 * Coordinates: x to the right, y UP. One unit is one bond length. Angles are degrees, anticlockwise from east.
 */

export class Scene {
  atoms: AtomDef[] = [];
  bonds: BondDef[] = [];
  private known = new Map<string, AtomDef>();

  atom(id: string, el: Element, x: number, y: number, opts: { charge?: number; alias?: string } = {}): string {
    if (this.known.has(id)) throw new Error(`atom "${id}" already in the scene`);
    const def: AtomDef = { id, el, x: round(x), y: round(y), ...(opts.charge ? { charge: opts.charge } : {}), ...(opts.alias ? { alias: opts.alias } : {}) };
    this.atoms.push(def);
    this.known.set(id, def);
    return id;
  }

  /** An atom placed `len` away from an existing one, at `angle`. */
  at(id: string, el: Element, from: string, angle: number, len = 1, opts: { charge?: number; alias?: string } = {}): string {
    const base = this.get(from);
    const a = (angle * Math.PI) / 180;
    return this.atom(id, el, base.x + len * Math.cos(a), base.y + len * Math.sin(a), opts);
  }

  /** The same, and bonded to the atom it was placed from. */
  grow(id: string, el: Element, from: string, angle: number, len = 1, order: Order = 1, opts: { charge?: number; alias?: string; wedge?: 'up' | 'down' } = {}): string {
    this.at(id, el, from, angle, len, opts);
    this.bond(from, id, order, opts.wedge);
    return id;
  }

  bond(a: string, b: string, order: Order = 1, wedge?: 'up' | 'down'): void {
    this.get(a); this.get(b);
    this.bonds.push({ a, b, order, ...(wedge ? { wedge } : {}) });
  }

  contact(a: string, b: string): void {
    this.bond(a, b, 'contact');
  }

  get(id: string): AtomDef {
    const atom = this.known.get(id);
    if (!atom) throw new Error(`no atom "${id}" in the scene`);
    return atom;
  }

  pos(id: string): [number, number] {
    const atom = this.get(id);
    return [atom.x, atom.y];
  }

  /** Shift the whole scene so it sits around the origin; keeps coordinates small and the editor's fit predictable. */
  centred(): { atoms: AtomDef[]; bonds: BondDef[] } {
    return { atoms: this.atoms, bonds: this.bonds };
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000;

const turn = (x: number, y: number, deg: number, flip: boolean): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const yy = flip ? -y : y;
  return [x * Math.cos(a) - yy * Math.sin(a), x * Math.sin(a) + yy * Math.cos(a)];
};

/** `anchor` says which atom (x, y) means, for fragments that can be placed by the atom that reacts. */
interface Placement { x: number; y: number; rot?: number; flip?: boolean; anchor?: 'O2' | 'O1' }

function place(s: Scene, prefix: string, p: Placement, local: { id: string; el: Element; x: number; y: number; charge?: number; alias?: string }[]) {
  for (const atom of local) {
    const [dx, dy] = turn(atom.x, atom.y, p.rot ?? 0, p.flip ?? false);
    s.atom(`${prefix}.${atom.id}`, atom.el, p.x + dx, p.y + dy, { charge: atom.charge, alias: atom.alias });
  }
}

/**
 * A carboxylate side chain, R-C(=O)-O(-): ids `.R` (labelled), `.C`, `.O1` (the C=O oxygen), `.O2` (the O-).
 * With `acid` the O2 carries an explicit hydrogen `.H` and no charge. Origin is the labelled atom, pointing east.
 */
export function carboxylate(s: Scene, prefix: string, label: string, p0: Placement, opts: { acid?: boolean } = {}): void {
  let p = p0;
  if (p0.anchor) {
    const local = p0.anchor === 'O2' ? [2.0, -0.87] : [2.0, 0.87];
    const [dx, dy] = turn(local[0], local[1], p0.rot ?? 0, p0.flip ?? false);
    p = { ...p0, x: p0.x - dx, y: p0.y - dy, anchor: undefined };
  }
  place(s, prefix, p, [
    { id: 'R', el: 'C', x: 0, y: 0, alias: label },
    { id: 'C', el: 'C', x: 1.5, y: 0 },
    { id: 'O1', el: 'O', x: 2.0, y: 0.87 },
    { id: 'O2', el: 'O', x: 2.0, y: -0.87, charge: opts.acid ? 0 : -1 },
    ...(opts.acid ? [{ id: 'H', el: 'H' as Element, x: 2.8, y: -1.35 }] : []),
  ]);
  s.bond(`${prefix}.R`, `${prefix}.C`);
  s.bond(`${prefix}.C`, `${prefix}.O1`, 2);
  s.bond(`${prefix}.C`, `${prefix}.O2`);
  if (opts.acid) s.bond(`${prefix}.O2`, `${prefix}.H`);
}

/**
 * An imidazole (histidine). Ring atoms `.N3` (the one with the lone pair that acts as a base), `.C2`, `.N1` (carries
 * the ring N-H), `.C5`, `.C4`, and the labelled side-chain atom `.R` on C4. Origin is the ring centre. With the
 * default placement N3 is at the top and the ring is drawn clockwise as N3, C2, N1, C5, C4... see the angles below.
 */
export function imidazole(s: Scene, prefix: string, label: string, p: Placement, opts: { protonatedN3?: boolean; explicitH?: boolean } = {}): void {
  const radius = 0.85;
  const at = (deg: number): [number, number] => [radius * Math.cos((deg * Math.PI) / 180), radius * Math.sin((deg * Math.PI) / 180)];
  const [n3x, n3y] = at(90), [c2x, c2y] = at(162), [n1x, n1y] = at(234), [c5x, c5y] = at(306), [c4x, c4y] = at(18);
  const rx = c4x + 1.5 * Math.cos((18 * Math.PI) / 180), ry = c4y + 1.5 * Math.sin((18 * Math.PI) / 180);
  place(s, prefix, p, [
    { id: 'N3', el: 'N', x: n3x, y: n3y, charge: opts.protonatedN3 ? 1 : 0 },
    { id: 'C2', el: 'C', x: c2x, y: c2y },
    { id: 'N1', el: 'N', x: n1x, y: n1y },
    { id: 'C5', el: 'C', x: c5x, y: c5y },
    { id: 'C4', el: 'C', x: c4x, y: c4y },
    { id: 'R', el: 'C', x: rx, y: ry, alias: label },
  ]);
  s.bond(`${prefix}.N3`, `${prefix}.C2`, 2);
  s.bond(`${prefix}.C2`, `${prefix}.N1`);
  s.bond(`${prefix}.N1`, `${prefix}.C5`);
  s.bond(`${prefix}.C5`, `${prefix}.C4`, 2);
  s.bond(`${prefix}.C4`, `${prefix}.N3`);
  s.bond(`${prefix}.C4`, `${prefix}.R`);
  if (opts.protonatedN3 && opts.explicitH) {
    // The proton sits outside the ring, along the line from the centre through N3.
    const [nx, ny] = turn(n3x, n3y, p.rot ?? 0, p.flip ?? false);
    const [ux, uy] = turn(0, 1, p.rot ?? 0, p.flip ?? false);
    s.atom(`${prefix}.H`, 'H', p.x + nx + ux, p.y + ny + uy);
    s.bond(`${prefix}.N3`, `${prefix}.H`);
  }
}

/** Water: `.O` with explicit hydrogens `.Ha` and `.Hb`. Origin is the oxygen. */
export function water(s: Scene, prefix: string, p: Placement): void {
  place(s, prefix, p, [
    { id: 'O', el: 'O', x: 0, y: 0 },
    { id: 'Ha', el: 'H', x: -0.8, y: -0.6 },
    { id: 'Hb', el: 'H', x: 0.8, y: -0.6 },
  ]);
  s.bond(`${prefix}.O`, `${prefix}.Ha`);
  s.bond(`${prefix}.O`, `${prefix}.Hb`);
}

/**
 * A backbone N-H: `.N` bonded to two unlabelled carbons `.A` and `.B` (the chain either side). Its hydrogen is
 * implicit. Origin is the nitrogen; the hydrogen points down by default, towards a contact drawn below it.
 */
export function backboneNH(s: Scene, prefix: string, p: Placement): void {
  place(s, prefix, p, [
    { id: 'N', el: 'N', x: 0, y: 0 },
    { id: 'A', el: 'C', x: -0.87, y: 0.5, alias: 'R' },
    { id: 'B', el: 'C', x: 0.87, y: 0.5, alias: 'R' },
  ]);
  s.bond(`${prefix}.N`, `${prefix}.A`);
  s.bond(`${prefix}.N`, `${prefix}.B`);
}

/** A regular hexagon of carbons `.1` to `.6` clockwise from the top, origin at the centre, radius one bond. */
export function hexagon(s: Scene, prefix: string, p: Placement, ids: string[] = ['1', '2', '3', '4', '5', '6'], doubles: number[] = [], elements: Record<string, Element> = {}): void {
  const local = ids.map((id, i) => {
    const a = (90 - 60 * i) * (Math.PI / 180);
    return { id, el: (elements[id] ?? 'C') as Element, x: Math.cos(a), y: Math.sin(a) };
  });
  place(s, prefix, p, local);
  ids.forEach((id, i) => s.bond(`${prefix}.${id}`, `${prefix}.${ids[(i + 1) % 6]}`, doubles.includes(i) ? 2 : 1));
}

export { place };
export type { Placement };
