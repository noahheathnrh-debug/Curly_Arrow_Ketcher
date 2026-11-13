import { readdir, readFile, writeFile } from 'node:fs/promises';
import { buildPack, type PackBuildInput } from '@mnemonexus/addon-sdk/pack';
// @ts-expect-error a plain .mjs helper
import { packImportedCorpusPath, packIncludesPrivate } from './privateContent.mjs';

const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8')) as PackBuildInput['manifest'];
const code = await readFile(new URL('./pack-build/main.cjs', import.meta.url), 'utf8');
const css = await readFile(new URL('./pack-build/main.css', import.meta.url), 'utf8');
const bundled = `var style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.appendChild(style);\n${code}`;
const catalogue = await readFile(new URL('./pack-build/practice-catalogue.json', import.meta.url));
const assets = new Map<string, Uint8Array>([['assets/practice/catalogue.json', new Uint8Array(catalogue)]]);
// The recovered corpus is private content (see .gitignore), shipped only in the owner's build. Without it the pack has no
// imported levels.
if (packImportedCorpusPath) assets.set('assets/ocra-puzzles.json', new Uint8Array(await readFile(packImportedCorpusPath)));
else manifest.assets = (manifest.assets ?? []).filter((asset) => asset.logicalPath !== 'assets/ocra-puzzles.json');
// Indigo (Apache 2.0), the no-render WebAssembly build: read as bytes through host.asset, never fetched (src/indigo/).
const indigoDir = new URL('./node_modules/indigo-ketcher/', import.meta.url);
const indigoWasm = (await readdir(indigoDir)).find((name) => /^indigo-ketcher-norender-.*\.wasm$/.test(name));
if (!indigoWasm) throw new Error('indigo-ketcher is not installed (bun install).');
assets.set('assets/indigo.wasm', new Uint8Array(await readFile(new URL(indigoWasm, indigoDir))));

const codeBytes = new TextEncoder().encode(bundled);
const pack = await buildPack({ manifest, code: codeBytes, assets });
const fileName = packIncludesPrivate ? 'curly-arrow-ketcher.private.mnxpack' : 'curly-arrow-ketcher.mnxpack';
await writeFile(new URL(`./${fileName}`, import.meta.url), pack.bytes);

// The pack is installed for every user, so its download is budgeted (owner, 2026-11-11: "get it really small").
const BUDGET = 4.5 * 1024 * 1024;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const raw = codeBytes.length + [...assets.values()].reduce((sum, bytes) => sum + bytes.length, 0);
console.log(`${fileName}: ${mb(pack.bytes.length)} download (${mb(raw)} unpacked: code ${mb(codeBytes.length)}, `
  + `${[...assets].map(([name, bytes]) => `${name.replace('assets/', '')} ${mb(bytes.length)}`).join(', ')}); sha256 ${pack.packHash}`);
if (pack.bytes.length > BUDGET) throw new Error(`The pack is ${mb(pack.bytes.length)}, over its ${mb(BUDGET)} budget.`);
