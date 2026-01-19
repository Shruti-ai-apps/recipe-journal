/**
 * Smart Scaling with Gemini AI
 *
 * Uses Google's Gemini 2.5 Flash-Lite model to intelligently scale recipe
 * ingredients, handling special cases like eggs, leavening, and spices.
 */

import logger from '@/lib/utils/logger';
import { scalingService } from '@/lib/scaling';
import type { SmartScaleData, SmartScaledIngredient } from '@/types';
import { getGeminiClient, GEMINI_MODEL, DEFAULT_GENERATION_CONFIG } from './client';
import { buildScalingPrompt, SYSTEM_INSTRUCTION } from './prompts';
import {
  SmartScaleRequest,
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
): Promise<SmartScaleData> {
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

      const deterministic = scalingService.scaleIngredientForDisplay(ing, multiplier);

      // Always keep multiplier-correct scaling. AI output is treated as advisory metadata only.
      if (aiResult) {
        return {
          ...deterministic,
          aiAdjusted: aiResult.aiAdjusted,
          adjustmentReason: aiResult.adjustmentReason,
          category: aiResult.category || 'linear',
        };
      }

      return {
        ...deterministic,
        aiAdjusted: false,
        adjustmentReason: undefined,
        category: 'linear',
      };
    });

    const result: SmartScaleData = {
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
      ingredients: ingredients.map((ing) => ({
        ...scalingService.scaleIngredientForDisplay(ing, multiplier),
        aiAdjusted: false,
        adjustmentReason: undefined,
        category: 'linear',
      })),
      tips: getBasicTips(multiplier),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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

export type { SmartScaleRequest };

