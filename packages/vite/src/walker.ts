/**
 * SWC AST walker that extracts element signals, computes deterministic ids,
 * and injects the configured attribute.
 *
 * Traversal mechanism: `@swc/core`'s `Visitor` class applied to a module
 * parsed with `parseSync`, then re-printed with `printSync`. This preserves
 * JSX in the output (the `transformSync` `plugin` option exists but
 * unconditionally runs the JSX -> `React.createElement` transform, which
 * breaks Vite's automatic JSX runtime — so we adapt with parse/print).
 */
import type {
  ClassDeclaration,
  Declaration,
  FunctionDeclaration,
  JSXAttribute,
  JSXElement,
  JSXOpeningElement,
  Program,
  Span,
  TsType,
  VariableDeclarator,
} from '@swc/core';
import { Visitor } from '@swc/core/Visitor.js';
import { allocateComponentIds, nameElement, pathSuffix } from '@testable-ui/core';
import type { ElementSignals, NamingOptions, TestIdEntry } from '@testable-ui/core';

import {
  attrStringValue,
  elementText,
  elementTypeOf,
  handlerNameOf,
  hasAttr,
  inputTypeOf,
  isTag,
} from './signals.js';
import type { TransformSourceOptions } from './transform.js';

const ZERO_SPAN: Span = { start: 0, end: 0, ctxt: 0 };

/** A JSX element awaiting ordinal allocation + injection. */
interface PendingElement {
  element: JSXElement;
  base: string;
  componentName: string;
}

/** File basename without extension: `src/checkout/CheckoutForm.tsx` -> `CheckoutForm`. */
function fileNameOf(relativePath: string): string {
  const base = relativePath.split('/').at(-1) ?? relativePath;
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

/** Build a JSXAttribute node for injection. */
function makeAttr(name: string, value: string): JSXAttribute {
  return {
    type: 'JSXAttribute',
    name: { type: 'Identifier', value: name, optional: false, span: ZERO_SPAN },
    value: { type: 'StringLiteral', value, span: ZERO_SPAN },
    span: ZERO_SPAN,
  };
}

/** Add/merge the attribute onto an opening element (never duplicates). */
function injectAttr(opening: JSXOpeningElement, name: string, value: string): void {
  opening.attributes = opening.attributes.filter(
    (a) => !(a.type === 'JSXAttribute' && a.name.type === 'Identifier' && a.name.value === name),
  );
  opening.attributes.push(makeAttr(name, value));
}

export class TestableUiVisitor extends Visitor {
  /** Manifest entries for this file, in source order. */
  readonly entries: TestIdEntry[] = [];

  private readonly componentStack: string[] = [];
  private currentLabel: string | undefined;
  private labelMap = new Map<string, string>();
  private readonly pendingElements: PendingElement[] = [];
  private readonly namingOptions: NamingOptions;
  private readonly fileName: string;
  private readonly relativePath: string;
  private readonly attributeName: string;

  constructor(options: TransformSourceOptions) {
    super();
    this.relativePath = options.relativePath;
    this.fileName = fileNameOf(options.relativePath);
    this.attributeName = options.attributeName;
    this.namingOptions = {
      algorithmVersion: options.algorithmVersion,
      maxIdLength: options.maxIdLength,
      attributeName: options.attributeName,
      includeInProduction: true,
    };
  }

  override visitProgram(program: Program): Program {
    const result = super.visitProgram(program);
    this.finalize();
    return result;
  }

  override visitFunctionDeclaration(decl: FunctionDeclaration): Declaration {
    this.componentStack.push(decl.identifier.value);
    const result = super.visitFunctionDeclaration(decl);
    this.componentStack.pop();
    return result;
  }

  override visitClassDeclaration(decl: ClassDeclaration): Declaration {
    this.componentStack.push(decl.identifier.value);
    const result = super.visitClassDeclaration(decl);
    this.componentStack.pop();
    return result;
  }

  override visitVariableDeclarator(decl: VariableDeclarator): VariableDeclarator {
    const init = decl.init;
    const isComponentFn =
      init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression';
    const name = isComponentFn && decl.id.type === 'Identifier' ? decl.id.value : undefined;
    if (name) {
      this.componentStack.push(name);
      const result = super.visitVariableDeclarator(decl);
      this.componentStack.pop();
      return result;
    }
    return super.visitVariableDeclarator(decl);
  }

  /**
   * Base Visitor throws "not implemented" on every TsType; plugin catch then
   * silently skips the whole file. Types hold no JSX, so stop descent here.
   */
  override visitTsType(type: TsType): TsType {
    return type;
  }

  override visitJSXElement(element: JSXElement): JSXElement {
    const isLabel = isTag(element, 'label');
    const prevLabel = this.currentLabel;
    const prevLabelMap = this.labelMap;

    // Process this element against the OUTER label context (a wrapping label
    // from an ancestor, or sibling labels via htmlFor/id).
    this.processElement(element);

    // Establish label context for children: a wrapping <label> contributes its
    // own text; sibling <label htmlFor="..."> entries are indexed by id.
    if (isLabel) {
      this.currentLabel = elementText(element.children);
    }
    const nextLabelMap = new Map(prevLabelMap);
    for (const child of element.children) {
      if (child.type === 'JSXElement' && isTag(child, 'label')) {
        const htmlFor = attrStringValue(child.opening.attributes, 'htmlFor');
        if (htmlFor) {
          const text = elementText(child.children);
          if (text) nextLabelMap.set(htmlFor, text);
        }
      }
    }
    this.labelMap = nextLabelMap;

    const result = super.visitJSXElement(element);

    this.currentLabel = prevLabel;
    this.labelMap = prevLabelMap;
    return result;
  }

  private processElement(element: JSXElement): void {
    const componentName = this.componentStack.at(-1) ?? this.fileName;
    const elementType = elementTypeOf(element.opening.name);
    const attrs = element.opening.attributes;

    // Any pre-existing attribute with the configured name is preserved
    // untouched. Idempotency: an attribute injected by a previous run has a
    // suffixed value that never equals the computed base, so it is treated
    // exactly like an explicit user id — never overwritten, never duplicated.
    if (hasAttr(attrs, this.attributeName)) return;

    const idAttr = attrStringValue(attrs, 'id');
    const signals: ElementSignals = {
      componentName,
      elementType,
      fileName: this.fileName,
      ariaLabelledby: attrStringValue(attrs, 'aria-labelledby'),
      ariaLabel: attrStringValue(attrs, 'aria-label'),
      title: attrStringValue(attrs, 'title'),
      placeholder: attrStringValue(attrs, 'placeholder'),
      inputType: inputTypeOf(attrs),
      handlerName: handlerNameOf(attrs),
      text: elementText(element.children),
      label: this.currentLabel ?? (idAttr ? this.labelMap.get(idAttr) : undefined),
    };

    const base = nameElement(signals, this.namingOptions).id;
    this.pendingElements.push({ element, base, componentName });
  }

  /**
   * Uniqueness pipeline (per file):
   *   1. nameElement per element (source order) — done in processElement
   *   2. skip preservedExplicit — done in processElement
   *   3. allocateComponentIds per component block (ordinal `-2`, `-3` for
   *      identical computed ids within the same component)
   *   4. append pathSuffix(relativePath) to every final id
   */
  private finalize(): void {
    const groups = new Map<string, PendingElement[]>();
    for (const pending of this.pendingElements) {
      const group = groups.get(pending.componentName);
      if (group) group.push(pending);
      else groups.set(pending.componentName, [pending]);
    }

    const finalIds = new Map<PendingElement, string>();
    for (const [component, list] of groups) {
      const allocated = allocateComponentIds(list.map((p) => p.base));
      for (let i = 0; i < list.length; i++) {
        const pending = list[i]!;
        finalIds.set(pending, `${allocated[i]}-${pathSuffix(this.relativePath)}`);
      }
    }

    for (const pending of this.pendingElements) {
      const finalId = finalIds.get(pending)!;
      injectAttr(pending.element.opening, this.attributeName, finalId);
      this.entries.push({
        id: finalId,
        file: this.relativePath,
        component: pending.componentName,
      });
    }
  }
}