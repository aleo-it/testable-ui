// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { TestIdOverlay, useTestId } from './index.js';

afterEach(() => {
  cleanup();
});

describe('TestIdOverlay', () => {
  it('renders nothing visible in a plain render', () => {
    render(<TestIdOverlay />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows tooltip with the test id on mouseover', () => {
    render(
      <>
        <TestIdOverlay />
        <div data-testid="my-element">Hello</div>
      </>,
    );
    fireEvent.mouseOver(screen.getByTestId('my-element'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('my-element');
  });

  it('copies the test id to the clipboard on tooltip click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    try {
      render(
        <>
          <TestIdOverlay />
          <div data-testid="copy-me">Click me</div>
        </>,
      );
      fireEvent.mouseOver(screen.getByTestId('copy-me'));
      fireEvent.click(screen.getByRole('tooltip'));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith('copy-me'));
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
      });
    }
  });

  it('toggles overlay visibility with Alt+T', () => {
    render(
      <>
        <TestIdOverlay />
        <div data-testid="toggle-test">Hello</div>
      </>,
    );

    // Initially visible — hover shows tooltip
    fireEvent.mouseOver(screen.getByTestId('toggle-test'));
    expect(screen.getByRole('tooltip')).toBeTruthy();

    // Alt+T hides the overlay
    fireEvent.keyDown(document, { key: 't', altKey: true });
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Alt+T shows it again — hover re-shows tooltip
    fireEvent.keyDown(document, { key: 't', altKey: true });
    fireEvent.mouseOver(screen.getByTestId('toggle-test'));
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  it('Escape clears the tooltip', () => {
    render(
      <>
        <TestIdOverlay />
        <div data-testid="escape-test">Hello</div>
      </>,
    );
    fireEvent.mouseOver(screen.getByTestId('escape-test'));
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows the real rendered id from useTestId', () => {
    function Row() {
      return <div data-testid={useTestId('order-row', { key: 3 })}>Row</div>;
    }
    render(
      <>
        <TestIdOverlay />
        <Row />
      </>,
    );
    fireEvent.mouseOver(screen.getByTestId('order-row-3'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('order-row-3');
  });

  it('unmount removes listeners — no tooltip after unmount', () => {
    const { unmount } = render(
      <>
        <TestIdOverlay />
        <div data-testid="unmount-test">Hello</div>
      </>,
    );
    unmount();

    // Fresh element added after unmount: leaked listeners would show a tooltip
    const fresh = document.createElement('div');
    fresh.setAttribute('data-testid', 'fresh-element');
    document.body.appendChild(fresh);
    fireEvent.mouseOver(fresh);
    expect(screen.queryByRole('tooltip')).toBeNull();
    document.body.removeChild(fresh);
  });
});