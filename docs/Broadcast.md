# Broadcast

Global event bus with named channels for decoupled cross-module communication.

## Table of Contents

- [Quick Start](#quick-start)
- [Using Broadcast](#using-broadcast)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)

## Quick Start

```typescript
import { broadcast } from '@neabyte/utils-core'

// Subscribe to a named channel
const unsub = broadcast.on('user:login', user => {
  console.log('User logged in:', user)
})

// Emit to the channel from anywhere
broadcast.emit('user:login', { id: 1, name: 'Nea' })

// Cleanup when done
unsub()
broadcast.clear('user:login') // or clear all listeners for channel
```

## Using Broadcast

Broadcast is a singleton event bus. Channels are created on-demand when first used.

```typescript
// Channel 'a' is created when first listener subscribes
broadcast.on('a', data => console.log(data))

// Same channel, new listener
broadcast.on('a', data => console.log('second:', data))

// Different channel
broadcast.on('b', data => console.log('channel b:', data))
```

## API Reference

### `on<Args>(channel, callback): () => void`

Subscribe to a named channel. Returns an unsubscribe function.

```typescript
// No arguments
const unsub1 = broadcast.on('ping', () => {
  console.log('pong')
})

// Typed arguments
const unsub2 = broadcast.on<[string, number]>('update', (field, value) => {
  console.log(`${field} = ${value}`)
})

broadcast.emit('update', 'score', 100) // 'score = 100'
```

### `emit<Args>(channel, ...args): void`

Emit an event to all listeners on a channel.

```typescript
broadcast.emit('notify', 'Hello world')
broadcast.emit<[number, number]>('resize', 1920, 1080)
```

> [!NOTE]
> Channels are created automatically when first used. No setup required.

### `clear(channel): void`

Remove all listeners from a channel and delete the channel.

```typescript
broadcast.on('temp', () => console.log('A'))
broadcast.on('temp', () => console.log('B'))

broadcast.emit('temp') // both A and B log

broadcast.clear('temp') // all listeners removed
broadcast.emit('temp') // nothing logs
```

## Common Patterns

### Channel Isolation

Channels operate independently:

```typescript
const channelA: number[] = []
const channelB: number[] = []

broadcast.on('a', (n: number) => channelA.push(n))
broadcast.on('b', (n: number) => channelB.push(n))

broadcast.emit('a', 1)
broadcast.emit('b', 2)

console.log(channelA) // [1]
console.log(channelB) // [2]
```

### Clearing Specific Channels

`clear()` affects only the named channel:

```typescript
broadcast.on('keep', (v: string) => console.log('keep:', v))
broadcast.on('clear', (v: string) => console.log('clear:', v))

broadcast.emit('keep', '1') // 'keep: 1'
broadcast.emit('clear', '2') // 'clear: 2'

broadcast.clear('clear')

broadcast.emit('keep', '3') // 'keep: 3'
broadcast.emit('clear', '4') // nothing (channel cleared)
```

### Multiple Listeners Per Channel

Same channel can have many subscribers:

```typescript
const values: string[] = []

broadcast.on('multi', (v: string) => values.push(`a:${v}`))
broadcast.on('multi', (v: string) => values.push(`b:${v}`))
broadcast.on('multi', (v: string) => values.push(`c:${v}`))

broadcast.emit('multi', 'x')
console.log(values) // ['a:x', 'b:x', 'c:x']
```

### Error Isolation

One failing listener does not break others:

```typescript
broadcast.on('error-test', () => {
  throw new Error('listener A fails')
})

broadcast.on('error-test', () => {
  console.log('listener B still runs')
})

broadcast.emit('error-test') // 'listener B still runs' printed
```

### Special Channel Names

Channel names can contain any string:

```typescript
const channels = [
  'user:login',
  'api:fetch:error',
  'unicode-日本語',
  'spaces in name',
  'symbols@#$%'
]

channels.forEach(ch => {
  broadcast.on(ch, data => console.log(`${ch}: ${data}`))
  broadcast.emit(ch, 'test')
})
```

### Memory Cleanup

Always clean up unused channels:

```typescript
// Setup temporary listeners
for (let i = 0; i < 100; i++) {
  broadcast.on('temp-channel', () => {})
}

// Clear when done
broadcast.clear('temp-channel')

// Verify cleanup
let count = 0
broadcast.on('temp-channel', () => count++)
broadcast.emit('temp-channel')
console.log(count) // 1 (fresh channel)

broadcast.clear('temp-channel')
```

### Cross-Module Communication

Broadcast bridges decoupled parts of your application:

```typescript
// In module A
const store = createStore({ user: null })

store.subscribe(() => {
  broadcast.emit('auth:changed', store.getState().user)
})

// In module B (no direct reference to store)
broadcast.on('auth:changed', user => {
  if (user) {
    console.log('Welcome,', user.name)
  }
})
```

### Stress Testing

Broadcast handles high channel counts and rapid emissions:

```typescript
// 100 channels
const results: Record<string, number> = {}

for (let i = 0; i < 100; i++) {
  const channel = `ch-${i}`
  results[channel] = 0
  broadcast.on(channel, () => results[channel]++)
}

// Emit to all channels
for (let i = 0; i < 100; i++) {
  broadcast.emit(`ch-${i}`)
}

// Each channel received exactly 1 emit
console.log(Object.values(results).every(c => c === 1)) // true

// Cleanup
for (let i = 0; i < 100; i++) {
  broadcast.clear(`ch-${i}`)
}
```
