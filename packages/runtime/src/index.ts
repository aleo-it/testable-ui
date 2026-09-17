import { useId, useRef } from 'react';

/**
 * Options for {@link useTestId}.
 */
export interface UseTestIdOptions {
  /**
   * Stable per-row identifier (typically the React `key` of the list item).
   * When provided, the returned id is fully deterministic:
   * `${baseId}-${sanitizeSuffix(String(key))}`.
   */
  key?: string | number;
}

/**
 * Strip characters that are unsafe in HTML attributes / CSS selectors.
 * Keeps alphanumerics, `-` and `_`; collapses runs of separators; trims
 * leading/trailing separators. Never returns an empty string — falls back
 * to `x`.
 *
 * Examples:
 * - `sanitizeSuffix('user 3!')` → `'user-3'`
 * - `sanitizeSuffix(':r1:')` → `'r1'`
 * - `sanitizeSuffix(':r1-2:')` → `'r1-2'`
 * - `sanitizeSuffix('@@')` → `'x'`
 */
export function sanitizeSuffix(input: string): string {
  const cleaned = input
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned : 'x';
}

/**
 * Returns a unique, stable `data-testid` for a single rendered element.
 *
 * Solves the `.map()` row-uniqueness gap that build-time transforms cannot:
 * the loop index does not exist in the AST, so every row is injected with the
 * same base id. This hook uniquifies at runtime.
 *
 * - `key` provided → `${baseId}-${sanitizeSuffix(String(key))}`. Deterministic,
 *   hydration-safe and reorder-stable — pass the row's React key for the best
 *   ids (`order-row-3`).
 * - no `key` → `${baseId}-${sanitizeSuffix(useId())}`. React's `useId` is
 *   stable across renders, unique per component instance and hydration-safe,
 *   so uniqueness is guaranteed with zero API friction.
 *
 * The result is memoized per base id and suffix input in a `useRef` map:
 * repeated calls inside the same component render return the same string, while
 * a changed row key produces a corresponding changed id.
 *
 * Pure client-side hook: no DOM access, no effects, no timers. SSR-safe.
 */
export function useTestId(baseId: string, options?: UseTestIdOptions): string {
  const fallbackId = useId();
  const memo = useRef<Map<string, string> | null>(null);
  if (memo.current === null) {
    memo.current = new Map();
  }

  const suffixSource = options?.key !== undefined ? String(options.key) : fallbackId;
  const cacheKey = `${baseId}\u0000${suffixSource}`;
  const cached = memo.current.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const suffix =
    options?.key !== undefined ? sanitizeSuffix(suffixSource) : sanitizeSuffix(fallbackId);
  const id = `${baseId}-${suffix}`;
  memo.current.set(cacheKey, id);
  return id;
}

export { TestIdOverlay } from './TestIdOverlay.js';
export type { TestIdOverlayOptions } from './TestIdOverlay.js';
