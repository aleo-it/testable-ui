import { defineConfig } from 'vite';
import { testableUiVite } from '@testable-ui/vite';

export default defineConfig({
  plugins: [
    testableUiVite({ registryFile: 'test-ids.generated.ts' }),
  ],
});
