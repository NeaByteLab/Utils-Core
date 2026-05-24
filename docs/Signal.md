# Signal

Typed event emitter for pub/sub communication with error-isolated listeners.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Signals](#creating-signals)
- [API Reference](#api-reference)

## Quick Start

```typescript
import { createSignal } from '@neabyte/utils-core'

const signal = createSignal<[string, number]>()

// Subscribe to events
const unsub = signal.subscribe((name, value) => {
  console.log(`${name}: ${value}`)
})

// Emit events
// 'score: 100'
signal.emit('score', 100)
// 'lives: 3'
signal.emit('lives', 3)

// Cleanup
unsub()
```

## Creating Signals

### `createSignal<Args extends unknown[] = []>(options?: SignalOptions): Signal<Args>`

Factory function that creates a new Signal instance.

```typescript
// No arguments
const noArgs = createSignal<[]>()

// Single argument
const single = createSignal<[string]>()

// Multiple arguments
const multi = createSignal<[string, number, boolean]>()
```

### `SignalOptions`

| Option                   | Type                                      | Default | Description                               |
| ------------------------ | ----------------------------------------- | ------- | ----------------------------------------- |
| `onError`                | `(error, listener) => void`               | —       | Called when a listener throws during emit |
| `maxListeners`           | `number`                                  | —       | Maximum listeners before warning is fired |
| `onMaxListenersExceeded` | `(count: number, maxListeners: number) => void` | —       | Called when listener count exceeds `maxListeners` |
| `maxEmitDepth`           | `number`                                  | `Infinity` | Maximum re-entrant `emit()` depth before an error is thrown. Useful for detecting cyclic emit patterns. |

### With Error Handler

By default, errors thrown by listeners are silently swallowed. Provide `onError` to observe them:

```typescript
const signal = createSignal<[string]>({
  onError: (error, listener) => {
    console.error('Listener failed:', error)
  }
})

signal.subscribe(msg => {
  throw new Error('boom')
})

// logs: "Listener failed: Error: boom"
signal.emit('hello')
```

## API Reference

### `subscribe(callback): () => void`

Register a callback to be invoked when `emit` is called. Returns an unsubscribe function.

```typescript
const signal = createSignal<[string]>()

const unsub = signal.subscribe(msg => {
  console.log('Received:', msg)
})

// Later: remove this listener
unsub()
```

> [!NOTE]
> Multiple subscriptions are allowed. Each returns its own unsubscribe function.

### `emit(...args): void`

Invoke all registered callbacks with the provided arguments.

```typescript
const signal = createSignal<[number, number]>()
signal.subscribe((x, y) => console.log(x + y))

// 15
signal.emit(5, 10)
```

> [!NOTE]
> Errors in one callback do not affect others. By default failures are silently caught; use the `onError` option to observe them.

### `once(callback): () => void`

Register a callback that fires only once, then auto-unsubscribes. Returns an unsubscribe function that can cancel before it fires.

```typescript
const signal = createSignal<[string]>()

signal.once(msg => {
  console.log('First message:', msg)
})

// 'First message: hello'
signal.emit('hello')

// nothing (already unsubscribed)
signal.emit('world')
```

### `clear(): void`

Remove all registered callbacks at once.

```typescript
const signal = createSignal<[]>()
signal.subscribe(() => console.log('A'))
signal.subscribe(() => console.log('B'))

// both listeners removed
signal.clear()
// nothing logged
signal.emit()
```
