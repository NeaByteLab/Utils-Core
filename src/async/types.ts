export interface AbortOutcomeOptions {
  throwOnAbort?: boolean
  abortError?: () => Error
}

export interface ResolveTimerOptions {
  timer?: TimerAPI
  scheduler?: Scheduler
}

export interface SleepOptions {
  signal?: AbortSignal
  scheduler?: Scheduler
  timer?: TimerAPI
  throwOnAbort?: boolean
  unref?: boolean
  abortError?: () => Error
}

export interface TimeoutOptions {
  signal?: AbortSignal
  scheduler?: Scheduler
  timer?: TimerAPI
  unref?: boolean
  timeoutError?: () => Error
}

export interface TimerAPI {
  schedule: (callback: () => void, delay: number) => number | object
  clear: (handle: number | object) => void
}

export interface Unrefable {
  unref?(): void
}

export type Scheduler = (callback: () => void, delay: number) => number
