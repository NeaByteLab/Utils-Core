import { createSignal } from '@app/signal/index.ts'
import type * as Types from '@app/broadcast/Types.ts'

/**
 * Global event broadcast system.
 * @description Manages named event channels with signals.
 */
class BroadcastImpl implements Types.Broadcast {
  /** Registry of named signal instances. */
  private signalRegistry = new Map<string, Types.AnySignal>()

  /**
   * Clear event channel.
   * @description Removes all listeners from channel.
   * @param eventName - Channel identifier.
   */
  clear(eventName: string): void {
    this.getOrCreateSignal(eventName).clear()
    this.signalRegistry.delete(eventName)
  }

  /**
   * Emit event to channel.
   * @description Notifies all channel subscribers.
   * @param eventName - Target channel name.
   * @param eventArgs - Arguments for subscribers.
   */
  emit<EventArgs extends unknown[] = []>(eventName: string, ...eventArgs: EventArgs): void {
    this.getOrCreateSignal<EventArgs>(eventName).emit(...(eventArgs as unknown[]))
  }

  /**
   * Subscribe to event channel.
   * @description Registers callback for channel events.
   * @param eventName - Channel identifier.
   * @param callback - Invoked on channel emit.
   * @returns Unsubscribe function.
   */
  on<EventArgs extends unknown[] = []>(
    eventName: string,
    callback: (...args: EventArgs) => void
  ): () => void {
    return this.getOrCreateSignal<EventArgs>(eventName).subscribe(
      callback as unknown as (...args: unknown[]) => void
    )
  }

  /**
   * Get or create channel signal.
   * @description Retrieves existing signal or creates new.
   * @param eventName - Channel identifier.
   * @returns Signal instance for channel.
   */
  private getOrCreateSignal<EventArgs extends unknown[] = []>(eventName: string): Types.AnySignal {
    if (!this.signalRegistry.has(eventName)) {
      this.signalRegistry.set(eventName, createSignal<EventArgs>() as unknown as Types.AnySignal)
    }
    return this.signalRegistry.get(eventName)!
  }
}

/**
 * Global broadcast instance.
 * @description Singleton event bus for application.
 */
export const broadcast: Types.Broadcast = new BroadcastImpl()
