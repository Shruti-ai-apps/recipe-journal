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
import { decimalToDisplay, convertUnit, getUnit, UNITS } from '@/constants';
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
   * Scale a single ingredient for display, using the same rules as recipe scaling
   */
  scaleIngredientForDisplay(
    ingredient: ParsedIngredient,
    multiplier: number,
    targetUnitSystem?: UnitSystem,
    roundingPrecision: 'exact' | 'friendly' = 'friendly'
  ): ScaledIngredient {
    return this.scaleIngredient(ingredient, multiplier, targetUnitSystem, roundingPrecision);
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

    const originalQuantity = ingredient.quantity;

    // Scale the quantity (support ranges)
    const scaledValue = originalQuantity.value * multiplier;
    const scaledValueTo =
      originalQuantity.type === 'range' && typeof originalQuantity.valueTo === 'number'
        ? originalQuantity.valueTo * multiplier
        : undefined;

    let scaledUnit = ingredient.unit;
    let finalValue = scaledValue;
    let finalValueTo = scaledValueTo;

    // Convert units if requested
    if (targetUnitSystem && ingredient.unit) {
      const convertedFrom = this.convertToSystem(scaledValue, ingredient.unit, targetUnitSystem);
      if (convertedFrom) {
        finalValue = convertedFrom.value;
        scaledUnit = convertedFrom.unit;

        if (typeof scaledValueTo === 'number') {
          const convertedTo = convertUnit(scaledValueTo, ingredient.unit, convertedFrom.unit);
          if (convertedTo !== null) {
            finalValueTo = convertedTo;
          }
        }
      }
    }

    // Create scaled quantity with rounding
    const scaledQuantity =
      originalQuantity.type === 'range' && typeof originalQuantity.valueTo === 'number' && typeof finalValueTo === 'number'
        ? this.createScaledQuantityRange(
            finalValue,
            finalValueTo,
            originalQuantity.value,
            originalQuantity.valueTo,
            roundingPrecision
          )
        : this.createScaledQuantity(finalValue, originalQuantity.value, roundingPrecision);

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
      wasRounded = displayValue !== value.toString();
    }

    return {
      value,
      displayValue,
      wasRounded,
      originalValue,
    };
  }

  /**
   * Create a scaled range quantity with appropriate rounding
   */
  private createScaledQuantityRange(
    valueFrom: number,
    valueTo: number,
    originalValueFrom: number,
    originalValueTo: number,
    roundingPrecision: 'exact' | 'friendly'
  ): ScaledQuantity {
    const maxValue = Math.max(valueFrom, valueTo);

    // Check for very small amounts (use upper bound)
    if (maxValue <= QUANTITY_THRESHOLDS.TO_TASTE) {
      return {
        value: valueFrom,
        valueTo,
        displayValue: 'a pinch',
        displayModifier: 'to taste',
        wasRounded: true,
        originalValue: originalValueFrom,
        originalValueTo,
      };
    }

    if (maxValue <= QUANTITY_THRESHOLDS.PINCH) {
      return {
        value: valueFrom,
        valueTo,
        displayValue: 'a pinch',
        wasRounded: true,
        originalValue: originalValueFrom,
        originalValueTo,
      };
    }

    let fromDisplay: string;
    let toDisplay: string;

    if (roundingPrecision === 'friendly') {
      fromDisplay = decimalToDisplay(valueFrom);
      toDisplay = decimalToDisplay(valueTo);
    } else {
      fromDisplay = valueFrom.toFixed(3).replace(/\.?0+$/, '');
      toDisplay = valueTo.toFixed(3).replace(/\.?0+$/, '');
    }

    const displayValue =
      fromDisplay === toDisplay ? fromDisplay : `${fromDisplay}–${toDisplay}`;

    const wasRounded =
      fromDisplay !== valueFrom.toString() || toDisplay !== valueTo.toString();

    return {
      value: valueFrom,
      valueTo,
      displayValue,
      wasRounded,
      originalValue: originalValueFrom,
      originalValueTo,
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
      fluidOunce: { metric: 'milliliter' },
      pint: { metric: 'milliliter' },
      quart: { metric: 'milliliter' },
      gallon: { metric: 'milliliter' },
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

    const quantityForGrammar = scaledQuantity.valueTo ?? scaledQuantity.value;
    const omitUnit =
      scaledQuantity.displayValue === 'a pinch' ||
      scaledQuantity.displayModifier === 'to taste';

    // Add quantity
    if (scaledQuantity.displayModifier) {
      parts.push(`${scaledQuantity.displayValue} (${scaledQuantity.displayModifier})`);
    } else {
      parts.push(scaledQuantity.displayValue);
    }

    // Add unit
    if (unit && !omitUnit) {
      const unitDef = getUnit(unit);
      const unitName = unitDef?.name || unit;
      const unitDisplay = this.pluralizeUnit(unitName, quantityForGrammar);
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

  private pluralizeUnit(unitName: string, quantity: number): string {
    if (quantity <= 1) {
      // Best-effort singularization (for units already pluralized)
      if (unitName.endsWith('s') && !unitName.endsWith('ss')) {
        return unitName.slice(0, -1);
      }
      return unitName;
    }

    // Irregular/edge cases
    if (unitName === 'dash') return 'dashes';
    if (unitName === 'pinch') return 'pinches';

    // Pluralize last word for multi-word units (e.g., "fluid ounce" -> "fluid ounces")
    if (unitName.includes(' ')) {
      const words = unitName.split(' ');
      const last = words[words.length - 1];
      const pluralLast = last.endsWith('s') ? last : `${last}s`;
      return [...words.slice(0, -1), pluralLast].join(' ');
    }

    return unitName.endsWith('s') ? unitName : `${unitName}s`;
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
