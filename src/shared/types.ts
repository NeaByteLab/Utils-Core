export interface AssertIntegerOptions {
  min?: number
  max?: number
  errorMessage?: AssertErrorMessage
}

export interface AssertPositiveNumberOptions {
  allowZero?: boolean
  errorMessage?: AssertErrorMessage
}

export type AbortHandler = () => void

export type AssertErrorMessage = string | ((name: string, value: number) => string)

export type DispatchErrorHandler<T> = (error: unknown, listener: T) => void

export type Invoker<T> = (listener: T) => void
