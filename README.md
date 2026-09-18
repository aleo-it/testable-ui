# testable-ui

Automatic, deterministic, semantic `data-testid` generation for React.

Write components as usual. The Vite plugin derives stable, human-readable test
ids from source signals, injects them at build time, and emits a typed registry.

```text
<SubmitButton />             -> data-testid="app-submit-button-26ad4b3c9f01"
<input placeholder="Email"> -> data-testid="app-email-input-26ad4b3c9f01"
```

## Why

Hand-written ids are easy to duplicate or let drift during refactors. Fully
dynamic ids are difficult to predict when tests are written. `testable-ui`
derives ids from source signals that already exist in the component:

- Semantic: `aria-labelledby`, `aria-label`, `label`, `title`, element text,
  input type, placeholder, and handler name, subject to the HTML-AAM role.
- Deterministic: identical source produces identical ids in CI and locally.
- Unique: a path hash provides global uniqueness, ordinals resolve duplicates
  within a component, and the runtime handles repeated list rows.
- Zero component changes: the Vite plugin injects the attribute at build time.

## Packages

| Package | Role | Install |
|---|---|---|
| `@testable-ui/vite` | Vite plugin; injects ids and emits the registry | `pnpm add -D @testable-ui/vite` |
| `@testable-ui/core` | Naming engine and registry generation | `pnpm add @testable-ui/core` |
| `@testable-ui/runtime` | `useTestId` for list rows and `TestIdOverlay` for development | `pnpm add @testable-ui/runtime` |

`examples/playground` and `examples/site` are demonstration applications and
are not published packages.

## Quick start

```ts
// vite.config.ts
import { testableUiVite } from '@testable-ui/vite';

export default {
  plugins: [testableUiVite({ registryFile: 'src/test-ids.generated.ts' })],
};
```

The build injects attributes and generates a typed registry:

```ts
export const testIds = {
  'app-submit-button-26ad4b3c9f01': 'app-submit-button-26ad4b3c9f01',
} as const;

export type TestId = keyof typeof testIds;
export function tid(id: TestId): string {
  return testIds[id];
}
```

Tests can import the generated helper instead of repeating untyped strings:

```ts
import { tid } from '@/test-ids.generated';

await page.getByTestId(tid('app-submit-button-26ad4b3c9f01')).click();
```

## List rows and development inspector

Build-time ids are equal for every `.map()` row. Pass a stable key to
`useTestId` to disambiguate them at runtime:

```tsx
import { useTestId } from '@testable-ui/runtime';

{orders.map((order) => (
  <tr key={order.id} data-testid={useTestId('app-order-row', { key: order.id })}>
    ...
  </tr>
))}
```

`TestIdOverlay` is a development-only inspector: hover an element to see its
id, press `Alt+T` to toggle the overlay, and click to copy. It is intentionally
opt-in so the runtime package never mounts debugging UI by itself.

```tsx
import { TestIdOverlay } from '@testable-ui/runtime';

{import.meta.env.DEV && <TestIdOverlay />}
```

The Vite plugin operates in development by default, so generated ids are
available while running the dev server. Production injection can be disabled
with `environment: 'production'` and `includeInProduction: false`; the overlay
should likewise be mounted only in development.

## Naming rules

1. Existing `data-testid` values are preserved unchanged.
2. The signal ladder is `aria-labelledby` -> `aria-label` -> `label` ->
   `title` -> text -> input type -> placeholder -> handler name, gated by the
   HTML-AAM role.
3. The id shape is `{component}-{role}-{elementType}` plus an ordinal for
   duplicates and a 12-hex-character path suffix for global uniqueness.
4. The component name comes from the enclosing function, class, or arrow
   variable; if none is available, the filename is used.

## Options

| Option | Default | Description |
|---|---|---|
| `attributeName` | `data-testid` | Attribute to inject |
| `registryFile` | `test-ids.generated.ts` | Generated registry path |
| `include` | `\\.(m?[jt]sx?)$` | Files to transform |
| `exclude` | `node_modules` | Files to skip |
| `maxIdLength` | `48` | Maximum id length |
| `algorithmVersion` | `1` | Naming algorithm version |
| `environment` | `development` | Build environment |
| `includeInProduction` | `true` | Whether production builds receive ids |
| `strict` | `false` | Whether transformation failures fail the build |

## Known limitations

- A root non-semantic wrapper can aggregate descendant text into its name; use
  an explicitly non-text element where necessary.
- The generated registry is refreshed when matching modules are transformed.
- Elements rendered inside `.map()` require `useTestId` for row-level identity.
- Overlong ids are truncated to the configured maximum.

## KPI lab: experimental analysis

The `examples/lab` experiment addresses one narrow question:

> Does adding a deterministic semantic test id improve an agent's ability to
> select a unique, correct UI locator?

### Experimental design

The experiment is a paired comparison. Both arms contain the same 24-node
modeled DOM: 12 target elements and 12 equivocal siblings. Each sibling shares
the target's strongest accessible-name signal, such as the same button text or
input placeholder. The arms differ in exactly one treatment:

- **With IDs:** target nodes expose the generated `data-testid`.
- **Without IDs:** target nodes expose the same semantic signals, but no
  generated id.

The task set contains 12 natural-language instructions, one for each target.
The target node is known to the scoring oracle but is not disclosed to the
agent. This is a paired experiment, not a comparison of different pages or
different task samples.

### Measurements

For each task, the agent returns an ordered list of candidate locators. The lab
resolves those candidates against the modeled DOM and records:

- **Success@1:** the first candidate matches exactly one node and that node is
  the ground-truth target.
- **Ambiguity rate:** the first candidate matches more than one node.
- **Wrong-target rate:** at least one candidate uniquely resolves to a node
  other than the ground-truth target.
- **Mean attempts:** average candidates evaluated before a unique correct target
  is found.

The primary comparison is the difference in Success@1 between the two arms.
The corpus, resolver, and scoring code are deterministic; scoring uses no
browser, network, randomness, or hidden target information.

### Reproduce the deterministic analysis

```sh
pnpm --filter @testable-ui/lab test
pnpm --filter @testable-ui/lab typecheck
pnpm --filter @testable-ui/lab lab
```

The deterministic fixture currently produces this regression baseline:

| Arm | Success@1 | Ambiguity rate | Wrong-target rate | Mean attempts |
|---|---:|---:|---:|---:|
| With generated IDs | 100.0% | 0.0% | 0.0% | 1.00 |
| Without generated IDs | 8.3% | 91.7% | 0.0% | 3.25 |

The fixture gate passes when the ID arm reaches at least 90% Success@1, beats
the no-ID arm, and has zero wrong-target resolutions. Reports are written to
`examples/lab/report/report.json` and `report.html`.

### Evaluate a real agent

The agent experiment is vendor-neutral. Set `TESTABLE_UI_AGENT_COMMAND` to a
command that reads one JSON request from stdin and writes one JSON response to
stdout:

```sh
TESTABLE_UI_AGENT_COMMAND='node agent.js' \
  pnpm --filter @testable-ui/lab lab:agent
```

Each request contains the task id, natural-language instruction, arm, and
modeled nodes with their semantic signals. Generated `testId` values are
included only in the ID arm. The response must be either
`{ "locators": [...] }` or a locator array, using shapes such as:

```json
{
  "locators": [
    { "kind": "role", "role": "button", "name": "Save" }
  ]
}
```

The adapter invokes the command once per task per arm and scores the returned
proposals with the same resolver and ground truth used by the fixture. It
writes `examples/lab/report/agent-report.json`.

### Initial Codex observation

The included `examples/lab/src/codex-agent.mjs` wrapper was run with Codex CLI
`0.154.0-alpha.6.2` in read-only mode: one 12-task run per arm.

| Arm | Success@1 | Ambiguity rate | Wrong-target rate | Mean attempts |
|---|---:|---:|---:|---:|
| Codex with generated IDs | 100.0% (12/12) | 0.0% | 0.0% | 1.00 |
| Codex without generated IDs | 58.3% (7/12) | 33.3% | 8.3% | 1.17 |

This is an initial observation, not a benchmark. It uses one model, one
prompt, one run, and a small synthetic DOM. A stronger study would preregister
a larger corpus, repeat each condition across multiple runs, include held-out
tasks and realistic UI mutations, and compare multiple agent implementations.

## Development

```sh
pnpm install
pnpm test
pnpm build
pnpm --filter @testable-ui/playground dev
pnpm --filter @testable-ui/playground verify
```

## License

MIT
