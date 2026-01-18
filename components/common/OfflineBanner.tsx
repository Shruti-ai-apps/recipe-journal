'use client';

/**
 * Offline Banner - Shows when user is offline
 */

import { useOffline } from '@/hooks';
import './OfflineBanner.css';

interface OfflineBannerProps {
  className?: string;
}

export default function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const { isOnline, wasOffline } = useOffline();

  // Don't show anything if online and never was offline
  if (isOnline && !wasOffline) {
    return null;
  }

  // Show reconnected message briefly
  if (isOnline && wasOffline) {
    return (
      <div className={`offline-banner offline-banner--reconnected ${className}`}>
        <div className="offline-banner__content">
          <svg
            className="offline-banner__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="offline-banner__text">Back online</span>
        </div>
      </div>
    );
  }

  // Show offline message
  return (
    <div className={`offline-banner offline-banner--offline ${className}`}>
      <div className="offline-banner__content">
        <svg
          className="offline-banner__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span className="offline-banner__text">
          You&apos;re offline. Changes will sync when you reconnect.
        </span>
      </div>
    </div>
  );
}
