/**
 * useOffline hook
 * Detects online/offline status and provides connectivity state
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface OfflineState {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
}

/**
 * Hook to track online/offline status
 */
export function useOffline(): OfflineState {
  const [state, setState] = useState<OfflineState>(() => ({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: null,
  }));

  const handleOnline = useCallback(() => {
    setState((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline ? true : prev.wasOffline,
      lastOnlineAt: new Date(),
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: false,
    }));
  }, []);

  useEffect(() => {
    // Set initial state
    setState((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
      lastOnlineAt: navigator.onLine ? new Date() : null,
    }));

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return state;
}

export default useOffline;
