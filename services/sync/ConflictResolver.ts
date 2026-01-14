/**
 * Conflict Resolver Service
 * Handles merge conflicts between local and remote data
 * Strategy: Last-write-wins based on updated_at timestamp
 */

import type { DbRecipe } from '@/lib/supabase/types';
import type { OfflineRecipe } from '@/lib/offline';

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  winner: 'local' | 'remote';
  resolvedRecipe: DbRecipe;
  hadConflict: boolean;
}

/**
 * Conflict details for logging/debugging
 */
export interface ConflictDetails {
  recipeId: string;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
  localSyncVersion: number;
  remoteSyncVersion: number;
  fieldsChanged: string[];
}

/**
 * Resolve conflict between local and remote recipe
 * Uses last-write-wins strategy based on updated_at
 */
export function resolveConflict(
  local: OfflineRecipe,
  remote: DbRecipe
): ConflictResolution {
  const localTime = new Date(local._localUpdatedAt || local.updated_at).getTime();
  const remoteTime = new Date(remote.updated_at).getTime();

  // Check if there's actually a conflict
  const hadConflict = localTime !== remoteTime && local.sync_version !== remote.sync_version;

  if (!hadConflict) {
    // No conflict, prefer remote as it's the source of truth
    return {
      winner: 'remote',
      resolvedRecipe: remote,
      hadConflict: false,
    };
  }

  // Last-write-wins
  if (localTime > remoteTime) {
    // Local is newer - merge local changes onto remote base
    const resolvedRecipe: DbRecipe = {
      ...remote,
      // Apply local changes
      title: local.title,
      description: local.description,
      notes: local.notes,
      tags: local.tags,
      is_favorite: local.is_favorite,
      ingredients: local.ingredients,
      instructions: local.instructions,
      nutrition: local.nutrition,
      last_scale_multiplier: local.last_scale_multiplier,
      last_viewed_at: local.last_viewed_at,
      // Keep remote's sync metadata but increment version
      updated_at: new Date().toISOString(),
      sync_version: remote.sync_version + 1,
    };

    return {
      winner: 'local',
      resolvedRecipe,
      hadConflict: true,
    };
  }

  // Remote is newer or same time - use remote
  return {
    winner: 'remote',
    resolvedRecipe: remote,
    hadConflict: true,
  };
}

/**
 * Get detailed conflict information for logging
 */
export function getConflictDetails(
  local: OfflineRecipe,
  remote: DbRecipe
): ConflictDetails {
  const fieldsChanged: string[] = [];

  // Compare fields to identify what changed
  if (local.title !== remote.title) fieldsChanged.push('title');
  if (local.description !== remote.description) fieldsChanged.push('description');
  if (local.notes !== remote.notes) fieldsChanged.push('notes');
  if (JSON.stringify(local.tags) !== JSON.stringify(remote.tags)) fieldsChanged.push('tags');
  if (local.is_favorite !== remote.is_favorite) fieldsChanged.push('is_favorite');
  if (JSON.stringify(local.ingredients) !== JSON.stringify(remote.ingredients)) {
    fieldsChanged.push('ingredients');
  }
  if (JSON.stringify(local.instructions) !== JSON.stringify(remote.instructions)) {
    fieldsChanged.push('instructions');
  }
  if (local.last_scale_multiplier !== remote.last_scale_multiplier) {
    fieldsChanged.push('last_scale_multiplier');
  }

  return {
    recipeId: local.id,
    localUpdatedAt: local._localUpdatedAt || local.updated_at,
    remoteUpdatedAt: remote.updated_at,
    localSyncVersion: local.sync_version,
    remoteSyncVersion: remote.sync_version,
    fieldsChanged,
  };
}

/**
 * Merge two recipes, preferring non-null values
 * Useful for partial updates
 */
export function mergeRecipes(
  base: DbRecipe,
  updates: Partial<DbRecipe>
): DbRecipe {
  const merged: DbRecipe = { ...base };

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }

  return merged;
}

/**
 * Check if a recipe has local modifications
 */
export function hasLocalModifications(recipe: OfflineRecipe): boolean {
  return recipe._offlineCreated === true || recipe._offlineModified === true;
}

/**
 * Compare sync versions to detect if remote is newer
 */
export function isRemoteNewer(local: OfflineRecipe, remote: DbRecipe): boolean {
  return remote.sync_version > local.sync_version;
}

/**
 * Compare sync versions to detect if local is newer
 */
export function isLocalNewer(local: OfflineRecipe, remote: DbRecipe): boolean {
  const localTime = new Date(local._localUpdatedAt || local.updated_at).getTime();
  const remoteTime = new Date(remote.updated_at).getTime();
  return localTime > remoteTime;
}
