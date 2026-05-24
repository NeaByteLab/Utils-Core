import type * as Types from '@app/async/types.ts'
import * as Shared from '@app/shared/index.ts'

function defaultTimer(): Types.TimerAPI {
  return {
    schedule: (callback, delay) => setTimeout(callback, delay),
    clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
  }
}

function resolveAbortOutcome(
  options: Types.AbortOutcomeOptions | undefined,
  resolve: () => void,
  reject: (error: Error) => void,
  defaultMessage: string
): void {
  if (options?.throwOnAbort || options?.abortError) {
    reject(options.abortError?.() ?? new Error(defaultMessage))
  } else {
    resolve()
  }
}

function resolveTimer(options?: Types.ResolveTimerOptions): Types.TimerAPI {
  if (options?.timer) {
    return options.timer
  }
  if (options?.scheduler) {
    const schedule = options.scheduler
    return {
      schedule: (callback, delay) => schedule(callback, delay),
      clear: () => {}
    }
  }
  return defaultTimer()
}

export class Async {
  private static readonly maxSetTimeout = 2_147_483_647

  static sleepDelay(delayMs: number, sleepOptions?: Types.SleepOptions): Promise<void> {
    const signal = sleepOptions?.signal
    if (signal?.aborted) {
      return new Promise((resolve, reject) => {
        resolveAbortOutcome(
          sleepOptions,
          resolve,
          reject,
          'Async.sleepDelay() aborted because the AbortSignal was already aborted before the delay started.'
        )
      })
    }
    if (delayMs <= 0 || Number.isNaN(delayMs)) {
      return Promise.resolve()
    }
    if (!Number.isFinite(delayMs) || delayMs > Async.maxSetTimeout) {
      return new Promise<void>((resolve, reject) => {
        Shared.onAbortOnce(signal, () => {
          resolveAbortOutcome(
            sleepOptions,
            resolve,
            reject,
            'Async.sleepDelay() aborted because the AbortSignal was triggered while waiting.'
          )
        })
      })
    }
    const effectiveDelay = Math.min(delayMs, Async.maxSetTimeout)
    const { promise, resolve, reject } = Promise.withResolvers<void>()
    let isSettled = false
    const timer = resolveTimer(sleepOptions)
    const onAbort = () => {
      if (isSettled) {
        return
      }
      isSettled = true
      timer.clear(timerId)
      resolveAbortOutcome(
        sleepOptions,
        resolve,
        reject,
        'Async.sleepDelay() aborted because the AbortSignal was triggered while waiting.'
      )
    }
    const timerId = timer.schedule(() => {
      if (isSettled) {
        return
      }
      isSettled = true
      resolve()
    }, effectiveDelay)
    Shared.onAbortOnce(signal, onAbort)
    if (sleepOptions?.unref && typeof timerId === 'number') {
      Async.unrefTimer(timerId)
    }
    return promise
  }

  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
    timeoutOptions?: Types.TimeoutOptions
  ): Promise<T> {
    const signal = timeoutOptions?.signal
    const buildError = () => timeoutOptions?.timeoutError?.() ?? new Error(errorMessage)
    if (signal?.aborted) {
      return Promise.reject(buildError())
    }
    if (timeoutMs <= 0 || Number.isNaN(timeoutMs)) {
      return Promise.reject(buildError())
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs > Async.maxSetTimeout) {
      return new Promise((resolve, reject) => {
        const settledRef = { value: false }
        promise.then(
          (resolvedValue) => {
            if (!settledRef.value) {
              settledRef.value = true
              resolve(resolvedValue)
            }
          },
          (rejectedReason) => {
            if (!settledRef.value) {
              settledRef.value = true
              reject(rejectedReason)
            }
          }
        )
        Shared.onAbortOnce(signal, () => {
          if (!settledRef.value) {
            settledRef.value = true
            reject(buildError())
          }
        })
      })
    }
    const effectiveTimeout = Math.min(timeoutMs, Async.maxSetTimeout)
    const { promise: racePromise, resolve, reject } = Promise.withResolvers<T>()
    let isSettled = false
    const timer = resolveTimer(timeoutOptions)
    const teardown = () => {
      timer.clear(timerId)
    }
    const onAbort = () => {
      if (isSettled) {
        return
      }
      isSettled = true
      teardown()
      reject(buildError())
    }
    const timerId = timer.schedule(() => {
      if (isSettled) {
        return
      }
      isSettled = true
      teardown()
      reject(buildError())
    }, effectiveTimeout)
    if (timeoutOptions?.unref && typeof timerId === 'number') {
      Async.unrefTimer(timerId)
    }
    Shared.onAbortOnce(signal, onAbort)
    promise.then(
      (resolvedValue) => {
        if (isSettled) {
          return
        }
        isSettled = true
        teardown()
        resolve(resolvedValue)
      },
      (rejectedReason) => {
        if (isSettled) {
          return
        }
        isSettled = true
        teardown()
        reject(rejectedReason)
      }
    )
    return racePromise
  }

  private static unrefTimer(timerId: ReturnType<typeof setTimeout>): void {
    ;(timerId as unknown as Types.Unrefable).unref?.()
  }
}
