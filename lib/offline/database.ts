/**
 * Offline Database using Dexie (IndexedDB wrapper)
 * Stores recipes and sync queue for offline support
 */

import Dexie, { Table } from 'dexie';
import type { DbRecipe } from '@/lib/supabase/types';

/**
 * Offline recipe - same as DbRecipe but with offline metadata
 */
export interface OfflineRecipe extends DbRecipe {
  // Offline-specific metadata
  _offlineCreated?: boolean;
  _offlineModified?: boolean;
  _localUpdatedAt?: string;
}

/**
 * Sync operation types
 */
export type SyncOperationType = 'create' | 'update' | 'delete';

/**
 * Sync operation queued for later execution
 */
export interface SyncOperation {
  id?: number;
  operation: SyncOperationType;
  recipeId: string;
  userId: string;
  data?: Partial<OfflineRecipe>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

/**
 * Sync status for tracking
 */
export interface SyncStatus {
  lastSyncAt: string | null;
  pendingOperations: number;
  isSyncing: boolean;
  lastError: string | null;
}

/**
 * Recipe Journal offline database
 */
class RecipeJournalDB extends Dexie {
  recipes!: Table<OfflineRecipe, string>;
  syncQueue!: Table<SyncOperation, number>;

  constructor() {
    super('RecipeJournalOffline');

    this.version(1).stores({
      // Primary key is id, indexes on user_id, title, tags, and updated_at
      recipes: 'id, user_id, title, *tags, updated_at, is_deleted',
      // Auto-increment id, indexes on operation type and created time
      syncQueue: '++id, operation, userId, recipeId, createdAt',
    });
  }
}

// Singleton instance
let dbInstance: RecipeJournalDB | null = null;

/**
 * Get the database instance (lazy initialization for SSR compatibility)
 */
export function getOfflineDb(): RecipeJournalDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available on the server');
  }

  if (!dbInstance) {
    dbInstance = new RecipeJournalDB();
  }

  return dbInstance;
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Clear all offline data (for logout or reset)
 */
export async function clearOfflineData(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getOfflineDb();
  await Promise.all([db.recipes.clear(), db.syncQueue.clear()]);
}

/**
 * Get offline storage statistics
 */
export async function getOfflineStats(): Promise<{
  recipeCount: number;
  pendingOperations: number;
  estimatedSize: string;
}> {
  if (!isIndexedDBAvailable()) {
    return { recipeCount: 0, pendingOperations: 0, estimatedSize: '0 KB' };
  }

  const db = getOfflineDb();
  const [recipeCount, pendingOperations] = await Promise.all([
    db.recipes.count(),
    db.syncQueue.count(),
  ]);

  // Estimate size (rough calculation)
  const recipes = await db.recipes.toArray();
  const estimatedBytes = JSON.stringify(recipes).length;
  const estimatedSize =
    estimatedBytes > 1024 * 1024
      ? `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(estimatedBytes / 1024).toFixed(2)} KB`;

  return { recipeCount, pendingOperations, estimatedSize };
}

export default RecipeJournalDB;
