/**
 * Generic DOM-based recipe scraper
 *
 * This is the fallback strategy that uses common DOM patterns
 * to find recipe content when Schema.org data is not available.
 */

import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import {
  Recipe,
  ParsedIngredient,
  Instruction,
  ServingInfo,
  RecipeSource,
} from '@/types';
import { logger } from '@/lib/utils';

// Common CSS selectors for recipe content
const INGREDIENT_SELECTORS = [
  '.recipe-ingredients li',
  '.ingredients li',
  '.ingredient-list li',
  '[class*="ingredient"] li',
  '.wprm-recipe-ingredient',
  '.tasty-recipes-ingredients li',
  '.recipe-ingred_txt',
  '[itemprop="recipeIngredient"]',
  '.structured-ingredients__list-item',
];

const INSTRUCTION_SELECTORS = [
  '.recipe-instructions li',
  '.instructions li',
  '.recipe-steps li',
  '.directions li',
  '[class*="instruction"] li',
  '[class*="direction"] li',
  '.wprm-recipe-instruction',
  '.tasty-recipes-instructions li',
  '[itemprop="recipeInstructions"]',
  '.structured-ingredients__list-item',
];

const TITLE_SELECTORS = [
  'h1.recipe-title',
  'h1[class*="recipe"]',
  '.recipe-header h1',
  '[itemprop="name"]',
  '.wprm-recipe-name',
  'h1',
];

const SERVINGS_SELECTORS = [
  '[itemprop="recipeYield"]',
  '.recipe-yield',
  '.servings',
  '[class*="serving"]',
  '.wprm-recipe-servings',
];

const IMAGE_SELECTORS = [
  '[itemprop="image"]',
  '.recipe-image img',
  '.recipe-photo img',
  '[class*="recipe"] img',
  '.wprm-recipe-image img',
];

export class GenericDomScraper {
  /**
   * Attempt to scrape recipe using DOM parsing
   */
  async scrape(html: string, url: string, domain: string): Promise<Recipe | null> {
    try {
      const $ = cheerio.load(html);

      // Try to find ingredients (required)
      const ingredients = this.findIngredients($);
      if (ingredients.length === 0) {
        logger.debug('No ingredients found via DOM parsing');
        return null;
      }

      const source: RecipeSource = {
        url,
        domain,
        scrapedAt: new Date(),
        scrapeMethod: 'dom',
      };

      const title = this.findTitle($);
      const instructions = this.findInstructions($);
      const servings = this.findServings($);
      const image = this.findImage($);
      const description = this.findDescription($);

      if (!title) {
        logger.debug('No title found via DOM parsing');
        return null;
      }

      return {
        source,
        title,
        description,
        image,
        servings,
        ingredients: this.convertToIngredients(ingredients),
        instructions: this.convertToInstructions(instructions),
        rawData: {
          ingredients,
          instructions,
        },
      };
    } catch (error) {
      logger.error('Generic DOM scraper error', { error: error instanceof Error ? error.message : 'Unknown' });
      return null;
    }
  }

  /**
   * Find ingredients using various selectors
   */
  private findIngredients($: cheerio.CheerioAPI): string[] {
    for (const selector of INGREDIENT_SELECTORS) {
      const elements = $(selector);
      if (elements.length > 0) {
        const ingredients: string[] = [];
        elements.each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 2 && text.length < 500) {
            ingredients.push(text);
          }
        });
        if (ingredients.length >= 2) {
          logger.debug(`Found ${ingredients.length} ingredients using selector: ${selector}`);
          return ingredients;
        }
      }
    }
    return [];
  }

  /**
   * Find instructions using various selectors
   */
  private findInstructions($: cheerio.CheerioAPI): string[] {
    for (const selector of INSTRUCTION_SELECTORS) {
      const elements = $(selector);
      if (elements.length > 0) {
        const instructions: string[] = [];
        elements.each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) {
            instructions.push(text);
          }
        });
        if (instructions.length >= 1) {
          logger.debug(`Found ${instructions.length} instructions using selector: ${selector}`);
          return instructions;
        }
      }
    }
    return [];
  }

  /**
   * Find recipe title
   */
  private findTitle($: cheerio.CheerioAPI): string | undefined {
    for (const selector of TITLE_SELECTORS) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && text.length > 3 && text.length < 200) {
          return text;
        }
      }
    }
    return undefined;
  }

  /**
   * Find servings information
   */
  private findServings($: cheerio.CheerioAPI): ServingInfo {
    for (const selector of SERVINGS_SELECTORS) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text) {
          const match = text.match(/(\d+)/);
          if (match) {
            const amount = parseInt(match[1], 10);
            return {
              amount,
              unit: 'servings',
              originalText: text,
            };
          }
        }
      }
    }

    return {
      amount: 4,
      unit: 'servings',
      originalText: 'Serves 4',
    };
  }

  /**
   * Find recipe image
   */
  private findImage($: cheerio.CheerioAPI): string | undefined {
    for (const selector of IMAGE_SELECTORS) {
      const element = $(selector).first();
      if (element.length > 0) {
        const src = element.attr('src') || element.attr('data-src') || element.attr('content');
        if (src && src.startsWith('http')) {
          return src;
        }
      }
    }
    return undefined;
  }

  /**
   * Find recipe description
   */
  private findDescription($: cheerio.CheerioAPI): string | undefined {
    // Try meta description first
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc && metaDesc.length > 20) {
      return metaDesc;
    }

    // Try itemprop description
    const itempropDesc = $('[itemprop="description"]').first().text().trim();
    if (itempropDesc && itempropDesc.length > 20) {
      return itempropDesc;
    }

    return undefined;
  }

  /**
   * Convert string array to ParsedIngredient array
   */
  private convertToIngredients(ingredients: string[]): ParsedIngredient[] {
    return ingredients.map((text) => ({
      id: uuidv4(),
      original: text,
      quantity: null,
      unit: null,
      ingredient: text,
      parseConfidence: 0,
    }));
  }

  /**
   * Convert string array to Instruction array
   */
  private convertToInstructions(instructions: string[]): Instruction[] {
    return instructions.map((text, index) => ({
      step: index + 1,
      text: text.trim(),
      temperature: this.extractTemperature(text),
      time: this.extractTime(text),
    }));
  }

  /**
   * Extract temperature from text
   */
  private extractTemperature(
    text: string
  ): { value: number; unit: 'F' | 'C'; originalText: string } | undefined {
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
   * Extract time from text
   */
  private extractTime(
    text: string
  ): { value: number; unit: 'minutes' | 'hours'; originalText: string } | undefined {
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
}
