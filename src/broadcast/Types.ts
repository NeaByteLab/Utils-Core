import type * as SignalTypes from '@app/signal/types.ts'

export interface Broadcast {
  on: <Args extends unknown[] = []>(name: string, listener: (...args: Args) => void) => () => void
  once: <Args extends unknown[] = []>(name: string, listener: (...args: Args) => void) => () => void
  emit: <Args extends unknown[] = []>(name: string, ...args: Args) => void
  clear: (name: string) => void
  clearAll: () => void
}

export interface BroadcastOptions {
  maxListeners?: number
  onError?: (error: unknown, listener: (...args: unknown[]) => void, eventName: string) => void
  onMaxListenersExceeded?: (eventName: string, count: number, maxListeners: number) => void
}

export interface ChannelEntry {
  signal: AnySignal
  listenerCount: number
}

export type AnySignal = SignalTypes.Signal<unknown[]>
