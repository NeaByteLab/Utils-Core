# Store

Reactive state container with change notifications and reducer-based updates.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Stores](#creating-stores)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)

## Quick Start

```typescript
import { createStore } from '@neabyte/utils-core'

const store = createStore({ count: 0, user: null })

// Subscribe to changes
store.subscribe(() => {
  console.log('State:', store.getState())
})

// Update state with reducer
store.setState(prev => ({ ...prev, count: prev.count + 1 }))
// State: { count: 1, user: null }
```

## Creating Stores

### `createStore<T>(initialState: T, onChange?: OnChange<T>): Store<T>`

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

### With Change Callback

Optional callback receives previous and new state on every change:

```typescript
const store = createStore(0, ({ newState, oldState }) => {
  console.log(`Changed: ${oldState} → ${newState}`)
})

store.setState(n => n + 1) // 'Changed: 0 → 1'
```

## API Reference

### `getState(): T`

Read the current state value.

```typescript
const store = createStore({ name: 'Nea' })
console.log(store.getState()) // { name: 'Nea' }
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
> If the returned value is identical to the previous (`Object.is`), no notifications are sent.

### `subscribe(callback): () => void`

Register a callback to be invoked when state changes. Returns an unsubscribe function.

```typescript
const store = createStore(0)

const unsub = store.subscribe(() => {
  console.log('State changed to:', store.getState())
})

store.setState(n => n + 1) // 'State changed to: 1'

// Cleanup
unsub()
```

> [!NOTE]
> Subscribers receive no arguments. Read current state via `getState()` inside the callback.

## Common Patterns

### Immutable Updates

Always return new objects to trigger notifications:

```typescript
const store = createStore({ items: ['a', 'b'] })

// Correct: new array reference
store.setState(prev => ({
  items: [...prev.items, 'c']
}))

// Correct: new object with updated field
store.setState(prev => ({
  ...prev,
  count: (prev.count ?? 0) + 1
}))
```

### No Notification on Unchanged Value

Store skips notifications when state hasn't changed:

```typescript
const store = createStore({ id: 1 })
let count = 0

store.subscribe(() => count++)

store.setState(prev => prev) // same reference, no notification
store.setState(prev => ({ ...prev })) // new object, notification sent

console.log(count) // 1
```

### Nested State Updates

Stores support updates from within subscribers:

```typescript
const store = createStore(0)
const values: number[] = []

store.subscribe(() => {
  values.push(store.getState())
  if (store.getState() === 1) {
    store.setState(n => n + 1) // nested update
  }
})

store.setState(n => n + 1) // triggers nested update
console.log(values) // [1, 2]
console.log(store.getState()) // 2
```

### Error Isolation

One failing subscriber does not affect others:

```typescript
const store = createStore(0)

store.subscribe(() => {
  throw new Error('subscriber A fails')
})

store.subscribe(() => {
  console.log('subscriber B still runs')
})

store.setState(n => n + 1) // 'subscriber B still runs' printed
```

### Multiple Subscribers

All subscribers receive notifications:

```typescript
const store = createStore(0)
const counts: [number, number, number] = [0, 0, 0]

store.subscribe(() => counts[0]++)
store.subscribe(() => counts[1]++)
store.subscribe(() => counts[2]++)

store.setState(n => n + 1)
console.log(counts) // [1, 1, 1]
```

### Memory Management

Always unsubscribe when components unmount or listeners are no longer needed:

```typescript
const store = createStore({ data: null })

function setup() {
  const unsub = store.subscribe(() => {
    render(store.getState())
  })

  return () => {
    unsub() // cleanup on unmount
  }
}
```
