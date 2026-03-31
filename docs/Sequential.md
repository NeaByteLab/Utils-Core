# Sequential

Async function queue for sequential execution to prevent race conditions.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Sequential Executors](#creating-sequential-executors)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)

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

### `createSequential<Args, ReturnType>(targetFunction): Sequential<Args, ReturnType>`

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

## API Reference

### `execute(...args): Promise<ReturnType>`

Add function call to queue and return promise that resolves when executed.

```typescript
const fn = createSequential(async (n: number) => {
  await new Promise(r => setTimeout(r, 100))
  return n * 2
})

const result = await fn.execute(5) // 10
```

> [!NOTE]
> Multiple concurrent calls are queued and processed in FIFO order.

### `clear(): void`

Remove all pending items from queue.

```typescript
const fn = createSequential(async (data: string) => {
  await saveToDisk(data)
})

fn.execute('A') // starts immediately
fn.execute('B') // queued
fn.execute('C') // queued

fn.clear() // B and C removed

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

console.log(fn.getPendingCount()) // 2 (job-2 and job-3 queued)
```

## Common Patterns

### Database Write Queue

Prevent concurrent write conflicts:

```typescript
const dbQueue = createSequential(async (user: User) => {
  await db.users.insert(user)
  return user.id
})

// 100 concurrent requests → execute one-by-one
await Promise.all(users.map(u => dbQueue.execute(u)))
```

### File Operations

Sequential disk access prevents corruption:

```typescript
const fileWriter = createSequential(async (data: string) => {
  await fs.appendFile('/var/log/app.log', data + '\n')
})

// Log entries maintain order
events.on('log', msg => fileWriter.execute(msg))
```

### Rate-Limited API Calls

Natural rate limiting through sequential execution:

```typescript
const apiCall = createSequential(async (endpoint: string) => {
  const res = await fetch(apiBase + endpoint)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json()
})

// Calls execute one at a time
for (const endpoint of endpoints) {
  apiCall.execute(endpoint)
}
```

### Error Isolation

One failing execution does not stop the queue:

```typescript
const fn = createSequential(async (id: string, shouldFail: boolean) => {
  if (shouldFail) {
    throw new Error(`Failed: ${id}`)
  }
  return `Success: ${id}`
})

const results = await Promise.allSettled([
  fn.execute('A', false), // succeeds
  fn.execute('B', true), // fails
  fn.execute('C', false) // still executes
])

// A and C succeed, B fails independently
```

### Context Preservation

Maintain `this` context in class methods:

```typescript
class Database {
  private writeQueue = createSequential(async (data: string) => {
    // this refers to Database instance
    await this.connection.query('INSERT INTO logs VALUES (?)', [data])
  })

  async log(data: string) {
    return this.writeQueue.execute(data)
  }
}
```

### Queue Monitoring

Track and control queue size:

```typescript
const processor = createSequential(async (task: Task) => {
  await heavyProcessing(task)
})

// Monitor queue depth
setInterval(() => {
  const pending = processor.getPendingCount()
  if (pending > 100) {
    console.warn(`Queue backlog: ${pending} tasks`)
  }
}, 1000)
```

### Cleanup and Shutdown

Clear pending work on shutdown:

```typescript
const worker = createSequential(async (job: Job) => {
  await processJob(job)
})

// On shutdown signal
process.on('SIGTERM', () => {
  const pending = worker.getPendingCount()
  console.log(`Dropping ${pending} pending jobs`)
  worker.clear()
  process.exit(0)
})
```

### Stress Testing

Sequential handles high queue volumes:

```typescript
const fn = createSequential(async (n: number) => {
  await new Promise(r => setTimeout(r, 1))
  return n
})

// 10000 rapid calls
const promises = Array.from({ length: 10000 }, (_, i) => fn.execute(i))

const results = await Promise.all(promises)
console.log(results.length) // 10000
console.log(results[0]) // 0
console.log(results[9999]) // 9999
```
