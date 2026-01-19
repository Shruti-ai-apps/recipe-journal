/**
 * Smart Scale Response Caching
 *
 * Caches AI scaling results to reduce API calls and improve response times.
 * Uses localStorage for guest users with 24-hour TTL.
 */

import type { SmartScaleData } from '@/types';
import { CachedScaleResult } from './types';

/** Cache duration: 24 hours */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/** LocalStorage key prefix */
const CACHE_KEY_PREFIX = 'smart-scale-cache';

/**
 * Generate cache key for a recipe/multiplier combination
 */
function getCacheKey(recipeId: string, multiplier: number): string {
  return `${CACHE_KEY_PREFIX}:${recipeId}_${multiplier}`;
}

/**
 * Get cached scaling result if available and not expired
 */
export function getCachedResult(
  recipeId: string,
  multiplier: number
): SmartScaleData | null {
  // Only works in browser
  if (typeof window === 'undefined') {
    return null;
  }

  const key = getCacheKey(recipeId, multiplier);
  const cached = localStorage.getItem(key);

  if (!cached) {
    return null;
  }

  try {
    const parsed: CachedScaleResult = JSON.parse(cached);

    // Check if expired
    if (new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.result;
  } catch {
    // Invalid cache entry, remove it
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Cache a scaling result
 */
export function setCachedResult(
  recipeId: string,
  multiplier: number,
  result: SmartScaleData
): void {
  // Only works in browser
  if (typeof window === 'undefined') {
    return;
  }

  const key = getCacheKey(recipeId, multiplier);
  const now = new Date();

  const cached: CachedScaleResult = {
    key: `${recipeId}_${multiplier}`,
    result,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CACHE_DURATION_MS).toISOString(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    // localStorage might be full - try to clear old entries
    console.warn('Cache storage full, clearing old entries');
    clearOldCacheEntries();

    // Try again
    try {
      localStorage.setItem(key, JSON.stringify(cached));
    } catch {
      // Still full, give up silently
      console.warn('Unable to cache smart scale result');
    }
  }
}

/**
 * Clear expired cache entries
 */
export function clearOldCacheEntries(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const now = new Date();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      try {
        const cached: CachedScaleResult = JSON.parse(localStorage.getItem(key) || '');
        if (new Date(cached.expiresAt) < now) {
          keysToRemove.push(key);
        }
      } catch {
        // Invalid entry, remove it
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Clear all smart scale cache entries
 */
export function clearCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; oldestEntry: string | null } {
  if (typeof window === 'undefined') {
    return { entries: 0, oldestEntry: null };
  }

  let entries = 0;
  let oldestEntry: string | null = null;
  let oldestDate: Date | null = null;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      entries++;

      try {
        const cached: CachedScaleResult = JSON.parse(localStorage.getItem(key) || '');
        const createdAt = new Date(cached.createdAt);

        if (!oldestDate || createdAt < oldestDate) {
          oldestDate = createdAt;
          oldestEntry = cached.key;
        }
      } catch {
        // Ignore invalid entries
      }
    }
  }

  return { entries, oldestEntry };
}
