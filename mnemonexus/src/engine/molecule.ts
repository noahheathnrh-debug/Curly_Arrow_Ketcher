import type { Issue } from './issue'

/**
 * Electron bookkeeping for small organic and inorganic species (Area E). Pure and deterministic: lone pairs and formal
 * charges are always computed from element, bonds, hydrogens, the declared charge and the declared unpaired electrons
 * (`rad`, radicals), never taken from an author. Aromatic bond types, stereochemistry, carbenes and expanded octets
 * beyond the table below are outside this engine.
 */

/** `expanded` is the most electrons allowed when a structure is built with expanded octets (VSEPR: SF6, XeF4, ClF3);
 * mechanisms keep `maxShell`, so an arrow that overfills chlorine is still refused. */
export interface ElementInfo { valence: number; maxShell: number; name: string; metal?: boolean; expanded?: number }

/** Valence electrons and the most electrons the engine allows around the atom (shared pairs counted in full). */
export const ELEMENTS: Readonly<Record<string, ElementInfo>> = {
  H: { valence: 1, maxShell: 2, name: 'hydrogen' },
  Be: { valence: 2, maxShell: 8, name: 'beryllium' },
  B: { valence: 3, maxShell: 8, name: 'boron' },
  C: { valence: 4, maxShell: 8, name: 'carbon' },
  N: { valence: 5, maxShell: 8, name: 'nitrogen' },
  O: { valence: 6, maxShell: 8, name: 'oxygen' },
  F: { valence: 7, maxShell: 8, name: 'fluorine' },
  Al: { valence: 3, maxShell: 8, name: 'aluminium' },
  Si: { valence: 4, maxShell: 8, name: 'silicon' },
  P: { valence: 5, maxShell: 10, name: 'phosphorus', expanded: 12 },
  S: { valence: 6, maxShell: 12, name: 'sulfur' },
  Cl: { valence: 7, maxShell: 8, name: 'chlorine', expanded: 12 },
  Br: { valence: 7, maxShell: 8, name: 'bromine', expanded: 12 },
  I: { valence: 7, maxShell: 8, name: 'iodine', expanded: 12 },
  Xe: { valence: 8, maxShell: 8, name: 'xenon', expanded: 12 },
  Li: { valence: 1, maxShell: 0, name: 'lithium', metal: true },
  Na: { valence: 1, maxShell: 0, name: 'sodium', metal: true },
  K: { valence: 1, maxShell: 0, name: 'potassium', metal: true },
  Mg: { valence: 2, maxShell: 0, name: 'magnesium', metal: true },
}
/** Second-row atoms that a mechanism usually leaves with a full octet; fewer electrons is reported, not refused. */
const OCTET_EXPECTED = new Set(['C', 'N', 'O', 'F'])

export const ATOM_ID = /^[A-Za-z][A-Za-z0-9]{0,11}$/
export const MAX_ATOMS = 60

/** `rad` declares an unpaired electron (a radical). It must be written, so a miscounted atom is caught, not guessed. */
export interface AtomSpec { id: string; el: string; h?: number; charge?: number; rad?: number }
export interface BondSpec { a: string; b: string; order: number }
export interface StructureSpec { atoms: AtomSpec[]; bonds: BondSpec[] }

/** A computed atom: `lp`, `rad` and `charge` are always consistent with each other. `rad` is 0 or 1. */
export interface Atom { id: string; el: string; h: number; lp: number; rad: number; charge: number }
export interface Bond { a: string; b: string; order: number }
export interface Structure { atoms: Atom[]; bonds: Bond[] }

export const bondName = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`)
const issue = (code: string, path: string, message: string): Issue => ({ code, path, message })

export function bondOrderSum(structure: Structure, id: string): number {
  let sum = 0
  for (const b of structure.bonds) if (b.a === id || b.b === id) sum += b.order
  return sum
}

export function bondBetween(structure: Structure, a: string, b: string): Bond | undefined {
  return structure.bonds.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a))
}

/** Formal charge = valence electrons - non-bonding electrons - bonds (each bond counted once, hydrogens included). */
export function formalCharge(el: string, lp: number, bonds: number, rad = 0): number {
  return ELEMENTS[el].valence - 2 * lp - rad - bonds
}

/** Electrons around an atom for the octet rule: both electrons of every shared pair, its lone pairs and any unpaired one. */
export function electronsAround(structure: Structure, atom: Atom): number {
  return 2 * (bondOrderSum(structure, atom.id) + atom.h) + 2 * atom.lp + atom.rad
}

/** Validates a written structure and derives lone pairs from the declared charge. */
export interface BuildOptions { /** Allow expanded octets (each element's `expanded`), for shapes rather than mechanisms. */ expandedOctets?: boolean }
export function buildStructure(spec: StructureSpec, path = 'structure', options: BuildOptions = {}): { structure?: Structure; issues: Issue[] } {
  const issues: Issue[] = []
  if (!spec.atoms.length) issues.push(issue('structure-empty', `${path}.atoms`, 'A structure needs at least one atom.'))
  if (spec.atoms.length > MAX_ATOMS) issues.push(issue('structure-too-large', `${path}.atoms`, `At most ${MAX_ATOMS} atoms are supported.`))
  const ids = new Set<string>()
  spec.atoms.forEach((a, i) => {
    if (!ATOM_ID.test(a.id)) issues.push(issue('atom-id', `${path}.atoms[${i}].id`, `Atom id ${a.id} must be a letter followed by letters or digits (no hyphens).`))
    if (ids.has(a.id)) issues.push(issue('atom-duplicate', `${path}.atoms[${i}].id`, `Atom id ${a.id} is used twice.`))
    ids.add(a.id)
    if (!ELEMENTS[a.el]) issues.push(issue('element-unsupported', `${path}.atoms[${i}].el`, `Element ${a.el} is not supported by this engine.`))
    if (a.h !== undefined && (!Number.isInteger(a.h) || a.h < 0 || a.h > 4)) issues.push(issue('hydrogens', `${path}.atoms[${i}].h`, 'Hydrogen count must be 0 to 4.'))
    if (a.charge !== undefined && (!Number.isInteger(a.charge) || Math.abs(a.charge) > 3)) issues.push(issue('charge', `${path}.atoms[${i}].charge`, 'Charge must be a whole number from -3 to 3.'))
    if (a.rad !== undefined && a.rad !== 0 && a.rad !== 1) issues.push(issue('radical-count', `${path}.atoms[${i}].rad`, 'An atom has 0 or 1 unpaired electrons here.'))
  })
  const seen = new Set<string>()
  spec.bonds.forEach((b, i) => {
    if (!ids.has(b.a) || !ids.has(b.b)) issues.push(issue('bond-atom', `${path}.bonds[${i}]`, `Bond ${b.a}-${b.b} names an atom that is not in the structure.`))
    if (b.a === b.b) issues.push(issue('bond-self', `${path}.bonds[${i}]`, `Atom ${b.a} cannot bond to itself.`))
    if (![1, 2, 3].includes(b.order)) issues.push(issue('bond-order', `${path}.bonds[${i}].order`, 'Bond order must be 1, 2 or 3.'))
    const name = bondName(b.a, b.b)
    if (seen.has(name)) issues.push(issue('bond-duplicate', `${path}.bonds[${i}]`, `Bond ${name} is listed twice.`))
    seen.add(name)
  })
  if (issues.length) return { issues }
  const structure: Structure = { atoms: [], bonds: spec.bonds.map(b => ({ a: b.a, b: b.b, order: b.order })) }
  spec.atoms.forEach((a, i) => {
    const h = a.h ?? 0, charge = a.charge ?? 0, rad = a.rad ?? 0
    const bonds = structure.bonds.reduce((s, b) => s + (b.a === a.id || b.b === a.id ? b.order : 0), 0) + h
    const nonBonding = ELEMENTS[a.el].valence - charge - bonds
    if (nonBonding - rad < 0) issues.push(issue('electron-count', `${path}.atoms[${i}]`,
      `${a.id} (${a.el}) has ${bonds} bonds with charge ${charge}: it has no electrons left for that. Check its bonds, hydrogens or charge.`))
    else if ((nonBonding - rad) % 2) issues.push(issue(rad ? 'radical-count' : 'radical-undeclared', `${path}.atoms[${i}]`, rad
      ? `${a.id} (${a.el}) is marked as a radical, but with these bonds and charge all its electrons are paired. Check its bonds, hydrogens or charge.`
      : `${a.id} (${a.el}) would keep an unpaired electron. Check its bonds, hydrogens or charge, or mark it as a radical (rad: 1) if that is meant.`))
    structure.atoms.push({ id: a.id, el: a.el, h, charge, rad, lp: Math.max(0, Math.floor((nonBonding - rad) / 2)) })
  })
  if (issues.length) return { issues }
  issues.push(...octetIssues(structure, path, options.expandedOctets))
  return issues.some(i => i.code !== 'octet-incomplete') ? { issues } : { structure, issues }
}

/** Errors for too many electrons; `octet-incomplete` notes (not errors) for carbocations and similar species. */
export function octetIssues(structure: Structure, path = 'structure', expandedOctets = false): Issue[] {
  const out: Issue[] = []
  for (const atom of structure.atoms) {
    const info = ELEMENTS[atom.el]
    const around = electronsAround(structure, atom)
    if (info.metal) {
      if (bondOrderSum(structure, atom.id) || atom.h) out.push(issue('metal-bonded', `${path}.${atom.id}`, `${atom.id} (${info.name}) is treated as an ion here and cannot carry bonds.`))
      continue
    }
    const most = expandedOctets ? info.expanded ?? info.maxShell : info.maxShell
    if (around > most) out.push(issue('octet-exceeded', `${path}.${atom.id}`,
      `${atom.id} (${atom.el}) would have ${around} electrons around it; ${info.name} holds at most ${most} here.`))
    else if (OCTET_EXPECTED.has(atom.el) && around < 8) out.push(issue('octet-incomplete', `${path}.${atom.id}`,
      `${atom.id} (${atom.el}) has only ${around} electrons around it${atom.rad ? ' (a radical)' : atom.charge > 0 ? ' (a cation)' : ''}.`))
  }
  return out
}

export const errorsOnly = (issues: Issue[]) => issues.filter(i => i.code !== 'octet-incomplete')

export function totalCharge(structure: Structure): number { return structure.atoms.reduce((s, a) => s + a.charge, 0) }
export function totalValenceElectrons(structure: Structure): number {
  return structure.atoms.reduce((s, a) => s + ELEMENTS[a.el].valence + a.h, 0) - totalCharge(structure)
}

export function cloneStructure(structure: Structure): Structure {
  return { atoms: structure.atoms.map(a => ({ ...a })), bonds: structure.bonds.map(b => ({ ...b })) }
}

/** A plain-words account of one atom: bonds, lone pairs, electrons around it and how its formal charge arises. */
export function describeAtom(structure: Structure, atom: Atom): string {
  const bonds = bondOrderSum(structure, atom.id) + atom.h
  const info = ELEMENTS[atom.el]
  const sign = atom.charge > 0 ? `+${atom.charge}` : `${atom.charge}`
  return `${atom.id} (${info.name}): ${bonds} bond${bonds === 1 ? '' : 's'}, ${atom.lp} lone pair${atom.lp === 1 ? '' : 's'}, `
    + (atom.rad ? 'one unpaired electron, ' : '')
    + `${electronsAround(structure, atom)} electrons around it; formal charge ${info.valence} - ${2 * atom.lp + atom.rad} - ${bonds} = ${sign}.`
}

/** Connected species as lists of atom ids, in first-atom order. */
export function components(structure: Structure): string[][] {
  const parent = new Map(structure.atoms.map(a => [a.id, a.id]))
  const find = (x: string): string => { const p = parent.get(x)!; if (p === x) return x; const r = find(p); parent.set(x, r); return r }
  for (const b of structure.bonds) parent.set(find(b.a), find(b.b))
  const groups = new Map<string, string[]>()
  for (const a of structure.atoms) { const r = find(a.id); if (!groups.has(r)) groups.set(r, []); groups.get(r)!.push(a.id) }
  return [...groups.values()]
}

export function substructure(structure: Structure, ids: readonly string[]): Structure {
  const keep = new Set(ids)
  return { atoms: structure.atoms.filter(a => keep.has(a.id)).map(a => ({ ...a })),
    bonds: structure.bonds.filter(b => keep.has(b.a) && keep.has(b.b)).map(b => ({ ...b })) }
}

/** Back to the written form (charges and radicals kept; lone pairs dropped because they are derived). */
export function specOf(structure: Structure): StructureSpec {
  return { atoms: structure.atoms.map(a => ({ id: a.id, el: a.el, ...(a.h ? { h: a.h } : {}), ...(a.charge ? { charge: a.charge } : {}), ...(a.rad ? { rad: a.rad } : {}) })),
    bonds: structure.bonds.map(b => ({ ...b })) }
}

/** A short molecular formula with radical dots and charge, e.g. CH3Br, HO- or CH3•, for captions. */
export function formulaOf(structure: Structure): string {
  const counts = new Map<string, number>()
  for (const a of structure.atoms) {
    counts.set(a.el, (counts.get(a.el) ?? 0) + 1)
    if (a.h) counts.set('H', (counts.get('H') ?? 0) + a.h)
  }
  const order = [...counts.keys()].sort((x, y) => {
    const rank = (e: string) => (counts.has('C') ? (e === 'C' ? 0 : e === 'H' ? 1 : 2) : 2)
    return rank(x) - rank(y) || (x < y ? -1 : 1)
  })
  const charge = totalCharge(structure)
  const tail = charge === 0 ? '' : `${Math.abs(charge) > 1 ? Math.abs(charge) : ''}${charge > 0 ? '+' : '-'}`
  const dots = '•'.repeat(structure.atoms.reduce((s, a) => s + a.rad, 0))
  return order.map(e => `${e}${counts.get(e)! > 1 ? counts.get(e) : ''}`).join('') + dots + tail
}
