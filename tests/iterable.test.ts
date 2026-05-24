import { assertEquals, assertThrows } from '@std/assert'
import { Iterable } from '@neabyte/utils-core'

Deno.test('Iter - chain multiple operations', () => {
  const filteredMappedArray = Iterable.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .filter((numberValue) => numberValue % 2 === 0)
    .map((numberValue) => numberValue * 10)
    .drop(1)
    .take(3)
    .toArray()
  assertEquals(filteredMappedArray, [40, 60, 80])
})

Deno.test('Iter - lazy evaluation', () => {
  let mapCallCount = 0
  let filterCallCount = 0
  const pipe = Iterable.from([1, 2, 3, 4, 5])
    .map((numberValue) => {
      mapCallCount++
      return numberValue * 2
    })
    .filter((numberValue) => {
      filterCallCount++
      return numberValue > 4
    })
  assertEquals(mapCallCount, 0)
  assertEquals(filterCallCount, 0)
  pipe.take(2).toArray()
  assertEquals(mapCallCount, 4)
  assertEquals(filterCallCount, 4)
})

Deno.test('Iter - one-shot iterator consumption', () => {
  function* numberGenerator() {
    yield 1
    yield 2
    yield 3
  }
  const pipe = Iterable.from(numberGenerator())
  assertEquals(pipe.count(), 3)
  assertEquals(pipe.count(), 0)
})

Deno.test('Iter - stress test large pipeline', () => {
  const filteredArray = Iterable.range(1, 10001)
    .map((numberValue) => numberValue * 2)
    .filter((numberValue) => numberValue % 3 === 0)
    .take(100)
    .toArray()
  assertEquals(filteredArray.length, 100)
  assertEquals(filteredArray[0], 6)
  assertEquals(filteredArray[99], 600)
})

Deno.test('Iter - Symbol.iterator protocol', () => {
  const mappedPipe = Iterable.from([1, 2, 3]).map((numberValue) => numberValue * 2)
  const collectedNumbers: number[] = []
  for (const numberValue of mappedPipe) {
    collectedNumbers.push(numberValue)
  }
  assertEquals(collectedNumbers, [2, 4, 6])
})

Deno.test('Iterable.chunk - groups into chunks', () => {
  const chunkedArray = Iterable.from([1, 2, 3, 4, 5])
    .chunk(2)
    .toArray()
  assertEquals(chunkedArray, [[1, 2], [3, 4], [5]])
})

Deno.test('Iterable.chunk - throws on Infinity size', () => {
  assertThrows(() => Iterable.from([1, 2]).chunk(Infinity), RangeError)
})

Deno.test('Iterable.chunk - throws on non-integer size', () => {
  assertThrows(() => Iterable.from([1, 2]).chunk(1.5), RangeError)
})

Deno.test('Iterable.chunk - throws on non-positive size', () => {
  assertThrows(() => Iterable.from([1, 2]).chunk(0), RangeError)
  assertThrows(() => Iterable.from([1, 2]).chunk(-1), RangeError)
})

Deno.test('Iterable.count - counts elements', () => {
  assertEquals(Iterable.from([1, 2, 3]).count(), 3)
  assertEquals(Iterable.empty<number>().count(), 0)
})

Deno.test('Iterable.distinct - keyFn is lazy with take', () => {
  let keyCallCount = 0
  const result = Iterable.from([1, 1, 2, 2, 3, 3, 4, 4])
    .distinct((value) => {
      keyCallCount++
      return value
    })
    .take(2)
    .toArray()
  assertEquals(result, [1, 2])
  assertEquals(keyCallCount <= 4, true)
})

Deno.test('Iterable.distinct - keyFn receives index', () => {
  const indices: number[] = []
  Iterable.from(['x', 'y', 'z'])
    .distinct((value, index) => {
      indices.push(index)
      return value
    })
    .toArray()
  assertEquals(indices, [0, 1, 2])
})

Deno.test('Iterable.distinct - keyFn throw propagates to terminal consumer', () => {
  const pipe = Iterable.from([1, 2, 3]).distinct(() => {
    throw new Error('keyFn-fail')
  })
  assertThrows(() => pipe.toArray(), Error, 'keyFn-fail')
})

Deno.test('Iterable.distinct - keyFn with all-equal keys returns single element', () => {
  const result = Iterable.from([1, 2, 3, 4]).distinct(() => 'same').toArray()
  assertEquals(result, [1])
})

Deno.test('Iterable.distinct - removes duplicates', () => {
  const uniqueArray = Iterable.from([1, 2, 2, 3, 1, 2])
    .distinct()
    .toArray()
  assertEquals(uniqueArray, [1, 2, 3])
})

Deno.test('Iterable.distinct - uses reference equality for objects', () => {
  const objA = { id: 1 }
  const objB = { id: 1 }
  const result = Iterable.from([objA, objB, objA]).distinct().toArray()
  assertEquals(result, [objA, objB])
})

Deno.test('Iterable.distinct - with keyFn deduplicates by computed key', () => {
  const items = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 1, name: 'c' },
    { id: 3, name: 'd' },
    { id: 2, name: 'e' }
  ]
  const result = Iterable.from(items)
    .distinct((item) => item.id)
    .toArray()
  assertEquals(result.length, 3)
  assertEquals(result.map((r) => r.id), [1, 2, 3])
  assertEquals(result.map((r) => r.name), ['a', 'b', 'd'])
})

Deno.test('Iterable.distinct - with keyFn on empty pipe returns empty', () => {
  const result = Iterable.empty<{ id: number }>()
    .distinct((item) => item.id)
    .toArray()
  assertEquals(result, [])
})

Deno.test('Iterable.drop - skips first N', () => {
  const result = Iterable.from([1, 2, 3, 4, 5])
    .drop(2)
    .toArray()
  assertEquals(result, [3, 4, 5])
})

Deno.test('Iterable.drop - zero returns all', () => {
  const result = Iterable.from([1, 2, 3])
    .drop(0)
    .toArray()
  assertEquals(result, [1, 2, 3])
})

Deno.test('Iterable.empty - returns empty pipe', () => {
  assertEquals(Iterable.empty<number>().toArray(), [])
})

Deno.test('Iterable.enumerate - pairs with index', () => {
  const indexedPairs = Iterable.from(['a', 'b'])
    .enumerate()
    .toArray()
  assertEquals(indexedPairs, [[0, 'a'], [1, 'b']])
})

Deno.test('Iterable.every - returns true for empty', () => {
  assertEquals(Iterable.empty<number>().every(() => false), true)
})

Deno.test('Iterable.every - returns true if all match', () => {
  assertEquals(Iterable.from([2, 4, 6]).every((numberValue) => numberValue % 2 === 0), true)
  assertEquals(Iterable.from([2, 3, 4]).every((numberValue) => numberValue % 2 === 0), false)
})

Deno.test('Iterable.every - short-circuits', () => {
  let predicateCallCount = 0
  Iterable.from([1, 2, 3]).every((numberValue) => {
    predicateCallCount++
    return numberValue < 2
  })
  assertEquals(predicateCallCount, 2)
})

Deno.test('Iterable.filter - keeps matching elements', () => {
  const evenNumbers = Iterable.from([1, 2, 3, 4])
    .filter((numberValue) => numberValue % 2 === 0)
    .toArray()
  assertEquals(evenNumbers, [2, 4])
})

Deno.test('Iterable.filter - passes index', () => {
  const filteredNumbers = Iterable.from([10, 20, 30])
    .filter((_, elementIndex) => elementIndex > 0)
    .toArray()
  assertEquals(filteredNumbers, [20, 30])
})

Deno.test('Iterable.find - returns first match', () => {
  assertEquals(Iterable.from([1, 2, 3]).find((numberValue) => numberValue > 1), 2)
  assertEquals(Iterable.from([1, 2, 3]).find((numberValue) => numberValue > 5), undefined)
})

Deno.test('Iterable.find - returns undefined for empty', () => {
  assertEquals(Iterable.empty<number>().find(() => true), undefined)
})

Deno.test('Iterable.first - returns first element', () => {
  assertEquals(Iterable.from([1, 2, 3]).first(), 1)
  assertEquals(Iterable.empty<number>().first(), undefined)
})

Deno.test('Iterable.first - returns undefined for empty', () => {
  assertEquals(Iterable.empty<number>().first(), undefined)
})

Deno.test('Iterable.flatMap - maps and flattens', () => {
  const flattenedArray = Iterable.from([1, 2])
    .flatMap((numberValue) => [numberValue, numberValue * 10])
    .toArray()
  assertEquals(flattenedArray, [1, 10, 2, 20])
})

Deno.test('Iterable.flatMap - throws when mapper returns non-iterable', () => {
  assertThrows(
    () => Iterable.from([1, 2]).flatMap(() => 42 as unknown as number[]).toArray(),
    TypeError
  )
})

Deno.test('Iterable.forEach - executes side effect', () => {
  const collectedNumbers: number[] = []
  Iterable.from([1, 2, 3]).forEach((numberValue) => collectedNumbers.push(numberValue))
  assertEquals(collectedNumbers, [1, 2, 3])
})

Deno.test('Iterable.from - throws on non-iterable', () => {
  assertThrows(() => Iterable.from(null as unknown as number[]), TypeError)
  assertThrows(() => Iterable.from(undefined as unknown as number[]), TypeError)
  assertThrows(() => Iterable.from(42 as unknown as number[]), TypeError)
})

Deno.test('Iterable.from - wraps array', () => {
  const fromArray = Iterable.from([1, 2, 3]).toArray()
  assertEquals(fromArray, [1, 2, 3])
})

Deno.test('Iterable.from - wraps generator', () => {
  function* numberGenerator() {
    yield 1
    yield 2
    yield 3
  }
  const generatorArray = Iterable.from(numberGenerator()).toArray()
  assertEquals(generatorArray, [1, 2, 3])
})

Deno.test('Iterable.from - wraps Map yielding key-value pairs', () => {
  const map = new Map<string, number>([['a', 1], ['b', 2]])
  const pairs = Iterable.from(map).toArray()
  assertEquals(pairs, [['a', 1], ['b', 2]])
})

Deno.test('Iterable.from - wraps Set', () => {
  const setArray = Iterable.from(new Set([1, 2, 2, 3])).toArray()
  assertEquals(setArray, [1, 2, 3])
})

Deno.test('Iterable.from - wraps string as char iterable', () => {
  assertEquals(Iterable.from('abc').toArray(), ['a', 'b', 'c'])
})

Deno.test('Iterable.groupBy - empty input yields empty map', () => {
  const result = Iterable.empty<number>().groupBy((n) => n)
  assertEquals(result.size, 0)
})

Deno.test('Iterable.groupBy - groups by numeric bucket', () => {
  const result = Iterable.range(1, 11).groupBy((n) => n % 2)
  assertEquals(result.get(1), [1, 3, 5, 7, 9])
  assertEquals(result.get(0), [2, 4, 6, 8, 10])
})

Deno.test('Iterable.groupBy - groups by object reference', () => {
  const keyA = { name: 'A' }
  const keyB = { name: 'B' }
  const items = [
    { key: keyA, value: 1 },
    { key: keyB, value: 2 },
    { key: keyA, value: 3 }
  ]
  const result = Iterable.from(items).groupBy((item) => item.key)
  assertEquals(result.get(keyA)?.length, 2)
  assertEquals(result.get(keyB)?.length, 1)
})

Deno.test('Iterable.groupBy - groups by string key', () => {
  const result = Iterable.from(['apple', 'ant', 'banana', 'berry', 'cherry'])
    .groupBy((word) => word.charAt(0))
  assertEquals(result.get('a'), ['apple', 'ant'])
  assertEquals(result.get('b'), ['banana', 'berry'])
  assertEquals(result.get('c'), ['cherry'])
  assertEquals(result.size, 3)
})

Deno.test('Iterable.groupBy - infinite source with take-first not applicable, but finite huge ok', () => {
  const result = Iterable.range(0, 1000).groupBy((n) => n % 3)
  assertEquals(result.get(0)?.length, 334)
  assertEquals(result.get(1)?.length, 333)
  assertEquals(result.get(2)?.length, 333)
})

Deno.test('Iterable.groupBy - keyFn throw propagates', () => {
  assertThrows(
    () =>
      Iterable.from([1, 2, 3]).groupBy(() => {
        throw new Error('keyFn-fail')
      }),
    Error,
    'keyFn-fail'
  )
})

Deno.test('Iterable.groupBy - passes index to key function', () => {
  const indices: number[] = []
  Iterable.from(['a', 'b', 'c', 'd']).groupBy((_, index) => {
    indices.push(index)
    return index < 2 ? 'low' : 'high'
  })
  assertEquals(indices, [0, 1, 2, 3])
})

Deno.test('Iterable.isEmpty - consumes only first element of generator', () => {
  let consumedCount = 0
  function* trackingGenerator() {
    while (true) {
      consumedCount++
      yield consumedCount
    }
  }
  Iterable.from(trackingGenerator()).isEmpty()
  assertEquals(consumedCount, 1)
})

Deno.test('Iterable.isEmpty - false for non-empty pipe', () => {
  assertEquals(Iterable.from([1]).isEmpty(), false)
  assertEquals(Iterable.from([1, 2, 3]).isEmpty(), false)
})

Deno.test('Iterable.isEmpty - safe with infinite source', () => {
  function* infiniteGenerator() {
    let i = 1
    while (true) {
      yield i++
    }
  }
  assertEquals(Iterable.from(infiniteGenerator()).isEmpty(), false)
})

Deno.test('Iterable.isEmpty - true for empty pipe', () => {
  assertEquals(Iterable.empty<number>().isEmpty(), true)
})

Deno.test('Iterable.join - joins into string', () => {
  assertEquals(Iterable.from([1, 2, 3]).join('-'), '1-2-3')
  assertEquals(Iterable.from([1, 2, 3]).join(), '1,2,3')
})

Deno.test('Iterable.join - returns empty string for empty', () => {
  assertEquals(Iterable.empty<number>().join('-'), '')
})

Deno.test('Iterable.last - returns last element', () => {
  assertEquals(Iterable.from([1, 2, 3]).last(), 3)
  assertEquals(Iterable.empty<number>().last(), undefined)
})

Deno.test('Iterable.map - passes index', () => {
  const indexArray = Iterable.from(['a', 'b', 'c'])
    .map((_, elementIndex) => elementIndex)
    .toArray()
  assertEquals(indexArray, [0, 1, 2])
})

Deno.test('Iterable.map - transforms elements', () => {
  const doubledArray = Iterable.from([1, 2, 3])
    .map((numberValue) => numberValue * 2)
    .toArray()
  assertEquals(doubledArray, [2, 4, 6])
})

Deno.test('Iterable.range - basic range', () => {
  assertEquals(Iterable.range(5).toArray(), [0, 1, 2, 3, 4])
})

Deno.test('Iterable.range - inclusive of start, exclusive of end', () => {
  assertEquals(Iterable.range(0, 3).toArray(), [0, 1, 2])
  assertEquals(Iterable.range(3, 0, -1).toArray(), [3, 2, 1])
})

Deno.test('Iterable.range - negative step', () => {
  assertEquals(Iterable.range(5, 0, -1).toArray(), [5, 4, 3, 2, 1])
})

Deno.test('Iterable.range - start and end', () => {
  assertEquals(Iterable.range(2, 5).toArray(), [2, 3, 4])
})

Deno.test('Iterable.range - start greater than end with positive step returns empty', () => {
  assertEquals(Iterable.range(10, 5).toArray(), [])
  assertEquals(Iterable.range(10, 5, 1).toArray(), [])
})

Deno.test('Iterable.range - start less than end with negative step returns empty', () => {
  assertEquals(Iterable.range(0, 5, -1).toArray(), [])
})

Deno.test('Iterable.range - throws on Infinity step', () => {
  assertThrows(() => Iterable.range(0, 5, Infinity), RangeError)
})

Deno.test('Iterable.range - throws on NaN start', () => {
  assertThrows(() => Iterable.range(NaN, 5), RangeError)
})

Deno.test('Iterable.range - throws on NaN step', () => {
  assertThrows(() => Iterable.range(0, 5, NaN), RangeError)
})

Deno.test('Iterable.range - throws on zero step', () => {
  assertThrows(() => Iterable.range(0, 5, 0), RangeError)
})

Deno.test('Iterable.range - with step', () => {
  assertEquals(Iterable.range(0, 10, 2).toArray(), [0, 2, 4, 6, 8])
})

Deno.test('Iterable.reduce - accumulates values', () => {
  const result = Iterable.from([1, 2, 3, 4]).reduce(
    (accumulator, numberValue) => accumulator + numberValue,
    0
  )
  assertEquals(result, 10)
})

Deno.test('Iterable.reduce - returns initial for empty', () => {
  assertEquals(
    Iterable.empty<number>().reduce((accumulator, currentValue) => accumulator + currentValue, 99),
    99
  )
})

Deno.test('Iterable.repeat - fixed count', () => {
  assertEquals(Iterable.repeat('x', 3).toArray(), ['x', 'x', 'x'])
})

Deno.test('Iterable.repeat - infinite with take', () => {
  assertEquals(Iterable.repeat(0).take(4).toArray(), [0, 0, 0, 0])
})

Deno.test('Iterable.some - returns false for empty', () => {
  assertEquals(Iterable.empty<number>().some(() => true), false)
})

Deno.test('Iterable.some - returns true if any match', () => {
  assertEquals(Iterable.from([1, 2, 3]).some((numberValue) => numberValue > 2), true)
  assertEquals(Iterable.from([1, 2, 3]).some((numberValue) => numberValue > 5), false)
})

Deno.test('Iterable.some - short-circuits', () => {
  let predicateCallCount = 0
  Iterable.from([1, 2, 3]).some((numberValue) => {
    predicateCallCount++
    return numberValue === 2
  })
  assertEquals(predicateCallCount, 2)
})

Deno.test('Iterable.take - safe with infinite', () => {
  function* infiniteGenerator() {
    let i = 1
    while (true) {
      yield i++
    }
  }
  const result = Iterable.from(infiniteGenerator())
    .take(5)
    .toArray()
  assertEquals(result, [1, 2, 3, 4, 5])
})

Deno.test('Iterable.take - takes first N', () => {
  const result = Iterable.from([1, 2, 3, 4, 5])
    .take(3)
    .toArray()
  assertEquals(result, [1, 2, 3])
})

Deno.test('Iterable.take - zero returns empty', () => {
  const result = Iterable.from([1, 2, 3])
    .take(0)
    .toArray()
  assertEquals(result, [])
})

Deno.test('Iterable.tap - side effect without transform', () => {
  const tappedNumbers: number[] = []
  const doubledResult = Iterable.from([1, 2, 3])
    .tap((numberValue) => tappedNumbers.push(numberValue))
    .map((numberValue) => numberValue * 2)
    .toArray()
  assertEquals(doubledResult, [2, 4, 6])
  assertEquals(tappedNumbers, [1, 2, 3])
})

Deno.test('Iterable.zip - returns empty with no arguments', () => {
  assertEquals(Iterable.zip().toArray(), [])
})

Deno.test('Iterable.zip - stops at shortest', () => {
  const zippedArray = Iterable.zip([1], ['a', 'b'], [true, false, false]).toArray()
  assertEquals(zippedArray, [[1, 'a', true]])
})

Deno.test('Iterable.zip - stops at shortest when one iterable is empty', () => {
  assertEquals(Iterable.zip([1, 2, 3], []).toArray(), [])
})

Deno.test('Iterable.zip - throws on non-iterable', () => {
  assertThrows(() => Iterable.zip([1, 2], null as unknown as number[]).toArray(), TypeError)
})

Deno.test('Iterable.zip - throws on null iterable when consumed', () => {
  assertThrows(
    () => Iterable.zip([1, 2], null as unknown as globalThis.Iterable<number>).toArray(),
    TypeError
  )
})

Deno.test('Iterable.zip - typed three-iterable overload yields tuples', () => {
  const zippedTriples: Array<[number, string, boolean]> = Iterable.zip(
    [1, 2],
    ['a', 'b'],
    [true, false]
  ).toArray()
  assertEquals(zippedTriples, [[1, 'a', true], [2, 'b', false]])
})

Deno.test('Iterable.zip - typed two-iterable overload yields tuples', () => {
  const zippedPairs: Array<[number, string]> = Iterable.zip([1, 2, 3], ['a', 'b', 'c']).toArray()
  assertEquals(zippedPairs, [[1, 'a'], [2, 'b'], [3, 'c']])
})

Deno.test('Iterable.zip - zips iterables', () => {
  const zippedArray = Iterable.zip([1, 2, 3], ['a', 'b']).toArray()
  assertEquals(zippedArray, [[1, 'a'], [2, 'b']])
})
