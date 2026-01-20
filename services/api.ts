/**
 * API service for communicating with the backend
 */

import {
  Recipe,
  ScaledRecipe,
  ScalingOptions,
  ApiError,
  SmartScaleData,
  ErrorCode,
} from '@/types';

const API_BASE_URL = '/api';

/**
 * Custom error class for API errors
 */
export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.details = error.details;
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (error) {
    throw new ApiRequestError({
      code: ErrorCode.NETWORK_ERROR,
      message: error instanceof Error ? error.message : 'Network error',
    });
  }

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text().catch(() => '');

  let parsed: any = null;
  if (rawText && (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }

  const data = parsed as { success?: boolean; data?: T; error?: ApiError } | null;

  if (!response.ok) {
    throw new ApiRequestError(
      data?.error || {
        code: ErrorCode.INTERNAL_ERROR,
        message: `Request failed (HTTP ${response.status})`,
        details: rawText ? { status: response.status, bodyPreview: rawText.slice(0, 500) } : { status: response.status },
      }
    );
  }

  if (!data || data.success !== true) {
    throw new ApiRequestError(
      data?.error || {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        details: rawText ? { bodyPreview: rawText.slice(0, 500) } : undefined,
      }
    );
  }

  return data.data as T;
}

/**
 * Parse a recipe from a URL
 */
export async function parseRecipe(url: string): Promise<Recipe> {
  return apiFetch<Recipe>('/recipes/parse', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

/**
 * Scale a parsed recipe
 */
export async function scaleRecipe(
  recipe: Recipe,
  options: ScalingOptions
): Promise<ScaledRecipe> {
  return apiFetch<ScaledRecipe>('/recipes/scale', {
    method: 'POST',
    body: JSON.stringify({ recipe, options }),
  });
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/health');
}

/**
 * Smart scale a recipe using AI
 *
 * Uses Gemini 2.5 Flash-Lite to intelligently scale ingredients,
 * handling special cases like eggs, leavening, and spices.
 */
export async function smartScaleRecipe(
  recipe: Recipe,
  multiplier: number,
  recipeId?: string,
  signal?: AbortSignal
): Promise<SmartScaleData> {
  return apiFetch<SmartScaleData>('/recipes/scale-smart', {
    method: 'POST',
    body: JSON.stringify({ recipe, multiplier, recipeId }),
    signal,
  });
}
