/**
 * Ingredient-related type definitions
 */

/**
 * Unit measurement systems
 */
export enum UnitSystem {
  US = 'us',
  METRIC = 'metric',
}

/**
 * Categories of measurement units
 */
export enum UnitCategory {
  VOLUME = 'volume',
  WEIGHT = 'weight',
  COUNT = 'count',
  TEMPERATURE = 'temperature',
}

/**
 * Definition of a measurement unit
 */
export interface UnitDefinition {
  /** Canonical name of the unit (e.g., "cup") */
  name: string;
  /** Common abbreviations and variations (e.g., ["c", "c.", "cups"]) */
  abbreviations: string[];
  /** Whether this is US or Metric system */
  system: UnitSystem;
  /** Category of measurement */
  category: UnitCategory;
  /** Conversion factor to base unit (ml for volume, g for weight) */
  baseConversion: number;
}

/**
 * Represents a quantity that can be a single value or a range
 */
export interface IngredientQuantity {
  /** Whether this is a single value or a range (e.g., "1-2 cups") */
  type: 'single' | 'range';
  /** Primary numeric value */
  value: number;
  /** Upper bound for range quantities */
  valueTo?: number;
  /** Human-readable display format (e.g., "2 1/2") */
  displayValue: string;
}

/**
 * A parsed ingredient with structured data
 */
export interface ParsedIngredient {
  /** Unique identifier for React keys */
  id: string;
  /** Original raw text from the recipe */
  original: string;
  /** Parsed quantity, null if unparseable */
  quantity: IngredientQuantity | null;
  /** Normalized unit name, null for count-based items */
  unit: string | null;
  /** The ingredient name */
  ingredient: string;
  /** Preparation instructions (e.g., "chopped", "diced") */
  preparation?: string;
  /** Additional notes (e.g., "optional", "divided") */
  notes?: string;
  /** Confidence score for parsing accuracy (0-1) */
  parseConfidence: number;
  /** Error message if parsing partially failed */
  parseError?: string;
}
