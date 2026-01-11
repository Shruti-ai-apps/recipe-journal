import { parseRecipe, scaleRecipe, checkHealth, ApiRequestError } from './api';
import { Recipe, ScalingOptions } from '@/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    servings: { amount: 4, unit: 'servings', originalText: '4 servings' },
    ingredients: [],
    instructions: [],
    source: {
      url: 'https://example.com/recipe',
      domain: 'example.com',
      scrapedAt: new Date(),
      scrapeMethod: 'schema-org',
    },
  };

  describe('ApiRequestError', () => {
    it('creates error with code and message', () => {
      const error = new ApiRequestError({
        code: 'INVALID_URL',
        message: 'Invalid URL provided',
      });

      expect(error.name).toBe('ApiRequestError');
      expect(error.code).toBe('INVALID_URL');
      expect(error.message).toBe('Invalid URL provided');
    });

    it('includes details when provided', () => {
      const error = new ApiRequestError({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { field: 'url' },
      });

      expect(error.details).toEqual({ field: 'url' });
    });
  });

  describe('parseRecipe', () => {
    it('sends POST request with URL and returns recipe', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecipe }),
      });

      const result = await parseRecipe('https://example.com/recipe');

      expect(mockFetch).toHaveBeenCalledWith('/api/recipes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/recipe' }),
      });
      expect(result.title).toBe('Test Recipe');
    });

    it('throws ApiRequestError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'INVALID_URL', message: 'Invalid URL' },
        }),
      });

      await expect(parseRecipe('invalid-url')).rejects.toThrow(ApiRequestError);
    });

    it('throws ApiRequestError with default error for unknown errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false }),
      });

      try {
        await parseRecipe('https://example.com');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).code).toBe('UNKNOWN_ERROR');
      }
    });
  });

  describe('scaleRecipe', () => {
    const scalingOptions: ScalingOptions = {
      multiplier: 2,
      roundingPrecision: 'friendly',
    };

    it('sends POST request with recipe and options', async () => {
      const scaledRecipe = {
        ...mockRecipe,
        scaling: { multiplier: 2 },
        scaledIngredients: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: scaledRecipe }),
      });

      const result = await scaleRecipe(mockRecipe, scalingOptions);

      expect(mockFetch).toHaveBeenCalledWith('/api/recipes/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: mockRecipe, options: scalingOptions }),
      });
      expect(result.scaling.multiplier).toBe(2);
    });

    it('throws ApiRequestError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'INVALID_MULTIPLIER', message: 'Invalid multiplier' },
        }),
      });

      await expect(scaleRecipe(mockRecipe, { multiplier: -1 })).rejects.toThrow(
        ApiRequestError
      );
    });
  });

  describe('checkHealth', () => {
    it('returns health status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { status: 'healthy' } }),
      });

      const result = await checkHealth();

      expect(mockFetch).toHaveBeenCalledWith('/api/health', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result.status).toBe('healthy');
    });

    it('throws ApiRequestError when unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Service unavailable' },
        }),
      });

      await expect(checkHealth()).rejects.toThrow(ApiRequestError);
    });
  });
});
