/**
 * Migration service for moving localStorage recipes to cloud storage
 */

import { SavedRecipe, getAllFavorites, clearAllFavorites } from '../favorites';
import { createRecipe, getRecipeBySourceUrl } from '@/lib/supabase/recipes';
import type { NewDbRecipe } from '@/lib/supabase/types';

const MIGRATION_KEY = 'recipe-journal-migration-status';

export interface MigrationStatus {
  hasMigrated: boolean;
  migratedAt: string | null;
  recipesCount: number;
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

/**
 * Check if there are localStorage recipes that haven't been migrated
 */
export function hasLocalRecipesToMigrate(): boolean {
  const favorites = getAllFavorites();
  return favorites.length > 0;
}

/**
 * Get count of local recipes
 */
export function getLocalRecipesCount(): number {
  return getAllFavorites().length;
}

/**
 * Get migration status
 */
export function getMigrationStatus(): MigrationStatus {
  try {
    const data = localStorage.getItem(MIGRATION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to get migration status:', error);
  }
  return {
    hasMigrated: false,
    migratedAt: null,
    recipesCount: 0,
  };
}

/**
 * Set migration status
 */
function setMigrationStatus(status: MigrationStatus): void {
  try {
    localStorage.setItem(MIGRATION_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Failed to set migration status:', error);
  }
}

/**
 * Convert a localStorage SavedRecipe to cloud DbRecipe format
 */
function convertToDbRecipe(recipe: SavedRecipe, userId: string): Omit<NewDbRecipe, 'user_id'> {
  return {
    title: recipe.title,
    source_url: recipe.source.url,
    source_domain: recipe.source.domain,
    image_url: recipe.image || null,
    description: recipe.description || null,
    author: recipe.author || null,

    // Convert time from minutes to string format
    prep_time: recipe.prepTime ? `${recipe.prepTime} minutes` : null,
    cook_time: recipe.cookTime ? `${recipe.cookTime} minutes` : null,
    total_time: recipe.totalTime ? `${recipe.totalTime} minutes` : null,

    // Servings
    servings_amount: recipe.servings.amount,
    servings_unit: recipe.servings.unit || 'servings',
    original_servings_amount: recipe.servings.amount,

    // Content
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    nutrition: recipe.nutrition || null,

    // User additions
    notes: recipe.notes || null,
    tags: [...(recipe.tags || []), ...recipe.userTags],
    is_favorite: true,

    // Scaling
    last_scale_multiplier: recipe.lastScaledMultiplier || 1,

    // Timestamps
    last_viewed_at: recipe.lastViewedAt,
  };
}

/**
 * Migrate all localStorage recipes to cloud storage
 */
export async function migrateLocalToCloud(
  userId: string,
  options?: {
    clearLocalAfter?: boolean;
    skipDuplicates?: boolean;
  }
): Promise<MigrationResult> {
  const { clearLocalAfter = false, skipDuplicates = true } = options || {};

  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
  };

  try {
    const localRecipes = getAllFavorites();

    if (localRecipes.length === 0) {
      result.success = true;
      return result;
    }

    for (const recipe of localRecipes) {
      try {
        // Check for duplicates by source URL
        if (skipDuplicates) {
          const existing = await getRecipeBySourceUrl(userId, recipe.source.url);
          if (existing.data) {
            result.skippedCount++;
            continue;
          }
        }

        // Convert and create
        const dbRecipe = convertToDbRecipe(recipe, userId);
        const createResult = await createRecipe(userId, dbRecipe);

        if (createResult.error) {
          result.errorCount++;
          result.errors.push(`Failed to migrate "${recipe.title}": ${createResult.error.message}`);
        } else {
          result.migratedCount++;
        }
      } catch (error) {
        result.errorCount++;
        result.errors.push(`Error migrating "${recipe.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Clear localStorage if requested and migration was successful
    if (clearLocalAfter && result.errorCount === 0) {
      clearAllFavorites();
    }

    // Update migration status
    setMigrationStatus({
      hasMigrated: true,
      migratedAt: new Date().toISOString(),
      recipesCount: result.migratedCount,
    });

    result.success = result.errorCount === 0;
    return result;
  } catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Clear migration status (for testing or re-migration)
 */
export function clearMigrationStatus(): void {
  try {
    localStorage.removeItem(MIGRATION_KEY);
  } catch (error) {
    console.error('Failed to clear migration status:', error);
  }
}
