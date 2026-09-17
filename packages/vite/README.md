# @testable-ui/vite

Vite plugin that injects deterministic, semantic `data-testid` attributes at
build time and emits a typed `test-ids.generated.ts` registry.

## Install

```sh
pnpm add -D @testable-ui/vite @testable-ui/runtime
```

## Usage

```ts
// vite.config.ts
import { testableUiVite } from '@testable-ui/vite';

export default {
  plugins: [testableUiVite({ registryFile: 'src/test-ids.generated.ts' })],
};
```

Write your JSX as normal. Build; ids are injected and a typed registry is
emitted.

```ts
import { tid } from '@/test-ids.generated';
await page.getByTestId(tid('app-submit-button-26ad4b')).click();
```

## How it works

Uses `@swc/core`'s parse/print pipeline (not the JS transform plugin, which
overwrites JSX). A visitor walks the JSX AST, extracts signals (aria-label,
placeholder, label text, inputType, text, handler name), names every element,
appends a 6-char `sha256(path)` suffix for global uniqueness, and injects
the attribute. Files with existing `data-testid` are untouched (idempotent).

## Options

`testableUiVite(options?)` — all optional.

| Option | Default | Notes |
|---|---|---|
| `attributeName` | `data-testid` | Attribute to inject |
| `registryFile` | `test-ids.generated.ts` | Written on `closeBundle` |
| `include` | `\.(t\|j)sx$` | Include filter |
| `exclude` | `node_modules` | Exclude filter |
| `maxIdLength` | `48` | Overflow truncated with `~` |
| `algorithmVersion` | `1` | Forward-compat |
| `environment` | `development` | Set `production` with `includeInProduction: false` to disable |
| `includeInProduction` | `true` | Combine with `environment` to skip in prod builds |

## Peer dependencies

`vite ^5 || ^6 || ^7`

## License

MIT