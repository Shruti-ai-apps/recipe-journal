/**
 * Schema.org JSON-LD Recipe scraper
 *
 * This is the primary scraping strategy as most modern recipe sites
 * use Schema.org structured data for SEO purposes.
 */

import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import {
  Recipe,
  ParsedIngredient,
  Instruction,
  ServingInfo,
  RecipeSource,
} from '@recipe-journal/shared';
import logger from '../../../utils/logger.js';

interface SchemaRecipe {
  '@type': string | string[];
  name?: string;
  description?: string;
  image?: string | string[] | { url: string }[];
  author?: string | { name: string } | { name: string }[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | number | string[];
  recipeIngredient?: string[];
  recipeInstructions?: string | string[] | { text: string }[] | { '@type': string; text: string }[];
  nutrition?: {
    calories?: string;
    proteinContent?: string;
    carbohydrateContent?: string;
    fatContent?: string;
    [key: string]: string | undefined;
  };
  keywords?: string | string[];
  recipeCategory?: string | string[];
  recipeCuisine?: string | string[];
}

export class SchemaOrgScraper {
  /**
   * Decode HTML entities in a string
   */
  private decodeHtmlEntities(text: string | undefined): string | undefined {
    if (!text) return undefined;

    // Use cheerio to decode HTML entities
    const $ = cheerio.load(`<div>${text}</div>`);
    return $('div').text();
  }

  /**
   * Attempt to scrape recipe using Schema.org JSON-LD
   */
  async scrape(html: string, url: string, domain: string): Promise<Recipe | null> {
    try {
      const $ = cheerio.load(html);

      // Find all JSON-LD scripts
      const jsonLdScripts = $('script[type="application/ld+json"]');

      for (let i = 0; i < jsonLdScripts.length; i++) {
        const scriptContent = $(jsonLdScripts[i]).html();
        if (!scriptContent) continue;

        try {
          const jsonData = JSON.parse(scriptContent);
          const recipeData = this.findRecipeInJson(jsonData);

          if (recipeData) {
            logger.debug('Found Schema.org recipe data');
            return this.parseSchemaRecipe(recipeData, url, domain);
          }
        } catch (parseError) {
          // JSON parse error, try next script
          continue;
        }
      }

      return null;
    } catch (error) {
      logger.error('Schema.org scraper error', { error });
      return null;
    }
  }

  /**
   * Recursively search for Recipe type in JSON-LD data
   */
  private findRecipeInJson(data: unknown): SchemaRecipe | null {
    if (!data || typeof data !== 'object') return null;

    // Check if this object is a Recipe
    if (this.isRecipeType(data)) {
      return data as SchemaRecipe;
    }

    // Check @graph array (common in structured data)
    if (Array.isArray((data as { '@graph'?: unknown[] })['@graph'])) {
      for (const item of (data as { '@graph': unknown[] })['@graph']) {
        const found = this.findRecipeInJson(item);
        if (found) return found;
      }
    }

    // Check if it's an array
    if (Array.isArray(data)) {
      for (const item of data) {
        const found = this.findRecipeInJson(item);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Check if an object is a Recipe type
   */
  private isRecipeType(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') return false;
    const type = (obj as { '@type'?: string | string[] })['@type'];

    if (typeof type === 'string') {
      return type === 'Recipe' || type.includes('Recipe');
    }

    if (Array.isArray(type)) {
      return type.some((t) => t === 'Recipe' || t.includes('Recipe'));
    }

    return false;
  }

  /**
   * Parse Schema.org recipe data into our Recipe format
   */
  private parseSchemaRecipe(
    data: SchemaRecipe,
    url: string,
    domain: string
  ): Recipe {
    const source: RecipeSource = {
      url,
      domain,
      scrapedAt: new Date(),
      scrapeMethod: 'schema-org',
    };

    return {
      source,
      title: this.decodeHtmlEntities(data.name) || 'Untitled Recipe',
      description: this.decodeHtmlEntities(data.description),
      image: this.parseImage(data.image),
      author: this.decodeHtmlEntities(this.parseAuthor(data.author)),
      prepTime: this.parseISODuration(data.prepTime),
      cookTime: this.parseISODuration(data.cookTime),
      totalTime: this.parseISODuration(data.totalTime),
      servings: this.parseServings(data.recipeYield),
      ingredients: this.parseIngredients(data.recipeIngredient),
      instructions: this.parseInstructions(data.recipeInstructions),
      nutrition: this.parseNutrition(data.nutrition),
      tags: this.parseTags(data),
      rawData: {
        ingredients: (data.recipeIngredient || []).map(
          (i) => this.decodeHtmlEntities(i) || i
        ),
        instructions: this.extractRawInstructions(data.recipeInstructions).map(
          (i) => this.decodeHtmlEntities(i) || i
        ),
      },
    };
  }

  /**
   * Parse image from various formats
   */
  private parseImage(
    image: string | string[] | { url: string }[] | undefined
  ): string | undefined {
    if (!image) return undefined;

    if (typeof image === 'string') return image;

    if (Array.isArray(image)) {
      const first = image[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && 'url' in first) return first.url;
    }

    return undefined;
  }

  /**
   * Parse author from various formats
   */
  private parseAuthor(
    author: string | { name: string } | { name: string }[] | undefined
  ): string | undefined {
    if (!author) return undefined;

    if (typeof author === 'string') return author;

    if (Array.isArray(author)) {
      const first = author[0];
      if (first && typeof first === 'object' && 'name' in first) return first.name;
    }

    if (typeof author === 'object' && 'name' in author) return author.name;

    return undefined;
  }

  /**
   * Parse ISO 8601 duration to minutes
   */
  private parseISODuration(duration: string | undefined): number | undefined {
    if (!duration) return undefined;

    // Match ISO 8601 duration format: PT1H30M, PT45M, PT2H, etc.
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
    if (!match) return undefined;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  /**
   * Parse recipe yield/servings
   */
  private parseServings(
    yield_: string | number | string[] | undefined
  ): ServingInfo {
    const defaultServings: ServingInfo = {
      amount: 4,
      unit: 'servings',
      originalText: 'Makes 4 servings',
    };

    if (!yield_) return defaultServings;

    let text = '';
    if (typeof yield_ === 'number') {
      return {
        amount: yield_,
        unit: 'servings',
        originalText: `${yield_} servings`,
      };
    }

    if (Array.isArray(yield_)) {
      text = yield_[0] || '';
    } else {
      text = yield_;
    }

    // Try to extract number from text
    const match = text.match(/(\d+)/);
    const amount = match ? parseInt(match[1], 10) : 4;

    // Try to determine unit
    let unit = 'servings';
    if (text.toLowerCase().includes('cookie')) unit = 'cookies';
    else if (text.toLowerCase().includes('slice')) unit = 'slices';
    else if (text.toLowerCase().includes('portion')) unit = 'portions';
    else if (text.toLowerCase().includes('piece')) unit = 'pieces';
    else if (text.toLowerCase().includes('cup')) unit = 'cups';

    return {
      amount,
      unit,
      originalText: text,
    };
  }

  /**
   * Parse ingredients array
   */
  private parseIngredients(ingredients: string[] | undefined): ParsedIngredient[] {
    if (!ingredients || !Array.isArray(ingredients)) return [];

    return ingredients.map((ingredient) => {
      const decoded = this.decodeHtmlEntities(ingredient) || ingredient;
      return {
        id: uuidv4(),
        original: decoded,
        quantity: null,
        unit: null,
        ingredient: decoded,
        parseConfidence: 0,
      };
    });
  }

  /**
   * Parse instructions from various formats
   */
  private parseInstructions(
    instructions:
      | string
      | string[]
      | { text: string }[]
      | { '@type': string; text: string }[]
      | undefined
  ): Instruction[] {
    if (!instructions) return [];

    let steps: string[] = [];

    if (typeof instructions === 'string') {
      // Decode first, then split by newlines or periods
      const decoded = this.decodeHtmlEntities(instructions) || instructions;
      steps = decoded
        .split(/\n|(?<=\.)\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (Array.isArray(instructions)) {
      steps = instructions.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) return item.text;
        return '';
      }).filter((s) => s.length > 0);
    }

    return steps.map((text, index) => {
      const decoded = this.decodeHtmlEntities(text.trim()) || text.trim();
      return {
        step: index + 1,
        text: decoded,
        temperature: this.extractTemperature(decoded),
        time: this.extractTime(decoded),
      };
    });
  }

  /**
   * Extract raw instructions for storage
   */
  private extractRawInstructions(
    instructions:
      | string
      | string[]
      | { text: string }[]
      | { '@type': string; text: string }[]
      | undefined
  ): string[] {
    if (!instructions) return [];

    if (typeof instructions === 'string') {
      return [instructions];
    }

    if (Array.isArray(instructions)) {
      return instructions.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) return item.text;
        return '';
      }).filter((s) => s.length > 0);
    }

    return [];
  }

  /**
   * Extract temperature from instruction text
   */
  private extractTemperature(
    text: string
  ): { value: number; unit: 'F' | 'C'; originalText: string } | undefined {
    // Match patterns like "350°F", "350 degrees F", "180°C"
    const match = text.match(/(\d{2,3})\s*°?\s*(degrees?\s*)?(F|C|fahrenheit|celsius)/i);
    if (!match) return undefined;

    const value = parseInt(match[1], 10);
    const unit = match[3].toUpperCase().startsWith('C') ? 'C' : 'F';

    return {
      value,
      unit: unit as 'F' | 'C',
      originalText: match[0],
    };
  }

  /**
   * Extract time from instruction text
   */
  private extractTime(
    text: string
  ): { value: number; unit: 'minutes' | 'hours'; originalText: string } | undefined {
    // Match patterns like "30 minutes", "1 hour", "45 min"
    const match = text.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
    if (!match) return undefined;

    const value = parseInt(match[1], 10);
    const unitText = match[2].toLowerCase();
    const unit = unitText.startsWith('h') ? 'hours' : 'minutes';

    return {
      value,
      unit,
      originalText: match[0],
    };
  }

  /**
   * Parse nutrition information
   */
  private parseNutrition(
    nutrition: SchemaRecipe['nutrition']
  ): Recipe['nutrition'] | undefined {
    if (!nutrition) return undefined;

    return {
      calories: nutrition.calories ? parseInt(nutrition.calories, 10) : undefined,
      protein: nutrition.proteinContent,
      carbohydrates: nutrition.carbohydrateContent,
      fat: nutrition.fatContent,
    };
  }

  /**
   * Parse tags from keywords, category, and cuisine
   */
  private parseTags(data: SchemaRecipe): string[] {
    const tags: string[] = [];

    // Add keywords
    if (data.keywords) {
      if (typeof data.keywords === 'string') {
        tags.push(...data.keywords.split(',').map((k) => k.trim()));
      } else if (Array.isArray(data.keywords)) {
        tags.push(...data.keywords);
      }
    }

    // Add categories
    if (data.recipeCategory) {
      if (typeof data.recipeCategory === 'string') {
        tags.push(data.recipeCategory);
      } else if (Array.isArray(data.recipeCategory)) {
        tags.push(...data.recipeCategory);
      }
    }

    // Add cuisines
    if (data.recipeCuisine) {
      if (typeof data.recipeCuisine === 'string') {
        tags.push(data.recipeCuisine);
      } else if (Array.isArray(data.recipeCuisine)) {
        tags.push(...data.recipeCuisine);
      }
    }

    // Remove duplicates and empty strings
    return [...new Set(tags.filter((t) => t && t.length > 0))];
  }
}
