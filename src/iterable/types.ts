export interface Pipe<T> {
  [Symbol.iterator](): Iterator<T>
  chunk(size: number): Pipe<T[]>
  concat(...others: globalThis.Iterable<T>[]): Pipe<T>
  count(): number
  distinct(keyFn?: KeySelector<T>): Pipe<T>
  drop(count: number): Pipe<T>
  dropWhile(fn: Predicate<T>): Pipe<T>
  enumerate(): Pipe<[number, T]>
  every(fn: Predicate<T>): boolean
  filter(fn: Predicate<T>): Pipe<T>
  find(fn: Predicate<T>): T | undefined
  first(): T | undefined
  flatMap<U>(fn: Mapper<T, globalThis.Iterable<U>>): Pipe<U>
  forEach(fn: SideEffect<T>): void
  groupBy<K>(keyFn: KeySelector<T, K>): Map<K, T[]>
  isEmpty(): boolean
  join(separator?: string): string
  last(): T | undefined
  map<U>(fn: Mapper<T, U>): Pipe<U>
  partition(fn: Predicate<T>): [T[], T[]]
  reduce<U>(fn: Reducer<T, U>, initial: U): U
  scan<U>(fn: (acc: U, value: T) => U, seed: U): Pipe<U>
  some(fn: Predicate<T>): boolean
  take(count: number): Pipe<T>
  takeWhile(fn: Predicate<T>): Pipe<T>
  tap(fn: SideEffect<T>): Pipe<T>
  toArray(): T[]
  toMap<K, V>(keyFn: KeySelector<T, K>, valueFn?: Mapper<T, V>): Map<K, V>
  toSet(): Set<T>
  toSorted(compareFn?: (a: T, b: T) => number): Pipe<T>
}

export type KeySelector<T, K = unknown> = (value: T, index: number) => K

export type Mapper<T, U> = (value: T, index: number) => U

export type Predicate<T> = (value: T, index: number) => boolean

export type Reducer<T, U> = (accumulator: U, value: T, index: number) => U

export type SideEffect<T> = (value: T, index: number) => void
