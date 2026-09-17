// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { sanitizeSuffix, useTestId } from './index.js';

afterEach(() => {
  cleanup();
});

describe('useTestId', () => {
  it('renders baseId-key when a key option is provided', () => {
    function Row() {
      return <div data-testid={useTestId('order-row', { key: 3 })} />;
    }
    const { getByTestId } = render(<Row />);
    expect(getByTestId('order-row-3').getAttribute('data-testid')).toBe('order-row-3');
  });

  it('produces different ids for the same baseId with different keys', () => {
    function Row({ k }: { k: number }) {
      return <div data-testid={useTestId('order-row', { key: k })} />;
    }
    const { getByTestId } = render(
      <>
        <Row k={1} />
        <Row k={2} />
      </>,
    );
    expect(getByTestId('order-row-1').getAttribute('data-testid')).toBe('order-row-1');
    expect(getByTestId('order-row-2').getAttribute('data-testid')).toBe('order-row-2');
  });

  it('falls back to a unique useId-based suffix when no key is provided', () => {
    function Row() {
      return <div data-testid={useTestId('order-row')} />;
    }
    const { getAllByTestId } = render(
      <>
        <Row />
        <Row />
      </>,
    );
    const ids = getAllByTestId(/^order-row-/).map((el) => el.getAttribute('data-testid'));
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(id).toMatch(/^order-row-/);
    }
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('is stable across rerenders for the same component and key', () => {
    function Row({ k }: { k: number }) {
      return <div data-testid={useTestId('order-row', { key: k })} />;
    }
    const { rerender, getByTestId } = render(<Row k={7} />);
    const first = getByTestId('order-row-7').getAttribute('data-testid');
    rerender(<Row k={7} />);
    const second = getByTestId('order-row-7').getAttribute('data-testid');
    expect(first).toBe('order-row-7');
    expect(second).toBe(first);
  });

  it('is SSR-safe: uses useId and never references window or document', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/runtime/src/index.ts'), 'utf8');
    expect(source).toContain('useId');
    expect(source).not.toMatch(/\bwindow\b/);
    expect(source).not.toMatch(/\bdocument\b/);
  });
});

describe('sanitizeSuffix', () => {
  it('replaces unsafe characters with separators and trims', () => {
    expect(sanitizeSuffix('user 3!')).toBe('user-3');
    expect(sanitizeSuffix(':r1:')).toBe('r1');
    expect(sanitizeSuffix(':r1-2:')).toBe('r1-2');
  });

  it('never returns an empty string', () => {
    expect(sanitizeSuffix('@@')).toBe('x');
    expect(sanitizeSuffix('')).toBe('x');
    expect(sanitizeSuffix('---')).toBe('x');
  });
});