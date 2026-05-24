import type * as SignalTypes from '@app/signal/types.ts'
import type * as Types from '@app/broadcast/types.ts'
import * as Shared from '@app/shared/index.ts'
import { createSignal } from '@app/signal/index.ts'

class BroadcastImpl implements Types.Broadcast {
  private channelRegistry = new Map<string, Types.ChannelEntry>()
  private reentrancyGuards = new Map<string, Shared.ReentrancyGuard>()
  private deferredPending = new Set<string>()

  constructor(private options?: Types.BroadcastOptions) {}

  clear(eventName: string): void {
    const channelEntry = this.channelRegistry.get(eventName)
    if (!channelEntry) {
      return
    }
    channelEntry.signal.clear()
    this.channelRegistry.delete(eventName)
    this.reentrancyGuards.delete(eventName)
    this.deferredPending.delete(eventName)
  }

  clearAll(): void {
    for (const channelEntry of this.channelRegistry.values()) {
      channelEntry.signal.clear()
    }
    this.channelRegistry.clear()
    this.reentrancyGuards.clear()
    this.deferredPending.clear()
  }

  emit<EventArgs extends unknown[] = []>(eventName: string, ...eventArgs: EventArgs): void {
    const channelEntry = this.channelRegistry.get(eventName)
    if (!channelEntry) {
      return
    }
    let reentrancyGuard = this.reentrancyGuards.get(eventName)
    if (!reentrancyGuard) {
      reentrancyGuard = new Shared.ReentrancyGuard(1)
      this.reentrancyGuards.set(eventName, reentrancyGuard)
    }
    if (reentrancyGuard.enter()) {
      this.deferredPending.add(eventName)
      return
    }
    try {
      channelEntry.signal.emit(...eventArgs)
    } finally {
      reentrancyGuard.exit()
      this.flushDeferred(eventName, channelEntry, reentrancyGuard, eventArgs)
    }
  }

  on<EventArgs extends unknown[] = []>(
    eventName: string,
    callback: (...args: EventArgs) => void
  ): () => void {
    return this.addListener(eventName, callback, false)
  }

  once<EventArgs extends unknown[] = []>(
    eventName: string,
    callback: (...args: EventArgs) => void
  ): () => void {
    return this.addListener(eventName, callback, true)
  }

  private addListener<EventArgs extends unknown[]>(
    eventName: string,
    callback: (...args: EventArgs) => void,
    isOnce: boolean
  ): () => void {
    const channelEntry = this.getOrCreateEntry(eventName)
    channelEntry.listenerCount++
    const unsubscribe = isOnce
      ? channelEntry.signal.once(callback as (...args: unknown[]) => void)
      : channelEntry.signal.subscribe(callback as (...args: unknown[]) => void)
    return () => {
      unsubscribe()
      channelEntry.listenerCount--
      this.tryPruneChannel(eventName)
    }
  }

  private flushDeferred<EventArgs extends unknown[]>(
    eventName: string,
    channelEntry: Types.ChannelEntry,
    reentrancyGuard: Shared.ReentrancyGuard,
    eventArgs: EventArgs
  ): void {
    if (reentrancyGuard.currentDepth === 0 && this.deferredPending.has(eventName)) {
      this.deferredPending.delete(eventName)
      reentrancyGuard.reset()
      channelEntry.signal.emit(...eventArgs)
    }
  }

  private getOrCreateEntry(eventName: string): Types.ChannelEntry {
    const existingEntry = this.channelRegistry.get(eventName)
    if (existingEntry) {
      return existingEntry
    }
    const signalOptions: SignalTypes.SignalOptions = {
      maxListeners: this.options?.maxListeners,
      onMaxListenersExceeded: (listenerCount, maxListeners) => {
        this.options?.onMaxListenersExceeded?.(eventName, listenerCount, maxListeners)
      }
    }
    if (this.options?.onError) {
      signalOptions.onError = (error, listener) => {
        this.options!.onError!(error, listener, eventName)
      }
    }
    const signal = createSignal<unknown[]>(signalOptions)
    const channelEntry: Types.ChannelEntry = { signal, listenerCount: 0 }
    this.channelRegistry.set(eventName, channelEntry)
    return channelEntry
  }

  private tryPruneChannel(eventName: string): void {
    const channelEntry = this.channelRegistry.get(eventName)
    if (!channelEntry) {
      return
    }
    if (channelEntry.listenerCount <= 0) {
      channelEntry.signal.clear()
      this.channelRegistry.delete(eventName)
      this.reentrancyGuards.delete(eventName)
      this.deferredPending.delete(eventName)
    }
  }
}

export function createBroadcast(options?: Types.BroadcastOptions): Types.Broadcast {
  return new BroadcastImpl(options)
}
