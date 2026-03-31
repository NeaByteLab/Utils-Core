import type * as Types from '@app/store/Types.ts'

/**
 * Reactive state container.
 * @description Manages state with change notifications.
 * @template T - Type of stored state value.
 */
class StoreImpl<T> implements Types.Store<T> {
  /** Current stored state value. */
  private currentState: T
  /** Set of state change callbacks. */
  private listenerSet = new Set<Types.Listener>()
  /** Optional change notification handler. */
  private changeCallback: Types.OnChange<T> | undefined

  /**
   * Initialize store with state.
   * @description Creates store instance with initial value.
   * @param initialState - Starting state value.
   * @param onChange - Optional change handler.
   */
  constructor(initialState: T, onChange?: Types.OnChange<T>) {
    this.currentState = initialState
    this.changeCallback = onChange
  }

  /**
   * Read current state.
   * @description Returns the stored value.
   * @returns Current state value.
   */
  getState(): T {
    return this.currentState
  }

  /**
   * Update state value.
   * @description Applies updater and notifies listeners.
   * @param stateUpdater - Function producing new state.
   */
  setState(stateUpdater: (previousState: T) => T): void {
    const previousState = this.currentState
    const nextState = stateUpdater(previousState)
    if (Object.is(nextState, previousState)) {
      return
    }
    this.currentState = nextState
    this.changeCallback?.({ newState: nextState, oldState: previousState })
    for (const callback of this.listenerSet) {
      try {
        callback()
      } catch {
        // Error isolation: one failing callback doesn't affect others
      }
    }
  }

  /**
   * Register change listener.
   * @description Adds callback to listener set.
   * @param callback - Invoked on state changes.
   * @returns Unsubscribe function.
   */
  subscribe(callback: Types.Listener): () => void {
    this.listenerSet.add(callback)
    return () => this.listenerSet.delete(callback)
  }
}

/**
 * Create new store instance.
 * @description Factory for reactive state container.
 * @param initialState - Starting value for store.
 * @param onChange - Optional change handler.
 * @returns Configured store instance.
 */
export function createStore<T>(initialState: T, onChange?: Types.OnChange<T>): Types.Store<T> {
  return new StoreImpl(initialState, onChange)
}
