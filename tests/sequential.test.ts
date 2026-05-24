import { assertEquals, assertRejects, assertThrows } from '@std/assert'
import { createSequential } from '@neabyte/utils-core'

Deno.test('Sequential - abort signal after construction does not reject future executes if not yet aborted', async () => {
  const abortController = new AbortController()
  const sequentialFn = createSequential(
    async (n: number) => {
      await Promise.resolve()
      return n * 2
    },
    { signal: abortController.signal }
  )
  const result = await sequentialFn.execute(5)
  assertEquals(result, 10)
})

Deno.test('Sequential - abort signal already aborted rejects execute', async () => {
  const abortController = new AbortController()
  abortController.abort()
  const sequentialFn = createSequential(
    async (n: number) => {
      await Promise.resolve()
      return n
    },
    { signal: abortController.signal }
  )
  await assertRejects(() => sequentialFn.execute(1), Error, 'AbortSignal was already aborted')
})

Deno.test(
  'Sequential - abort signal triggered clears pending tasks',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const abortController = new AbortController()
    const sequentialFn = createSequential(
      async (n: number) => {
        await new Promise((r) => setTimeout(r, 50))
        return n
      },
      { signal: abortController.signal }
    )
    const head = sequentialFn.execute(1)
    const tail1 = sequentialFn.execute(2)
    const tail2 = sequentialFn.execute(3)
    await new Promise((r) => setTimeout(r, 5))
    abortController.abort()
    const results = await Promise.allSettled([head, tail1, tail2])
    const rejected = results.filter((r) => r.status === 'rejected')
    assertEquals(rejected.length >= 2, true)
  }
)

Deno.test('Sequential - clear on empty queue is safe no-op', () => {
  const sequentialFn = createSequential(async (n: number) => {
    await Promise.resolve()
    return n
  })
  assertEquals(sequentialFn.getPendingCount(), 0)
  sequentialFn.clear()
  assertEquals(sequentialFn.getPendingCount(), 0)
  assertEquals(sequentialFn.isProcessing(), false)
})

Deno.test(
  'Sequential - clear rejection message includes accurate dropped count',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const sequentialFn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 50))
      return n
    })
    const head = sequentialFn.execute(0)
    const rejected1 = sequentialFn.execute(1)
    const rejected2 = sequentialFn.execute(2)
    const rejected3 = sequentialFn.execute(3)
    const allSettled = Promise.allSettled([head, rejected1, rejected2, rejected3])
    await new Promise((r) => setTimeout(r, 5))
    sequentialFn.clear()
    const results = await allSettled
    const rejectionMessages = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason as Error).message)
    assertEquals(rejectionMessages.length, 3)
    for (const message of rejectionMessages) {
      assertEquals(message.includes('3 pending tasks were dropped'), true)
    }
  }
)

Deno.test('Sequential - clear should remove pending tasks and reject their promises', async () => {
  const executedValues: number[] = []
  const sequentialFn = createSequential(async (n: number) => {
    await new Promise((r) => setTimeout(r, 50))
    executedValues.push(n)
    return n
  })
  const promise1 = sequentialFn.execute(1)
  const promise2 = sequentialFn.execute(2)
  const promise3 = sequentialFn.execute(3)
  await new Promise((r) => setTimeout(r, 10))
  sequentialFn.clear()
  const results = await Promise.allSettled([promise1, promise2, promise3])
  const fulfilled = results.filter((r) => r.status === 'fulfilled')
  const rejected = results.filter((r) => r.status === 'rejected')
  assertEquals(fulfilled.length, 1)
  assertEquals(rejected.length, 2)
  assertEquals(executedValues, [1])
})

Deno.test('Sequential - concurrent clear during execution', async () => {
  let activeExecutionCount = 0
  const sequentialFn = createSequential(async (n: number) => {
    activeExecutionCount++
    await new Promise((r) => setTimeout(r, 50))
    activeExecutionCount--
    return n
  })
  const promise1 = sequentialFn.execute(1)
  const promise2 = sequentialFn.execute(2)
  await new Promise((r) => setTimeout(r, 10))
  sequentialFn.clear()
  const results = await Promise.allSettled([promise1, promise2])
  const fulfilled = results.filter((r) => r.status === 'fulfilled')
  const rejected = results.filter((r) => r.status === 'rejected')
  assertEquals(fulfilled.length, 1)
  assertEquals(rejected.length, 1)
  assertEquals(activeExecutionCount <= 1, true)
})

Deno.test('Sequential - empty function returns undefined', async () => {
  const sequentialFn = createSequential(async () => {
    await Promise.resolve()
    return undefined
  })
  const result = await sequentialFn.execute()
  assertEquals(result, undefined)
})

Deno.test('Sequential - execute after abort rejects subsequent calls', async () => {
  const abortController = new AbortController()
  const sequentialFn = createSequential(
    async (n: number) => {
      await Promise.resolve()
      return n
    },
    { signal: abortController.signal }
  )
  abortController.abort()
  await assertRejects(() => sequentialFn.execute(1), Error, 'AbortSignal was already aborted')
  await assertRejects(() => sequentialFn.execute(2), Error, 'AbortSignal was already aborted')
})

Deno.test(
  'Sequential - getPendingCount should return accurate queue size during execution',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const sequentialFn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 100))
      return n
    })
    assertEquals(sequentialFn.getPendingCount(), 0)
    const promises = [sequentialFn.execute(1), sequentialFn.execute(2), sequentialFn.execute(3)]
    await new Promise((r) => setTimeout(r, 10))
    const pendingCount = sequentialFn.getPendingCount()
    assertEquals(pendingCount >= 2 && pendingCount <= 3, true)
    await Promise.all(promises)
    assertEquals(sequentialFn.getPendingCount(), 0)
  }
)

Deno.test('Sequential - getPendingCount unaffected by isProcessing', async () => {
  const sequentialFn = createSequential(async (n: number) => {
    await new Promise((r) => setTimeout(r, 30))
    return n
  })
  const running = sequentialFn.execute(1)
  await new Promise((r) => setTimeout(r, 5))
  assertEquals(sequentialFn.getPendingCount(), 0)
  assertEquals(sequentialFn.isProcessing(), true)
  const queued = sequentialFn.execute(2)
  assertEquals(sequentialFn.getPendingCount(), 1)
  await Promise.allSettled([running, queued])
})

Deno.test('Sequential - handles circularObject reference safely', async () => {
  const sequentialFn = createSequential(async (obj: Record<string, unknown>) => {
    await Promise.resolve()
    return typeof obj
  })
  const circularObject: Record<string, unknown> = { a: 1 }
  circularObject['self'] = circularObject
  const result = await sequentialFn.execute(circularObject)
  assertEquals(result, 'object')
})

Deno.test('Sequential - handles deeply nestedObject object', async () => {
  const sequentialFn = createSequential(async (obj: Record<string, unknown>) => {
    await Promise.resolve()
    let objectDepth = 0
    let currentNode: unknown = obj
    while (currentNode && typeof currentNode === 'object' && 'child' in currentNode) {
      objectDepth++
      currentNode = (currentNode as Record<string, unknown>)['child']
    }
    return objectDepth
  })
  const nestedObject: Record<string, unknown> = {}
  let currentNode = nestedObject
  for (let i = 0; i < 1000; i++) {
    currentNode['child'] = {}
    currentNode = currentNode['child'] as Record<string, unknown>
  }
  const result = await sequentialFn.execute(nestedObject)
  assertEquals(result, 1000)
})

Deno.test('Sequential - handles prototype pollution attempt', async () => {
  const sequentialFn = createSequential(async (obj: Record<string, unknown>) => {
    await Promise.resolve()
    return Object.keys(obj)
  })
  const result = await sequentialFn.execute({
    normal: 'value',
    constructor: 'evil',
    __proto__: { polluted: true }
  })
  assertEquals(result.includes('normal'), true)
})

Deno.test('Sequential - handles Symbol as argument key', async () => {
  const sym = Symbol('test')
  const sequentialFn = createSequential(async (obj: Record<string | symbol, unknown>) => {
    await Promise.resolve()
    return obj[sym]
  })
  const result = await sequentialFn.execute({ [sym]: 'symbol-value' })
  assertEquals(result, 'symbol-value')
})

Deno.test('Sequential - handles very large argument', async () => {
  const sequentialFn = createSequential(async (data: string) => {
    await Promise.resolve()
    return data.length
  })
  const largeString = 'x'.repeat(1000000)
  const result = await sequentialFn.execute(largeString)
  assertEquals(result, 1000000)
})

Deno.test('Sequential - isProcessing reports false on idle instance', () => {
  const sequentialFn = createSequential(async (n: number) => {
    await Promise.resolve()
    return n
  })
  assertEquals(sequentialFn.isProcessing(), false)
})

Deno.test(
  'Sequential - isProcessing reports true during execution and false after drain',
  async () => {
    const sequentialFn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 50))
      return n
    })
    assertEquals(sequentialFn.isProcessing(), false)
    const pending = sequentialFn.execute(1)
    await new Promise((r) => setTimeout(r, 10))
    assertEquals(sequentialFn.isProcessing(), true)
    await pending
    assertEquals(sequentialFn.isProcessing(), false)
  }
)

Deno.test('Sequential - isProcessing returns false after clear', async () => {
  const sequentialFn = createSequential(async (n: number) => {
    await new Promise((r) => setTimeout(r, 50))
    return n
  })
  const pending = sequentialFn.execute(1)
  const dropped1 = sequentialFn.execute(2)
  const dropped2 = sequentialFn.execute(3)
  const allSettled = Promise.allSettled([pending, dropped1, dropped2])
  await new Promise((r) => setTimeout(r, 5))
  sequentialFn.clear()
  assertEquals(sequentialFn.getPendingCount(), 0)
  await allSettled
  await new Promise((r) => setTimeout(r, 60))
  assertEquals(sequentialFn.isProcessing(), false)
})

Deno.test('Sequential - maxQueueSize of zero does not reject execute calls', async () => {
  const sequentialFn = createSequential(
    async (n: number) => {
      await Promise.resolve()
      return n
    },
    { maxQueueSize: 0 }
  )
  const result = await sequentialFn.execute(1)
  assertEquals(result, 1)
})

Deno.test('Sequential - maxQueueSize rejects execute when queue is full', async () => {
  const sequentialFn = createSequential(
    async (n: number) => {
      await new Promise((r) => setTimeout(r, 50))
      return n
    },
    { maxQueueSize: 2 }
  )
  const running = sequentialFn.execute(1)
  const queued1 = sequentialFn.execute(2)
  const queued2 = sequentialFn.execute(3)
  await assertRejects(() => sequentialFn.execute(4), Error, 'queue is full')
  await Promise.allSettled([running, queued1, queued2])
})

Deno.test('Sequential - memory pressure with many items', async () => {
  const sequentialFn = createSequential(async (n: number) => {
    await Promise.resolve()
    const data = new Array(1000).fill(n)
    return data.reduce((a, b) => a + b, 0)
  })
  const results = await Promise.all(Array.from({ length: 100 }, (_, i) => sequentialFn.execute(i)))
  assertEquals(results.length, 100)
  assertEquals(
    results.every((r) => typeof r === 'number'),
    true
  )
})

Deno.test('Sequential - multiple instances should have isolated queues', async () => {
  const executionOrderA: string[] = []
  const executionOrderB: string[] = []
  const sequentialFnA = createSequential(async (id: string) => {
    await new Promise((r) => setTimeout(r, 20))
    executionOrderA.push(id)
    return `A-${id}`
  })
  const sequentialFnB = createSequential(async (id: string) => {
    await new Promise((r) => setTimeout(r, 10))
    executionOrderB.push(id)
    return `B-${id}`
  })
  const results = await Promise.all([
    sequentialFnA.execute('1'),
    sequentialFnB.execute('1'),
    sequentialFnA.execute('2'),
    sequentialFnB.execute('2')
  ])
  assertEquals(executionOrderA, ['1', '2'])
  assertEquals(executionOrderB, ['1', '2'])
  assertEquals(results, ['A-1', 'B-1', 'A-2', 'B-2'])
})

Deno.test(
  'Sequential - rapid clear and execute cycles',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const sequentialFn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 20))
      return n
    })
    for (let i = 0; i < 10; i++) {
      const promise1 = sequentialFn.execute(i)
      const promise2 = sequentialFn.execute(i + 100)
      sequentialFn.clear()
      await Promise.allSettled([promise1, promise2])
    }
  }
)

Deno.test('Sequential - should allow new execution after clear rejects pending', async () => {
  const sequentialFn = createSequential(async (n: number) => {
    await new Promise((r) => setTimeout(r, 10))
    return n * 2
  })
  const promise1 = sequentialFn.execute(1)
  await new Promise((r) => setTimeout(r, 0))
  sequentialFn.clear()
  const result = await Promise.allSettled([promise1])
  assertEquals(result[0].status === 'fulfilled' || result[0].status === 'rejected', true)
  const promise2 = sequentialFn.execute(2)
  assertEquals(await promise2, 4)
})

Deno.test(
  'Sequential - should complete long running operations over 200ms',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const sequentialFn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 200))
      return n
    })
    const start = performance.now()
    const result = await sequentialFn.execute(42)
    const elapsed = performance.now() - start
    assertEquals(result, 42)
    assertEquals(elapsed >= 190, true)
  }
)

Deno.test('Sequential - should continue processing queue after one task throws error', async () => {
  const order: string[] = []
  const sequentialFn = createSequential(async (id: string, shouldFail: boolean) => {
    await Promise.resolve()
    order.push(id)
    if (shouldFail) {
      throw new Error(`Error-${id}`)
    }
    return id
  })
  const results = await Promise.allSettled([
    sequentialFn.execute('A', false),
    sequentialFn.execute('B', true),
    sequentialFn.execute('C', false)
  ])
  assertEquals(order, ['A', 'B', 'C'])
  assertEquals(results[0].status, 'fulfilled')
  assertEquals(results[1].status, 'rejected')
  assertEquals(results[2].status, 'fulfilled')
})

Deno.test('Sequential - should handle Promise.reject returned from async function', async () => {
  const sequentialFn = createSequential(async (shouldReject: boolean) => {
    await new Promise((r) => setTimeout(r, 1))
    if (shouldReject) {
      return Promise.reject(new Error('rejected'))
    }
    return 'ok'
  })
  const results = await Promise.allSettled([
    sequentialFn.execute(false),
    sequentialFn.execute(true)
  ])
  assertEquals(results[0].status, 'fulfilled')
  assertEquals(results[1].status, 'rejected')
})

Deno.test('Sequential - should handle rapid 100 concurrent calls maintaining order', async () => {
  const order: number[] = []
  const sequentialFn = createSequential(async (n: number) => {
    await Promise.resolve()
    order.push(n)
    return n
  })
  const promises = []
  for (let i = 0; i < 100; i++) {
    promises.push(sequentialFn.execute(i))
  }
  await Promise.all(promises)
  assertEquals(
    order,
    Array.from({ length: 100 }, (_, i) => i)
  )
})

Deno.test('Sequential - should handle setTimeout zero delay correctly', async () => {
  const order: number[] = []
  const sequentialFn = createSequential(async (n: number) => {
    order.push(n)
    await new Promise((r) => setTimeout(r, 0))
    return n
  })
  const results = await Promise.all([
    sequentialFn.execute(1),
    sequentialFn.execute(2),
    sequentialFn.execute(3)
  ])
  assertEquals(order, [1, 2, 3])
  assertEquals(results, [1, 2, 3])
})

Deno.test(
  'Sequential - should handle unhandled promise rejection inside function',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    let executedValues = 0
    const sequentialFn = createSequential(async () => {
      await Promise.resolve()
      executedValues++
      void new Promise((_, reject) => {
        setTimeout(() => reject(new Error('unhandled')), 1)
      }).catch(() => {})
      return executedValues
    })
    const result = await sequentialFn.execute()
    assertEquals(result, 1)
    assertEquals(executedValues, 1)
  }
)

Deno.test('Sequential - should maintain correct microtask execution ordering', async () => {
  const order: string[] = []
  const sequentialFn = createSequential(async (id: string) => {
    order.push(`sequentialFn-${id}`)
    await Promise.resolve()
    order.push(`resolved-${id}`)
    return id
  })
  const promise1 = sequentialFn.execute('A')
  order.push('after-A-call')
  const promise2 = sequentialFn.execute('B')
  order.push('after-B-call')
  await Promise.all([promise1, promise2])
  assertEquals(order.indexOf('sequentialFn-A') < order.indexOf('resolved-A'), true)
  assertEquals(order.indexOf('sequentialFn-B') < order.indexOf('resolved-B'), true)
})

Deno.test(
  'Sequential - should maintain execution order with mixed resolve and reject',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const order: string[] = []
    let taskCounter = 0
    const sequentialFn = createSequential(async () => {
      const id = taskCounter++
      order.push(`start-${id}`)
      await new Promise((r) => setTimeout(r, 10))
      order.push(`end-${id}`)
      if (id % 2 === 1) {
        throw new Error(`odd-${id}`)
      }
      return `even-${id}`
    })
    const promises = Array.from({ length: 5 }, () => sequentialFn.execute())
    const results = await Promise.allSettled(promises)
    assertEquals(order, [
      'start-0',
      'end-0',
      'start-1',
      'end-1',
      'start-2',
      'end-2',
      'start-3',
      'end-3',
      'start-4',
      'end-4'
    ])
    assertEquals(results[0]!.status, 'fulfilled')
    assertEquals((results[0] as PromiseFulfilledResult<string>).value, 'even-0')
    assertEquals(results[1]!.status, 'rejected')
    assertEquals(results[2]!.status, 'fulfilled')
    assertEquals(results[3]!.status, 'rejected')
    assertEquals(results[4]!.status, 'fulfilled')
  }
)

Deno.test('Sequential - should pass all arguments correctly to wrapped function', async () => {
  const received: unknown[][] = []
  const sequentialFn = createSequential(async (...args: unknown[]) => {
    await Promise.resolve()
    received.push(args)
    return args.length
  })
  await sequentialFn.execute(1, 'two', { three: true }, [4])
  assertEquals(received.length, 1)
  assertEquals(received[0], [1, 'two', { three: true }, [4]])
})

Deno.test('Sequential - should preserve this context binding in wrapped function', async () => {
  const sequentialFn = createSequential(async function (this: unknown) {
    await Promise.resolve()
    return this !== undefined
  })
  const result = await sequentialFn.execute()
  assertEquals(result, true)
})

Deno.test('Sequential - should process concurrent calls in FIFO order', async () => {
  const order: number[] = []
  const sequentialFn = createSequential(async (n: number) => {
    await new Promise((r) => setTimeout(r, 10))
    order.push(n)
    return n * 2
  })
  const results = await Promise.all([
    sequentialFn.execute(1),
    sequentialFn.execute(2),
    sequentialFn.execute(3)
  ])
  assertEquals(order, [1, 2, 3])
  assertEquals(results, [2, 4, 6])
})

Deno.test('Sequential - should properly reject when function throws immediately', async () => {
  const sequentialFn = createSequential(async () => {
    await Promise.resolve()
    throw new Error('immediate')
  })
  await assertRejects(() => sequentialFn.execute(), Error, 'immediate')
})

Deno.test('Sequential - should recover state when error occurs in middle of queue', async () => {
  let taskCounter = 0
  const sequentialFn = createSequential(async () => {
    await Promise.resolve()
    taskCounter++
    if (taskCounter === 2) {
      throw new Error('middle')
    }
    return taskCounter
  })
  const result1 = sequentialFn.execute()
  const result2 = sequentialFn.execute()
  const result3 = sequentialFn.execute()
  assertEquals(await result1, 1)
  await assertRejects(() => result2)
  assertEquals(await result3, 3)
})

Deno.test('Sequential - should reject delayed async errors in order', async () => {
  const sequentialFn = createSequential(async (failAfter: number) => {
    await new Promise((r) => setTimeout(r, failAfter))
    throw new Error(`delayed-${failAfter}`)
  })
  const results = await Promise.allSettled([
    sequentialFn.execute(10),
    sequentialFn.execute(5),
    sequentialFn.execute(1)
  ])
  assertEquals(results[0]!.status, 'rejected')
  assertEquals(results[1]!.status, 'rejected')
  assertEquals(results[2]!.status, 'rejected')
})

Deno.test('Sequential - should reject non-Error throws like strings', async () => {
  const sequentialFn = createSequential(async (shouldThrow: string) => {
    await Promise.resolve()
    if (shouldThrow) {
      throw shouldThrow
    }
    return 'ok'
  })
  const results = await Promise.allSettled([
    sequentialFn.execute(''),
    sequentialFn.execute('string-error'),
    sequentialFn.execute('')
  ])
  assertEquals(results[0].status, 'fulfilled')
  assertEquals(results[1].status, 'rejected')
  assertEquals(results[2].status, 'fulfilled')
})

Deno.test('Sequential - should serialize slow operations blocking subsequent calls', async () => {
  const executionTimestamps: number[] = []
  const sequentialFn = createSequential(async () => {
    executionTimestamps.push(performance.now())
    await new Promise((r) => setTimeout(r, 50))
    return executionTimestamps.length
  })
  const start = performance.now()
  await Promise.all([sequentialFn.execute(), sequentialFn.execute(), sequentialFn.execute()])
  const elapsed = performance.now() - start
  assertEquals(executionTimestamps.length, 3)
  assertEquals(elapsed >= 150, true)
})

Deno.test('Sequential - should support nestedObject sequential executors', async () => {
  const outerExecutionOrder: string[] = []
  const innerSequential = createSequential(async (id: string) => {
    await new Promise((r) => setTimeout(r, 10))
    return `inner-${id}`
  })
  const outerSequential = createSequential(async (id: string) => {
    outerExecutionOrder.push(`start-${id}`)
    const innerResult = await innerSequential.execute(id)
    outerExecutionOrder.push(`end-${id}`)
    return `outer-${id}-${innerResult}`
  })
  const results = await Promise.all([outerSequential.execute('A'), outerSequential.execute('B')])
  assertEquals(outerExecutionOrder, ['start-A', 'end-A', 'start-B', 'end-B'])
  assertEquals(results, ['outer-A-inner-A', 'outer-B-inner-B'])
})

Deno.test('Sequential - stress test burst of 100 rapid calls', async () => {
  const executionDelays: number[] = []
  const sequentialFn = createSequential(async (n: number) => {
    const start = performance.now()
    await new Promise((r) => setTimeout(r, 1))
    const end = performance.now()
    executionDelays.push(end - start)
    return n
  })
  const promises = Array.from({ length: 100 }, (_, i) => sequentialFn.execute(i))
  await Promise.all(promises)
  assertEquals(executionDelays.length, 100)
  assertEquals(
    executionDelays.every((d) => d >= 0),
    true
  )
})

Deno.test('Sequential - stress test chaining 500 sequential awaits', async () => {
  let pendingCount = 0
  const sequentialFn = createSequential(async () => {
    pendingCount++
    await new Promise((r) => setTimeout(r, 1))
    return pendingCount
  })
  for (let i = 0; i < 500; i++) {
    await sequentialFn.execute()
  }
  assertEquals(pendingCount, 500)
})

Deno.test(
  'Sequential - stress test concurrent calls from multiple Promise.all sources',
  async () => {
    const sequentialFn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 5))
      return n * 2
    })
    const results = await Promise.all([
      Promise.all(Array.from({ length: 50 }, (_, i) => sequentialFn.execute(i))),
      Promise.all(Array.from({ length: 50 }, (_, i) => sequentialFn.execute(i + 50))),
      Promise.all(Array.from({ length: 50 }, (_, i) => sequentialFn.execute(i + 100)))
    ])
    const flattenedResults = results.flat()
    assertEquals(flattenedResults.length, 150)
    assertEquals(new Set(flattenedResults).size, 150)
  }
)

Deno.test('Sequential - stress test with 10000 queued items', async () => {
  const order: number[] = []
  const sequentialFn = createSequential(async (n: number) => {
    await Promise.resolve()
    order.push(n)
    return n
  })
  const promises = Array.from({ length: 10000 }, (_, i) => sequentialFn.execute(i))
  const results = await Promise.all(promises)
  assertEquals(order.length, 10000)
  assertEquals(
    order.every((n, i) => n === i),
    true
  )
  assertEquals(
    results,
    Array.from({ length: 10000 }, (_, i) => i)
  )
})

Deno.test('Sequential - throws when targetFunction is not a function', () => {
  assertThrows(() => createSequential(null as unknown as () => Promise<void>), TypeError)
  assertThrows(() => createSequential(42 as unknown as () => Promise<void>), TypeError)
})

Deno.test(
  'Sequential - timeoutMs does not affect fast tasks',
  async () => {
    const sequentialFn = createSequential(
      async (n: number) => {
        await Promise.resolve()
        return n * 2
      },
      { timeoutMs: 1000 }
    )
    const result = await sequentialFn.execute(5)
    assertEquals(result, 10)
  }
)

Deno.test(
  'Sequential - timeoutMs rejects slow tasks but continues queue',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const sequentialFn = createSequential(
      async (delayMs: number) => {
        await new Promise((r) => setTimeout(r, delayMs))
        return delayMs
      },
      { timeoutMs: 30 }
    )
    const results = await Promise.allSettled([
      sequentialFn.execute(5),
      sequentialFn.execute(200),
      sequentialFn.execute(5)
    ])
    assertEquals(results[0]?.status, 'fulfilled')
    assertEquals(results[1]?.status, 'rejected')
    assertEquals(
      ((results[1] as PromiseRejectedResult).reason as Error).message.includes('timed out'),
      true
    )
    assertEquals(results[2]?.status, 'fulfilled')
  }
)
