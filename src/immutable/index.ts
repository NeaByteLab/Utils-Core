import type * as Types from '@app/immutable/types.ts'
import * as Shared from '@app/shared/index.ts'

export class Immutable {
  private static readonly readonlyMapMethods = new Set(['set', 'delete', 'clear'])
  private static readonly readonlySetMethods = new Set(['add', 'delete', 'clear'])

  static deepFreeze<T>(target: T, signal?: AbortSignal): Types.DeepReadonly<T> {
    return Immutable.freezeTransitively(target, new WeakSet(), { signal }) as Types.DeepReadonly<T>
  }

  static freeze<T>(target: T): Readonly<T> {
    if (!Immutable.isFreezable(target)) {
      return target
    }
    return Object.freeze(target)
  }

  static freezeMap<K, V>(target: Map<K, V>): ReadonlyMap<K, V> {
    if (!(target instanceof Map)) {
      throw new TypeError(
        `Immutable.freezeMap() expected a Map, but received ${
          target === null ? 'null' : typeof target
        }.`
      )
    }
    return Immutable.createReadonlyProxy(target, 'Map', Immutable.readonlyMapMethods)
  }

  static freezeSet<T>(target: Set<T>): ReadonlySet<T> {
    if (!(target instanceof Set)) {
      throw new TypeError(
        `Immutable.freezeSet() expected a Set, but received ${
          target === null ? 'null' : typeof target
        }.`
      )
    }
    return Immutable.createReadonlyProxy(target, 'Set', Immutable.readonlySetMethods)
  }

  static harden<T>(target: T, options?: Types.HardenOptions): Types.DeepReadonly<T> {
    return Immutable.freezeTransitively(
      target,
      new WeakSet(),
      options ?? {
        includeNonEnumerable: true,
        freezePrototype: true
      }
    ) as Types.DeepReadonly<T>
  }

  static isDeepFrozen(target: unknown, signal?: AbortSignal): boolean {
    return Immutable.checkDeepFrozen(target, new WeakSet(), signal)
  }

  static isFrozen(target: unknown): boolean {
    if (!Immutable.isFreezable(target)) {
      return true
    }
    return Object.isFrozen(target)
  }

  private static buildReadOnlyError(structureLabel: string, methodName: string): TypeError {
    return new TypeError(
      `Immutable.freeze${structureLabel}() rejected the mutation. The caller cannot call ${methodName}() on a frozen ${structureLabel}.`
    )
  }

  private static checkDeepFrozen(
    target: unknown,
    visited: WeakSet<object>,
    signal?: AbortSignal
  ): boolean {
    Shared.throwIfAborted(
      signal,
      'Immutable.checkDeepFrozen() was aborted by the provided AbortSignal.'
    )
    if (!Immutable.isFreezable(target)) {
      return true
    }
    if (visited.has(target)) {
      return true
    }
    visited.add(target)
    if (!Object.isFrozen(target)) {
      return false
    }
    for (const childValue of Immutable.getChildValues(target)) {
      if (!Immutable.checkDeepFrozen(childValue, visited, signal)) {
        return false
      }
    }
    return true
  }

  private static createReadonlyProxy<T extends object>(
    target: T,
    structureLabel: string,
    blockedMethods: Set<string>
  ): T {
    return new Proxy(target, {
      get(receiver, propertyKey) {
        if (typeof propertyKey === 'string' && blockedMethods.has(propertyKey)) {
          return () => {
            throw Immutable.buildReadOnlyError(structureLabel, propertyKey)
          }
        }
        const propertyValue = Reflect.get(receiver, propertyKey, receiver)
        return typeof propertyValue === 'function' ? propertyValue.bind(receiver) : propertyValue
      },
      defineProperty() {
        return true
      },
      deleteProperty() {
        return false
      }
    }) as T
  }

  private static freezeTransitively(
    target: unknown,
    visited: WeakSet<object>,
    options: Types.HardenOptions
  ): unknown {
    Shared.throwIfAborted(
      options.signal,
      'Immutable.freezeTransitively() was aborted by the provided AbortSignal.'
    )
    if (!Immutable.isFreezable(target)) {
      return target
    }
    if (visited.has(target)) {
      return target
    }
    visited.add(target)
    for (const childValue of Immutable.getChildValues(target, options)) {
      Immutable.freezeTransitively(childValue, visited, options)
    }
    const propertyKeys = options.includeNonEnumerable
      ? Reflect.ownKeys(target)
      : Object.keys(target)
    for (const propertyKey of propertyKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey)
      if (descriptor && descriptor.get) {
        try {
          const propertyValue = descriptor.get.call(target)
          if (Immutable.isFreezable(propertyValue)) {
            Immutable.freezeTransitively(propertyValue, visited, options)
            const newDescriptor: PropertyDescriptor = {
              get() {
                return propertyValue
              },
              enumerable: descriptor.enumerable ?? false,
              configurable: descriptor.configurable ?? false
            }
            if (descriptor.set) {
              newDescriptor.set = descriptor.set
            }
            Object.defineProperty(target, propertyKey, newDescriptor)
          }
        } catch {
          // no-op
        }
      }
    }
    if (options.freezePrototype) {
      const prototype = Object.getPrototypeOf(target)
      if (
        prototype !== null &&
        prototype !== Object.prototype &&
        !Immutable.isClassPrototype(prototype)
      ) {
        Immutable.freezeTransitively(prototype, visited, options)
      }
    }
    return Object.freeze(target)
  }

  private static *getChildValues(
    target: object,
    options?: Types.ChildValueOptions
  ): Generator<unknown> {
    if (Immutable.isMap(target)) {
      for (const [mapKey, mapValue] of target as Map<unknown, unknown>) {
        yield mapKey
        yield mapValue
      }
      return
    }
    if (Immutable.isSet(target)) {
      for (const setValue of target as Set<unknown>) {
        yield setValue
      }
      return
    }
    const propertyKeys = options?.includeNonEnumerable
      ? Reflect.ownKeys(target)
      : Object.keys(target)
    for (const propertyKey of propertyKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey)
      if (descriptor !== undefined && 'value' in descriptor) {
        yield descriptor.value
      }
      if (descriptor !== undefined && descriptor.get !== undefined) {
        try {
          yield descriptor.get.call(target)
        } catch {
          // no-op
        }
      }
    }
  }

  private static isClassPrototype(prototype: object): boolean {
    const constructorRef = (prototype as Record<string, unknown>).constructor
    return typeof constructorRef === 'function' && constructorRef.prototype === prototype
  }

  private static isFreezable(candidate: unknown): candidate is object {
    if (candidate === null) {
      return false
    }
    const candidateType = typeof candidate
    return candidateType === 'object' || candidateType === 'function'
  }

  private static isMap(candidate: object): boolean {
    try {
      return candidate instanceof Map
    } catch {
      return false
    }
  }

  private static isSet(candidate: object): boolean {
    try {
      return candidate instanceof Set
    } catch {
      return false
    }
  }
}
