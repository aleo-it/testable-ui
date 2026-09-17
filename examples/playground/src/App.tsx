import { useState, useEffect, useCallback } from 'react';
import { useTestId, TestIdOverlay } from '@testable-ui/runtime';
import { tid } from '../test-ids.generated.js';

/* ─── data ─────────────────────────────────────────────────────────────────── */

const orders = [
  { id: '1', name: 'Widget' },
  { id: '2', name: 'Gadget' },
  { id: '3', name: 'Doohickey' },
  { id: '4', name: 'Thingamajig' },
  { id: '5', name: 'Whatchamacallit' },
];

/* ─── styles ───────────────────────────────────────────────────────────────── */

const CSS = `
:root {
  --bg: #09090b;
  --surface: #18181b;
  --surface-2: #27272a;
  --border: #3f3f46;
  --text: #fafafa;
  --text-2: #a1a1aa;
  --text-3: #71717a;
  --accent: #a78bfa;
  --accent-dim: #7c3aed;
  --green: #34d399;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono',
    Menlo, Consolas, 'Liberation Mono', monospace;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  background: var(--bg);
  background-image: radial-gradient(
    circle at 1px 1px,
    rgba(255, 255, 255, 0.025) 1px,
    transparent 0
  );
  background-size: 32px 32px;
}

#root {
  min-height: 100vh;
}

/* ── layout ────────────────────────────────────────────────────────────────── */

.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 3rem 1.5rem 7rem;
  position: relative;
}

.gradient-top {
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--accent) 20%,
    #e879f9 50%,
    var(--accent) 80%,
    transparent 100%
  );
  margin: -3rem -1.5rem 3rem;
}

/* ── hero ──────────────────────────────────────────────────────────────────── */

.hero {
  text-align: center;
  padding: 3rem 0 2.5rem;
  position: relative;
}

.hero::before {
  content: '';
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 640px;
  height: 380px;
  background: radial-gradient(
    ellipse,
    rgba(139, 92, 246, 0.1) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.hero-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent);
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 9999px;
  padding: 0.25rem 0.875rem;
  margin-bottom: 1.25rem;
}

.hero h1 {
  font-size: 3.25rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--text) 40%, var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.75rem;
  line-height: 1.1;
}

.hero .subtitle {
  font-size: 1.0625rem;
  color: var(--text-2);
  max-width: 520px;
  margin: 0 auto 1.5rem;
  line-height: 1.55;
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.pill {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
  color: var(--text-3);
  background: var(--surface);
  letter-spacing: 0.01em;
}

/* ── sections ──────────────────────────────────────────────────────────────── */

.section {
  margin-top: 2.5rem;
}

.section h2 {
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 0.375rem;
}

.section-desc {
  color: var(--text-3);
  font-size: 0.8125rem;
  margin-bottom: 1.25rem;
  line-height: 1.55;
}

.section-desc code {
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 0.75rem;
  background: rgba(139, 92, 246, 0.08);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

/* ── signal cards ──────────────────────────────────────────────────────────── */

.signal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  transition: border-color 0.15s ease;
}

.signal-card:hover {
  border-color: rgba(139, 92, 246, 0.35);
}

.signal-ui {
  flex: 1;
  min-width: 0;
}

.signal-label {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--text-3);
  margin-bottom: 0.5rem;
  letter-spacing: 0.02em;
}

/* ── form elements inside signal cards ─────────────────────────────────────── */

.signal-card button:not(.id-chip) {
  background: var(--accent-dim);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  font-family: var(--font-sans);
}

.signal-card button:not(.id-chip):hover {
  background: var(--accent);
}

.signal-card input {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.625rem;
  color: var(--text);
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 0.15s;
}

.signal-card input:focus {
  border-color: var(--accent);
}

.signal-card input::placeholder {
  color: var(--text-3);
}

.signal-card input[type='password'] {
  width: 130px;
  margin-left: 0.5rem;
}

.signal-card input[id='username'] {
  width: 130px;
  margin-left: 0.5rem;
}

.signal-card label {
  font-size: 0.8125rem;
  color: var(--text-2);
}

.signal-card label:has(input) {
  display: inline-flex;
  align-items: center;
}

.signal-card div[aria-label] {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

/* ── id chips ──────────────────────────────────────────────────────────────── */

.id-chip {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.625rem;
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.id-chip:hover {
  border-color: var(--accent);
  background: rgba(139, 92, 246, 0.06);
}

.copy-hint {
  font-size: 0.5625rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  opacity: 0;
  transition: opacity 0.15s;
}

.id-chip:hover .copy-hint {
  opacity: 1;
}

.copy-hint.copied {
  color: var(--green);
  opacity: 1;
}

/* ── order list ────────────────────────────────────────────────────────────── */

.orders-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.order-list {
  list-style: none;
}

.order-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.8125rem;
}

.order-row:last-child {
  border-bottom: none;
}

.order-num {
  font-family: var(--font-mono);
  color: var(--text-3);
  font-size: 0.75rem;
  min-width: 1.75rem;
}

.order-name {
  color: var(--text);
  flex: 1;
}

.order-id-chip {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--accent);
  background: var(--surface-2);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border);
}

/* ── code block ────────────────────────────────────────────────────────────── */

.code-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.8;
  color: var(--text-2);
  overflow-x: auto;
  white-space: pre;
}

.code-block .kw {
  color: #c084fc;
}

.code-block .str {
  color: var(--green);
}

.code-block .fn {
  color: #e879f9;
}

.code-block .cm {
  color: var(--text-3);
  font-style: italic;
}

/* ── preserved ─────────────────────────────────────────────────────────────── */

.preserved-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}

.preserved-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  background: rgba(34, 197, 94, 0.08);
  color: var(--green);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 6px;
  padding: 0.25rem 0.625rem;
}

.preserved-code {
  margin-top: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--text-3);
}

/* ── overlay footer ────────────────────────────────────────────────────────── */

.overlay-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(24, 24, 27, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  padding: 0.625rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  z-index: 1000;
}

.overlay-toggle {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--text-2);
  user-select: none;
}

.overlay-toggle input {
  display: none;
}

.toggle-track {
  position: relative;
  width: 34px;
  height: 18px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 9px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: var(--text-3);
  border-radius: 50%;
  transition: all 0.2s;
}

.overlay-toggle input:checked + .toggle-track {
  background: var(--accent-dim);
  border-color: var(--accent);
}

.overlay-toggle input:checked + .toggle-track::after {
  transform: translateX(16px);
  background: white;
}

.kbd {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.125rem 0.375rem;
  color: var(--text-3);
}

.overlay-hint {
  font-size: 0.75rem;
  color: var(--accent);
  font-style: italic;
  margin-left: 0.25rem;
}

/* ── responsive ────────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  .hero h1 {
    font-size: 2.25rem;
  }

  .hero .subtitle {
    font-size: 0.9375rem;
  }

  .signal-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .id-chip {
    align-self: flex-end;
  }

  .order-id-chip {
    display: none;
  }

  .page {
    padding: 2rem 1rem 7rem;
  }

  .gradient-top {
    margin: -2rem -1rem 2rem;
  }

  .code-block {
    font-size: 0.75rem;
    padding: 1rem;
  }
}
`;

/* ─── app ──────────────────────────────────────────────────────────────────── */

export function App() {
  const [overlayOn, setOverlayOn] = useState(false);
  const [copied, setCopied] = useState('');

  // Alt+T keyboard toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setOverlayOn((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const copyId = useCallback((id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(''), 1200);
  }, []);

  /* tiny inline component — has closure over copyId + copied */
  const Chip = ({ id }) => (
    <button className="id-chip" onClick={() => copyId(id)} title="Click to copy">
      <span>{id}</span>
      <span className={`copy-hint${copied === id ? ' copied' : ''}`}>
        {copied === id ? 'copied!' : 'copy'}
      </span>
    </button>
  );

  return (
    <>
      <style>{CSS}</style>

      {overlayOn && <TestIdOverlay visible />}

      <div className="page">
        <div className="gradient-top" />

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-badge">playground</div>
          <h1>testable-ui</h1>
          <p className="subtitle">
            Deterministic semantic data-testids, injected at build time.
          </p>
          <div className="pills">
            <span className="pill">deterministic</span>
            <span className="pill">build-time</span>
            <span className="pill">runtime-unique</span>
            <span className="pill">typed registry</span>
          </div>
        </section>

        {/* ── Signal Ladder ────────────────────────────────────────── */}
        <section className="section">
          <h2>Signal Paths</h2>
          <p className="section-desc">
            Each fixture renders a live element alongside its auto-generated{' '}
            <code>data-testid</code>. Click any chip to copy.
          </p>

          {/* (a) button text */}
          <div className="signal-card">
            <div className="signal-ui">
              <div className="signal-label">(a) button text</div>
              <button>Submit</button>
            </div>
            <Chip id={tid('app-submit-button-26ad4b')} />
          </div>

          {/* (b) placeholder input */}
          <div className="signal-card">
            <div className="signal-ui">
              <div className="signal-label">(b) placeholder input</div>
              <input placeholder="Email address" />
            </div>
            <Chip id={tid('app-email-address-input-26ad4b')} />
          </div>

          {/* (c) wrapping label */}
          <div className="signal-card">
            <div className="signal-ui">
              <div className="signal-label">(c) wrapping label</div>
              <label>Password <input type="password" /></label>
            </div>
            <Chip id={tid('app-password-input-26ad4b')} />
          </div>

          {/* (d) sibling htmlFor label */}
          <div className="signal-card">
            <div className="signal-ui">
              <div className="signal-label">(d) sibling htmlFor label</div>
              <label htmlFor="username">Username</label>
              <input id="username" />
            </div>
            <Chip id={tid('app-username-input-26ad4b')} />
          </div>

          {/* (e) aria-label */}
          <div className="signal-card">
            <div className="signal-ui">
              <div className="signal-label">(e) aria-label</div>
              <div aria-label="Cart count" />
            </div>
            <Chip id={tid('app-cart-count-div-26ad4b')} />
          </div>
        </section>

        {/* ── Runtime Uniqueness ───────────────────────────────────── */}
        <section className="section">
          <h2>Runtime Uniqueness</h2>
          <p className="section-desc">
            <code>useTestId(&apos;order-row&apos;, &#123; key &#125;)</code>{' '}
            generates a unique, deterministic id per row — hydration-safe and
            reorder-stable.
          </p>
          <div className="orders-card">
            <ul className="order-list">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="order-row"
                  data-testid={useTestId('order-row', { key: order.id })}
                >
                  <span className="order-num">#{order.id}</span>
                  <span className="order-name">{order.name}</span>
                  <span className="order-id-chip">
                    order-row-{order.id}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Registry Proof ───────────────────────────────────────── */}
        <section className="section">
          <h2>Typed Registry</h2>
          <p className="section-desc">
            <code>tid()</code> is typed against the generated registry — rename
            an id and it&apos;s a compile error.
          </p>
          <div className="code-block">
            <span className="kw">import</span>
            {' { '}
            <span className="fn">tid</span>
            {' } '}
            <span className="kw">from</span>{' '}
            <span className="str">&apos;../test-ids.generated.js&apos;</span>
            {'\n\n'}
            <span className="cm">
              {'// resolves to the full generated id at runtime'}
            </span>
            {'\n'}
            <span className="fn">tid</span>(
            <span className="str">
              &apos;app-submit-button-26ad4b&apos;
            </span>
            ){'  →  '}
            <span className="str">&quot;{tid('app-submit-button-26ad4b')}&quot;</span>
          </div>
        </section>

        {/* ── Preserved / Explicit ID ──────────────────────────────── */}
        <section className="section">
          <h2>Preserved ID</h2>
          <p className="section-desc">
            Hand-written <code>data-testid</code> attributes pass through
            untouched — never overwritten by the plugin.
          </p>
          <div className="preserved-card">
            <div className="preserved-badge">
              <span>✓</span> preserved
            </div>
            <div data-testid="user-kept-id" className="preserved-code">
              data-testid=&quot;user-kept-id&quot;
            </div>
          </div>
        </section>
      </div>

      {/* ── Overlay Toggle (fixed footer) ──────────────────────────── */}
      <footer className="overlay-bar">
        <label className="overlay-toggle">
          <input
            type="checkbox"
            checked={overlayOn}
            onChange={() => setOverlayOn((p) => !p)}
          />
          <span className="toggle-track" />
          Show ids on hover
        </label>
        <span className="kbd">Alt+T</span>
        {overlayOn && (
          <span className="overlay-hint">hover any element</span>
        )}
      </footer>
    </>
  );
}