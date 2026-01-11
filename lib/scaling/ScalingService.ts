/**
 * Recipe scaling service
 *
 * Scales recipe ingredients with intelligent rounding
 * and unit conversion support.
 */

import {
  Recipe,
  ScaledRecipe,
  ScaledIngredient,
  ScaledQuantity,
  ScalingOptions,
  ParsedIngredient,
  ServingInfo,
  QUANTITY_THRESHOLDS,
  SCALING_TIPS,
  UnitSystem,
} from '@/types';
import { decimalToDisplay, convertUnit, UNITS } from '@/constants';
import { logger } from '@/lib/utils';

export class ScalingService {
  /**
   * Scale a recipe by the given options
   */
  async scaleRecipe(recipe: Recipe, options: ScalingOptions): Promise<ScaledRecipe> {
    const { multiplier, targetUnitSystem, roundingPrecision = 'friendly' } = options;

    logger.debug('Scaling recipe', {
      title: recipe.title,
      multiplier,
      ingredientCount: recipe.ingredients.length,
    });

    // Scale servings
    const scaledServings = this.scaleServings(recipe.servings, multiplier);

    // Scale ingredients
    const scaledIngredients = recipe.ingredients.map((ingredient) =>
      this.scaleIngredient(ingredient, multiplier, targetUnitSystem, roundingPrecision)
    );

    // Get scaling tips based on multiplier
    const scalingTips = this.getScalingTips(multiplier);

    const scaledRecipe: ScaledRecipe = {
      ...recipe,
      scaling: {
        originalServings: recipe.servings,
        scaledServings,
        multiplier,
        appliedAt: new Date(),
      },
      originalIngredients: recipe.ingredients,
      scaledIngredients,
      scalingTips,
    };

    return scaledRecipe;
  }

  /**
   * Scale a single ingredient
   */
  private scaleIngredient(
    ingredient: ParsedIngredient,
    multiplier: number,
    targetUnitSystem?: UnitSystem,
    roundingPrecision: 'exact' | 'friendly' = 'friendly'
  ): ScaledIngredient {
    // If no quantity, return ingredient as-is
    if (!ingredient.quantity) {
      return {
        ...ingredient,
        scaledQuantity: null,
        scaledUnit: ingredient.unit,
        displayText: ingredient.original,
      };
    }

    // Scale the quantity
    const scaledValue = ingredient.quantity.value * multiplier;
    let scaledUnit = ingredient.unit;
    let finalValue = scaledValue;

    // Convert units if requested
    if (targetUnitSystem && ingredient.unit) {
      const converted = this.convertToSystem(scaledValue, ingredient.unit, targetUnitSystem);
      if (converted) {
        finalValue = converted.value;
        scaledUnit = converted.unit;
      }
    }

    // Create scaled quantity with rounding
    const scaledQuantity = this.createScaledQuantity(
      finalValue,
      ingredient.quantity.value,
      roundingPrecision
    );

    // Generate display text
    const displayText = this.generateDisplayText(
      scaledQuantity,
      scaledUnit,
      ingredient.ingredient,
      ingredient.preparation,
      ingredient.notes
    );

    return {
      ...ingredient,
      scaledQuantity,
      scaledUnit,
      displayText,
    };
  }

  /**
   * Create a scaled quantity with appropriate rounding
   */
  private createScaledQuantity(
    value: number,
    originalValue: number,
    roundingPrecision: 'exact' | 'friendly'
  ): ScaledQuantity {
    // Check for very small amounts
    if (value <= QUANTITY_THRESHOLDS.TO_TASTE) {
      return {
        value,
        displayValue: 'a pinch',
        displayModifier: 'to taste',
        wasRounded: true,
        originalValue,
      };
    }

    if (value <= QUANTITY_THRESHOLDS.PINCH) {
      return {
        value,
        displayValue: 'a pinch',
        wasRounded: true,
        originalValue,
      };
    }

    // Apply friendly rounding if requested
    let displayValue: string;
    let wasRounded = false;

    if (roundingPrecision === 'friendly') {
      displayValue = decimalToDisplay(value);
      wasRounded = displayValue !== value.toString();
    } else {
      // Exact mode - still round to reasonable precision
      displayValue = value.toFixed(3).replace(/\.?0+$/, '');
    }

    return {
      value,
      displayValue,
      wasRounded,
      originalValue,
    };
  }

  /**
   * Convert a value to the target unit system
   */
  private convertToSystem(
    value: number,
    fromUnit: string,
    targetSystem: UnitSystem
  ): { value: number; unit: string } | null {
    // Get the unit definition
    const unitDef = UNITS[fromUnit];
    if (!unitDef || unitDef.system === targetSystem) {
      return null; // No conversion needed
    }

    // Find equivalent unit in target system
    const targetUnit = this.findEquivalentUnit(fromUnit, targetSystem);
    if (!targetUnit) {
      return null; // No equivalent found
    }

    const converted = convertUnit(value, fromUnit, targetUnit);
    if (converted === null) {
      return null;
    }

    return { value: converted, unit: targetUnit };
  }

  /**
   * Find an equivalent unit in the target system
   */
  private findEquivalentUnit(fromUnit: string, targetSystem: UnitSystem): string | null {
    const fromDef = UNITS[fromUnit];
    if (!fromDef) return null;

    // Common conversions
    const conversions: Record<string, Record<string, string>> = {
      cup: { metric: 'milliliter' },
      tablespoon: { metric: 'milliliter' },
      teaspoon: { metric: 'milliliter' },
      ounce: { metric: 'gram' },
      pound: { metric: 'gram' },
      milliliter: { us: 'cup' },
      liter: { us: 'quart' },
      gram: { us: 'ounce' },
      kilogram: { us: 'pound' },
    };

    return conversions[fromUnit]?.[targetSystem] || null;
  }

  /**
   * Generate display text for a scaled ingredient
   */
  private generateDisplayText(
    scaledQuantity: ScaledQuantity,
    unit: string | null,
    ingredient: string,
    preparation?: string,
    notes?: string
  ): string {
    const parts: string[] = [];

    // Add quantity
    if (scaledQuantity.displayModifier) {
      parts.push(`${scaledQuantity.displayValue} (${scaledQuantity.displayModifier})`);
    } else {
      parts.push(scaledQuantity.displayValue);
    }

    // Add unit
    if (unit) {
      // Pluralize if needed
      const quantity = scaledQuantity.value;
      let unitDisplay = unit;
      if (quantity > 1 && !unit.endsWith('s')) {
        unitDisplay = unit + 's';
      } else if (quantity <= 1 && unit.endsWith('s')) {
        unitDisplay = unit.slice(0, -1);
      }
      parts.push(unitDisplay);
    }

    // Add ingredient
    parts.push(ingredient);

    // Add preparation
    if (preparation) {
      parts.push(`, ${preparation}`);
    }

    // Add notes
    if (notes) {
      parts.push(` (${notes})`);
    }

    return parts.join(' ').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
  }

  /**
   * Scale servings information
   */
  private scaleServings(servings: ServingInfo, multiplier: number): ServingInfo {
    const scaledAmount = Math.round(servings.amount * multiplier);

    return {
      amount: scaledAmount,
      unit: servings.unit,
      originalText: `${scaledAmount} ${servings.unit || 'servings'}`,
    };
  }

  /**
   * Get cooking tips based on the scaling multiplier
   */
  private getScalingTips(multiplier: number): string[] {
    if (multiplier === 1) {
      return [];
    }

    if (multiplier < 1) {
      return SCALING_TIPS.half || [];
    }

    if (multiplier <= 2) {
      return SCALING_TIPS.double || [];
    }

    if (multiplier <= 3) {
      return SCALING_TIPS.triple || [];
    }

    return SCALING_TIPS.large || [];
  }
}

// Export singleton instance
export const scalingService = new ScalingService();
