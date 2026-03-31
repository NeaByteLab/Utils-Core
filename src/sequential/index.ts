import type * as Types from '@app/sequential/Types.ts'

/**
 * Sequential execution implementation.
 * @description Manages async function queue to prevent race conditions.
 * @template Args - Tuple of function argument types.
 * @template ReturnType - Function return type.
 */
class SequentialImpl<Args extends unknown[], ReturnType> implements
  Types.Sequential<
    Args,
    ReturnType
  > {
  /** Queue of pending executions. */
  private itemQueue: Types.QueueItem<Args, ReturnType>[] = []
  /** Current processing state. */
  private isProcessing = false
  /** Wrapped async function. */
  private targetFunction: (...args: Args) => Promise<ReturnType>

  /**
   * Initialize sequential executor.
   * @description Creates wrapper for async function.
   * @param targetFunction - Async function to wrap.
   */
  constructor(targetFunction: (...args: Args) => Promise<ReturnType>) {
    this.targetFunction = targetFunction
  }

  /**
   * Clear pending queue.
   * @description Removes queued items and rejects promises.
   */
  clear(): void {
    while (this.itemQueue.length > 0) {
      const item = this.itemQueue.shift()!
      item.reject(new Error('Sequential execution cleared'))
    }
  }

  /**
   * Execute function with sequential guarantee.
   * @description Adds call to queue and processes in order.
   * @param args - Arguments for function.
   * @returns Promise resolving to function result.
   */
  execute(...args: Args): Promise<ReturnType> {
    return new Promise((resolve, reject) => {
      this.itemQueue.push({ args, resolve, reject, context: this })
      void this.processQueue()
    })
  }

  /**
   * Get pending queue count.
   * @description Returns number of queued executions.
   * @returns - Queue size.
   */
  getPendingCount(): number {
    return this.itemQueue.length
  }

  /**
   * Process queued executions.
   * @description Executes queued items sequentially.
   * @returns - Empty promise on completion.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }
    if (this.itemQueue.length === 0) {
      return
    }
    this.isProcessing = true
    try {
      while (this.itemQueue.length > 0) {
        const item = this.itemQueue.shift()!
        try {
          const result = await this.targetFunction.apply(item.context, item.args)
          item.resolve(result)
        } catch (error) {
          item.reject(error)
        }
      }
    } finally {
      this.isProcessing = false
      if (this.itemQueue.length > 0) {
        void this.processQueue()
      }
    }
  }
}

/**
 * Create new sequential executor.
 * @description Factory for sequential execution wrapper.
 * @param targetFunction - Async function to wrap.
 * @returns Configured sequential executor.
 */
export function createSequential<Args extends unknown[], ReturnType>(
  targetFunction: (...args: Args) => Promise<ReturnType>
): Types.Sequential<Args, ReturnType> {
  return new SequentialImpl(targetFunction)
}
