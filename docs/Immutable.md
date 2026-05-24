# Immutable

Recursive freezing, hardening, and read-only proxy utilities.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)

## Quick Start

```typescript
import { Immutable } from '@neabyte/utils-core'

// Deep freeze an object and all nested values
const frozen = Immutable.deepFreeze({ user: { name: 'Nea' } })

// Harden (freeze including non-enumerable keys and prototypes)
const hardened = Immutable.harden({ hidden: 1 })

// Create a read-only Map proxy
const readonlyMap = Immutable.freezeMap(new Map([['key', 'value']]))
```

## API Reference

### `Immutable.deepFreeze<T>(target: T, signal?: AbortSignal): DeepReadonly<T>`

Recursively freeze an object and all reachable values. For plain objects, only enumerable own keys are visited and the prototype chain is not walked. For Map values, both keys and values are visited. For Set values, every entry is visited. Getter values are read once, frozen if freezable, and redefined as data descriptors that return the same value.

```typescript
const obj = { nested: { value: 1 }, list: [1, 2, 3] }
const frozen = Immutable.deepFreeze(obj)

// All levels are frozen
console.log(Object.isFrozen(frozen.nested))
console.log(Object.isFrozen(frozen.list))
```

With abort signal:

```typescript
const controller = new AbortController()
try {
  Immutable.deepFreeze(hugeObject, controller.signal)
} catch (err) {
  // Aborted
}
```

### `Immutable.freeze<T>(target: T): Readonly<T>`

Shallow freeze a single object. Passes through primitives unchanged.

```typescript
const obj = { a: 1 }
const frozen = Immutable.freeze(obj)

// Same reference, but frozen
console.log(frozen === obj)
console.log(Object.isFrozen(frozen))
```

### `Immutable.harden<T>(target: T, options?: HardenOptions): DeepReadonly<T>`

Recursively freeze a value with the option to include non-enumerable own keys and the prototype chain. When `options` is omitted, the defaults applied are `includeNonEnumerable: true` and `freezePrototype: true`. When `options` is provided, only the fields explicitly set take effect and any missing field is treated as `undefined` rather than receiving the default. The prototype chain stops at `Object.prototype` and at any class prototype.

#### `HardenOptions`

| Option                | Type      | Default | Description                                              |
| --------------------- | --------- | ------- | -------------------------------------------------------- |
| `includeNonEnumerable`| `boolean` | `true` when `options` is omitted | Freeze non-enumerable own properties |
| `freezePrototype`     | `boolean` | `true` when `options` is omitted | Recursively freeze the prototype chain |
| `signal`              | `AbortSignal` | —   | Abort the hardening early                                |

```typescript
const obj: Record<string, number> = {}
Object.defineProperty(obj, 'hidden', { value: 1, enumerable: false })

const hardened = Immutable.harden(obj)
console.log(Object.isFrozen(hardened))
```

### `Immutable.freezeMap<K, V>(target: Map<K, V>): ReadonlyMap<K, V>`

Create a read-only proxy over a Map. Mutating methods throw TypeError.

```typescript
const map = new Map([['a', 1]])
const readonly = Immutable.freezeMap(map)

// Reads work
console.log(readonly.get('a'))

// Throws TypeError
readonly.set('b', 2)
readonly.delete('a')
readonly.clear()
```

### `Immutable.freezeSet<T>(target: Set<T>): ReadonlySet<T>`

Create a read-only proxy over a Set. Mutating methods throw TypeError.

```typescript
const set = new Set([1, 2, 3])
const readonly = Immutable.freezeSet(set)

// Reads work
console.log(readonly.has(2))

// Throws TypeError
readonly.add(4)
readonly.delete(1)
readonly.clear()
```

### `Immutable.isFrozen(target: unknown): boolean`

Check if a value is frozen. Treats primitives as always frozen.

```typescript
console.log(Immutable.isFrozen(42))
// true

console.log(Immutable.isFrozen({}))
// false

console.log(Immutable.isFrozen(Object.freeze({})))
// true
```

### `Immutable.isDeepFrozen(target: unknown, signal?: AbortSignal): boolean`

Check if a value and all nested values are frozen.

```typescript
const shallow = Object.freeze({ child: { v: 1 } })
console.log(Immutable.isDeepFrozen(shallow))
// false

const deep = Immutable.deepFreeze({ child: { v: 1 } })
console.log(Immutable.isDeepFrozen(deep))
// true
```
