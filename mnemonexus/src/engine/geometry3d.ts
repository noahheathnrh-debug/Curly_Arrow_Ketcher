import { ELEMENTS, type Structure } from './molecule'

/**
 * A 3D shape for a drawn molecule, by VSEPR. Indigo works in 2D only, so the shape is built here from the graph the
 * engine already has: each atom's electron domains (bonded atoms, a multiple bond counting once, and lone pairs) repel
 * one another around it, lone pairs more strongly; bonds keep their lengths; the atoms around a double bond stay in one
 * plane; atoms that are not close in the graph keep apart. A short relaxation from the drawing (or from several seeded
 * starts, keeping the lowest-energy result) then settles the shape.
 *
 * What it is for: the shape and its bond angles, to teach VSEPR, polarity and isomers. It is not a force field: lengths
 * come from covalent radii and angles from repulsion, which is enough to tell bent from linear and a chair from flat.
 * Pure and deterministic for a given seed.
 */

export interface Vec { x: number; y: number; z: number }
export interface Atom3D { id: string; el: string; p: Vec; /** A hydrogen the drawing left implicit. */ implicit?: boolean }
export interface Bond3D { a: string; b: string; order: number }
export interface LonePair3D { atom: string; p: Vec }
export interface Centre {
  atom: string
  /** Electron domains: bonded atoms (a multiple bond counts once) plus lone pairs. */
  domains: number
  lonePairs: number
  /** The VSEPR name of the arrangement of atoms ("trigonal pyramidal"), or null when the table has none. */
  shape: string | null
  /** The textbook bond angle for this arrangement, in words. */
  ideal: string
  /** Every angle between two bonded atoms, in degrees, as built. */
  angles: number[]
}
export interface Geometry { atoms: Atom3D[]; bonds: Bond3D[]; lonePairs: LonePair3D[]; centres: Centre[] }

export interface GeometryOptions {
  /** 2D drawing coordinates (KET units: one unit is about one bond), used as the starting point. */
  coords?: Readonly<Record<string, { x: number; y: number }>>
  /** Atoms drawn towards (1) or away from (-1) the viewer, from wedges, so a stereocentre keeps its handedness. */
  depth?: Readonly<Record<string, 1 | -1>>
  seed?: number
  iterations?: number
  /** Seeded starts to try, keeping the lowest energy. Default: 1 from a drawing, 8 without one. */
  restarts?: number
  /** Tuning, for tests: how much more a lone pair repels a bonding pair, two lone pairs repel each other, and the
   * fall-off of repulsion (VSEPR: LP-LP > LP-BP > BP-BP). */
  lonePairWeight?: number
  lonePairPairWeight?: number
  power?: number
}

/** Covalent radii in ångström (single bonds). */
const RADIUS: Readonly<Record<string, number>> = {
  H: 0.31, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02,
  Br: 1.2, I: 1.39, Xe: 1.4, Li: 1.28, Na: 1.66, K: 2.03, Mg: 1.41,
}
const SHORTEN = [1, 1, 0.87, 0.78]
const LONE_PAIR_REACH = 0.6

const SHAPES: Readonly<Record<string, string>> = {
  '2,0': 'linear', '3,0': 'trigonal planar', '3,1': 'bent', '4,0': 'tetrahedral', '4,1': 'trigonal pyramidal', '4,2': 'bent',
  '5,0': 'trigonal bipyramidal', '5,1': 'seesaw', '5,2': 'T-shaped', '5,3': 'linear', '6,0': 'octahedral',
  '6,1': 'square pyramidal', '6,2': 'square planar',
}
const IDEAL: Readonly<Record<string, string>> = {
  '2,0': '180°', '3,0': '120°', '3,1': 'a little less than 120°', '4,0': '109.5°', '4,1': 'about 107°', '4,2': 'about 104.5°',
  '5,0': '90° and 120°', '5,1': 'a little less than 90° and 120°', '5,2': 'a little less than 90°', '5,3': '180°', '6,0': '90°',
  '6,1': 'a little less than 90°', '6,2': '90°',
}

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k, z: a.z * k })
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vec, b: Vec): Vec => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
const length = (a: Vec) => Math.sqrt(dot(a, a))
const unit = (a: Vec): Vec => { const l = length(a) || 1; return scale(a, 1 / l) }
export const angleBetween = (centre: Vec, a: Vec, b: Vec) =>
  (Math.acos(Math.max(-1, Math.min(1, dot(unit(sub(a, centre)), unit(sub(b, centre)))))) * 180) / Math.PI

function random(seed: number) {
  let t = seed >>> 0
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }
}
const randomUnit = (rand: () => number): Vec => {
  const z = rand() * 2 - 1, phi = rand() * Math.PI * 2, r = Math.sqrt(1 - z * z)
  return { x: r * Math.cos(phi), y: r * Math.sin(phi), z }
}

export const bondLength = (a: string, b: string, order = 1) => ((RADIUS[a] ?? 1) + (RADIUS[b] ?? 1)) * (SHORTEN[order] ?? 1)

/** VSEPR name and ideal angle for an atom with this many bonded atoms and lone pairs. */
export function vseprShape(bonded: number, lonePairs: number): { shape: string | null; ideal: string } {
  const key = `${bonded + lonePairs},${lonePairs}`
  return { shape: bonded >= 2 ? SHAPES[key] ?? null : null, ideal: IDEAL[key] ?? '' }
}

interface Point { id: string; el: string; lonePairOf?: string; implicit?: boolean }

/** The fixed parts of a molecule's shape problem: points (atoms, then lone pairs) and what holds them. */
function frame(structure: Structure) {
  const points: Point[] = structure.atoms.map(a => ({ id: a.id, el: a.el }))
  const bonds: Bond3D[] = structure.bonds.map(b => ({ ...b }))
  for (const atom of structure.atoms) for (let k = 1; k <= atom.h; k++) {
    points.push({ id: `${atom.id}H${k}`, el: 'H', implicit: true })
    bonds.push({ a: atom.id, b: `${atom.id}H${k}`, order: 1 })
  }
  const index = new Map(points.map((p, i) => [p.id, i]))
  const neighbours = points.map(() => [] as number[])
  for (const b of bonds) { neighbours[index.get(b.a)!].push(index.get(b.b)!); neighbours[index.get(b.b)!].push(index.get(b.a)!) }
  const atomCount = points.length
  // Lone pairs take a place only where they shape something: on atoms bonded to two or more others.
  for (const atom of structure.atoms) {
    if (neighbours[index.get(atom.id)!].length < 2) continue
    for (let k = 0; k < atom.lp; k++) points.push({ id: `${atom.id}:lp${k + 1}`, el: '', lonePairOf: atom.id })
  }
  const domains = points.map((_, i) => (i < atomCount ? [...neighbours[i]] : []))
  points.forEach((p, i) => { if (p.lonePairOf) domains[index.get(p.lonePairOf)!].push(i) })
  const springs: [number, number, number][] = bonds.map(b => {
    const i = index.get(b.a)!, j = index.get(b.b)!
    return [i, j, bondLength(points[i].el, points[j].el, b.order)]
  })
  points.forEach((p, i) => { if (p.lonePairOf) springs.push([index.get(p.lonePairOf)!, i, LONE_PAIR_REACH]) })
  // Across a double bond, each pair of substituents (one on each end) is held at its flat cis or flat trans distance.
  // Which one is decided once, from the starting geometry (the drawing), so the alkene keeps its E or Z.
  const flats: { a: number; c: number; x: number; y: number }[] = []
  for (const b of bonds) if (b.order === 2) {
    const a = index.get(b.a)!, c = index.get(b.b)!
    for (const x of neighbours[a]) if (x !== c) for (const y of neighbours[c]) if (y !== a) flats.push({ a, c, x, y })
  }
  // Atoms within two bonds are placed by springs and repulsion; beyond that they only keep apart.
  const near = points.map(() => new Set<number>())
  for (let i = 0; i < atomCount; i++) for (const j of neighbours[i]) { near[i].add(j); for (const k of neighbours[j]) near[i].add(k) }
  return { points, bonds, index, neighbours, atomCount, domains, springs, flats, near }
}

type Frame = ReturnType<typeof frame>

function start(f: Frame, options: GeometryOptions, rand: () => number): Vec[] {
  const p: Vec[] = f.points.map(() => ({ x: 0, y: 0, z: 0 }))
  const KET_TO_ANGSTROM = 1.5
  const placed = new Set<number>()
  f.points.forEach((point, i) => {
    const c = options.coords?.[point.id]
    if (!c || point.lonePairOf) return
    p[i] = { x: c.x * KET_TO_ANGSTROM, y: c.y * KET_TO_ANGSTROM, z: (options.depth?.[point.id] ?? 0) * 0.6 + (rand() - 0.5) * 0.3 }
    placed.add(i)
  })
  const queue = [...placed]
  if (!queue.length && f.atomCount) { placed.add(0); queue.push(0) }
  while (placed.size < f.atomCount) {
    const from = queue.shift()
    if (from === undefined) { const next = f.points.findIndex((_, i) => i < f.atomCount && !placed.has(i)); placed.add(next); queue.push(next); continue }
    for (const j of f.neighbours[from]) if (!placed.has(j)) {
      // Away from the bonds already there (with a little wobble), so an added hydrogen never starts on the side of a
      // drawn substituent and pushes it across: the drawing's E or Z, and its stereocentres, survive.
      const taken = f.neighbours[from].filter(k => placed.has(k)).reduce((s, k) => add(s, unit(sub(p[k], p[from]))), { x: 0, y: 0, z: 0 })
      const direction = unit(add(scale(taken, -1), scale(randomUnit(rand), length(taken) > 0.3 ? 0.15 : 1)))
      p[j] = add(p[from], scale(direction, bondLength(f.points[from].el, f.points[j].el)))
      placed.add(j); queue.push(j)
    }
  }
  f.points.forEach((point, i) => { if (point.lonePairOf) p[i] = add(p[f.index.get(point.lonePairOf)!], scale(randomUnit(rand), LONE_PAIR_REACH)) })
  return p
}

/** Relaxes positions in place and returns the final energy (lower is a better shape). */
function relax(f: Frame, p: Vec[], options: GeometryOptions): number {
  const weight = options.lonePairWeight ?? 1.3
  const pairWeight = options.lonePairPairWeight ?? 2
  const power = options.power ?? 3
  const iterations = options.iterations ?? 1500
  const force = p.map(() => ({ x: 0, y: 0, z: 0 }))
  const push = (i: number, v: Vec) => { force[i].x += v.x; force[i].y += v.y; force[i].z += v.z }
  let energy = 0
  // Sides of each double bond, decided once from the starting geometry (the drawing). The two substituents on one end
  // are on opposite sides; a substituent on the other end is on the side of the first one it leans towards. Deciding by
  // side, not pair by pair, keeps the four cis/trans distances consistent with one flat shape.
  const sides = new Map<string, number>()
  for (const { a, c } of f.flats) {
    if (sides.has(`${a}:${c}`)) continue
    sides.set(`${a}:${c}`, 1)
    const axis = unit(sub(p[c], p[a]))
    const off = (z: number, from: number) => { const v = sub(p[z], p[from]); return sub(v, scale(axis, dot(v, axis))) }
    const onA = f.neighbours[a].filter(z => z !== c), onC = f.neighbours[c].filter(z => z !== a)
    onA.forEach((z, k) => sides.set(`${a}:${c}:${z}`, k === 0 ? 1 : -1))
    const lean = onC.length ? (dot(off(onC[0], c), off(onA[0], a)) >= 0 ? 1 : -1) : 1
    onC.forEach((z, k) => sides.set(`${a}:${c}:${z}`, k === 0 ? lean : -lean))
  }
  const cisPairs = f.flats.map(({ a, c, x, y }) => sides.get(`${a}:${c}:${x}`) === sides.get(`${a}:${c}:${y}`))
  for (let step = 0; step <= iterations; step++) {
    // Crowding (atoms far apart in the graph keeping apart) comes in over the first third, once bonds, angles and
    // flat double bonds have settled the drawing into 3D; at full strength from the start it can flip a Z alkene to E.
    const crowding = Math.min(1, step / (iterations / 3))
    energy = 0
    for (const v of force) { v.x = 0; v.y = 0; v.z = 0 }
    for (const [i, j, rest] of f.springs) {
      const d = sub(p[j], p[i]), r = length(d) || 1e-6
      energy += 0.5 * (r - rest) ** 2
      const v = scale(d, (r - rest) / r)
      push(i, v); push(j, scale(v, -1))
    }
    for (let c = 0; c < f.atomCount; c++) {
      const ends = f.domains[c]
      if (ends.length < 2) continue
      const u = ends.map(e => unit(sub(p[e], p[c])))
      const reach = ends.map(e => length(sub(p[e], p[c])))
      for (let a = 0; a < ends.length; a++) for (let b = a + 1; b < ends.length; b++) {
        const lonePairs = (f.points[ends[a]].lonePairOf ? 1 : 0) + (f.points[ends[b]].lonePairOf ? 1 : 0)
        const w = lonePairs === 2 ? pairWeight : lonePairs === 1 ? weight : 1
        const d = sub(u[a], u[b]), r = length(d) || 1e-6
        energy += (0.35 * w) / ((power - 1) * r ** (power - 1))
        const dir = scale(d, 1 / r), magnitude = (0.35 * w) / r ** power
        const ta = sub(dir, scale(u[a], dot(dir, u[a]))), tb = sub(scale(dir, -1), scale(u[b], -dot(dir, u[b])))
        const fa = scale(ta, magnitude * reach[a]), fb = scale(tb, magnitude * reach[b])
        push(ends[a], fa); push(ends[b], fb); push(c, scale(add(fa, fb), -1))
      }
    }
    // Torsion x-a=c-y held at 0 (cis) or 180 degrees (trans): energy k(1 - cos) or k(1 + cos), with the gradient of
    // cos(torsion) taken through the two plane normals A = F x G and B = H x G, so no sign convention can flip it.
    f.flats.forEach(({ a, c, x, y }, k) => {
      const F = sub(p[x], p[a]), G = sub(p[a], p[c]), H = sub(p[y], p[c])
      const A = cross(F, G), B = cross(H, G), la = length(A), lb = length(B)
      if (la < 1e-6 || lb < 1e-6) return
      const ua = scale(A, 1 / la), ub = scale(B, 1 / lb), cos = dot(ua, ub)
      energy += cisPairs[k] ? 1 - cos : 1 + cos
      const sign = cisPairs[k] ? 1 : -1
      const dA = scale(sub(ub, scale(ua, cos)), sign / la), dB = scale(sub(ua, scale(ub, cos)), sign / lb)
      const gF = cross(G, dA), gG = add(cross(dA, F), cross(dB, H)), gH = cross(G, dB)
      push(x, gF); push(a, sub(gG, gF)); push(c, scale(add(gG, gH), -1)); push(y, gH)
    })
    for (let i = 0; i < f.atomCount; i++) for (let j = i + 1; j < f.atomCount; j++) {
      if (f.near[i].has(j)) continue
      const d = sub(p[j], p[i]), r = length(d) || 1e-6
      const keep = f.points[i].el === 'H' || f.points[j].el === 'H' ? 2.3 : 2.9
      if (r >= keep) continue
      energy += 0.15 * (keep - r) ** 2
      const v = scale(d, (-0.3 * crowding * (keep - r)) / r)
      push(i, v); push(j, scale(v, -1))
    }
    if (step === iterations) break
    const rate = 0.25 * (1 - step / iterations) + 0.03
    for (let i = 0; i < p.length; i++) {
      let move = scale(force[i], rate)
      const m = length(move)
      if (m > 0.2) move = scale(move, 0.2 / m)
      p[i] = add(p[i], move)
    }
  }
  return energy
}

export function buildGeometry(structure: Structure, options: GeometryOptions = {}): Geometry {
  const f = frame(structure)
  const tries = options.restarts ?? (options.coords ? 1 : 8)
  let best: { p: Vec[]; energy: number } | null = null
  for (let t = 0; t < tries; t++) {
    const rand = random((options.seed ?? 1) + t * 7919)
    const p = start(f, options, rand)
    const energy = relax(f, p, options)
    if (!best || energy < best.energy - 1e-9) best = { p, energy }
  }
  const p = best!.p
  // Centre the molecule on the origin, for viewing.
  const mid = scale(p.slice(0, f.atomCount).reduce((s, v) => add(s, v), { x: 0, y: 0, z: 0 }), 1 / Math.max(1, f.atomCount))
  for (let i = 0; i < p.length; i++) p[i] = sub(p[i], mid)

  const centres: Centre[] = []
  for (const atom of structure.atoms) {
    const i = f.index.get(atom.id)!
    const bonded = f.neighbours[i]
    if (bonded.length < 2 || ELEMENTS[atom.el]?.metal) continue
    const angles: number[] = []
    for (let a = 0; a < bonded.length; a++) for (let b = a + 1; b < bonded.length; b++)
      angles.push(Math.round(angleBetween(p[i], p[bonded[a]], p[bonded[b]]) * 10) / 10)
    centres.push({ atom: atom.id, domains: bonded.length + atom.lp, lonePairs: atom.lp, ...vseprShape(bonded.length, atom.lp), angles })
  }
  return {
    atoms: f.points.slice(0, f.atomCount).map((pt, i) => ({ id: pt.id, el: pt.el, p: p[i], ...(pt.implicit ? { implicit: true } : {}) })),
    bonds: f.bonds,
    lonePairs: f.points.slice(f.atomCount).map((pt, k) => ({ atom: pt.lonePairOf!, p: p[f.atomCount + k] })),
    centres,
  }
}
