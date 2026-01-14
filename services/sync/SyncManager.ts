/**
 * Sync Manager Service
 * Main orchestrator for synchronizing local and cloud data
 */

import {
  getOfflineDb,
  isIndexedDBAvailable,
  type OfflineRecipe,
  type SyncStatus,
} from '@/lib/offline';
import {
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from '@/lib/supabase/recipes';
import type { DbRecipe, NewDbRecipe } from '@/lib/supabase/types';
import {
  getPendingOperations,
  completeOperation,
  failOperation,
  queueOperation,
  getPendingCount,
} from './OfflineQueue';
import { resolveConflict, getConflictDetails } from './ConflictResolver';

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
}

/**
 * Sync event types
 */
export type SyncEventType =
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'conflict-resolved'
  | 'operation-completed';

/**
 * Sync event listener
 */
export type SyncEventListener = (
  event: SyncEventType,
  data?: Record<string, unknown>
) => void;

// Event listeners
const listeners: Set<SyncEventListener> = new Set();

// Sync state
let isSyncing = false;
let lastSyncAt: string | null = null;
let lastError: string | null = null;

/**
 * Add a sync event listener
 */
export function addSyncListener(listener: SyncEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Emit a sync event
 */
function emitEvent(event: SyncEventType, data?: Record<string, unknown>): void {
  listeners.forEach((listener) => listener(event, data));
}

/**
 * Get current sync status
 */
export async function getSyncStatus(userId?: string): Promise<SyncStatus> {
  const pendingOperations = await getPendingCount(userId);
  return {
    lastSyncAt,
    pendingOperations,
    isSyncing,
    lastError,
  };
}

/**
 * Check if we're currently online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Save recipe to offline storage
 */
export async function saveToOffline(recipe: DbRecipe): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getOfflineDb();
  const offlineRecipe: OfflineRecipe = {
    ...recipe,
    _offlineModified: false,
    _offlineCreated: false,
  };

  await db.recipes.put(offlineRecipe);
}

/**
 * Save multiple recipes to offline storage
 */
export async function saveAllToOffline(recipes: DbRecipe[]): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getOfflineDb();
  const offlineRecipes: OfflineRecipe[] = recipes.map((recipe) => ({
    ...recipe,
    _offlineModified: false,
    _offlineCreated: false,
  }));

  await db.recipes.bulkPut(offlineRecipes);
}

/**
 * Get recipe from offline storage
 */
export async function getFromOffline(id: string): Promise<OfflineRecipe | undefined> {
  if (!isIndexedDBAvailable()) return undefined;

  const db = getOfflineDb();
  return db.recipes.get(id);
}

/**
 * Get all offline recipes for a user
 */
export async function getAllFromOffline(userId: string): Promise<OfflineRecipe[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getOfflineDb();
  return db.recipes
    .where('user_id')
    .equals(userId)
    .and((r) => !r.is_deleted)
    .toArray();
}

/**
 * Delete recipe from offline storage
 */
export async function deleteFromOffline(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getOfflineDb();
  await db.recipes.delete(id);
}

/**
 * Create recipe with offline support
 * If online, creates in cloud and caches locally
 * If offline, creates locally and queues for sync
 */
export async function createRecipeWithSync(
  userId: string,
  recipe: Omit<NewDbRecipe, 'user_id'>
): Promise<DbRecipe | null> {
  if (isOnline()) {
    // Online: create in cloud
    const result = await createRecipe(userId, recipe);
    if (result.data) {
      await saveToOffline(result.data);
      return result.data;
    }
    return null;
  }

  // Offline: create locally and queue
  if (!isIndexedDBAvailable()) return null;

  const db = getOfflineDb();
  const now = new Date().toISOString();
  const offlineRecipe: OfflineRecipe = {
    id: crypto.randomUUID(),
    user_id: userId,
    ...recipe,
    created_at: now,
    updated_at: now,
    sync_version: 1,
    is_deleted: false,
    _offlineCreated: true,
    _localUpdatedAt: now,
  } as OfflineRecipe;

  await db.recipes.add(offlineRecipe);
  await queueOperation('create', offlineRecipe.id, userId, offlineRecipe);

  return offlineRecipe;
}

/**
 * Update recipe with offline support
 */
export async function updateRecipeWithSync(
  id: string,
  userId: string,
  updates: Partial<DbRecipe>
): Promise<DbRecipe | null> {
  if (isOnline()) {
    // Online: update in cloud
    const result = await updateRecipe(id, updates);
    if (result.data) {
      await saveToOffline(result.data);
      return result.data;
    }
    return null;
  }

  // Offline: update locally and queue
  if (!isIndexedDBAvailable()) return null;

  const db = getOfflineDb();
  const existing = await db.recipes.get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedRecipe: OfflineRecipe = {
    ...existing,
    ...updates,
    updated_at: now,
    _offlineModified: true,
    _localUpdatedAt: now,
  };

  await db.recipes.put(updatedRecipe);
  await queueOperation('update', id, userId, updates as Partial<OfflineRecipe>);

  return updatedRecipe;
}

/**
 * Delete recipe with offline support
 */
export async function deleteRecipeWithSync(
  id: string,
  userId: string
): Promise<boolean> {
  if (isOnline()) {
    // Online: soft delete in cloud
    const result = await deleteRecipe(id);
    if (!result.error) {
      await deleteFromOffline(id);
      return true;
    }
    return false;
  }

  // Offline: mark as deleted locally and queue
  if (!isIndexedDBAvailable()) return false;

  const db = getOfflineDb();
  const existing = await db.recipes.get(id);
  if (!existing) return false;

  // If it was created offline and never synced, just delete it
  if (existing._offlineCreated) {
    await db.recipes.delete(id);
    // Remove any pending create operation
    return true;
  }

  // Mark as deleted
  await db.recipes.update(id, {
    is_deleted: true,
    _offlineModified: true,
    _localUpdatedAt: new Date().toISOString(),
  });
  await queueOperation('delete', id, userId);

  return true;
}

/**
 * Sync all pending operations to cloud
 */
export async function syncToCloud(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    uploaded: 0,
    downloaded: 0,
    conflicts: 0,
    errors: [],
  };

  if (!isOnline()) {
    result.errors.push('Cannot sync while offline');
    return result;
  }

  if (isSyncing) {
    result.errors.push('Sync already in progress');
    return result;
  }

  isSyncing = true;
  lastError = null;
  emitEvent('sync-started');

  try {
    // Get pending operations
    const operations = await getPendingOperations(userId);

    // Process each operation
    for (const op of operations) {
      try {
        switch (op.operation) {
          case 'create': {
            if (op.data) {
              const { id, _offlineCreated, _offlineModified, _localUpdatedAt, ...recipeData } = op.data as OfflineRecipe;
              const createResult = await createRecipe(userId, recipeData as Omit<NewDbRecipe, 'user_id'>);
              if (createResult.data) {
                // Update local ID to match cloud ID
                const db = getOfflineDb();
                await db.recipes.delete(op.recipeId);
                await db.recipes.put({
                  ...createResult.data,
                  _offlineCreated: false,
                  _offlineModified: false,
                });
                result.uploaded++;
              } else {
                throw new Error(createResult.error?.message || 'Failed to create recipe');
              }
            }
            break;
          }

          case 'update': {
            if (op.data) {
              const { _offlineCreated, _offlineModified, _localUpdatedAt, ...updates } = op.data;
              const updateResult = await updateRecipe(op.recipeId, updates);
              if (updateResult.data) {
                await saveToOffline(updateResult.data);
                result.uploaded++;
              } else {
                throw new Error(updateResult.error?.message || 'Failed to update recipe');
              }
            }
            break;
          }

          case 'delete': {
            const deleteResult = await deleteRecipe(op.recipeId);
            if (!deleteResult.error) {
              await deleteFromOffline(op.recipeId);
              result.uploaded++;
            } else {
              throw new Error(deleteResult.error.message);
            }
            break;
          }
        }

        await completeOperation(op.id!);
        emitEvent('operation-completed', { operation: op.operation, recipeId: op.recipeId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const shouldRetry = await failOperation(op.id!, errorMsg);
        if (!shouldRetry) {
          result.errors.push(`Failed to ${op.operation} recipe: ${errorMsg}`);
        }
      }
    }

    result.success = result.errors.length === 0;
    lastSyncAt = new Date().toISOString();
    emitEvent('sync-completed', { result });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Sync failed';
    result.errors.push(errorMsg);
    lastError = errorMsg;
    emitEvent('sync-failed', { error: errorMsg });
  } finally {
    isSyncing = false;
  }

  return result;
}

/**
 * Sync from cloud to local (download)
 */
export async function syncFromCloud(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    uploaded: 0,
    downloaded: 0,
    conflicts: 0,
    errors: [],
  };

  if (!isOnline()) {
    result.errors.push('Cannot sync while offline');
    return result;
  }

  try {
    // Get recipes from cloud
    const cloudResult = await getRecipes(userId);
    if (cloudResult.error) {
      throw cloudResult.error;
    }

    const cloudRecipes = cloudResult.data;

    // Get local recipes
    const localRecipes = await getAllFromOffline(userId);
    const localMap = new Map(localRecipes.map((r) => [r.id, r]));

    // Process cloud recipes
    for (const cloudRecipe of cloudRecipes) {
      const localRecipe = localMap.get(cloudRecipe.id);

      if (!localRecipe) {
        // New from cloud - save locally
        await saveToOffline(cloudRecipe);
        result.downloaded++;
      } else if (localRecipe._offlineModified) {
        // Conflict - resolve it
        const resolution = resolveConflict(localRecipe, cloudRecipe);

        if (resolution.hadConflict) {
          const details = getConflictDetails(localRecipe, cloudRecipe);
          console.log('Conflict resolved:', details);
          result.conflicts++;
          emitEvent('conflict-resolved', { details, winner: resolution.winner });
        }

        if (resolution.winner === 'local') {
          // Need to upload local changes
          await queueOperation('update', localRecipe.id, userId, localRecipe);
        } else {
          // Use cloud version
          await saveToOffline(resolution.resolvedRecipe);
        }
        result.downloaded++;
      } else {
        // No conflict - update local with cloud version
        await saveToOffline(cloudRecipe);
        result.downloaded++;
      }

      localMap.delete(cloudRecipe.id);
    }

    // Handle recipes that exist locally but not in cloud
    for (const [id, localRecipe] of localMap) {
      if (localRecipe._offlineCreated) {
        // Created offline, needs to be uploaded
        await queueOperation('create', id, userId, localRecipe);
      } else if (!localRecipe.is_deleted) {
        // Deleted from cloud - remove locally
        await deleteFromOffline(id);
      }
    }

    result.success = true;
    lastSyncAt = new Date().toISOString();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Sync from cloud failed';
    result.errors.push(errorMsg);
    lastError = errorMsg;
  }

  return result;
}

/**
 * Full bidirectional sync
 */
export async function fullSync(userId: string): Promise<SyncResult> {
  // First, upload local changes
  const uploadResult = await syncToCloud(userId);

  // Then, download cloud changes
  const downloadResult = await syncFromCloud(userId);

  // If there were new operations queued during download (conflicts resolved to local)
  // upload them
  const pendingCount = await getPendingCount(userId);
  if (pendingCount > 0) {
    await syncToCloud(userId);
  }

  return {
    success: uploadResult.success && downloadResult.success,
    uploaded: uploadResult.uploaded,
    downloaded: downloadResult.downloaded,
    conflicts: downloadResult.conflicts,
    errors: [...uploadResult.errors, ...downloadResult.errors],
  };
}
