/** Sequential executor for async function queue. */
export type Sequential<Args extends unknown[], ReturnType> = {
  /** Execute function with sequential guarantee. */
  execute: (...args: Args) => Promise<ReturnType>
  /** Clear pending queue. */
  clear: () => void
  /** Get pending queue count. */
  getPendingCount: () => number
}

/** Queue item for sequential execution tracking. */
export type QueueItem<Args extends unknown[], ReturnType> = {
  /** Function arguments tuple */
  args: Args
  /** Promise resolve callback */
  resolve: (value: ReturnType) => void
  /** Promise reject callback */
  reject: (reason?: unknown) => void
  /** Execution context reference */
  context: unknown
}
