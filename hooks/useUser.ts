'use client';

import { useAuth } from '@/contexts';

/**
 * Simple hook to get the current user
 * Returns null if not authenticated
 */
export function useUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}
