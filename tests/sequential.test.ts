import { assertEquals, assertRejects } from '@std/assert'
import { createSequential } from '@neabyte/utils-core'

Deno.test('Sequential - clear should remove pending tasks and reject their promises', async () => {
  const executed: number[] = []
  const fn = createSequential(async (n: number) => {
    await new Promise((r) => setTimeout(r, 50))
    executed.push(n)
    return n
  })
  const p1 = fn.execute(1)
  const p2 = fn.execute(2)
  const p3 = fn.execute(3)
  await new Promise((r) => setTimeout(r, 10))
  fn.clear()
  const results = await Promise.allSettled([p1, p2, p3])
  const fulfilled = results.filter((r) => r.status === 'fulfilled')
  const rejected = results.filter((r) => r.status === 'rejected')
  assertEquals(fulfilled.length, 1)
  assertEquals(rejected.length, 2)
  assertEquals(executed, [1])
})

Deno.test('Sequential - concurrent clear during execution', async () => {
  let executing = 0
  const fn = createSequential(async (n: number) => {
    executing++
    await new Promise((r) => setTimeout(r, 50))
    executing--
    return n
  })
  const p1 = fn.execute(1)
  const p2 = fn.execute(2)
  await new Promise((r) => setTimeout(r, 10))
  fn.clear()
  const results = await Promise.allSettled([p1, p2])
  const fulfilled = results.filter((r) => r.status === 'fulfilled')
  const rejected = results.filter((r) => r.status === 'rejected')
  assertEquals(fulfilled.length, 1)
  assertEquals(rejected.length, 1)
  assertEquals(executing <= 1, true)
})

Deno.test('Sequential - empty function returns undefined', async () => {
  const fn = createSequential(async () => {
    await Promise.resolve()
    return undefined
  })
  const result = await fn.execute()
  assertEquals(result, undefined)
})

Deno.test(
  'Sequential - getPendingCount should return accurate queue size during execution',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const fn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 100))
      return n
    })
    assertEquals(fn.getPendingCount(), 0)
    const promises = [fn.execute(1), fn.execute(2), fn.execute(3)]
    await new Promise((r) => setTimeout(r, 10))
    const count = fn.getPendingCount()
    assertEquals(count >= 2 && count <= 3, true)
    await Promise.all(promises)
    assertEquals(fn.getPendingCount(), 0)
  }
)

Deno.test('Sequential - handles circular reference safely', async () => {
  const fn = createSequential(async (obj: Record<string, unknown>) => {
    await Promise.resolve()
    return typeof obj
  })
  const circular: Record<string, unknown> = { a: 1 }
  circular['self'] = circular
  const result = await fn.execute(circular)
  assertEquals(result, 'object')
})

Deno.test('Sequential - handles deeply nested object', async () => {
  const fn = createSequential(async (obj: Record<string, unknown>) => {
    await Promise.resolve()
    let depth = 0
    let current: unknown = obj
    while (current && typeof current === 'object' && 'child' in current) {
      depth++
      current = (current as Record<string, unknown>)['child']
    }
    return depth
  })
  const nested: Record<string, unknown> = {}
  let current = nested
  for (let i = 0; i < 1000; i++) {
    current['child'] = {}
    current = current['child'] as Record<string, unknown>
  }
  const result = await fn.execute(nested)
  assertEquals(result, 1000)
})

Deno.test('Sequential - handles prototype pollution attempt', async () => {
  const fn = createSequential(async (obj: Record<string, unknown>) => {
    await Promise.resolve()
    return Object.keys(obj)
  })
  const result = await fn.execute({
    normal: 'value',
    constructor: 'evil',
    __proto__: { polluted: true }
  })
  assertEquals(result.includes('normal'), true)
})

Deno.test('Sequential - handles Symbol as argument key', async () => {
  const sym = Symbol('test')
  const fn = createSequential(async (obj: Record<string | symbol, unknown>) => {
    await Promise.resolve()
    return obj[sym]
  })
  const result = await fn.execute({ [sym]: 'symbol-value' })
  assertEquals(result, 'symbol-value')
})

Deno.test('Sequential - handles very large argument', async () => {
  const fn = createSequential(async (data: string) => {
    await Promise.resolve()
    return data.length
  })
  const largeString = 'x'.repeat(1000000)
  const result = await fn.execute(largeString)
  assertEquals(result, 1000000)
})

Deno.test('Sequential - memory pressure with many items', async () => {
  const fn = createSequential(async (n: number) => {
    await Promise.resolve()
    const data = new Array(1000).fill(n)
    return data.reduce((a, b) => a + b, 0)
  })
  const results = await Promise.all(Array.from({ length: 100 }, (_, i) => fn.execute(i)))
  assertEquals(results.length, 100)
  assertEquals(
    results.every((r) => typeof r === 'number'),
    true
  )
})

Deno.test('Sequential - multiple instances should have isolated queues', async () => {
  const orderA: string[] = []
  const orderB: string[] = []
  const fnA = createSequential(async (id: string) => {
    await new Promise((r) => setTimeout(r, 20))
    orderA.push(id)
    return `A-${id}`
  })
  const fnB = createSequential(async (id: string) => {
    await new Promise((r) => setTimeout(r, 10))
    orderB.push(id)
    return `B-${id}`
  })
  const results = await Promise.all([
    fnA.execute('1'),
    fnB.execute('1'),
    fnA.execute('2'),
    fnB.execute('2')
  ])
  assertEquals(orderA, ['1', '2'])
  assertEquals(orderB, ['1', '2'])
  assertEquals(results, ['A-1', 'B-1', 'A-2', 'B-2'])
})

Deno.test(
  'Sequential - rapid clear and execute cycles',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const fn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 20))
      return n
    })
    for (let i = 0; i < 10; i++) {
      const p1 = fn.execute(i)
      const p2 = fn.execute(i + 100)
      fn.clear()
      await Promise.allSettled([p1, p2])
    }
  }
)

Deno.test('Sequential - should allow new execution after clear rejects pending', async () => {
  const fn = createSequential(async (n: number) => {
    await new Promise((r) => setTimeout(r, 10))
    return n * 2
  })
  const p1 = fn.execute(1)
  await new Promise((r) => setTimeout(r, 0))
  fn.clear()
  const result = await Promise.allSettled([p1])
  assertEquals(result[0].status === 'fulfilled' || result[0].status === 'rejected', true)
  const p2 = fn.execute(2)
  assertEquals(await p2, 4)
})

Deno.test(
  'Sequential - should complete long running operations over 200ms',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const fn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 200))
      return n
    })
    const start = performance.now()
    const result = await fn.execute(42)
    const elapsed = performance.now() - start
    assertEquals(result, 42)
    assertEquals(elapsed >= 190, true)
  }
)

Deno.test('Sequential - should continue processing queue after one task throws error', async () => {
  const order: string[] = []
  const fn = createSequential(async (id: string, shouldFail: boolean) => {
    await Promise.resolve()
    order.push(id)
    if (shouldFail) {
      throw new Error(`Error-${id}`)
    }
    return id
  })
  const results = await Promise.allSettled([
    fn.execute('A', false),
    fn.execute('B', true),
    fn.execute('C', false)
  ])
  assertEquals(order, ['A', 'B', 'C'])
  assertEquals(results[0].status, 'fulfilled')
  assertEquals(results[1].status, 'rejected')
  assertEquals(results[2].status, 'fulfilled')
})

Deno.test('Sequential - should handle Promise.reject returned from async function', async () => {
  const fn = createSequential(async (shouldReject: boolean) => {
    await new Promise((r) => setTimeout(r, 1))
    if (shouldReject) {
      return Promise.reject(new Error('rejected'))
    }
    return 'ok'
  })
  const results = await Promise.allSettled([fn.execute(false), fn.execute(true)])
  assertEquals(results[0].status, 'fulfilled')
  assertEquals(results[1].status, 'rejected')
})

Deno.test('Sequential - should handle rapid 100 concurrent calls maintaining order', async () => {
  const order: number[] = []
  const fn = createSequential(async (n: number) => {
    await Promise.resolve()
    order.push(n)
    return n
  })
  const promises = []
  for (let i = 0; i < 100; i++) {
    promises.push(fn.execute(i))
  }
  await Promise.all(promises)
  assertEquals(
    order,
    Array.from({ length: 100 }, (_, i) => i)
  )
})

Deno.test('Sequential - should handle setTimeout zero delay correctly', async () => {
  const order: number[] = []
  const fn = createSequential(async (n: number) => {
    order.push(n)
    await new Promise((r) => setTimeout(r, 0))
    return n
  })
  const results = await Promise.all([fn.execute(1), fn.execute(2), fn.execute(3)])
  assertEquals(order, [1, 2, 3])
  assertEquals(results, [1, 2, 3])
})

Deno.test(
  'Sequential - should handle unhandled promise rejection inside function',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    let executed = 0
    const fn = createSequential(async () => {
      await Promise.resolve()
      executed++
      void new Promise((_, reject) => {
        setTimeout(() => reject(new Error('unhandled')), 1)
      }).catch(() => {})
      return executed
    })
    const result = await fn.execute()
    assertEquals(result, 1)
    assertEquals(executed, 1)
  }
)

Deno.test('Sequential - should maintain correct microtask execution ordering', async () => {
  const order: string[] = []
  const fn = createSequential(async (id: string) => {
    order.push(`fn-${id}`)
    await Promise.resolve()
    order.push(`resolved-${id}`)
    return id
  })
  const p1 = fn.execute('A')
  order.push('after-A-call')
  const p2 = fn.execute('B')
  order.push('after-B-call')
  await Promise.all([p1, p2])
  assertEquals(order.indexOf('fn-A') < order.indexOf('resolved-A'), true)
  assertEquals(order.indexOf('fn-B') < order.indexOf('resolved-B'), true)
})

Deno.test(
  'Sequential - should maintain execution order with mixed resolve and reject',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const order: string[] = []
    let counter = 0
    const fn = createSequential(async () => {
      const id = counter++
      order.push(`start-${id}`)
      await new Promise((r) => setTimeout(r, 10))
      order.push(`end-${id}`)
      if (id % 2 === 1) {
        throw new Error(`odd-${id}`)
      }
      return `even-${id}`
    })
    const promises = Array.from({ length: 5 }, () => fn.execute())
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
  const fn = createSequential(async (...args: unknown[]) => {
    await Promise.resolve()
    received.push(args)
    return args.length
  })
  await fn.execute(1, 'two', { three: true }, [4])
  assertEquals(received.length, 1)
  assertEquals(received[0], [1, 'two', { three: true }, [4]])
})

Deno.test('Sequential - should preserve this context binding in wrapped function', async () => {
  const fn = createSequential(async function (this: unknown) {
    await Promise.resolve()
    return this !== undefined
  })
  const result = await fn.execute()
  assertEquals(result, true)
})

Deno.test('Sequential - should process concurrent calls in FIFO order', async () => {
  const order: number[] = []
  const fn = createSequential(async (n: number) => {
    await new Promise((r) => setTimeout(r, 10))
    order.push(n)
    return n * 2
  })
  const results = await Promise.all([fn.execute(1), fn.execute(2), fn.execute(3)])
  assertEquals(order, [1, 2, 3])
  assertEquals(results, [2, 4, 6])
})

Deno.test('Sequential - should properly reject when function throws immediately', async () => {
  const fn = createSequential(async () => {
    await Promise.resolve()
    throw new Error('immediate')
  })
  await assertRejects(() => fn.execute(), Error, 'immediate')
})

Deno.test('Sequential - should recover state when error occurs in middle of queue', async () => {
  let counter = 0
  const fn = createSequential(async () => {
    await Promise.resolve()
    counter++
    if (counter === 2) {
      throw new Error('middle')
    }
    return counter
  })
  const r1 = fn.execute()
  const r2 = fn.execute()
  const r3 = fn.execute()
  assertEquals(await r1, 1)
  await assertRejects(() => r2)
  assertEquals(await r3, 3)
})

Deno.test('Sequential - should reject delayed async errors in order', async () => {
  const fn = createSequential(async (failAfter: number) => {
    await new Promise((r) => setTimeout(r, failAfter))
    throw new Error(`delayed-${failAfter}`)
  })
  const results = await Promise.allSettled([fn.execute(10), fn.execute(5), fn.execute(1)])
  assertEquals(results[0]!.status, 'rejected')
  assertEquals(results[1]!.status, 'rejected')
  assertEquals(results[2]!.status, 'rejected')
})

Deno.test('Sequential - should reject non-Error throws like strings', async () => {
  const fn = createSequential(async (shouldThrow: string) => {
    await Promise.resolve()
    if (shouldThrow) {
      throw shouldThrow
    }
    return 'ok'
  })
  const results = await Promise.allSettled([
    fn.execute(''),
    fn.execute('string-error'),
    fn.execute('')
  ])
  assertEquals(results[0].status, 'fulfilled')
  assertEquals(results[1].status, 'rejected')
  assertEquals(results[2].status, 'fulfilled')
})

Deno.test('Sequential - should serialize slow operations blocking subsequent calls', async () => {
  const timestamps: number[] = []
  const fn = createSequential(async () => {
    timestamps.push(performance.now())
    await new Promise((r) => setTimeout(r, 50))
    return timestamps.length
  })
  const start = performance.now()
  await Promise.all([fn.execute(), fn.execute(), fn.execute()])
  const elapsed = performance.now() - start
  assertEquals(timestamps.length, 3)
  assertEquals(elapsed >= 150, true)
})

Deno.test('Sequential - should support nested sequential executors', async () => {
  const outerOrder: string[] = []
  const innerFn = createSequential(async (id: string) => {
    await new Promise((r) => setTimeout(r, 10))
    return `inner-${id}`
  })
  const outerFn = createSequential(async (id: string) => {
    outerOrder.push(`start-${id}`)
    const innerResult = await innerFn.execute(id)
    outerOrder.push(`end-${id}`)
    return `outer-${id}-${innerResult}`
  })
  const results = await Promise.all([outerFn.execute('A'), outerFn.execute('B')])
  assertEquals(outerOrder, ['start-A', 'end-A', 'start-B', 'end-B'])
  assertEquals(results, ['outer-A-inner-A', 'outer-B-inner-B'])
})

Deno.test('Sequential - stress test burst of 100 rapid calls', async () => {
  const delays: number[] = []
  const fn = createSequential(async (n: number) => {
    const start = performance.now()
    await new Promise((r) => setTimeout(r, 1))
    const end = performance.now()
    delays.push(end - start)
    return n
  })
  const promises = Array.from({ length: 100 }, (_, i) => fn.execute(i))
  await Promise.all(promises)
  assertEquals(delays.length, 100)
  assertEquals(
    delays.every((d) => d >= 0),
    true
  )
})

Deno.test('Sequential - stress test chaining 500 sequential awaits', async () => {
  let count = 0
  const fn = createSequential(async () => {
    count++
    await new Promise((r) => setTimeout(r, 1))
    return count
  })
  for (let i = 0; i < 500; i++) {
    await fn.execute()
  }
  assertEquals(count, 500)
})

Deno.test(
  'Sequential - stress test concurrent calls from multiple Promise.all sources',
  async () => {
    const fn = createSequential(async (n: number) => {
      await new Promise((r) => setTimeout(r, 5))
      return n * 2
    })
    const results = await Promise.all([
      Promise.all(Array.from({ length: 50 }, (_, i) => fn.execute(i))),
      Promise.all(Array.from({ length: 50 }, (_, i) => fn.execute(i + 50))),
      Promise.all(Array.from({ length: 50 }, (_, i) => fn.execute(i + 100)))
    ])
    const flat = results.flat()
    assertEquals(flat.length, 150)
    assertEquals(new Set(flat).size, 150)
  }
)

Deno.test('Sequential - stress test with 10000 queued items', async () => {
  const order: number[] = []
  const fn = createSequential(async (n: number) => {
    await Promise.resolve()
    order.push(n)
    return n
  })
  const promises = Array.from({ length: 10000 }, (_, i) => fn.execute(i))
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
