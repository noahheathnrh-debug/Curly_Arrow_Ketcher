import { applyArrows, arrowsFromKetcher, parseEnd, type ArrowSpec, type KetcherArrowDescriptor } from './arrows'
import type { Issue } from './issue'
import { buildStructure, ELEMENTS, type AtomSpec, type BondSpec, type Structure } from './molecule'
import { defaultHydrogens } from './ket'

/**
 * Live legality for arrows drawn in the editor. The editor's own structure (its atom and bond ids, as the arrow
 * descriptors name them) is read into the engine; every drawn arrow is applied at once; and the result is split in two:
 *
 * - `refused`: an arrow that cannot be drawn at all (it starts where there are no electrons to move, or ends where they
 *   cannot go). This is wrong however the learner continues, so the activity says so at once, with the rule.
 * - `pending`: what the drawn set would lead to (an atom with ten electrons, a bond with one). That is expected while
 *   an answer is unfinished, so the activity only uses it to explain an answer that is otherwise wrong.
 *
 * Drawings outside what the engine models (aromatic bonds, aliases, metals, unsupported elements) give `null`, and the
 * activity falls back to comparing with the answer only. Pure: no editor code is imported, only its shapes.
 */

export interface EditorAtom {
  label: string
  charge?: number | null
  radical?: number
  implicitH?: number
  isotope?: number | null
  alias?: string | null
  pseudo?: string
  stereoLabel?: string | null
}
export interface EditorBond { begin: number; end: number; type: number }
/** The parts of ketcher-core's `Struct` read here (its `atoms` and `bonds` pools are Maps keyed by id). */
export interface EditorStructLike {
  atoms: Iterable<[number, EditorAtom]>
  bonds: Iterable<[number, EditorBond]>
}

export interface ReadStruct {
  structure: Structure
  /** Engine atom id per editor atom id (sparse), and the two engine atom ids per editor bond id. */
  atomIds: string[]
  bondAtoms: [string, string][]
}

export interface DrawnCheck {
  refused?: { index: number; code: string; message: string; atoms: string[] }
  pending: { code: string; message: string; atoms: string[] }[]
}

const engineId = (editorId: number) => `a${editorId}`

/**
 * The editor's structure as the engine sees it. `outside` names something the engine does not model (an aromatic bond,
 * an alias or R group, a transition metal, a carbene); `invalid` is a structure that breaks valence rules as drawn.
 */
export function readEditorStruct(struct: EditorStructLike): ReadStruct | { outside: string } | { invalid: Issue[] } {
  const atoms: AtomSpec[] = [], bonds: BondSpec[] = []
  const atomIds: string[] = [], bondAtoms: [string, string][] = []
  const orders = new Map<number, number>()
  const bondList = [...struct.bonds]
  for (const [, bond] of bondList) {
    if (![1, 2, 3].includes(bond.type)) return { outside: `bond type ${bond.type}` }
    orders.set(bond.begin, (orders.get(bond.begin) ?? 0) + bond.type)
    orders.set(bond.end, (orders.get(bond.end) ?? 0) + bond.type)
  }
  for (const [id, atom] of struct.atoms) {
    if (!ELEMENTS[atom.label]) return { outside: `element ${atom.label}` }
    // Isotopes and stereo labels do not change where electrons are; an alias or pseudo-atom hides what the atom really is.
    if (atom.alias || atom.pseudo) return { outside: 'alias or pseudo-atom' }
    if (atom.radical && atom.radical !== 2) return { outside: 'carbene' }
    // A metal bonded covalently (a Grignard reagent, an organolithium) is outside the model, not a wrong drawing.
    if (ELEMENTS[atom.label].metal && orders.get(id)) return { outside: 'metal bonded covalently' }
    const charge = atom.charge ?? 0
    const rad = atom.radical === 2 ? 1 : 0
    const h = Number.isInteger(atom.implicitH) ? atom.implicitH! : defaultHydrogens(atom.label, charge, orders.get(id) ?? 0, rad)
    atomIds[id] = engineId(id)
    atoms.push({ id: engineId(id), el: atom.label, h, ...(charge ? { charge } : {}), ...(rad ? { rad } : {}) })
  }
  for (const [id, bond] of bondList) {
    const pair: [string, string] = [engineId(bond.begin), engineId(bond.end)]
    bondAtoms[id] = pair
    bonds.push({ a: pair[0], b: pair[1], order: bond.type })
  }
  const built = buildStructure({ atoms, bonds }, 'drawing')
  return built.structure ? { structure: built.structure, atomIds, bondAtoms } : { invalid: built.issues }
}

/** Issues about one arrow on its own: these can never be fixed by drawing more arrows. */
const ARROW_CODES = new Set([
  'arrow-start', 'arrow-end', 'arrow-atom', 'arrow-start-no-lone-pair', 'fishhook-start-no-radical', 'arrow-start-no-bond',
  'arrow-start-overused', 'arrow-end-unreachable', 'arrow-end-self', 'arrow-end-ambiguous', 'arrow-pair-from-radical', 'arrow-unmapped',
])

const indexOf = (issue: Issue) => Number(/^arrows\[(\d+)\]/.exec(issue.path)?.[1] ?? -1)

/** Engine atom ids an issue is about: the ends of its arrow, or the atom it names. */
function atomsOf(issue: Issue, arrows: readonly ArrowSpec[], structure: Structure): string[] {
  const arrow = arrows[indexOf(issue)]
  if (arrow) return [arrow.from, arrow.to].flatMap(end => { const e = parseEnd(end); return !e ? [] : e.kind === 'atom' ? [e.atom] : e.atoms })
  return structure.atoms.filter(a => new RegExp(`\\b${a.id}\\b`).test(issue.message)).map(a => a.id)
}

/** A learner-facing sentence for an issue: no atom ids, the element named instead (the canvas highlights which one). */
export function explainIssue(issue: Issue, structure: Structure, atoms: readonly string[]): string {
  const atom = (id: string | undefined) => structure.atoms.find(a => a.id === id)
  const first = atom(atoms[0])
  const what = first ? `this ${ELEMENTS[first.el].name}` : 'this atom'
  switch (issue.code) {
    case 'arrow-start-no-lone-pair':
      return first?.rad
        ? `That arrow starts on ${what}, which has no lone pair, only one unpaired electron. A single electron moves with a fishhook (a half-headed arrow).`
        : first?.lp
          ? `That arrow uses a lone pair on ${what} that another arrow has already moved.`
          : `That arrow starts on ${what}, which has no lone pair. An arrow starts where the electrons are: a lone pair or a bond.`
    case 'fishhook-start-no-radical':
      return `A fishhook moves one electron, but ${what} has no unpaired electron. Start it at a bond, or use a full arrow to move a lone pair.`
    case 'arrow-pair-from-radical':
      return 'A full arrow moves an electron pair, but that one starts at a single unpaired electron. Use a fishhook (a half-headed arrow).'
    case 'arrow-start-overused':
      return 'That bond has already given all its electrons to other arrows.'
    case 'arrow-start-no-bond':
    case 'arrow-start':
    case 'arrow-unmapped':
    case 'arrow-atom':
      return 'That arrow does not start at electrons in this structure. Start at a lone pair or a bond.'
    case 'arrow-end-unreachable':
      return 'Electrons can only move to a neighbouring atom or bond: that arrow ends too far from where it starts.'
    case 'arrow-end-ambiguous':
      return 'Show which new bond forms: end the arrow between the two atoms that will bond.'
    case 'arrow-end-self':
    case 'arrow-end':
      return 'That arrow ends where it starts. Electrons have to move somewhere.'
    case 'octet-exceeded': {
      const n = /would have (\d+) electrons/.exec(issue.message)?.[1]
      return `These arrows would give ${what} ${n ?? 'too many'} electrons, more than it can hold. Something else has to move away from it.`
    }
    case 'fishhook-half-bond':
      return 'A bond holds two electrons. With fishhooks, each atom gives one electron to a new bond, and each takes one when a bond breaks.'
    case 'arrows-cancel':
      return 'The same bond is made and broken by these arrows; draw each move of the electrons once.'
    case 'bond-order':
      return 'These arrows would make a bond higher than triple.'
    default:
      return issue.message.replace(/\ba\d+\b/g, id => (atom(id) ? `the ${ELEMENTS[atom(id)!.el].name}` : id))
  }
}

/** Checks every drawn arrow at once against the editor's structure. Null when the drawing cannot be read. */
export function checkDrawnArrows(struct: EditorStructLike, drawn: readonly KetcherArrowDescriptor[]): DrawnCheck | null {
  const read = readEditorStruct(struct)
  if (!('structure' in read)) return null
  const issue = (i: Issue, arrows: readonly ArrowSpec[]) => {
    const atoms = atomsOf(i, arrows, read.structure)
    return { code: i.code, message: explainIssue(i, read.structure, atoms), atoms }
  }
  if (!drawn.length) return { pending: [] }
  const mapped = arrowsFromKetcher(drawn, read.atomIds, read.bondAtoms)
  if ('issues' in mapped) {
    const i = mapped.issues[0]
    const index = indexOf(i)
    const d = drawn[index]
    const atoms = d ? [d.source.kind === 'bond' ? undefined : read.atomIds[d.source.atomId]].filter((x): x is string => !!x) : []
    return { refused: { index, code: i.code, message: explainIssue(i, read.structure, atoms), atoms }, pending: [] }
  }
  const { issues } = applyArrows(read.structure, mapped.arrows)
  const hard = issues.find(i => ARROW_CODES.has(i.code))
  if (hard) return { refused: { index: indexOf(hard), ...issue(hard, mapped.arrows) }, pending: [] }
  return { pending: issues.map(i => issue(i, mapped.arrows)) }
}

export type Audit =
  | { verdict: 'ok' }
  | { verdict: 'outside'; detail: string }
  | { verdict: 'invalid' | 'refused' | 'ends-illegal'; detail: string }

/**
 * Vets an authored or imported answer: its structure must be valid, every arrow legal, and the state the arrows lead
 * to legal. `outside` is not a failure (the answer key still judges it); the other three prove the content wrong.
 */
export function auditAnswer(struct: EditorStructLike, answer: readonly KetcherArrowDescriptor[]): Audit {
  const read = readEditorStruct(struct)
  if ('outside' in read) return { verdict: 'outside', detail: read.outside }
  if ('invalid' in read) return { verdict: 'invalid', detail: read.invalid.filter(i => i.code !== 'octet-incomplete').map(i => i.code).join(', ') }
  const check = checkDrawnArrows(struct, answer)!
  if (check.refused) return { verdict: 'refused', detail: `arrow ${check.refused.index + 1}: ${check.refused.code}` }
  if (check.pending.length) return { verdict: 'ends-illegal', detail: check.pending.map(p => p.code).join(', ') }
  return { verdict: 'ok' }
}

/** A single-molecule KET document as the editor numbers it on load: atom and bond ids are KET indices. */
export function editorStructFromKet(mol: { atoms: Record<string, unknown>[]; bonds: Record<string, unknown>[] }): EditorStructLike {
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined)
  return {
    atoms: mol.atoms.map((a, i): [number, EditorAtom] => [i, {
      label: String(a.label), charge: num(a.charge) ?? 0, radical: num(a.radical) ?? 0,
      ...(Number.isInteger(a.implicitHCount) ? { implicitH: a.implicitHCount as number } : {}),
      ...(a.alias ? { alias: String(a.alias) } : {}), ...(a.isotope ? { isotope: num(a.isotope) } : {}),
      ...(a.stereoLabel ? { stereoLabel: String(a.stereoLabel) } : {}),
    }]),
    bonds: mol.bonds.map((b, i): [number, EditorBond] => {
      const ends = b.atoms as number[]
      return [i, { begin: ends[0], end: ends[1], type: num(b.type) ?? 0 }]
    }),
  }
}

/** Editor atom id back from an engine id, for highlighting. */
export const editorAtomId = (id: string) => Number(id.slice(1))
