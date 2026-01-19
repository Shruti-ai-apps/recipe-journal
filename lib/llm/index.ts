/**
 * LLM Module Exports
 *
 * Smart scaling functionality powered by Google Gemini 2.5 Flash-Lite
 */

// Main scaling function
export { smartScaleIngredients } from './smartScale';

// Client utilities
export { getGeminiClient, isGeminiConfigured, GEMINI_MODEL } from './client';

// Types
export type {
  SmartScaleRequest,
  CachedScaleResult,
  GeminiScaleResponse,
} from './types';

// Cache utilities
export {
  getCachedResult,
  setCachedResult,
  clearCache as clearSmartScaleCache,
  clearOldCacheEntries,
  getCacheStats,
} from './cache';
