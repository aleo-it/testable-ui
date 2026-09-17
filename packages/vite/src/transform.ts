/**
 * Single-file transform: parse -> walk/mutate -> print.
 *
 * Mechanism note: `@swc/core`'s experimental `plugin` option on
 * `transformSync` still exists in 1.16.x (`Options.plugin?: Plugin`), but
 * `transformSync` unconditionally runs the JSX -> `React.createElement`
 * transform, which breaks Vite builds using the automatic JSX runtime.
 * We therefore use the documented fallback: `parseSync` + manual AST
 * mutation (via the same `Visitor` class the plugin API uses) + `printSync`,
 * which preserves JSX in the output.
 */
import { parseSync, printSync } from '@swc/core';
import type { TestIdEntry } from '@testable-ui/core';

import { TestableUiVisitor } from './walker.js';

export interface TransformSourceOptions {
  attributeName: string;
  algorithmVersion: 1;
  maxIdLength: number;
  /** Module path relative to the Vite root, POSIX separators. */
  relativePath: string;
  /** Absolute file path (used to pick the TSX parser mode). */
  filename: string;
}

export interface TransformSourceResult {
  code: string;
  entries: TestIdEntry[];
}

/** True for `.tsx`/`.jsx`/`.mtsx`/`.mjsx`/`.ctsx`/`.cjsx` files. */
function isTsx(filename: string): boolean {
  return /\.(?:[cm]?[jt]sx)$/.test(filename.replace(/[?#].*$/, ''));
}

/**
 * Transform one source file: inject the configured attribute into JSX
 * elements and return the manifest entries for this file.
 */
export function transformSource(code: string, options: TransformSourceOptions): TransformSourceResult {
  const module = parseSync(code, { syntax: 'typescript', tsx: isTsx(options.filename) });
  const visitor = new TestableUiVisitor(options);
  const output = printSync(visitor.visitProgram(module), {});
  return { code: output.code, entries: visitor.entries };
}
