import { ScalingService, scalingService } from './ScalingService';
import { Recipe, ParsedIngredient, UnitSystem } from '@/types';

describe('ScalingService', () => {
  let service: ScalingService;

  beforeEach(() => {
    service = new ScalingService();
  });

  const createMockIngredient = (overrides: Partial<ParsedIngredient> = {}): ParsedIngredient => ({
    id: 'test-id',
    original: '2 cups flour',
    quantity: {
      type: 'single',
      value: 2,
      displayValue: '2',
    },
    unit: 'cup',
    ingredient: 'flour',
    parseConfidence: 0.9,
    ...overrides,
  });

  const createMockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A test recipe',
    servings: { amount: 4, unit: 'servings' },
    ingredients: [createMockIngredient()],
    instructions: ['Step 1', 'Step 2'],
    source: { type: 'manual' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('scaleRecipe', () => {
    it('scales a recipe by the given multiplier', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scaling.multiplier).toBe(2);
      expect(result.scaling.scaledServings.amount).toBe(8);
      expect(result.scaledIngredients).toHaveLength(1);
      expect(result.scaledIngredients[0].scaledQuantity?.value).toBe(4);
    });

    it('halves a recipe', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 0.5 });

      expect(result.scaling.scaledServings.amount).toBe(2);
      expect(result.scaledIngredients[0].scaledQuantity?.value).toBe(1);
    });

    it('triples a recipe', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 3 });

      expect(result.scaling.scaledServings.amount).toBe(12);
      expect(result.scaledIngredients[0].scaledQuantity?.value).toBe(6);
    });

    it('preserves original ingredients', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.originalIngredients).toEqual(recipe.ingredients);
      expect(result.originalIngredients[0].quantity?.value).toBe(2);
    });

    it('includes scaling metadata with timestamp', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scaling.appliedAt).toBeInstanceOf(Date);
      expect(result.scaling.originalServings).toEqual(recipe.servings);
    });
  });

  describe('ingredient scaling', () => {
    it('handles ingredients without quantities', async () => {
      const recipe = createMockRecipe({
        ingredients: [createMockIngredient({ quantity: null, original: 'salt to taste' })],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scaledIngredients[0].scaledQuantity).toBeNull();
      expect(result.scaledIngredients[0].displayText).toBe('salt to taste');
    });

    it('creates display text with quantity and unit', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 1 });

      expect(result.scaledIngredients[0].displayText).toContain('flour');
      expect(result.scaledIngredients[0].displayText).toContain('cup');
    });

    it('includes preparation in display text', async () => {
      const recipe = createMockRecipe({
        ingredients: [createMockIngredient({ preparation: 'sifted' })],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 1 });

      expect(result.scaledIngredients[0].displayText).toContain('sifted');
    });

    it('includes notes in display text', async () => {
      const recipe = createMockRecipe({
        ingredients: [createMockIngredient({ notes: 'optional' })],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 1 });

      expect(result.scaledIngredients[0].displayText).toContain('optional');
    });
  });

  describe('quantity rounding', () => {
    it('uses friendly rounding by default', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 1, displayValue: '1' },
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 1.5 });

      // 1 * 1.5 = 1.5, should display as "1 1/2"
      expect(result.scaledIngredients[0].scaledQuantity?.displayValue).toBe('1 1/2');
    });

    it('supports exact rounding mode', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 1, displayValue: '1' },
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, {
        multiplier: 1.333,
        roundingPrecision: 'exact',
      });

      expect(result.scaledIngredients[0].scaledQuantity?.displayValue).toMatch(/1\.333/);
    });

    it('shows "a pinch" for very small amounts', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 0.25, displayValue: '1/4' },
            unit: 'teaspoon',
          }),
        ],
      });

      // 0.25 * 0.1 = 0.025, which is below PINCH threshold
      const result = await service.scaleRecipe(recipe, { multiplier: 0.1 });

      expect(result.scaledIngredients[0].scaledQuantity?.displayValue).toBe('a pinch');
    });

    it('shows "to taste" for extremely small amounts', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 0.125, displayValue: '1/8' },
            unit: 'teaspoon',
          }),
        ],
      });

      // 0.125 * 0.1 = 0.0125, which is below TO_TASTE threshold
      const result = await service.scaleRecipe(recipe, { multiplier: 0.1 });

      expect(result.scaledIngredients[0].scaledQuantity?.displayModifier).toBe('to taste');
    });
  });

  describe('range quantities', () => {
    it('scales range quantities and preserves range display', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            original: '1-2 tbsp honey',
            quantity: { type: 'range', value: 1, valueTo: 2, displayValue: '1-2' },
            unit: 'tablespoon',
            ingredient: 'honey',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });
      const ing = result.scaledIngredients[0];

      expect(ing.scaledQuantity?.value).toBe(2);
      expect(ing.scaledQuantity?.valueTo).toBe(4);
      expect(ing.scaledQuantity?.displayValue).toBe('2–4');
      expect(ing.displayText).toContain('tablespoons');
    });

    it('uses friendly fractions for range endpoints', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            original: '1-2 tbsp honey',
            quantity: { type: 'range', value: 1, valueTo: 2, displayValue: '1-2' },
            unit: 'tablespoon',
            ingredient: 'honey',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 0.5 });
      const ing = result.scaledIngredients[0];

      expect(ing.scaledQuantity?.displayValue).toBe('1/2–1');
    });
  });

  describe('tiny amounts', () => {
    it('does not append units when displaying pinch/to taste', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            original: '0.02 tsp salt',
            quantity: { type: 'single', value: 0.02, displayValue: '0.02' },
            unit: 'teaspoon',
            ingredient: 'salt',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 1 });
      const ing = result.scaledIngredients[0];

      expect(ing.scaledQuantity?.displayValue).toBe('a pinch');
      expect(ing.displayText).not.toContain('teaspoon');
    });
  });

  describe('unit conversion', () => {
    it('converts US units to metric when requested', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 1, displayValue: '1' },
            unit: 'cup',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, {
        multiplier: 1,
        targetUnitSystem: UnitSystem.METRIC,
      });

      expect(result.scaledIngredients[0].scaledUnit).toBe('milliliter');
    });

    it('converts metric units to US when requested', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 500, displayValue: '500' },
            unit: 'gram',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, {
        multiplier: 1,
        targetUnitSystem: UnitSystem.US,
      });

      expect(result.scaledIngredients[0].scaledUnit).toBe('ounce');
    });

    it('keeps original unit when already in target system', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 2, displayValue: '2' },
            unit: 'cup',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, {
        multiplier: 1,
        targetUnitSystem: UnitSystem.US,
      });

      expect(result.scaledIngredients[0].scaledUnit).toBe('cup');
    });

    it('converts fluid ounces to milliliters when requested', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 2, displayValue: '2' },
            unit: 'fluidOunce',
            ingredient: 'lime juice',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, {
        multiplier: 1,
        targetUnitSystem: UnitSystem.METRIC,
      });

      expect(result.scaledIngredients[0].scaledUnit).toBe('milliliter');
    });
  });

  describe('scaling tips', () => {
    it('returns no tips when multiplier is 1', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 1 });

      expect(result.scalingTips).toEqual([]);
    });

    it('returns halving tips for multiplier < 1', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 0.5 });

      expect(result.scalingTips).toBeDefined();
      expect(result.scalingTips!.length).toBeGreaterThan(0);
    });

    it('returns doubling tips for multiplier <= 2', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scalingTips).toBeDefined();
      expect(result.scalingTips!.length).toBeGreaterThan(0);
    });

    it('returns tripling tips for multiplier <= 3', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 3 });

      expect(result.scalingTips).toBeDefined();
      expect(result.scalingTips!.length).toBeGreaterThan(0);
    });

    it('returns large batch tips for multiplier > 3', async () => {
      const recipe = createMockRecipe();
      const result = await service.scaleRecipe(recipe, { multiplier: 5 });

      expect(result.scalingTips).toBeDefined();
      expect(result.scalingTips!.length).toBeGreaterThan(0);
    });
  });

  describe('servings scaling', () => {
    it('scales servings amount correctly', async () => {
      const recipe = createMockRecipe({
        servings: { amount: 6, unit: 'people' },
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scaling.scaledServings.amount).toBe(12);
      expect(result.scaling.scaledServings.unit).toBe('people');
    });

    it('rounds scaled servings to whole numbers', async () => {
      const recipe = createMockRecipe({
        servings: { amount: 3, unit: 'servings' },
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 1.5 });

      expect(result.scaling.scaledServings.amount).toBe(5); // rounds 4.5 to 5
    });
  });

  describe('unit pluralization', () => {
    it('pluralizes unit when quantity > 1', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 1, displayValue: '1' },
            unit: 'cup',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 2 });

      expect(result.scaledIngredients[0].displayText).toContain('cups');
    });

    it('keeps singular unit when quantity <= 1', async () => {
      const recipe = createMockRecipe({
        ingredients: [
          createMockIngredient({
            quantity: { type: 'single', value: 2, displayValue: '2' },
            unit: 'cup',
          }),
        ],
      });

      const result = await service.scaleRecipe(recipe, { multiplier: 0.5 });

      expect(result.scaledIngredients[0].displayText).toContain('cup');
      expect(result.scaledIngredients[0].displayText).not.toMatch(/cups/);
    });
  });

  describe('singleton instance', () => {
    it('exports a singleton instance', () => {
      expect(scalingService).toBeInstanceOf(ScalingService);
    });
  });
});
