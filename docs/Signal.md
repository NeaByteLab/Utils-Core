# Signal

Typed event emitter for pub/sub communication with error-isolated listeners.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Signals](#creating-signals)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)

## Quick Start

```typescript
import { createSignal } from '@neabyte/utils-core'

const signal = createSignal<[string, number]>()

// Subscribe to events
const unsub = signal.subscribe((name, value) => {
  console.log(`${name}: ${value}`)
})

// Emit events
signal.emit('score', 100) // 'score: 100'
signal.emit('lives', 3) // 'lives: 3'

// Cleanup
unsub()
```

## Creating Signals

### `createSignal<Args extends unknown[] = []>(): Signal<Args>`

Factory function that creates a new Signal instance.

```typescript
// No arguments
const noArgs = createSignal<[]>()

// Single argument
const single = createSignal<[string]>()

// Multiple arguments
const multi = createSignal<[string, number, boolean]>()
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

signal.emit(5, 10) // 15
```

> [!NOTE]
> Errors in one callback do not affect others. Failed callbacks are silently caught.

### `clear(): void`

Remove all registered callbacks at once.

```typescript
const signal = createSignal<[]>()
signal.subscribe(() => console.log('A'))
signal.subscribe(() => console.log('B'))

signal.clear() // both listeners removed
signal.emit() // nothing logged
```

## Common Patterns

### Typed Event Payloads

Define argument types explicitly for compile-time safety:

```typescript
type UserEvent = [action: 'login' | 'logout', userId: string]

const userSignal = createSignal<UserEvent>()

userSignal.subscribe((action, userId) => {
  // action is typed as 'login' | 'logout'
  // userId is typed as string
  console.log(`User ${userId} ${action}`)
})

userSignal.emit('login', 'user-123')
```

### Re-entrant Emits

Signals support emitting from within listeners:

```typescript
const signal = createSignal<[number]>()
const values: number[] = []

signal.subscribe(n => {
  values.push(n)
  if (n === 1) {
    signal.emit(2) // re-entrant emit
  }
})

signal.emit(1)
console.log(values) // [1, 2]
```

### Error Isolation

One failing listener does not break others:

```typescript
const signal = createSignal<[]>()

signal.subscribe(() => {
  throw new Error('listener A fails')
})

signal.subscribe(() => {
  console.log('listener B still runs')
})

signal.emit() // 'listener B still runs' printed
```

### Unsubscribe During Emit

Listeners can unsubscribe themselves during emit:

```typescript
const signal = createSignal<[]>()
let count = 0
let unsub: (() => void) | null = null

unsub = signal.subscribe(() => {
  count++
  unsub?.() // unsubscribe during emit
})

signal.emit() // count = 1
signal.emit() // count = 1 (unsubscribed)
```

### Stress Testing

Signals handle high listener counts and rapid emissions:

```typescript
const signal = createSignal<[number]>()
const counts = new Array(1000).fill(0)

const unsubs = counts.map((_, i) =>
  signal.subscribe(() => {
    counts[i]++
  })
)

// 1000 listeners, 3 emits each
for (let i = 0; i < 3; i++) {
  signal.emit(1)
}

// Every listener received all 3 emits
console.log(counts.every(c => c === 3)) // true
console.log(counts.reduce((a, b) => a + b, 0)) // 3000

// Cleanup
unsubs.forEach(u => u())
```
