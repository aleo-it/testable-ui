/**
 * Signal extraction from the SWC JSX AST.
 *
 * Pure functions over AST nodes — no traversal state. The walker composes
 * these into the `ElementSignals` object consumed by `@testable-ui/core`.
 */
import type {
  JSXAttributeOrSpread,
  JSXElement,
  JSXElementChild,
  JSXElementName,
} from '@swc/core';

/** `type` attribute values that carry semantic meaning for an id. */
const INFORMATIVE_INPUT_TYPES = new Set([
  'email',
  'password',
  'search',
  'number',
  'submit',
  'reset',
  'checkbox',
  'radio',
]);

/** Handler props whose bare-identifier value becomes a role token. */
const HANDLER_PROPS = new Set(['onClick', 'onChange', 'onSubmit', 'onKeyDown', 'onBlur']);

/** Tag name of a JSX element: `Card.Header` -> `header`, `button` -> `button`. */
export function elementTypeOf(name: JSXElementName): string {
  if (name.type === 'Identifier') return name.value;
  if (name.type === 'JSXMemberExpression') return name.property.value;
  return name.name.value; // JSXNamespacedName
}

/** True when the element's tag is exactly `tag` (e.g. `label`). */
export function isTag(element: JSXElement, tag: string): boolean {
  return element.opening.name.type === 'Identifier' && element.opening.name.value === tag;
}

/** True when an attribute with the given name exists (any value shape). */
export function hasAttr(attrs: readonly JSXAttributeOrSpread[], name: string): boolean {
  return attrs.some(
    (a) => a.type === 'JSXAttribute' && a.name.type === 'Identifier' && a.name.value === name,
  );
}

/**
 * String value of an attribute, when statically known:
 * `placeholder="Email"`, `placeholder={'Email'}`, or a no-expression template.
 * Returns `undefined` for dynamic values, boolean attributes, and missing attrs.
 */
export function attrStringValue(
  attrs: readonly JSXAttributeOrSpread[],
  name: string,
): string | undefined {
  for (const attr of attrs) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name.type !== 'Identifier' || attr.name.value !== name) continue;
    const value = attr.value;
    if (!value) return undefined;
    if (value.type === 'StringLiteral') return value.value;
    if (value.type === 'JSXExpressionContainer') {
      const expr = value.expression;
      if (expr.type === 'StringLiteral') return expr.value;
      if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
        return expr.quasis[0]?.cooked;
      }
    }
    return undefined;
  }
  return undefined;
}

/** `type` attribute when informative (email/password/...), else undefined. */
export function inputTypeOf(attrs: readonly JSXAttributeOrSpread[]): string | undefined {
  const type = attrStringValue(attrs, 'type');
  const normalized = type?.toLowerCase();
  if (normalized && INFORMATIVE_INPUT_TYPES.has(normalized)) return normalized;
  return undefined;
}

/**
 * Handler prop whose value is a bare identifier, e.g. `onClick={handleSubmit}`
 * -> `handleSubmit`. Core's `handlerToToken` strips the `handle`/`on` prefix.
 */
export function handlerNameOf(attrs: readonly JSXAttributeOrSpread[]): string | undefined {
  for (const attr of attrs) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name.type !== 'Identifier' || !HANDLER_PROPS.has(attr.name.value)) continue;
    const value = attr.value;
    if (value && value.type === 'JSXExpressionContainer' && value.expression.type === 'Identifier') {
      return value.expression.value;
    }
  }
  return undefined;
}

/**
 * Concatenated text content of an element's children (buttons/links/labels).
 * Recurses into nested elements; ignores expressions that are not static
 * strings. Returns `undefined` when there is no static text.
 */
export function elementText(children: readonly JSXElementChild[]): string | undefined {
  const parts: string[] = [];
  const collect = (child: JSXElementChild): void => {
    if (child.type === 'JSXText') {
      const text = child.value.trim();
      if (text) parts.push(text);
    } else if (child.type === 'JSXExpressionContainer') {
      const expr = child.expression;
      if (expr.type === 'StringLiteral') parts.push(expr.value);
      else if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
        const cooked = expr.quasis[0]?.cooked;
        if (cooked) parts.push(cooked);
      }
    } else if (child.type === 'JSXElement') {
      for (const nested of child.children) collect(nested);
    }
  };
  for (const child of children) collect(child);
  if (parts.length === 0) return undefined;
  return parts.join(' ');
}
