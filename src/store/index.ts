import * as Shared from '@app/shared/index.ts'
import type * as Types from '@app/store/types.ts'

class StoreImpl<T> implements Types.Store<T> {
  private readonly maxNotifyDepth: number
  private listenerSet = new Set<Types.Listener>()
  private batchHasChange = false
  private batchDepth = 0
  private initialState: T
  private isDisposed = false
  private notifyDepth = 0

  constructor(
    private currentState: T,
    private options?: Types.StoreOptions<T>
  ) {
    this.maxNotifyDepth = options?.maxNotifyDepth ?? 100
    this.initialState = this.makeTamperProof(currentState)
    this.currentState = this.initialState
  }

  batch(fn: () => void): void {
    if (this.isDisposed) {
      throw new Error('Store has been disposed and cannot accept new batches.')
    }
    if (typeof fn !== 'function') {
      throw new TypeError(`Store.batch() expected a function, but received ${typeof fn}.`)
    }
    const isTopLevel = this.batchDepth === 0
    const batchStartState = isTopLevel ? this.currentState : undefined
    let hasThrown = false
    this.batchDepth++
    try {
      fn()
    } catch (error) {
      hasThrown = true
      throw error
    } finally {
      this.batchDepth--
      if (this.batchDepth === 0) {
        if (hasThrown) {
          try {
            const comparator = this.options?.isEqual ?? Object.is
            if (!comparator(this.currentState, batchStartState!)) {
              this.notifyListeners()
            }
          } catch {
            // no-op
          }
        } else if (this.batchHasChange) {
          this.batchHasChange = false
          this.notifyListeners()
        }
      }
    }
  }

  derive<R>(selector: (state: T) => R): Types.Derived<R> {
    let cachedValue = selector(this.currentState)
    const derivedListeners = new Set<Types.Listener>()
    let unsubscribe: (() => void) | undefined
    const subscribeToBase = () => {
      if (!unsubscribe) {
        unsubscribe = this.subscribe(() => {
          let nextValue: R
          try {
            nextValue = selector(this.currentState)
          } catch {
            return
          }
          if (Object.is(nextValue, cachedValue)) {
            return
          }
          cachedValue = nextValue
          Shared.dispatchSafely(
            derivedListeners,
            (listener) => listener(),
            (error, listener) => {
              this.options?.onError?.(error, listener as Types.Listener)
            }
          )
        })
      }
    }
    return {
      get: () => {
        if (!unsubscribe) {
          try {
            cachedValue = selector(this.currentState)
          } catch {
            // no-op
          }
        }
        return cachedValue
      },
      subscribe: (listener: Types.Listener) => {
        derivedListeners.add(listener)
        subscribeToBase()
        return () => {
          derivedListeners.delete(listener)
          if (derivedListeners.size === 0) {
            unsubscribe?.()
            unsubscribe = undefined
          }
        }
      }
    }
  }

  dispose(): void {
    if (this.isDisposed) {
      return
    }
    this.isDisposed = true
    this.listenerSet.clear()
    this.options?.onDispose?.()
  }

  getState(): T {
    if (this.isDisposed) {
      throw new Error('Store has been disposed and cannot be accessed.')
    }
    return this.currentState
  }

  reset(): void {
    this.setState(() => this.initialState)
  }

  setState(stateUpdater: Types.StateUpdater<T>): void {
    if (this.isDisposed) {
      throw new Error('Store has been disposed and cannot accept state updates.')
    }
    if (typeof stateUpdater !== 'function') {
      throw new TypeError(
        `Store.setState() expected a function, but received ${typeof stateUpdater}.`
      )
    }
    const previousState = this.currentState
    const nextState = stateUpdater(previousState)
    const comparator = this.options?.isEqual ?? Object.is
    const isEqual = comparator(nextState, previousState)
    if (isEqual) {
      return
    }
    this.currentState = this.makeTamperProof(nextState)
    try {
      this.options?.onChange?.({ newState: nextState, oldState: previousState })
    } catch (error) {
      this.options?.onError?.(error, () => {})
    }
    if (this.batchDepth > 0) {
      this.batchHasChange = true
      return
    }
    this.notifyListeners()
  }

  subscribe(listener: Types.Listener): () => void {
    if (this.isDisposed) {
      throw new Error('Store has been disposed and cannot accept new subscribers.')
    }
    this.listenerSet.add(listener)
    return () => this.listenerSet.delete(listener)
  }

  private makeTamperProof<U>(candidate: U): U {
    if (candidate === null || typeof candidate !== 'object') {
      return candidate
    }
    const targetObject = candidate as Record<PropertyKey, unknown>
    for (const key of Reflect.ownKeys(targetObject)) {
      const descriptor = Object.getOwnPropertyDescriptor(targetObject, key)
      if (!descriptor) {
        continue
      }
      if ('value' in descriptor) {
        const propertyValue = descriptor.value
        Object.defineProperty(targetObject, key, {
          get() {
            return propertyValue
          },
          set() {
            /* silently ignore writes */
          },
          enumerable: descriptor.enumerable ?? false,
          configurable: descriptor.configurable ?? false
        })
      } else if (descriptor.set) {
        const frozenDescriptor: PropertyDescriptor = {
          set() {
            /* silently ignore writes */
          },
          enumerable: descriptor.enumerable ?? false,
          configurable: descriptor.configurable ?? false
        }
        if (descriptor.get) {
          frozenDescriptor.get = descriptor.get
        }
        Object.defineProperty(targetObject, key, frozenDescriptor)
      }
    }
    return candidate
  }

  private notifyListeners(): void {
    this.notifyDepth++
    try {
      if (this.notifyDepth > this.maxNotifyDepth) {
        throw new Error(
          `Store notification depth exceeded ${this.maxNotifyDepth}. This may indicate a cyclic setState pattern.`
        )
      }
      Shared.dispatchSafely(
        this.listenerSet,
        (listener) => listener(),
        (error, listener) => {
          this.options?.onError?.(error, listener as Types.Listener)
        }
      )
    } finally {
      this.notifyDepth--
    }
  }
}

export function createStore<T>(initialState: T, options?: Types.StoreOptions<T>): Types.Store<T> {
  return new StoreImpl(initialState, options)
}
