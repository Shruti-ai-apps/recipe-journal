/**
 * Tests for Supabase client utility functions
 */

// Store original env values
const originalEnv = process.env;

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
    },
  })),
}));

describe('Supabase Client', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createClient', () => {
    it('should return null when NEXT_PUBLIC_SUPABASE_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { createClient } = require('./client');
      const client = createClient();

      expect(client).toBeNull();
    });

    it('should return null when NEXT_PUBLIC_SUPABASE_ANON_KEY is not set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { createClient } = require('./client');
      const client = createClient();

      expect(client).toBeNull();
    });

    it('should create browser client when configured', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      const { createBrowserClient } = require('@supabase/ssr');
      const { createClient } = require('./client');

      const client = createClient();

      expect(client).not.toBeNull();
      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      );
    });
  });

  describe('isSupabaseConfigured', () => {
    it('should return false when URL is not set', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { isSupabaseConfigured } = require('./client');

      expect(isSupabaseConfigured()).toBe(false);
    });

    it('should return false when only URL is set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { isSupabaseConfigured } = require('./client');

      expect(isSupabaseConfigured()).toBe(false);
    });

    it('should return false when only anon key is set', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      const { isSupabaseConfigured } = require('./client');

      expect(isSupabaseConfigured()).toBe(false);
    });

    it('should return true when both URL and anon key are set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      const { isSupabaseConfigured } = require('./client');

      expect(isSupabaseConfigured()).toBe(true);
    });

    it('should return false for empty strings', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

      const { isSupabaseConfigured } = require('./client');

      expect(isSupabaseConfigured()).toBe(false);
    });
  });
});
