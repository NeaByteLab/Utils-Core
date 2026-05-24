# Clone

Deep and shallow cloning utilities with structured clone fallback and custom type handlers.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)

## Quick Start

```typescript
import { Clone } from '@neabyte/utils-core'

// Deep clone using structuredClone when available
const copy = Clone.clone({ a: 1, nested: { b: 2 } })

// Deep clone with options
const deep = Clone.deepClone(source, { maxDepth: 10 })

// Shallow clone
const shallow = Clone.shallowClone([1, 2, 3])

// Clone with value replacement
const transformed = Clone.cloneWith(source, (value, key) => {
  if (typeof value === 'number') {
    return value * 2
  }
  return value
})
```

## API Reference

### `Clone.clone<T>(value: T): T`

Clone a value using `structuredClone` when available, falling back to `deepClone`.

```typescript
const source = { date: new Date(), list: [1, 2, 3] }
const copy = Clone.clone(source)

// Independent copy
console.log(copy.date !== source.date)
```

### `Clone.shallowClone<T>(value: T): T`

Create a shallow copy. Primitives are returned unchanged. Built-in types are recognized and duplicated, including Array, Date, RegExp, Map, Set, ArrayBuffer, TypedArray, DataView, Error, the `Boolean`, `Number`, and `String` wrapper objects, and `SharedArrayBuffer` when available. `WeakMap` and `WeakSet` are returned by reference because their entries cannot be enumerated. Plain objects and class instances are copied by creating a new object with the same prototype and reapplying every own property descriptor from `Reflect.ownKeys`.

```typescript
const source = [1, 2, 3]
const copy = Clone.shallowClone(source)

// Different array reference
console.log(copy !== source)

// Same inner references (shallow)
const nested = [{ v: 1 }]
const nestedCopy = Clone.shallowClone(nested)
console.log(nestedCopy[0] === nested[0])
```

### `Clone.deepClone<T>(value: T, options?: DeepCloneOptions): T`

Recursively clone a value with configurable options.

#### `DeepCloneOptions`

| Option              | Type                      | Default    | Description                                     |
| ------------------- | ------------------------- | ---------- | ----------------------------------------------- |
| `preservePrototype` | `boolean`                 | `true`     | Preserve the prototype chain of class instances |
| `maxDepth`          | `number`                  | `Infinity` | Maximum recursion depth                         |
| `replacer`          | `(value, key) => unknown` | —          | Transform values during cloning                 |
| `signal`            | `AbortSignal`             | —          | Abort the clone early (throws on abortion)      |

```typescript
const source = { a: { b: { c: 1 } } }

// Abort mid-clone
const controller = new AbortController()
try {
  Clone.deepClone(source, { signal: controller.signal })
} catch (err) {
  // Clone aborted
}

// Limit depth
assertThrows(() => Clone.deepClone(source, { maxDepth: 2 }))
```

### `Clone.structuredCloneSafe<T>(value: T, options?: StructuredCloneOptions): T`

Use the native `structuredClone` API directly with transferable support.

```typescript
const buffer = new Uint8Array([1, 2, 3]).buffer
const copy = Clone.structuredCloneSafe(buffer)
```

### `Clone.transferClone<T>(value: T, transfer: Transferable[]): T`

Clone a value while transferring ownership of the specified objects.

```typescript
const buffer = new ArrayBuffer(1024)
const copy = Clone.transferClone({ data: buffer }, [buffer])
// buffer is now detached
```

### `Clone.cloneWith<T>(value: T, replacer: CloneReplacer): T`

Deep clone with a replacer function that can transform values.

```typescript
const source = { x: 1, y: 2 }
const copy = Clone.cloneWith(source, value => {
  if (typeof value === 'number') {
    return value * 10
  }
  return value
})

// { x: 10, y: 20 }
console.log(copy)
```

### `Clone.register<T>(constructor, handler): void`

Register a custom clone handler for a specific class.

```typescript
class Point {
  constructor(
    public x: number,
    public y: number
  ) {}
}

Clone.register(Point, (value, recurse) => {
  return new Point(recurse(value.x), recurse(value.y))
})

const source = new Point(3, 4)
const copy = Clone.deepClone(source)
console.log(copy instanceof Point)
```

### `Clone.unregister(constructor): boolean`

Remove a previously registered custom clone handler.

```typescript
Clone.unregister(Point)
```
