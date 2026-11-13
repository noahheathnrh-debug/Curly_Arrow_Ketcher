import layouts from './layouts.json';

/** Indigo's 2D layouts of the Isomers molecules (`tools/isomers/layout.ts` writes them). */
export interface LaidOut { atoms: { label: string; location: number[]; charge?: number }[]; bonds: { type: number; atoms: number[]; stereo?: number }[] }
export const LAYOUTS = layouts as unknown as Readonly<Record<string, LaidOut>>;

const molecule = (mol: LaidOut, dx = 0, dy = 0) => ({
  type: 'molecule',
  atoms: mol.atoms.map((a) => ({ ...a, location: [a.location[0] + dx, a.location[1] + dy, 0] })),
  bonds: mol.bonds,
});

function laidOut(smiles: string): LaidOut {
  const mol = LAYOUTS[smiles];
  if (!mol) throw new Error(`No layout for ${smiles}: run tools/isomers/layout.ts.`);
  return mol;
}

/** One molecule as a KET document. */
export function isomerKet(smiles: string): string {
  return JSON.stringify({ root: { nodes: [{ $ref: 'mol0' }] }, mol0: molecule(laidOut(smiles)) });
}

/** Molecules in rows of up to `perRow`, each shifted clear of the one before and of the row above. */
export function rowKet(list: readonly string[], perRow = list.length): string {
  const doc: Record<string, unknown> = { root: { nodes: list.map((_, i) => ({ $ref: `mol${i}` })) } };
  let edge = 0, top = 0, rowLow = 0;
  list.forEach((smiles, i) => {
    const mol = laidOut(smiles), xs = mol.atoms.map((x) => x.location[0]), ys = mol.atoms.map((x) => x.location[1]);
    if (i % perRow === 0 && i > 0) { top = rowLow - 2; edge = 0; rowLow = 0; }
    const dx = i % perRow === 0 ? -Math.min(...xs) : edge - Math.min(...xs) + 2.5;
    const dy = top - Math.max(...ys);
    doc[`mol${i}`] = molecule(mol, dx, dy);
    edge = Math.max(...xs) + dx;
    rowLow = Math.min(rowLow, Math.min(...ys) + dy);
  });
  return JSON.stringify(doc);
}
/** Two molecules side by side. */
export const pairKet = (a: string, b: string) => rowKet([a, b]);
export const EMPTY_KET = JSON.stringify({ root: { nodes: [] } });
