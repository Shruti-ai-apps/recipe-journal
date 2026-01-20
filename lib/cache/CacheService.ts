/**
 * Simple in-memory cache service
 */

import { logger } from '@/lib/utils';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// Default TTL: 30 minutes
const DEFAULT_TTL_MS = 30 * 60 * 1000;

export class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly ttlMs: number;
  private readonly enabled: boolean;
  private readonly maxEntries: number;
  private lastCleanupAt = 0;
  private readonly cleanupEveryMs = 60_000;

  constructor(ttlMs: number = DEFAULT_TTL_MS, enabled: boolean = true, maxEntries: number = 5000) {
    this.ttlMs = ttlMs;
    this.enabled = enabled;
    this.maxEntries = Math.max(0, maxEntries);
  }

  private maybeCleanup(): void {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastCleanupAt < this.cleanupEveryMs) return;
    this.lastCleanupAt = now;
    this.cleanup();
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    this.maybeCleanup();

    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    if (!this.enabled) return;

    this.maybeCleanup();

    const expiresAt = Date.now() + (ttlMs || this.ttlMs);
    this.cache.set(key, { value, expiresAt });

    // Evict oldest entries to bound memory usage
    if (this.maxEntries > 0) {
      while (this.cache.size > this.maxEntries) {
        const oldestKey = this.cache.keys().next().value as string | undefined;
        if (!oldestKey) break;
        this.cache.delete(oldestKey);
      }
    }

    logger.debug('Cached value', { key, expiresIn: `${(ttlMs || this.ttlMs) / 1000}s` });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.enabled,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup', { removed: cleaned, remaining: this.cache.size });
    }
  }

  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    // No interval is used; keep for API compatibility / explicit cleanup.
    this.cache.clear();
  }
}

// Export singleton instance
export const cacheService = new CacheService();
