import { CodeBlock } from './components/CodeBlock';
import { DemoPanel } from './components/DemoPanel';
import { IdAnatomy } from './components/IdAnatomy';
import { Section } from './components/Section';
import { SignalLadder } from './components/SignalLadder';

const QUICKSTART = `// vite.config.ts
import { defineConfig } from 'vite';
import { testableUiVite } from '@testable-ui/vite';

export default defineConfig({
  plugins: [
    testableUiVite({ registryFile: 'test-ids.generated.ts' }),
  ],
});`;

const HERO_JSX = `const CheckoutForm = () => (
  <form onSubmit={handleSubmit}>
    <label htmlFor="email">Email address</label>
    <input id="email" type="email" />
    <button type="submit">Place order</button>
  </form>
);`;

/** Real engine output for HERO_JSX at src/CheckoutForm.tsx (suffix 3c2bb2c2dce9). */
const HERO_IDS = [
  'checkout-form-email-address-input-3c2bb2c2dce9',
  'checkout-form-place-order-button-3c2bb2c2dce9',
];

const REPO_URL = 'https://github.com/aleo-it/testable-ui';

export function App() {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="#top">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path
                  d="M4 10.5 8 14.5 16 5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="brand-name">testable-ui</span>
          </a>
          <nav className="site-nav" aria-label="Primary">
            <a href="#problem">Problem</a>
            <a href="#how">How it works</a>
            <a href="#demo">Demo</a>
            <a href="#ladder">Ladder</a>
            <a href="#quickstart">Quickstart</a>
          </nav>
          <a
            className="gh-link"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Build-time data-testid generation for React</p>
            <h1>testable-ui</h1>
            <p className="hero-tagline">
              Deterministic, semantic <code>data-testid</code>s for React —
              generated from your JSX, stable across refactors.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="#demo">
                Try the live demo
              </a>
              <a className="btn btn-ghost" href="#quickstart">
                Read the quickstart
              </a>
            </div>
          </div>
          <div className="hero-sample" aria-hidden="true">
            <div className="hero-sample-block">
              <span className="hero-sample-label">source</span>
              <pre>
                <code>{HERO_JSX}</code>
              </pre>
            </div>
            <div className="hero-sample-arrow" aria-hidden="true">
              ↓
            </div>
            <div className="hero-sample-block">
              <span className="hero-sample-label">emitted</span>
              <div className="hero-sample-ids">
                {HERO_IDS.map((id) => (
                  <code key={id} className="hero-sample-id">
                    {id}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Section
          id="problem"
          eyebrow="The problem"
          title="Hand-written test ids don't survive contact with a refactor"
          lead="Tests should pin behavior, not markup. Hand-authored ids and selector hacks couple your suite to implementation details that change for reasons unrelated to what you're testing."
        >
          <div className="card-grid">
            <article className="card">
              <h3>Brittle hand-written ids</h3>
              <p>
                <code>data-testid="submit-btn"</code> is duplicated across
                files, drifts when someone renames it in one of three places,
                and silently breaks the test that depended on it. Nothing
                verifies the id matches the element it names.
              </p>
            </article>
            <article className="card">
              <h3>Selector coupling</h3>
              <p>
                <code>getByText</code> and CSS selectors reach into
                presentation. A class rename, a wrapping <code>&lt;span&gt;</code>,
                or a copy change breaks the query even though the UI is
                identical.
              </p>
            </article>
            <article className="card">
              <h3>Ids that move with the markup</h3>
              <p>
                Line-number and content-hash ids change on every edit. A
                one-line change above an element rewrites its id, so tests fail
                for reasons unrelated to behavior.
              </p>
            </article>
          </div>
        </Section>

        <Section
          id="how"
          eyebrow="How it works"
          title="Three properties, one naming algorithm"
          lead="Every id is a pure function of the element's signals and its file path — nothing else."
        >
          <div className="pillars">
            <article className="pillar">
              <span className="pillar-num">01</span>
              <h3>Semantic</h3>
              <p>
                Ids follow the HTML AccName ladder —{' '}
                <code>aria-labelledby</code> → <code>aria-label</code> →{' '}
                <code>label</code> → <code>title</code> → text →{' '}
                <code>inputType</code> → <code>placeholder</code> → handler
                name, gated by element role. The id reads like the element's
                accessible name, so{' '}
                <code>getByTestId('checkout-email-input')</code> is
                self-documenting.
              </p>
            </article>
            <article className="pillar">
              <span className="pillar-num">02</span>
              <h3>Deterministic</h3>
              <p>
                Same source, same ids on every machine and every build. CI,
                local, and teammates all agree, because the algorithm has no
                randomness, no counters, no timestamps.
              </p>
            </article>
            <article className="pillar">
              <span className="pillar-num">03</span>
              <h3>Refactor-stable</h3>
              <p>
                The 12-hex suffix derives from the file path, so moving a file
                changes the suffix — and only the suffix. Code edits above an
                element never change its id. Reordering JSX only shifts
                ordinals on true duplicates.
              </p>
            </article>
          </div>
        </Section>

        <Section
          id="demo"
          eyebrow="Live demo"
          title="Type JSX, watch the ids appear"
          lead="The panel runs the real naming engine in your browser — the same algorithm a build would emit. Edit the snippet or the file path; ids recompute on every keystroke."
        >
          <DemoPanel />
        </Section>

        <Section
          id="ladder"
          eyebrow="Reference"
          title="The signal ladder"
          lead="First match wins, gated by HTML-AAM role. The same ladder the browser uses to compute an accessible name — so your test ids and your accessibility agree."
        >
          <SignalLadder />
        </Section>

        <Section
          id="anatomy"
          eyebrow="Reference"
          title="Anatomy of an id"
          lead="Every id is a semantic base, an optional ordinal for within-component duplicates, and a 12-hex path suffix for global uniqueness."
        >
          <IdAnatomy />
        </Section>

        <Section
          id="quickstart"
          eyebrow="Quickstart"
          title="One plugin, zero code changes"
          lead="Add the Vite plugin, build, and every element in your components gets a stable, semantic test id — plus a typed registry to query them."
        >
          <CodeBlock code={QUICKSTART} title="vite.config.ts" lang="ts" />
          <p className="quickstart-note">
            Build → attributes injected → <code>test-ids.generated.ts</code>{' '}
            emitted. Import <code>tid</code> from it and never type a test id
            string by hand.
          </p>
        </Section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-brand">
            <span className="brand-name">testable-ui</span>
            <p>
              Deterministic, semantic <code>data-testid</code>s for React.
            </p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
              README
            </a>
            <a href="#top">Back to top</a>
          </nav>
          <p className="footer-note">
            Ids are deterministic and framework-agnostic — the naming engine is
            pure TypeScript and runs anywhere.
          </p>
        </div>
      </footer>
    </>
  );
}
