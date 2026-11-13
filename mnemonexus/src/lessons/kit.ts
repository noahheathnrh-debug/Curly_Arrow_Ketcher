import type { MechanismArrowDescriptor, MechanismPuzzle } from 'ketcher-core';
import { applyArrows, parseEnd, type ArrowSpec } from '../engine/arrows';
import { defaultHydrogens } from '../engine/ket';
import { bondBetween, buildStructure, errorsOnly, type Structure } from '../engine/molecule';
import { typesetLesson } from './typeset';

/**
 * The lesson kit: a mechanism is written once, as a drawing plus each step's arrows (with a sentence for each), and
 * the engine computes everything else: every intermediate, the product, the answer key the editor compares against,
 * and the frames the Watch stage plays. A chain of steps is consistent by construction, and an arrow that breaks an
 * electron rule stops the build with the engine's reason.
 *
 * Coordinates: x to the right, y UP (as KET stores them); one unit is one bond. Hydrogens are implicit unless drawn
 * as atoms (an arrow can only reach a hydrogen that is drawn), and each atom's implicit count must be the one the
 * editor will compute, so what the learner sees is what the engine checks.
 */

export interface LessonAtom { id: string; el: string; x: number; y: number; charge?: number; rad?: number }
export interface LessonBond { a: string; b: string; order: 1 | 2 | 3; wedge?: 'up' | 'down' }

/** An arrow (engine terms: `from` an atom's lone pair or a bond `A-B`; `to` an atom or a bond, new or existing). */
export interface LessonArrow extends ArrowSpec {
  /** What this arrow does and why, in one sentence, for Watch. */
  says: string;
  /**
   * Which lone pair the arrow starts from, in the editor's order: the pair nearest the atom's hydrogen side (the right,
   * unless the label shows its H on the left) first. Drawing only; any pair on the atom is marked right. Set it when
   * pair 0 faces away from the arrow's end: from O− back into its own C–O bond, pair 0 loops over the top and the
   * router runs out of time.
   */
  pair?: number;
  /**
   * Which side of a source bond the tail sits on (the editor's sign; 1 when unset). Drawing only. Set it when side 1
   * faces a crowded neighbour: from a C–H with a second H beside it, side 1 can loop the arrow round that H.
   */
  side?: 1 | -1;
  /** Which side of an existing destination bond the head lands on (the editor's sign; tried 1 first when unset). Drawing only. */
  toSide?: 1 | -1;
  /**
   * For an arrow ending on an atom or making a new bond (the head lands on the atom receiving the electrons): the
   * direction the head arrives from, in degrees anticlockwise from east, as seen
   * from that atom (the editor's pinned approach). Drawing only. Set it on a fishhook from a bond to its own end atom,
   * which otherwise loops and can take over 3 s to route.
   */
  approach?: number;
}

export interface LessonStep {
  name: string;
  /** The question for this step in Your turn. */
  prompt: string;
  arrows: LessonArrow[];
  hints: string[];
  /** Shown once the step is answered, and under the result in Watch. */
  explanation: string;
  /** Layout before the next step: atoms that should move so the new structure reads well. */
  move?: Record<string, [number, number]>;
}

export interface LessonDef {
  id: string;
  title: string;
  /** The unit it belongs to ("Substitution"), for grouping. */
  unit: string;
  /** The practice-catalogue skill it trains. */
  skill: string;
  level: 1 | 2 | 3;
  /** One or two sentences: what happens and why it matters. */
  summary: string;
  atoms: LessonAtom[];
  bonds: LessonBond[];
  steps: LessonStep[];
  /** The Predict stage: draw what one step makes, starting from that step's structure. Default: the last step. */
  predict?: { step?: number; prompt: string; hints?: string[] };
  /** Practise: fresh puzzles from this practice template (src/practice/templates.ts). */
  practise?: { template: string; count?: number };
  /**
   * What the finished mechanism must look like, written from the textbook product, not from the arrows: bonds
   * ("A-B:2" a double bond, "A-B" any bond), bonds that must be gone, and non-zero formal charges. The build applies
   * the arrows and compares, so a wrong arrow cannot also be a wrong key.
   */
  expect: { bonds: string[]; absent?: string[]; charges?: Record<string, number> };
}

/** A small helper for drawing scenes by angle and bond length (degrees, anticlockwise from east). */
export class Drawing {
  atoms: LessonAtom[] = [];
  bonds: LessonBond[] = [];
  private known = new Map<string, LessonAtom>();

  atom(id: string, el: string, x: number, y: number, opts: { charge?: number; rad?: number } = {}): string {
    if (this.known.has(id)) throw new Error(`atom "${id}" is drawn twice`);
    const atom: LessonAtom = { id, el, x: round(x), y: round(y), ...(opts.charge ? { charge: opts.charge } : {}), ...(opts.rad ? { rad: opts.rad } : {}) };
    this.atoms.push(atom);
    this.known.set(id, atom);
    return id;
  }
  /** An atom `len` from another, at `angle`, bonded to it. */
  grow(id: string, el: string, from: string, angle: number, order: 1 | 2 | 3 = 1, opts: { charge?: number; rad?: number; len?: number; wedge?: 'up' | 'down' } = {}): string {
    const base = this.get(from), a = (angle * Math.PI) / 180, len = opts.len ?? 1;
    this.atom(id, el, base.x + len * Math.cos(a), base.y + len * Math.sin(a), opts);
    this.bond(from, id, order, opts.wedge);
    return id;
  }
  bond(a: string, b: string, order: 1 | 2 | 3 = 1, wedge?: 'up' | 'down'): void {
    this.get(a); this.get(b);
    this.bonds.push({ a, b, order, ...(wedge ? { wedge } : {}) });
  }
  get(id: string): LessonAtom {
    const atom = this.known.get(id);
    if (!atom) throw new Error(`no atom "${id}" in the drawing`);
    return atom;
  }
}
const round = (n: number) => Math.round(n * 1000) / 1000;

// ─── the engine's view, with coordinates ─────────────────────────────────────

interface Placed { structure: Structure; at: Map<string, { x: number; y: number }>; wedges: Map<string, 'up' | 'down'> }

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function engineOf(atoms: LessonAtom[], bonds: LessonBond[], label: string): Structure {
  const orders = new Map<string, number>();
  for (const b of bonds) { orders.set(b.a, (orders.get(b.a) ?? 0) + b.order); orders.set(b.b, (orders.get(b.b) ?? 0) + b.order); }
  const built = buildStructure({
    atoms: atoms.map((a) => ({ id: a.id, el: a.el, h: defaultHydrogens(a.el, a.charge ?? 0, orders.get(a.id) ?? 0, a.rad ?? 0), ...(a.charge ? { charge: a.charge } : {}), ...(a.rad ? { rad: a.rad } : {}) })),
    bonds: bonds.map(({ a, b, order }) => ({ a, b, order })),
  }, label);
  const errors = errorsOnly(built.issues);
  if (!built.structure || errors.length) throw new Error(`${label}: ${errors.map((i) => i.message).join(' ')}`);
  return built.structure;
}

/** After arrows, hydrogens stay where they were; the editor will recompute them, so they must agree. */
function checkHydrogens(structure: Structure, label: string) {
  for (const atom of structure.atoms) {
    const orders = structure.bonds.filter((b) => b.a === atom.id || b.b === atom.id).reduce((s, b) => s + b.order, 0);
    const editor = defaultHydrogens(atom.el, atom.charge, orders, atom.rad);
    if (editor !== atom.h) throw new Error(`${label}: ${atom.id} (${atom.el}) keeps ${atom.h} hydrogens, but the editor would draw ${editor}. Draw the hydrogens that move as atoms.`);
  }
}

/** Atoms and bonds in the order the editor numbers them: by connected fragment, each in drawing order. */
function editorOrder(placed: Placed, drawnOrder: string[]) {
  const parent = new Map(drawnOrder.map((id) => [id, id]));
  const find = (id: string): string => { let r = id; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(id, r); return r; };
  for (const b of placed.structure.bonds) parent.set(find(b.a), find(b.b));
  const rank = new Map<string, number>();
  for (const id of drawnOrder) if (!rank.has(find(id))) rank.set(find(id), rank.size);
  const atoms = [...drawnOrder].sort((x, y) => rank.get(find(x))! - rank.get(find(y))! || drawnOrder.indexOf(x) - drawnOrder.indexOf(y));
  const bonds = [...placed.structure.bonds].sort((x, y) => rank.get(find(x.a))! - rank.get(find(y.a))! || placed.structure.bonds.indexOf(x) - placed.structure.bonds.indexOf(y));
  return { atoms, bonds };
}

export interface Written { ket: string; atomIndex: Map<string, number>; bondIndex: Map<string, number>; bonds: [string, string][] }

const BOND_TYPE: Record<number, number> = { 1: 1, 2: 2, 3: 3 };

function writeKet(placed: Placed, drawnOrder: string[], arrows: MechanismArrowDescriptor[] = []): Written {
  const order = editorOrder(placed, drawnOrder);
  const atomIndex = new Map(order.atoms.map((id, i) => [id, i]));
  const byId = new Map(placed.structure.atoms.map((a) => [a.id, a]));
  const atoms = order.atoms.map((id) => {
    const atom = byId.get(id)!, p = placed.at.get(id)!;
    return { label: atom.el, location: [p.x, p.y, 0], ...(atom.charge ? { charge: atom.charge } : {}), ...(atom.rad ? { radical: 2 } : {}) };
  });
  const bondIndex = new Map(order.bonds.map((b, i) => [key(b.a, b.b), i]));
  const bonds = order.bonds.map((b) => {
    const wedge = placed.wedges.get(`${b.a}>${b.b}`), back = placed.wedges.get(`${b.b}>${b.a}`);
    const [first, second] = back && !wedge ? [b.b, b.a] : [b.a, b.b];
    const stereo = wedge ?? back;
    return { type: BOND_TYPE[b.order], atoms: [atomIndex.get(first), atomIndex.get(second)], ...(stereo ? { stereo: stereo === 'up' ? 1 : 6 } : {}) };
  });
  const nodes: unknown[] = [{ $ref: 'mol0' }];
  // Arrows carry rough end points as well as their anchors: the editor routes the curve itself, from the anchors.
  const point = (i: number) => placed.at.get(order.atoms[i])!;
  const middle = (bondId: number) => { const b = order.bonds[bondId], p = placed.at.get(b.a)!, q = placed.at.get(b.b)!; return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; };
  for (const a of arrows) {
    const start = a.source.kind === 'bond' ? middle(a.source.bondId) : point(a.source.atomId);
    const d = a.destination;
    const end = d.kind === 'atom' ? point(d.atomId) : d.kind === 'bond' ? middle(d.bondId) : point(d.atomId2);
    const data: Record<string, unknown> = { mode: a.kind === 'fishhook' ? 'fishhook-mechanism' : 'curly-mechanism', pos: [{ ...start, z: 0 }, { ...end, z: 0 }], height: 0.25, height2: 0.25, autoRoute: true };
    if (a.source.kind === 'lone-pair') data.lpAttach = { atomId: a.source.atomId, pairIdx: a.source.pairIdx ?? 0 };
    else if (a.source.kind === 'radical') data.raAttach = { atomId: a.source.atomId, radicalIdx: 0 };
    else data.bdAttach = { bondId: a.source.bondId, side: a.source.side ?? 1 };
    data.destAttach = a.destination;
    nodes.push({ type: 'arrow', data });
  }
  const ket = JSON.stringify({ root: { nodes }, mol0: { type: 'molecule', atoms, bonds } });
  return { ket, atomIndex, bondIndex, bonds: order.bonds.map((b) => [b.a, b.b]) };
}

// ─── arrows in the editor's terms ────────────────────────────────────────────

/** Explicit drawn degree: the editor calls the end of a source bond with fewer drawn bonds the one that migrates. */
const degree = (s: Structure, id: string) => s.bonds.filter((b) => b.a === id || b.b === id).length;

function describe(arrow: ArrowSpec & { pair?: number; side?: 1 | -1; toSide?: 1 | -1; approach?: number }, before: Structure, written: Written, label: string): { main: MechanismArrowDescriptor; alternates: MechanismArrowDescriptor[] } {
  const atom = (id: string) => written.atomIndex.get(id)!;
  const bondId = (a: string, b: string) => { const i = written.bondIndex.get(key(a, b)); if (i === undefined) throw new Error(`${label}: no bond ${a}-${b}`); return i; };
  const from = parseEnd(arrow.from)!, to = parseEnd(arrow.to)!;
  const kind = arrow.single ? 'fishhook' as const : 'curly' as const;
  const source: MechanismArrowDescriptor['source'] = from.kind === 'bond'
    ? { kind: 'bond', bondId: bondId(...from.atoms), ...(arrow.side ? { side: arrow.side } : {}) }
    : arrow.single ? { kind: 'radical', atomId: atom(from.atom), radicalIdx: 0 } : { kind: 'lone-pair', atomId: atom(from.atom), pairIdx: arrow.pair ?? 0 };
  const alternates: MechanismArrowDescriptor[] = [];
  let destination: MechanismArrowDescriptor['destination'];
  // The editor's y axis points down, so an anticlockwise angle in the drawing is clockwise there.
  if (to.kind === 'atom') destination = { kind: 'atom', atomId: atom(to.atom), ...(arrow.approach !== undefined ? { approach: (-arrow.approach * Math.PI) / 180 } : {}) };
  else {
    const [p, q] = to.atoms;
    const exists = !!bondBetween(before, p, q);
    // The atom that gives the electrons to the new bond: the lone-pair atom, or the end shared with the source bond.
    const donor = from.kind === 'atom' ? from.atom : from.atoms.find((id) => id === p || id === q);
    if (from.kind === 'bond' && donor && !exists) {
      const [a, b] = from.atoms, migrating = degree(before, a) <= degree(before, b) ? a : b;
      if (migrating !== donor) throw new Error(`${label}: the editor will treat ${migrating} as the end of ${a}-${b} that moves, not ${donor}`);
    }
    const other = donor === p ? q : p;
    const fresh = { kind: 'new-bond' as const, atomId1: atom(donor ?? p), atomId2: atom(donor ? other : q), ...(arrow.approach !== undefined ? { approach: (-arrow.approach * Math.PI) / 180 } : {}) };
    if (exists) {
      destination = { kind: 'bond', bondId: bondId(p, q), ...(arrow.toSide ? { side: arrow.toSide } : {}) };
      // A lone pair pushed onto an adjacent bond may equally be dropped as a "new" bond to the far atom.
      if (from.kind === 'atom' && donor) alternates.push({ kind, source, destination: fresh });
    } else destination = fresh;
  }
  return { main: { kind, source, destination }, alternates };
}

function alternativesOf(described: { main: MechanismArrowDescriptor; alternates: MechanismArrowDescriptor[] }[]) {
  let sets: MechanismArrowDescriptor[][] = [[]];
  for (const { main, alternates } of described) sets = sets.flatMap((set) => [main, ...alternates].map((choice) => [...set, choice]));
  return sets.slice(1);
}

// ─── building ────────────────────────────────────────────────────────────────

/** One picture in Watch: a document (with some arrows drawn) and what to say about it. */
export interface Frame { ket: string; title: string; says: string; step: number }

export interface BuiltLesson {
  def: LessonDef;
  /** Watch: the starting structure, each arrow in turn, each step's result. */
  frames: Frame[];
  /** Your turn: one puzzle per step (each step starts from the structure the previous one made). */
  puzzles: MechanismPuzzle[];
  /** Predict: the structure to start from, and the species the learner must end with. */
  predict: { ket: string; expected: Structure; answerKet: string; prompt: string; hints: string[] };
  /** The structure before each step, and the final one (for tests). */
  structures: Structure[];
}

export function buildLesson(written: LessonDef): BuiltLesson {
  const def = typesetLesson(written);
  const drawnOrder = def.atoms.map((a) => a.id);
  const wedges = new Map(def.bonds.filter((b) => b.wedge).map((b) => [`${b.a}>${b.b}`, b.wedge!]));
  let placed: Placed = {
    structure: engineOf(def.atoms, def.bonds, def.id),
    at: new Map(def.atoms.map((a) => [a.id, { x: a.x, y: a.y }])),
    wedges,
  };
  checkHydrogens(placed.structure, `${def.id} as drawn`);
  const frames: Frame[] = [], puzzles: MechanismPuzzle[] = [], structures: Structure[] = [];
  const starts: Placed[] = [], afters: Placed[] = [];
  def.steps.forEach((step, n) => {
    const label = `${def.id} step ${n + 1}`;
    const written = writeKet(placed, drawnOrder);
    const described = step.arrows.map((arrow, i) => describe(arrow, placed.structure, written, `${label} arrow ${i + 1}`));
    const { next, issues } = applyArrows(placed.structure, step.arrows, `${label}.arrows`);
    const errors = errorsOnly(issues);
    if (!next || errors.length) throw new Error(`${label}: ${errors.map((i) => i.message).join(' ')}`);
    checkHydrogens(next, `${label} result`);
    structures.push(placed.structure);
    starts.push(placed);

    const stepTitle = def.steps.length > 1 ? `Step ${n + 1}: ${step.name}` : step.name;
    if (n === 0) frames.push({ ket: written.ket, title: def.title, says: def.summary, step: n });
    step.arrows.forEach((arrow, i) => frames.push({
      ket: writeKet(placed, drawnOrder, described.slice(0, i + 1).map((d) => d.main)).ket,
      title: stepTitle, says: arrow.says, step: n,
    }));

    puzzles.push({
      schemaVersion: 1,
      id: def.steps.length > 1 ? `${def.id}-${n + 1}` : def.id,
      title: def.steps.length > 1 ? `${def.title} · ${step.name}` : def.title,
      difficulty: def.level === 1 ? 'introductory' : def.level === 2 ? 'intermediate' : 'advanced',
      tags: ['lesson', def.unit],
      document: written.ket,
      steps: [{
        prompt: step.prompt,
        expectedArrows: described.map((d) => d.main),
        acceptedAlternatives: alternativesOf(described),
        hints: step.hints,
        explanation: step.explanation,
        profile: 'puzzle-arrow-only',
      }],
    });

    const at = new Map(placed.at);
    for (const [id, [x, y]] of Object.entries(step.move ?? {})) {
      if (!at.has(id)) throw new Error(`${label}: cannot move unknown atom ${id}`);
      at.set(id, { x, y });
    }
    // Wedges belong to the bonds they were drawn on; a bond that is gone takes its wedge with it.
    const kept = new Map([...placed.wedges].filter(([k]) => { const [a, b] = k.split('>'); return !!bondBetween(next, a, b); }));
    placed = { structure: next, at, wedges: kept };
    afters.push(placed);
    frames.push({ ket: writeKet(placed, drawnOrder).ket, title: n === def.steps.length - 1 ? 'The result' : `After step ${n + 1}`, says: step.explanation, step: n });
  });
  structures.push(placed.structure);
  checkExpectation(def, placed.structure);

  const predictStep = def.predict?.step ?? def.steps.length - 1;
  if (predictStep < 0 || predictStep >= def.steps.length) throw new Error(`${def.id}: predict names step ${predictStep + 1}, which does not exist`);
  const predict = {
    ket: writeKet(starts[predictStep], drawnOrder).ket,
    expected: structures[predictStep + 1],
    answerKet: writeKet(afters[predictStep], drawnOrder).ket,
    prompt: def.predict?.prompt ?? 'Draw what this step makes: change the bonds and charges to show the products.',
    hints: def.predict?.hints ?? [],
  };
  return { def, frames, puzzles, predict, structures };
}

function checkExpectation(def: LessonDef, end: Structure) {
  const problems: string[] = [];
  for (const text of def.expect.bonds) {
    const [pair, order] = text.split(':');
    const [a, b] = pair.split('-');
    const bond = bondBetween(end, a, b);
    if (!bond) problems.push(`no bond ${pair}`);
    else if (order && bond.order !== Number(order)) problems.push(`${pair} has order ${bond.order}, expected ${order}`);
  }
  for (const pair of def.expect.absent ?? []) { const [a, b] = pair.split('-'); if (bondBetween(end, a, b)) problems.push(`bond ${pair} should be gone`); }
  for (const atom of end.atoms) {
    const want = def.expect.charges?.[atom.id] ?? 0;
    if (atom.charge !== want) problems.push(`${atom.id} ends with charge ${atom.charge}, expected ${want}`);
  }
  if (problems.length) throw new Error(`${def.id}: the arrows do not make the stated product: ${problems.join('; ')}`);
}
