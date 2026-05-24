export class ReentrancyGuard {
  private readonly maxDepth: number
  private reentryDepth = 0

  constructor(maxDepth = 1) {
    this.maxDepth = maxDepth
  }

  get currentDepth(): number {
    return this.reentryDepth
  }

  enter(throwOnReentry = false): boolean {
    if (this.reentryDepth >= this.maxDepth) {
      if (throwOnReentry) {
        throw new Error(
          `Re-entrancy detected (depth=${this.reentryDepth}). Operation cannot be re-entrant.`
        )
      }
      return true
    }
    this.reentryDepth++
    return false
  }

  exit(): void {
    if (this.reentryDepth > 0) {
      this.reentryDepth--
    }
  }

  reset(): void {
    this.reentryDepth = 0
  }
}
