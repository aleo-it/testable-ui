# @testable-ui/core

Naming engine and registry generator for `testable-ui`. Used internally by
`@testable-ui/vite` — you only need this directly if you are building a
custom adapter.

**Deterministic** (`sha256("testable-ui/v1:" + canonicalPath) → 12-hex suffix`),
**semantic** (accname-aligned signal ladder), **idempotent** (preserves existing ids).

## Exports

- `nameElement(signals, options)` — compute `{ id, ordinal }` for one element.
- `allocateComponentIds(bases[])` — deduplicate identical bases inside a component.
- `pathSuffix(relativePath)` — `sha256("testable-ui/v1:" + canonicalPath)` → first 12 hex chars.
- `renderRegistrySource(manifest, options)` — emit `test-ids.generated.ts` content.
- `ROLE_SIGNAL_PRIORITY`, `DEFAULT_OPTIONS`, `ELEMENT_TYPES` — constants/types.

## License

MIT