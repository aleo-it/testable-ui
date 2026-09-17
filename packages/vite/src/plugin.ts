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

/** Vite module ids may carry query/hash suffixes that are not part of the file path. */
function cleanModuleId(id: string): string {
  return id.replace(/[?#].*$/, '');
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
      const fileId = cleanModuleId(id);
      if (!resolved.include.test(fileId) || resolved.exclude.test(fileId)) return null;

      const relativePath = toPosix(relative(root, fileId));
      let result;
      try {
        result = transformSource(code, {
          attributeName: resolved.attributeName,
          algorithmVersion: resolved.algorithmVersion,
          maxIdLength: resolved.maxIdLength,
          relativePath,
          filename: fileId,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        const message = `testable-ui: failed to transform ${relativePath}: ${detail}`;
        if (resolved.strict) this.error(message);
        else this.warn(message);
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
