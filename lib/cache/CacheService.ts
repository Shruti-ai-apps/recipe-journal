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
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ttlMs: number = DEFAULT_TTL_MS, enabled: boolean = true) {
    this.ttlMs = ttlMs;
    this.enabled = enabled;

    // Start cleanup interval
    if (this.enabled && typeof window === 'undefined') {
      // Only run cleanup in server environment
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

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

    const expiresAt = Date.now() + (ttlMs || this.ttlMs);
    this.cache.set(key, { value, expiresAt });
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
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
