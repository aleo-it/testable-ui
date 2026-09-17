import { Fragment } from 'react';

interface Segment {
  kind: 'component' | 'role' | 'element' | 'suffix';
  label: string;
  value: string;
  note: string;
}

/**
 * Real output of the naming engine for `src/CheckoutForm.tsx` (the golden
 * path pinned by the test suite): suffix `3c2bb2c2dce9`.
 */
const SEGMENTS: Segment[] = [
  {
    kind: 'component',
    label: 'component',
    value: 'checkout-form',
    note: 'from CheckoutForm',
  },
  {
    kind: 'role',
    label: 'role',
    value: 'email-address',
    note: 'from <label>Email address</label>',
  },
  {
    kind: 'element',
    label: 'element',
    value: 'input',
    note: 'the JSX tag',
  },
  {
    kind: 'suffix',
    label: 'path suffix',
    value: '3c2bb2c2dce9',
    note: 'sha256 of testable-ui/v1:src/CheckoutForm.tsx — first 12 hex chars',
  },
];

export function IdAnatomy() {
  return (
    <div className="anatomy">
      <p className="anatomy-formula">
        {'{component}-{role}-{elementType}'}
        <span className="anatomy-formula-opt"> + optional -{'{n}'} ordinal</span>
        <span className="anatomy-formula-opt"> + -{'{12hex}'} path suffix</span>
      </p>
      <div className="anatomy-id" aria-label="Example id: checkout-form-email-address-input-3c2bb2c2dce9">
        {SEGMENTS.map((seg, i) => (
          <Fragment key={seg.kind}>
            {i > 0 ? (
              <span className="anatomy-sep" aria-hidden="true">
                -
              </span>
            ) : null}
            <span className={`anatomy-seg anatomy-seg--${seg.kind}`}>{seg.value}</span>
          </Fragment>
        ))}
      </div>
      <ul className="anatomy-legend">
        {SEGMENTS.map((seg) => (
          <li key={seg.kind} className="anatomy-item">
            <span className={`anatomy-dot anatomy-dot--${seg.kind}`} aria-hidden="true" />
            <span className="anatomy-item-label">{seg.label}</span>
            <span className="anatomy-item-note">{seg.note}</span>
          </li>
        ))}
      </ul>
      <p className="anatomy-note">
        Duplicates within one component get an ordinal: two signal-less{' '}
        <code>&lt;div&gt;</code>s become <code>checkout-form-div</code> and{' '}
        <code>checkout-form-div-2</code>. Reordering JSX shifts ordinals — give
        signal-poor elements distinct names at the source to keep them stable.
      </p>
    </div>
  );
}