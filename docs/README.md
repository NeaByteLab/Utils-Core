# Documentation

Complete API documentation for `@neabyte/utils-core`.

## Modules

- **[Async](Async.md)** - Abortable sleep and promise timeout utilities.
- **[Broadcast](Broadcast.md)** - Named-channel event bus for decoupled communication.
- **[Clone](Clone.md)** - Deep and shallow cloning with structured clone fallback.
- **[Immutable](Immutable.md)** - Recursive freezing and read-only proxies.
- **[Iterable](Iterable.md)** - Lazy iterator pipeline built on ES2025 Iterator helpers.
- **[Sequential](Sequential.md)** - Async function queue with configurable concurrency.
- **[Signal](Signal.md)** - Typed event emitter for pub/sub communication.
- **[Store](Store.md)** - Reactive state container with change notifications and derived state.

## Quick Reference

| Module     | Purpose              | Factory                                      |
| ---------- | -------------------- | -------------------------------------------- |
| Async      | Sleep / timeout      | `Async.sleepDelay` / `Async.withTimeout`     |
| Broadcast  | Named events         | `createBroadcast(opts?)`                     |
| Clone      | Deep / shallow clone | `Clone.clone` / `Clone.deepClone`            |
| Immutable  | Freeze / harden      | `Immutable.deepFreeze` / `Immutable.harden`  |
| Iterable   | Lazy pipelines       | `Iterable.from(...)` / `Iterable.range(...)` |
| Sequential | Async queue          | `createSequential<Args, Return>(fn, opts?)`  |
| Signal     | Event emitter        | `createSignal<Args>(opts?)`                  |
| Store      | State management     | `createStore<T>(initial, opts?)`             |
