import type * as Types from '@app/iterable/types.ts'
import * as Shared from '@app/shared/index.ts'
import { PipeImpl } from '@app/iterable/base.ts'

export class Iterable {
  static empty<T>(): Types.Pipe<T> {
    return new PipeImpl([])
  }

  static from<T>(iterable: globalThis.Iterable<T>): Types.Pipe<T> {
    if (iterable == null) {
      throw new TypeError(`Iterable.from() received null or undefined ${iterable}.`)
    }
    const iteratorFn = (iterable as globalThis.Iterable<T>)[Symbol.iterator]
    if (typeof iteratorFn !== 'function') {
      throw new TypeError(`Iterable.from() received a non-iterable value ${iterable}.`)
    }
    let probeIterator: Iterator<unknown>
    try {
      probeIterator = iteratorFn.call(iterable)
    } catch (error) {
      throw new TypeError(
        `Iterable.from() received an iterable whose [Symbol.iterator]() threw. Underlying error message was ${
          (error as Error).message ?? (iterable as object).constructor?.name ?? String(iterable)
        }`
      )
    }
    if (probeIterator == null || typeof probeIterator.next !== 'function') {
      throw new TypeError(
        `Iterable.from() received an iterable whose [Symbol.iterator]() did not return a valid iterator.`
      )
    }
    return new PipeImpl(iterable)
  }

  static range(start: number, end?: number, step = 1): Types.Pipe<number> {
    Shared.assertFiniteNumber('start', start)
    if (end !== undefined) {
      Shared.assertFiniteNumber('end', end)
    }
    Shared.assertFiniteNumber('step', step)
    if (step === 0) {
      throw new RangeError(
        `Iterable.range() received invalid step 0. Step must be a non-zero number.`
      )
    }
    if (end === undefined) {
      end = start
      start = 0
    }
    if (step > 0 && start < end && start + step === start) {
      throw new RangeError(
        `Iterable.range() step ${step} is too small for the magnitude of start ${start}. The floating-point ULP at ${start} exceeds the step size, causing an infinite loop.`
      )
    }
    if (step < 0 && start > end && start + step === start) {
      throw new RangeError(
        `Iterable.range() step ${step} is too small (in magnitude) for the magnitude of start ${start}. The floating-point ULP at ${start} exceeds |step|, causing an infinite loop.`
      )
    }
    return new PipeImpl(
      (function* () {
        if (step > 0) {
          for (let index = start; index < end!; index += step) {
            yield index
          }
        } else {
          for (let index = start; index > end!; index += step) {
            yield index
          }
        }
      })()
    )
  }

  static repeat<T>(value: T, count?: number): Types.Pipe<T> {
    if (count !== undefined) {
      Shared.assertFiniteNumber('count', count)
      if (count < 0 || !Number.isInteger(count)) {
        throw new RangeError(
          `Iterable.repeat() count must be a non-negative integer, got ${count}.`
        )
      }
    }
    return new PipeImpl(
      (function* () {
        if (count === undefined) {
          while (true) {
            yield value
          }
        } else {
          for (let index = 0; index < count; index++) {
            yield value
          }
        }
      })()
    )
  }

  static zip<A, B>(a: globalThis.Iterable<A>, b: globalThis.Iterable<B>): Types.Pipe<[A, B]>
  static zip<A, B, C>(
    a: globalThis.Iterable<A>,
    b: globalThis.Iterable<B>,
    c: globalThis.Iterable<C>
  ): Types.Pipe<[A, B, C]>
  static zip<A, B, C, D>(
    a: globalThis.Iterable<A>,
    b: globalThis.Iterable<B>,
    c: globalThis.Iterable<C>,
    d: globalThis.Iterable<D>
  ): Types.Pipe<[A, B, C, D]>
  static zip(...iterables: globalThis.Iterable<unknown>[]): Types.Pipe<unknown[]>
  static zip(...iterables: globalThis.Iterable<unknown>[]): Types.Pipe<unknown[]> {
    if (iterables.length === 0) {
      return new PipeImpl([])
    }
    return new PipeImpl(
      (function* () {
        const iterators: Iterator<unknown>[] = []
        try {
          for (const iterable of iterables) {
            iterators.push(iterable[Symbol.iterator]())
          }
        } catch (error) {
          for (const iterator of iterators) {
            iterator.return?.()
          }
          throw error
        }
        let originalError: unknown
        try {
          while (true) {
            const tuple = new Array<unknown>(iterators.length)
            for (let i = 0; i < iterators.length; i++) {
              let nextResult: IteratorResult<unknown>
              try {
                nextResult = iterators[i]!.next()
              } catch (error) {
                originalError = error
                throw error
              }
              if (nextResult.done) {
                return
              }
              tuple[i] = nextResult.value
            }
            yield tuple
          }
        } catch (error) {
          originalError = originalError ?? error
        } finally {
          for (const iterator of iterators) {
            try {
              iterator.return?.()
            } catch {
              // no-op
            }
          }
        }
        if (originalError !== undefined) {
          throw originalError
        }
      })()
    )
  }
}
