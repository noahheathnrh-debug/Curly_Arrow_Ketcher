import type { Issue } from './issue'
import { buildStructure, ELEMENTS, type AtomSpec, type BondSpec, type Structure } from './molecule'

/**
 * Reads a learner's drawing from Curly Arrow Ketcher (KET JSON, as the editor saves it) into the engine's structure.
 * Hydrogens follow the editor's convention: an explicit `implicitHCount`, otherwise the element's usual valence
 * adjusted for charge and radical dots. Aromatic, query, stereo and group features are refused with a reason, never guessed.
 */

const DEFAULT_VALENCE: Readonly<Record<string, number>> = { H: 1, B: 3, Al: 3, C: 4, N: 3, O: 2, F: 1, Si: 4, P: 3, S: 2, Cl: 1, Br: 1, I: 1 }
const issue = (code: string, path: string, message: string): Issue => ({ code, path, message })
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Implicit hydrogens for an atom drawn without an explicit count (charge shifts the usual valence; an unpaired
 * electron takes the place of one bond, as in CH3•). */
export function defaultHydrogens(el: string, charge: number, bondOrders: number, rad = 0): number {
  const base = DEFAULT_VALENCE[el]
  if (base === undefined) return 0
  // N+, O+ and S+ gain a bond (ammonium, oxonium); anions lose one. C, B and halogens lose one either way.
  // B and Al anions take a fourth bond, as the editor counts them (BH4-, AlH4-: ketcher-core calculateGroup3Valence).
  const valence = ['N', 'O', 'S', 'P'].includes(el) ? base + charge : (el === 'B' || el === 'Al') && charge === -1 ? 4 : charge === 0 ? base : base - Math.abs(charge)
  return Math.max(0, valence - rad - bondOrders)
}

export function structureFromKet(ket: string | Record<string, unknown>): { structure?: Structure; issues: Issue[] } {
  let doc: unknown
  try { doc = typeof ket === 'string' ? JSON.parse(ket) : ket } catch { return { issues: [issue('ket-invalid', 'ket', 'The drawing could not be read.')] } }
  if (!isRecord(doc) || !isRecord(doc.root) || !Array.isArray(doc.root.nodes)) return { issues: [issue('ket-invalid', 'ket', 'The drawing has no molecules.')] }
  const atoms: AtomSpec[] = [], bonds: BondSpec[] = []
  let n = 0
  for (const node of doc.root.nodes) {
    if (!isRecord(node) || typeof node.$ref !== 'string') continue // arrows, pluses and text are not molecules
    const mol = doc[node.$ref]
    if (!isRecord(mol) || mol.type !== 'molecule' || !Array.isArray(mol.atoms)) return { issues: [issue('ket-unsupported', 'ket', 'Only molecules can be checked here.')] }
    if (Array.isArray(mol.sgroups) && mol.sgroups.length) return { issues: [issue('ket-unsupported', 'ket', 'Groups and abbreviations cannot be checked; draw the atoms out.')] }
    const ids: string[] = []
    const local: { el: string; charge: number; rad: number; h?: number }[] = []
    for (const raw of mol.atoms) {
      if (!isRecord(raw) || typeof raw.label !== 'string' || !ELEMENTS[raw.label]) return { issues: [issue('ket-element', 'ket', `Element ${isRecord(raw) ? String(raw.label) : '?'} is not supported here.`)] }
      // Ketcher radicals: 2 is one unpaired electron (a doublet); 1 and 3 are carbene pairs, which this engine does not model.
      if (raw.radical && raw.radical !== 2) return { issues: [issue('ket-unsupported', 'ket', 'Carbenes (two unpaired or paired non-bonding electrons marked as a radical) are not checked here; use a single radical dot.')] }
      if (raw.stereoLabel || raw.queryProperties || raw.isotope) return { issues: [issue('ket-unsupported', 'ket', 'Isotopes, stereo and query atoms are not checked by this tool.')] }
      const charge = Number.isInteger(raw.charge) ? (raw.charge as number) : 0
      local.push({ el: raw.label, charge, rad: raw.radical === 2 ? 1 : 0, ...(Number.isInteger(raw.implicitHCount) ? { h: raw.implicitHCount as number } : {}) })
      ids.push(`k${++n}`)
    }
    const orders = new Array<number>(ids.length).fill(0)
    for (const raw of Array.isArray(mol.bonds) ? mol.bonds : []) {
      if (!isRecord(raw) || !Array.isArray(raw.atoms) || raw.atoms.length !== 2) return { issues: [issue('ket-invalid', 'ket', 'A bond in the drawing is damaged.')] }
      if (![1, 2, 3].includes(raw.type as number) || (raw.stereo !== undefined && raw.stereo !== 0))
        return { issues: [issue('ket-unsupported', 'ket', 'Aromatic, query and stereo bonds are not checked here; draw single, double or triple bonds.')] }
      const [a, b] = raw.atoms as number[]
      if (!ids[a] || !ids[b]) return { issues: [issue('ket-invalid', 'ket', 'A bond in the drawing is damaged.')] }
      bonds.push({ a: ids[a], b: ids[b], order: raw.type as number })
      orders[a] += raw.type as number; orders[b] += raw.type as number
    }
    local.forEach((a, i) => atoms.push({ id: ids[i], el: a.el, charge: a.charge, ...(a.rad ? { rad: a.rad } : {}), h: a.h ?? defaultHydrogens(a.el, a.charge, orders[i], a.rad) }))
  }
  if (!atoms.length) return { issues: [issue('ket-empty', 'ket', 'Draw a structure first.')] }
  return buildStructure({ atoms, bonds }, 'drawing')
}
