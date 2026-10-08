import { expect, type Page } from '@playwright/test';

export interface Summary {
  count: number;
  missing: number;
  maxError: number;
  meanError: number;
  errors: number[];
}

export const MODELS = ['pinhole', 'brown-conrady', 'rational', 'fisheye'] as const;
export type Model = (typeof MODELS)[number];

/** Collects GL / page errors so tests can assert a clean console. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' || /THREE\.WebGLProgram|shader|GL_INVALID|WebGL:/i.test(text)) {
      errors.push(`${msg.type()}: ${text}`);
    }
  });
  return errors;
}

export async function openLab(page: Page): Promise<string[]> {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.waitForFunction(() => '__sensorLab' in window);
  return errors;
}

export async function call<T>(page: Page, expression: string): Promise<T> {
  return page.evaluate(`(() => { const lab = window.__sensorLab; return ${expression}; })()`) as Promise<T>;
}

export function expectParity(summary: Summary, maxPx: number): void {
  expect(summary.missing, 'probe points missing from render').toBe(0);
  expect(summary.maxError, `max probe error (px): ${summary.errors.map((e) => e.toFixed(2)).join(', ')}`).toBeLessThanOrEqual(maxPx);
}
