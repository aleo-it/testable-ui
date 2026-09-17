import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

// The site runs the REAL @testable-ui/core naming engine in the browser.
// core's pathSuffix imports `node:crypto`; alias it to a sync SHA-256 shim so
// the identical algorithm executes client-side (no swc/wasm, no polyfill bloat).
const cryptoShim = fileURLToPath(new URL('./src/lib/cryptoShim.ts', import.meta.url));

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      'node:crypto': cryptoShim,
      crypto: cryptoShim,
    },
  },
});
