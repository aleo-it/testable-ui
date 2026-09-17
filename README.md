# testable-ui

Automatic, deterministic, semantic `data-testid` generation for React.

Write your components; every element gets a stable, human-readable test id from
a naming algorithm — so your e2e/component tests query ids that survive
refactors, and never collide across files.

```
<SubmitButton />            →  data-testid="app-submit-button-26ad4b3c9f01"
<input placeholder="Email"> →  data-testid="app-email-input-26ad4b3c9f01"
```

## Problem it solves

Hand-written ids are duplicated, renamed-drift, and break silently with the UI.
Fully-dynamic ids (UUIDs, hashes of everything) fail the purpose: tests must be
write-able *before* the UI exists, so ids must be **predictable from source**.
`testable-ui` derives ids entirely from the source you already wrote:

- **Semantic** — static `aria-labelledby` text wins, then `aria-label`, then `label`, then
  `title`, then element text, then `inputType`, then `placeholder`, then handler
  name — gated by HTML-AAM role (text only on name-from-content elements,
  placeholder only on form controls).
- **Deterministic** — same source, same ids in CI, locally, everywhere.
- **Unique** — a path-hash suffix (12 hex chars of `sha256("testable-ui/v1:" +
  canonicalPath)`) makes ids globally unique across files; ordinals (`-2`)
  resolve duplicates within a component; `useTestId` at runtime resolves
  `.map()` list rows — the one thing a build-time tool cannot.
- **Zero code changes** — the Vite plugin injects the attribute at build time.

## Packages

| Package | Role | Install |
|---|---|---|
| `@testable-ui/vite` | Vite plugin — injects ids + emits a TS registry | `pnpm add -D @testable-ui/vite` |
| `@testable-ui/core` | Naming engine + registry generation (used by the plugin) | comes along, `pnpm add @testable-ui/core` for advanced use |
| `@testable-ui/runtime` | `useTestId(baseId, { key })` for list rows; `TestIdOverlay` dev inspector | `pnpm add @testable-ui/runtime` |

`examples/playground` is a demo app, not published.

## Quick start

```ts
// vite.config.ts
import { testableUiVite } from '@testable-ui/vite';

export default {
  plugins: [testableUiVite({ registryFile: 'src/test-ids.generated.ts' })],
};
```

Build → attributes injected → registry generated:

```ts
// src/test-ids.generated.ts (emitted by the plugin)
export const testIds = {
  'app-submit-button-26ad4b3c9f01': 'app-submit-button-26ad4b3c9f01',
  // ...
} as const;
export type TestId = keyof typeof testIds;
export function tid(id: TestId): string { return testIds[id]; }
```

```ts
// your test — ids typed, zero strings duplicated by hand
import { tid } from '@/test-ids.generated';
await page.getByTestId(tid('app-submit-button-26ad4b3c9f01')).click();
```

## List rows (runtime)

Build-time ids are equal for every `.map()` row — `key` disambiguates at runtime:

```tsx
import { useTestId } from '@testable-ui/runtime';

{orders.map((order) => (
  <tr key={order.id} data-testid={useTestId('app-order-row', { key: order.id })}>
    ...
  </tr>
))}
// data-testid="app-order-row-3"  (or app-order-row-<useId-suffix> when no key)
```

Dev inspector — hover any element to see its id, `Alt+T` to toggle, click to copy:

```tsx
import { TestIdOverlay } from '@testable-ui/runtime';
// dev-only component; don't ship it in production bundles
<TestIdOverlay />
```

## Naming rules

1. Existing `data-testid` (yours, or injected before) is **preserved untouched** — idempotent.
2. Signal ladder per element (first match wins, gated by HTML-AAM role):
   `aria-labelledby` → `aria-label` → `label` → `title` → element text →
   `inputType` (`password` etc.) → `placeholder` → `onClick` handler name.
3. Shape: `{component}-{role}-{elementType}`, ordinals `-2`, `-3`… for
   duplicates within a component, then `-{12hex path-suffix}` for global uniqueness.
4. Component name = enclosing function/class/arrow variable, else filename.

## Options

| Option | Default | Notes |
|---|---|---|
| `attributeName` | `data-testid` | Which attribute to inject |
| `registryFile` | `test-ids.generated.ts` | Written at build (`closeBundle`) |
| `include` | `\.(m?[jt]sx?)$` | File filter |
| `exclude` | `node_modules` | File filter |
| `maxIdLength` | `48` | Overflowing ids truncate with `~` |
| `algorithmVersion` | `1` | Future-proofing |
| `environment` | `development` | `production` + `includeInProduction: false` skips injection |
| `includeInProduction` | `true` | See `environment` |
| `strict` | `false` | Fail the build when a matching file cannot be transformed |

## Known limitations (v1)

- A root `<div>` wrapping the app aggregates all descendant text into its id —
  names such containers explicitly or use non-text elements at the top.
- The registry is refreshed as matching modules transform. Import the emitted
  file from test code after your app build has run.
- Elements in `.map()` need `useTestId` (runtime) for row-unique ids.
- Overlong ids truncate (48-char cap) instead of staying verbatim.

## Development

```sh
pnpm install
pnpm test          # vitest, all packages (100 tests)
pnpm build         # tsc for all packages
pnpm --filter @testable-ui/playground dev   # interactive demo
pnpm --filter @testable-ui/playground verify  # integration gate against real vite build
```

## License

MIT
