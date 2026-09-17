import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { pathSuffix } from '@testable-ui/core';
import { describe, expect, it, vi } from 'vitest';

import { testableUiVite } from './plugin.js';
import { writeRegistryFile } from './registry.js';
import { transformSource } from './transform.js';

const REL = 'src/CheckoutForm.tsx';
const SUFFIX = pathSuffix(REL);

function run(code: string, relativePath = REL): string {
  return transformSource(code, {
    attributeName: 'data-testid',
    algorithmVersion: 1,
    maxIdLength: 48,
    relativePath,
    filename: relativePath,
  }).code;
}

function runEntries(code: string, relativePath = REL) {
  return transformSource(code, {
    attributeName: 'data-testid',
    algorithmVersion: 1,
    maxIdLength: 48,
    relativePath,
    filename: relativePath,
  }).entries;
}

describe('transformSource: signal extraction + id computation', () => {
  it('injects data-testid on a button with text children in the expected format', () => {
    const code = run('const CheckoutForm = () => <button>Submit</button>;');
    expect(code).toContain(`data-testid="checkout-form-submit-button-${SUFFIX}"`);
  });

  it('label wins over placeholder per the accname ladder', () => {
    const code = run('const CheckoutForm = () => <label>Email <input placeholder="Email address" /></label>;');
    expect(code).toContain(`data-testid="checkout-form-email-input-${SUFFIX}"`);
    expect(code).not.toContain(`data-testid="checkout-form-email-address-input-${SUFFIX}"`);
  });

  it('aria-label wins over everything', () => {
    const code = run('const CheckoutForm = () => <input aria-label="Search" placeholder="Type here" />;');
    expect(code).toContain(`data-testid="checkout-form-search-input-${SUFFIX}"`);
    expect(code).not.toContain('type-here');
  });

  it('uses static aria-labelledby text rather than the referenced DOM id', () => {
    const code = run(
      'const CheckoutForm = () => <div><span id="email-label">Email address</span><input aria-labelledby="email-label" /></div>;',
    );
    expect(code).toContain(`data-testid="checkout-form-email-address-input-${SUFFIX}"`);
    expect(code).not.toContain('email-label-input');
  });

  it('uses inputType when no stronger signal exists', () => {
    const code = run('const LoginForm = () => <input type="password" />;', 'src/LoginForm.tsx');
    expect(code).toContain(`data-testid="login-form-password-input-${pathSuffix('src/LoginForm.tsx')}"`);
  });

  it('normalizes case-insensitive HTML input types', () => {
    const code = run('const LoginForm = () => <input type="EMAIL" />;', 'src/LoginForm.tsx');
    expect(code).toContain(`data-testid="login-form-email-input-${pathSuffix('src/LoginForm.tsx')}"`);
  });

  it('ignores non-informative input types', () => {
    const code = run('const LoginForm = () => <input type="text" />;', 'src/LoginForm.tsx');
    expect(code).toContain(`data-testid="login-form-input-${pathSuffix('src/LoginForm.tsx')}"`);
  });

  it('uses a sibling label via htmlFor/id', () => {
    const code = run(
      'const CheckoutForm = () => (<div><label htmlFor="email">Email</label><input id="email" /></div>);',
    );
    expect(code).toContain(`data-testid="checkout-form-email-input-${SUFFIX}"`);
  });

  it('uses a handler name as fallback role', () => {
    const code = run('const CheckoutForm = () => <button onClick={handleSubmit} />;');
    expect(code).toContain(`data-testid="checkout-form-submit-button-${SUFFIX}"`);
  });

  it('uses the last identifier of a JSXMemberExpression tag; header text is gated (not nameFrom:contents)', () => {
    const code = run('const Card = () => <Card.Header>Title</Card.Header>;', 'src/Card.tsx');
    expect(code).toContain(`data-testid="card-header-${pathSuffix('src/Card.tsx')}"`);
  });

  it('honors a custom attributeName', () => {
    const code = transformSource('const CheckoutForm = () => <button>Submit</button>;', {
      attributeName: 'data-test-id',
      algorithmVersion: 1,
      maxIdLength: 48,
      relativePath: REL,
      filename: REL,
    }).code;
    expect(code).toContain(`data-test-id="checkout-form-submit-button-${SUFFIX}"`);
    expect(code).not.toContain('data-testid');
  });

  it('normalizes Vite query parameters before deriving the path suffix', () => {
    const code = transformSource('const CheckoutForm = () => <button>Submit</button>;', {
      attributeName: 'data-testid',
      algorithmVersion: 1,
      maxIdLength: 48,
      relativePath: REL,
      filename: `${REL}?v=123`,
    }).code;
    expect(code).toContain(`data-testid="checkout-form-submit-button-${SUFFIX}"`);
  });

  it('returns an SWC source map for Vite to compose', () => {
    const result = transformSource('const CheckoutForm = () => <button>Submit</button>;', {
      attributeName: 'data-testid',
      algorithmVersion: 1,
      maxIdLength: 48,
      relativePath: REL,
      filename: REL,
    });
    expect(result.map).toContain('CheckoutForm.tsx');
  });
});

describe('transformSource: explicit ids and idempotency', () => {
  it('preserves an explicit data-testid untouched, with no suffix added', () => {
    const code = run('const CheckoutForm = () => <button data-testid="my-custom-id">Submit</button>;');
    expect(code).toContain('data-testid="my-custom-id"');
    expect(code).not.toContain('my-custom-id-');
  });

  it('preserves a dynamic data-testid expression untouched', () => {
    const code = run('const CheckoutForm = () => <button data-testid={someVar}>Submit</button>;');
    expect(code).toContain('data-testid={someVar}');
    expect(code).not.toContain('data-testid="');
  });

  it('appends a -2 ordinal to the second identical element in one component', () => {
    const code = run('const CheckoutForm = () => <div><button>Submit</button><button>Submit</button></div>;');
    expect(code).toContain(`data-testid="checkout-form-submit-button-${SUFFIX}"`);
    expect(code).toContain(`data-testid="checkout-form-submit-button-2-${SUFFIX}"`);
  });

  it('does not append an ordinal to a unique first occurrence', () => {
    const code = run('const CheckoutForm = () => <div><button>Submit</button><button>Cancel</button></div>;');
    expect(code).toContain(`data-testid="checkout-form-submit-button-${SUFFIX}"`);
    expect(code).toContain(`data-testid="checkout-form-cancel-button-${SUFFIX}"`);
    expect(code).not.toContain('checkout-form-submit-button-2-');
  });

  it('is deterministic across two runs of the same source', () => {
    const source = 'const CheckoutForm = () => <div><button>Submit</button><button>Submit</button></div>;';
    expect(run(source)).toBe(run(source));
  });

  it('is idempotent: re-transforming already-transformed output changes nothing', () => {
    const source = 'const CheckoutForm = () => <div><button>Submit</button><button>Submit</button></div>;';
    const once = run(source);
    const twice = run(once);
    expect(twice).toBe(once);
    expect(twice.match(/data-testid=/g)?.length).toBe(3);
  });
});

describe('transformSource: typed sources do not throw nor skip', () => {
  // Regression: the base SWC Visitor throws "Method visitTsType not
  // implemented" on any TsType node, and the plugin's catch then silently
  // drops the WHOLE file — leaving zero ids in typed components. The walker
  // must pass type nodes through untouched.
  it('handles useState with a type argument', () => {
    const code = run(
      'import { useState } from "react"; const CheckoutForm = () => { const [s, setS] = useState<string | null>(null); return <button>{s}</button>; };',
    );
    expect(code).toContain(`data-testid="checkout-form-button-${SUFFIX}"`);
  });

  it('handles interface declarations and type aliases', () => {
    const code = run(
      'interface Props { a: string } type Other = { b: number }; const CheckoutForm = () => <button>ok</button>;',
    );
    expect(code).toContain(`data-testid="checkout-form-ok-button-${SUFFIX}"`);
  });

  it('handles annotated arrow params and as-casts inside JSX', () => {
    const code = run(
      'const CheckoutForm = () => { const f = (e: KeyboardEvent) => e.key; const v = raw as string; return <button onClick={f}>{v}</button>; };',
    );
    expect(code).toContain('onClick={f}');
    // text {v} is an expression (not JSXText), so handler name f is the role
    expect(code).toContain(`data-testid="checkout-form-f-button-${SUFFIX}"`);
  });

  it('handles generic function components and destructured props', () => {
    const code = run(
      'function CheckoutForm<T extends { id: string }>({ id }: { id: string }) { return <div>{id}</div>; }',
    );
    expect(code).toContain(`data-testid="checkout-form-div-${SUFFIX}"`);
  });
});

describe('registry emission', () => {
  it('writes a registry file with testIds map, TestId type, tid function, and all final ids', () => {
    const dir = mkdtempSync(join(tmpdir(), 'testable-ui-'));
    const registryFile = join(dir, 'test-ids.generated.ts');

    const entries = [
      ...runEntries('const CheckoutForm = () => <button>Submit</button>;'),
      ...runEntries('const LoginForm = () => <input type="password" />;', 'src/LoginForm.tsx'),
    ];
    writeRegistryFile({ algorithmVersion: 1, entries }, registryFile);

    const content = readFileSync(registryFile, 'utf8');
    expect(content).toContain('export const testIds = {');
    expect(content).toContain('export type TestId = keyof typeof testIds;');
    expect(content).toContain('export function tid(id: TestId): string {');
    expect(content).toContain(`checkout-form-submit-button-${SUFFIX}`);
    expect(content).toContain(`login-form-password-input-${pathSuffix('src/LoginForm.tsx')}`);
  });
});

describe('testableUiVite plugin', () => {
  it('returns a pre-enforced plugin with the expected hooks', () => {
    const plugin = testableUiVite();
    expect(plugin.name).toBe('testable-ui:vite');
    expect(plugin.enforce).toBe('pre');
    expect(typeof plugin.transform).toBe('function');
    expect(typeof plugin.buildStart).toBe('function');
    expect(typeof plugin.closeBundle).toBe('function');
  });

  it('skips injection entirely in production when includeInProduction is false', () => {
    const plugin = testableUiVite({ environment: 'production', includeInProduction: false });
    const result = plugin.transform?.('const A = () => <button>Hi</button>;', '/root/src/A.tsx');
    expect(result).toBeNull();
  });

  it('warns when a source file cannot be transformed', () => {
    const warn = vi.fn();
    const plugin = testableUiVite();
    const result = plugin.transform?.call(
      { warn } as never,
      'const = invalid;',
      join(process.cwd(), 'src', 'Broken.tsx'),
    );
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Broken.tsx'));
  });

  it('fails in strict mode when a source file cannot be transformed', () => {
    const plugin = testableUiVite({ strict: true });
    expect(() => plugin.transform?.call(
      { error: (message: string) => { throw new Error(message); } } as never,
      'const = invalid;',
      join(process.cwd(), 'src', 'Broken.tsx'),
    )).toThrow('Broken.tsx');
  });

  it('accumulates entries across transforms and writes the registry on closeBundle', () => {
    const dir = mkdtempSync(join(tmpdir(), 'testable-ui-'));
    const registryFile = join(dir, 'test-ids.generated.ts');
    const plugin = testableUiVite({ registryFile });

    plugin.buildStart?.();
    const id = join(process.cwd(), 'src', 'CheckoutForm.tsx');
    const result = plugin.transform?.('const CheckoutForm = () => <button>Submit</button>;', id);
    expect(result).not.toBeNull();
    plugin.closeBundle?.();

    const content = readFileSync(registryFile, 'utf8');
    expect(content).toContain(`checkout-form-submit-button-${pathSuffix('src/CheckoutForm.tsx')}`);
  });

  it('updates the registry as source files are transformed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'testable-ui-'));
    const registryFile = join(dir, 'test-ids.generated.ts');
    const plugin = testableUiVite({ registryFile });
    const id = join(process.cwd(), 'src', 'CheckoutForm.tsx');

    plugin.buildStart?.();
    plugin.transform?.('const CheckoutForm = () => <button>Submit</button>;', id);
    plugin.transform?.('const CheckoutForm = () => <button>Cancel</button>;', id);

    const content = readFileSync(registryFile, 'utf8');
    expect(content).toContain(`checkout-form-cancel-button-${pathSuffix('src/CheckoutForm.tsx')}`);
    expect(content).not.toContain(`checkout-form-submit-button-${pathSuffix('src/CheckoutForm.tsx')}`);
  });

  it('resets accumulated manifest state on buildStart', () => {
    const dir = mkdtempSync(join(tmpdir(), 'testable-ui-'));
    const registryFile = join(dir, 'test-ids.generated.ts');
    const plugin = testableUiVite({ registryFile });
    const id = join(process.cwd(), 'src', 'CheckoutForm.tsx');

    plugin.buildStart?.();
    plugin.transform?.('const CheckoutForm = () => <button>Submit</button>;', id);
    plugin.buildStart?.(); // second build — must drop the first file's entries
    plugin.closeBundle?.();

    const content = readFileSync(registryFile, 'utf8');
    expect(content).not.toContain('checkout-form-submit-button');
  });
});
