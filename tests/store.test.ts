import { assertEquals } from '@std/assert'
import { createStore } from '@neabyte/utils-core'

Deno.test('Store - error isolation', () => {
  const store = createStore(0)
  let countA = 0
  let countB = 0
  store.subscribe(() => {
    countA++
    throw new Error('test error')
  })
  store.subscribe(() => {
    countB++
  })
  store.setState((n) => n + 1)
  assertEquals(countA, 1)
  assertEquals(countB, 1)
})

Deno.test('Store - getState returns initial value', () => {
  const store = createStore({ count: 0, name: 'test' })
  assertEquals(store.getState(), { count: 0, name: 'test' })
})

Deno.test('Store - multiple subscribers all notified', () => {
  const store = createStore(0)
  const counts: [number, number, number] = [0, 0, 0]
  store.subscribe(() => counts[0]++)
  store.subscribe(() => counts[1]++)
  store.subscribe(() => counts[2]++)
  store.setState((n) => n + 1)
  assertEquals(counts, [1, 1, 1])
})

Deno.test('Store - nested setState', () => {
  const store = createStore(0)
  const values: number[] = []
  store.subscribe(() => {
    values.push(store.getState())
    if (store.getState() === 1) {
      store.setState((n) => n + 1)
    }
  })
  store.setState((n) => n + 1)
  assertEquals(values, [1, 2])
  assertEquals(store.getState(), 2)
})

Deno.test('Store - no notification when value unchanged', () => {
  const store = createStore(5)
  let count = 0
  store.subscribe(() => count++)
  store.setState((n) => n)
  assertEquals(count, 0)
})

Deno.test('Store - onChange callback receives prev and new state', () => {
  const changes: Array<{ prev: number; next: number }> = []
  const store = createStore(0, ({ newState, oldState }) => {
    changes.push({ prev: oldState, next: newState })
  })
  store.setState(() => 10)
  store.setState(() => 20)
  assertEquals(changes.length, 2)
  assertEquals(changes[0], { prev: 0, next: 10 })
  assertEquals(changes[1], { prev: 10, next: 20 })
})

Deno.test('Store - onChange prev and next values', () => {
  const changes: Array<{ prev: number; next: number }> = []
  const store = createStore(0, ({ newState, oldState }) => {
    changes.push({ prev: oldState, next: newState })
  })
  store.setState((n) => n + 1)
  store.setState((n) => n + 1)
  assertEquals(changes, [
    { prev: 0, next: 1 },
    { prev: 1, next: 2 }
  ])
})

Deno.test('Store - setState updates value', () => {
  const store = createStore(10)
  store.setState((n) => n + 5)
  assertEquals(store.getState(), 15)
})

Deno.test('Store - stress test with 10000 rapid updates', () => {
  const store = createStore(0)
  let count = 0
  store.subscribe(() => count++)
  for (let i = 0; i < 10000; i++) {
    store.setState((n) => n + 1)
  }
  assertEquals(count, 10000)
  assertEquals(store.getState(), 10000)
})

Deno.test('Store - stress test with 500 subscribers', () => {
  const store = createStore(0)
  const counts: number[] = new Array(500).fill(0)
  const unsubs = counts.map((_, i) =>
    store.subscribe(() => {
      counts[i] = (counts[i] || 0) + 1
    })
  )
  for (let i = 0; i < 100; i++) {
    store.setState((n) => n + 1)
  }
  assertEquals(
    counts.every((c) => c === 100),
    true
  )
  assertEquals(
    counts.reduce((a, b) => a + b, 0),
    50000
  )
  unsubs.forEach((u) => u())
})

Deno.test('Store - subscribe notifies on change', () => {
  const store = createStore('initial')
  const values: string[] = []
  store.subscribe(() => {
    values.push(store.getState())
  })
  store.setState(() => 'changed')
  assertEquals(values, ['changed'])
})

Deno.test('Store - unsubscribe stops notifications', () => {
  const store = createStore(0)
  let count = 0
  const unsub = store.subscribe(() => count++)
  store.setState((n) => n + 1)
  assertEquals(count, 1)
  unsub()
  store.setState((n) => n + 1)
  assertEquals(count, 1)
})
