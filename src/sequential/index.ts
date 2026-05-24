import type * as Types from '@app/sequential/types.ts'
import * as Shared from '@app/shared/index.ts'
import { Async } from '@app/async/index.ts'

class SequentialImpl<Args extends unknown[], ReturnType> implements
  Types.Sequential<
    Args,
    ReturnType
  > {
  private readonly defaultMaxQueueSize = 10_000
  private itemQueue: Types.QueueItem<Args, ReturnType>[] = []
  private activeCount = 0
  private isDisposed = false
  private isPaused = false
  private abortHandler: (() => void) | undefined
  private drainResolvers = new Set<() => void>()
  private activeTaskControllers = new Set<AbortController>()

  constructor(
    private targetFunction: Types.AsyncFunction<Args, ReturnType>,
    private options?: Types.SequentialOptions
  ) {
    if (options?.maxQueueSize !== undefined) {
      Shared.assertMaxQueueSize('maxQueueSize', options.maxQueueSize)
    }
    if (options?.timeoutMs !== undefined && Number.isFinite(options.timeoutMs)) {
      Shared.assertTimeout('timeoutMs', options.timeoutMs)
    }
    if (options?.concurrency !== undefined) {
      Shared.assertPositiveNumber('concurrency', options.concurrency, { allowZero: true })
    }
    if (options?.signal) {
      this.abortHandler = () => {
        this.clear()
        this.cancelActiveTasks()
      }
      options.signal.addEventListener('abort', this.abortHandler, { once: true })
    }
  }

  get concurrency(): number {
    return this.options?.concurrency ?? 1
  }

  clear(): void {
    const pendingCount = this.itemQueue.length
    for (const queueItem of this.itemQueue) {
      queueItem.reject(
        new Error(
          `Sequential.execute() rejected because clear() was called while this task was still pending in the queue. ${pendingCount} pending tasks were dropped.`
        )
      )
    }
    this.itemQueue.length = 0
    this.resolveDrains()
  }

  dispose(): void {
    this.isDisposed = true
    if (this.options?.signal && this.abortHandler) {
      this.options.signal.removeEventListener('abort', this.abortHandler)
    }
    this.cancelActiveTasks()
    this.clear()
  }

  drain(): Promise<void> {
    if (this.activeCount === 0 && this.itemQueue.length === 0) {
      return Promise.resolve()
    }
    const { promise, resolve } = Promise.withResolvers<void>()
    this.drainResolvers.add(resolve)
    return promise
  }

  execute(...args: Args): Promise<ReturnType> {
    if (this.isDisposed) {
      return Promise.reject(new Error('Sequential has been disposed and cannot accept new tasks.'))
    }
    return new Promise((resolve, reject) => {
      if (this.options?.signal?.aborted) {
        reject(
          new Error('Sequential.execute() aborted because the AbortSignal was already aborted.')
        )
        return
      }
      const maxQueueSize = this.options?.maxQueueSize ?? this.defaultMaxQueueSize
      if (this.itemQueue.length >= maxQueueSize && maxQueueSize > 0) {
        reject(
          new Error(
            `Sequential.execute() rejected because the queue is full (${maxQueueSize} max).`
          )
        )
        return
      }
      this.itemQueue.push({ args, resolve, reject })
      void this.processQueue()
    })
  }

  getPendingCount(): number {
    return this.itemQueue.length
  }

  isProcessing(): boolean {
    return this.activeCount > 0
  }

  pause(): void {
    this.isPaused = true
  }

  resume(): void {
    this.isPaused = false
    void this.processQueue()
  }

  private cancelActiveTasks(): void {
    for (const activeController of this.activeTaskControllers) {
      activeController.abort()
    }
    this.activeTaskControllers.clear()
  }

  private processQueue(): void {
    if (this.isDisposed || this.isPaused || this.itemQueue.length === 0) {
      return
    }
    while (this.activeCount < this.concurrency && this.itemQueue.length > 0) {
      if (this.options?.signal?.aborted) {
        this.clear()
        this.cancelActiveTasks()
        return
      }
      if (this.isDisposed || this.isPaused) {
        return
      }
      const queueItem = this.itemQueue.shift()!
      this.activeCount++
      const taskController = new AbortController()
      this.activeTaskControllers.add(taskController)
      this.runTask(queueItem.args, taskController.signal).then(
        (taskResult) => {
          this.activeTaskControllers.delete(taskController)
          this.activeCount--
          queueItem.resolve(taskResult)
          void this.processQueue()
          this.resolveDrains()
        },
        (taskError) => {
          this.activeTaskControllers.delete(taskController)
          this.activeCount--
          queueItem.reject(taskError)
          void this.processQueue()
          this.resolveDrains()
        }
      )
    }
  }

  private resolveDrains(): void {
    if (this.activeCount === 0 && this.itemQueue.length === 0) {
      for (const drainResolver of this.drainResolvers) {
        drainResolver()
      }
      this.drainResolvers.clear()
    }
  }

  private runTask(args: Args, taskSignal: AbortSignal): Promise<ReturnType> {
    const targetPromise = this.targetFunction(...args)
    const timeoutMs = this.options?.timeoutMs
    if (timeoutMs === undefined || !Number.isFinite(timeoutMs)) {
      return new Promise((resolve, reject) => {
        targetPromise.then(resolve, reject)
        const removeAbort = Shared.onAbortOnce(taskSignal, () => {
          reject(new Error('Sequential task was cancelled.'))
        })
        targetPromise.then(removeAbort, removeAbort)
      })
    }
    return Async.withTimeout(
      targetPromise,
      timeoutMs,
      `Sequential task timed out after ${timeoutMs}ms.`,
      { signal: taskSignal }
    )
  }
}

export function createSequential<Args extends unknown[], ReturnType>(
  targetFunction: Types.AsyncFunction<Args, ReturnType>,
  options?: Types.SequentialOptions
): Types.Sequential<Args, ReturnType> {
  if (typeof targetFunction !== 'function') {
    throw new TypeError(
      `createSequential() expected a function, but received ${typeof targetFunction}.`
    )
  }
  return new SequentialImpl(targetFunction, options)
}
