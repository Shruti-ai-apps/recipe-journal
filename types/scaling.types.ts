/**
 * Scaling-related type definitions
 */

import { ParsedIngredient, UnitSystem } from './ingredient.types';
import { Recipe, ServingInfo } from './recipe.types';

/**
 * Options for scaling a recipe
 */
export interface ScalingOptions {
  /** Multiplier to apply (e.g., 0.5, 1, 2, 3) */
  multiplier: number;
  /** Alternative: scale to specific number of servings */
  targetServings?: number;
  /** Convert units to specific system while scaling */
  targetUnitSystem?: UnitSystem;
  /** How to round the results */
  roundingPrecision?: 'exact' | 'friendly';
}

/**
 * A scaled quantity with display information
 */
export interface ScaledQuantity {
  /** Numeric value after scaling */
  value: number;
  /** Human-readable display (e.g., "1/3", "pinch", "2") */
  displayValue: string;
  /** Modifier for very small amounts (e.g., "to taste", "as needed") */
  displayModifier?: string;
  /** Whether the value was rounded */
  wasRounded: boolean;
  /** Original value before scaling */
  originalValue: number;
}

/**
 * An ingredient after scaling has been applied
 */
export interface ScaledIngredient extends ParsedIngredient {
  /** Scaled quantity information */
  scaledQuantity: ScaledQuantity | null;
  /** Unit after scaling (may have changed due to conversion) */
  scaledUnit: string | null;
  /** Ready-to-display text for the scaled ingredient */
  displayText: string;
}

/**
 * Scaling metadata
 */
export interface ScalingInfo {
  /** Original serving information */
  originalServings: ServingInfo;
  /** Scaled serving information */
  scaledServings: ServingInfo;
  /** Multiplier that was applied */
  multiplier: number;
  /** When scaling was applied */
  appliedAt: Date;
}

/**
 * A recipe after scaling has been applied
 */
export interface ScaledRecipe extends Omit<Recipe, 'ingredients'> {
  /** Scaling metadata */
  scaling: ScalingInfo;
  /** Original ingredients (unchanged) */
  originalIngredients: ParsedIngredient[];
  /** Scaled ingredients with display text */
  scaledIngredients: ScaledIngredient[];
  /** Cooking tips based on the scaling factor */
  scalingTips?: string[];
}

/**
 * Thresholds for special quantity handling
 */
export const QUANTITY_THRESHOLDS = {
  /** Below this, show "pinch" */
  PINCH: 0.0625, // 1/16
  /** Below this, show "to taste" */
  TO_TASTE: 0.03125, // 1/32
  /** Minimum displayable fraction */
  MIN_FRACTION: 0.125, // 1/8
} as const;

/**
 * Cooking tips based on scaling multiplier
 */
export const SCALING_TIPS: Record<string, string[]> = {
  half: [
    'Check doneness earlier than the original time suggests.',
    'Use a smaller baking pan if the original recipe calls for one.',
  ],
  double: [
    'Consider extending cook time by 10-15 minutes for baked goods.',
    'You may need to use a larger pan or multiple pans.',
    'Mixing time may need to be extended for larger batches.',
  ],
  triple: [
    'For baked goods, consider making in batches for best results.',
    'Significantly increase mixing time for uniform consistency.',
    'Check internal temperature rather than relying on time alone.',
  ],
  large: [
    'Very large batches may affect texture and rise in baked goods.',
    'Consider professional equipment for batches this size.',
    'Cooking times may vary significantly - use a thermometer.',
  ],
};
