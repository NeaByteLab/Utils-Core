import type * as Types from '@app/shared/types.ts'

export function dispatchSafely<T>(
  listeners: ReadonlySet<T>,
  invoke: Types.Invoker<T>,
  onError?: Types.DispatchErrorHandler<T>
): void {
  for (const listener of snapshotSet(listeners)) {
    try {
      invoke(listener)
    } catch (error) {
      onError?.(error, listener)
    }
  }
}

export function snapshotSet<T>(set: ReadonlySet<T>): T[] {
  return [...set]
}
