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

const SMART_SCALE_LLM_TIMEOUT_MS =
  Number.parseInt(process.env.SMART_SCALE_LLM_TIMEOUT_MS || '', 10) || 15_000;
const SMART_SCALE_LLM_MAX_RETRIES =
  Number.parseInt(process.env.SMART_SCALE_LLM_MAX_RETRIES || '', 10) || 1;

const SMART_SCALE_ALLOWED_CATEGORIES = new Set<SmartScaledIngredient['category']>([
  'linear',
  'discrete',
  'leavening',
  'seasoning',
  'fat',
  'liquid',
]);

function preview(text: string, maxLen: number = 500): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const maybeStatus = (error as { status?: unknown }).status;
    if (typeof maybeStatus === 'number' && [408, 429, 500, 502, 503, 504].includes(maybeStatus)) {
      return true;
    }
    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === 'string' && ['ETIMEDOUT', 'ECONNRESET'].includes(maybeCode)) {
      return true;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  return /rate\s*limit|resource_exhausted|timeout|temporar|429/.test(message.toLowerCase());
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (timeoutMs <= 0) return promise;

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('LLM request timed out')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function generateContentWithRetry(
  client: ReturnType<typeof getGeminiClient>,
  params: Parameters<typeof client.models.generateContent>[0]
) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await withTimeout(client.models.generateContent(params), SMART_SCALE_LLM_TIMEOUT_MS);
    } catch (error) {
      attempt += 1;
      if (attempt > SMART_SCALE_LLM_MAX_RETRIES || !isRetryableError(error)) {
        throw error;
      }
      const backoffMs = 200 * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

function normalizeGeminiScaleResponse(
  parsed: unknown,
  ingredientCount: number
): Pick<GeminiScaleResponse, 'ingredients' | 'tips' | 'cookingTimeAdjustment'> {
  const safe: Pick<GeminiScaleResponse, 'ingredients' | 'tips' | 'cookingTimeAdjustment'> = {
    ingredients: [],
    tips: [],
    cookingTimeAdjustment: undefined,
  };

  if (!parsed || typeof parsed !== 'object') return safe;
  const obj = parsed as Record<string, unknown>;

  const ingredients = obj.ingredients;
  if (Array.isArray(ingredients)) {
    for (const item of ingredients) {
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;

      const index = it.index;
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= ingredientCount) {
        continue;
      }

      const aiAdjusted = it.aiAdjusted === true;
      const categoryRaw = it.category;
      const category =
        typeof categoryRaw === 'string' && SMART_SCALE_ALLOWED_CATEGORIES.has(categoryRaw as SmartScaledIngredient['category'])
          ? (categoryRaw as SmartScaledIngredient['category'])
          : ('linear' as const);

      const adjustmentReasonRaw = it.adjustmentReason;
      const adjustmentReason =
        aiAdjusted && typeof adjustmentReasonRaw === 'string' && adjustmentReasonRaw.trim().length > 0
          ? adjustmentReasonRaw.trim().slice(0, 200)
          : undefined;

      safe.ingredients.push({
        index,
        aiAdjusted,
        adjustmentReason,
        category,
      });
    }
  }

  const tips = obj.tips;
  if (Array.isArray(tips)) {
    safe.tips = tips
      .filter((t) => typeof t === 'string')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((t) => t.slice(0, 200));
  }

  const cookingTimeAdjustment = obj.cookingTimeAdjustment;
  if (typeof cookingTimeAdjustment === 'string') {
    const trimmed = cookingTimeAdjustment.trim();
    if (trimmed) {
      safe.cookingTimeAdjustment = trimmed.slice(0, 200);
    }
  }

  return safe;
}

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

    const response = await generateContentWithRetry(client, {
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
      parsed = normalizeGeminiScaleResponse(JSON.parse(cleanedResponse), ingredients.length);
    } catch (parseError) {
      logger.error('[SmartScale] Failed to parse Gemini response', {
        responsePreview: preview(cleanedResponse),
        responseLength: cleanedResponse.length,
      });
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

