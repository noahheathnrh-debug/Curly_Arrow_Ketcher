import { test } from '@fixtures';
import {
  openFileAndAddToCanvas,
  takeEditorScreenshot,
  waitForPageInit,
} from '@utils';

/**
 * Visual regressions for obstacle-aware curly-arrow routing.
 *
 * Each fixture stores only the *semantic* anchors — which lone pair or bond the
 * electrons come from, and where they land — plus `autoRoute: true`. The curve
 * itself is deliberately not stored, so loading a fixture exercises the live
 * router rather than replaying a value baked into the file. A screenshot diff
 * therefore catches a routing regression, not just a rendering one.
 *
 * What to look for when reviewing a diff:
 *   - no arrow crosses a bond it is not attached to
 *   - every arrowhead stops short of its target, clear of labels and charges
 *   - arrows in the same step neither cross nor overlap each other
 *   - charge glyphs sit in a free direction, not on top of a lone pair
 *
 * Regenerate deliberately with `npm run test:update`, never reflexively.
 */
test.describe('Mechanism arrow routing', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPageInit(page);
  });

  test('Visual Test 1: iodide lone pair attacks a tert-butyl carbocation', async ({
    page,
  }) => {
    await openFileAndAddToCanvas(
      page,
      'KET/Mechanism-Arrows/mechanism-carbocation-attack.ket',
    );
    await takeEditorScreenshot(page);
  });

  test('Visual Test 2: SN2 backside attack with leaving group departure', async ({
    page,
  }) => {
    await openFileAndAddToCanvas(
      page,
      'KET/Mechanism-Arrows/mechanism-sn2-backside.ket',
    );
    await takeEditorScreenshot(page);
  });

  test('Visual Test 3: chloride adds to a ketone carbonyl', async ({
    page,
  }) => {
    await openFileAndAddToCanvas(
      page,
      'KET/Mechanism-Arrows/mechanism-carbonyl-addition.ket',
    );
    await takeEditorScreenshot(page);
  });

  test('Visual Test 5: 1,2-hydride shift onto an adjacent carbocation', async ({
    page,
  }) => {
    await openFileAndAddToCanvas(
      page,
      'KET/Mechanism-Arrows/mechanism-hydride-shift.ket',
    );
    await takeEditorScreenshot(page);
  });

  test('Visual Test 6: allylic resonance shifts a pi bond', async ({
    page,
  }) => {
    await openFileAndAddToCanvas(
      page,
      'KET/Mechanism-Arrows/mechanism-allyl-resonance.ket',
    );
    await takeEditorScreenshot(page);
  });

  test('Visual Test 7: alkoxide deprotonates hydrogen bromide', async ({
    page,
  }) => {
    await openFileAndAddToCanvas(
      page,
      'KET/Mechanism-Arrows/mechanism-proton-transfer.ket',
    );
    await takeEditorScreenshot(page);
  });
});
