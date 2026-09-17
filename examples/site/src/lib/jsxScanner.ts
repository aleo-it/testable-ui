/**
 * Browser-side JSX signal scanner.
 *
 * Mirrors the SWC-based extraction in `@testable-ui/vite` (signals.ts +
 * walker.ts) using an ESTree+JSX AST from acorn/acorn-jsx. The resulting
 * `ElementSignals` are fed to the REAL `@testable-ui/core` naming engine, so
 * the demo produces byte-identical ids to a build without shipping swc/wasm.
 *
 * Parsing is intentionally lenient: demo snippets are plain JSX (no TS types).
 */
import { Parser } from 'acorn';
import jsx from 'acorn-jsx';

import type { ElementSignals } from '@testable-ui/core';

const JSXParser = Parser.extend(jsx());

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

interface BaseNode {
  type: string;
  start: number;
  end: number;
}
type AnyNode = BaseNode & Record<string, unknown>;

interface NameNode extends BaseNode {
  name: string;
}
interface MemberNameNode extends BaseNode {
  object: NameNode;
  property: NameNode;
}
interface NamespacedNameNode extends BaseNode {
  namespace: NameNode;
  name: NameNode;
}
interface AttrNode extends BaseNode {
  type: 'JSXAttribute';
  name: NameNode;
  value: AnyNode | null;
}
interface SpreadAttrNode extends BaseNode {
  type: 'JSXSpreadAttribute';
}
type Attr = AttrNode | SpreadAttrNode;

interface OpeningNode extends BaseNode {
  name: NameNode | MemberNameNode | NamespacedNameNode;
  attributes: Attr[];
  selfClosing: boolean;
}
interface ElementNode extends BaseNode {
  type: 'JSXElement';
  openingElement: OpeningNode;
  children: AnyNode[];
}

/** Signals extracted for one JSX element (minus fileName, filled by caller). */
export interface ScannedElement {
  signals: Omit<ElementSignals, 'fileName'>;
  /** True when the configured attribute already exists (walker preserves it). */
  preserved: boolean;
  /** Existing value of the preserved attribute, when statically known. */
  preservedValue?: string;
  /** Character offset of the opening tag (source-order stable). */
  start: number;
}

function isNode(value: unknown): value is AnyNode {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

/** Tag name of a JSX element: `Card.Header` -> `header`, `button` -> `button`. */
function elementTypeOf(name: OpeningNode['name']): string {
  if (name.type === 'JSXIdentifier') return (name as NameNode).name;
  if (name.type === 'JSXMemberExpression') return (name as MemberNameNode).property.name;
  return (name as NamespacedNameNode).name.name;
}

/** True when the element's tag is exactly `tag` (e.g. `label`). */
function isTag(element: ElementNode, tag: string): boolean {
  const name = element.openingElement.name;
  return name.type === 'JSXIdentifier' && (name as NameNode).name === tag;
}

/** True when an attribute with the given name exists (any value shape). */
function hasAttr(attrs: readonly Attr[], name: string): boolean {
  return attrs.some(
    (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === name,
  );
}

/**
 * String value of an attribute, when statically known:
 * `placeholder="Email"`, `placeholder={'Email'}`, or a no-expression template.
 */
function attrStringValue(attrs: readonly Attr[], name: string): string | undefined {
  for (const attr of attrs) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name.type !== 'JSXIdentifier' || attr.name.name !== name) continue;
    const value = attr.value;
    if (!value) return undefined;
    if (value.type === 'Literal') {
      return typeof value.value === 'string' ? value.value : undefined;
    }
    if (value.type === 'JSXExpressionContainer') {
      const expr = value.expression as AnyNode | undefined;
      if (!expr) return undefined;
      if (expr.type === 'Literal' && typeof expr.value === 'string') return expr.value;
      if (expr.type === 'TemplateLiteral') {
        const expressions = expr.expressions as AnyNode[];
        if (expressions.length === 0) {
          const quasis = expr.quasis as { value: { cooked?: string } }[];
          return quasis[0]?.value.cooked;
        }
      }
    }
    return undefined;
  }
  return undefined;
}

/** `type` attribute when informative (email/password/...), else undefined. */
function inputTypeOf(attrs: readonly Attr[]): string | undefined {
  const type = attrStringValue(attrs, 'type');
  const normalized = type?.toLowerCase();
  if (normalized && INFORMATIVE_INPUT_TYPES.has(normalized)) return normalized;
  return undefined;
}

/** Handler prop whose value is a bare identifier, e.g. `onClick={handleSubmit}`. */
function handlerNameOf(attrs: readonly Attr[]): string | undefined {
  for (const attr of attrs) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name.type !== 'JSXIdentifier' || !HANDLER_PROPS.has(attr.name.name)) continue;
    const value = attr.value;
    if (value && value.type === 'JSXExpressionContainer') {
      const expr = value.expression as AnyNode | undefined;
      if (expr && expr.type === 'Identifier') return expr.name as string;
    }
  }
  return undefined;
}

/**
 * Concatenated static text content of an element's children. Recurses into
 * nested elements; ignores non-static expressions. `undefined` when no text.
 */
function elementText(children: readonly AnyNode[]): string | undefined {
  const parts: string[] = [];
  const collect = (child: AnyNode): void => {
    if (child.type === 'JSXText') {
      const text = String(child.value ?? '').trim();
      if (text) parts.push(text);
    } else if (child.type === 'JSXExpressionContainer') {
      const expr = child.expression as AnyNode | undefined;
      if (expr?.type === 'Literal' && typeof expr.value === 'string') parts.push(expr.value);
      else if (expr?.type === 'TemplateLiteral') {
        const expressions = expr.expressions as AnyNode[];
        if (expressions.length === 0) {
          const cooked = (expr.quasis as { value: { cooked?: string } }[])[0]?.value.cooked;
          if (cooked) parts.push(cooked);
        }
      }
    } else if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      for (const nested of child.children as AnyNode[]) collect(nested);
    }
  };
  for (const child of children) collect(child);
  if (parts.length === 0) return undefined;
  return parts.join(' ');
}

/** Component name contributed by a node, mirroring the walker's stack pushes. */
function componentNameOf(node: AnyNode): string | undefined {
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
    const id = node.id as AnyNode | null | undefined;
    return id?.type === 'Identifier' ? (id.name as string) : undefined;
  }
  if (node.type === 'VariableDeclarator') {
    const init = node.init as AnyNode | null | undefined;
    const isFn = init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression';
    const id = node.id as AnyNode | undefined;
    return isFn && id?.type === 'Identifier' ? (id.name as string) : undefined;
  }
  return undefined;
}

interface WalkContext {
  componentStack: string[];
  currentLabel: string | undefined;
  labelMap: Map<string, string>;
  fileName: string;
  attributeName: string;
  out: ScannedElement[];
}

function processElement(element: ElementNode, ctx: WalkContext): void {
  const componentName = ctx.componentStack.at(-1) ?? ctx.fileName;
  const elementType = elementTypeOf(element.openingElement.name);
  const attrs = element.openingElement.attributes;

  // Pre-existing attribute preserved untouched (walker returns early).
  if (hasAttr(attrs, ctx.attributeName)) {
    ctx.out.push({
      signals: { componentName, elementType },
      preserved: true,
      preservedValue: attrStringValue(attrs, ctx.attributeName),
      start: element.start,
    });
    return;
  }

  const idAttr = attrStringValue(attrs, 'id');
  const ariaLabelledby = attrStringValue(attrs, 'aria-labelledby');
  const labelledByTexts = ariaLabelledby
    ?.trim()
    .split(/\s+/)
    .map((id) => ctx.labelMap.get(id));
  const resolvedAriaLabelledby = labelledByTexts?.every((text): text is string => Boolean(text))
    ? labelledByTexts.join(' ')
    : undefined;
  const signals: Omit<ElementSignals, 'fileName'> = {
    componentName,
    elementType,
    ariaLabelledby: resolvedAriaLabelledby,
    ariaLabel: attrStringValue(attrs, 'aria-label'),
    title: attrStringValue(attrs, 'title'),
    placeholder: attrStringValue(attrs, 'placeholder'),
    inputType: inputTypeOf(attrs),
    handlerName: handlerNameOf(attrs),
    text: elementText(element.children),
    label: ctx.currentLabel ?? (idAttr ? ctx.labelMap.get(idAttr) : undefined),
  };

  ctx.out.push({ signals, preserved: false, start: element.start });
}

function walk(node: AnyNode | null | undefined, ctx: WalkContext): void {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return;
  const name = componentNameOf(node);
  if (name) ctx.componentStack.push(name);

  if (node.type === 'JSXElement') visitJSXElement(node as unknown as ElementNode, ctx);
  else if (node.type === 'JSXFragment') {
    for (const child of node.children as AnyNode[]) walk(child, ctx);
  } else {
    recurse(node, ctx);
  }

  if (name) ctx.componentStack.pop();
}

function recurse(node: AnyNode, ctx: WalkContext): void {
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) walk(item, ctx);
    } else if (isNode(value)) {
      walk(value, ctx);
    }
  }
}

/** Mirrors `TestableUiVisitor.visitJSXElement`: label context + ordering. */
function visitJSXElement(element: ElementNode, ctx: WalkContext): void {
  const opening = element.openingElement;
  const isLabel = isTag(element, 'label');
  const prevLabel = ctx.currentLabel;
  const prevLabelMap = ctx.labelMap;

  // Process against the OUTER label context.
  processElement(element, ctx);

  if (isLabel) ctx.currentLabel = elementText(element.children);
  const nextLabelMap = new Map(prevLabelMap);
  for (const child of element.children) {
    if (child.type === 'JSXElement' && isTag(child as unknown as ElementNode, 'label')) {
      const labelEl = child as unknown as ElementNode;
      const htmlFor = attrStringValue(labelEl.openingElement.attributes, 'htmlFor');
      if (htmlFor) {
        const text = elementText(labelEl.children);
        if (text) nextLabelMap.set(htmlFor, text);
      }
    }
    if (child.type === 'JSXElement') {
      const referenced = child as unknown as ElementNode;
      const id = attrStringValue(referenced.openingElement.attributes, 'id');
      const text = elementText(referenced.children);
      if (id && text) nextLabelMap.set(id, text);
    }
  }
  ctx.labelMap = nextLabelMap;

  // Descend: attribute expressions may contain nested JSX, then children.
  for (const attr of opening.attributes) {
    if (attr.type === 'JSXAttribute' && isNode(attr.value)) walk(attr.value, ctx);
  }
  for (const child of element.children) walk(child, ctx);

  ctx.currentLabel = prevLabel;
  ctx.labelMap = prevLabelMap;
}

/** File basename without extension: `src/checkout/CheckoutForm.tsx` -> `CheckoutForm`. */
export function fileNameOf(relativePath: string): string {
  const base = relativePath.split('/').at(-1) ?? relativePath;
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

/**
 * Scan JSX source into per-element signals in source order.
 * Throws a `SyntaxError` (with location) when the snippet cannot be parsed.
 */
export function scanJsx(source: string, relativePath: string, attributeName = 'data-testid'): ScannedElement[] {
  const program = JSXParser.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
  }) as unknown as AnyNode;

  const ctx: WalkContext = {
    componentStack: [],
    currentLabel: undefined,
    labelMap: new Map(),
    fileName: fileNameOf(relativePath),
    attributeName,
    out: [],
  };
  walk(program, ctx);
  return ctx.out;
}
