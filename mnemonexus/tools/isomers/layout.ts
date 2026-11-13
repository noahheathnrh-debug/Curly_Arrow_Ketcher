import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { DRAW_TASKS, PAIRS, STEREO_ITEMS } from '../../src/isomers/species';
import { enumerateIsomers, smilesOf } from '../../src/isomers/enumerate';
import { SPECTRA_MOLECULES } from '../../src/spectra/species';
import { layout, type KetMol } from './indigoNode';

/**
 * Lays out every Isomers and Spectra molecule with Indigo and writes `src/isomers/layouts.json` (SMILES → atoms and bonds), so the
 * activity draws them without starting Indigo. Run after changing either `species.ts`:
 *   bun run tools/isomers/layout.ts
 * The tests fail when a molecule is missing or out of date.
 */

export type Layouts = Record<string, KetMol>;

export async function buildLayouts(): Promise<Layouts> {
  const smiles = [...new Set([...STEREO_ITEMS.map((s) => s.smiles), ...PAIRS.flatMap((p) => [p.a, p.b]), ...DRAW_TASKS.flatMap((t) => enumerateIsomers(t.heavy).map(smilesOf)), ...SPECTRA_MOLECULES.map((m) => m.smiles)])];
  const out: Layouts = {};
  for (const s of smiles) {
    const doc = JSON.parse(await layout(s)) as Record<string, KetMol>;
    const mol = doc.mol0;
    out[s] = {
      atoms: mol.atoms.map((a) => ({ label: a.label, location: a.location.map((v) => Math.round(v * 1000) / 1000 || 0), ...(a.charge ? { charge: a.charge } : {}) })),
      bonds: (mol.bonds ?? []).map((b) => ({ type: b.type, atoms: b.atoms, ...(b.stereo ? { stereo: b.stereo } : {}) })),
    };
  }
  return out;
}

if (import.meta.main) {
  const layouts = await buildLayouts();
  const file = path.resolve(import.meta.dir, '../../src/isomers/layouts.json');
  writeFileSync(file, `${JSON.stringify(layouts, null, 1)}\n`);
  console.log(`wrote ${Object.keys(layouts).length} molecules to ${path.relative(process.cwd(), file)}`);
}
