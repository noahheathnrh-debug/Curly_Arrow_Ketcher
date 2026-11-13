import type { MechanismArrowDescriptor, MechanismPuzzle } from 'ketcher-core';

/**
 * Authoring engine for the enzyme mechanisms.
 *
 * An enzyme step is drawn once, as a scene, and every later step is *computed* from the arrows of the one before:
 * the arrows are applied to the electrons (bond orders, formal charges), and the result is the next document. That
 * makes the chain of structures chemically consistent by construction, and the tests can then check what is left:
 * that every arrow starts from electrons that exist, that formal charge is conserved, that no atom ends in a state
 * the editor would flag, and that the number of hydrogens the editor will draw never changes by accident.
 *
 * Nothing here imports the editor's code (only its types). It mirrors the editor's rules (valence, lone pairs, which
 * end of a bond migrates) and writes KET, so the tests run under plain bun.
 */

export type Element = 'H' | 'C' | 'N' | 'O' | 'S' | 'P' | 'Cl' | 'Zn' | 'Mg';
export type Order = 1 | 2 | 3 | 'contact';

export interface AtomDef {
  id: string;
  el: Element;
  /** Author coordinates: x to the right, y UP (the same way KET stores them). One unit is one bond length. */
  x: number;
  y: number;
  charge?: number;
  /** Label drawn in place of the symbol, for a residue or a group that is not drawn out ("Ser195", "R"). */
  alias?: string;
}
export interface BondDef {
  a: string;
  b: string;
  order: Order;
  /** Wedge or hash, from `a`. */
  wedge?: 'up' | 'down';
}

// ─── arrows ──────────────────────────────────────────────────────────────────

export type Source = { t: 'lp'; a: string } | { t: 'bond'; a: string; b: string };
export type Destination =
  | { t: 'atom'; a: string }
  | { t: 'bond'; a: string; b: string }
  | { t: 'new'; donor: string; to: string };
export interface ArrowDef {
  from: Source;
  to: Destination;
}
export const lp = (a: string): Source => ({ t: 'lp', a });
export const bd = (a: string, b: string): Source => ({ t: 'bond', a, b });
export const toAtom = (a: string): Destination => ({ t: 'atom', a });
export const toBond = (a: string, b: string): Destination => ({ t: 'bond', a, b });
/** A new bond from `donor` to `to`. For a bond source, `donor` is the end of the source bond that migrates. */
export const toNew = (donor: string, to: string): Destination => ({ t: 'new', donor, to });
export const arrow = (from: Source, to: Destination): ArrowDef => ({ from, to });

export interface Stage {
  /** What this part of the step asks. */
  prompt: string;
  arrows: ArrowDef[];
  hints: string[];
  explanation: string;
  /** Plain words for what getting this stage right shows: "Ser195 attacks the carbonyl carbon". */
  label: string;
}

/** Changes made between two steps that no arrow describes: a species arriving, leaving, or turning round. */
export interface Between {
  move?: Record<string, [number, number]>;
  add?: AtomDef[];
  addBonds?: BondDef[];
  remove?: string[];
  removeBonds?: [string, string][];
  /** Draw an existing bond as a wedge or hash from its first atom: stereochemistry that arrows have just made. */
  wedge?: [string, string, 'up' | 'down' | null][];
}

export interface StepDef {
  /** Short name for this step, shown after the activity name. */
  name: string;
  stages: Stage[];
  /** Where the lecture draws this step: "slides A9–A12, Figure 5". */
  where: string;
  /** What was simplified or changed to fit the arrow engine. Shown to the learner. */
  note?: string;
  between?: Between;
}

export interface Citation {
  packet: string;
  deck: string;
  where: string;
  /** The lecture's own words for the same event, kept short. */
  words?: string;
}

export type EnzymeSkill =
  | 'enzyme-acid-base'
  | 'enzyme-covalent'
  | 'enzyme-metal'
  | 'enzyme-glycosidase'
  | 'enzyme-hydride'
  | 'enzyme-plp'
  | 'enzyme-flavin'
  | 'enzyme-phosphoryl';

export interface EnzymeActivity {
  id: string;
  title: string;
  /** Which lecture teaches it. */
  citations: Citation[];
  summary: string;
  level: 1 | 2 | 3;
  skill: EnzymeSkill;
  /** The general electron-pushing skill it also exercises (an existing skill id in the catalogue). */
  generalSkills: string[];
  /** Variants of one mechanism share a family. */
  family: string;
  /** Activities worth doing first (ids of other enzyme activities). */
  requires?: string[];
  /** Phrases the lecture actually uses. */
  terms: string[];
  /** What the model shows, and what it leaves out. Shown on screen on every step. */
  model: string;
  scene: { atoms: AtomDef[]; bonds: BondDef[] };
  steps: StepDef[];
  /**
   * What the finished mechanism must look like, written from the lecture's product and not from the arrows: bonds
   * ("A-B:2" is a double bond, "A-B" any covalent bond), bonds that must be gone, and formal charges that are not zero.
   * The tests apply the arrows and compare, so a wrong arrow cannot also be a wrong key.
   */
  expect: { bonds: string[]; absent?: string[]; charges?: Record<string, number> };
  /** Things a person should look at again. */
  review?: string[];
}

// ─── what the editor will compute ────────────────────────────────────────────

const GROUP: Record<Element, number> = { H: 1, C: 4, N: 5, O: 6, S: 6, P: 5, Cl: 7, Zn: 2, Mg: 2 };

export interface Valence {
  valence: number;
  hydrogens: number;
  bad: boolean;
}

/** The editor's own rules (ketcher-core `Atom.calcValence`) for the elements used here. */
export function valenceOf(el: Element, charge: number, conn: number): Valence {
  const abs = Math.abs(charge);
  const make = (valence: number, hydrogens: number): Valence => ({ valence, hydrogens: Math.max(0, hydrogens), bad: hydrogens < 0 });
  switch (el) {
    case 'H': return make(1, 1 - conn - abs);
    case 'C': return make(4, 4 - conn - abs);
    case 'N':
    case 'P':
      if (charge === 1) return make(4, 4 - conn);
      if (charge === 2) return make(3, 3 - conn);
      return conn + abs <= 3 ? make(3, 3 - conn - abs) : make(5, 5 - conn - abs);
    case 'O':
      return charge >= 1 ? make(3, 3 - conn) : make(2, 2 - conn - abs);
    case 'S':
      if (charge === 1) return conn <= 3 ? make(3, 3 - conn) : make(5, 5 - conn);
      if (conn + abs <= 2) return make(2, 2 - conn - abs);
      if (conn + abs <= 4) return make(4, 4 - conn - abs);
      return make(6, 6 - conn - abs);
    case 'Cl':
      if (charge === 0) return conn <= 1 ? make(1, 1 - conn) : { valence: conn, hydrogens: 0, bad: true };
      return { valence: conn, hydrogens: 0, bad: charge !== -1 };
    case 'Zn':
    case 'Mg':
      return conn + abs === 2 || conn + abs === 0 ? make(2, 0) : { valence: conn, hydrogens: 0, bad: true };
  }
}

export function lonePairsOf(el: Element, charge: number, valence: number): number {
  if (el === 'Zn' || el === 'Mg') return 0;
  const electrons = GROUP[el] - charge - valence + Math.max(0, -charge);
  return electrons <= 0 ? 0 : Math.min(Math.floor(electrons / 2), 4);
}

// ─── state ───────────────────────────────────────────────────────────────────

interface Bond { a: string; b: string; order: Order; wedge?: 'up' | 'down' }
export interface State {
  atoms: Map<string, AtomDef>;
  bonds: Bond[];
}

export function stateOf(scene: { atoms: AtomDef[]; bonds: BondDef[] }): State {
  const atoms = new Map<string, AtomDef>();
  for (const atom of scene.atoms) {
    if (atoms.has(atom.id)) throw new Error(`atom id "${atom.id}" is used twice`);
    atoms.set(atom.id, { ...atom, charge: atom.charge ?? 0 });
  }
  const bonds: Bond[] = scene.bonds.map((bond) => ({ ...bond }));
  return validate({ atoms, bonds });
}

function validate(state: State): State {
  const seen = new Set<string>();
  for (const bond of state.bonds) {
    if (!state.atoms.has(bond.a) || !state.atoms.has(bond.b)) throw new Error(`bond ${bond.a}-${bond.b} names a missing atom`);
    const key = [bond.a, bond.b].sort().join('|');
    if (seen.has(key)) throw new Error(`bond ${bond.a}-${bond.b} is listed twice`);
    seen.add(key);
  }
  return state;
}

export const cloneState = (state: State): State => ({
  atoms: new Map([...state.atoms].map(([id, atom]) => [id, { ...atom }])),
  bonds: state.bonds.map((bond) => ({ ...bond })),
});

export const findBond = (state: State, a: string, b: string): Bond | undefined =>
  state.bonds.find((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a));

/** Covalent connections, in bond orders, as the editor counts them (contacts are not bonds). */
export function connectionsOf(state: State, id: string): number {
  let total = 0;
  for (const bond of state.bonds) {
    if (bond.a !== id && bond.b !== id) continue;
    if (bond.order !== 'contact') total += bond.order;
  }
  return total;
}

export function describeAtom(state: State, id: string) {
  const atom = state.atoms.get(id)!;
  const charge = atom.charge ?? 0;
  const conn = connectionsOf(state, id);
  const v = valenceOf(atom.el, charge, conn);
  return { atom, charge, conn, ...v, lonePairs: lonePairsOf(atom.el, charge, v.valence) };
}

/** Explicit drawn degree, counting contacts: the editor's rule for which end of a bond migrates uses it. */
export function degreeOf(state: State, id: string): number {
  return state.bonds.filter((bond) => bond.a === id || bond.b === id).length;
}

// ─── applying arrows ─────────────────────────────────────────────────────────

export interface Ledger {
  /** Net change in non-bonding electrons and in bonds, per atom, over the whole step. */
  nonbonding: Map<string, number>;
  bonding: Map<string, number>;
  /** Lone pairs and bond orders already pushed from, so one pair is never pushed twice. */
  lpUsed: Map<string, number>;
  bondUsed: Map<string, number>;
}

function add(map: Map<string, number>, id: string, n: number) {
  map.set(id, (map.get(id) ?? 0) + n);
}

/**
 * Move the electrons one arrow describes. Throws, naming the arrow, when it could not be drawn: the lone pair or
 * bond it starts from is not in the document the learner is given (`start`), or it ends somewhere the editor would
 * not let it end. `state` is the working copy the arrows are applied to.
 */
export function applyArrow(state: State, start: State, arrowDef: ArrowDef, ledger: Ledger, label: string): void {
  const { from, to } = arrowDef;
  const fail = (why: string): never => { throw new Error(`${label}: ${why}`); };
  const need = (id: string) => { if (!start.atoms.has(id)) fail(`unknown atom "${id}"`); };
  const key = (a: string, b: string) => [a, b].sort().join('|');

  if (from.t === 'lp') {
    need(from.a);
    const used = ledger.lpUsed.get(from.a) ?? 0;
    if (describeAtom(start, from.a).lonePairs - used < 1) fail(`${from.a} has no lone pair left to push in the document as given`);
    ledger.lpUsed.set(from.a, used + 1);
    add(ledger.nonbonding, from.a, -2);
  } else {
    need(from.a); need(from.b);
    const first = findBond(start, from.a, from.b);
    if (!first || first.order === 'contact') fail(`there is no covalent bond ${from.a}-${from.b} to push`);
    const used = ledger.bondUsed.get(key(from.a, from.b)) ?? 0;
    if ((first!.order as number) - used < 1) fail(`bond ${from.a}-${from.b} has no electrons left to push`);
    ledger.bondUsed.set(key(from.a, from.b), used + 1);
    const bond = findBond(state, from.a, from.b)!;
    bond.order = ((bond.order as number) - 1) as Order;
    add(ledger.bonding, bond.a, -1); add(ledger.bonding, bond.b, -1);
  }

  if (to.t === 'atom') {
    need(to.a);
    if (from.t !== 'bond') fail('an arrow from a lone pair cannot end on an atom: it forms a bond (use a new bond)');
    else if (to.a !== from.a && to.a !== from.b) fail(`${to.a} is not an end of the bond that breaks`);
    add(ledger.nonbonding, to.a, 2);
  } else if (to.t === 'bond') {
    need(to.a); need(to.b);
    const seen = findBond(start, to.a, to.b);
    if (!seen) fail(`there is no bond ${to.a}-${to.b} to strengthen in the document as given`);
    else if (seen.order === 'contact') fail(`${to.a}-${to.b} is a contact, not a bond`);
    const bond = findBond(state, to.a, to.b)!;
    bond.order = ((bond.order as number) + 1) as Order;
    add(ledger.bonding, bond.a, 1); add(ledger.bonding, bond.b, 1);
  } else {
    need(to.donor); need(to.to);
    if (from.t === 'lp' && to.donor !== from.a) fail(`a lone-pair arrow forms the bond from its own atom, not from ${to.donor}`);
    if (from.t === 'bond' && to.donor !== from.a && to.donor !== from.b) fail('the atom that migrates must be one end of the source bond');
    if (to.donor === to.to) fail('a bond cannot join an atom to itself');
    if (from.t === 'bond' && (to.to === from.a || to.to === from.b)) fail('a bond arrow that ends on an atom of its own bond is a cleavage: use an atom destination');
    const existing = findBond(state, to.donor, to.to);
    if (existing) {
      if (existing.order === 'contact') existing.order = 1;
      else existing.order = ((existing.order as number) + 1) as Order;
    } else {
      state.bonds.push({ a: to.donor, b: to.to, order: 1 });
    }
    add(ledger.bonding, to.donor, 1); add(ledger.bonding, to.to, 1);
  }
  // A bond whose order fell to zero is gone.
  state.bonds = state.bonds.filter((bond) => (bond.order as number) !== 0);
}

/** Which end of a broken-and-re-formed bond the editor will call the migrating one for this document. */
export function editorMigrating(state: State, a: string, b: string): string {
  const bond = findBond(state, a, b)!;
  return degreeOf(state, bond.a) <= degreeOf(state, bond.b) ? bond.a : bond.b;
}

/** Charge follows the electrons: each electron moved changes an atom's formal charge by one. */
export function settle(state: State, ledger: Ledger): void {
  for (const [id, atom] of state.atoms) {
    const delta = (ledger.nonbonding.get(id) ?? 0) + (ledger.bonding.get(id) ?? 0);
    atom.charge = (atom.charge ?? 0) - delta;
  }
}

export const newLedger = (): Ledger => ({ nonbonding: new Map(), bonding: new Map(), lpUsed: new Map(), bondUsed: new Map() });

export function applyBetween(state: State, between: Between | undefined): State {
  if (!between) return state;
  const next = cloneState(state);
  for (const [id, [x, y]] of Object.entries(between.move ?? {})) {
    const atom = next.atoms.get(id);
    if (!atom) throw new Error(`between: cannot move unknown atom "${id}"`);
    atom.x = x; atom.y = y;
  }
  for (const atom of between.add ?? []) {
    if (next.atoms.has(atom.id)) throw new Error(`between: atom "${atom.id}" already exists`);
    next.atoms.set(atom.id, { ...atom, charge: atom.charge ?? 0 });
  }
  for (const bond of between.addBonds ?? []) next.bonds.push({ ...bond });
  for (const [a, b] of between.removeBonds ?? []) {
    const bond = findBond(next, a, b);
    if (!bond) throw new Error(`between: no bond ${a}-${b} to remove`);
    next.bonds.splice(next.bonds.indexOf(bond), 1);
  }
  for (const [a, b, w] of between.wedge ?? []) {
    const bond = findBond(next, a, b);
    if (!bond) throw new Error(`between: no bond ${a}-${b} to give a wedge`);
    if (bond.a !== a) { bond.a = a; bond.b = b; }
    if (w) bond.wedge = w; else delete bond.wedge;
  }
  for (const id of between.remove ?? []) {
    if (!next.atoms.delete(id)) throw new Error(`between: cannot remove unknown atom "${id}"`);
    next.bonds = next.bonds.filter((bond) => bond.a !== id && bond.b !== id);
  }
  return validate(next);
}

// ─── KET ─────────────────────────────────────────────────────────────────────

const TYPE: Record<string, number> = { 1: 1, 2: 2, 3: 3, contact: 10 };
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The order the editor will number atoms and bonds in. When it loads a document it groups atoms by connected
 * fragment (dashed contacts join fragments too), keeping each fragment's atoms in order and ordering fragments by
 * their first atom. A document written in any other order is silently renumbered, and every anchor in the answer
 * (which names atoms and bonds by number) would then point at the wrong thing. So the document is written in that order
 * already, and the renumbering is the identity. The editor-check tool confirms this against the real editor.
 */
export function editorOrder(state: State): { atoms: string[]; bonds: Bond[] } {
  const ids = [...state.atoms.keys()];
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  for (const bond of state.bonds) parent.set(find(bond.a), find(bond.b));
  const rank = new Map<string, number>();
  for (const id of ids) if (!rank.has(find(id))) rank.set(find(id), rank.size);
  const atoms = [...ids].sort((x, y) => rank.get(find(x))! - rank.get(find(y))! || ids.indexOf(x) - ids.indexOf(y));
  const bonds = [...state.bonds].sort((x, y) => rank.get(find(x.a))! - rank.get(find(y.a))! || state.bonds.indexOf(x) - state.bonds.indexOf(y));
  return { atoms, bonds };
}

export function toKet(state: State): { ket: string; index: Map<string, number>; bondIndex: (a: string, b: string) => number } {
  const order = editorOrder(state);
  const ids = order.atoms;
  const index = new Map(ids.map((id, i) => [id, i]));
  const atoms = ids.map((id) => {
    const atom = state.atoms.get(id)!;
    const out: Record<string, unknown> = { label: atom.el, location: [round(atom.x), round(atom.y), 0] };
    if (atom.charge) out.charge = atom.charge;
    if (atom.alias) out.alias = atom.alias;
    return out;
  });
  const bonds = order.bonds.map((bond) => {
    const out: Record<string, unknown> = { type: TYPE[String(bond.order)], atoms: [index.get(bond.a), index.get(bond.b)] };
    if (bond.wedge) out.stereo = bond.wedge === 'up' ? 1 : 6;
    return out;
  });
  const ket = JSON.stringify({ root: { nodes: [{ $ref: 'mol0' }] }, mol0: { type: 'molecule', atoms, bonds } }, null, 4);
  const bondIndex = (a: string, b: string) => {
    const at = order.bonds.findIndex((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a));
    if (at < 0) throw new Error(`no bond ${a}-${b}`);
    return at;
  };
  return { ket, index, bondIndex };
}

// ─── building puzzles ────────────────────────────────────────────────────────

type Descriptor = MechanismArrowDescriptor;

function describeFor(state: State, arrowDef: ArrowDef, index: Map<string, number>, bondIndex: (a: string, b: string) => number): { main: Descriptor; alternates: Descriptor[] } {
  const atom = (id: string) => index.get(id)!;
  const { from, to } = arrowDef;
  const source: Descriptor['source'] = from.t === 'lp'
    ? { kind: 'lone-pair', atomId: atom(from.a), pairIdx: 0 }
    : { kind: 'bond', bondId: bondIndex(from.a, from.b) };
  const alternates: Descriptor[] = [];
  let destination: Descriptor['destination'];
  if (to.t === 'atom') destination = { kind: 'atom', atomId: atom(to.a) };
  else if (to.t === 'bond') {
    destination = { kind: 'bond', bondId: bondIndex(to.a, to.b) };
    // A lone pair pushed onto an adjacent bond may equally be dropped on the atom at its far end.
    if (from.t === 'lp' && (to.a === from.a || to.b === from.a)) {
      const other = to.a === from.a ? to.b : to.a;
      alternates.push({ kind: 'curly', source, destination: { kind: 'new-bond', atomId1: atom(from.a), atomId2: atom(other) } });
    }
  } else {
    destination = { kind: 'new-bond', atomId1: atom(to.donor), atomId2: atom(to.to) };
    if (from.t === 'lp' && findBond(state, to.donor, to.to)) {
      alternates.push({ kind: 'curly', source, destination: { kind: 'bond', bondId: bondIndex(to.donor, to.to) } });
    }
  }
  return { main: { kind: 'curly', source, destination }, alternates };
}

export interface BuiltStep {
  puzzle: MechanismPuzzle;
  stageLabels: string[];
  note?: string;
  /** Document state at the start of the step, and after its arrows, for tests and previews. */
  start: State;
  end: State;
  /** Atoms whose formal charge or covalent bonds changed during this step's arrows. */
  arrows: ArrowDef[][];
  indexOf: Map<string, number>;
}

export interface BuiltActivity {
  def: EnzymeActivity;
  steps: BuiltStep[];
}

export function buildActivity(def: EnzymeActivity): BuiltActivity {
  let state = stateOf(def.scene);
  const steps: BuiltStep[] = [];
  def.steps.forEach((step, stepNumber) => {
    const start = cloneState(state);
    const { ket, index, bondIndex } = toKet(start);
    const working = cloneState(start);
    const ledger = newLedger();
    const stages = step.stages.map((stage, stageNumber) => {
      const here = `${def.id} step ${stepNumber + 1} stage ${stageNumber + 1}`;
      const described = stage.arrows.map((arrowDef, i) => {
        const label = `${here} arrow ${i + 1}`;
        // The editor chooses the migrating end of a source bond; the author must have chosen the same one.
        if (arrowDef.from.t === 'bond' && arrowDef.to.t === 'new') {
          const chosen = editorMigrating(start, arrowDef.from.a, arrowDef.from.b);
          if (chosen !== arrowDef.to.donor) throw new Error(`${label}: the editor will call ${chosen} the migrating atom, not ${arrowDef.to.donor}`);
        }
        const d = describeFor(start, arrowDef, index, bondIndex);
        applyArrow(working, start, arrowDef, ledger, label);
        return d;
      });
      return { stage, described };
    });
    settle(working, ledger);
    const mechanismSteps = stages.map(({ stage, described }) => ({
      prompt: stage.prompt,
      expectedArrows: described.map((d) => d.main),
      acceptedAlternatives: alternativesOf(described),
      hints: stage.hints,
      explanation: stage.explanation,
      profile: 'puzzle-arrow-only' as const,
    }));
    const puzzle: MechanismPuzzle = {
      schemaVersion: 1,
      id: `${def.id}-${stepNumber + 1}`,
      title: `${def.title} · ${step.name}`,
      difficulty: def.level === 1 ? 'introductory' : def.level === 2 ? 'intermediate' : 'advanced',
      tags: ['enzyme mechanism', def.family],
      document: ket,
      steps: mechanismSteps,
      provenance: {
        source: `${def.citations.map((c) => `${c.deck} (packet ${c.packet}), ${c.where}`).join('; ')}. This step: ${step.where}.`,
        note: [def.model, step.note].filter(Boolean).join(' '),
      },
    };
    steps.push({ puzzle, stageLabels: step.stages.map((s) => s.label), note: step.note, start, end: working, arrows: step.stages.map((s) => s.arrows), indexOf: index });
    state = applyBetween(working, step.between);
  });
  return { def, steps };
}

/** Every combination of the equally-right ways to drop one arrow, as complete alternative sets (the main answer excluded). */
function alternativesOf(described: { main: Descriptor; alternates: Descriptor[] }[]): Descriptor[][] {
  let sets: Descriptor[][] = [[]];
  for (const { main, alternates } of described) {
    const choices = [main, ...alternates];
    sets = sets.flatMap((set) => choices.map((choice) => [...set, choice]));
  }
  return sets.slice(1);
}
