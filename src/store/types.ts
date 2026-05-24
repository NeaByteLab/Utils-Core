export interface Derived<R> {
  get: () => R
  subscribe: (listener: Listener) => () => void
}

export interface StateChange<T> {
  newState: T
  oldState: T
}

export interface Store<T> {
  getState: () => T
  setState: (updater: StateUpdater<T>) => void
  subscribe: (listener: Listener) => () => void
  reset: () => void
  batch: (fn: () => void) => void
  derive: <R>(selector: (state: T) => R) => Derived<R>
  dispose: () => void
}

export interface StoreOptions<T> {
  isEqual?: (prev: T, next: T) => boolean
  onChange?: OnChange<T>
  onDispose?: () => void
  onError?: (error: unknown, listener: Listener) => void
  maxNotifyDepth?: number
}

export type Listener = () => void

export type OnChange<T> = (stateChange: StateChange<T>) => void

export type StateUpdater<T> = (prev: T) => T
