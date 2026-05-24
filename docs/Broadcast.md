# Broadcast

Named-channel event bus for decoupled cross-module communication.

## Table of Contents

- [Quick Start](#quick-start)
- [Using Broadcast](#using-broadcast)
- [API Reference](#api-reference)

## Quick Start

```typescript
import { createBroadcast } from '@neabyte/utils-core'

const bus = createBroadcast()

// Subscribe to a named channel
const unsub = bus.on('user:login', user => {
  console.log('User logged in:', user)
})

// Emit to the channel from anywhere
bus.emit('user:login', { id: 1, name: 'Nea' })

// Cleanup when done
unsub()
bus.clear('user:login')
```

## Using Broadcast

Every broadcast instance is created explicitly. Channels are created on-demand when first subscribed to via `on()` or `once()`. Share an instance across modules by exporting it from your own code.

```typescript
import { createBroadcast } from '@neabyte/utils-core'

export const bus = createBroadcast()

// Channel 'a' is created when first subscriber registers
bus.on('a', data => console.log(data))

// Same channel, new listener
bus.on('a', data => console.log('second:', data))

// Different channel
bus.on('b', data => console.log('channel b:', data))
```

### `createBroadcast(options?: BroadcastOptions): Broadcast`

Create a broadcast instance with optional error handling.

```typescript
import { createBroadcast } from '@neabyte/utils-core'

const bus = createBroadcast({
  onError: (error, listener, eventName) => {
    console.error(`Listener on '${eventName}' failed:`, error)
  }
})

bus.on('event', () => {
  throw new Error('boom')
})

// logs: "Listener on 'event' failed: Error: boom"
bus.emit('event')
```

### `BroadcastOptions`

| Option                   | Type                                            | Default | Description                               |
| ------------------------ | ----------------------------------------------- | ------- | ----------------------------------------- |
| `onError`                | `(error, listener, eventName) => void`          | —       | Called when a listener throws during emit |
| `maxListeners`           | `number`                                        | —       | Maximum listeners per channel before warning |
| `onMaxListenersExceeded` | `(eventName, count, maxListeners) => void`      | —       | Called when a channel exceeds its listener limit |

> [!NOTE]
> Without `onError`, listener errors are silently swallowed. Provide `onError` to observe them.

## API Reference

### `on<Args>(channel, callback): () => void`

Subscribe to a named channel. Returns an unsubscribe function.

```typescript
const bus = createBroadcast()

// No arguments
const unsub1 = bus.on('ping', () => {
  console.log('pong')
})

// Typed arguments
const unsub2 = bus.on<[string, number]>('update', (field, value) => {
  console.log(`${field} = ${value}`)
})

bus.emit('update', 'score', 100)
// 'score = 100'
```

### `emit<Args>(channel, ...args): void`

Emit an event to all listeners on a channel.

```typescript
bus.emit('notify', 'Hello world')
bus.emit<[number, number]>('resize', 1920, 1080)
```

> [!NOTE]
> Emitting on a channel that has no subscribers is a silent no-op. Channels are created when a listener first subscribes via `on()` or `once()`.

### `clear(channel): void`

Remove all listeners from a channel and delete the channel.

```typescript
bus.on('temp', () => console.log('A'))
bus.on('temp', () => console.log('B'))

// both A and B log
bus.emit('temp')

// all listeners removed
bus.clear('temp')

// nothing logs
bus.emit('temp')
```

### `once<Args>(channel, callback): () => void`

Subscribe to a channel for a single event. The listener auto-unsubscribes after the first emit.

```typescript
bus.once('init', config => {
  console.log('Initialized with:', config)
})

// logs config
bus.emit('init', { debug: true })

// nothing (already unsubscribed)
bus.emit('init', { debug: false })
```

> [!NOTE]
> Returns an unsubscribe function that can cancel the listener before it fires.

### `clearAll(): void`

Remove all listeners from all channels and delete every channel.

```typescript
bus.on('a', () => console.log('A'))
bus.on('b', () => console.log('B'))

// all channels wiped
bus.clearAll()

// nothing
bus.emit('a')

// nothing
bus.emit('b')
```
