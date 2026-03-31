/** Event signal for pub/sub communication. */
export type Signal<Args extends unknown[] = []> = {
  /** Register callback for events. */
  subscribe: (listener: (...args: Args) => void) => () => void
  /** Notify all subscribed callbacks. */
  emit: (...args: Args) => void
  /** Remove all registered callbacks. */
  clear: () => void
}
