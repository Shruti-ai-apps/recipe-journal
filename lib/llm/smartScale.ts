/**
 * Smart Scaling with Gemini AI
 *
 * Uses Google's Gemini 2.5 Flash-Lite model to intelligently scale recipe
 * ingredients, handling special cases like eggs, leavening, and spices.
 */

import { ParsedIngredient } from '@/types';
import logger from '@/lib/utils/logger';
import { getGeminiClient, GEMINI_MODEL, DEFAULT_GENERATION_CONFIG } from './client';
import { buildScalingPrompt, SYSTEM_INSTRUCTION } from './prompts';
import {
  SmartScaleRequest,
  SmartScaleResponse,
  SmartScaledIngredient,
  GeminiScaleResponse,
} from './types';
import { getCachedResult, setCachedResult } from './cache';

/**
 * Scale ingredients using AI intelligence
 *
 * @param request - The scaling request with ingredients and multiplier
 * @param recipeId - Optional recipe ID for caching
 * @returns Smart scaled ingredients with tips
 */
export async function smartScaleIngredients(
  request: SmartScaleRequest,
  recipeId?: string
): Promise<SmartScaleResponse> {
  const { ingredients, multiplier, originalServings } = request;

  // Check cache first (only if recipeId provided)
  if (recipeId) {
    const cached = getCachedResult(recipeId, multiplier);
    if (cached) {
      logger.debug(`[SmartScale] Cache hit for ${recipeId}_${multiplier}`);
      return cached;
    }
  }

  try {
    const client = getGeminiClient();
    const prompt = buildScalingPrompt(ingredients, multiplier, originalServings);

    logger.debug(`[SmartScale] Calling Gemini ${GEMINI_MODEL} for ${ingredients.length} ingredients`);

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        ...DEFAULT_GENERATION_CONFIG,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    // Clean response - remove any markdown code blocks if present
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON response
    let parsed: GeminiScaleResponse;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (parseError) {
      logger.error('[SmartScale] Failed to parse Gemini response', { response: cleanedResponse });
      throw new Error('Invalid JSON response from Gemini');
    }

    // Map AI response to our types
    const scaledIngredients: SmartScaledIngredient[] = ingredients.map((ing, index) => {
      const aiResult = parsed.ingredients?.find((r) => r.index === index);

      if (aiResult) {
        return {
          ...ing,
          scaledQuantity: {
            value: aiResult.scaledQuantity,
            displayValue: formatQuantity(aiResult.scaledQuantity),
            wasRounded: aiResult.aiAdjusted,
            originalValue: ing.quantity?.value || 0,
          },
          scaledUnit: aiResult.scaledUnit || ing.unit,
          displayText: aiResult.displayText,
          aiAdjusted: aiResult.aiAdjusted,
          adjustmentReason: aiResult.adjustmentReason,
          category: aiResult.category || 'linear',
        };
      }

      // Fallback to linear scaling if AI didn't return this ingredient
      return linearFallback(ing, multiplier);
    });

    const result: SmartScaleResponse = {
      ingredients: scaledIngredients,
      tips: parsed.tips || [],
      cookingTimeAdjustment: parsed.cookingTimeAdjustment,
      success: true,
    };

    // Cache the successful result
    if (recipeId) {
      setCachedResult(recipeId, multiplier, result);
    }

    logger.debug(`[SmartScale] Successfully scaled ${ingredients.length} ingredients`);
    return result;
  } catch (error) {
    logger.error('[SmartScale] AI scaling failed', { error: error instanceof Error ? error.message : String(error) });

    // Return fallback with linear scaling
    return {
      ingredients: ingredients.map((ing) => linearFallback(ing, multiplier)),
      tips: getBasicTips(multiplier),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Linear scaling fallback when AI is unavailable
 */
function linearFallback(
  ingredient: ParsedIngredient,
  multiplier: number
): SmartScaledIngredient {
  const originalValue = ingredient.quantity?.value || 0;
  const scaledValue = originalValue * multiplier;

  // Detect discrete items for basic rounding
  const isDiscrete = /\b(eggs?|lemons?|limes?|avocados?|bananas?)\b/i.test(
    ingredient.ingredient
  );
  const finalValue = isDiscrete ? Math.round(scaledValue) : scaledValue;

  const displayText = buildDisplayText(
    finalValue,
    ingredient.unit,
    ingredient.ingredient,
    ingredient.preparation
  );

  return {
    ...ingredient,
    scaledQuantity: {
      value: finalValue,
      displayValue: formatQuantity(finalValue),
      wasRounded: isDiscrete && finalValue !== scaledValue,
      originalValue,
    },
    scaledUnit: ingredient.unit,
    displayText,
    aiAdjusted: false,
    category: isDiscrete ? 'discrete' : 'linear',
  };
}

/**
 * Format a numeric quantity for display
 */
function formatQuantity(value: number): string {
  if (value === 0) return '0';
  if (value === Math.floor(value)) return String(value);

  // Common fractions
  const fractions: [number, string][] = [
    [0.125, '1/8'],
    [0.25, '1/4'],
    [0.333, '1/3'],
    [0.375, '3/8'],
    [0.5, '1/2'],
    [0.625, '5/8'],
    [0.666, '2/3'],
    [0.75, '3/4'],
    [0.875, '7/8'],
  ];

  const whole = Math.floor(value);
  const decimal = value - whole;

  for (const [frac, display] of fractions) {
    if (Math.abs(decimal - frac) < 0.05) {
      return whole > 0 ? `${whole} ${display}` : display;
    }
  }

  // No close fraction match, use decimal
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Build display text for an ingredient
 */
function buildDisplayText(
  quantity: number,
  unit: string | null,
  ingredient: string,
  preparation?: string
): string {
  const parts: string[] = [];

  if (quantity > 0) {
    parts.push(formatQuantity(quantity));
  }

  if (unit) {
    parts.push(unit);
  }

  parts.push(ingredient);

  if (preparation) {
    parts.push(`, ${preparation}`);
  }

  return parts.join(' ').replace(' ,', ',');
}

/**
 * Get basic scaling tips when AI is not available
 */
function getBasicTips(multiplier: number): string[] {
  if (multiplier < 1) {
    return [
      'When reducing recipes, check doneness earlier than the original time suggests.',
      'Use a smaller pan for best results.',
    ];
  }

  if (multiplier >= 3) {
    return [
      'For large batches, consider baking in multiple pans for even cooking.',
      'Seasonings may need adjustment - start with less and taste as you go.',
      'Cooking times may vary significantly - use a thermometer for accuracy.',
    ];
  }

  if (multiplier === 2) {
    return [
      'Doubled recipes may need 10-15% more cooking time.',
      'You may need a larger pan or multiple pans.',
    ];
  }

  return [];
}

export type { SmartScaleRequest, SmartScaleResponse };
