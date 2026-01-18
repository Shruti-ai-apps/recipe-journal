'use client';

/**
 * Offline fallback page - shown when user is offline and content is not cached
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOffline } from '@/hooks';
import './page.css';

export default function OfflinePage() {
  const router = useRouter();
  const { isOnline } = useOffline();

  // Redirect to home when back online
  useEffect(() => {
    if (isOnline) {
      router.push('/');
    }
  }, [isOnline, router]);

  return (
    <div className="offline-page">
      <div className="offline-page__content">
        <div className="offline-page__icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
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
        </div>

        <h1 className="offline-page__title">You&apos;re Offline</h1>

        <p className="offline-page__message">
          It looks like you&apos;ve lost your internet connection. Don&apos;t worry, your saved
          recipes are still available!
        </p>

        <div className="offline-page__actions">
          <button
            className="offline-page__button offline-page__button--primary"
            onClick={() => router.push('/favorites')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            View Saved Recipes
          </button>

          <button
            className="offline-page__button offline-page__button--secondary"
            onClick={() => window.location.reload()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Try Again
          </button>
        </div>

        <p className="offline-page__hint">
          This page will automatically refresh when you&apos;re back online.
        </p>
      </div>
    </div>
  );
}
