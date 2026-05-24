<div align='center'>

# Utils Core

Zero-dependency utilities for modern development across all runtimes.

[![Node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org) [![Deno](https://img.shields.io/badge/deno-compatible-ffcb00?logo=deno&logoColor=000000)](https://deno.com) [![Bun](https://img.shields.io/badge/bun-compatible-f9f1e1?logo=bun&logoColor=000000)](https://bun.sh) [![CDN](https://img.shields.io/badge/cdn-jsdelivr%2Fesm.sh-blue)](https://cdn.jsdelivr.net/npm/@neabyte/utils-core)

[![Module type: Deno/ESM](https://img.shields.io/badge/module%20type-deno%2Fesm-brightgreen)](https://github.com/NeaByteLab/Utils-Core) [![npm version](https://img.shields.io/npm/v/@neabyte/utils-core.svg)](https://www.npmjs.org/package/@neabyte/utils-core) [![JSR](https://jsr.io/badges/@neabyte/utils-core)](https://jsr.io/@neabyte/utils-core) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## Features

- **Zero dependencies** - No external packages required.
- **Async** - Abortable sleep and promise timeout utilities with custom scheduler support.
- **Broadcast** - Named-channel event bus with per-channel listener limits.
- **Clone** - Deep and shallow cloning with structured clone fallback and custom handlers.
- **Immutable** - Recursive freezing, hardening, and read-only Map/Set proxies.
- **Iterable** - Lazy, chainable pipeline for iterables with map, filter, reduce, and more.
- **Sequential** - Async function queue with configurable concurrency and backpressure control.
- **Signal** - Typed event emitter with error-isolated listeners and max listener guards.
- **Store** - Reactive state container with reducer updates and derived state support.

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
    Async,
    createBroadcast,
    Clone,
    createSequential,
    createSignal,
    createStore,
    Immutable,
    Iterable
  } from 'https://cdn.jsdelivr.net/npm/@neabyte/utils-core@0.1.0/dist/index.mjs'
</script>
```

Or via [esm.sh](https://esm.sh):

```html
<script type="module">
  import {
    Async,
    createBroadcast,
    Clone,
    createSequential,
    createSignal,
    createStore,
    Immutable,
    Iterable
  } from 'https://esm.sh/@neabyte/utils-core@0.1.0'
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

Read [docs/README.md](docs/README.md) for full documentation.

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

- Tests live under `tests/` (async, broadcast, clone, immutable, iterable, sequential, signal, and store tests).
- The test task uses `--allow-read`, `--allow-write`, and `--allow-env`.

## Dev Notes

> I struggled learning over the past several years without clear examples, so I wrote the simple stuff I kept rewriting across projects. Nothing fancy, just small utilities that do what they say. If they help you, cool. If you outgrow them, even better.

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for details.
