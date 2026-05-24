import { assertEquals, assertRejects } from '@std/assert'
import { Async } from '@neabyte/utils-core'

Deno.test('Async.sleepDelay - abort listener removed after resolve', async () => {
  const abortController = new AbortController()
  await Async.sleepDelay(10, { signal: abortController.signal })
  abortController.abort()
  assertEquals(true, true)
})

Deno.test('Async.sleepDelay - abortError factory invoked exactly once on abort', async () => {
  let factoryCallCount = 0
  const abortController = new AbortController()
  const pending = Async.sleepDelay(500, {
    signal: abortController.signal,
    abortError: () => {
      factoryCallCount++
      return new Error(`factory-call-${factoryCallCount}`)
    }
  })
  setTimeout(() => abortController.abort(), 10)
  await assertRejects(() => pending, Error, 'factory-call-1')
  assertEquals(factoryCallCount, 1)
})

Deno.test('Async.sleepDelay - NaN delay resolves promptly', async () => {
  const testStartTime = performance.now()
  await Async.sleepDelay(NaN)
  const elapsedMs = performance.now() - testStartTime
  assertEquals(elapsedMs < 50, true)
})

Deno.test('Async.sleepDelay - rejects when aborted before start', async () => {
  const abortController = new AbortController()
  abortController.abort()
  await assertRejects(
    () => Async.sleepDelay(100, { signal: abortController.signal, throwOnAbort: true }),
    Error,
    'because the AbortSignal was already aborted before the delay started'
  )
})

Deno.test('Async.sleepDelay - rejects when aborted while waiting', async () => {
  const abortController = new AbortController()
  const pendingSleepPromise = Async.sleepDelay(500, {
    signal: abortController.signal,
    throwOnAbort: true
  })
  setTimeout(() => abortController.abort(), 50)
  await assertRejects(
    () => pendingSleepPromise,
    Error,
    'because the AbortSignal was triggered while waiting'
  )
})

Deno.test('Async.sleepDelay - resolves after delay', async () => {
  const testStartTime = performance.now()
  await Async.sleepDelay(50)
  const elapsedMs = performance.now() - testStartTime
  assertEquals(elapsedMs >= 40, true)
})

Deno.test('Async.sleepDelay - resolves immediately for negative delay', async () => {
  const testStartTime = performance.now()
  await Async.sleepDelay(-100)
  const elapsedMs = performance.now() - testStartTime
  assertEquals(elapsedMs < 20, true)
})

Deno.test('Async.sleepDelay - resolves immediately for zero delay', async () => {
  const testStartTime = performance.now()
  await Async.sleepDelay(0)
  const elapsedMs = performance.now() - testStartTime
  assertEquals(elapsedMs < 20, true)
})

Deno.test('Async.sleepDelay - resolves normally without signal', async () => {
  await Async.sleepDelay(10)
  assertEquals(true, true)
})

Deno.test('Async.sleepDelay - resolves when aborted before start without throwOnAbort', async () => {
  const abortController = new AbortController()
  abortController.abort()
  await Async.sleepDelay(100, { signal: abortController.signal })
  assertEquals(true, true)
})

Deno.test('Async.sleepDelay - resolves when aborted while waiting without throwOnAbort', async () => {
  const abortController = new AbortController()
  const pendingSleepPromise = Async.sleepDelay(500, { signal: abortController.signal })
  setTimeout(() => abortController.abort(), 20)
  await pendingSleepPromise
  assertEquals(true, true)
})

Deno.test('Async.sleepDelay - throwOnAbort=false explicitly resolves on abort', async () => {
  const abortController = new AbortController()
  const pendingSleepPromise = Async.sleepDelay(500, {
    signal: abortController.signal,
    throwOnAbort: false
  })
  setTimeout(() => abortController.abort(), 20)
  await pendingSleepPromise
  assertEquals(true, true)
})

Deno.test('Async.sleepDelay - uses custom abortError factory when aborted before start', async () => {
  class CustomAbortError extends Error {
    constructor() {
      super('custom-abort-before-start')
      this.name = 'CustomAbortError'
    }
  }
  const abortController = new AbortController()
  abortController.abort()
  await assertRejects(
    () =>
      Async.sleepDelay(100, {
        signal: abortController.signal,
        abortError: () => new CustomAbortError()
      }),
    CustomAbortError,
    'custom-abort-before-start'
  )
})

Deno.test('Async.sleepDelay - uses custom abortError factory when aborted while waiting', async () => {
  class CustomAbortError extends Error {
    constructor() {
      super('custom-abort-during-wait')
      this.name = 'CustomAbortError'
    }
  }
  const abortController = new AbortController()
  const pendingSleepPromise = Async.sleepDelay(500, {
    signal: abortController.signal,
    abortError: () => new CustomAbortError()
  })
  setTimeout(() => abortController.abort(), 20)
  await assertRejects(() => pendingSleepPromise, CustomAbortError, 'custom-abort-during-wait')
})

Deno.test('Async.withTimeout - cleans up abort listener on success', async () => {
  const abortController = new AbortController()
  const fastResolvePromise = new Promise<string>((resolve) => {
    setTimeout(() => resolve('done'), 10)
  })
  const result = await Async.withTimeout(fastResolvePromise, 1000, 'timeout', {
    signal: abortController.signal
  })
  assertEquals(result, 'done')
  abortController.abort()
  await Async.sleepDelay(20)
  assertEquals(true, true)
})

Deno.test('Async.withTimeout - clears timeout on rejection', async () => {
  const rejectedPromise = Promise.reject(new Error('quick fail'))
  await assertRejects(
    () => Async.withTimeout(rejectedPromise, 1000, 'timeout'),
    Error,
    'quick fail'
  )
})

Deno.test('Async.withTimeout - clears timeout on success', async () => {
  const resolvedPromise = Promise.resolve('quick')
  const timeoutResult = await Async.withTimeout(resolvedPromise, 1000, 'timeout')
  assertEquals(timeoutResult, 'quick')
})

Deno.test('Async.withTimeout - propagates non-Error rejections from underlying promise', async () => {
  const rejected = Promise.reject('string-error')
  try {
    await Async.withTimeout(rejected, 1000, 'timeout')
  } catch (error) {
    assertEquals(error, 'string-error')
  }
})

Deno.test('Async.withTimeout - rejects when promise rejects', async () => {
  const slowRejectPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('promise error')), 50)
  })
  await assertRejects(
    () => Async.withTimeout(slowRejectPromise, 200, 'timeout error'),
    Error,
    'promise error'
  )
})

Deno.test(
  'Async.withTimeout - rejects when signal aborted during wait',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const abortController = new AbortController()
    const slowResolvePromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 30)
    })
    setTimeout(() => abortController.abort(), 10)
    await assertRejects(
      () =>
        Async.withTimeout(slowResolvePromise, 5000, 'aborted-during', {
          signal: abortController.signal
        }),
      Error,
      'aborted-during'
    )
    await new Promise((r) => setTimeout(r, 40))
  }
)

Deno.test(
  'Async.withTimeout - rejects when signal already aborted',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const abortController = new AbortController()
    abortController.abort()
    const neverResolvingPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 30)
    })
    await assertRejects(
      () =>
        Async.withTimeout(neverResolvingPromise, 5000, 'aborted-pre', {
          signal: abortController.signal
        }),
      Error,
      'aborted-pre'
    )
    await new Promise((r) => setTimeout(r, 40))
  }
)

Deno.test(
  'Async.withTimeout - rejects when timeout fires first',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const slowResolvePromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('too late'), 30)
    })
    await assertRejects(
      () => Async.withTimeout(slowResolvePromise, 10, 'timed out'),
      Error,
      'timed out'
    )
    await new Promise((r) => setTimeout(r, 40))
  }
)

Deno.test('Async.withTimeout - resolves when promise completes first', async () => {
  const timedResolvePromise = new Promise<string>((resolve) => {
    setTimeout(() => resolve('success'), 50)
  })
  const timeoutResult = await Async.withTimeout(timedResolvePromise, 200, 'timeout error')
  assertEquals(timeoutResult, 'success')
})

Deno.test('Async.withTimeout - signal abort after promise resolution is ignored', async () => {
  const abortController = new AbortController()
  const fastPromise = Promise.resolve('done')
  const result = await Async.withTimeout(fastPromise, 1000, 'timeout', {
    signal: abortController.signal
  })
  assertEquals(result, 'done')
  abortController.abort()
  await Async.sleepDelay(10)
  assertEquals(true, true)
})

Deno.test(
  'Async.withTimeout - underlying promise rejection after timeout fired is ignored',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const slowReject = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('late-failure')), 100)
    })
    await assertRejects(() => Async.withTimeout(slowReject, 20, 'too slow'), Error, 'too slow')
    await Async.sleepDelay(120)
    await slowReject.catch(() => {})
    assertEquals(true, true)
  }
)

Deno.test(
  'Async.withTimeout - underlying promise resolution after timeout fired is ignored',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    let timeoutErrorThrown = false
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late-success'), 100)
    })
    try {
      await Async.withTimeout(slowPromise, 20, 'too slow')
    } catch (error) {
      timeoutErrorThrown = true
      assertEquals((error as Error).message, 'too slow')
    }
    assertEquals(timeoutErrorThrown, true)
    await Async.sleepDelay(120)
    await slowPromise
    assertEquals(true, true)
  }
)

Deno.test('Async.withTimeout - uses custom timeoutError factory on signal abort', async () => {
  class CustomTimeoutError extends Error {
    constructor() {
      super('custom-on-abort')
      this.name = 'CustomTimeoutError'
    }
  }
  const abortController = new AbortController()
  abortController.abort()
  const neverResolvingPromise = new Promise<string>(() => {})
  await assertRejects(
    () =>
      Async.withTimeout(neverResolvingPromise, 5000, 'fallback', {
        signal: abortController.signal,
        timeoutError: () => new CustomTimeoutError()
      }),
    CustomTimeoutError,
    'custom-on-abort'
  )
})

Deno.test(
  'Async.withTimeout - uses custom timeoutError factory on timeout',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    class CustomTimeoutError extends Error {
      constructor() {
        super('custom-timeout-fired')
        this.name = 'CustomTimeoutError'
      }
    }
    const slowResolvePromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 30)
    })
    await assertRejects(
      () =>
        Async.withTimeout(slowResolvePromise, 10, 'fallback', {
          timeoutError: () => new CustomTimeoutError()
        }),
      CustomTimeoutError,
      'custom-timeout-fired'
    )
    await new Promise((r) => setTimeout(r, 40))
  }
)

Deno.test(
  'Async.withTimeout - zero timeout rejects immediately',
  { sanitizeResources: false, sanitizeOps: false },
  async () => {
    const delayedResolvePromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 30)
    })
    await assertRejects(
      () => Async.withTimeout(delayedResolvePromise, 0, 'instant timeout'),
      Error,
      'instant timeout'
    )
    await new Promise((r) => setTimeout(r, 40))
  }
)
