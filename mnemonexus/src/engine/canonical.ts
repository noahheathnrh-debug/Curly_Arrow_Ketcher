import { components, substructure, type Structure } from './molecule'

/**
 * Structure equivalence for checking: two species are the same when their graphs are isomorphic over element, charge,
 * hydrogen count, lone pairs, unpaired electrons and bond order. Atom ids, numbering, drawing order and layout never matter, and explicit
 * terminal hydrogens are folded into hydrogen counts first. Colour refinement prunes a bounded exact search; when the
 * budget runs out the answer is `unknown`, which a checker must report as unsupported, never as right or wrong.
 */

interface Graph { labels: string[]; adj: Map<number, number>[] }
export type Same = 'same' | 'different' | 'unknown'
const SEARCH_BUDGET = 200_000

/** Folds neutral hydrogens with one single bond to a non-hydrogen atom into that atom's hydrogen count. */
export function foldHydrogens(structure: Structure): Structure {
  const fold = new Set<string>()
  const extra = new Map<string, number>()
  for (const atom of structure.atoms) {
    if (atom.el !== 'H' || atom.charge !== 0 || atom.lp !== 0 || atom.rad !== 0 || atom.h !== 0) continue
    const bonds = structure.bonds.filter(b => b.a === atom.id || b.b === atom.id)
    if (bonds.length !== 1 || bonds[0].order !== 1) continue
    const other = bonds[0].a === atom.id ? bonds[0].b : bonds[0].a
    if (structure.atoms.find(a => a.id === other)!.el === 'H' || fold.has(other)) continue
    fold.add(atom.id)
    extra.set(other, (extra.get(other) ?? 0) + 1)
  }
  return {
    atoms: structure.atoms.filter(a => !fold.has(a.id)).map(a => ({ ...a, h: a.h + (extra.get(a.id) ?? 0) })),
    bonds: structure.bonds.filter(b => !fold.has(b.a) && !fold.has(b.b)).map(b => ({ ...b })),
  }
}

function graphOf(structure: Structure): Graph {
  const s = foldHydrogens(structure)
  const index = new Map(s.atoms.map((a, i) => [a.id, i]))
  const adj = s.atoms.map(() => new Map<number, number>())
  for (const b of s.bonds) { adj[index.get(b.a)!].set(index.get(b.b)!, b.order); adj[index.get(b.b)!].set(index.get(b.a)!, b.order) }
  return { labels: s.atoms.map(a => `${a.el}|${a.charge}|${a.h}|${a.lp}|${a.rad}`), adj }
}

/** Joint colour refinement so colours are comparable between the two graphs. */
function refine(a: Graph, b: Graph): [number[], number[]] {
  const names = new Map<string, number>()
  const id = (s: string) => { if (!names.has(s)) names.set(s, names.size); return names.get(s)! }
  let ca = a.labels.map(id), cb = b.labels.map(id)
  const rounds = Math.max(a.labels.length, b.labels.length)
  for (let r = 0; r < rounds; r++) {
    names.clear()
    const step = (g: Graph, c: number[]) => c.map((own, i) => id(`${own}:${[...g.adj[i]].map(([j, o]) => `${c[j]}/${o}`).sort().join(',')}`))
    const na = step(a, ca), nb = step(b, cb)
    const stable = new Set(na).size === new Set(ca).size && new Set(nb).size === new Set(cb).size
    ca = na; cb = nb
    if (stable) break
  }
  return [ca, cb]
}

function graphsSame(a: Graph, b: Graph): Same {
  const n = a.labels.length
  if (n !== b.labels.length) return 'different'
  const edges = (g: Graph) => g.adj.reduce((s, m) => s + m.size, 0)
  if (edges(a) !== edges(b)) return 'different'
  const [ca, cb] = refine(a, b)
  if ([...ca].sort((x, y) => x - y).join() !== [...cb].sort((x, y) => x - y).join()) return 'different'
  // Most constrained (rarest colour) atoms first, preferring neighbours of already placed atoms.
  const freq = new Map<number, number>()
  for (const c of ca) freq.set(c, (freq.get(c) ?? 0) + 1)
  const order: number[] = []
  const placed = new Set<number>()
  while (order.length < n) {
    let best = -1, bestScore = Infinity
    for (let i = 0; i < n; i++) if (!placed.has(i)) {
      const linked = [...a.adj[i].keys()].some(j => placed.has(j)) ? 0 : 1
      const score = linked * 1e6 + freq.get(ca[i])!
      if (score < bestScore) { best = i; bestScore = score }
    }
    order.push(best); placed.add(best)
  }
  const map = new Array<number>(n).fill(-1), used = new Array<boolean>(n).fill(false)
  let budget = SEARCH_BUDGET
  const search = (k: number): boolean | null => {
    if (k === n) return true
    if (--budget < 0) return null
    const i = order[k]
    for (let j = 0; j < n; j++) {
      if (used[j] || cb[j] !== ca[i]) continue
      let ok = true
      for (const [x, o] of a.adj[i]) if (map[x] >= 0 && b.adj[j].get(map[x]) !== o) { ok = false; break }
      if (ok) for (const [y] of b.adj[j]) { const x = map.indexOf(y); if (x >= 0 && !a.adj[i].has(x)) { ok = false; break } }
      if (!ok) continue
      map[i] = j; used[j] = true
      const r = search(k + 1)
      if (r !== false) return r
      map[i] = -1; used[j] = false
    }
    return false
  }
  const r = search(0)
  return r === null ? 'unknown' : r ? 'same' : 'different'
}

export function sameStructure(a: Structure, b: Structure): Same { return graphsSame(graphOf(a), graphOf(b)) }

/** Species-by-species comparison: every species of one set matches a different species of the other. */
export function sameSpeciesSet(a: Structure, b: Structure): Same {
  const pa = components(foldHydrogens(a)).map(ids => substructure(foldHydrogens(a), ids))
  const pb = components(foldHydrogens(b)).map(ids => substructure(foldHydrogens(b), ids))
  if (pa.length !== pb.length) return 'different'
  const left = [...pb]
  let unknown = false
  for (const s of pa) {
    let found = -1
    for (let i = 0; i < left.length && found < 0; i++) {
      const r = sameStructure(s, left[i])
      if (r === 'same') found = i
      else if (r === 'unknown') unknown = true
    }
    if (found < 0) return unknown ? 'unknown' : 'different'
    left.splice(found, 1)
  }
  return 'same'
}

/** The species (connected component) of a structure that contains an atom. */
export function speciesOf(structure: Structure, atomId: string): Structure | undefined {
  const ids = components(structure).find(c => c.includes(atomId))
  return ids ? substructure(structure, ids) : undefined
}
