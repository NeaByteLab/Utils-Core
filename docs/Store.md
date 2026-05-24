# Store

Reactive state container with change notifications and reducer-based updates.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Stores](#creating-stores)
- [API Reference](#api-reference)

## Quick Start

```typescript
import { createStore } from '@neabyte/utils-core'

const store = createStore({ count: 0, user: null })

// Subscribe to changes
store.subscribe(() => {
  console.log('State:', store.getState())
})

// Update state with reducer
// State: { count: 1, user: null }
store.setState(prev => ({ ...prev, count: prev.count + 1 }))
```

## Creating Stores

### `createStore<T>(initialState: T, options?: StoreOptions<T>): Store<T>`

Factory function that creates a new Store instance.

```typescript
// Simple primitive
const numberStore = createStore(0)

// Complex object
interface UserState {
  user: { id: string; name: string } | null
  loading: boolean
}

const userStore = createStore<UserState>({
  user: null,
  loading: false
})
```

### `StoreOptions<T>`

| Option           | Type                            | Default     | Description                                                   |
| ---------------- | ------------------------------- | ----------- | ------------------------------------------------------------- |
| `isEqual`        | `(prev: T, next: T) => boolean` | `Object.is` | Custom equality check to determine if a state change occurred |
| `onChange`       | `(change) => void`              | —           | Called with `{ newState, oldState }` whenever state changes   |
| `onError`        | `(error, listener) => void`     | —           | Called when a subscriber throws during notification           |
| `onDispose`      | `() => void`                    | —           | Called once after `dispose()` finishes tearing the store down |
| `maxNotifyDepth` | `number`                        | `100`       | Maximum re-entrant notification depth before an error is thrown. Useful for detecting cyclic `setState` patterns. |

### With Change Callback

Optional callback receives previous and new state on every change:

```typescript
const store = createStore(0, {
  onChange: ({ newState, oldState }) => {
    console.log(`Changed: ${oldState} → ${newState}`)
  }
})

// 'Changed: 0 → 1'
store.setState(n => n + 1)
```

### With Custom Equality

Use a custom comparator to short-circuit identical updates (e.g., deep equality):

```typescript
import { deepEqual } from 'some-deep-equal-lib'

const store = createStore(
  { items: [1, 2, 3] },
  {
    isEqual: (prev, next) => deepEqual(prev, next)
  }
)

let count = 0
store.subscribe(() => count++)

// new object, but deep-equal
store.setState(() => ({ items: [1, 2, 3] }))

// 0 (no notification)
console.log(count)
```

### With Error Handler

By default, errors thrown by subscribers are silently caught. Provide `onError` to observe them:

```typescript
const store = createStore(0, {
  onError: (error, listener) => {
    console.error('Subscriber failed:', error)
  }
})

store.subscribe(() => {
  throw new Error('boom')
})

// logs: "Subscriber failed: Error: boom"
store.setState(n => n + 1)
```

## API Reference

### `getState(): T`

Read the current state value.

```typescript
const store = createStore({ name: 'Nea' })

// { name: 'Nea' }
console.log(store.getState())
```

### `setState(updater: (prev: T) => T): void`

Update state using a reducer function that receives the previous state and returns the next state.

```typescript
const store = createStore({ count: 0 })

// Increment counter
store.setState(prev => ({
  ...prev,
  count: prev.count + 1
}))

// Replace entirely
store.setState(() => ({ count: 100 }))
```

> [!NOTE]
> If the equality check (`Object.is` by default, or custom via `isEqual`) considers the new value identical to the previous, no notifications are sent.

### `subscribe(listener): () => void`

Register a listener to be invoked when state changes. Returns an unsubscribe function.

```typescript
const store = createStore(0)

const unsub = store.subscribe(() => {
  console.log('State changed to:', store.getState())
})

// 'State changed to: 1'
store.setState(n => n + 1)

// Cleanup
unsub()
```

> [!NOTE]
> Subscribers receive no arguments. Read current state via `getState()` inside the callback.

### `reset(): void`

Reset the store to its initial state. Triggers notifications if the state changed.

```typescript
const store = createStore(0)

store.setState(n => n + 5)

// 5
console.log(store.getState())

// reset
store.reset()

// 0
console.log(store.getState())
```

### `batch(fn: () => void): void`

Group multiple `setState` calls into a single notification. Subscribers are notified once after `fn` completes, not after each individual update.

```typescript
const store = createStore({ x: 0, y: 0 })

let notifyCount = 0
store.subscribe(() => notifyCount++)

store.batch(() => {
  store.setState(prev => ({ ...prev, x: 10 }))
  store.setState(prev => ({ ...prev, y: 20 }))
})

// 1 (not 2)
console.log(notifyCount)

// { x: 10, y: 20 }
console.log(store.getState())
```

> [!NOTE]
> Nested `batch()` calls are supported. Notifications fire only when the outermost batch completes. If `fn` throws, pending notifications are still flushed before the error propagates.

### `derive<R>(selector: (state: T) => R): { get: () => R; subscribe: (listener: () => void) => () => void }`

Create a derived reactive value that updates only when the selected slice changes. Automatically subscribes to the parent store and unsubscribes when all derived listeners are removed.

```typescript
const store = createStore({ count: 0, name: 'test' })

const countDerived = store.derive(state => state.count)

let countNotify = 0
countDerived.subscribe(() => countNotify++)

// countNotify: 1
store.setState(prev => ({ ...prev, count: 1 }))

// countNotify: still 1 (name changed, count did not)
store.setState(prev => ({ ...prev, name: 'updated' }))

// 1
console.log(countNotify)

// 1
console.log(countDerived.get())
```

> [!NOTE]
> Derived values use `Object.is` for equality comparison by default. The parent store's `isEqual` option does not affect derived comparisons.

### `dispose(): void`

Permanently tear the store down. Removes every subscriber, blocks future calls to `getState()`, `setState()`, `subscribe()`, and `batch()`, and invokes the optional `onDispose` callback. Calling `dispose()` more than once is a safe no-op.

```typescript
const store = createStore(0, {
  onDispose: () => console.log('store closed')
})

store.subscribe(() => {})

// logs: "store closed"
store.dispose()

// Throws: 'Store has been disposed and cannot be accessed.'
store.getState()
```
