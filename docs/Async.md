# Async

Abortable sleep and promise timeout utilities.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)

## Quick Start

```typescript
import { Async } from '@neabyte/utils-core'

// Sleep for 100ms
await Async.sleepDelay(100)

// Sleep with abort support (resolves silently on abort by default)
const controller = new AbortController()
setTimeout(() => controller.abort(), 50)
await Async.sleepDelay(500, { signal: controller.signal })

// Sleep that rejects on abort
await Async.sleepDelay(500, {
  signal: controller.signal,
  throwOnAbort: true
})

// Timeout a promise
const result = await Async.withTimeout(fetch('/api/data'), 5000, 'Request timed out')
```

## API Reference

### `Async.sleepDelay(delayMs: number, options?: SleepOptions): Promise<void>`

Wait for a specified duration. Resolves immediately if `delayMs` is zero or negative.

```typescript
// waits ~100ms
await Async.sleepDelay(100)

// resolves immediately
await Async.sleepDelay(0)

// resolves immediately
await Async.sleepDelay(-10)
```

#### `SleepOptions`

| Option         | Type                                    | Default     | Description                                                 |
| -------------- | --------------------------------------- | ----------- | ----------------------------------------------------------- |
| `signal`       | `AbortSignal`                           | —           | Abort the sleep early                                       |
| `throwOnAbort` | `boolean`                               | `false`     | Reject with an error when aborted (silent resolve if false) |
| `abortError`   | `() => Error`                           | —           | Factory for custom abort error (implies `throwOnAbort`)     |
| `unref`        | `boolean`                               | `false`     | Unref the timer so it does not block process exit (Node.js) |
| `scheduler`    | `(callback: () => void, delay: number) => number` | `setTimeout` | Custom scheduler for the delay timer                        |
| `timer`        | `TimerAPI`                              | `setTimeout` based default | Full timer API with `schedule` and `clear` for cancellation |

With silent abort (default):

```typescript
const controller = new AbortController()
const promise = Async.sleepDelay(1000, { signal: controller.signal })

setTimeout(() => controller.abort(), 100)

// resolves silently
await promise
```

With `throwOnAbort`:

```typescript
const controller = new AbortController()
try {
  await Async.sleepDelay(1000, {
    signal: controller.signal,
    throwOnAbort: true
  })
} catch (err) {
  // err.message describes the abort reason
}
```

With custom error:

```typescript
await Async.sleepDelay(1000, {
  signal: controller.signal,
  abortError: () => new Error('Operation cancelled by user')
})
```

With `unref` (Node.js):

```typescript
// Timer will not keep the event loop alive
await Async.sleepDelay(60_000, { unref: true })
```

> [!NOTE]
> If the signal is already aborted before the call, the behavior follows the same `throwOnAbort` / `abortError` rules.

### `Async.withTimeout<T>(promise, timeoutMs, errorMessage, options?): Promise<T>`

Race a promise against a timeout. Rejects with `errorMessage` if the timeout fires first.

```typescript
const slow = new Promise<string>(resolve => {
  setTimeout(() => resolve('done'), 5000)
})

// Timeout after 100ms
// throws: Error('Too slow')
await Async.withTimeout(slow, 100, 'Too slow')
```

#### `TimeoutOptions`

| Option         | Type                                               | Default      | Description                                                           |
| -------------- | -------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| `signal`       | `AbortSignal`                                      | —            | Abort the timeout early (rejects with `timeoutError` if provided, otherwise `errorMessage`) |
| `timeoutError` | `() => Error`                                      | —            | Factory for custom timeout error instead of generic `Error`           |
| `unref`        | `boolean`                                          | `false`      | Unref the timer so it does not block process exit (Node.js)           |
| `scheduler`    | `(callback: () => void, delay: number) => number`  | `setTimeout` | Custom scheduler for the timeout timer                                |
| `timer`        | `TimerAPI`                                         | `setTimeout` based default | Full timer API with `schedule` and `clear` for cancellation |

```typescript
await Async.withTimeout(slow, 100, 'Too slow', { unref: true })
```

With abort signal:

```typescript
const controller = new AbortController()
const result = Async.withTimeout(fetchData(), 5000, 'Request timed out', {
  signal: controller.signal
})

// Abort externally before timeout fires
// rejects with 'Request timed out'
controller.abort()
```

With custom timeout error:

```typescript
class TimeoutError extends Error {
  constructor() {
    super('Custom timeout reached')
    this.name = 'TimeoutError'
  }
}

// throws: TimeoutError('Custom timeout reached')
await Async.withTimeout(slow, 100, 'fallback message', {
  timeoutError: () => new TimeoutError()
})
```

> [!NOTE]
> The underlying timeout is always cleared when the promise settles, preventing timer leaks.
