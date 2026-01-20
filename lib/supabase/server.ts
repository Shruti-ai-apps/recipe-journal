import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in Server Components.
 * This client can read cookies but cannot write them (use middleware for that).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // Server Components cannot set cookies, this is handled by middleware
          // This is intentionally left as a no-op
        },
        remove(_name: string, _options: CookieOptions) {
          // Server Components cannot remove cookies, this is handled by middleware
          // This is intentionally left as a no-op
        },
      },
    }
  );
}
