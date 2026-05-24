import type * as Types from '@app/shared/types.ts'

export function assertFiniteNumber(
  name: string,
  value: number,
  errorMessage?: Types.AssertErrorMessage
): asserts value {
  if (!Number.isFinite(value)) {
    throw buildError(
      `${name} must be a finite number, got ${value}.`,
      errorMessage,
      name,
      value
    )
  }
}

export function assertInteger(
  name: string,
  value: number,
  options: Types.AssertIntegerOptions = {}
): asserts value {
  if (!Number.isInteger(value)) {
    throw buildError(
      `${name} must be an integer, got ${value}.`,
      options.errorMessage,
      name,
      value
    )
  }
  if (options.min !== undefined && value < options.min) {
    throw buildError(
      `${name} must be >= ${options.min}, got ${value}.`,
      options.errorMessage,
      name,
      value
    )
  }
  if (options.max !== undefined && value > options.max) {
    throw buildError(
      `${name} must be <= ${options.max}, got ${value}.`,
      options.errorMessage,
      name,
      value
    )
  }
}

export function assertMaxQueueSize(
  name: string,
  maxQueueSize: number,
  errorMessage?: Types.AssertErrorMessage
): asserts maxQueueSize {
  if (maxQueueSize === Number.POSITIVE_INFINITY) {
    return
  }
  assertFiniteNumber(name, maxQueueSize, errorMessage)
  if (!Number.isInteger(maxQueueSize)) {
    throw buildError(
      `${name} must be an integer or Infinity, got ${maxQueueSize}.`,
      errorMessage,
      name,
      maxQueueSize
    )
  }
  if (maxQueueSize < 0) {
    throw buildError(
      `${name} must be non-negative or Infinity, got ${maxQueueSize}.`,
      errorMessage,
      name,
      maxQueueSize
    )
  }
}

export function assertPositiveNumber(
  name: string,
  value: number,
  options: Types.AssertPositiveNumberOptions = {}
): asserts value {
  assertFiniteNumber(name, value, options.errorMessage)
  if (value <= (options.allowZero ? -1 : 0)) {
    throw buildError(
      `${name} must be a positive number${options.allowZero ? ' (>= 0)' : ''}, got ${value}.`,
      options.errorMessage,
      name,
      value
    )
  }
}

export function assertTimeout(
  name: string,
  timeoutMs: number,
  errorMessage?: Types.AssertErrorMessage
): asserts timeoutMs {
  assertFiniteNumber(name, timeoutMs, errorMessage)
  if (timeoutMs <= 0) {
    throw buildError(
      `${name} must be positive, got ${timeoutMs}.`,
      errorMessage,
      name,
      timeoutMs
    )
  }
}

function buildError(
  message: string,
  customMessage?: Types.AssertErrorMessage,
  name?: string,
  value?: number
): Error {
  if (customMessage === undefined) {
    return new RangeError(message)
  }
  if (typeof customMessage === 'function') {
    return new RangeError(customMessage(name ?? '', value ?? NaN))
  }
  return new RangeError(customMessage)
}
