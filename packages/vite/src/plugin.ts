/**
 * Vite plugin: automatic, deterministic, semantic `data-testid` generation.
 *
 * Dev mode: no automatic registry write by default. To regenerate the
 * registry during development, import `writeRegistryFile` from
 * `@testable-ui/vite` and call it with your manifest, or run a build.
 *
 * `includeInProduction: false` in a production build skips injection AND
 * registry emission entirely (documented simplification).
 */
import { relative, resolve } from 'node:path';
import type { Plugin } from 'vite';

import type { TestIdManifest } from '@testable-ui/core';

import { writeRegistryFile } from './registry.js';
import { transformSource } from './transform.js';
import { resolveOptions } from './types.js';
import type { TestableUiViteOptions } from './types.js';

/** Normalize a path to POSIX separators for stable, cross-platform ids. */
function toPosix(p: string): string {
  return p.split('\\').join('/');
}

export function testableUiVite(options: TestableUiViteOptions = {}): Plugin {
  const resolved = resolveOptions(options);
  let manifest: TestIdManifest = { algorithmVersion: resolved.algorithmVersion, entries: [] };
  let root = process.cwd();

  const skipInjection = (): boolean =>
    resolved.environment === 'production' && !resolved.includeInProduction;

  return {
    name: 'testable-ui:vite',
    enforce: 'pre',

    configResolved(config) {
      root = config.root;
    },

    // Reset accumulated manifest state on every build start so rebuilds
    // (dev restart or multiple builds in one process) never go stale.
    buildStart() {
      manifest = { algorithmVersion: resolved.algorithmVersion, entries: [] };
    },

    transform(code, id) {
      if (skipInjection()) return null;
      if (!resolved.include.test(id) || resolved.exclude.test(id)) return null;

      const relativePath = toPosix(relative(root, id));
      let result;
      try {
        result = transformSource(code, {
          attributeName: resolved.attributeName,
          algorithmVersion: resolved.algorithmVersion,
          maxIdLength: resolved.maxIdLength,
          relativePath,
          filename: id,
        });
      } catch {
        // Unparseable by SWC (e.g. non-TS syntax) — let Vite handle the file.
        return null;
      }
      manifest.entries.push(...result.entries);
      return { code: result.code, map: null };
    },

    closeBundle() {
      if (skipInjection()) return;
      writeRegistryFile(manifest, resolve(root, resolved.registryFile));
    },

    configureServer() {
      // Dev mode: no automatic registry write by default. See module comment.
    },
  };
}