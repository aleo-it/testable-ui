import { useRef, useState } from 'react';

interface CopyButtonProps {
  /** Text written to the clipboard on click. */
  text: string;
  /** Accessible name; defaults to `Copy ${text}`. */
  label?: string;
  /** Icon-only variant for dense rows. */
  compact?: boolean;
}

/**
 * Clipboard copy with a transient "Copied" state. Uses the async Clipboard
 * API when available and falls back to a hidden textarea + execCommand for
 * non-secure contexts (e.g. plain-HTTP previews).
 */
export function CopyButton({ text, label, compact = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const flash = (): void => {
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      flash();
      return;
    } catch {
      // Fall through to the legacy path (non-secure contexts).
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      flash();
    } catch {
      // Clipboard unavailable; nothing else to try.
    }
    document.body.removeChild(ta);
  };

  return (
    <button
      type="button"
      className={compact ? 'copy-btn copy-btn--compact' : 'copy-btn'}
      data-copied={copied}
      onClick={copy}
      aria-label={label ?? `Copy ${text}`}
    >
      {copied ? (
        <svg className="copy-btn-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M3.5 8.5 6 11l6.5-6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg className="copy-btn-icon" viewBox="0 0 16 16" aria-hidden="true">
          <rect
            x="5.5"
            y="5.5"
            width="8"
            height="8"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      )}
      {!compact ? <span className="copy-btn-text">{copied ? 'Copied' : 'Copy'}</span> : null}
    </button>
  );
}