# Documentation

Complete API documentation for `@neabyte/utils-core`.

## Modules

- **[Broadcast](Broadcast.md)** - Global event bus with named channels.
- **[Sequential](Sequential.md)** - Async function queue for sequential execution.
- **[Signal](Signal.md)** - Typed event emitter for pub/sub communication.
- **[Store](Store.md)** - Reactive state container with change notifications.

## Quick Reference

| Module     | Purpose              | Factory                              |
| ---------- | -------------------- | ------------------------------------ |
| Broadcast  | Global events        | `broadcast` (singleton)              |
| Sequential | Sequential execution | `createSequential<Args, Return>(fn)` |
| Signal     | Event emitter        | `createSignal<Args>()`               |
| Store      | State management     | `createStore<T>(initial, onChange?)` |
