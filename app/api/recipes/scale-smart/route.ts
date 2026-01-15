/**
 * POST /api/recipes/scale-smart
 *
 * AI-powered recipe scaling using Gemini 2.5 Flash-Lite
 * Intelligently handles eggs, leavening, spices, and other special ingredients
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { smartScaleIngredients, isGeminiConfigured, SmartScaleRequest } from '@/lib/llm';
import { ErrorCode, SmartScaleRecipeResponse, SmartScaledIngredient, Recipe } from '@/types';

/**
 * Simple in-memory rate limiting
 * In production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIdentifier(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    if (!checkRateLimit(clientId)) {
      return NextResponse.json<SmartScaleRecipeResponse>(
        {
          success: false,
          error: {
            code: ErrorCode.RATE_LIMITED,
            message: 'Too many requests. Please try again in a minute.',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
            aiPowered: false,
            cached: false,
          },
        },
        { status: 429 }
      );
    }

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      return NextResponse.json<SmartScaleRecipeResponse>(
        {
          success: false,
          error: {
            code: ErrorCode.AI_CONFIG_ERROR,
            message: 'AI scaling is not configured. Please set GEMINI_API_KEY.',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
            aiPowered: false,
            cached: false,
          },
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { recipe, multiplier, recipeId } = body as {
      recipe: Recipe;
      multiplier: number;
      recipeId?: string;
    };

    // Validate recipe
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      return NextResponse.json<SmartScaleRecipeResponse>(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Recipe with ingredients is required',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
            aiPowered: false,
            cached: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate multiplier
    if (!multiplier || multiplier <= 0 || multiplier > 10) {
      return NextResponse.json<SmartScaleRecipeResponse>(
        {
          success: false,
          error: {
            code: ErrorCode.INVALID_MULTIPLIER,
            message: 'Multiplier must be between 0.1 and 10',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
            aiPowered: false,
            cached: false,
          },
        },
        { status: 400 }
      );
    }

    // Build smart scale request
    const scaleRequest: SmartScaleRequest = {
      ingredients: recipe.ingredients,
      multiplier,
      originalServings: recipe.servings?.amount,
    };

    // Perform smart scaling
    const result = await smartScaleIngredients(scaleRequest, recipeId);

    return NextResponse.json<SmartScaleRecipeResponse>(
      {
        success: true,
        data: {
          ingredients: result.ingredients as unknown as SmartScaledIngredient[],
          tips: result.tips,
          cookingTimeAdjustment: result.cookingTimeAdjustment,
          success: result.success,
          error: result.error,
        },
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
          aiPowered: result.success,
          cached: false, // TODO: Track cache hits from smartScaleIngredients
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[SmartScale API] Error:', error);

    return NextResponse.json<SmartScaleRecipeResponse>(
      {
        success: false,
        error: {
          code: ErrorCode.AI_SCALING_FAILED,
          message: 'Failed to process smart scaling request',
          details: {
            reason: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
          aiPowered: false,
          cached: false,
        },
      },
      { status: 500 }
    );
  }
}
