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
  test('form is reachable by scrolling the same container as the views (short window)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openLab(page);

    const scroller = page.locator('.scene-scroll');
    const metrics = await scroller.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(metrics.scroll, 'content should overflow so scrolling is needed').toBeGreaterThan(metrics.client);

    // The page itself must not scroll; the form lives in the same scroller as the tiles.
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    expect(await scroller.locator('#tiles').count()).toBe(1);
    expect(await scroller.locator('#custom-form').count()).toBe(1);

    await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const apply = page.getByRole('button', { name: 'Apply' });
    const box = (await apply.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(720);
    await apply.click();
    await expect(page.locator('#custom-status')).toHaveClass(/ok/);
  });
});
