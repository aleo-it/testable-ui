import { useMemo, useState } from 'react';

import { DEFAULT_PATH, DEFAULT_SNIPPET, generateIds } from '../lib/demoEngine';
import type { DemoElement, DemoResult } from '../lib/demoEngine';
import { CopyButton } from './CopyButton';

type RoleSignal = NonNullable<DemoElement['roleSignal']>;

type DemoState = DemoResult | { error: string };

/** Display labels for the engine's RoleSignal keys. */
const SIGNAL_LABELS: Record<RoleSignal, string> = {
  ariaLabelledby: 'aria-labelledby',
  ariaLabel: 'aria-label',
  label: 'label',
  title: 'title',
  text: 'text',
  inputType: 'input type',
  placeholder: 'placeholder',
  handlerName: 'handler',
};

/**
 * Live demo: edit a JSX snippet and a file path, and see the exact ids the
 * naming engine would emit — plus why each one was chosen. Runs the real
 * `generateIds` pipeline synchronously in the browser.
 */
export function DemoPanel() {
  const [source, setSource] = useState(DEFAULT_SNIPPET);
  const [path, setPath] = useState(DEFAULT_PATH);

  const state = useMemo<DemoState>(() => {
    try {
      return generateIds(source, path);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [source, path]);

  const reset = (): void => {
    setSource(DEFAULT_SNIPPET);
    setPath(DEFAULT_PATH);
  };

  return (
    <div className="demo">
      <div className="demo-editor">
        <div className="demo-pane-head">
          <h3 className="demo-pane-title">Editor</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
            Reset
          </button>
        </div>
        <div className="demo-field">
          <label htmlFor="demo-path">File path</label>
          <input
            id="demo-path"
            className="demo-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
        </div>
        <div className="demo-field">
          <label htmlFor="demo-source">JSX snippet</label>
          <textarea
            id="demo-source"
            className="demo-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={14}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="demo-results" aria-live="polite">
        {'elements' in state ? <ResultsPanel result={state} /> : <ErrorPanel message={state.error} />}
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="demo-error">
      <p className="demo-error-title">Couldn't parse that JSX</p>
      <pre className="demo-error-msg">{message}</pre>
      <p className="demo-error-hint">
        Fix the snippet above — ids recompute on every keystroke.
      </p>
    </div>
  );
}

function ResultsPanel({ result }: { result: DemoResult }) {
  const preservedCount = result.elements.filter((e) => e.preserved).length;
  return (
    <div className="results">
      <div className="results-head">
        <div className="results-meta">
          <span className="results-file">{result.fileName}</span>
          <span className="results-moniker">{result.relativePathMoniker}</span>
        </div>
        <span className="suffix-badge" title="Global-uniqueness suffix derived from the file path">
          suffix <code>{result.suffix}</code>
        </span>
      </div>
      <p className="results-count">
        {result.elements.length} element{result.elements.length === 1 ? '' : 's'}
        {preservedCount > 0 ? ` · ${preservedCount} preserved` : ''}
      </p>
      <ul className="results-list">
        {result.elements.map((el) => (
          <ElementRow key={el.index} el={el} />
        ))}
      </ul>
    </div>
  );
}

function ElementRow({ el }: { el: DemoElement }) {
  const signalLabel = el.roleSignal ? SIGNAL_LABELS[el.roleSignal] : null;
  const raw = el.roleSignal ? el.signals[el.roleSignal] : undefined;

  const why = el.preserved
    ? 'explicit attribute kept as authored'
    : el.roleSignal
      ? `from "${raw ?? ''}" · base ${el.base}${el.ordinal ? ` · ordinal ${el.ordinal}` : ''}`
      : 'no signal — falls back to component + element';

  return (
    <li className={el.preserved ? 'el-row el-row--preserved' : 'el-row'}>
      <div className="el-main">
        <div className="el-left">
          <div className="el-ident">
            <code className="el-tag">&lt;{el.elementType}&gt;</code>
            <span className="el-component">{el.componentName}</span>
          </div>
          <div className="el-signal">
            {el.preserved ? (
              <span className="chip chip--preserved">preserved</span>
            ) : signalLabel ? (
              <>
                <span className="chip chip--signal" title={`Winning signal: ${el.roleSignal}`}>
                  {signalLabel}
                </span>
                {el.roleToken ? <code className="el-token">{el.roleToken}</code> : null}
              </>
            ) : (
              <span className="chip chip--none">no signal</span>
            )}
          </div>
        </div>
        <div className="el-id">
          <code className="el-final">{el.finalId}</code>
          <CopyButton text={el.finalId} label={`Copy id ${el.finalId}`} compact />
        </div>
      </div>
      <p className="el-why">{why}</p>
    </li>
  );
}