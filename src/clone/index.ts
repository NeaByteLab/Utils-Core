import type * as Types from '@app/clone/types.ts'
import * as Shared from '@app/shared/index.ts'

export class Clone {
  private static readonly builtinHandlers: Types.BuiltinCloneHandler[] = [
    {
      match: Array.isArray,
      shallowClone: (input) => [...(input as unknown[])],
      createShell: (input) => new Array((input as unknown[]).length),
      populate: (source, target, recurse) => {
        const sourceArray = source as unknown[]
        const targetArray = target as unknown[]
        for (let index = 0; index < sourceArray.length; index++) {
          targetArray[index] = recurse(sourceArray[index])
        }
      }
    },
    {
      match: (input) => input instanceof Date,
      shallowClone: (input) => new Date((input as Date).getTime()),
      createShell: (input) => new Date((input as Date).getTime())
    },
    {
      match: (input) => input instanceof RegExp,
      shallowClone: (input) => Clone.cloneRegExp(input as RegExp),
      createShell: (input) => Clone.cloneRegExp(input as RegExp)
    },
    {
      match: (input) => input instanceof Map,
      shallowClone: (input) => new Map(input as Map<unknown, unknown>),
      createShell: () => new Map(),
      populate: (source, target, recurse) => {
        const sourceMap = source as Map<unknown, unknown>
        const targetMap = target as Map<unknown, unknown>
        for (const [entryKey, entryValue] of sourceMap) {
          targetMap.set(recurse(entryKey), recurse(entryValue))
        }
      }
    },
    {
      match: (input) => input instanceof Set,
      shallowClone: (input) => new Set(input as Set<unknown>),
      createShell: () => new Set(),
      populate: (source, target, recurse) => {
        const sourceSet = source as Set<unknown>
        const targetSet = target as Set<unknown>
        for (const entryValue of sourceSet) {
          targetSet.add(recurse(entryValue))
        }
      }
    },
    {
      match: (input) => input instanceof ArrayBuffer,
      shallowClone: (input) => (input as ArrayBuffer).slice(0),
      createShell: (input) => (input as ArrayBuffer).slice(0)
    },
    {
      match: Clone.isTypedArray,
      shallowClone: (input) => {
        const TypedArrayCtor = (input as Types.AnyTypedArray).constructor as new (
          source: Types.AnyTypedArray
        ) => Types.AnyTypedArray
        return new TypedArrayCtor(input as Types.AnyTypedArray)
      },
      createShell: (input) => {
        const TypedArrayCtor = (input as Types.AnyTypedArray).constructor as new (
          source: Types.AnyTypedArray
        ) => Types.AnyTypedArray
        return new TypedArrayCtor(input as Types.AnyTypedArray)
      }
    },
    {
      match: (input) => input instanceof DataView,
      shallowClone: (input) => {
        const dataView = input as DataView
        return new DataView(dataView.buffer.slice(0), dataView.byteOffset, dataView.byteLength)
      },
      createShell: (input) => {
        const dataView = input as DataView
        return new DataView(dataView.buffer.slice(0), dataView.byteOffset, dataView.byteLength)
      }
    },
    {
      match: (input) => input instanceof Error,
      shallowClone: (input) => Clone.cloneError(input as Error),
      createShell: (input) => Clone.cloneError(input as Error),
      populate: (source, target, recurse) => {
        const causeValue = (source as Types.ErrorWithCause).cause
        if (causeValue !== undefined) {
          Object.defineProperty(target, 'cause', {
            value: recurse(causeValue),
            writable: true,
            enumerable: false,
            configurable: true
          })
        }
      }
    },
    {
      match: (input) =>
        input instanceof Boolean || input instanceof Number || input instanceof String,
      shallowClone: (input) => {
        const primitiveWrapper = input as Types.PrimitiveWrapper
        return new primitiveWrapper.constructor(primitiveWrapper.valueOf())
      },
      createShell: (input) => {
        const primitiveWrapper = input as Types.PrimitiveWrapper
        return new primitiveWrapper.constructor(primitiveWrapper.valueOf())
      }
    },
    {
      match: (input) =>
        typeof SharedArrayBuffer !== 'undefined' && input instanceof SharedArrayBuffer,
      shallowClone: (input) => new SharedArrayBuffer((input as SharedArrayBuffer).byteLength),
      createShell: (input) => new SharedArrayBuffer((input as SharedArrayBuffer).byteLength)
    },
    {
      match: (input) => input instanceof WeakMap,
      shallowClone: (input) => input as WeakMap<object, unknown>,
      createShell: (input) => input as WeakMap<object, unknown>
    },
    {
      match: (input) => input instanceof WeakSet,
      shallowClone: (input) => input as WeakSet<object>,
      createShell: (input) => input as WeakSet<object>
    }
  ]
  private static readonly handlers: Types.CloneHandlerEntry[] = []

  static clone<T>(value: T): T {
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(value)
      } catch {
        return Clone.deepClone(value)
      }
    }
    return Clone.deepClone(value)
  }

  static cloneWith<T>(value: T, replacer: Types.CloneReplacer): T {
    return Clone.deepClone(value, { replacer })
  }

  static deepClone<T>(value: T, options?: Types.DeepCloneOptions): T {
    const context: Types.DeepContext = {
      visited: new WeakMap(),
      signal: options?.signal,
      options: {
        preservePrototype: options?.preservePrototype ?? true,
        maxDepth: options?.maxDepth ?? Number.POSITIVE_INFINITY,
        ...(options?.replacer === undefined ? {} : { replacer: options.replacer })
      }
    }
    return Clone.recurse(value, context, [], 0) as T
  }

  static register<T extends object>(
    constructor: new (...args: never[]) => T,
    handler: Types.CloneHandler<T>
  ): void {
    if (typeof constructor !== 'function') {
      throw new TypeError(
        `Clone.register() expected a constructor function, but received ${typeof constructor}.`
      )
    }
    Clone.handlers.push([constructor as Types.CloneCtor, handler as Types.CloneHandler<unknown>])
  }

  static shallowClone<T>(value: T): T {
    if (value === null || typeof value !== 'object') {
      return value
    }
    const handler = Clone.getBuiltinHandler(value as object)
    if (handler) {
      return handler.shallowClone(value as object) as T
    }
    const prototype = Object.getPrototypeOf(value)
    const copy = Object.create(prototype)
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor) {
        Object.defineProperty(copy, key, descriptor)
      }
    }
    return copy as T
  }

  static structuredCloneSafe<T>(value: T, options?: Types.StructuredCloneOptions): T {
    if (typeof structuredClone !== 'function') {
      throw new Error(
        'Clone.structuredCloneSafe() requires structuredClone to be available in this runtime.'
      )
    }
    try {
      const cloneOptions = options?.transfer ? { transfer: options.transfer } : undefined
      return structuredClone(value, cloneOptions)
    } catch (cloneFailure) {
      throw new Error(
        `Clone.structuredCloneSafe() rejected the value because it contains uncloneable data. Underlying error message was ${
          (cloneFailure as Error).message
        }`
      )
    }
  }

  static transferClone<T>(value: T, transfer: Transferable[]): T {
    return Clone.structuredCloneSafe(value, { transfer })
  }

  static unregister(constructor: Types.CloneCtor): boolean {
    const handlerIndex = Clone.handlers.findIndex(([registeredCtor]) =>
      registeredCtor === constructor
    )
    if (handlerIndex >= 0) {
      Clone.handlers.splice(handlerIndex, 1)
      return true
    }
    return false
  }

  private static cloneByType<T extends object>(value: T, context: Types.DeepContext): T {
    const handler = Clone.getBuiltinHandler(value)
    if (handler) {
      return handler.createShell(value) as T
    }
    let prototype: object | null
    try {
      prototype = Object.getPrototypeOf(value)
    } catch (prototypeError) {
      throw new Error(
        `Clone.deepClone() failed because Object.getPrototypeOf() threw. Underlying error message was ${
          (prototypeError as Error).message
        }`
      )
    }
    if (context.options.preservePrototype && prototype !== Object.prototype && prototype !== null) {
      return Object.create(prototype) as T
    }
    return {} as T
  }

  private static cloneError(value: Error): Error {
    const copy = Object.create(Object.getPrototypeOf(value)) as Error
    copy.message = value.message
    copy.name = value.name ?? ''
    Object.defineProperty(copy, 'stack', {
      value: value.stack,
      writable: true,
      enumerable: false,
      configurable: true
    })
    const causeValue = (value as Types.ErrorWithCause).cause
    if (causeValue !== undefined) {
      Object.defineProperty(copy, 'cause', {
        value: causeValue,
        writable: true,
        enumerable: false,
        configurable: true
      })
    }
    for (const key of Reflect.ownKeys(value)) {
      if (key === 'message' || key === 'name' || key === 'stack' || key === 'cause') {
        continue
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor && descriptor.enumerable !== false) {
        Object.defineProperty(copy, key, descriptor)
      }
    }
    return copy
  }

  private static cloneRegExp(value: RegExp): RegExp {
    const copy = new RegExp(value.source, value.flags)
    copy.lastIndex = value.lastIndex
    return copy
  }

  private static copyOwnProperties<T extends object>(
    source: T,
    target: T,
    context: Types.DeepContext,
    path: PropertyKey[],
    depth: number
  ): void {
    const sourceObject = source as object
    const targetObject = target as object
    for (const propertyKey of Reflect.ownKeys(sourceObject)) {
      const descriptor = Object.getOwnPropertyDescriptor(sourceObject, propertyKey)
      if (descriptor === undefined) {
        continue
      }
      path.push(propertyKey)
      if ('value' in descriptor) {
        const clonedValue = Clone.recurse(descriptor.value, context, path, depth + 1)
        Object.defineProperty(targetObject, propertyKey, {
          value: clonedValue,
          writable: descriptor.writable ?? true,
          enumerable: descriptor.enumerable ?? true,
          configurable: descriptor.configurable ?? true
        })
      } else {
        Object.defineProperty(targetObject, propertyKey, descriptor)
      }
      path.pop()
    }
  }

  private static findHandler(value: object): Types.CloneHandler<unknown> | undefined {
    for (let handlerIndex = Clone.handlers.length - 1; handlerIndex >= 0; handlerIndex--) {
      const [registeredCtor, handler] = Clone.handlers[handlerIndex]!
      try {
        if (value instanceof registeredCtor) {
          return handler
        }
      } catch {
        // no-op
      }
    }
    return undefined
  }

  private static formatPath(path: ReadonlyArray<PropertyKey>): string {
    if (path.length === 0) {
      return '<root>'
    }
    return path.map((segment) => (typeof segment === 'string' ? segment : String(segment))).join(
      '.'
    )
  }

  private static getBuiltinHandler(value: object): Types.BuiltinCloneHandler | undefined {
    for (const handler of Clone.builtinHandlers) {
      try {
        if (handler.match(value)) {
          return handler
        }
      } catch {
        // no-op
      }
    }
    return undefined
  }

  private static isTypedArray(value: unknown): value is Types.AnyTypedArray {
    return ArrayBuffer.isView(value) && !(value instanceof DataView)
  }

  private static populate<T extends object>(
    source: T,
    target: T,
    context: Types.DeepContext,
    path: PropertyKey[],
    depth: number
  ): void {
    const handler = Clone.getBuiltinHandler(source)
    if (handler?.populate) {
      const recurse = <U>(child: U): U => Clone.recurse(child, context, path, depth + 1)
      handler.populate(source, target, recurse)
    } else {
      Clone.copyOwnProperties(source, target, context, path, depth)
    }
  }

  private static recurse<T>(
    value: T,
    context: Types.DeepContext,
    path: PropertyKey[],
    depth: number
  ): T {
    Shared.throwIfAborted(
      context.signal,
      'Clone.deepClone() was aborted by the provided AbortSignal.'
    )
    const replaced = context.options.replacer
      ? (context.options.replacer(value, path.at(-1) ?? null) as T)
      : value
    if (replaced === null || typeof replaced !== 'object') {
      if (typeof replaced === 'function') {
        throw new Error(`Clone.deepClone() failed (function) at ${Clone.formatPath(path)}.`)
      }
      return replaced
    }
    if (depth >= context.options.maxDepth) {
      throw new Error(`Clone.deepClone() failed (maxDepth) at ${Clone.formatPath(path)}.`)
    }
    const replacedObject = replaced as object
    const cachedClone = context.visited.get(replacedObject)
    if (cachedClone !== undefined) {
      return cachedClone as T
    }
    const handler = Clone.findHandler(replacedObject)
    let cloned: T
    if (handler) {
      const recurse = <U>(child: U): U => Clone.recurse(child, context, path, depth + 1)
      cloned = handler(replaced, recurse) as T
    } else {
      cloned = Clone.cloneByType(replaced as object, context) as T
      context.visited.set(replacedObject, cloned as object)
      Clone.populate(replaced as object, cloned as object, context, path, depth)
      return cloned
    }
    context.visited.set(replacedObject, cloned as object)
    return cloned
  }
}
