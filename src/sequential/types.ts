export interface QueueItem<Args extends unknown[], ReturnType> {
  args: Args
  resolve: (value: ReturnType) => void
  reject: (reason?: unknown) => void
}

export interface Sequential<Args extends unknown[], ReturnType> {
  execute: (...args: Args) => Promise<ReturnType>
  clear: () => void
  getPendingCount: () => number
  isProcessing: () => boolean
  dispose: () => void
  pause: () => void
  resume: () => void
  drain: () => Promise<void>
}

export interface SequentialOptions {
  signal?: AbortSignal
  timeoutMs?: number
  maxQueueSize?: number
  concurrency?: number
}

export type AsyncFunction<Args extends unknown[], ReturnType> = (
  ...args: Args
) => Promise<ReturnType>
