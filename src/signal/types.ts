export interface Signal<Args extends unknown[] = []> {
  subscribe: (listener: (...args: Args) => void) => () => void
  once: (listener: (...args: Args) => void) => () => void
  emit: (...args: Args) => void
  clear: () => void
}

export interface SignalOptions {
  maxListeners?: number | undefined
  maxEmitDepth?: number
  onError?: (error: unknown, listener: (...args: unknown[]) => void) => void
  onMaxListenersExceeded?: (count: number, maxListeners: number) => void
}
