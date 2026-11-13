/**
 * Every structural isomer of a saturated formula (no rings and no multiple bonds, so each isomer is a tree of its
 * heavy atoms with hydrogens on the free valences). Used by "Draw the isomers": the totals asked for come from here,
 * not from a table, and the tests hold them to the textbook counts.
 */

const VALENCE: Readonly<Record<string, number>> = { C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1 };

export interface IsomerTree { els: string[]; bonds: [number, number][] }

const neighboursOf = (tree: IsomerTree, i: number) => tree.bonds.flatMap(([a, b]) => (a === i ? [b] : b === i ? [a] : []));

/** A string that is the same for two trees exactly when they are the same molecule (rooted at the tree's centre). */
export function canonicalTree(tree: IsomerTree): string {
  const n = tree.els.length;
  if (n === 1) return tree.els[0];
  // The centre: peel leaves until one or two atoms remain.
  const degree = tree.els.map((_, i) => neighboursOf(tree, i).length);
  let leaves = degree.flatMap((d, i) => (d <= 1 ? [i] : []));
  let left = n;
  const removed = new Set<number>();
  while (left > 2) {
    const next: number[] = [];
    for (const leaf of leaves) {
      removed.add(leaf); left--;
      for (const m of neighboursOf(tree, leaf)) if (!removed.has(m) && --degree[m] === 1) next.push(m);
    }
    leaves = next;
  }
  const centres = tree.els.map((_, i) => i).filter((i) => !removed.has(i));
  const encode = (at: number, from: number): string =>
    `${tree.els[at]}(${neighboursOf(tree, at).filter((m) => m !== from).map((m) => encode(m, at)).sort().join(',')})`;
  return centres.map((c) => encode(c, -1)).sort()[0];
}

/** All isomers with these heavy atoms, e.g. { C: 4, O: 1 } for C₄H₁₀O. */
export function enumerateIsomers(heavy: Readonly<Record<string, number>>): IsomerTree[] {
  const total = Object.values(heavy).reduce((s, n) => s + n, 0);
  let level = new Map<string, IsomerTree>();
  for (const el of Object.keys(heavy)) if (heavy[el] > 0) { const t = { els: [el], bonds: [] }; level.set(canonicalTree(t), t); }
  for (let size = 1; size < total; size++) {
    const next = new Map<string, IsomerTree>();
    for (const tree of level.values()) {
      const used = tree.els.reduce<Record<string, number>>((c, el) => ({ ...c, [el]: (c[el] ?? 0) + 1 }), {});
      tree.els.forEach((el, i) => {
        if (neighboursOf(tree, i).length >= VALENCE[el]) return;
        for (const add of Object.keys(heavy)) {
          if ((used[add] ?? 0) >= heavy[add]) continue;
          const grown: IsomerTree = { els: [...tree.els, add], bonds: [...tree.bonds, [i, tree.els.length]] };
          const key = canonicalTree(grown);
          if (!next.has(key)) next.set(key, grown);
        }
      });
    }
    level = next;
  }
  return [...level.values()].filter((t) => Object.entries(heavy).every(([el, n]) => t.els.filter((e) => e === el).length === n));
}

const hydrogens = (tree: IsomerTree, i: number) => VALENCE[tree.els[i]] - neighboursOf(tree, i).length;
const bracket = (el: string) => (el.length > 1 && !['Cl', 'Br'].includes(el) ? `[${el}]` : el);

/** A SMILES for Indigo to lay out, written from a carbon end where there is one. */
export function smilesOf(tree: IsomerTree): string {
  const start = tree.els.findIndex((el, i) => el === 'C' && neighboursOf(tree, i).length <= 1);
  const write = (at: number, from: number): string => {
    const next = neighboursOf(tree, at).filter((m) => m !== from).map((m) => write(m, at));
    const last = next.pop();
    return bracket(tree.els[at]) + next.map((b) => `(${b})`).join('') + (last ?? '');
  };
  return write(start >= 0 ? start : 0, -1);
}

/** A condensed formula along the longest chain, e.g. CH3CH(OH)CH2CH3, for the list of isomers found. */
export function condensed(tree: IsomerTree): string {
  const farthest = (from: number) => {
    const dist = new Map([[from, 0]]), queue = [from], parent = new Map<number, number>();
    while (queue.length) { const at = queue.shift()!; for (const m of neighboursOf(tree, at)) if (!dist.has(m)) { dist.set(m, dist.get(at)! + 1); parent.set(m, at); queue.push(m); } }
    // Prefer ending on a carbon among the farthest atoms, so the chain reads as a carbon chain where it can.
    const max = Math.max(...dist.values());
    const ends = [...dist].filter(([, d]) => d === max).map(([i]) => i);
    return { end: ends.find((i) => tree.els[i] === 'C') ?? ends[0], parent };
  };
  const a = farthest(tree.els.findIndex((el) => el === 'C') >= 0 ? tree.els.findIndex((el) => el === 'C') : 0).end;
  const { end: b, parent } = farthest(a);
  const chain = [b];
  while (chain[chain.length - 1] !== a) chain.push(parent.get(chain[chain.length - 1])!);
  // Read from a carbon end, so butan-1-ol is CH3CH2CH2CH2OH, not OHCH2CH2CH2CH3.
  if (tree.els[chain[0]] !== 'C' && tree.els[chain[chain.length - 1]] === 'C') chain.reverse();
  const group = (at: number, from: number): string => {
    const h = hydrogens(tree, at);
    const rest = neighboursOf(tree, at).filter((m) => m !== from).map((m) => group(m, at));
    const self = tree.els[at] + (h ? `H${h > 1 ? h : ''}` : '');
    // A hydroxyl reads OH whichever way round it is reached.
    return self + rest.map((r) => (rest.length > 1 ? `(${r})` : r)).join('');
  };
  return chain.map((at, k) => {
    const h = hydrogens(tree, at);
    const branches = neighboursOf(tree, at).filter((m) => m !== chain[k - 1] && m !== chain[k + 1]).map((m) => group(m, at));
    const counted = new Map<string, number>();
    for (const branch of branches) counted.set(branch, (counted.get(branch) ?? 0) + 1);
    return tree.els[at] + (h ? `H${h > 1 ? h : ''}` : '') + [...counted].map(([branch, n]) => `(${branch})${n > 1 ? n : ''}`).join('');
  }).join('');
}
