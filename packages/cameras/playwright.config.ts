import { defineConfig } from '@playwright/test';

const PORT = 4173;

/**
 * GPU-backed visual checks. Software WebGL (SwiftShader/ANGLE) keeps results independent of
 * the host GPU. Run with `npm run test:visual -w three-intrinsic-lens-distortion-cameras` (not part of `npm test`).
 */
export default defineConfig({
  testDir: 'test/visual',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1700, height: 1100 },
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
});
