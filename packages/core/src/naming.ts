import { createHash } from 'node:crypto';

import { ROLE_SIGNAL_PRIORITY } from './types.js';
import type { ElementSignals, NamedElement, NamingOptions, RoleSignal } from './types.js';

/** Elements whose text children contribute an accessible name (HTML-AAM nameFrom: contents). */
const NAME_FROM_CONTENTS = new Set([
  'button', 'a', 'link', 'summary', 'label', 'option',
  'td', 'th', 'legend', 'caption', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'dt', 'dd', 'figcaption', 'abbr', 'dfn', 'optgroup',
]);

const PLACEHOLDER_APPLICABLE = new Set(['input', 'textarea']);

const PATH_HASH_PREFIX = 'testable-ui/v1:';

function canonicalPath(relativeFilePath: string): string {
  const normalized = relativeFilePath
    .replace(/\\/g, '/')
    .replace(/^\.\/?/, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
  const parts = normalized.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
}

/** Lowercase, kebab-case, strip punctuation, collapse separators. */
export function sanitizeToken(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Turn camelCase handler names into role tokens: handleSubmit -> submit, onChange -> change. */
export function handlerToToken(handlerName: string): string {
  const stripped = handlerName.replace(/^(handle|on)/, '');
  return sanitizeToken(stripped);
}

/** kebab-case of a camelCase/PascalCase component name: CheckoutForm -> checkout-form. */
export function componentToToken(componentName: string): string {
  return sanitizeToken(componentName);
}

function pickRoleSignal(signals: ElementSignals): string | undefined {
  const key = roleSignalFor(signals);
  if (!key) return undefined;
  const raw = signals[key];
  if (!raw) return undefined;
  return key === 'handlerName' ? handlerToToken(raw) : sanitizeToken(raw);
}

/**
 * Winning role signal for an element, according to the ROLE_SIGNAL_PRIORITY
 * ladder and per-element gating (text only on nameFrom:contents elements,
 * placeholder only on input/textarea, inputType only on input/button).
 * Returns the signal KEY (not the token) so UIs can explain WHY an id was
 * chosen; `nameElement` consumes it via pickRoleSignal.
 */
export function roleSignalFor(signals: ElementSignals): RoleSignal | undefined {
  for (const key of ROLE_SIGNAL_PRIORITY) {
    const raw = signals[key];
    if (!raw) continue;

    // Role-gating: text only for nameFrom:contents elements; placeholder/inputType only for form controls.
    if (key === 'text' && !NAME_FROM_CONTENTS.has(signals.elementType)) continue;
    if (key === 'inputType' && signals.elementType !== 'input' && signals.elementType !== 'button') continue;
    if (key === 'placeholder' && !PLACEHOLDER_APPLICABLE.has(signals.elementType)) continue;

    const token: string | undefined =
      key === 'handlerName' ? handlerToToken(raw) : sanitizeToken(raw);
    if (token) return key;
  }
  return undefined;
}

/**
 * Global-uniqueness suffix: first `length` hex chars of SHA-256 over the
 * namespaced canonical path. Deterministic across machines and builds; changes
 * only when the FILE moves (never on code edits above the element — the
 * line:col alternative breaks IDs on every edit). 12 chars (2^48) keeps
 * cross-file collision probability ~0.27% at 500 files.
 *
 * Composed by adapters: finalId = `${semanticBase}-${hash}`.
 */
export function pathSuffix(relativeFilePath: string, length = 12): string {
  const canonical = canonicalPath(relativeFilePath);
  const hex = createHash('sha256').update(`${PATH_HASH_PREFIX}${canonical}`).digest('hex');
  return hex.slice(0, length);
}

function truncate(id: string, max: number): string {
  if (id.length <= max) return id;
  // Prefer dropping the middle: component stays anchored at the front for greppability,
  // element type stays anchored at the back for readability.
  const keepHead = Math.ceil(max * 0.6);
  const keepTail = max - keepHead - 1;
  return `${id.slice(0, keepHead)}~${id.slice(-keepTail)}`;
}

/**
 * Compute the semantic id for one element. Pure and deterministic:
 * identical signals in -> identical ids out, across machines and builds.
 *
 * Naming schema (algorithm v1): `{component}-{role?}-{elementType}`
 *   - no role signal  : CheckoutForm/button  -> `checkout-button`
 *   - label "Email"   : CheckoutForm/input   -> `checkout-email-input`
 *   - text "Submit"   : CheckoutForm/button  -> `checkout-submit-button`
 *   - div, no signal  : CheckoutForm/div     -> `checkout-div`
 *
 * Within-component duplicates (two identical signal sets in one file) are
 * resolved by the adapter with an ordinal suffix — see allocateComponentIds.
 */
export function nameElement(signals: ElementSignals, options: NamingOptions): NamedElement {
  const component = componentToToken(signals.componentName);
  const elementType = sanitizeToken(signals.elementType);
  const role = pickRoleSignal(signals);

  const id = truncate(
    role ? `${component}-${role}-${elementType}` : `${component}-${elementType}`,
    options.maxIdLength,
  );
  return { id, preservedExplicit: false };
}

/**
 * Resolve within-component collisions: two JSX elements in the same component
 * that produced the same id get deterministic ordinal suffixes in
 * source-encounter order. Reordering JSX shifts the ordinals, so prefer
 * giving signal-poor elements distinct role signals at the source.
 */
export function allocateComponentIds(ids: readonly string[]): string[] {
  const counts = new Map<string, number>();
  return ids.map((id) => {
    const n = (counts.get(id) ?? 0) + 1;
    counts.set(id, n);
    return n === 1 ? id : `${id}-${n}`;
  });
}