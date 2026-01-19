/**
 * API service for communicating with the backend
 */

import {
  Recipe,
  ScaledRecipe,
  ScalingOptions,
  ApiError,
  SmartScaleData,
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

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiRequestError(
      data.error || {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      }
    );
  }

  return data.data;
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
