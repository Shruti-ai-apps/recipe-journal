/**
 * Sync module exports
 */

// Sync Manager
export {
  getSyncStatus,
  isOnline,
  addSyncListener,
  saveToOffline,
  saveAllToOffline,
  getFromOffline,
  getAllFromOffline,
  deleteFromOffline,
  createRecipeWithSync,
  updateRecipeWithSync,
  deleteRecipeWithSync,
  syncToCloud,
  syncFromCloud,
  fullSync,
} from './SyncManager';

export type { SyncResult, SyncEventType, SyncEventListener } from './SyncManager';

// Offline Queue
export {
  queueOperation,
  getPendingOperations,
  getPendingCount,
  completeOperation,
  failOperation,
  clearUserQueue,
  clearAllQueues,
} from './OfflineQueue';

// Conflict Resolver
export {
  resolveConflict,
  getConflictDetails,
  mergeRecipes,
  hasLocalModifications,
  isRemoteNewer,
  isLocalNewer,
} from './ConflictResolver';

export type { ConflictResolution, ConflictDetails } from './ConflictResolver';
