import type * as SignalTypes from '@app/signal/Types.ts'

/** Generic signal reference for any event type. */
export type AnySignal = SignalTypes.Signal<unknown[]>

/** Global event bus with named channels. */
export type Broadcast = {
  /** Register callback for event channel. */
  on: <Args extends unknown[] = []>(name: string, listener: (...args: Args) => void) => () => void
  /** Emit event to channel subscribers. */
  emit: <Args extends unknown[] = []>(name: string, ...args: Args) => void
  /** Remove all listeners from channel. */
  clear: (name: string) => void
}
