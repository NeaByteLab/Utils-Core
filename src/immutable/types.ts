export interface ChildValueOptions {
  includeNonEnumerable?: boolean
}

export interface HardenOptions {
  includeNonEnumerable?: boolean
  freezePrototype?: boolean
  signal?: AbortSignal | undefined
}

export type DeepReadonly<T> = T extends (...args: never[]) => unknown ? T
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepReadonly<U>>
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlySet<infer U> ? ReadonlySet<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T
