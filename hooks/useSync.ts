/**
 * useSync hook
 * Manages synchronization state and triggers
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from './useOffline';
import {
  getSyncStatus,
  fullSync,
  syncToCloud,
  addSyncListener,
  type SyncResult,
  type SyncEventType,
} from '@/services/sync';
import type { SyncStatus } from '@/lib/offline';

// Debounce delay for auto-sync after coming back online
const ONLINE_SYNC_DELAY = 2000;

export interface UseSyncResult {
  syncStatus: SyncStatus;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  sync: () => Promise<SyncResult | null>;
  syncPending: () => Promise<SyncResult | null>;
}

/**
 * Hook to manage sync operations
 */
export function useSync(): UseSyncResult {
  const { user } = useAuth();
  const { isOnline, wasOffline } = useOffline();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    pendingOperations: 0,
    isSyncing: false,
    lastError: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    if (user) {
      const status = await getSyncStatus(user.id);
      setSyncStatus(status);
    }
  }, [user]);

  // Perform full sync
  const sync = useCallback(async (): Promise<SyncResult | null> => {
    if (!user || !isOnline) return null;

    setIsSyncing(true);
    try {
      const result = await fullSync(user.id);
      setLastSyncResult(result);
      await updateSyncStatus();
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, updateSyncStatus]);

  // Sync only pending operations
  const syncPending = useCallback(async (): Promise<SyncResult | null> => {
    if (!user || !isOnline) return null;

    setIsSyncing(true);
    try {
      const result = await syncToCloud(user.id);
      setLastSyncResult(result);
      await updateSyncStatus();
      return result;
    } catch (error) {
      console.error('Sync pending failed:', error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, updateSyncStatus]);

  // Listen for sync events
  useEffect(() => {
    const unsubscribe = addSyncListener(
      (event: SyncEventType, data?: Record<string, unknown>) => {
        if (event === 'sync-started') {
          setIsSyncing(true);
        } else if (event === 'sync-completed' || event === 'sync-failed') {
          setIsSyncing(false);
          updateSyncStatus();
        }

        // Log events for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Sync event: ${event}`, data);
        }
      }
    );

    return unsubscribe;
  }, [updateSyncStatus]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && user) {
      // Clear any existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce the sync to avoid immediate sync on flaky connections
      syncTimeoutRef.current = setTimeout(() => {
        sync();
      }, ONLINE_SYNC_DELAY);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isOnline, wasOffline, user, sync]);

  // Initial status fetch
  useEffect(() => {
    updateSyncStatus();
  }, [updateSyncStatus]);

  // Periodic status update
  useEffect(() => {
    const interval = setInterval(updateSyncStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  return {
    syncStatus,
    isSyncing,
    lastSyncResult,
    sync,
    syncPending,
  };
}

export default useSync;
