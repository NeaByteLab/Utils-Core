import * as Shared from '@app/shared/index.ts'
import type * as Types from '@app/signal/types.ts'

class SignalImpl<Args extends unknown[] = []> implements Types.Signal<Args> {
  private readonly maxEmitDepth: number
  private listenerSet = new Set<(...args: Args) => void>()
  private originalListenerMap?: Map<(...args: Args) => void, (...args: Args) => void>
  private emitDepth = 0
  private warnedMaxListeners = false

  constructor(private options?: Types.SignalOptions) {
    this.maxEmitDepth = options?.maxEmitDepth ?? Number.POSITIVE_INFINITY
  }

  clear(): void {
    this.listenerSet.clear()
    this.originalListenerMap?.clear()
    this.warnedMaxListeners = false
  }

  emit(...eventArgs: Args): void {
    this.emitDepth++
    try {
      if (this.emitDepth > this.maxEmitDepth) {
        throw new Error(
          `Signal.emit() exceeded max re-entrancy depth of ${this.maxEmitDepth}. This may indicate a cyclic emit pattern.`
        )
      }
      this.dispatchListeners(...eventArgs)
    } finally {
      this.emitDepth--
    }
  }

  once(listener: (...args: Args) => void): () => void {
    let hasFired = false
    const wrappedListener = (...args: Args) => {
      if (hasFired) {
        return
      }
      hasFired = true
      this.listenerSet.delete(wrappedListener)
      listener(...args)
    }
    if (this.options?.onError) {
      ;(this.originalListenerMap ??= new Map()).set(wrappedListener, listener)
    }
    this.listenerSet.add(wrappedListener)
    this.checkMaxListeners()
    return () => {
      hasFired = true
      this.listenerSet.delete(wrappedListener)
      this.originalListenerMap?.delete(wrappedListener)
    }
  }

  subscribe(listener: (...args: Args) => void): () => void {
    this.listenerSet.add(listener)
    this.checkMaxListeners()
    return () => {
      this.listenerSet.delete(listener)
      this.checkMaxListeners()
    }
  }

  private checkMaxListeners(): void {
    const maxListeners = this.options?.maxListeners
    if (maxListeners === undefined || !Number.isFinite(maxListeners)) {
      return
    }
    if (this.listenerSet.size > maxListeners && !this.warnedMaxListeners) {
      this.warnedMaxListeners = true
      this.options?.onMaxListenersExceeded?.(this.listenerSet.size, maxListeners)
    }
    if (this.listenerSet.size <= maxListeners) {
      this.warnedMaxListeners = false
    }
  }

  private dispatchListeners(...eventArgs: Args): void {
    Shared.dispatchSafely(
      this.listenerSet,
      (listener) => listener(...eventArgs),
      (error, listener) => {
        if (this.options?.onError) {
          const originalListener =
            this.originalListenerMap?.get(listener as (...args: Args) => void) ??
              listener
          this.options.onError(error, originalListener as (...args: unknown[]) => void)
        }
      }
    )
  }
}

export function createSignal<Args extends unknown[] = []>(
  options?: Types.SignalOptions
): Types.Signal<Args> {
  return new SignalImpl<Args>(options)
}
