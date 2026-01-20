/**
 * Offline Queue Service
 * Manages queuing operations when offline for later sync
 */

import {
  getOfflineDb,
  isIndexedDBAvailable,
  type SyncOperation,
  type SyncOperationType,
  type OfflineRecipe,
} from '@/lib/offline';

const MAX_RETRY_COUNT = 3;

/**
 * Add an operation to the sync queue
 */
export async function queueOperation(
  operation: SyncOperationType,
  recipeId: string,
  userId: string,
  data?: Partial<OfflineRecipe>
): Promise<number | undefined> {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available, operation not queued');
    return undefined;
  }

  const db = getOfflineDb();

  // Check if there's already a pending operation for this recipe
  let existingOp: SyncOperation | undefined;
  try {
    existingOp = await db.syncQueue
      .where('[userId+recipeId]')
      .equals([userId, recipeId])
      .first();
  } catch {
    // Backwards compatibility for older IndexedDB versions without the compound index
    existingOp = await db.syncQueue
      .where('recipeId')
      .equals(recipeId)
      .and((op) => op.userId === userId)
      .first();
  }

  if (existingOp) {
    // Merge operations intelligently
    const mergedOp = mergeOperations(existingOp, operation, data);
    if (mergedOp === null) {
      // Operations cancel out (e.g., create then delete)
      await db.syncQueue.delete(existingOp.id!);
      return undefined;
    }
    await db.syncQueue.update(existingOp.id!, mergedOp);
    return existingOp.id;
  }

  // Add new operation
  const syncOp: SyncOperation = {
    operation,
    recipeId,
    userId,
    data,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  return db.syncQueue.add(syncOp);
}

/**
 * Merge two operations on the same recipe
 */
function mergeOperations(
  existing: SyncOperation,
  newOperation: SyncOperationType,
  newData?: Partial<OfflineRecipe>
): Partial<SyncOperation> | null {
  // Create + Delete = nothing (cancel out)
  if (existing.operation === 'create' && newOperation === 'delete') {
    return null;
  }

  // Create + Update = Create with updated data
  if (existing.operation === 'create' && newOperation === 'update') {
    return {
      operation: 'create',
      data: { ...existing.data, ...newData },
      createdAt: new Date().toISOString(),
    };
  }

  // Update + Update = Update with merged data
  if (existing.operation === 'update' && newOperation === 'update') {
    return {
      operation: 'update',
      data: { ...existing.data, ...newData },
      createdAt: new Date().toISOString(),
    };
  }

  // Update + Delete = Delete
  if (existing.operation === 'update' && newOperation === 'delete') {
    return {
      operation: 'delete',
      data: undefined,
      createdAt: new Date().toISOString(),
    };
  }

  // Any other case, use the new operation
  return {
    operation: newOperation,
    data: newData,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get all pending operations for a user
 */
export async function getPendingOperations(
  userId: string
): Promise<SyncOperation[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getOfflineDb();
  return db.syncQueue
    .where('userId')
    .equals(userId)
    .sortBy('createdAt');
}

/**
 * Get count of pending operations
 */
export async function getPendingCount(userId?: string): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getOfflineDb();
  if (userId) {
    return db.syncQueue.where('userId').equals(userId).count();
  }
  return db.syncQueue.count();
}

/**
 * Mark an operation as completed (remove from queue)
 */
export async function completeOperation(operationId: number): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getOfflineDb();
  await db.syncQueue.delete(operationId);
}

/**
 * Clear any pending operation(s) for a recipe.
 *
 * In normal operation there should be at most one queued op per (userId, recipeId),
 * but older IndexedDB versions or partial migrations may leave duplicates.
 */
export async function clearRecipeQueue(
  userId: string,
  recipeId: string
): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getOfflineDb();

  try {
    return await db.syncQueue
      .where('[userId+recipeId]')
      .equals([userId, recipeId])
      .delete();
  } catch {
    return await db.syncQueue
      .where('recipeId')
      .equals(recipeId)
      .and((op) => op.userId === userId)
      .delete();
  }
}

/**
 * Mark an operation as failed (increment retry count)
 */
export async function failOperation(
  operationId: number,
  error: string
): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false;

  const db = getOfflineDb();
  const operation = await db.syncQueue.get(operationId);

  if (!operation) return false;

  const newRetryCount = operation.retryCount + 1;

  if (newRetryCount >= MAX_RETRY_COUNT) {
    // Move to dead letter queue or just delete
    console.error(
      `Operation ${operationId} failed after ${MAX_RETRY_COUNT} retries:`,
      error
    );
    await db.syncQueue.delete(operationId);
    return false;
  }

  await db.syncQueue.update(operationId, {
    retryCount: newRetryCount,
    lastError: error,
  });

  return true;
}

/**
 * Clear all pending operations for a user
 */
export async function clearUserQueue(userId: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getOfflineDb();
  await db.syncQueue.where('userId').equals(userId).delete();
}

/**
 * Clear all pending operations
 */
export async function clearAllQueues(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getOfflineDb();
  await db.syncQueue.clear();
}
