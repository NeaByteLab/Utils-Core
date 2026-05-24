import type * as Types from '@app/shared/types.ts'

export function createAbortError(reason?: string): Error {
  if (typeof DOMException === 'function') {
    return new DOMException(reason ?? 'The operation was aborted.', 'AbortError')
  }
  const error = new Error(reason ?? 'The operation was aborted.')
  error.name = 'AbortError'
  return error
}

export function onAbortOnce(
  signal: AbortSignal | undefined,
  handler: Types.AbortHandler
): Types.AbortHandler {
  signal?.addEventListener('abort', handler, { once: true })
  return () => {
    signal?.removeEventListener('abort', handler)
  }
}

export function throwIfAborted(signal: AbortSignal | undefined, message: string): void {
  if (signal?.aborted) {
    throw createAbortError(message)
  }
}
