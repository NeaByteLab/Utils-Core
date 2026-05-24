# Iterable

Lazy iterator pipeline built on native ES2025 Iterator helpers with fallback generators.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Pipes](#creating-pipes)
- [API Reference](#api-reference)
  - [Intermediate (Lazy)](#intermediate-lazy)
  - [Terminal (Eager)](#terminal-eager)

## Quick Start

```typescript
import { Iterable } from '@neabyte/utils-core'

// From any iterable
const result = Iterable.from([1, 2, 3, 4, 5])
  .map(n => n * 2)
  .filter(n => n > 4)
  .take(2)
  .toArray()

// result: [6, 8]
```

## Creating Pipes

### `Iterable.from<T>(iterable): Pipe<T>`

Wrap any iterable in a lazy pipe.

```typescript
Iterable.from([1, 2, 3])
Iterable.from(new Set([1, 2, 3]))
Iterable.from(new Map([['a', 1]]).values())
Iterable.from(
  (function* () {
    yield 1
    yield 2
  })()
)
```

### `Iterable.range(start, end?, step?): Pipe<number>`

Generate a numeric range.

```typescript
// [0, 1, 2, 3, 4]
Iterable.range(5).toArray()

// [2, 3, 4]
Iterable.range(2, 5).toArray()

// [10, 8, 6, 4, 2]
Iterable.range(10, 0, -2).toArray()
```

### `Iterable.repeat<T>(value, count?): Pipe<T>`

Repeat a value indefinitely or a fixed number of times.

```typescript
// ['x', 'x', 'x']
Iterable.repeat('x', 3).toArray()

// [0, 0, 0, 0, 0]
Iterable.repeat(0).take(5).toArray()
```

### `Iterable.zip<T>(...iterables): Pipe<T[]>`

Zip multiple iterables together, stopping at the shortest. Supports typed overloads for 2, 3, and 4 iterables.

```typescript
// [[1, 'a'], [2, 'b']]
Iterable.zip([1, 2, 3], ['a', 'b']).toArray()

// [[1, 'a', true], [2, 'b', false]]
Iterable.zip([1, 2], ['a', 'b'], [true, false]).toArray()
```

### `Iterable.empty<T>(): Pipe<T>`

Create an empty pipe.

```typescript
// []
Iterable.empty<number>().toArray()
```

## API Reference

### Intermediate (Lazy)

These methods return a new `Pipe` and do not consume the source until a terminal method is called.

#### `map<U>(fn: (value: T, index: number) => U): Pipe<U>`

Transform each element.

```typescript
// [2, 4, 6]
Iterable.from([1, 2, 3])
  .map(n => n * 2)
  .toArray()
```

#### `filter(fn: (value: T, index: number) => boolean): Pipe<T>`

Keep elements matching the predicate.

```typescript
// [2, 4]
Iterable.from([1, 2, 3, 4])
  .filter(n => n % 2 === 0)
  .toArray()
```

#### `take(count): Pipe<T>`

Take only the first `count` elements.

```typescript
// [1, 2]
Iterable.from([1, 2, 3, 4]).take(2).toArray()
```

> [!NOTE]
> Safe with infinite iterables: `Iterable.repeat(1).take(100)` works fine.

#### `drop(count): Pipe<T>`

Skip the first `count` elements.

```typescript
// [3, 4]
Iterable.from([1, 2, 3, 4]).drop(2).toArray()
```

#### `flatMap<U>(fn: (value: T, index: number) => Iterable<U>): Pipe<U>`

Map each element to an iterable, then flatten one level.

```typescript
// [1, 10, 2, 20]
Iterable.from([1, 2])
  .flatMap(n => [n, n * 10])
  .toArray()
```

#### `chunk(size): Pipe<T[]>`

Group elements into arrays of `size`.

```typescript
// [[1, 2], [3, 4], [5]]
Iterable.from([1, 2, 3, 4, 5]).chunk(2).toArray()
```

#### `enumerate(): Pipe<[number, T]>`

Pair each element with its index.

```typescript
// [[0, 'a'], [1, 'b']]
Iterable.from(['a', 'b']).enumerate().toArray()
```

#### `distinct(keyFn?: (value: T, index: number) => unknown): Pipe<T>`

Remove duplicates. Without arguments, uses `Set` equality. With a `keyFn`, deduplicates by computed key.

```typescript
// [1, 2, 3]
Iterable.from([1, 2, 2, 3, 1, 2]).distinct().toArray()

// Deduplicate objects by a key
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Alice (dup)' }
]

// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
Iterable.from(users)
  .distinct(u => u.id)
  .toArray()
```

#### `tap(fn: (value: T, index: number) => void): Pipe<T>`

Execute a side effect without transforming values.

```typescript
Iterable.from([1, 2, 3])
  .tap(n => console.log('processing:', n))
  .map(n => n * 2)
  .toArray()
```

#### `concat(...others: Iterable<T>[]): Pipe<T>`

Append one or more iterables to the end of the pipe. The source is yielded first, then each `other` in order.

```typescript
// [1, 2, 3, 4, 5, 6]
Iterable.from([1, 2, 3]).concat([4, 5], [6]).toArray()
```

#### `dropWhile(fn: (value: T, index: number) => boolean): Pipe<T>`

Skip elements from the start while the predicate returns true. Once the predicate returns false, every remaining element is yielded without re-checking.

```typescript
// [3, 4, 1, 2]
Iterable.from([1, 2, 3, 4, 1, 2]).dropWhile(n => n < 3).toArray()
```

#### `takeWhile(fn: (value: T, index: number) => boolean): Pipe<T>`

Yield elements from the start while the predicate returns true. Stops on the first element that fails the predicate.

```typescript
// [1, 2]
Iterable.from([1, 2, 3, 1]).takeWhile(n => n < 3).toArray()
```

#### `scan<U>(fn: (acc: U, value: T) => U, seed: U): Pipe<U>`

Emit each running accumulator value produced by applying `fn` to the previous accumulator and the next element, starting from `seed`. Unlike `reduce`, every intermediate value is yielded.

```typescript
// [1, 3, 6, 10]
Iterable.from([1, 2, 3, 4]).scan((sum, n) => sum + n, 0).toArray()
```

#### `toSorted(compareFn?: (a: T, b: T) => number): Pipe<T>`

Collect all elements into an array, sort them with the optional comparator, and wrap the sorted array in a new pipe. The original source is not modified.

```typescript
// [1, 2, 3, 4]
Iterable.from([3, 1, 4, 2]).toSorted().toArray()

// [4, 3, 2, 1]
Iterable.from([3, 1, 4, 2]).toSorted((a, b) => b - a).toArray()
```

### Terminal (Eager)

These methods consume the iterator and return a concrete value.

#### `toArray(): T[]`

Collect all elements into an array.

```typescript
// [1, 2, 3]
Iterable.from([1, 2, 3]).toArray()
```

#### `forEach(fn: (value: T, index: number) => void): void`

Execute a side effect for each element.

```typescript
Iterable.from([1, 2, 3]).forEach(n => console.log(n))
```

#### `reduce<U>(fn: (accumulator: U, value: T, index: number) => U, initial: U): U`

Reduce to a single value.

```typescript
// 6
Iterable.from([1, 2, 3]).reduce((sum, n) => sum + n, 0)
```

#### `some(fn: (value: T, index: number) => boolean): boolean`

Return `true` if any element matches.

```typescript
// true
Iterable.from([1, 2, 3]).some(n => n > 2)
```

> [!NOTE]
> Short-circuits on first match.

#### `every(fn: (value: T, index: number) => boolean): boolean`

Return `true` if all elements match.

```typescript
// true
Iterable.from([2, 4, 6]).every(n => n % 2 === 0)
```

> [!NOTE]
> Short-circuits on first mismatch.

#### `find(fn: (value: T, index: number) => boolean): T | undefined`

Return the first matching element.

```typescript
// 2
Iterable.from([1, 2, 3]).find(n => n > 1)
```

#### `first(): T | undefined`

Return the first element.

```typescript
// 1
Iterable.from([1, 2, 3]).first()

// undefined
Iterable.empty<number>().first()
```

#### `last(): T | undefined`

Return the last element.

```typescript
// 3
Iterable.from([1, 2, 3]).last()
```

#### `count(): number`

Count the elements.

```typescript
// 3
Iterable.from([1, 2, 3]).count()
```

#### `groupBy<K>(keyFn: (value: T, index: number) => K): Map<K, T[]>`

Group elements by a key function into a `Map`.

```typescript
const users = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob', role: 'user' },
  { name: 'Charlie', role: 'admin' }
]

// Map { 'admin' => [Alice, Charlie], 'user' => [Bob] }
const byRole = Iterable.from(users).groupBy(u => u.role)
```

#### `partition(fn: (value: T, index: number) => boolean): [T[], T[]]`

Split elements into two arrays. The first array contains every element for which the predicate returned true, and the second array contains the rest. Both arrays preserve the original order.

```typescript
// [[2, 4], [1, 3, 5]]
Iterable.from([1, 2, 3, 4, 5]).partition(n => n % 2 === 0)
```

#### `isEmpty(): boolean`

Return `true` if the iterable has no elements.

```typescript
// true
Iterable.empty<number>().isEmpty()

// false
Iterable.from([1]).isEmpty()
```

#### `join(separator = ','): string`

Join elements into a string.

```typescript
// '1-2-3'
Iterable.from([1, 2, 3]).join('-')
```

#### `toSet(): Set<T>`

Collect all elements into a `Set`.

```typescript
// Set { 1, 2, 3 }
Iterable.from([1, 2, 3, 2]).toSet()
```

#### `toMap<K, V>(keyFn, valueFn?): Map<K, V>`

Collect elements into a `Map` using a key function and optional value function.

```typescript
const users = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bob' }
]

// Map { 'a' => { id: 'a', name: 'Alice' }, 'b' => { id: 'b', name: 'Bob' } }
Iterable.from(users).toMap(u => u.id)

// Map { 'a' => 'Alice', 'b' => 'Bob' }
Iterable.from(users).toMap(u => u.id, u => u.name)
```

#### `[Symbol.iterator](): Iterator<T>`

Pipes implement the iterable protocol, so they work with `for...of`, spread, and destructuring.

```typescript
const pipe = Iterable.from([1, 2, 3]).map(n => n * 10)

for (const value of pipe) {
  console.log(value)
}

const [first, second] = Iterable.range(5)
```
