# @testable-ui/runtime

Runtime helpers for `testable-ui`. The build-time Vite plugin handles
**static** components; runtime fills the one gap it cannot:
`<Item />` rendered via `.map()` — every row needs a unique id.

## `useTestId(baseId, { key? })`

```tsx
import { useTestId } from '@testable-ui/runtime';

{items.map((item) => (
  <tr key={item.id} data-testid={useTestId('app-item-row', { key: item.id })}>
    ...
  </tr>
))}
// data-testid="app-item-row-3"
// (or sanitized <useId> suffix when no key is provided)
```

The key-based primary path works with React 18+ (`useId` hook for fallback).

## `TestIdOverlay`

Dev-only overlay. Hover to see any element's `data-testid`; `Alt+T` toggles;
click to copy to clipboard. Portal-based, zero external deps. It is opt-in and
should be mounted only in development:

```tsx
import { TestIdOverlay } from '@testable-ui/runtime';
// Vite's DEV flag keeps debugging UI out of production.
{import.meta.env.DEV && <TestIdOverlay />}
```

## Peer dependencies

`react >= 18` · `react-dom >= 18`

## License

MIT
