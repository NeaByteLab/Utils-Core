# Sequential

Async function queue for sequential execution to prevent race conditions.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Sequential Executors](#creating-sequential-executors)
- [API Reference](#api-reference)

## Quick Start

```typescript
import { createSequential } from '@neabyte/utils-core'

const writeToDb = createSequential(async (data: string) => {
  await db.insert(data)
  return `Written: ${data}`
})

// Multiple concurrent calls execute sequentially
const results = await Promise.all([
  writeToDb.execute('A'),
  writeToDb.execute('B'),
  writeToDb.execute('C')
])

// Results: ['Written: A', 'Written: B', 'Written: C']
// Execution order is guaranteed A → B → C
```

## Creating Sequential Executors

### `createSequential<Args, ReturnType>(targetFunction, options?): Sequential<Args, ReturnType>`

Factory function that wraps an async function with sequential execution guarantee.

```typescript
// Simple async function
const delayFn = createSequential(async (ms: number) => {
  await new Promise(r => setTimeout(r, ms))
  return `Waited ${ms}ms`
})

// Multiple arguments
const saveUser = createSequential(async (id: string, data: UserData) => {
  await db.updateUser(id, data)
  return { id, updated: true }
})

// With return type
const fetchData = createSequential<[string], ApiResponse>(async url => {
  const res = await fetch(url)
  return res.json()
})
```

### `SequentialOptions`

| Option         | Type          | Default | Description                                                           |
| -------------- | ------------- | ------- | --------------------------------------------------------------------- |
| `signal`       | `AbortSignal` | —       | Abort the queue. Pending items are rejected and the queue is cleared. |
| `timeoutMs`    | `number`      | —       | Per-task timeout. Tasks exceeding it reject with a timeout error.     |
| `maxQueueSize` | `number`      | —       | Maximum queue depth. `execute()` rejects when full.                   |
| `concurrency`  | `number`      | `1`     | Number of tasks that may run in parallel.                             |

#### With Abort Signal

```typescript
const controller = new AbortController()
const worker = createSequential(processJob, { signal: controller.signal })

worker.execute(job1)
worker.execute(job2)
worker.execute(job3)

// Cancel everything pending
controller.abort()
// Pending items reject, and new execute() calls after abort also reject
```

#### With Per-Task Timeout

```typescript
const fetcher = createSequential(
  async (url: string) => {
    const res = await fetch(url)
    return res.json()
  },
  { timeoutMs: 5000 }
)

try {
  await fetcher.execute('/slow-endpoint')
} catch (err) {
  // err.message: 'Sequential task timed out after 5000ms.'
}
```

#### With Bounded Queue

```typescript
const writer = createSequential(saveToDisk, { maxQueueSize: 10 })

for (let i = 0; i < 20; i++) {
  // After the queue is full, additional execute() calls return rejected promises
  writer.execute(`item-${i}`).catch(() => {
    console.warn('Dropping item due to backpressure')
  })
}
```

## API Reference

### `execute(...args): Promise<ReturnType>`

Add function call to queue and return promise that resolves when executed.

```typescript
const fn = createSequential(async (n: number) => {
  await new Promise(r => setTimeout(r, 100))
  return n * 2
})

// 10
const result = await fn.execute(5)
```

> [!NOTE]
> Multiple concurrent calls are queued and processed in FIFO order.

### `clear(): void`

Remove all pending items from queue and reject their promises.

```typescript
const fn = createSequential(async (data: string) => {
  await saveToDisk(data)
})

// starts immediately
fn.execute('A')

// queued
fn.execute('B')

// queued
fn.execute('C')

// B and C removed and their promises rejected
fn.clear()

// Only A will execute
```

### `getPendingCount(): number`

Get number of queued executions waiting to process.

```typescript
const fn = createSequential(async (id: string) => {
  await processJob(id)
})

fn.execute('job-1')
fn.execute('job-2')
fn.execute('job-3')

// 2 (job-2 and job-3 queued)
console.log(fn.getPendingCount())
```

### `isProcessing(): boolean`

Check if any tasks are currently executing.

```typescript
const fn = createSequential(async () => {
  await new Promise(r => setTimeout(r, 100))
})

fn.execute()
console.log(fn.isProcessing())
// true

await fn.execute()
console.log(fn.isProcessing())
// false
```

### `pause(): void`

Pause processing new tasks. Already running tasks continue, but no new tasks start until `resume()` is called.

```typescript
const fn = createSequential(async (id: string) => {
  await processJob(id)
}, { concurrency: 2 })

fn.execute('job-1')
fn.execute('job-2')
fn.pause()

// job-3 is queued but will not start until resume()
fn.execute('job-3')
```

### `resume(): void`

Resume processing paused tasks.

```typescript
fn.pause()
fn.execute('job-1')
fn.execute('job-2')

// Tasks begin processing
fn.resume()
```

### `dispose(): void`

Permanently dispose the executor. Rejects all pending tasks and prevents new `execute()` calls.

```typescript
const fn = createSequential(async (id: string) => {
  await processJob(id)
})

fn.execute('job-1')
fn.execute('job-2')

// Rejects job-2 and clears the queue
fn.dispose()

// Rejected: 'Sequential has been disposed and cannot accept new tasks.'
await fn.execute('job-3')
```

### `drain(): Promise<void>`

Return a promise that resolves once every running task has settled and the queue is empty. The promise resolves immediately when the executor is already idle. Calling `clear()`, `dispose()`, or aborting through the option `signal` also resolves any pending `drain()` promises.

```typescript
const fn = createSequential(async (id: string) => {
  await processJob(id)
})

fn.execute('job-1')
fn.execute('job-2')

await fn.drain()
// Both tasks have completed by this point
```
