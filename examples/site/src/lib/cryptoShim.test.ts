import { createHash as nodeCreateHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createHash } from './cryptoShim';

/**
 * The demo aliases `node:crypto` to this shim so the real core hashing runs in
 * the browser. If the shim ever diverges from Node, every emitted id diverges:
 * this locks byte-parity.
 */
describe('cryptoShim', () => {
  const vectors = [
    'testable-ui/v1:src/checkout/CheckoutForm.tsx',
    'testable-ui/v1:src/CheckoutForm.tsx',
    'testable-ui/v1:a',
    'testable-ui/v1:',
  ];

  it.each(vectors)('matches node:crypto sha256 hex for %s', (input) => {
    const expected = nodeCreateHash('sha256').update(input).digest('hex');
    const actual = createHash('sha256').update(input).digest('hex');
    expect(actual).toBe(expected);
  });

  it('supports chained updates', () => {
    const expected = nodeCreateHash('sha256').update('foo').update('bar').digest('hex');
    const actual = createHash('sha256').update('foo').update('bar').digest('hex');
    expect(actual).toBe(expected);
  });

  it('rejects non-sha256 algorithms', () => {
    expect(() => createHash('md5')).toThrow(/only sha256/);
  });
});
