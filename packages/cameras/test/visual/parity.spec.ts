import { expect, test } from '@playwright/test';
import { call, expectParity, MODELS, openLab, type Summary } from './hooks';

/** GPU render vs `core` CPU projection of the same 3D probe points. */
const MAX_PX = 1.0;

test.describe('GPU parity with core', () => {
  for (const model of MODELS) {
    test(`${model}: probe points land where core projects them`, async ({ page }) => {
      const errors = await openLab(page);
      const summary = await call<Summary>(page, `lab.measureTile(${JSON.stringify(model)})`);
      expect(summary.count).toBe(25);
      expectParity(summary, MAX_PX);
      expect(errors).toEqual([]);
    });
  }

  test('negative control: distorting models are visibly NOT pinhole', async ({ page }) => {
    await openLab(page);
    // Guards against a silently inactive patch: a distorted render compared with the
    // pinhole projection must be clearly off at the image periphery.
    for (const model of ['brown-conrady', 'rational', 'fisheye'] as const) {
      const vsPinhole = await call<Summary>(
        page,
        `lab.measureTileAgainst(${JSON.stringify(model)}, 'pinhole')`,
      );
      expect(vsPinhole.maxError, `${model} looks like pinhole`).toBeGreaterThan(5);
    }
  });

  for (const model of ['brown-conrady', 'rational', 'fisheye'] as const) {
    test(`${model}: coefficient changes on a live camera take effect without recompiling`, async ({ page }) => {
      await openLab(page);
      expectParity(
        await call<Summary>(page, `lab.measureAfterCoefficientChange(${JSON.stringify(model)})`),
        MAX_PX,
      );
    });
  }
});

test.describe('several cameras, one scene', () => {
  for (const model of ['brown-conrady', 'rational', 'fisheye'] as const) {
    test(`${model}: same model with different K renders with its own K`, async ({ page }) => {
      await openLab(page);
      const first = await call<Summary>(page, `lab.measureTile(${JSON.stringify(model)})`);
      const alt = await call<Summary>(page, `lab.measureSpec(lab.alternateSpec(${JSON.stringify(model)}))`);
      const again = await call<Summary>(page, `lab.measureTile(${JSON.stringify(model)})`);
      expectParity(first, MAX_PX);
      expectParity(alt, MAX_PX);
      expectParity(again, MAX_PX);
    });
  }

  test('rendering every model in sequence on one scene stays correct (no cross-talk)', async ({ page }) => {
    await openLab(page);
    for (let pass = 0; pass < 2; pass++) {
      for (const model of MODELS) {
        expectParity(await call<Summary>(page, `lab.measureTile(${JSON.stringify(model)})`), MAX_PX);
      }
    }
  });

  for (const model of ['brown-conrady', 'rational', 'fisheye'] as const) {
    test(`a stock PerspectiveCamera after a ${model} sensor render is undistorted`, async ({ page }) => {
      await openLab(page);
      const summary = await call<Summary>(page, `lab.measureStockCameraAfter(${JSON.stringify(model)})`);
      expectParity(summary, MAX_PX);
    });
  }
});
