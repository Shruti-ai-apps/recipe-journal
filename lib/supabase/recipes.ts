/**
 * Recipe CRUD operations for Supabase
 */

import { createClient } from './client';
import type { DbRecipe, NewDbRecipe, DbRecipeUpdate, DbQueryResult, DbListResult } from './types';

const TABLE_NAME = 'recipes';

/**
 * Get a Supabase client instance
 * Throws error if not configured
 */
function getClient() {
  const client = createClient();
  if (!client) {
    throw new Error('Supabase is not configured. Please set environment variables.');
  }
  return client;
}

/**
 * Get all recipes for a user
 */
export async function getRecipes(userId: string): Promise<DbListResult<DbRecipe>> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Failed to get recipes:', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Get a single recipe by ID
 */
export async function getRecipeById(id: string): Promise<DbQueryResult<DbRecipe>> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Failed to get recipe:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get favorite recipes for a user
 */
export async function getFavorites(userId: string): Promise<DbListResult<DbRecipe>> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('is_favorite', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Failed to get favorites:', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Search recipes by title and tags
 */
export async function searchRecipes(
  userId: string,
  query: string
): Promise<DbListResult<DbRecipe>> {
  try {
    const client = getClient();
    const searchTerm = `%${query}%`;

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},author.ilike.${searchTerm}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Failed to search recipes:', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Create a new recipe
 */
export async function createRecipe(
  userId: string,
  recipe: Omit<NewDbRecipe, 'user_id'>
): Promise<DbQueryResult<DbRecipe>> {
  try {
    const client = getClient();
    const newRecipe: NewDbRecipe = {
      ...recipe,
      user_id: userId,
    };

    const { data, error } = await client
      .from(TABLE_NAME)
      .insert(newRecipe)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Failed to create recipe:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(
  id: string,
  updates: DbRecipeUpdate
): Promise<DbQueryResult<DbRecipe>> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from(TABLE_NAME)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Failed to update recipe:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Soft delete a recipe (sets is_deleted = true)
 */
export async function deleteRecipe(id: string): Promise<DbQueryResult<null>> {
  try {
    const client = getClient();
    const { error } = await client
      .from(TABLE_NAME)
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Failed to delete recipe:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Hard delete a recipe (permanently removes from database)
 * Use with caution - typically soft delete is preferred
 */
export async function hardDeleteRecipe(id: string): Promise<DbQueryResult<null>> {
  try {
    const client = getClient();
    const { error } = await client.from(TABLE_NAME).delete().eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Failed to hard delete recipe:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update last viewed timestamp
 */
export async function updateLastViewed(id: string): Promise<DbQueryResult<null>> {
  try {
    const client = getClient();
    const { error } = await client
      .from(TABLE_NAME)
      .update({
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Failed to update last viewed:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  id: string,
  isFavorite: boolean
): Promise<DbQueryResult<DbRecipe>> {
  return updateRecipe(id, { is_favorite: isFavorite });
}

/**
 * Update recipe notes
 */
export async function updateNotes(
  id: string,
  notes: string
): Promise<DbQueryResult<DbRecipe>> {
  return updateRecipe(id, { notes });
}

/**
 * Update recipe tags
 */
export async function updateTags(
  id: string,
  tags: string[]
): Promise<DbQueryResult<DbRecipe>> {
  return updateRecipe(id, { tags });
}

/**
 * Batch upsert recipes (for migration/sync)
 */
export async function upsertRecipes(
  userId: string,
  recipes: Omit<NewDbRecipe, 'user_id'>[]
): Promise<DbListResult<DbRecipe>> {
  try {
    const client = getClient();
    const recipesWithUserId = recipes.map((recipe) => ({
      ...recipe,
      user_id: userId,
    }));

    const { data, error } = await client
      .from(TABLE_NAME)
      .upsert(recipesWithUserId, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Failed to upsert recipes:', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Get recipe count for a user
 */
export async function getRecipeCount(userId: string): Promise<number> {
  try {
    const client = getClient();
    const { count, error } = await client
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Failed to get recipe count:', error);
    return 0;
  }
}

/**
 * Check if a recipe exists by source URL for a user
 */
export async function getRecipeBySourceUrl(
  userId: string,
  sourceUrl: string
): Promise<DbQueryResult<DbRecipe>> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .eq('source_url', sourceUrl)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Failed to get recipe by source URL:', error);
    return { data: null, error: error as Error };
  }
}
