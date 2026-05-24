export interface BuiltinCloneHandler {
  match: (value: object) => boolean
  shallowClone: (value: object) => object
  createShell: (value: object) => object
  populate?: (source: object, target: object, recurse: <U>(child: U) => U) => void
}

export interface DeepCloneOptions {
  preservePrototype?: boolean
  maxDepth?: number
  replacer?: CloneReplacer
  signal?: AbortSignal
}

export interface DeepContext {
  readonly visited: WeakMap<object, object>
  readonly signal: AbortSignal | undefined
  readonly options: Required<Pick<DeepCloneOptions, 'preservePrototype'>> & {
    maxDepth: number
    replacer?: CloneReplacer
  }
}

export interface PrimitiveWrapper {
  constructor: new (raw: unknown) => object
  valueOf(): unknown
}

export interface StructuredCloneOptions {
  transfer?: Transferable[]
}

export type AnyTypedArray = InstanceType<
  | typeof Uint8Array
  | typeof Uint8ClampedArray
  | typeof Int8Array
  | typeof Uint16Array
  | typeof Int16Array
  | typeof Uint32Array
  | typeof Int32Array
  | typeof Float32Array
  | typeof Float64Array
  | typeof BigInt64Array
  | typeof BigUint64Array
>

export type CloneCtor = new (...args: never[]) => object

export type CloneHandler<T> = (value: T, recurse: <U>(child: U) => U) => T

export type CloneHandlerEntry = [CloneCtor, CloneHandler<unknown>]

export type CloneReplacer = (value: unknown, key: PropertyKey | null) => unknown

export type ErrorWithCause = Error & { cause?: unknown }
