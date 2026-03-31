import { assertEquals } from '@std/assert'
import { createSignal } from '@neabyte/utils-core'

Deno.test('Signal - clear removes all listeners', () => {
  const signal = createSignal<[]>()
  let count = 0
  signal.subscribe(() => count++)
  signal.subscribe(() => count++)
  signal.emit()
  assertEquals(count, 2)
  signal.clear()
  signal.emit()
  assertEquals(count, 2)
})

Deno.test('Signal - error isolation', () => {
  const signal = createSignal<[]>()
  let countA = 0
  let countB = 0
  signal.subscribe(() => {
    countA++
    throw new Error('test error')
  })
  signal.subscribe(() => {
    countB++
  })
  signal.emit()
  assertEquals(countA, 1)
  assertEquals(countB, 1)
})

Deno.test('Signal - listener receives multiple emits', () => {
  const signal = createSignal<[string]>()
  const values: string[] = []
  signal.subscribe((v) => values.push(v))
  signal.emit('a')
  signal.emit('b')
  signal.emit('c')
  assertEquals(values, ['a', 'b', 'c'])
})

Deno.test('Signal - multiple listeners receive events', () => {
  const signal = createSignal<[number]>()
  const valuesA: number[] = []
  const valuesB: number[] = []
  signal.subscribe((n) => valuesA.push(n))
  signal.subscribe((n) => valuesB.push(n))
  signal.emit(42)
  assertEquals(valuesA, [42])
  assertEquals(valuesB, [42])
})

Deno.test('Signal - re-entrant emit', () => {
  const signal = createSignal<[number]>()
  const values: number[] = []
  signal.subscribe((n) => {
    values.push(n)
    if (n === 1) {
      signal.emit(2)
    }
  })
  signal.emit(1)
  assertEquals(values, [1, 2])
})

Deno.test('Signal - stress test with 1000 listeners', () => {
  const signal = createSignal<[number]>()
  const counts = new Array(1000).fill(0)
  const unsubs = counts.map((_, i) =>
    signal.subscribe(() => {
      counts[i] = (counts[i] ?? 0) + 1
    })
  )
  signal.emit(1)
  signal.emit(2)
  signal.emit(3)
  assertEquals(
    counts.every((c) => c === 3),
    true
  )
  assertEquals(
    counts.reduce((a, b) => a + b, 0),
    3000
  )
  unsubs.forEach((u) => u())
})

Deno.test('Signal - stress test with 10000 rapid emits', () => {
  const signal = createSignal<[number]>()
  let count = 0
  signal.subscribe(() => count++)
  for (let i = 0; i < 10000; i++) {
    signal.emit(i)
  }
  assertEquals(count, 10000)
})

Deno.test('Signal - subscribe and emit with typed args', () => {
  const signal = createSignal<[string, number]>()
  const received: Array<{ msg: string; val: number }> = []
  const unsub = signal.subscribe((msg, val) => {
    received.push({ msg, val })
  })
  signal.emit('hello', 1)
  signal.emit('world', 2)
  assertEquals(received.length, 2)
  assertEquals(received[0], { msg: 'hello', val: 1 })
  assertEquals(received[1], { msg: 'world', val: 2 })
  unsub()
})

Deno.test('Signal - unsubscribe during emit', () => {
  const signal = createSignal<[]>()
  let count = 0
  let unsub: (() => void) | null = null
  unsub = signal.subscribe(() => {
    count++
    if (unsub) {
      unsub()
    }
  })
  signal.emit()
  signal.emit()
  assertEquals(count, 1)
})

Deno.test('Signal - unsubscribe stops receiving', () => {
  const signal = createSignal<[]>()
  let count = 0
  const unsub = signal.subscribe(() => {
    count++
  })
  signal.emit()
  assertEquals(count, 1)
  unsub()
  signal.emit()
  assertEquals(count, 1)
})
