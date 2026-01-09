/**
 * Unit tests for ScalingService
 */

import { ScalingService } from './ScalingService.js';
import { Recipe, ParsedIngredient, ServingInfo } from '@recipe-journal/shared';

describe('ScalingService', () => {
  let service: ScalingService;

  beforeEach(() => {
    service = new ScalingService();
  });

  const createMockRecipe = (ingredients: Partial<ParsedIngredient>[]): Recipe => ({
    source: {
      url: 'https://example.com/recipe',
      domain: 'example.com',
      scrapedAt: new Date(),
      scrapeMethod: 'schema-org',
    },
    title: 'Test Recipe',
    servings: {
      amount: 4,
      unit: 'servings',
      originalText: '4 servings',
    },
    ingredients: ingredients.map((ing, i) => ({
      id: `ing-${i}`,
      original: ing.original || `${ing.quantity?.value} ${ing.unit} ${ing.ingredient}`,
      quantity: ing.quantity || null,
      unit: ing.unit || null,
      ingredient: ing.ingredient || 'test ingredient',
      parseConfidence: 0.9,
      ...ing,
    })),
    instructions: [
      { step: 1, text: 'Mix ingredients' },
      { step: 2, text: 'Bake at 350°F for 30 minutes' },
    ],
  });

  describe('scaleRecipe', () => {
    it('scales ingredients by multiplier', async () => {
      const recipe = createMockRecipe([
        {
          quantity: { type: 'single', value: 2, displayValue: '2' },
          unit: 'cup',
          ingredient: 'flour',
        },
      ]);

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scaledIngredients[0].scaledQuantity?.value).toBe(4);
    });

    it('scales servings', async () => {
      const recipe = createMockRecipe([]);

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scaling.scaledServings.amount).toBe(8);
    });

    it('provides scaling tips for doubled recipes', async () => {
      const recipe = createMockRecipe([]);

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scalingTips).toBeDefined();
      expect(result.scalingTips!.length).toBeGreaterThan(0);
    });

    it('handles half scaling', async () => {
      const recipe = createMockRecipe([
        {
          quantity: { type: 'single', value: 2, displayValue: '2' },
          unit: 'cup',
          ingredient: 'flour',
        },
      ]);

      const result = await service.scaleRecipe(recipe, { multiplier: 0.5 });

      expect(result.scaledIngredients[0].scaledQuantity?.value).toBe(1);
    });

    it('handles very small amounts', async () => {
      const recipe = createMockRecipe([
        {
          quantity: { type: 'single', value: 0.25, displayValue: '1/4' },
          unit: 'teaspoon',
          ingredient: 'salt',
        },
      ]);

      const result = await service.scaleRecipe(recipe, { multiplier: 0.1 });

      // 0.25 * 0.1 = 0.025, which is below PINCH threshold
      expect(result.scaledIngredients[0].scaledQuantity?.displayValue).toBe('a pinch');
    });

    it('preserves original ingredients', async () => {
      const recipe = createMockRecipe([
        {
          quantity: { type: 'single', value: 2, displayValue: '2' },
          unit: 'cup',
          ingredient: 'flour',
        },
      ]);

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.originalIngredients[0].quantity?.value).toBe(2);
    });

    it('handles ingredients without quantity', async () => {
      const recipe = createMockRecipe([
        {
          quantity: null,
          unit: null,
          ingredient: 'salt to taste',
          original: 'salt to taste',
        },
      ]);

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scaledIngredients[0].displayText).toBe('salt to taste');
    });

    it('rounds to friendly fractions', async () => {
      const recipe = createMockRecipe([
        {
          quantity: { type: 'single', value: 1, displayValue: '1' },
          unit: 'cup',
          ingredient: 'sugar',
        },
      ]);

      const result = await service.scaleRecipe(recipe, { multiplier: 1.5 });

      // 1 * 1.5 = 1.5, which should display as "1 1/2"
      expect(result.scaledIngredients[0].scaledQuantity?.displayValue).toBe('1 1/2');
    });
  });
});
