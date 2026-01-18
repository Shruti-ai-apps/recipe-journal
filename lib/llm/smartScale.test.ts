/**
 * Smart Scale Tests
 */

import { smartScaleIngredients } from './smartScale';
import { ParsedIngredient } from '@/types';
import * as client from './client';
import * as cache from './cache';

// Mock the Gemini client
jest.mock('./client', () => ({
  getGeminiClient: jest.fn(),
  isGeminiConfigured: jest.fn(() => true),
  GEMINI_MODEL: 'gemini-2.5-flash-lite',
  DEFAULT_GENERATION_CONFIG: {
    temperature: 0.3,
    maxOutputTokens: 2048,
  },
}));

// Mock the cache
jest.mock('./cache', () => ({
  getCachedResult: jest.fn(() => null),
  setCachedResult: jest.fn(),
}));

describe('smartScaleIngredients', () => {
  const mockIngredients: ParsedIngredient[] = [
    {
      id: '1',
      original: '2 large eggs',
      quantity: { type: 'single', value: 2, displayValue: '2' },
      unit: null,
      ingredient: 'eggs',
      preparation: 'large',
      parseConfidence: 0.95,
    },
    {
      id: '2',
      original: '1 cup flour',
      quantity: { type: 'single', value: 1, displayValue: '1' },
      unit: 'cup',
      ingredient: 'flour',
      parseConfidence: 0.95,
    },
    {
      id: '3',
      original: '1 tsp baking powder',
      quantity: { type: 'single', value: 1, displayValue: '1' },
      unit: 'tsp',
      ingredient: 'baking powder',
      parseConfidence: 0.95,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when AI succeeds', () => {
    beforeEach(() => {
      const mockGeminiResponse = {
        text: JSON.stringify({
          ingredients: [
            {
              index: 0,
              originalText: '2 large eggs',
              scaledQuantity: 4,
              scaledUnit: '',
              displayText: '4 large eggs',
              aiAdjusted: true,
              adjustmentReason: 'Rounded to whole eggs',
              category: 'discrete',
            },
            {
              index: 1,
              originalText: '1 cup flour',
              scaledQuantity: 2,
              scaledUnit: 'cup',
              displayText: '2 cups flour',
              aiAdjusted: false,
              category: 'linear',
            },
            {
              index: 2,
              originalText: '1 tsp baking powder',
              scaledQuantity: 1.5,
              scaledUnit: 'tsp',
              displayText: '1 1/2 tsp baking powder',
              aiAdjusted: true,
              adjustmentReason: 'Scaled at 75% for large batch',
              category: 'leavening',
            },
          ],
          tips: ['Beat eggs together before adding'],
          cookingTimeAdjustment: 'Increase by 10 minutes',
        }),
      };

      (client.getGeminiClient as jest.Mock).mockReturnValue({
        models: {
          generateContent: jest.fn().mockResolvedValue(mockGeminiResponse),
        },
      });
    });

    it('returns AI-scaled ingredients', async () => {
      const result = await smartScaleIngredients({
        ingredients: mockIngredients,
        multiplier: 2,
      });

      expect(result.success).toBe(true);
      expect(result.ingredients).toHaveLength(3);
    });

    it('marks eggs as AI-adjusted with discrete category', async () => {
      const result = await smartScaleIngredients({
        ingredients: mockIngredients,
        multiplier: 2,
      });

      const eggs = result.ingredients[0];
      expect(eggs.aiAdjusted).toBe(true);
      expect(eggs.category).toBe('discrete');
      expect(eggs.adjustmentReason).toContain('eggs');
    });

    it('includes cooking tips', async () => {
      const result = await smartScaleIngredients({
        ingredients: mockIngredients,
        multiplier: 2,
      });

      expect(result.tips.length).toBeGreaterThan(0);
    });

    it('includes cooking time adjustment', async () => {
      const result = await smartScaleIngredients({
        ingredients: mockIngredients,
        multiplier: 2,
      });

      expect(result.cookingTimeAdjustment).toBeDefined();
    });

    it('caches successful results', async () => {
      await smartScaleIngredients(
        {
          ingredients: mockIngredients,
          multiplier: 2,
        },
        'test-recipe-id'
      );

      expect(cache.setCachedResult).toHaveBeenCalledWith(
        'test-recipe-id',
        2,
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('when AI fails', () => {
    beforeEach(() => {
      (client.getGeminiClient as jest.Mock).mockReturnValue({
        models: {
          generateContent: jest.fn().mockRejectedValue(new Error('API error')),
        },
      });
    });

    it('falls back to linear scaling', async () => {
      const result = await smartScaleIngredients({
        ingredients: mockIngredients,
        multiplier: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(result.ingredients).toHaveLength(3);
    });

    it('still rounds eggs to whole numbers in fallback', async () => {
      const result = await smartScaleIngredients({
        ingredients: mockIngredients,
        multiplier: 2,
      });

      const eggs = result.ingredients[0];
      expect(eggs.scaledQuantity?.value).toBe(4); // 2 * 2 = 4, still whole
    });

    it('provides basic tips in fallback', async () => {
      const result = await smartScaleIngredients({
        ingredients: mockIngredients,
        multiplier: 2,
      });

      expect(result.tips.length).toBeGreaterThan(0);
    });
  });

  describe('caching', () => {
    it('returns cached result if available', async () => {
      const cachedResult = {
        ingredients: mockIngredients.map((ing) => ({
          ...ing,
          aiAdjusted: false,
          category: 'linear' as const,
          scaledQuantity: { value: 4, displayValue: '4', wasRounded: false, originalValue: 2 },
          scaledUnit: ing.unit,
          displayText: 'cached',
        })),
        tips: ['Cached tip'],
        success: true,
      };

      (cache.getCachedResult as jest.Mock).mockReturnValue(cachedResult);

      const result = await smartScaleIngredients(
        {
          ingredients: mockIngredients,
          multiplier: 2,
        },
        'cached-recipe'
      );

      expect(result).toBe(cachedResult);
      expect(client.getGeminiClient).not.toHaveBeenCalled();
    });
  });
});
