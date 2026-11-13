import type { Issue } from './issue'
import {
  ATOM_ID, bondBetween, bondName, cloneStructure, ELEMENTS, errorsOnly, formalCharge, octetIssues, totalCharge,
  totalValenceElectrons, type Structure,
} from './molecule'

/**
 * Curly arrows as data. `from` is an atom id (one of its lone pairs, or with `single` its unpaired electron) or a bond
 * `A-B`; `to` is an atom id or a bond `A-B` (existing, or the new bond the electrons form). A plain arrow moves an
 * electron pair; `single: true` is a fishhook and moves one electron. All arrows of one step move at once, from the
 * structure before the step. The engine keeps a ledger of electrons per atom and per bond, so a bond must end with an
 * even count (a new bond made by fishhooks needs one electron from each side), and then recomputes every formal charge
 * and checks every octet.
 */
export interface ArrowSpec { from: string; to: string; single?: boolean }
type End = { kind: 'atom'; atom: string } | { kind: 'bond'; atoms: [string, string] }

export type MoveKind =
  | 'lone-pair-forms-bond' | 'bond-to-lone-pair' | 'bond-shifts'
  | 'electron-forms-bond' | 'bond-electron-to-atom' | 'bond-electron-shifts'

/** What one arrow did, for explanations and feedback. */
export interface ArrowMove {
  arrow: ArrowSpec
  kind: MoveKind
  /** The atom whose electrons move (lone-pair or radical donor, or the atom that keeps the electrons). */
  donor: string
  /** The atom that gains the electrons, or a bond to the donor. */
  acceptor: string
  formed?: string
  broken?: string
}

const issue = (code: string, path: string, message: string): Issue => ({ code, path, message })

export function parseEnd(text: string): End | null {
  const t = text.trim()
  if (ATOM_ID.test(t)) return { kind: 'atom', atom: t }
  const m = /^([A-Za-z][A-Za-z0-9]{0,11})-([A-Za-z][A-Za-z0-9]{0,11})$/.exec(t)
  return m && m[1] !== m[2] ? { kind: 'bond', atoms: [m[1], m[2]] } : null
}

const arrowText = (a: ArrowSpec) => `${a.from} ${a.single ? '⇀' : '→'} ${a.to}`

/**
 * Applies one step's arrows. Returns the next structure only when every arrow starts at electrons that are there (a
 * lone pair for a full arrow, an unpaired electron for a fishhook, or a bond, never used more often than they exist),
 * ends at an atom or bond it can reach, every bond ends with whole pairs, and no atom ends with too many electrons.
 * Electron count and total charge are conserved by construction and checked again as a guard.
 */
export function applyArrows(before: Structure, arrows: readonly ArrowSpec[], path = 'arrows'): { next?: Structure; moves: ArrowMove[]; issues: Issue[] } {
  const issues: Issue[] = []
  const moves: ArrowMove[] = []
  const atoms = new Map(before.atoms.map(a => [a.id, a]))
  const pairUse = new Map<string, number>(), singleUse = new Map<string, number>(), bondUse = new Map<string, number>()
  /** Electron ledger: non-bonding electrons per atom, shared electrons per bond. */
  const atomE = new Map<string, number>(), bondE = new Map<string, number>()
  const add = (m: Map<string, number>, k: string, d: number) => m.set(k, (m.get(k) ?? 0) + d)
  if (!arrows.length) issues.push(issue('arrows-missing', path, 'Draw at least one arrow.'))
  arrows.forEach((arrow, i) => {
    const at = `${path}[${i}]`
    const n = arrow.single ? 1 : 2
    const from = parseEnd(arrow.from), to = parseEnd(arrow.to)
    if (!from) { issues.push(issue('arrow-start', `${at}.from`, `${arrowText(arrow)}: an arrow starts at a lone pair or unpaired electron (an atom) or a bond (A-B).`)); return }
    if (!to) { issues.push(issue('arrow-end', `${at}.to`, `${arrowText(arrow)}: an arrow ends at an atom or a bond (A-B).`)); return }
    for (const id of [...(from.kind === 'atom' ? [from.atom] : from.atoms), ...(to.kind === 'atom' ? [to.atom] : to.atoms)])
      if (!atoms.has(id)) { issues.push(issue('arrow-atom', at, `${arrowText(arrow)}: there is no atom ${id} here.`)); return }
    if (from.kind === 'atom') {
      const donor = atoms.get(from.atom)!
      if (arrow.single) {
        const used = (singleUse.get(donor.id) ?? 0) + 1
        if (donor.rad < used) {
          issues.push(issue('fishhook-start-no-radical', `${at}.from`, donor.rad
            ? `${arrowText(arrow)}: ${donor.id} has only one unpaired electron to move.`
            : `${arrowText(arrow)}: ${donor.id} has no unpaired electron. A fishhook moves one electron: start it at an unpaired electron or at a bond${donor.lp ? '; a lone pair moves as a pair, with a full arrow' : ''}.`))
          return
        }
        singleUse.set(donor.id, used)
      } else {
        const used = (pairUse.get(donor.id) ?? 0) + 1
        if (donor.lp < used) {
          issues.push(issue('arrow-start-no-lone-pair', `${at}.from`, donor.lp
            ? `${arrowText(arrow)}: ${donor.id} has only ${donor.lp} lone pair${donor.lp === 1 ? '' : 's'} to give.`
            : donor.rad
              ? `${arrowText(arrow)}: ${donor.id} has no lone pair, only one unpaired electron. A single electron moves with a fishhook (half-headed arrow).`
              : `${arrowText(arrow)}: ${donor.id} has no lone pair, so no arrow can start there. Start at a lone pair or a bond.`))
          return
        }
        pairUse.set(donor.id, used)
      }
      let acceptor: string
      if (to.kind === 'atom') acceptor = to.atom
      else if (to.atoms.includes(donor.id)) acceptor = to.atoms[0] === donor.id ? to.atoms[1] : to.atoms[0]
      else { issues.push(issue('arrow-end-unreachable', `${at}.to`, `${arrowText(arrow)}: electrons on ${donor.id} can only form a bond from ${donor.id}; end the arrow on ${donor.id}'s new bond or on the atom it attacks.`)); return }
      if (acceptor === donor.id) { issues.push(issue('arrow-end-self', `${at}.to`, `${arrowText(arrow)}: the arrow must leave ${donor.id}.`)); return }
      const formed = bondName(donor.id, acceptor)
      add(atomE, donor.id, -n); add(bondE, formed, n)
      moves.push({ arrow: { ...arrow }, kind: arrow.single ? 'electron-forms-bond' : 'lone-pair-forms-bond', donor: donor.id, acceptor, formed })
      return
    }
    const [x, y] = from.atoms
    const bond = bondBetween(before, x, y)
    const name = bondName(x, y)
    if (!bond) { issues.push(issue('arrow-start-no-bond', `${at}.from`, `${arrowText(arrow)}: there is no bond between ${x} and ${y} to start from.`)); return }
    const used = (bondUse.get(name) ?? 0) + n
    if (2 * bond.order < used) {
      issues.push(issue('arrow-start-overused', `${at}.from`, arrow.single
        ? `${arrowText(arrow)}: the ${name} bond has only ${2 * bond.order} electrons to move.`
        : `${arrowText(arrow)}: the ${name} bond has only ${bond.order} pair${bond.order === 1 ? '' : 's'} to move.`))
      return
    }
    bondUse.set(name, used)
    if (to.kind === 'atom') {
      if (to.atom !== x && to.atom !== y) {
        issues.push(issue('arrow-end-ambiguous', `${at}.to`, `${arrowText(arrow)}: say which end of ${name} forms the new bond by ending the arrow on that bond (for example ${y}-${to.atom}).`))
        return
      }
      add(bondE, name, -n); add(atomE, to.atom, n)
      moves.push({ arrow: { ...arrow }, kind: arrow.single ? 'bond-electron-to-atom' : 'bond-to-lone-pair', donor: to.atom, acceptor: to.atom, broken: name })
      return
    }
    const [p, q] = to.atoms
    const target = bondName(p, q)
    if (target === name) { issues.push(issue('arrow-end-self', `${at}.to`, `${arrowText(arrow)}: an arrow cannot end on the bond it starts from.`)); return }
    const shared = [x, y].filter(id => id === p || id === q)
    if (shared.length !== 1) { issues.push(issue('arrow-end-unreachable', `${at}.to`, `${arrowText(arrow)}: a bond's electrons can move only to a bond that shares one of its atoms.`)); return }
    const keeper = shared[0], partner = keeper === p ? q : p
    add(bondE, name, -n); add(bondE, target, n)
    moves.push({ arrow: { ...arrow }, kind: arrow.single ? 'bond-electron-shifts' : 'bond-shifts', donor: keeper, acceptor: partner, broken: name, formed: target })
  })
  for (const m of moves) if (m.formed && moves.some(o => o.broken === m.formed))
    issues.push(issue('arrows-cancel', path, `The ${m.formed} bond is both made and broken in one step; draw each electron's move once.`))
  if (issues.length) return { moves, issues }
  const next = cloneStructure(before)
  for (const [id, d] of atomE) {
    const atom = next.atoms.find(a => a.id === id)!
    const nonBonding = 2 * atom.lp + atom.rad + d
    if (nonBonding < 0) { issues.push(issue('electron-count', path, `${atom.id} would give away more electrons than it has.`)); continue }
    atom.lp = Math.floor(nonBonding / 2); atom.rad = nonBonding % 2
  }
  for (const [name, d] of bondE) {
    const [a, b] = name.split('-')
    const existing = bondBetween(next, a, b)
    const electrons = (existing ? 2 * existing.order : 0) + d
    if (electrons % 2) {
      issues.push(issue('fishhook-half-bond', path, existing
        ? `The ${name} bond would be left with ${electrons} electron${electrons === 1 ? '' : 's'}. When a bond breaks with fishhooks, each atom takes one electron: draw one fishhook to each end.`
        : `The new ${name} bond would hold one electron. A bond is a pair: with fishhooks, one electron comes from each side.`))
      continue
    }
    if (existing) existing.order = electrons / 2
    else next.bonds.push({ a, b, order: electrons / 2 })
  }
  if (issues.length) return { moves, issues }
  next.bonds = next.bonds.filter(b => b.order !== 0)
  for (const b of next.bonds) if (b.order < 0 || b.order > 3)
    issues.push(issue('bond-order', path, `The ${bondName(b.a, b.b)} bond would have order ${b.order}; bonds are single, double or triple.`))
  for (const atom of next.atoms) {
    const bonds = next.bonds.reduce((s, b) => s + (b.a === atom.id || b.b === atom.id ? b.order : 0), 0) + atom.h
    atom.charge = formalCharge(atom.el, atom.lp, bonds, atom.rad)
  }
  if (issues.length) return { moves, issues }
  issues.push(...errorsOnly(octetIssues(next, path)))
  if (totalValenceElectrons(next) !== totalValenceElectrons(before) || totalCharge(next) !== totalCharge(before))
    issues.push(issue('conservation', path, 'Electrons or charge were not conserved; this step cannot be checked.'))
  return issues.length ? { moves, issues } : { next, moves, issues }
}

/** Plain words for what each arrow did, using the computed charges of the structure after the step. */
export function describeMoves(moves: readonly ArrowMove[], before: Structure, after: Structure): string[] {
  const el = (s: Structure, id: string) => s.atoms.find(a => a.id === id)!
  const name = (id: string) => `${id} (${ELEMENTS[el(after, id).el].name})`
  const lines = moves.map(m => {
    switch (m.kind) {
      case 'lone-pair-forms-bond': return `A lone pair on ${name(m.donor)} forms a new bond to ${m.acceptor}.`
      case 'bond-to-lone-pair': return `The ${m.broken} bond breaks; both electrons go to ${name(m.donor)} as a lone pair.`
      case 'bond-shifts': return `The electrons of the ${m.broken} bond move to make a bond between ${m.donor} and ${m.acceptor}.`
      case 'electron-forms-bond': return `The unpaired electron on ${name(m.donor)} goes into a new bond to ${m.acceptor}.`
      case 'bond-electron-to-atom': return `One electron of the ${m.broken} bond goes to ${name(m.donor)}.`
      case 'bond-electron-shifts': return `One electron of the ${m.broken} bond goes into a bond between ${m.donor} and ${m.acceptor}.`
    }
  })
  const sign = (c: number) => (c > 0 ? `+${c}` : `${c}`)
  for (const atom of after.atoms) {
    const was = el(before, atom.id)
    if (was.charge !== atom.charge) lines.push(`${atom.id} goes from formal charge ${sign(was.charge)} to ${sign(atom.charge)}.`)
    if (!was.rad && atom.rad) lines.push(`${atom.id} now has an unpaired electron: it is a radical.`)
    if (was.rad && !atom.rad) lines.push(`${atom.id} no longer has an unpaired electron.`)
  }
  return lines
}

/** Fork arrows (Curly Arrow Ketcher `describeArrows`) mapped onto scene atom ids, given the atom and bond order the
 * add-on loaded. A fishhook keeps its meaning (one electron); a full arrow drawn from a radical dot is refused with the
 * reason, because a pair cannot come from a single electron. */
export interface KetcherArrowDescriptor {
  kind: 'curly' | 'fishhook'
  source: { kind: 'lone-pair'; atomId: number } | { kind: 'radical'; atomId: number } | { kind: 'bond'; bondId: number }
  destination: { kind: 'atom'; atomId: number } | { kind: 'bond'; bondId: number } | { kind: 'new-bond'; atomId1: number; atomId2: number }
}
export function arrowsFromKetcher(descriptors: readonly KetcherArrowDescriptor[], atomIds: readonly string[], bonds: readonly [string, string][]):
  { arrows: ArrowSpec[] } | { issues: Issue[] } {
  const out: ArrowSpec[] = []
  const atom = (i: number) => atomIds[i]
  const bond = (i: number) => (bonds[i] ? `${bonds[i][0]}-${bonds[i][1]}` : undefined)
  for (const [i, d] of descriptors.entries()) {
    if (d.kind === 'curly' && d.source.kind === 'radical')
      return { issues: [issue('arrow-pair-from-radical', `arrows[${i}]`, 'A full arrow moves an electron pair, but it starts at a single unpaired electron. Use a fishhook (half-headed arrow).')] }
    const from = d.source.kind === 'bond' ? bond(d.source.bondId) : atom(d.source.atomId)
    const to = d.destination.kind === 'atom' ? atom(d.destination.atomId) : d.destination.kind === 'bond' ? bond(d.destination.bondId)
      : atom(d.destination.atomId1) && atom(d.destination.atomId2) ? `${atom(d.destination.atomId1)}-${atom(d.destination.atomId2)}` : undefined
    if (!from || !to) return { issues: [issue('arrow-unmapped', `arrows[${i}]`, 'An arrow points at something that is not in this structure.')] }
    out.push(d.kind === 'fishhook' ? { from, to, single: true } : { from, to })
  }
  return { arrows: out }
}
