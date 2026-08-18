import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Prefer Playwright's own browser, and fall back to any Chromium already on
 * disk.
 *
 * The repo pins a Playwright whose expected browser build may not be the one
 * installed — `npx playwright install chromium` fixes that properly, but it is a
 * long download, and this check should not be the thing that forces it. Set
 * `CHROME_PATH` to point somewhere else.
 */
async function launch() {
  try {
    return await chromium.launch();
  } catch (error) {
    const explicit = process.env.CHROME_PATH;
    if (explicit && fs.existsSync(explicit)) {
      return chromium.launch({ executablePath: explicit });
    }

    const root = path.join(os.homedir(), 'AppData/Local/ms-playwright');
    const candidate = fs.existsSync(root)
      ? fs
          .readdirSync(root)
          .filter((name) => name.startsWith('chromium-'))
          .map((name) => path.join(root, name, 'chrome-win64/chrome.exe'))
          .find((exe) => fs.existsSync(exe))
      : undefined;

    if (!candidate) {
      console.error(
        'No Chromium available. Run `npx playwright install chromium`, or set CHROME_PATH.',
      );
      throw error;
    }
    return chromium.launch({ executablePath: candidate });
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const PUZZLE_URL =
  process.env.PUZZLE_URL ?? 'http://127.0.0.1:5199/puzzle.html';

await page.goto(PUZZLE_URL, { waitUntil: 'load' });
await page.waitForTimeout(30000);

/** A cheap fingerprint of what is drawn on the canvas. */
const fingerprint = () =>
  page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('svg text'))
      .map((t) => t.textContent)
      .join('|');
    return `${texts}##${document.querySelectorAll('svg path').length}`;
  });

const before = await fingerprint();

// The charge group button still looks available, because its group entry has no
// action to hang a status on. What matters is whether pressing it and clicking
// an atom actually changes anything.
await page.click('button[data-testid="charge-plus"]').catch(() => {});
await page.waitForTimeout(600);

const oxygen = await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('svg text')).find(
    (t) => t.textContent === 'O',
  );
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});

if (oxygen) {
  await page.mouse.click(oxygen.x, oxygen.y);
  await page.waitForTimeout(1200);
}
const afterCharge = await fingerprint();

// Erase is visibly disabled; Delete is the keyboard route to the same thing.
await page.keyboard.press('Delete');
await page.waitForTimeout(800);
const afterDelete = await fingerprint();

// Nudging bypasses the action table entirely, so it gets its own check.
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(600);
const afterNudge = await fingerprint();

const nextDisabled = await page.evaluate(() => {
  const next = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Next',
  );
  return next ? next.hasAttribute('disabled') : null;
});

console.log(
  JSON.stringify(
    {
      errors: errors.slice(0, 8),
      clickedOxygen: Boolean(oxygen),
      unchangedAfterChargeClick: before === afterCharge,
      unchangedAfterDelete: before === afterDelete,
      unchangedAfterArrowKey: before === afterNudge,
      nextDisabledBeforeSolving: nextDisabled,
    },
    null,
    2,
  ),
);

await browser.close();
