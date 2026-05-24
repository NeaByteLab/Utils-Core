import type * as Types from '@app/iterable/types.ts'

export class PipeImpl<T> implements Types.Pipe<T> {
  private static readonly isNative = typeof Iterator !== 'undefined'

  constructor(private source: globalThis.Iterable<T>) {}

  [Symbol.iterator](): Iterator<T> {
    return this.source[Symbol.iterator]()
  }

  chunk(size: number): Types.Pipe<T[]> {
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError(
        `Iterable.chunk() received invalid size ${size}. Chunk size must be a positive integer.`
      )
    }
    return this.wrapGenerator(function* (source) {
      let currentChunk: T[] = []
      for (const value of source) {
        currentChunk.push(value)
        if (currentChunk.length === size) {
          yield currentChunk
          currentChunk = []
        }
      }
      if (currentChunk.length > 0) {
        yield currentChunk
      }
    })
  }

  concat(...others: globalThis.Iterable<T>[]): Types.Pipe<T> {
    return this.wrapGenerator(function* (source) {
      for (const value of source) {
        yield value
      }
      for (const other of others) {
        for (const value of other) {
          yield value
        }
      }
    })
  }

  count(): number {
    if (PipeImpl.isNative) {
      return this.toNativeIterator().reduce((total) => total + 1, 0)
    }
    let itemCount = 0
    for (const _ of this.source) {
      itemCount++
    }
    return itemCount
  }

  distinct(keyFn?: Types.KeySelector<T>): Types.Pipe<T> {
    const selectKey: Types.KeySelector<T, unknown> = keyFn ?? ((value) => value)
    return this.wrapGenerator(function* (source) {
      const seenKeys = new Set<unknown>()
      let index = 0
      for (const value of source) {
        const key = selectKey(value, index++)
        if (seenKeys.has(key)) {
          continue
        }
        seenKeys.add(key)
        yield value
      }
    })
  }

  drop(count: number): Types.Pipe<T> {
    if (count <= 0) {
      return this.wrap(this.source)
    }
    if (PipeImpl.isNative) {
      return this.wrap(this.toNativeIterator().drop(count))
    }
    return this.wrapGenerator(function* (source) {
      let index = 0
      for (const value of source) {
        if (index++ < count) {
          continue
        }
        yield value
      }
    })
  }

  dropWhile(fn: Types.Predicate<T>): Types.Pipe<T> {
    return this.wrapGenerator(function* (source) {
      let index = 0
      let dropping = true
      for (const value of source) {
        if (dropping && fn(value, index++)) {
          continue
        }
        dropping = false
        yield value
      }
    })
  }

  enumerate(): Types.Pipe<[number, T]> {
    return this.map((value, index) => [index, value])
  }

  every(fn: Types.Predicate<T>): boolean {
    if (PipeImpl.isNative) {
      return this.toNativeIterator().every(fn)
    }
    let index = 0
    for (const value of this.source) {
      if (!fn(value, index++)) {
        return false
      }
    }
    return true
  }

  filter(fn: Types.Predicate<T>): Types.Pipe<T> {
    if (PipeImpl.isNative) {
      return this.wrap(this.toNativeIterator().filter(fn))
    }
    return this.wrapGenerator(function* (source) {
      let index = 0
      for (const value of source) {
        if (fn(value, index++)) {
          yield value
        }
      }
    })
  }

  find(fn: Types.Predicate<T>): T | undefined {
    if (PipeImpl.isNative) {
      return this.toNativeIterator().find(fn)
    }
    let index = 0
    for (const value of this.source) {
      if (fn(value, index++)) {
        return value
      }
    }
    return undefined
  }

  first(): T | undefined {
    if (PipeImpl.isNative) {
      const nextResult = this.toNativeIterator().next()
      return nextResult.done ? undefined : nextResult.value
    }
    for (const value of this.source) {
      return value
    }
    return undefined
  }

  flatMap<U>(fn: Types.Mapper<T, globalThis.Iterable<U>>): Types.Pipe<U> {
    if (PipeImpl.isNative) {
      return this.wrap(this.toNativeIterator().flatMap(fn))
    }
    return this.wrapGenerator(function* (source) {
      let index = 0
      for (const value of source) {
        for (const inner of fn(value, index++)) {
          yield inner
        }
      }
    })
  }

  forEach(fn: Types.SideEffect<T>): void {
    if (PipeImpl.isNative) {
      this.toNativeIterator().forEach(fn)
      return
    }
    let index = 0
    for (const value of this.source) {
      fn(value, index++)
    }
  }

  groupBy<K>(keyFn: Types.KeySelector<T, K>): Map<K, T[]> {
    const groups = new Map<K, T[]>()
    let index = 0
    for (const value of this.source) {
      const key = keyFn(value, index++)
      const existingGroup = groups.get(key)
      if (existingGroup) {
        existingGroup.push(value)
      } else {
        groups.set(key, [value])
      }
    }
    return groups
  }

  isEmpty(): boolean {
    if (PipeImpl.isNative) {
      const nextResult = this.toNativeIterator().next()
      return nextResult.done === true
    }
    for (const _ of this.source) {
      return false
    }
    return true
  }

  join(separator = ','): string {
    return this.toArray().join(separator)
  }

  last(): T | undefined {
    if (PipeImpl.isNative) {
      return this.toNativeIterator().reduce<T | undefined>((_, value) => value, undefined)
    }
    let lastValue: T | undefined
    for (const value of this.source) {
      lastValue = value
    }
    return lastValue
  }

  map<U>(fn: Types.Mapper<T, U>): Types.Pipe<U> {
    if (PipeImpl.isNative) {
      return this.wrap(this.toNativeIterator().map(fn))
    }
    return this.wrapGenerator(function* (source) {
      let index = 0
      for (const value of source) {
        yield fn(value, index++)
      }
    })
  }

  partition(fn: Types.Predicate<T>): [T[], T[]] {
    const passList: T[] = []
    const failList: T[] = []
    let index = 0
    for (const value of this.source) {
      if (fn(value, index++)) {
        passList.push(value)
      } else {
        failList.push(value)
      }
    }
    return [passList, failList]
  }

  reduce<U>(fn: Types.Reducer<T, U>, initial: U): U {
    if (PipeImpl.isNative) {
      return this.toNativeIterator().reduce(fn, initial)
    }
    let accumulator = initial
    let index = 0
    for (const value of this.source) {
      accumulator = fn(accumulator, value, index++)
    }
    return accumulator
  }

  scan<U>(fn: (acc: U, value: T) => U, seed: U): Types.Pipe<U> {
    return this.wrapGenerator(function* (source) {
      let accumulator = seed
      for (const value of source) {
        accumulator = fn(accumulator, value)
        yield accumulator
      }
    })
  }

  some(fn: Types.Predicate<T>): boolean {
    if (PipeImpl.isNative) {
      return this.toNativeIterator().some(fn)
    }
    let index = 0
    for (const value of this.source) {
      if (fn(value, index++)) {
        return true
      }
    }
    return false
  }

  take(count: number): Types.Pipe<T> {
    if (count <= 0) {
      return this.wrap([])
    }
    if (PipeImpl.isNative) {
      return this.wrap(this.toNativeIterator().take(count))
    }
    return this.wrapGenerator(function* (source) {
      let index = 0
      for (const value of source) {
        if (index++ >= count) {
          break
        }
        yield value
      }
    })
  }

  takeWhile(fn: Types.Predicate<T>): Types.Pipe<T> {
    return this.wrapGenerator(function* (source) {
      let index = 0
      for (const value of source) {
        if (!fn(value, index++)) {
          break
        }
        yield value
      }
    })
  }

  tap(fn: Types.SideEffect<T>): Types.Pipe<T> {
    return this.map((value, index) => {
      fn(value, index)
      return value
    })
  }

  toArray(): T[] {
    if (PipeImpl.isNative) {
      return this.toNativeIterator().toArray()
    }
    return [...this.source]
  }

  toMap<K, V>(keyFn: Types.KeySelector<T, K>, valueFn?: Types.Mapper<T, V>): Map<K, V> {
    const result = new Map<K, V>()
    let index = 0
    for (const value of this.source) {
      const key = keyFn(value, index)
      const mappedValue = valueFn !== undefined ? valueFn(value, index) : (value as unknown as V)
      result.set(key, mappedValue)
      index++
    }
    return result
  }

  toSet(): Set<T> {
    return new Set(this.source)
  }

  toSorted(compareFn?: (a: T, b: T) => number): Types.Pipe<T> {
    return this.wrap(this.toArray().toSorted(compareFn))
  }

  private toNativeIterator(): IteratorObject<T> {
    return Iterator.from(this.source)
  }

  private wrap<U>(iterable: globalThis.Iterable<U>): Types.Pipe<U> {
    return new PipeImpl(iterable)
  }

  private wrapGenerator<R>(
    generator: (source: globalThis.Iterable<T>) => Generator<R>
  ): Types.Pipe<R> {
    return this.wrap(generator(this.source))
  }
}
