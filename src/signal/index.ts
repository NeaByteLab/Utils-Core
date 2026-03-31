import type * as Types from '@app/signal/Types.ts'

/**
 * Event signal implementation.
 * @description Manages listener callbacks for event distribution.
 * @template Args - Tuple of event argument types.
 */
class SignalImpl<Args extends unknown[] = []> implements Types.Signal<Args> {
  /** Set of registered callback functions. */
  private listenerSet = new Set<(...args: Args) => void>()

  /**
   * Remove all listeners.
   * @description Clears the internal callback set.
   */
  clear(): void {
    this.listenerSet.clear()
  }

  /**
   * Emit event to listeners.
   * @description Invokes all registered callbacks with arguments.
   * @param eventArgs - Arguments passed to callbacks.
   */
  emit(...eventArgs: Args): void {
    for (const callback of this.listenerSet) {
      try {
        callback(...eventArgs)
      } catch {
        // Error isolation: one failing callback doesn't affect others
      }
    }
  }

  /**
   * Register event listener.
   * @description Adds callback to the listener set.
   * @param callback - Function invoked on emit.
   * @returns Unsubscribe function.
   */
  subscribe(callback: (...args: Args) => void): () => void {
    this.listenerSet.add(callback)
    return () => {
      this.listenerSet.delete(callback)
    }
  }
}

/**
 * Create new signal instance.
 * @description Factory for event signal creation.
 * @returns Configured signal instance.
 */
export function createSignal<Args extends unknown[] = []>(): Types.Signal<Args> {
  return new SignalImpl<Args>()
}
