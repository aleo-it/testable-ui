import { transformSource } from '@testable-ui/vite';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PATH, DEFAULT_SNIPPET, generateIds } from './demoEngine';

/**
 * The site replaces the swc-based adapter with a browser scanner. These tests
 * assert the scanner + engine produce the SAME ids, in the SAME order, as the
 * real `@testable-ui/vite` transform for representative snippets.
 */
const OPTIONS = {
  attributeName: 'data-testid',
  algorithmVersion: 1 as const,
  maxIdLength: 48,
};

function realIds(source: string, relativePath: string): string[] {
  const result = transformSource(source, {
    ...OPTIONS,
    relativePath,
    filename: relativePath,
  });
  return result.entries.map((e) => e.id);
}

function demoIds(source: string, relativePath: string): string[] {
  return generateIds(source, relativePath).elements.filter((e) => !e.preserved).map((e) => e.finalId);
}

const CASES: { name: string; source: string; path: string }[] = [
  { name: 'default snippet', source: DEFAULT_SNIPPET, path: DEFAULT_PATH },
  {
    name: 'aria-label beats text; title fallback on non-content element',
    source: `const C = () => (
      <div>
        <a href="/help" aria-label="Open help">Need help?</a>
        <span title="Total">42.00</span>
      </div>
    );`,
    path: 'src/C.tsx',
  },
  {
    name: 'member expression + namespaced tag',
    source: `const C = () => (<Card.Header>Title</Card.Header>);`,
    path: 'src/C.tsx',
  },
  {
    name: 'duplicate signals allocate ordinals',
    source: `const C = () => (<form><input type="text" /><input type="text" /></form>);`,
    path: 'src/C.tsx',
  },
  {
    name: 'explicit testid preserved',
    source: `const C = () => (<button data-testid="keep-me">Go</button>);`,
    path: 'src/C.tsx',
  },
  {
    name: 'wrapping label + htmlFor label',
    source: `const C = () => (
      <form>
        <label htmlFor="n">Name</label>
        <input id="n" />
        <label>Age <input type="number" /></label>
      </form>
    );`,
    path: 'src/deep/C.tsx',
  },
  {
    name: 'handler, placeholder gating, input type',
    source: `const C = () => (
      <div>
        <input placeholder="hint" />
        <textarea placeholder="notes" />
        <button onClick={handleSave} />
      </div>
    );`,
    path: 'src/C.tsx',
  },
];

describe('demoEngine parity with @testable-ui/vite', () => {
  it.each(CASES)('$name', ({ source, path }) => {
    expect(demoIds(source, path)).toEqual(realIds(source, path));
  });

  it('pins the golden path suffix', () => {
    const result = generateIds(DEFAULT_SNIPPET, 'src/CheckoutForm.tsx');
    expect(result.suffix).toBe('3c2bb2c2dce9');
  });

  it('explains the winning signal per element', () => {
    const result = generateIds(DEFAULT_SNIPPET, DEFAULT_PATH);
    const byType = new Map(result.elements.map((e) => [`${e.elementType}:${e.finalId}`, e]));
    // Password input gets its label via the wrapping <label>.
    const password = result.elements.find((e) => e.signals.inputType === 'password');
    expect(password?.roleSignal).toBe('label');
    expect(password?.roleToken).toBe('password');
    expect(byType.size).toBe(result.elements.length);
  });
});

describe('aria signals parity (in-browser scanner vs real swc transform)', () => {
  const ariaCases = [
    {
      name: 'aria-label wins (top of ladder)',
      source: `const Dialog = () => (
  <button aria-label="Close dialog" onClick={close} aria-hidden="true">
    <span>&times;</span>
  </button>
);`,
    },
    {
      name: 'aria-labelledby beats label text',
      source: `const Dialog = () => (
  <div>
    <h3 id="dlg-title">Delete item</h3>
    <button aria-labelledby="dlg-title" onClick={go}>Confirm</button>
  </div>
);`,
    },
    {
      name: 'aria wins over handler + text on gated element',
      source: `const Card = () => (
  <section aria-label="Billing summary">
    <button onClick={handleEdit} aria-label="Edit shipping">Change</button>
  </section>
);`,
    },
  ];

  for (const { name, source } of ariaCases) {
    it(name, () => {
      const path = 'src/aria/Aria.tsx';
      expect(demoIds(source, path)).toEqual(realIds(source, path));
    });
  }
});
