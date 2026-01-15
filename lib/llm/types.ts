/**
 * LLM Smart Scaling Type Definitions
 */

import { ParsedIngredient, ScaledIngredient } from '@/types';

/**
 * Ingredient categories for smart scaling
 */
export type IngredientCategory =
  | 'linear'      // Scale normally (flour, sugar, water)
  | 'discrete'    // Round to whole (eggs, lemons)
  | 'leavening'   // Scale conservatively (baking powder, yeast)
  | 'seasoning'   // Scale sublinearly (salt, spices)
  | 'fat'         // May need adjustment for large batches
  | 'liquid';     // May need slight reduction for large batches

/**
 * Request for smart scaling
 */
export interface SmartScaleRequest {
  /** Ingredients to scale */
  ingredients: ParsedIngredient[];
  /** Scale multiplier (e.g., 0.5, 2, 3) */
  multiplier: number;
  /** Original servings count */
  originalServings?: number;
  /** Target servings (alternative to multiplier) */
  targetServings?: number;
}

/**
 * An ingredient scaled with AI intelligence
 */
export interface SmartScaledIngredient extends ScaledIngredient {
  /** Whether AI adjusted this beyond linear scaling */
  aiAdjusted: boolean;
  /** Reason for AI adjustment (e.g., "Rounded to whole eggs") */
  adjustmentReason?: string;
  /** Category determined by AI */
  category: IngredientCategory;
}

/**
 * Response from smart scaling
 */
export interface SmartScaleResponse {
  /** Scaled ingredients with AI adjustments */
  ingredients: SmartScaledIngredient[];
  /** Cooking tips from AI */
  tips: string[];
  /** Cooking time adjustment suggestion */
  cookingTimeAdjustment?: string;
  /** Whether AI scaling succeeded */
  success: boolean;
  /** Error message if scaling failed */
  error?: string;
}

/**
 * Cached smart scale result
 */
export interface CachedScaleResult {
  /** Cache key: ${recipeId}_${multiplier} */
  key: string;
  /** Cached response */
  result: SmartScaleResponse;
  /** When cached */
  createdAt: string;
  /** Expiration time (24 hours from creation) */
  expiresAt: string;
}

/**
 * AI response structure from Gemini
 */
export interface GeminiScaleResponse {
  ingredients: Array<{
    index: number;
    originalText: string;
    scaledQuantity: number;
    scaledUnit: string;
    displayText: string;
    aiAdjusted: boolean;
    adjustmentReason?: string;
    category: IngredientCategory;
  }>;
  tips: string[];
  cookingTimeAdjustment?: string;
}
