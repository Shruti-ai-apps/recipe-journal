/**
 * POST /api/recipes/scale-smart
 *
 * AI-powered recipe scaling using Gemini 2.5 Flash-Lite
 * Provides advisory metadata and practical tips for tricky ingredients (eggs, leavening, spices, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { smartScaleIngredients, isGeminiConfigured, SmartScaleRequest } from '@/lib/llm';
import { CacheService } from '@/lib/cache';
import { ErrorCode, SmartScaleRecipeResponse, Recipe } from '@/types';
import { createHash } from 'crypto';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';

const RATE_LIMIT = 10; // requests per minute per identifier
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_ENTRIES = 10000;

const SMART_SCALE_CACHE_TTL_MS = Number.parseInt(process.env.SMART_SCALE_CACHE_TTL_MS || '', 10) || 24 * 60 * 60 * 1000;
const SMART_SCALE_CACHE_MAX_ENTRIES = Number.parseInt(process.env.SMART_SCALE_CACHE_MAX_ENTRIES || '', 10) || 2000;

type RateLimitRecord = { count: number; resetAt: number; lastSeenAt: number };
const rateLimitMap = new Map<string, RateLimitRecord>();

const smartScaleCache = new CacheService(SMART_SCALE_CACHE_TTL_MS, true, SMART_SCALE_CACHE_MAX_ENTRIES);
const inFlightSmartScaleRequests = new Map<string, ReturnType<typeof smartScaleIngredients>>();

function cleanupRateLimitMap(now: number) {
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }

  while (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
    const oldestKey = rateLimitMap.keys().next().value as string | undefined;
    if (!oldestKey) break;
    rateLimitMap.delete(oldestKey);
  }
}

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();

  cleanupRateLimitMap(now);
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS, lastSeenAt: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  record.lastSeenAt = now;
  // Refresh insertion order so oldest eviction approximates LRU
  rateLimitMap.delete(identifier);
  rateLimitMap.set(identifier, record);
  return true;
}

function getClientIdentifier(request: NextRequest): string {
  // Prefer the platform-provided IP when available.
  const directIp = (request as unknown as { ip?: unknown }).ip;
  if (typeof directIp === 'string' && directIp.trim()) {
    return directIp.trim();
  }

  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
}

function getSmartScaleCacheKey(recipe: Recipe, multiplier: number): string {
  const keyPayload = {
    multiplier,
    originalServings: recipe.servings?.amount,
    ingredients: recipe.ingredients.map((ing) => ({
      original: ing.original,
      quantity: ing.quantity,
      unit: ing.unit,
      ingredient: ing.ingredient,
      preparation: ing.preparation,
      notes: ing.notes,
    })),
  };

  const digest = createHash('sha256').update(JSON.stringify(keyPayload)).digest('hex');
  return `smart-scale:v1:${digest}`;
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const cookieMutations: Array<{ name: string; value: string; options: CookieOptions }> = [];

    const applyCookieMutations = (response: NextResponse) => {
      for (const mutation of cookieMutations) {
        response.cookies.set({
          name: mutation.name,
          value: mutation.value,
          ...mutation.options,
        });
      }
      return response;
    };

    const json = (payload: SmartScaleRecipeResponse, init?: { status?: number }) => {
      const response = NextResponse.json<SmartScaleRecipeResponse>(payload, init);
      return applyCookieMutations(response);
    };

    // Require authentication to protect against public LLM spend.
    let userId: string | null = null;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieMutations.push({ name, value, options });
            },
            remove(name: string, options: CookieOptions) {
              cookieMutations.push({ name, value: '', options });
            },
          },
        }
      );

      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        userId = data.user?.id ?? null;
      }
    }

    if (!userId) {
      return json(
        {
          success: false,
          error: {
            // Reuse a generic code to avoid expanding the public error surface area.
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Please sign in to use Smart Scale.',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
            aiPowered: false,
            cached: false,
          },
        },
        { status: 401 }
      );
    }

    // Rate limiting
    const clientId = userId || getClientIdentifier(request);
    if (!checkRateLimit(clientId)) {
      return json(
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

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid JSON body',
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
    const { recipe, multiplier, recipeId } = body as {
      recipe: Recipe;
      multiplier: number;
      recipeId?: string;
    };

    // Validate recipe
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      return json(
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
    if (typeof multiplier !== 'number' || multiplier < 0.1 || multiplier > 10) {
      return json(
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

    const cacheKey = getSmartScaleCacheKey(recipe, multiplier);
    const cachedResult = smartScaleCache.get<Awaited<ReturnType<typeof smartScaleIngredients>>>(cacheKey);
    if (cachedResult) {
      return json(
        {
          success: true,
          data: {
            ingredients: cachedResult.ingredients,
            tips: cachedResult.tips,
            cookingTimeAdjustment: cachedResult.cookingTimeAdjustment,
            success: cachedResult.success,
            error: cachedResult.error,
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
            aiPowered: cachedResult.success,
            cached: true,
          },
        },
        { status: 200 }
      );
    }

    // Check if Gemini is configured (only required on a cache miss)
    if (!isGeminiConfigured()) {
      return json(
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

    // Perform smart scaling (coalesce identical concurrent requests)
    let inFlight = inFlightSmartScaleRequests.get(cacheKey);
    if (!inFlight) {
      inFlight = smartScaleIngredients(scaleRequest, recipeId).finally(() => {
        inFlightSmartScaleRequests.delete(cacheKey);
      });
      inFlightSmartScaleRequests.set(cacheKey, inFlight);
    }

    const result = await inFlight;

    smartScaleCache.set(cacheKey, result);

    return json(
      {
        success: true,
        data: {
          ingredients: result.ingredients,
          tips: result.tips,
          cookingTimeAdjustment: result.cookingTimeAdjustment,
          success: result.success,
          error: result.error,
        },
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
          aiPowered: result.success,
          cached: false,
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
