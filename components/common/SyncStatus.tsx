'use client';

/**
 * Sync Status - Shows sync state indicator
 */

import { useState } from 'react';
import { useSync } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import './SyncStatus.css';

interface SyncStatusProps {
  className?: string;
  showLabel?: boolean;
}

export default function SyncStatus({
  className = '',
  showLabel = false,
}: SyncStatusProps) {
  const { user } = useAuth();
  const { syncStatus, isSyncing, sync } = useSync();
  const [showTooltip, setShowTooltip] = useState(false);

  // Don't show for guests
  if (!user) {
    return null;
  }

  const hasPending = syncStatus.pendingOperations > 0;

  const handleSync = async () => {
    if (!isSyncing) {
      await sync();
    }
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (hasPending) return `${syncStatus.pendingOperations} pending`;
    if (syncStatus.lastSyncAt) {
      const lastSync = new Date(syncStatus.lastSyncAt);
      const now = new Date();
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just synced';
      if (diffMins < 60) return `Synced ${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Synced ${diffHours}h ago`;
      return `Synced ${Math.floor(diffHours / 24)}d ago`;
    }
    return 'Synced';
  };

  return (
    <div
      className={`sync-status ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        className={`sync-status__button ${isSyncing ? 'sync-status__button--syncing' : ''} ${hasPending ? 'sync-status__button--pending' : ''}`}
        onClick={handleSync}
        disabled={isSyncing}
        aria-label={isSyncing ? 'Syncing' : 'Sync now'}
      >
        <svg
          className="sync-status__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
        {hasPending && (
          <span className="sync-status__badge">{syncStatus.pendingOperations}</span>
        )}
      </button>

      {showLabel && (
        <span className="sync-status__label">{getStatusText()}</span>
      )}

      {showTooltip && !showLabel && (
        <div className="sync-status__tooltip">{getStatusText()}</div>
      )}
    </div>
  );
}
