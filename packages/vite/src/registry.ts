/**
 * Registry emission: write the typed `test-ids.generated.ts` module.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { renderRegistrySource } from '@testable-ui/core';
import type { TestIdManifest } from '@testable-ui/core';

/**
 * Render and write the registry module to disk. Used by the plugin's
 * `closeBundle` hook; also exported so dev-mode users can trigger
 * regeneration manually.
 */
export function writeRegistryFile(manifest: TestIdManifest, filePath: string): void {
  const source = renderRegistrySource(manifest);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, source, 'utf8');
}