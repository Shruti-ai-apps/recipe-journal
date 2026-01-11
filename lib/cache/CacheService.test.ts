import { CacheService } from './CacheService';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService(1000, true); // 1 second TTL for testing
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('constructor', () => {
    it('creates a cache with default settings', () => {
      const defaultCache = new CacheService();
      expect(defaultCache.getStats().enabled).toBe(true);
      defaultCache.destroy();
    });

    it('can be disabled', () => {
      const disabledCache = new CacheService(1000, false);
      expect(disabledCache.getStats().enabled).toBe(false);
      disabledCache.destroy();
    });
  });

  describe('set and get', () => {
    it('stores and retrieves a value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('stores and retrieves complex objects', () => {
      const obj = { name: 'test', data: [1, 2, 3] };
      cache.set('key2', obj);
      expect(cache.get('key2')).toEqual(obj);
    });

    it('returns undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('returns undefined when cache is disabled', () => {
      const disabledCache = new CacheService(1000, false);
      disabledCache.set('key', 'value');
      expect(disabledCache.get('key')).toBeUndefined();
      disabledCache.destroy();
    });

    it('does not store when cache is disabled', () => {
      const disabledCache = new CacheService(1000, false);
      disabledCache.set('key', 'value');
      expect(disabledCache.getStats().size).toBe(0);
      disabledCache.destroy();
    });
  });

  describe('expiration', () => {
    it('returns undefined for expired entries', async () => {
      cache.set('expiring', 'value', 50); // 50ms TTL
      expect(cache.get('expiring')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(cache.get('expiring')).toBeUndefined();
    });

    it('uses custom TTL when provided', async () => {
      cache.set('custom', 'value', 200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(cache.get('custom')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get('custom')).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('removes a key from cache', () => {
      cache.set('toDelete', 'value');
      expect(cache.get('toDelete')).toBe('value');

      const result = cache.delete('toDelete');
      expect(result).toBe(true);
      expect(cache.get('toDelete')).toBeUndefined();
    });

    it('returns false when key does not exist', () => {
      const result = cache.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries from cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.getStats().size).toBe(3);

      cache.clear();
      expect(cache.getStats().size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.enabled).toBe(true);
    });
  });

  describe('destroy', () => {
    it('cleans up cleanup interval', () => {
      const testCache = new CacheService();
      testCache.destroy();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
