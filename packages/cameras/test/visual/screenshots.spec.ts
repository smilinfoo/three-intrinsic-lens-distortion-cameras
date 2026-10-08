import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { MODELS, openLab } from './hooks';

/**
 * Always writes `artifacts/visual/<model>.png` (for human review / CI artifact upload).
 * Baseline comparison runs only when VISUAL_BASELINES=1 (`npm run test:visual:regression`);
 * baselines are software-GL renders — regenerate with `--update-snapshots` after intended changes.
 */
const OUT_DIR = path.resolve('artifacts/visual');
const COMPARE = process.env.VISUAL_BASELINES === '1';

test('capture sensor views for every model', async ({ page }) => {
  await openLab(page);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const model of MODELS) {
    const tile = page.locator(`.tile[data-model="${model}"] .tile-view`);
    const overlayOff = page.locator('#overlay-toggle');

    await overlayOff.uncheck();
    const clean = await tile.screenshot();
    fs.writeFileSync(path.join(OUT_DIR, `${model}.png`), clean);

    await overlayOff.check();
    fs.writeFileSync(path.join(OUT_DIR, `${model}-overlay.png`), await tile.screenshot());

    if (COMPARE) {
      await overlayOff.uncheck();
      await expect(tile).toHaveScreenshot(`${model}.png`, { maxDiffPixelRatio: 0.02, threshold: 0.2 });
      await overlayOff.check();
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'page.png'), await page.screenshot());
});
