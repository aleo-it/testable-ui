/**
 * Demo engine: runs the REAL @testable-ui/core naming pipeline over a JSX
 * snippet scanned in the browser and returns a fully-explained result set —
 * every element, the winning signal, and the exact id a build would emit.
 */
import {
  DEFAULT_OPTIONS,
  allocateComponentIds,
  componentToToken,
  handlerToToken,
  nameElement,
  pathSuffix,
  roleSignalFor,
  sanitizeToken,
} from '@testable-ui/core';
import type { ElementSignals, RoleSignal } from '@testable-ui/core';

import { fileNameOf, scanJsx } from './jsxScanner';

export interface DemoElement {
  /** Source-order index across the snippet. */
  index: number;
  componentName: string;
  elementType: string;
  signals: ElementSignals;
  /** Winning ladder signal, if any. */
  roleSignal?: RoleSignal;
  /** Token derived from the winning signal (e.g. `email`, `submit`). */
  roleToken?: string;
  /** Component token (e.g. `checkout-form`). */
  componentToken: string;
  /** Element token (e.g. `input`). */
  elementToken: string;
  /** Id before within-component ordinal allocation. */
  base: string;
  /** Ordinal disambiguator (2, 3, ...) when the base collided; else undefined. */
  ordinal?: number;
  /** Final id as a build would emit it (base [+ordinal] + path suffix). */
  finalId: string;
  /** True when an explicit attribute was present and preserved untouched. */
  preserved: boolean;
}

export interface DemoResult {
  /** File basename without extension (drives the fileName fallback). */
  fileName: string;
  /** Global-uniqueness suffix derived from the path. */
  suffix: string;
  /** The id that would be emitted for the file, without the suffix. */
  relativePathMoniker: string;
  elements: DemoElement[];
  error?: string;
}

/**
 * Full pipeline for one snippet. Mirrors the adapter's uniqueness steps:
 *   1. scan -> signals (source order)
 *   2. nameElement per element
 *   3. allocateComponentIds per component block
 *   4. append pathSuffix(relativePath)
 */
export function generateIds(
  source: string,
  relativePath: string,
  attributeName: string = DEFAULT_OPTIONS.attributeName,
): DemoResult {
  const suffix = pathSuffix(relativePath);
  const fileName = fileNameOf(relativePath);
  const base: DemoResult = {
    fileName,
    suffix,
    relativePathMoniker: `${fileName}-…-${suffix}`,
    elements: [],
  };

  const scanned = scanJsx(source, relativePath, attributeName);

  // Group by component, preserving source order (mirrors walker.finalize()).
  const groups = new Map<string, number[]>();
  scanned.forEach((item, i) => {
    const list = groups.get(item.signals.componentName);
    if (list) list.push(i);
    else groups.set(item.signals.componentName, [i]);
  });

  const finalIds = new Map<number, { finalId: string; ordinal?: number }>();
  const nonPreserved: { index: number; base: string; component: string }[] = [];
  scanned.forEach((item, i) => {
    if (item.preserved) return;
    const signals: ElementSignals = { ...item.signals, fileName };
    nonPreserved.push({
      index: i,
      base: nameElement(signals, { ...DEFAULT_OPTIONS, attributeName }).id,
      component: item.signals.componentName,
    });
  });

  for (const [, indices] of groups) {
    const list = indices
      .map((i) => nonPreserved.find((n) => n.index === i))
      .filter((n): n is NonNullable<typeof n> => Boolean(n));
    const allocated = allocateComponentIds(list.map((n) => n.base));
    list.forEach((n, k) => {
      const id = allocated[k]!;
      const baseId = list[k]!.base;
      finalIds.set(n.index, {
        finalId: `${id}-${suffix}`,
        ordinal: id !== baseId ? Number(id.slice(baseId.length + 1)) : undefined,
      });
    });
  }

  base.elements = scanned.map((item, index) => {
    const signals: ElementSignals = { ...item.signals, fileName };
    const roleSignal = roleSignalFor(signals);
    const raw = roleSignal ? signals[roleSignal] : undefined;
    const roleToken = raw
      ? roleSignal === 'handlerName'
        ? handlerToToken(raw)
        : sanitizeToken(raw)
      : undefined;
    const allocated = finalIds.get(index);
    return {
      index,
      componentName: item.signals.componentName,
      elementType: item.signals.elementType,
      signals,
      roleSignal,
      roleToken,
      componentToken: componentToToken(item.signals.componentName),
      elementToken: sanitizeToken(item.signals.elementType),
      base: allocated ? allocated.finalId.slice(0, allocated.finalId.length - suffix.length - 1) : '',
      ordinal: allocated?.ordinal,
      finalId: allocated?.finalId ?? item.preservedValue ?? '(preserved)',
      preserved: item.preserved,
    };
  });

  return base;
}

export { DEFAULT_OPTIONS };

/** The snippet loaded into the live demo on first paint. */
export const DEFAULT_SNIPPET = `const CheckoutForm = () => (
  <form onSubmit={handleSubmit}>
    <label htmlFor="email">Email address</label>
    <input id="email" type="email" placeholder="you@example.com" />
    <label>
      Password
      <input type="password" />
    </label>
    <button type="submit">Place order</button>
    <div>Totals calculated at checkout</div>
  </form>
);
`;

export const DEFAULT_PATH = 'src/checkout/CheckoutForm.tsx';
