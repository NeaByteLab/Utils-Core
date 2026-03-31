# Documentation

Complete API documentation for `@neabyte/utils-core`.

## Modules

- **[Signal](Signal.md)** - Typed event emitter for pub/sub communication.
- **[Store](Store.md)** - Reactive state container with change notifications.
- **[Broadcast](Broadcast.md)** - Global event bus with named channels.

## Quick Reference

| Module    | Purpose          | Factory                              |
| --------- | ---------------- | ------------------------------------ |
| Signal    | Event emitter    | `createSignal<Args>()`               |
| Store     | State management | `createStore<T>(initial, onChange?)` |
| Broadcast | Global events    | `broadcast` (singleton)              |
