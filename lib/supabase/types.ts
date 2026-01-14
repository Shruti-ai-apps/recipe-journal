/**
 * Database types for Supabase
 * Maps to the recipes table schema
 */

import { ParsedIngredient, Instruction, NutritionInfo } from '@/types';

/**
 * Database recipe row - matches Supabase schema exactly
 */
export interface DbRecipe {
  id: string;
  user_id: string;

  // Recipe metadata
  title: string;
  source_url: string | null;
  source_domain: string | null;
  image_url: string | null;
  description: string | null;
  author: string | null;

  // Timing (stored as text in DB, e.g., "30 minutes")
  prep_time: string | null;
  cook_time: string | null;
  total_time: string | null;

  // Servings
  servings_amount: number | null;
  servings_unit: string | null;
  original_servings_amount: number | null;

  // Content (stored as JSONB)
  ingredients: ParsedIngredient[];
  instructions: Instruction[];
  nutrition: NutritionInfo | null;

  // User additions
  notes: string | null;
  tags: string[];
  is_favorite: boolean;

  // Scaling state
  last_scale_multiplier: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_viewed_at: string | null;

  // Sync metadata
  sync_version: number;
  is_deleted: boolean;
}

/**
 * Type for creating a new recipe (omits auto-generated fields)
 */
export type NewDbRecipe = Omit<
  DbRecipe,
  'id' | 'created_at' | 'updated_at' | 'sync_version' | 'is_deleted'
>;

/**
 * Type for updating a recipe (all fields optional except id)
 */
export type DbRecipeUpdate = Partial<
  Omit<DbRecipe, 'id' | 'user_id' | 'created_at' | 'sync_version'>
>;

/**
 * Database query response type
 */
export interface DbQueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Database list query response type
 */
export interface DbListResult<T> {
  data: T[];
  error: Error | null;
  count?: number;
}
