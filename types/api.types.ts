/**
 * API request and response type definitions
 */

import { Recipe } from './recipe.types';
import { ScaledRecipe, ScalingOptions } from './scaling.types';

/**
 * Request to parse a recipe from a URL
 */
export interface ParseRecipeRequest {
  /** URL of the recipe page to parse */
  url: string;
}

/**
 * Request to scale a recipe
 */
export interface ScaleRecipeRequest {
  /** The parsed recipe to scale */
  recipe: Recipe;
  /** Scaling options */
  options: ScalingOptions;
}

/**
 * API error codes
 */
export enum ErrorCode {
  // Scraping errors
  INVALID_URL = 'INVALID_URL',
  SCRAPE_FAILED = 'SCRAPE_FAILED',
  UNSUPPORTED_SITE = 'UNSUPPORTED_SITE',
  RECIPE_NOT_FOUND = 'RECIPE_NOT_FOUND',
  BLOCKED_BY_SITE = 'BLOCKED_BY_SITE',

  // Parsing errors
  PARSE_FAILED = 'PARSE_FAILED',
  NO_INGREDIENTS_FOUND = 'NO_INGREDIENTS_FOUND',

  // Scaling errors
  INVALID_MULTIPLIER = 'INVALID_MULTIPLIER',

  // General errors
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * API error structure
 */
export interface ApiError {
  /** Error code for programmatic handling */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  /** Unique request identifier */
  requestId: string;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Whether the response was from cache */
  cacheHit?: boolean;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (present on success) */
  data?: T;
  /** Error information (present on failure) */
  error?: ApiError;
  /** Response metadata */
  meta?: ResponseMeta;
}

/**
 * Response for parse recipe endpoint
 */
export type ParseRecipeResponse = ApiResponse<Recipe>;

/**
 * Response for scale recipe endpoint
 */
export type ScaleRecipeResponse = ApiResponse<ScaledRecipe>;

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
}
