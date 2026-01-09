/**
 * Recipe-related type definitions
 */

import { ParsedIngredient } from './ingredient.types.js';

/**
 * Information about where the recipe was scraped from
 */
export interface RecipeSource {
  /** Original URL of the recipe */
  url: string;
  /** Domain name (e.g., "allrecipes.com") */
  domain: string;
  /** When the recipe was scraped */
  scrapedAt: Date;
  /** Method used to scrape the recipe */
  scrapeMethod: 'schema-org' | 'dom' | 'puppeteer';
}

/**
 * Serving size information
 */
export interface ServingInfo {
  /** Number of servings */
  amount: number;
  /** Unit of serving (e.g., "servings", "portions", "cookies") */
  unit?: string;
  /** Original text from recipe (e.g., "Makes 24 cookies") */
  originalText: string;
}

/**
 * Temperature information extracted from instructions
 */
export interface TemperatureInfo {
  /** Numeric value of temperature */
  value: number;
  /** Temperature unit (Fahrenheit or Celsius) */
  unit: 'F' | 'C';
  /** Original text containing the temperature */
  originalText: string;
}

/**
 * Time information extracted from instructions
 */
export interface TimeInfo {
  /** Duration value */
  value: number;
  /** Time unit */
  unit: 'minutes' | 'hours';
  /** Original text containing the time */
  originalText: string;
}

/**
 * A single instruction step
 */
export interface Instruction {
  /** Step number (1-indexed) */
  step: number;
  /** Instruction text */
  text: string;
  /** Temperature mentioned in this step, if any */
  temperature?: TemperatureInfo;
  /** Time mentioned in this step, if any */
  time?: TimeInfo;
}

/**
 * Nutritional information
 */
export interface NutritionInfo {
  calories?: number;
  protein?: string;
  carbohydrates?: string;
  fat?: string;
  fiber?: string;
  sodium?: string;
  sugar?: string;
  [key: string]: string | number | undefined;
}

/**
 * Main Recipe interface - the core data structure
 */
export interface Recipe {
  /** Database ID (for future storage) */
  id?: string;
  /** Source information */
  source: RecipeSource;
  /** Recipe title */
  title: string;
  /** Recipe description/summary */
  description?: string;
  /** Main recipe image URL */
  image?: string;
  /** Recipe author or website */
  author?: string;
  /** Preparation time in minutes */
  prepTime?: number;
  /** Cooking time in minutes */
  cookTime?: number;
  /** Total time in minutes */
  totalTime?: number;
  /** Serving information */
  servings: ServingInfo;
  /** Parsed ingredients list */
  ingredients: ParsedIngredient[];
  /** Cooking instructions */
  instructions: Instruction[];
  /** Nutritional information */
  nutrition?: NutritionInfo;
  /** Recipe tags/categories */
  tags?: string[];
  /** Original raw data for debugging */
  rawData?: {
    ingredients: string[];
    instructions: string[];
  };
}
