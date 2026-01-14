'use client';

/**
 * Migration Banner - shows when user logs in with existing localStorage recipes
 */

import { useState } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { migrateLocalToCloud } from '@/services/migration';
import './Migration.css';

interface MigrationBannerProps {
  onMigrationComplete?: () => void;
}

export default function MigrationBanner({ onMigrationComplete }: MigrationBannerProps) {
  const { user } = useAuth();
  const { showMigrationPrompt, localRecipesCount, dismissMigrationPrompt, refreshFavorites } = useFavorites();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!showMigrationPrompt || !user) {
    return null;
  }

  const handleMigrate = async () => {
    if (!user) return;

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const result = await migrateLocalToCloud(user.id, {
        clearLocalAfter: true,
        skipDuplicates: true,
      });

      if (result.success) {
        setMigrationResult({
          success: true,
          message: `Successfully migrated ${result.migratedCount} recipe${result.migratedCount !== 1 ? 's' : ''}!${result.skippedCount > 0 ? ` (${result.skippedCount} already existed)` : ''}`,
        });
        await refreshFavorites();
        onMigrationComplete?.();

        // Auto-dismiss after success
        setTimeout(() => {
          dismissMigrationPrompt();
        }, 3000);
      } else {
        setMigrationResult({
          success: false,
          message: `Migration completed with ${result.errorCount} error${result.errorCount !== 1 ? 's' : ''}. ${result.migratedCount} recipe${result.migratedCount !== 1 ? 's' : ''} migrated.`,
        });
      }
    } catch (error) {
      setMigrationResult({
        success: false,
        message: 'Migration failed. Please try again.',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    dismissMigrationPrompt();
  };

  const handleSkip = () => {
    // User chooses to keep recipes local
    dismissMigrationPrompt();
  };

  if (migrationResult) {
    return (
      <div className={`migration-banner ${migrationResult.success ? 'migration-banner--success' : 'migration-banner--error'}`}>
        <div className="migration-banner__content">
          <span className="migration-banner__icon">
            {migrationResult.success ? '✓' : '!'}
          </span>
          <p className="migration-banner__message">{migrationResult.message}</p>
        </div>
        <button
          className="migration-banner__close"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="migration-banner">
      <div className="migration-banner__content">
        <span className="migration-banner__icon">☁️</span>
        <div className="migration-banner__text">
          <p className="migration-banner__message">
            You have <strong>{localRecipesCount}</strong> saved recipe{localRecipesCount !== 1 ? 's' : ''} on this device.
            Would you like to sync them to your account?
          </p>
          <p className="migration-banner__subtext">
            This will make your recipes available on all your devices.
          </p>
        </div>
      </div>
      <div className="migration-banner__actions">
        <button
          className="migration-banner__button migration-banner__button--secondary"
          onClick={handleSkip}
          disabled={isMigrating}
        >
          Keep Local
        </button>
        <button
          className="migration-banner__button migration-banner__button--primary"
          onClick={handleMigrate}
          disabled={isMigrating}
        >
          {isMigrating ? 'Syncing...' : 'Sync to Cloud'}
        </button>
      </div>
    </div>
  );
}
