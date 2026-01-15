/**
 * Ingredient parsing service
 *
 * Parses raw ingredient strings into structured data including
 * quantity, unit, ingredient name, and preparation instructions.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ParsedIngredient,
  IngredientQuantity,
} from '@/types';
import {
  UNIT_ABBREVIATION_MAP,
  UNICODE_FRACTIONS,
  TEXT_FRACTIONS,
} from '@/constants';
import { logger } from '@/lib/utils';

// Regex patterns for parsing
// Includes decimal point (.) to handle quantities like "0.5 cup"
const QUANTITY_PATTERN =
  /^([\d.½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+(?:\s*[-–to]\s*[\d.½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)?(?:\s+[\d./]+)?)/i;

const PREPARATION_WORDS = [
  'chopped',
  'diced',
  'minced',
  'sliced',
  'crushed',
  'grated',
  'shredded',
  'julienned',
  'cubed',
  'melted',
  'softened',
  'sifted',
  'beaten',
  'peeled',
  'seeded',
  'cored',
  'halved',
  'quartered',
  'trimmed',
  'rinsed',
  'drained',
  'packed',
  'loosely packed',
  'firmly packed',
  'room temperature',
  'cold',
  'warm',
  'hot',
  'frozen',
  'thawed',
  'fresh',
  'dried',
  'ground',
  'whole',
  'cooked',
  'raw',
  'uncooked',
];

const NOTE_WORDS = [
  'optional',
  'divided',
  'or more',
  'or less',
  'to taste',
  'as needed',
  'for garnish',
  'for serving',
  'plus more',
  'approximately',
  'about',
];

export class IngredientParser {
  /**
   * Parse an array of ingredient strings
   */
  async parseIngredients(ingredients: string[]): Promise<ParsedIngredient[]> {
    return ingredients.map((ingredient) => this.parseIngredient(ingredient));
  }

  /**
   * Parse a single ingredient string
   */
  parseIngredient(text: string): ParsedIngredient {
    const original = text.trim();
    const id = uuidv4();

    // Handle empty or very short strings
    if (!original || original.length < 2) {
      return this.createUnparsedIngredient(id, original);
    }

    try {
      // Extract notes (text in parentheses)
      const { cleanText, notes } = this.extractNotes(original);

      // Extract quantity
      const { quantity, remaining: afterQuantity } = this.extractQuantity(cleanText);

      // Extract unit
      const { unit, remaining: afterUnit } = this.extractUnit(afterQuantity);

      // Extract preparation instructions
      const { preparation, remaining: ingredientName } = this.extractPreparation(afterUnit);

      // Clean up ingredient name
      const ingredient = this.cleanIngredientName(ingredientName);

      // Calculate confidence score
      const parseConfidence = this.calculateConfidence(quantity, unit, ingredient);

      return {
        id,
        original,
        quantity,
        unit,
        ingredient,
        preparation,
        notes,
        parseConfidence,
      };
    } catch (error) {
      logger.debug('Failed to parse ingredient', { original, error: error instanceof Error ? error.message : 'Unknown' });
      return this.createUnparsedIngredient(id, original);
    }
  }

  /**
   * Extract notes from parentheses or after comma
   */
  private extractNotes(text: string): { cleanText: string; notes?: string } {
    let notes: string | undefined;
    let cleanText = text;

    // Extract text in parentheses
    const parenMatch = text.match(/\(([^)]+)\)/);
    if (parenMatch) {
      notes = parenMatch[1].trim();
      cleanText = text.replace(parenMatch[0], '').trim();
    }

    // Check for note words at the end
    for (const noteWord of NOTE_WORDS) {
      const noteRegex = new RegExp(`,?\\s*${noteWord}\\s*$`, 'i');
      if (noteRegex.test(cleanText)) {
        const match = cleanText.match(noteRegex);
        if (match) {
          notes = notes ? `${notes}, ${match[0].replace(/^,?\s*/, '')}` : match[0].replace(/^,?\s*/, '');
          cleanText = cleanText.replace(noteRegex, '').trim();
        }
      }
    }

    return { cleanText, notes };
  }

  /**
   * Extract quantity from the beginning of the string
   */
  private extractQuantity(
    text: string
  ): { quantity: IngredientQuantity | null; remaining: string } {
    const trimmed = text.trim();

    // Try to match quantity pattern
    const match = trimmed.match(QUANTITY_PATTERN);
    if (!match) {
      return { quantity: null, remaining: trimmed };
    }

    const quantityStr = match[1].trim();
    const remaining = trimmed.substring(match[0].length).trim();

    // Check for range (includes decimal point for quantities like "0.5-1")
    const rangeMatch = quantityStr.match(/([\d.½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\s/]+)\s*[-–to]+\s*([\d.½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\s/]+)/i);

    if (rangeMatch) {
      const valueFrom = this.parseQuantityValue(rangeMatch[1]);
      const valueTo = this.parseQuantityValue(rangeMatch[2]);

      if (valueFrom !== null && valueTo !== null) {
        return {
          quantity: {
            type: 'range',
            value: valueFrom,
            valueTo,
            displayValue: quantityStr,
          },
          remaining,
        };
      }
    }

    // Single value
    const value = this.parseQuantityValue(quantityStr);
    if (value !== null) {
      return {
        quantity: {
          type: 'single',
          value,
          displayValue: quantityStr,
        },
        remaining,
      };
    }

    return { quantity: null, remaining: trimmed };
  }

  /**
   * Parse a quantity string to a number
   */
  private parseQuantityValue(str: string): number | null {
    const cleaned = str.trim();
    if (!cleaned) return null;

    // Check for unicode fractions
    for (const [unicode, value] of Object.entries(UNICODE_FRACTIONS)) {
      if (cleaned.includes(unicode)) {
        const parts = cleaned.split(unicode);
        const whole = parts[0] ? parseInt(parts[0], 10) || 0 : 0;
        return whole + value;
      }
    }

    // Check for mixed numbers (e.g., "2 1/2")
    const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10);
      const num = parseInt(mixedMatch[2], 10);
      const denom = parseInt(mixedMatch[3], 10);
      if (denom !== 0) {
        return whole + num / denom;
      }
    }

    // Check for simple fractions (e.g., "1/2")
    const fractionMatch = cleaned.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      const num = parseInt(fractionMatch[1], 10);
      const denom = parseInt(fractionMatch[2], 10);
      if (denom !== 0) {
        return num / denom;
      }
    }

    // Check for text fractions
    if (TEXT_FRACTIONS[cleaned]) {
      return TEXT_FRACTIONS[cleaned];
    }

    // Try to parse as number
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Extract unit from the beginning of the remaining string
   */
  private extractUnit(text: string): { unit: string | null; remaining: string } {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/);

    if (words.length === 0) {
      return { unit: null, remaining: trimmed };
    }

    // Check first word (and potentially second for compound units like "fl oz")
    const firstWord = words[0].toLowerCase().replace(/[.,]$/, '');
    const firstTwoWords = words.length > 1
      ? `${firstWord} ${words[1].toLowerCase().replace(/[.,]$/, '')}`
      : '';

    // Check two-word unit first
    if (firstTwoWords && UNIT_ABBREVIATION_MAP.has(firstTwoWords)) {
      const unitName = UNIT_ABBREVIATION_MAP.get(firstTwoWords)!;
      return {
        unit: unitName,
        remaining: words.slice(2).join(' ').trim(),
      };
    }

    // Check single word unit
    if (UNIT_ABBREVIATION_MAP.has(firstWord)) {
      const unitName = UNIT_ABBREVIATION_MAP.get(firstWord)!;
      return {
        unit: unitName,
        remaining: words.slice(1).join(' ').trim(),
      };
    }

    return { unit: null, remaining: trimmed };
  }

  /**
   * Extract preparation instructions
   */
  private extractPreparation(text: string): { preparation?: string; remaining: string } {
    const trimmed = text.trim();
    const preparations: string[] = [];
    let remaining = trimmed;

    // Check for comma-separated preparation at the end
    const commaMatch = remaining.match(/,\s*([^,]+)$/);
    if (commaMatch) {
      const possiblePrep = commaMatch[1].toLowerCase().trim();
      for (const prepWord of PREPARATION_WORDS) {
        if (possiblePrep.includes(prepWord)) {
          preparations.push(commaMatch[1].trim());
          remaining = remaining.replace(commaMatch[0], '').trim();
          break;
        }
      }
    }

    // Check for preparation words at the beginning
    for (const prepWord of PREPARATION_WORDS) {
      const regex = new RegExp(`^${prepWord}\\s+`, 'i');
      if (regex.test(remaining)) {
        preparations.unshift(prepWord);
        remaining = remaining.replace(regex, '').trim();
        break;
      }
    }

    return {
      preparation: preparations.length > 0 ? preparations.join(', ') : undefined,
      remaining,
    };
  }

  /**
   * Clean up the ingredient name
   */
  private cleanIngredientName(text: string): string {
    return text
      .trim()
      .replace(/^of\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate confidence score based on what was parsed
   */
  private calculateConfidence(
    quantity: IngredientQuantity | null,
    unit: string | null,
    ingredient: string
  ): number {
    let confidence = 0.5; // Base confidence

    if (quantity) confidence += 0.25;
    if (unit) confidence += 0.15;
    if (ingredient && ingredient.length > 2) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  /**
   * Create an unparsed ingredient entry
   */
  private createUnparsedIngredient(id: string, original: string): ParsedIngredient {
    return {
      id,
      original,
      quantity: null,
      unit: null,
      ingredient: original,
      parseConfidence: 0,
      parseError: 'Could not parse ingredient',
    };
  }
}

// Export singleton instance
export const ingredientParser = new IngredientParser();
