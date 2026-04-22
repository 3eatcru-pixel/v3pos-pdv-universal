/**
 * Cache anti-duplicação com expiração temporal para evitar loop/eco.
 */
export class PacketDedupCache {
  private cache = new Map<string, number>();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(maxSize = 1000, ttlMs = 10_000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cleanupTimer = setInterval(() => this.cleanup(), 2_000);
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  add(id: string): void {
    this.cache.set(id, Date.now());
    if (this.cache.size <= this.maxSize) return;
    const oldest = this.cache.keys().next().value as string | undefined;
    if (oldest) this.cache.delete(oldest);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, ts] of this.cache.entries()) {
      if ((now - ts) > this.ttlMs) {
        this.cache.delete(id);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.cache.clear();
  }
}
