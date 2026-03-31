<div align='center'>

# Utils Core

Zero-dependency utilities for modern development across all runtimes.

[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org) [![Deno](https://img.shields.io/badge/deno-compatible-ffcb00?logo=deno&logoColor=000000)](https://deno.com) [![Bun](https://img.shields.io/badge/bun-compatible-f9f1e1?logo=bun&logoColor=000000)](https://bun.sh) [![CDN](https://img.shields.io/badge/cdn-jsdelivr%2Fesm.sh-blue)](https://cdn.jsdelivr.net/npm/@neabyte/utils-core)

[![Module type: Deno/ESM](https://img.shields.io/badge/module%20type-deno%2Fesm-brightgreen)](https://github.com/NeaByteLab/Utils-Core) [![npm version](https://img.shields.io/npm/v/@neabyte/utils-core.svg)](https://www.npmjs.org/package/@neabyte/utils-core) [![JSR](https://jsr.io/badges/@neabyte/utils-core)](https://jsr.io/@neabyte/utils-core) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## Features

- **Zero dependencies** - No external packages required.
- **Broadcast** - Global named-channel event bus.
- **Sequential** - Async function queue with sequential execution guarantee.
- **Signal** - Typed event emitter with error-isolated listeners.
- **Store** - Reactive state container with reducer updates.

## Installation

> [!NOTE]
> **Prerequisites:** For **Deno** (install from [deno.com](https://deno.com/)). For **npm** use Node.js (e.g. [nodejs.org](https://nodejs.org/)).

**Deno (JSR):**

```bash
deno add jsr:@neabyte/utils-core
```

**npm:**

```bash
npm install @neabyte/utils-core
```

**CDN (jsDelivr/unpkg/esm.sh):**

```html
<script type="module">
  import {
    createSignal,
    createStore,
    broadcast
  } from 'https://cdn.jsdelivr.net/npm/@neabyte/utils-core@0.1.0/dist/index.mjs'
</script>
```

Or via [esm.sh](https://esm.sh):

```html
<script type="module">
  import { createSignal, createStore, broadcast } from 'https://esm.sh/@neabyte/utils-core@0.1.0'
</script>
```

Or via `importmap`:

```html
<script type="importmap">
  {
    "imports": {
      "@neabyte/utils-core": "https://cdn.jsdelivr.net/npm/@neabyte/utils-core@0.1.0/dist/index.mjs"
    }
  }
</script>
<script type="module">
  import { createSignal } from '@neabyte/utils-core'
</script>
```

## Quick Start

```typescript
import { createSignal, createStore, broadcast } from '@neabyte/utils-core'

// Signal - event emitter
const signal = createSignal<[string]>()
signal.subscribe(msg => console.log(msg))
signal.emit('hello') // 'hello'

// Store - reactive state
const store = createStore(0)
store.subscribe(() => console.log(store.getState()))
store.setState(n => n + 1) // 1

// Broadcast - global event bus
broadcast.on('user:login', user => console.log(user))
broadcast.emit('user:login', { id: 1 })
```

- [docs/README.md](docs/README.md) for full documentation.

## Build

**npm build (bundles to `dist/`):**

```bash
npm run build
```

## Testing

**Type check** - format, lint, and type-check:

```bash
deno task check
```

**Unit tests** - format/lint tests and run all tests:

```bash
deno task test
```

- Tests live under `tests/` (signal, store, and broadcast tests).
- The test task uses `--allow-read`, `--allow-write`, and `--allow-env`.

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for details.
