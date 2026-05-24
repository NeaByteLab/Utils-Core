import { assertEquals, assertNotStrictEquals, assertStrictEquals, assertThrows } from '@std/assert'
import { Clone } from '@neabyte/utils-core'

Deno.test('Clone - clone returns primitives unchanged', () => {
  assertEquals(Clone.clone(1), 1)
  assertEquals(Clone.clone('a'), 'a')
  assertEquals(Clone.clone(null), null)
  assertEquals(Clone.clone(undefined), undefined)
})

Deno.test('Clone - cloneWith replacer can transform values', () => {
  const source = { x: 1, y: 2 }
  const copy = Clone.cloneWith(source, (value) => {
    if (typeof value === 'number') {
      return value * 10
    }
    return value
  })
  assertEquals(copy, { x: 10, y: 20 })
})

Deno.test('Clone - deepClone clones Map, Set, Date, RegExp, ArrayBuffer, TypedArray', () => {
  const map = new Map<string, { v: number }>([['k', { v: 1 }]])
  const set = new Set([{ v: 2 }])
  const date = new Date('2024-05-01T00:00:00Z')
  const regex = /xyz/i
  const buffer = new Uint8Array([1, 2, 3, 4]).buffer
  const typed = new Int32Array([10, 20, 30])
  const mapCopy = Clone.deepClone(map)
  const setCopy = Clone.deepClone(set)
  const dateCopy = Clone.deepClone(date)
  const regexCopy = Clone.deepClone(regex)
  const bufferCopy = Clone.deepClone(buffer)
  const typedCopy = Clone.deepClone(typed)
  assertNotStrictEquals(mapCopy, map)
  assertEquals(mapCopy.get('k')?.v, 1)
  assertNotStrictEquals(mapCopy.get('k'), map.get('k'))
  assertEquals([...setCopy][0]?.v, 2)
  assertEquals(dateCopy.getTime(), date.getTime())
  assertEquals(regexCopy.source, 'xyz')
  assertEquals(bufferCopy.byteLength, buffer.byteLength)
  assertEquals(Array.from(new Uint8Array(bufferCopy)), [1, 2, 3, 4])
  assertEquals(Array.from(typedCopy), [10, 20, 30])
  assertNotStrictEquals(typedCopy, typed)
})

Deno.test('Clone - deepClone enforces maxDepth', () => {
  const source = { a: { b: { c: { d: 1 } } } }
  assertThrows(
    () => Clone.deepClone(source, { maxDepth: 2 }),
    Error,
    'Clone.deepClone() failed (maxDepth)'
  )
})

Deno.test('Clone - deepClone preserves cycles by identity', () => {
  const source: { self?: unknown; value: number } = { value: 7 }
  source.self = source
  const copy = Clone.deepClone(source)
  assertStrictEquals(copy.self, copy)
  assertEquals(copy.value, 7)
})

Deno.test('Clone - deepClone preserves Error subclass identity, message and stack', () => {
  const error = new TypeError('boom')
  const copy = Clone.deepClone(error)
  assertEquals(copy instanceof TypeError, true)
  assertEquals(copy.message, 'boom')
  assertEquals(copy.name, 'TypeError')
})

Deno.test('Clone - deepClone preserves prototype of class instances by default', () => {
  class Point {
    constructor(public x: number, public y: number) {}
    sum(): number {
      return this.x + this.y
    }
  }
  const source = new Point(3, 4)
  const copy = Clone.deepClone(source)
  assertEquals(copy instanceof Point, true)
  assertEquals(copy.sum(), 7)
  assertNotStrictEquals(copy, source)
})

Deno.test('Clone - deepClone produces independent nested structure', () => {
  const source = { a: 1, list: [{ b: 2 }, { c: 3 }] }
  const copy = Clone.deepClone(source)
  assertEquals(copy, source)
  assertNotStrictEquals(copy, source)
  assertNotStrictEquals(copy.list, source.list)
  assertNotStrictEquals(copy.list[0], source.list[0])
})

Deno.test('Clone - deepClone throws Error on functions', () => {
  assertThrows(
    () => Clone.deepClone({ fn: () => 1 }),
    Error,
    'Clone.deepClone() failed (function)'
  )
})

Deno.test('Clone - register allows custom class cloning that preserves identity', () => {
  class Tagged {
    constructor(public tag: string, public payload: number) {}
  }
  Clone.register(Tagged, (value, recurse) => new Tagged(value.tag, recurse(value.payload)))
  try {
    const source = new Tagged('x', 5)
    const copy = Clone.deepClone(source)
    assertEquals(copy instanceof Tagged, true)
    assertEquals(copy.tag, 'x')
    assertEquals(copy.payload, 5)
    assertNotStrictEquals(copy, source)
  } finally {
    Clone.unregister(Tagged)
  }
})

Deno.test('Clone - shallowClone copies arrays at first level only', () => {
  const inner = { v: 1 }
  const source = [inner, inner]
  const copy = Clone.shallowClone(source)
  assertNotStrictEquals(copy, source)
  assertStrictEquals(copy[0], inner)
  assertStrictEquals(copy[1], inner)
})

Deno.test('Clone - shallowClone handles built-in Date, RegExp, Map, Set', () => {
  const date = new Date('2024-01-02T00:00:00Z')
  const regex = /abc/gi
  regex.lastIndex = 2
  const map = new Map([['a', 1]])
  const set = new Set([1, 2])
  const dateCopy = Clone.shallowClone(date)
  const regexCopy = Clone.shallowClone(regex)
  const mapCopy = Clone.shallowClone(map)
  const setCopy = Clone.shallowClone(set)
  assertEquals(dateCopy.getTime(), date.getTime())
  assertNotStrictEquals(dateCopy, date)
  assertEquals(regexCopy.source, 'abc')
  assertEquals(regexCopy.flags, 'gi')
  assertEquals(regexCopy.lastIndex, 2)
  assertEquals([...mapCopy.entries()], [...map.entries()])
  assertNotStrictEquals(mapCopy, map)
  assertEquals([...setCopy.values()], [...set.values()])
  assertNotStrictEquals(setCopy, set)
})

Deno.test('Clone - structuredCloneSafe handles built-ins and throws on functions', () => {
  const source = { list: [1, 2, 3], when: new Date('2024-01-01T00:00:00Z') }
  const copy = Clone.structuredCloneSafe(source)
  assertEquals(copy.list, [1, 2, 3])
  assertEquals(copy.when.getTime(), source.when.getTime())
  assertThrows(
    () => Clone.structuredCloneSafe({ fn: () => 1 }),
    Error,
    'Clone.structuredCloneSafe() rejected'
  )
})

Deno.test('Clone - transferClone moves ArrayBuffer ownership when supported', () => {
  const buffer = new Uint8Array([1, 2, 3, 4]).buffer
  const copy = Clone.transferClone(buffer, [buffer])
  assertEquals(copy.byteLength, 4)
  assertEquals(buffer.byteLength, 0)
})
