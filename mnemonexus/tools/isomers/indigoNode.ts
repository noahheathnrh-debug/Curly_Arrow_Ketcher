import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Indigo (the pack's own no-render WebAssembly build) in Bun, for the Isomers layout tool and tests: lays SMILES out
 * with wedges and gives its own CIP labels to check `cip.ts` against.
 */

interface IndigoMap { set(key: string, value: string): void }
interface Indigo {
  MapStringString: new () => IndigoMap;
  layout(data: string, format: string, options: IndigoMap): string;
  calculateCip(data: string, format: string, options: IndigoMap): string;
  convert(data: string, format: string, options: IndigoMap): string;
}

const root = path.resolve(import.meta.dir, '../../node_modules/indigo-ketcher');
let indigo: Promise<Indigo> | null = null;

export function loadIndigo(): Promise<Indigo> {
  if (indigo) return indigo;
  const require = createRequire(path.join(root, 'package.json'));
  const mod = require(path.join(root, 'indigo-ketcher-separate-wasm-norender.js'));
  const create = (mod.default ?? mod) as (options: { wasmBinary: Uint8Array }) => Promise<Indigo>;
  const wasm = readFileSync(path.join(root, 'indigo-ketcher-norender-1.47.0-rc.1.wasm'));
  indigo = create({ wasmBinary: new Uint8Array(wasm) });
  return indigo;
}

const options = (ind: Indigo) => { const o = new ind.MapStringString(); o.set('output-content-type', 'application/json'); return o; };
const unwrap = (out: string) => { try { const j = JSON.parse(out) as { struct?: string }; return j.struct ?? out; } catch { return out; } };

export interface KetMol { atoms: { label: string; location: number[]; charge?: number; cip?: string }[]; bonds?: { type: number; atoms: number[]; stereo?: number; cip?: string }[] }

/** A SMILES laid out in 2D (KET), with stereo shown as wedges and hashes. */
export async function layout(smiles: string): Promise<string> {
  const ind = await loadIndigo();
  return unwrap(ind.layout(smiles, 'ket', options(ind)));
}

/** Indigo's own CIP labels for a KET, by atom and bond index. */
export async function indigoLabels(ket: string): Promise<{ atoms: Record<number, string>; bonds: Record<number, string> }> {
  const ind = await loadIndigo();
  const doc = JSON.parse(unwrap(ind.calculateCip(ket, 'ket', options(ind)))) as Record<string, KetMol>;
  const mol = doc.mol0;
  const atoms: Record<number, string> = {}, bonds: Record<number, string> = {};
  mol.atoms.forEach((a, i) => { if (a.cip) atoms[i] = a.cip; });
  (mol.bonds ?? []).forEach((b, i) => { if (b.cip) bonds[i] = b.cip; });
  return { atoms, bonds };
}

/** Indigo's SMILES, stereo included. */
export async function smilesOf(ket: string): Promise<string> {
  const ind = await loadIndigo();
  return unwrap(ind.convert(ket, 'smiles', options(ind)));
}
