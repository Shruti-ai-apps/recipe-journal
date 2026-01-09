/**
 * Unit definitions and conversion constants
 */

import { UnitDefinition, UnitSystem, UnitCategory } from '../types/ingredient.types.js';

/**
 * Complete unit definitions with conversion factors
 * Base units: milliliters (ml) for volume, grams (g) for weight
 */
export const UNITS: Record<string, UnitDefinition> = {
  // Volume - US
  cup: {
    name: 'cup',
    abbreviations: ['c', 'c.', 'cups', 'Cup', 'Cups', 'C'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 236.588,
  },
  tablespoon: {
    name: 'tablespoon',
    abbreviations: ['tbsp', 'tbsp.', 'T', 'Tbsp', 'Tbsp.', 'tablespoons', 'Tablespoon', 'Tablespoons', 'tbs', 'tbs.'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 14.787,
  },
  teaspoon: {
    name: 'teaspoon',
    abbreviations: ['tsp', 'tsp.', 't', 'Tsp', 'Tsp.', 'teaspoons', 'Teaspoon', 'Teaspoons'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 4.929,
  },
  fluidOunce: {
    name: 'fluid ounce',
    abbreviations: ['fl oz', 'fl. oz.', 'fl oz.', 'fluid ounce', 'fluid ounces', 'fl. oz'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 29.574,
  },
  pint: {
    name: 'pint',
    abbreviations: ['pt', 'pt.', 'pints', 'Pint', 'Pints'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 473.176,
  },
  quart: {
    name: 'quart',
    abbreviations: ['qt', 'qt.', 'quarts', 'Quart', 'Quarts'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 946.353,
  },
  gallon: {
    name: 'gallon',
    abbreviations: ['gal', 'gal.', 'gallons', 'Gallon', 'Gallons'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 3785.41,
  },

  // Volume - Metric
  milliliter: {
    name: 'milliliter',
    abbreviations: ['ml', 'mL', 'milliliters', 'millilitres', 'Milliliter', 'Milliliters'],
    system: UnitSystem.METRIC,
    category: UnitCategory.VOLUME,
    baseConversion: 1,
  },
  liter: {
    name: 'liter',
    abbreviations: ['l', 'L', 'liters', 'litres', 'Liter', 'Liters', 'Litre', 'Litres'],
    system: UnitSystem.METRIC,
    category: UnitCategory.VOLUME,
    baseConversion: 1000,
  },

  // Weight - US
  ounce: {
    name: 'ounce',
    abbreviations: ['oz', 'oz.', 'ounces', 'Ounce', 'Ounces'],
    system: UnitSystem.US,
    category: UnitCategory.WEIGHT,
    baseConversion: 28.3495,
  },
  pound: {
    name: 'pound',
    abbreviations: ['lb', 'lb.', 'lbs', 'lbs.', 'pounds', 'Pound', 'Pounds'],
    system: UnitSystem.US,
    category: UnitCategory.WEIGHT,
    baseConversion: 453.592,
  },

  // Weight - Metric
  gram: {
    name: 'gram',
    abbreviations: ['g', 'g.', 'grams', 'gm', 'gm.', 'Gram', 'Grams'],
    system: UnitSystem.METRIC,
    category: UnitCategory.WEIGHT,
    baseConversion: 1,
  },
  kilogram: {
    name: 'kilogram',
    abbreviations: ['kg', 'kg.', 'kilograms', 'Kilogram', 'Kilograms'],
    system: UnitSystem.METRIC,
    category: UnitCategory.WEIGHT,
    baseConversion: 1000,
  },
  milligram: {
    name: 'milligram',
    abbreviations: ['mg', 'mg.', 'milligrams', 'Milligram', 'Milligrams'],
    system: UnitSystem.METRIC,
    category: UnitCategory.WEIGHT,
    baseConversion: 0.001,
  },

  // Special/informal units
  pinch: {
    name: 'pinch',
    abbreviations: ['pinch', 'pinches', 'Pinch', 'Pinches'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 0.31, // approximately 1/16 teaspoon in ml
  },
  dash: {
    name: 'dash',
    abbreviations: ['dash', 'dashes', 'Dash', 'Dashes'],
    system: UnitSystem.US,
    category: UnitCategory.VOLUME,
    baseConversion: 0.62, // approximately 1/8 teaspoon in ml
  },
  stick: {
    name: 'stick',
    abbreviations: ['stick', 'sticks', 'Stick', 'Sticks'],
    system: UnitSystem.US,
    category: UnitCategory.WEIGHT,
    baseConversion: 113.4, // 1 stick butter = 113.4g
  },
};

/**
 * Build a lookup map from abbreviations to unit names
 */
export function buildAbbreviationMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [unitName, definition] of Object.entries(UNITS)) {
    // Add the canonical name
    map.set(definition.name.toLowerCase(), unitName);
    // Add all abbreviations
    for (const abbr of definition.abbreviations) {
      map.set(abbr.toLowerCase(), unitName);
    }
  }
  return map;
}

/**
 * Pre-built abbreviation lookup map
 */
export const UNIT_ABBREVIATION_MAP = buildAbbreviationMap();

/**
 * Get unit definition by name or abbreviation
 */
export function getUnit(nameOrAbbr: string): UnitDefinition | undefined {
  const unitName = UNIT_ABBREVIATION_MAP.get(nameOrAbbr.toLowerCase());
  return unitName ? UNITS[unitName] : undefined;
}

/**
 * Convert a value from one unit to another within the same category
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = getUnit(fromUnit);
  const to = getUnit(toUnit);

  if (!from || !to) return null;
  if (from.category !== to.category) return null;

  // Convert to base unit, then to target unit
  const baseValue = value * from.baseConversion;
  return baseValue / to.baseConversion;
}
