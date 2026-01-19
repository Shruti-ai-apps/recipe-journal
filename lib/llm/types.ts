/**
 * LLM Smart Scaling Type Definitions
 */

import type { ParsedIngredient, SmartScaleData, SmartScaleIngredientCategory } from '@/types';
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
}

/**
 * Cached smart scale result
 */
export interface CachedScaleResult {
  /** Cache key: ${recipeId}_${multiplier} */
  key: string;
  /** Cached response */
  result: SmartScaleData;
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
    aiAdjusted: boolean;
    adjustmentReason?: string;
    category: SmartScaleIngredientCategory;
  }>;
  tips: string[];
  cookingTimeAdjustment?: string;
}
