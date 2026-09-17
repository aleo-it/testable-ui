interface LadderRow {
  /** Signal key as the engine names it (display form). */
  signal: string;
  /** Example source that produces the signal. */
  source: string;
  /** Example role token derived from the signal. */
  token: string;
  /** Per-element gating note. */
  gating: string;
}

/**
 * The exact ROLE_SIGNAL_PRIORITY ladder from @testable-ui/core, in priority
 * order, with the per-element gating rules that roleSignalFor applies.
 */
const LADDER: LadderRow[] = [
  {
    signal: 'aria-labelledby',
    source: 'aria-labelledby="email-label"',
    token: 'email-label',
    gating: 'Always applicable',
  },
  {
    signal: 'aria-label',
    source: 'aria-label="Open help"',
    token: 'open-help',
    gating: 'Always applicable',
  },
  {
    signal: 'label',
    source: '<label htmlFor="email">Email address</label>',
    token: 'email-address',
    gating: 'Always applicable',
  },
  {
    signal: 'title',
    source: 'title="Total"',
    token: 'total',
    gating: 'Always applicable',
  },
  {
    signal: 'text',
    source: '<button>Place order</button>',
    token: 'place-order',
    gating:
      'Only on name-from-contents elements: button, a, link, summary, label, option, td, th, legend, caption, li, h1–h6, dt, dd, figcaption, abbr, dfn, optgroup',
  },
  {
    signal: 'inputType',
    source: 'type="password"',
    token: 'password',
    gating: 'Only on <input> / <button>',
  },
  {
    signal: 'placeholder',
    source: 'placeholder="Search"',
    token: 'search',
    gating: 'Only on <input> / <textarea>',
  },
  {
    signal: 'handlerName',
    source: 'onClick={handleSave}',
    token: 'save',
    gating: 'Strips handle/on prefix',
  },
];

export function SignalLadder() {
  return (
    <div className="ladder-wrap">
      <table className="ladder">
        <thead>
          <tr>
            <th scope="col" className="ladder-rank">
              #
            </th>
            <th scope="col">Signal</th>
            <th scope="col">Source</th>
            <th scope="col">Token</th>
            <th scope="col">Gating</th>
          </tr>
        </thead>
        <tbody>
          {LADDER.map((row, i) => (
            <tr key={row.signal}>
              <td className="ladder-rank">{i + 1}</td>
              <td>
                <code className="ladder-signal">{row.signal}</code>
              </td>
              <td>
                <code className="ladder-source">{row.source}</code>
              </td>
              <td>
                <code className="ladder-token">{row.token}</code>
              </td>
              <td className="ladder-gating">{row.gating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}