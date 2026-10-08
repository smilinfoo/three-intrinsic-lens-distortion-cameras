import { defineConfig } from 'vite';
import path from 'node:path';

/** Demo app / example scene. The publishable library is built separately (tsup, see package.json). */
export default defineConfig({
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      // Resolve `core` from source so dev/test work on a clean checkout without building it.
      'intrinsic-lens-distortion': path.resolve(
        __dirname,
        '../core/src/index.ts',
      ),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'demo-dist',
    emptyOutDir: true,
  },
});
