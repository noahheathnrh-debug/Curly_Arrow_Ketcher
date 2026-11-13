// Screenshots of add-on pages in light and dark, for checking a page without the app.
//
//   bun run preview [page] [click text...]     e.g. bun run preview shapes "SF₄"
//
// Builds tools/preview/entry.tsx, then writes out/<page>-<scheme>[-<n>].png. Needs Playwright, found the same way as
// the editor check (PLAYWRIGHT_FROM, CHROME_PATH).
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = process.env.PLAYWRIGHT_FROM ?? resolve(here, '../../../../mnx-addon-kit-release/package.json');
const { chromium } = createRequire(from)('playwright');
const [page = 'shapes', ...clicks] = process.argv.slice(2);
const settle = Number(process.env.SETTLE ?? (/^(lesson|template)/.test(page) ? 2500 : 300));

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
for (const scheme of ['light', 'dark']) {
  await tab.evaluate(([p, s]) => window.mountPreview(p, s), [page, scheme]);
  await tab.waitForTimeout(settle);
  await tab.screenshot({ path: join(here, `out/${page}-${scheme}.png`) });
  for (const [n, text] of clicks.entries()) {
    // A button by its name (substring), else any element with exactly this text.
    // css=<selector> clicks the first match instead.
    const button = text.startsWith('css=') ? tab.locator(text.slice(4)) : tab.getByRole('button', { name: text });
    await ((await button.count()) ? button.first() : tab.getByText(text, { exact: true }).first()).click();
    await tab.waitForTimeout(settle);
    await tab.screenshot({ path: join(here, `out/${page}-${scheme}-${n + 1}.png`) });
  }
}
await browser.close();
for (const error of errors) console.log(`page error: ${error}`);
console.log(`screenshots in ${join(here, 'out')}`);
process.exit(errors.length ? 1 : 0);
