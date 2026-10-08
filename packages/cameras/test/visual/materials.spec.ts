import { expect, test } from '@playwright/test';
import { call, MODELS, openLab } from './hooks';

interface GalleryPixel {
  name: string;
  rgb: [number, number, number];
}

test.describe('built-in material coverage', () => {
  for (const model of MODELS) {
    test(`${model}: every gallery material compiles and renders (not background)`, async ({ page }) => {
      const errors = await openLab(page);
      const background = await call<number[]>(page, 'lab.background');
      const pixels = await call<GalleryPixel[]>(page, `lab.galleryPixels(${JSON.stringify(model)})`);

      expect(pixels.map((p) => p.name)).toEqual([
        'basic', 'lambert', 'phong', 'standard', 'physical', 'toon', 'normal', 'matcap',
      ]);
      for (const p of pixels) {
        const distance = Math.max(...p.rgb.map((c, i) => Math.abs(c - background[i]!)));
        expect(distance, `${model}/${p.name} rendered as background (${p.rgb})`).toBeGreaterThan(25);
      }
      expect(errors).toEqual([]);
    });
  }
});
