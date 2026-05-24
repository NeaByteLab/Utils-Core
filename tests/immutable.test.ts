import { assertEquals, assertStrictEquals, assertThrows } from '@std/assert'
import { Immutable } from '@neabyte/utils-core'

Deno.test('Immutable - deepFreeze freezes contents of Map and Set', () => {
  const inputMap = new Map<string, { v: number }>([['k', { v: 1 }]])
  const inputSet = new Set<{ v: number }>([{ v: 1 }])
  const frozenMap = Immutable.deepFreeze(inputMap)
  const frozenSet = Immutable.deepFreeze(inputSet)
  assertEquals(Object.isFrozen(frozenMap), true)
  assertEquals(Object.isFrozen(frozenMap.get('k')), true)
  assertEquals(Object.isFrozen(frozenSet), true)
  for (const setValue of frozenSet) {
    assertEquals(Object.isFrozen(setValue), true)
  }
})

Deno.test('Immutable - deepFreeze handles cyclic references without infinite recursion', () => {
  const root: { self?: unknown } = {}
  root.self = root
  const frozen = Immutable.deepFreeze(root)
  assertEquals(Object.isFrozen(frozen), true)
  assertStrictEquals(frozen.self, frozen)
})

Deno.test('Immutable - deepFreeze recursively freezes nested objects and arrays', () => {
  const nested = { outer: { inner: { value: 1 } }, list: [{ k: 1 }, { k: 2 }] }
  const frozen = Immutable.deepFreeze(nested)
  assertEquals(Object.isFrozen(frozen), true)
  assertEquals(Object.isFrozen(frozen.outer), true)
  assertEquals(Object.isFrozen(frozen.outer.inner), true)
  assertEquals(Object.isFrozen(frozen.list), true)
  assertEquals(Object.isFrozen(frozen.list[0]), true)
})

Deno.test('Immutable - freeze applies Object.freeze and returns the same reference', () => {
  const target = { a: 1, b: 2 }
  const frozen = Immutable.freeze(target)
  assertStrictEquals(frozen, target)
  assertEquals(Object.isFrozen(frozen), true)
})

Deno.test('Immutable - freeze passes through primitives unchanged', () => {
  assertEquals(Immutable.freeze(42), 42)
  assertEquals(Immutable.freeze('hello'), 'hello')
  assertEquals(Immutable.freeze(null), null)
  assertEquals(Immutable.freeze(undefined), undefined)
})

Deno.test('Immutable - freezeMap rejects non-Map input', () => {
  const notMap = {} as unknown as Map<string, number>
  assertThrows(
    () => Immutable.freezeMap(notMap),
    TypeError,
    'expected a Map'
  )
})

Deno.test('Immutable - freezeMap traps mutating methods and forwards reads', () => {
  const target = new Map<string, number>([['a', 1]])
  const readonly = Immutable.freezeMap(target)
  assertEquals(readonly.get('a'), 1)
  assertEquals(readonly.size, 1)
  const asWritableMap: Map<string, number> = readonly as unknown as Map<string, number>
  assertThrows(
    () => asWritableMap.set('b', 2),
    TypeError,
    'cannot call set()'
  )
  assertThrows(
    () => asWritableMap.delete('a'),
    TypeError,
    'cannot call delete()'
  )
  assertThrows(
    () => asWritableMap.clear(),
    TypeError,
    'cannot call clear()'
  )
})

Deno.test('Immutable - freezeSet rejects non-Set input', () => {
  const notSet = {} as unknown as Set<number>
  assertThrows(
    () => Immutable.freezeSet(notSet),
    TypeError,
    'expected a Set'
  )
})

Deno.test('Immutable - freezeSet traps mutating methods and forwards reads', () => {
  const target = new Set<number>([1, 2, 3])
  const readonly = Immutable.freezeSet(target)
  assertEquals(readonly.size, 3)
  assertEquals(readonly.has(2), true)
  const asWritableSet: Set<number> = readonly as unknown as Set<number>
  assertThrows(
    () => asWritableSet.add(4),
    TypeError,
    'cannot call add()'
  )
  assertThrows(
    () => asWritableSet.delete(1),
    TypeError,
    'cannot call delete()'
  )
  assertThrows(
    () => asWritableSet.clear(),
    TypeError,
    'cannot call clear()'
  )
})

Deno.test('Immutable - harden also freezes non-enumerable own keys', () => {
  const target: Record<string, number> = {}
  Object.defineProperty(target, 'hidden', { value: 1, enumerable: false })
  const hardened = Immutable.harden(target)
  assertEquals(Object.isFrozen(hardened), true)
})

Deno.test('Immutable - isDeepFrozen reports false when any descendant is mutable', () => {
  const target = Object.freeze({ child: { v: 1 } })
  assertEquals(Immutable.isDeepFrozen(target), false)
  const allFrozen = Immutable.deepFreeze({ child: { v: 1 } })
  assertEquals(Immutable.isDeepFrozen(allFrozen), true)
})

Deno.test('Immutable - isFrozen treats primitives as frozen', () => {
  assertEquals(Immutable.isFrozen(1), true)
  assertEquals(Immutable.isFrozen('a'), true)
  assertEquals(Immutable.isFrozen(null), true)
  assertEquals(Immutable.isFrozen({}), false)
  assertEquals(Immutable.isFrozen(Object.freeze({})), true)
})
