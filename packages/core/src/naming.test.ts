import { describe, expect, it } from 'vitest';
import {
  allocateComponentIds,
  componentToToken,
  handlerToToken,
  nameElement,
  pathSuffix,
  roleSignalFor,
  sanitizeToken,
} from './naming.js';
import { DEFAULT_OPTIONS } from './types.js';
import type { ElementSignals } from './types.js';

const opt = DEFAULT_OPTIONS;

function signals(partial: Partial<ElementSignals> & { componentName: string; elementType: string }): ElementSignals {
  return { fileName: 'x', ...partial };
}

describe('sanitizeToken', () => {
  it('kebab-cases camelCase and PascalCase', () => {
    expect(sanitizeToken('SubmitOrder')).toBe('submit-order');
    expect(sanitizeToken('EmailAddress')).toBe('email-address');
  });

  it('strips punctuation and collapses separators', () => {
    expect(sanitizeToken('  Create  New   Order!?')).toBe('create-new-order');
    expect(sanitizeToken('Имя Пользователя')).toBe('');
  });

  it('trims leading/trailing separators', () => {
    expect(sanitizeToken('-hello-')).toBe('hello');
  });
});

describe('componentToToken', () => {
  it('kebab-cases component names', () => {
    expect(componentToToken('CheckoutForm')).toBe('checkout-form');
    expect(componentToToken('ProductCard')).toBe('product-card');
  });
});

describe('handlerToToken', () => {
  it('strips handle/on prefixes', () => {
    expect(handlerToToken('handleSubmit')).toBe('submit');
    expect(handlerToToken('onChange')).toBe('change');
  });

  it('kebab-cases multi-word handlers', () => {
    expect(handlerToToken('handleAddItem')).toBe('add-item');
  });
});

describe('nameElement — schema {component}-{role?}-{elementType}', () => {
  it('uses component + element type with no signal', () => {
    expect(nameElement(signals({ componentName: 'CheckoutForm', elementType: 'button' }), opt).id).toBe(
      'checkout-form-button',
    );
  });

  it('uses label as role signal', () => {
    expect(
      nameElement(signals({ componentName: 'Checkout', elementType: 'input', label: 'Email' }), opt).id,
    ).toBe('checkout-email-input');
  });

  it('uses aria-label as role signal', () => {
    expect(
      nameElement(signals({ componentName: 'Toolbar', elementType: 'button', ariaLabel: 'Search' }), opt).id,
    ).toBe('toolbar-search-button');
  });

  it('uses placeholder when no aria/label', () => {
    expect(
      nameElement(signals({ componentName: 'SearchBar', elementType: 'input', placeholder: 'Find products' }), opt)
        .id,
    ).toBe('search-bar-find-products-input');
  });

  it('label beats placeholder (accname: author signals before hints)', () => {
    expect(
      nameElement(
        signals({ componentName: 'Checkout', elementType: 'input', label: 'Email', placeholder: 'Mail' }),
        opt,
      ).id,
    ).toBe('checkout-email-input');
  });

  it('uses informative input type when no stronger signal', () => {
    expect(
      nameElement(signals({ componentName: 'Login', elementType: 'input', inputType: 'password' }), opt).id,
    ).toBe('login-password-input');
  });

  it('uses text children for buttons', () => {
    expect(
      nameElement(signals({ componentName: 'Cart', elementType: 'button', text: 'Checkout now' }), opt).id,
    ).toBe('cart-checkout-now-button');
  });

  it('uses handlerName as weakest signal', () => {
    expect(
      nameElement(signals({ componentName: 'Modal', elementType: 'button', handlerName: 'handleClose' }), opt).id,
    ).toBe('modal-close-button');
  });

  it('role-priority: ariaLabelledby > ariaLabel > label > text > placeholder', () => {
    const s = signals({
      componentName: 'Form',
      elementType: 'button',
      ariaLabelledby: 'del-label',
      ariaLabel: 'Delete item',
      placeholder: 'ph',
      label: 'Label wins?',
      text: 'Trash',
    });
    expect(nameElement(s, opt).id).toBe('form-del-label-button');
  });

  it('handlerName is weakest signal', () => {
    const s = signals({
      componentName: 'Form',
      elementType: 'button',
      handlerName: 'handleDelete',
      text: 'Delete',
    });
    expect(nameElement(s, opt).id).toBe('form-delete-button');
  });

  it('ariaLabelledby beats ariaLabel', () => {
    const s = signals({
      componentName: 'Form',
      elementType: 'input',
      ariaLabelledby: 'email-label',
      ariaLabel: 'Email field',
    });
    expect(nameElement(s, opt).id).toBe('form-email-label-input');
  });

  it('title beats text for nameFrom:contents elements', () => {
    const s = signals({
      componentName: 'Nav',
      elementType: 'button',
      title: 'Close dialog',
      text: 'X',
    });
    expect(nameElement(s, opt).id).toBe('nav-close-dialog-button');
  });

  it('text is gated — skipped on non-nameFrom:contents elements', () => {
    const s = signals({
      componentName: 'Form',
      elementType: 'input',
      text: 'sometext',
      placeholder: 'Email',
    });
    expect(nameElement(s, opt).id).toBe('form-email-input');
  });

  it('placeholder is gated — skipped on non-form-control elements', () => {
    const s = signals({
      componentName: 'Nav',
      elementType: 'button',
      placeholder: 'Click me',
      text: 'Submit',
    });
    expect(nameElement(s, opt).id).toBe('nav-submit-button');
  });
});

describe('roleSignalFor — explains which ladder signal won', () => {
  it('returns the winning signal key (not the token)', () => {
    const s = signals({
      componentName: 'Form',
      elementType: 'button',
      ariaLabel: 'Delete item',
      text: 'Trash',
    });
    expect(roleSignalFor(s)).toBe('ariaLabel');
  });

  it('follows the full ladder', () => {
    const all = signals({
      componentName: 'F',
      elementType: 'button',
      ariaLabelledby: 'a',
      ariaLabel: 'b',
      label: 'c',
      title: 'd',
      text: 'e',
      inputType: 'f', // gated off for button
      placeholder: 'g', // gated off for button
      handlerName: 'h',
    });
    expect(roleSignalFor(all)).toBe('ariaLabelledby');
  });

  it('reflects gating: text is not a signal for form controls', () => {
    const s = signals({ componentName: 'F', elementType: 'input', text: 'nope', placeholder: 'Email' });
    expect(roleSignalFor(s)).toBe('placeholder');
  });

  it('returns undefined when no signal is usable', () => {
    const s = signals({ componentName: 'F', elementType: 'div' });
    expect(roleSignalFor(s)).toBeUndefined();
  });
});

describe('nameElement — determinism and safety', () => {
  it('is idempotent: identical signals -> identical ids', () => {
    const s = signals({ componentName: 'Auth', elementType: 'input', label: 'Password' });
    expect(nameElement(s, opt).id).toBe(nameElement(s, opt).id);
  });

  it('truncates oversized ids but keeps both ends', () => {
    const long = 'A'.repeat(60);
    const optSmall = { ...opt, maxIdLength: 24 };
    const id = nameElement(signals({ componentName: long, elementType: 'button' }), optSmall).id;
    expect(id.length).toBeLessThanOrEqual(24);
    expect(id.endsWith('button')).toBe(true);
  });
});

describe('pathSuffix — global uniqueness', () => {
  it('is deterministic for the same relative path', () => {
    expect(pathSuffix('src/checkout/CheckoutForm.tsx')).toBe(pathSuffix('src/checkout/CheckoutForm.tsx'));
  });

  it('differs across files', () => {
    expect(pathSuffix('src/checkout/CheckoutForm.tsx')).not.toBe(pathSuffix('src/auth/SignupForm.tsx'));
  });

  it('respects the configured length', () => {
    expect(pathSuffix('src/a.ts', 8)).toHaveLength(8);
  });

  it('defaults to 12 hex chars (2^48 collision space)', () => {
    expect(pathSuffix('src/a.ts')).toHaveLength(12);
  });

  it('golden replay: pins exact bytes for a known path (CI regression guard)', () => {
    expect(pathSuffix('src/CheckoutForm.tsx')).toBe('3c2bb2c2dce9');
  });

  it('namespaces the hash — sha256 over "testable-ui/v1:" + canonical path', () => {
    // Path normalization must not change the hash input.
    expect(pathSuffix('src/checkout/CheckoutForm.tsx')).toBe(pathSuffix('src/checkout/CheckoutForm.tsx'));
    expect(pathSuffix('./src/a/../b.ts')).toBe(pathSuffix('src/b.ts'));
    expect(pathSuffix('src\\win\\b.ts')).toBe(pathSuffix('src/win/b.ts'));
  });
});

describe('allocateComponentIds — within-component collision resolution', () => {
  it('leaves unique ids untouched, suffixes duplicates with ordinals', () => {
    const ids = ['checkout-div', 'checkout-email-input', 'checkout-div', 'checkout-div'];
    expect(allocateComponentIds(ids)).toEqual([
      'checkout-div',
      'checkout-email-input',
      'checkout-div-2',
      'checkout-div-3',
    ]);
  });
});