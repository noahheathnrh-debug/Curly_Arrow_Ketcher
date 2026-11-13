// How long each Watch frame takes to draw, for every lesson and for two seeds of every template.
//
//   bun run times [page...]          e.g. bun run times lesson-imine template-water-loss-1
//
// The editor's arrow router can take 10 to 40 seconds on a crowded drawing (2026-11-11: an arrow squeezed between two
// groups, or a lone pair with no open side), and the browser is frozen while it does. The headless editor check never
// routes arrows, so only a real render finds these. Prints frames over 1.5 s and fails if any frame takes over 3 s.
// Builds nothing itself: run `bun run preview` first (the `times` script does).
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = process.env.PLAYWRIGHT_FROM ?? resolve(here, '../../../../mnx-addon-kit-release/package.json');
const { chromium } = createRequire(from)('playwright');
const WARN = 1500, FAIL = 3000;

function executable() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const root = join(homedir(), 'AppData/Local/ms-playwright');
  if (!existsSync(root)) return undefined;
  for (const name of readdirSync(root).sort().reverse()) {
    const found = [join(root, name, 'chrome-win64/chrome.exe'), join(root, name, 'chrome-headless-shell-win64/chrome-headless-shell.exe')].find((p) => existsSync(p));
    if (found) return found;
  }
  return undefined;
}

let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: executable() }); }
const tab = await browser.newPage({ viewport: { width: 1100, height: 640 } });
const errors = [];
tab.on('pageerror', (error) => errors.push(String(error).slice(0, 300)));
await tab.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
const css = join(here, 'out/preview.css');
if (existsSync(css)) await tab.addStyleTag({ content: readFileSync(css, 'utf8') });
await tab.addScriptTag({ content: readFileSync(join(here, 'out/preview.js'), 'utf8') });

const all = await tab.evaluate(() => window.previewPages());
const pages = process.argv.slice(2).length ? process.argv.slice(2) : all.filter((p) => p.startsWith('lesson-') || /^template-.*-[12]$/.test(p));
let slow = 0, frames = 0;
for (const page of pages) {
  await tab.evaluate((p) => window.mountPreview(p, 'light'), page);
  await tab.waitForTimeout(1500);
  const total = await tab.evaluate(() => Number(document.body.innerText.match(/\b1 of (\d+)/)?.[1] ?? 0));
  const notes = [];
  for (let i = 1; i < total; i++) {
    const t0 = Date.now();
    await tab.getByRole('button', { name: i === 1 ? 'Show the first arrow' : 'Next' }).first().click({ timeout: 120000 });
    await tab.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const ms = Date.now() - t0;
    frames++;
    if (ms > WARN) notes.push(`frame ${i + 1} ${ms} ms`);
    if (ms > FAIL) slow++;
  }
  console.log(`${page.padEnd(40)} ${String(total).padStart(2)} frames${notes.length ? `  SLOW: ${notes.join(', ')}` : ''}`);
}
await browser.close();
for (const error of errors) console.log(`page error: ${error}`);
console.log(`${frames} frames on ${pages.length} pages; ${slow} over ${FAIL / 1000} s`);
process.exit(slow || errors.length ? 1 : 0);
