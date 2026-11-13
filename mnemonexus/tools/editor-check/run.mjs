// Loads every enzyme document with the real editor code in a headless browser and compares it with the authoring
// model (labels, charges, implicit hydrogens, valences, aliases), then reads each answer back from a solved KET.
// Then runs the live legality check on the editor's own structures for the guided puzzles and the imported corpus.
//
//   bun run check:editor
//
// Needs Playwright and a Chromium. Set PLAYWRIGHT_FROM to a package.json beside a Playwright install (the add-on
// kit has one) and CHROME_PATH to a Chromium or chrome-headless-shell executable if Playwright's own is not installed.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = process.env.PLAYWRIGHT_FROM ?? resolve(here, '../../../../mnx-addon-kit-release/package.json');
const { chromium } = createRequire(from)('playwright');

function executable() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const root = join(homedir(), 'AppData/Local/ms-playwright');
  if (!existsSync(root)) return undefined;
  for (const name of readdirSync(root).sort().reverse()) {
    const candidates = [join(root, name, 'chrome-win64/chrome.exe'), join(root, name, 'chrome-headless-shell-win64/chrome-headless-shell.exe')];
    const found = candidates.find((path) => existsSync(path));
    if (found) return found;
  }
  return undefined;
}

let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: executable() }); }
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error).slice(0, 300)));
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: readFileSync(join(here, 'out/check.js'), 'utf8') });
const report = await page.evaluate(() => window.runEditorCheck());
// The recovered corpus is private; a public clone checks the guided puzzles only.
const { importedCorpusPath } = await import('../../privateContent.mjs');
const imported = importedCorpusPath ? JSON.parse(readFileSync(importedCorpusPath, 'utf8')) : [];
const legality = await page.evaluate((records) => window.runLegalityCheck(records), imported);
// Indigo, served to the page as the pack would hand it over (bytes, not a file beside the script).
const wasmPath = join(here, '../../node_modules/indigo-ketcher');
const wasmFile = readdirSync(wasmPath).find((name) => /^indigo-ketcher-norender-.*\.wasm$/.test(name));
await page.route('https://indigo.check/indigo.wasm', (route) => route.fulfill({ body: readFileSync(join(wasmPath, wasmFile)), contentType: 'application/wasm', headers: { 'access-control-allow-origin': '*' } }));
let indigo;
try { indigo = await page.evaluate((url) => window.runIndigoCheck(url), 'https://indigo.check/indigo.wasm'); } catch (error) { indigo = { error: String(error).slice(0, 300) }; }
await browser.close();
console.log(`${report.puzzles} documents, ${report.atoms} atoms, ${report.arrows} answer arrows read back; ${report.problems.length} problem(s)`);
for (const problem of [...report.problems, ...errors]) console.log(`  ${problem}`);
console.log(`legality on the editor's own structures: ${legality.guided} guided answers; ${legality.lessons} lesson and generated documents; ${legality.lewis} Lewis structures; imported verdicts ${JSON.stringify(legality.imported)}; ${legality.problems.length} problem(s)`);
for (const problem of legality.problems.slice(0, 40)) console.log(`  ${problem}`);
console.log(`indigo in the pack: ${JSON.stringify(indigo)}`);
const indigoOk = !indigo.error && indigo.available && indigo.smiles?.includes('N') && indigo.cipLabels?.length === 1 && indigo.laidOut === 7;
if (!indigoOk) console.log('  indigo check FAILED');
process.exit(report.problems.length || legality.problems.length || errors.length || !indigoOk ? 1 : 0);
