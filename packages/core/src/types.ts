/**
 * Normalized signal model shared by every adapter (SWC/Babel/Vite).
 *
 * Adapters are responsible for extracting these signals from their own AST
 * representation. The naming engine is 100% framework/tooling-agnostic:
 * given the same metadata, it always produces the same IDs.
 */

/** The element signals the naming engine may use, ranked by quality. */
export interface ElementSignals {
  /** Name of the owning component, e.g. `CheckoutForm` (camelCase as authored). */
  componentName: string;
  /** JSX tag name, e.g. `button`, `input`, `div`. */
  elementType: string;
  /** File basename without extension, e.g. `checkout-form`. */
  fileName: string;
  /** `aria-labelledby` prop value (reference to labelled-by element IDs). */
  ariaLabelledby?: string;
  /** `aria-label` prop value. Strongest explicit name signal. */
  ariaLabel?: string;
  /** `title` prop value (advisory tooltip / supplementary name). */
  title?: string;
  /** Text of an associated `<label>` (via htmlFor/id or wrapping). */
  label?: string;
  /** `placeholder` prop value (hint, weaker than author names). */
  placeholder?: string;
  /** `type` attribute for input/button when informative (email, password, submit). */
  inputType?: string;
  /** Text children (button/link content). */
  text?: string;
  /** Event-handler prop name, e.g. `handleSubmit` from `onClick={handleSubmit}`. */
  handlerName?: string;
}

export type RoleSignal = 'ariaLabelledby' | 'ariaLabel' | 'label' | 'title' | 'text' | 'inputType' | 'placeholder' | 'handlerName';

/**
 * Signal ladder aligned with HTML AccName spec, augmented with structural
 * disambiguators. Gated per element type in pickRoleSignal — text only on
 * nameFrom:contents elements, placeholder/inputType only on form controls.
 */
export const ROLE_SIGNAL_PRIORITY: readonly RoleSignal[] = [
  'ariaLabelledby',
  'ariaLabel',
  'label',
  'title',
  'text',
  'inputType',
  'placeholder',
  'handlerName',
] as const;

export interface NamingOptions {
  /**
   * Version of the naming algorithm. Bumping this intentionally changes
   * generated IDs — a breaking change for consumers' test suites.
   */
  algorithmVersion: 1;
  /** Max length of the final id (excluding collision suffix). */
  maxIdLength: number;
  /** True when dev-run instance; used by adapters for config defaults. */
  environment?: 'development' | 'production';
  /** Attribute name to emit, e.g. `data-testid` or `data-test-id`. */
  attributeName: string;
  /**
   * Frame policy. "always" keeps IDs in prod bundles (recommended default —
   * prod smoke tests need them). "development" strips them from prod output.
   */
  includeInProduction: boolean;
}

export const DEFAULT_OPTIONS: NamingOptions = {
  algorithmVersion: 1,
  maxIdLength: 48,
  attributeName: 'data-testid',
  includeInProduction: true,
} as const;

/** Result of naming one element. */
export interface NamedElement {
  /** The computed id (may carry a within-component disambiguator suffix). */
  id: string;
  /** True when an explicit user-provided attribute was preserved untouched. */
  preservedExplicit: boolean;
}

export const MAX_HANDLER_TRIM = 32;