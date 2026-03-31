/** Callback for state change notification. */
export type Listener = () => void

/** Change handler with previous and new state. */
export type OnChange<T> = (args: { newState: T; oldState: T }) => void

/** Reactive state container with subscribers. */
export type Store<T> = {
  /** Read current state value. */
  getState: () => T
  /** Update state with reducer function. */
  setState: (updater: (prev: T) => T) => void
  /** Register listener for changes. */
  subscribe: (listener: Listener) => () => void
}
