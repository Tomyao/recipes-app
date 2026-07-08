/**
 * Minimal in-memory TTL cache used to avoid hammering TheMealDB for
 * slow-changing data (categories) and to soften bursts of repeat search/lookup
 * requests. Not shared across processes — fine for a single-instance proxy.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Fetch-or-populate helper so routes don't repeat the get/set dance. */
  async wrap(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    this.set(key, value, ttlMs);
    return value;
  }
}
