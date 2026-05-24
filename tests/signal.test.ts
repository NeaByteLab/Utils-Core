import { assertEquals } from '@std/assert'
import { createSignal } from '@neabyte/utils-core'

Deno.test('Signal - clear removes all listeners', () => {
  const signal = createSignal<[]>()
  let emitCount = 0
  signal.subscribe(() => emitCount++)
  signal.subscribe(() => emitCount++)
  signal.emit()
  assertEquals(emitCount, 2)
  signal.clear()
  signal.emit()
  assertEquals(emitCount, 2)
})

Deno.test('Signal - emit with zero listeners is a no-op', () => {
  const signal = createSignal<[number]>()
  signal.emit(1)
  signal.emit(2)
  signal.emit(3)
  assertEquals(true, true)
})

Deno.test('Signal - error isolation', () => {
  const signal = createSignal<[]>()
  let listenerACount = 0
  let listenerBCount = 0
  signal.subscribe(() => {
    listenerACount++
    throw new Error('test error')
  })
  signal.subscribe(() => {
    listenerBCount++
  })
  signal.emit()
  assertEquals(listenerACount, 1)
  assertEquals(listenerBCount, 1)
})

Deno.test('Signal - listener receives multiple emits', () => {
  const signal = createSignal<[string]>()
  const emittedValues: string[] = []
  signal.subscribe((payloadValue) => emittedValues.push(payloadValue))
  signal.emit('a')
  signal.emit('b')
  signal.emit('c')
  assertEquals(emittedValues, ['a', 'b', 'c'])
})

Deno.test('Signal - multiple listeners receive events', () => {
  const signal = createSignal<[number]>()
  const listenerAValues: number[] = []
  const listenerBValues: number[] = []
  signal.subscribe((payloadNumber) => listenerAValues.push(payloadNumber))
  signal.subscribe((payloadNumber) => listenerBValues.push(payloadNumber))
  signal.emit(42)
  assertEquals(listenerAValues, [42])
  assertEquals(listenerBValues, [42])
})

Deno.test('Signal - onError isolates listener failures', () => {
  const errors: string[] = []
  const signal = createSignal<[]>({
    onError: (error) => errors.push((error as Error).message)
  })
  signal.subscribe(() => {
    throw new Error('first-fail')
  })
  let secondListenerCount = 0
  signal.subscribe(() => secondListenerCount++)
  signal.emit()
  assertEquals(errors, ['first-fail'])
  assertEquals(secondListenerCount, 1)
})

Deno.test('Signal - once cancel after firing is a no-op', () => {
  const signal = createSignal<[]>()
  let fireCount = 0
  const cancel = signal.once(() => fireCount++)
  signal.emit()
  cancel()
  signal.emit()
  assertEquals(fireCount, 1)
})

Deno.test('Signal - once cancel before firing prevents callback', () => {
  const signal = createSignal<[]>()
  let fireCount = 0
  const cancel = signal.once(() => fireCount++)
  cancel()
  signal.emit()
  signal.emit()
  assertEquals(fireCount, 0)
})

Deno.test('Signal - once coexists with regular subscribers', () => {
  const signal = createSignal<[number]>()
  const onceValues: number[] = []
  const onValues: number[] = []
  signal.once((value) => onceValues.push(value))
  signal.subscribe((value) => onValues.push(value))
  signal.emit(1)
  signal.emit(2)
  signal.emit(3)
  assertEquals(onceValues, [1])
  assertEquals(onValues, [1, 2, 3])
})

Deno.test('Signal - once error routes through onError', () => {
  const errors: string[] = []
  const signal = createSignal<[]>({
    onError: (error) => errors.push((error as Error).message)
  })
  signal.once(() => {
    throw new Error('once-boom')
  })
  signal.emit()
  signal.emit()
  assertEquals(errors, ['once-boom'])
})

Deno.test('Signal - once fires exactly once', () => {
  const signal = createSignal<[number]>()
  const received: number[] = []
  signal.once((value) => received.push(value))
  signal.emit(1)
  signal.emit(2)
  signal.emit(3)
  assertEquals(received, [1])
})

Deno.test('Signal - once preserves payload arguments', () => {
  const signal = createSignal<[string, number, boolean]>()
  const received: Array<[string, number, boolean]> = []
  signal.once((label, value, flag) => received.push([label, value, flag]))
  signal.emit('foo', 7, true)
  signal.emit('bar', 8, false)
  assertEquals(received, [['foo', 7, true]])
})

Deno.test('Signal - once unsubscribes wrapper after firing', () => {
  const signal = createSignal<[]>()
  let fireCount = 0
  signal.once(() => fireCount++)
  signal.emit()
  signal.emit()
  let onCount = 0
  signal.subscribe(() => onCount++)
  signal.emit()
  assertEquals(fireCount, 1)
  assertEquals(onCount, 1)
})

Deno.test('Signal - re-entrant emit', () => {
  const signal = createSignal<[number]>()
  const emittedNumbers: number[] = []
  signal.subscribe((payloadNumber) => {
    emittedNumbers.push(payloadNumber)
    if (payloadNumber === 1) {
      signal.emit(2)
    }
  })
  signal.emit(1)
  assertEquals(emittedNumbers, [1, 2])
})

Deno.test('Signal - same listener subscribed twice via reference is a single entry', () => {
  const signal = createSignal<[]>()
  let count = 0
  const listener = () => count++
  signal.subscribe(listener)
  signal.subscribe(listener)
  signal.emit()
  assertEquals(count, 1)
})

Deno.test('Signal - stress test with 1000 listeners', () => {
  const signal = createSignal<[number]>()
  const listenerCounts = new Array(1000).fill(0)
  const unsubscribeFns = listenerCounts.map((_, i) =>
    signal.subscribe(() => {
      listenerCounts[i] = (listenerCounts[i] ?? 0) + 1
    })
  )
  signal.emit(1)
  signal.emit(2)
  signal.emit(3)
  assertEquals(
    listenerCounts.every((listenerCount) => listenerCount === 3),
    true
  )
  assertEquals(
    listenerCounts.reduce((sum, addend) => sum + addend, 0),
    3000
  )
  unsubscribeFns.forEach((unsubscribeFn) => unsubscribeFn())
})

Deno.test('Signal - stress test with 10000 rapid emits', () => {
  const signal = createSignal<[number]>()
  let emitCount = 0
  signal.subscribe(() => emitCount++)
  for (let i = 0; i < 10000; i++) {
    signal.emit(i)
  }
  assertEquals(emitCount, 10000)
})

Deno.test('Signal - subscribe and emit with typed args', () => {
  const signal = createSignal<[string, number]>()
  const receivedEvents: Array<{ messageValue: string; numberValue: number }> = []
  const unsub = signal.subscribe((messageValue, numberValue) => {
    receivedEvents.push({ messageValue, numberValue })
  })
  signal.emit('hello', 1)
  signal.emit('world', 2)
  assertEquals(receivedEvents.length, 2)
  assertEquals(receivedEvents[0], { messageValue: 'hello', numberValue: 1 })
  assertEquals(receivedEvents[1], { messageValue: 'world', numberValue: 2 })
  unsub()
})

Deno.test('Signal - subscribe during emit does not fire new listener in current emit', () => {
  const signal = createSignal<[]>()
  let primaryCount = 0
  let dynamicCount = 0
  signal.subscribe(() => {
    primaryCount++
    if (primaryCount === 1) {
      signal.subscribe(() => {
        dynamicCount++
      })
    }
  })
  signal.emit()
  assertEquals(primaryCount, 1)
  assertEquals(dynamicCount, 0)
  signal.emit()
  assertEquals(primaryCount, 2)
  assertEquals(dynamicCount, 1)
})

Deno.test('Signal - unsubscribe during emit', () => {
  const signal = createSignal<[]>()
  let emitCount = 0
  let unsub: (() => void) | null = null
  unsub = signal.subscribe(() => {
    emitCount++
    if (unsub) {
      unsub()
    }
  })
  signal.emit()
  signal.emit()
  assertEquals(emitCount, 1)
})

Deno.test('Signal - unsubscribe during emit still fires snapshot listeners but skips next emit', () => {
  const signal = createSignal<[]>()
  let aCount = 0
  let bCount = 0
  let unsubB: () => void = () => {}
  signal.subscribe(() => {
    aCount++
    unsubB()
  })
  unsubB = signal.subscribe(() => {
    bCount++
  })
  signal.emit()
  assertEquals(aCount, 1)
  assertEquals(bCount, 1)
  signal.emit()
  assertEquals(aCount, 2)
  assertEquals(bCount, 1)
})

Deno.test('Signal - unsubscribe stops receiving', () => {
  const signal = createSignal<[]>()
  let emitCount = 0
  const unsub = signal.subscribe(() => {
    emitCount++
  })
  signal.emit()
  assertEquals(emitCount, 1)
  unsub()
  signal.emit()
  assertEquals(emitCount, 1)
})
