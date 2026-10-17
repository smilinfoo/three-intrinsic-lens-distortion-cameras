import { expect, test, type Page } from '@playwright/test';
import { MODELS, openLab } from './hooks';

/** Drives the real "Try your own camera" form, as a user would. */
async function fill(page: Page, values: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(values)) {
    await page.locator(`#custom-form [name="${name}"]`).fill(value);
  }
}

const UNUSUAL_K = { imageWidth: '800', imageHeight: '600', fx: '520', fy: '540', cx: '405', cy: '295' };

test.describe('custom camera form', () => {
  test('loads a passing default and shows a success status', async ({ page }) => {
    await openLab(page);
    await expect(page.locator('#custom-status')).toHaveClass(/ok/);
    await expect(page.locator('#custom-status')).toContainText('matches core');
  });

  for (const model of MODELS) {
    test(`${model}: unusual intrinsics and image size render where core projects`, async ({ page }) => {
      const errors = await openLab(page);
      await page.locator('#custom-form [name="model"]').selectOption(model);
      await fill(page, UNUSUAL_K);
      await page.getByRole('button', { name: 'Apply' }).click();

      const status = page.locator('#custom-status');
      await expect(status).toHaveClass(/ok/);
      await expect(status).toContainText('25 probes');

      const size = await page.evaluate(() => {
        const c = document.querySelector('.tile[data-model="custom"] canvas.gl') as HTMLCanvasElement;
        return [c.width, c.height];
      });
      expect(size).toEqual([800, 600]);
      expect(errors).toEqual([]);
    });
  }

  test('rejects invalid input with a clear message and keeps the last good camera', async ({ page }) => {
    await openLab(page);
    await fill(page, { fx: '-3', imageWidth: '10' });
    await page.getByRole('button', { name: 'Apply' }).click();
    const status = page.locator('#custom-status');
    await expect(status).toHaveClass(/error/);
    await expect(status).toContainText('fx must be > 0');
    await expect(status).toContainText('image width');
  });

  test('changing a coefficient is reflected without reloading', async ({ page }) => {
    await openLab(page);
    await page.locator('#custom-form [name="model"]').selectOption('fisheye');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.locator('#custom-status')).toHaveClass(/ok/);
    await fill(page, { 'coef-k1': '-0.25', 'coef-k2': '0.02' });
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.locator('#custom-status')).toHaveClass(/ok/);
  });

  test('custom probes do not leak into the preset views', async ({ page }) => {
    await openLab(page);
    await fill(page, UNUSUAL_K);
    await page.getByRole('button', { name: 'Apply' }).click();
    const summary = await page.evaluate(() => (window as any).__sensorLab.measureTile('fisheye'));
    expect(summary.missing).toBe(0);
    expect(summary.maxError).toBeLessThanOrEqual(1);
    expect(summary.count).toBe(25);
  });
});

test.describe('layout', () => {
  test('your camera is the prominent left panel and is visible without scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openLab(page);

    const custom = page.locator('.custom-panel');
    const presets = page.locator('.scene-panel');
    const customBox = (await custom.boundingBox())!;
    const presetBox = (await presets.boundingBox())!;
    expect(customBox.x).toBeLessThan(presetBox.x);
    expect(customBox.width).toBeGreaterThan(presetBox.width);

    const tile = (await page.locator('.tile[data-model="custom"]').boundingBox())!;
    expect(tile.y).toBeGreaterThanOrEqual(0);
    expect(tile.y + tile.height).toBeLessThanOrEqual(720);
    await expect(page.locator('#model-select')).toHaveCount(0);
    await expect(page.locator('#projection-canvas')).toHaveCount(0);
  });

  test('form is reachable by scrolling its own panel (short window); page does not scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openLab(page);

    const scroller = page.locator('.custom-panel .panel-scroll');
    const metrics = await scroller.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(metrics.scroll, 'content should overflow so scrolling is needed').toBeGreaterThan(metrics.client);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    expect(await scroller.locator('#custom-form').count()).toBe(1);
    expect(await scroller.locator('.tile[data-model="custom"]').count()).toBe(1);

    await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const apply = page.getByRole('button', { name: 'Apply' });
    const box = (await apply.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(720);
    await apply.click();
    await expect(page.locator('#custom-status')).toHaveClass(/ok/);
  });

  test('preset views scroll independently in the right panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await openLab(page);
    const scroller = page.locator('.scene-panel .panel-scroll');
    expect(await scroller.locator('.tile').count()).toBe(4);
    const m = await scroller.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(m.scroll).toBeGreaterThan(m.client);
  });
});

/** Number of non-transparent pixels on a tile's 2D overlay canvas. */
async function overlayInk(page: Page, id: string): Promise<number> {
  return page.evaluate((tileId) => {
    const c = document.querySelector(`.tile[data-model="${tileId}"] canvas.overlay`) as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
    return n;
  }, id);
}

test.describe('undistorted baseline overlay', () => {
  test('baseline draws extra (gray) lines on distorting views and nothing on pinhole', async ({ page }) => {
    await openLab(page);
    await page.locator('#overlay-toggle').uncheck(); // isolate the baseline layer

    await page.locator('#baseline-toggle').check();
    for (const model of ['brown-conrady', 'rational', 'fisheye', 'custom']) {
      expect(await overlayInk(page, model), `${model} baseline`).toBeGreaterThan(500);
    }
    expect(await overlayInk(page, 'pinhole')).toBe(0);

    await page.locator('#baseline-toggle').uncheck();
    for (const model of ['brown-conrady', 'rational', 'fisheye', 'custom']) {
      expect(await overlayInk(page, model), `${model} baseline off`).toBe(0);
    }
  });

  test('baseline and CPU projection are independent layers', async ({ page }) => {
    await openLab(page);
    await page.locator('#baseline-toggle').uncheck();
    await page.locator('#overlay-toggle').check();
    const overlayOnly = await overlayInk(page, 'fisheye');
    await page.locator('#baseline-toggle').check();
    const both = await overlayInk(page, 'fisheye');
    expect(overlayOnly).toBeGreaterThan(0);
    expect(both).toBeGreaterThan(overlayOnly);
  });
});
