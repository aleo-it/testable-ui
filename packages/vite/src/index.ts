/**
 * @testable-ui/vite — Vite adapter for automatic, deterministic, semantic
 * `data-testid` generation. Wraps `@swc/core` to extract signals from JSX,
 * compute ids via `@testable-ui/core`, inject attributes, and emit a typed
 * registry at build time.
 */
import { testableUiVite } from './plugin.js';

export { testableUiVite };
export default testableUiVite;

export type { TestableUiViteOptions } from './types.js';
export { resolveOptions } from './types.js';
export type { ResolvedOptions } from './types.js';

export { transformSource } from './transform.js';
export type { TransformSourceOptions, TransformSourceResult } from './transform.js';

export { writeRegistryFile } from './registry.js';

export { TestableUiVisitor } from './walker.js';