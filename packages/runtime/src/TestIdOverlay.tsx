import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Options for {@link TestIdOverlay}.
 */
export interface TestIdOverlayOptions {
  /**
   * Keyboard toggle key (lowercased). Default `'t'`.
   * `Alt+toggleKey` toggles the overlay on/off.
   */
  toggleKey?: string;

  /**
   * Initial visibility. Default `true`.
   */
  visible?: boolean;

  /**
   * Label line shown above the copyable id in the tooltip.
   * Default `'data-testid'`.
   */
  label?: string;
}

const OVERLAY_ATTR = 'data-testable-ui-overlay';
const ACCENT = '#8b5cf6';
const Z_INDEX = 2_147_483_000;

/**
 * Dev-only overlay that visualizes `data-testid` attributes on the page.
 *
 * Hover any element with a `data-testid` to see its id in a floating tooltip.
 * Click the tooltip to copy the id to the clipboard.
 * Press `Alt+T` (configurable) to toggle the overlay on/off.
 *
 * **Dev-only. Do not import in production bundles.**
 */
export function TestIdOverlay(
  options?: TestIdOverlayOptions,
): React.JSX.Element | null {
  const toggleKey = options?.toggleKey ?? 't';
  const label = options?.label ?? 'data-testid';

  // visible is initial-only: Alt+T toggles internal state, not driven by prop
  const [visible, setVisible] = useState(options?.visible ?? true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  const highlightedRef = useRef<Element | null>(null);
  const prevOutlineRef = useRef<string>('');
  const activeRef = useRef<Element | null>(null);

  // ── SSR guard: mount nothing when document is unavailable ──
  if (typeof document === 'undefined') {
    return null;
  }

  // ── Event-delegation + global keyboard handlers ──
  useEffect(() => {
    function clearHighlight() {
      if (highlightedRef.current) {
        (highlightedRef.current as HTMLElement).style.outline =
          prevOutlineRef.current;
        highlightedRef.current = null;
        prevOutlineRef.current = '';
      }
    }

    function handleMouseOver(e: MouseEvent) {
      const target = e.target as Element;
      if (target.closest?.(`[${OVERLAY_ATTR}]`)) return;

      const found = target.closest?.('[data-testid]');
      if (found && !found.closest?.(`[${OVERLAY_ATTR}]`)) {
        const id = found.getAttribute('data-testid');
        if (id) {
          clearHighlight();
          const el = found as HTMLElement;
          prevOutlineRef.current = el.style.outline;
          el.style.outline = `2px dashed ${ACCENT}`;
          highlightedRef.current = found;
          activeRef.current = found;
          setHoveredId(id);
          setPos({ x: e.clientX + 12, y: e.clientY + 12 });
          return;
        }
      }

      // No testid found — clear active hover
      clearHighlight();
      activeRef.current = null;
      setHoveredId(null);
    }

    function handleMouseMove(e: MouseEvent) {
      if (activeRef.current) {
        setPos({ x: e.clientX + 12, y: e.clientY + 12 });
      }
    }

    function handleMouseOut(e: MouseEvent) {
      const active = activeRef.current;
      if (!active) return;
      const related = e.relatedTarget as Element | null;
      // Moving within the same element (to a child) — keep tooltip
      if (related && active.contains(related)) return;
      // Moving to the overlay tooltip — keep tooltip
      if (related?.closest?.(`[${OVERLAY_ATTR}]`)) return;
      clearHighlight();
      activeRef.current = null;
      setHoveredId(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === toggleKey) {
        e.preventDefault();
        setVisible((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        clearHighlight();
        activeRef.current = null;
        setHoveredId(null);
      }
    }

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('keydown', handleKeyDown);
      clearHighlight();
      activeRef.current = null;
      setHoveredId(null);
    };
  }, [toggleKey]);

  // ── Clear highlight when toggled off ──
  useEffect(() => {
    if (!visible && highlightedRef.current) {
      (highlightedRef.current as HTMLElement).style.outline =
        prevOutlineRef.current;
      highlightedRef.current = null;
      prevOutlineRef.current = '';
      activeRef.current = null;
      setHoveredId(null);
    }
  }, [visible]);

  // ── Reset copied indicator after 1.5 s ──
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  // ── Clipboard copy with execCommand fallback (http:// non-localhost) ──
  function copyId(testId: string) {
    void (async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(testId);
        } else {
          execCommandCopy(testId);
        }
      } catch {
        execCommandCopy(testId);
      }
      setCopied(true);
    })();
  }

  const tooltip =
    visible && hoveredId ? (
      <div
        role="tooltip"
        data-testable-ui-overlay
        onClick={() => copyId(hoveredId)}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: Z_INDEX,
          background: '#1a1a2e',
          border: `1px solid ${ACCENT}`,
          borderRadius: 6,
          padding: '6px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          maxWidth: 320,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: '#9ca3af',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 10,
            color: ACCENT,
            fontFamily: 'monospace',
            marginTop: 2,
          }}
        >
          {copied ? 'copied \u2713' : hoveredId}
        </div>
        <div
          style={{
            fontSize: 8,
            color: '#6b7280',
            fontFamily: 'system-ui, sans-serif',
            marginTop: 4,
          }}
        >
          ALT+{toggleKey.toUpperCase()} hide/show
        </div>
      </div>
    ) : null;

  return createPortal(tooltip, document.body);
}

// ── Internal helper — does not leak outside this module ──
function execCommandCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
