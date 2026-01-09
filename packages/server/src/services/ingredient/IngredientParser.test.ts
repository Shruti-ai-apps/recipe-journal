/**
 * Unit tests for IngredientParser
 */

import { IngredientParser } from './IngredientParser.js';

describe('IngredientParser', () => {
  let parser: IngredientParser;

  beforeEach(() => {
    parser = new IngredientParser();
  });

  describe('parseIngredient', () => {
    it('parses a simple ingredient with quantity and unit', () => {
      const result = parser.parseIngredient('2 cups flour');

      expect(result.quantity?.value).toBe(2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('flour');
      expect(result.parseConfidence).toBeGreaterThan(0.5);
    });

    it('parses fractional quantities', () => {
      const result = parser.parseIngredient('1/2 cup sugar');

      expect(result.quantity?.value).toBe(0.5);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('sugar');
    });

    it('parses mixed numbers', () => {
      const result = parser.parseIngredient('2 1/2 cups all-purpose flour');

      expect(result.quantity?.value).toBe(2.5);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toContain('flour');
    });

    it('parses unicode fractions', () => {
      const result = parser.parseIngredient('½ cup butter');

      expect(result.quantity?.value).toBe(0.5);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('butter');
    });

    it('parses ranges', () => {
      const result = parser.parseIngredient('1-2 cups milk');

      expect(result.quantity?.type).toBe('range');
      expect(result.quantity?.value).toBe(1);
      expect(result.quantity?.valueTo).toBe(2);
    });

    it('parses ingredients with preparation', () => {
      const result = parser.parseIngredient('1 onion, diced');

      expect(result.quantity?.value).toBe(1);
      expect(result.ingredient).toBe('onion');
      expect(result.preparation).toBe('diced');
    });

    it('parses ingredients with notes', () => {
      const result = parser.parseIngredient('1 cup cheese (optional)');

      expect(result.quantity?.value).toBe(1);
      expect(result.notes).toBe('optional');
    });

    it('handles ingredients without quantity', () => {
      const result = parser.parseIngredient('salt to taste');

      expect(result.quantity).toBeNull();
      expect(result.original).toBe('salt to taste');
    });

    it('parses tablespoon abbreviation', () => {
      const result = parser.parseIngredient('2 tbsp olive oil');

      expect(result.quantity?.value).toBe(2);
      expect(result.unit).toBe('tablespoon');
      expect(result.ingredient).toBe('olive oil');
    });

    it('parses teaspoon abbreviation', () => {
      const result = parser.parseIngredient('1 tsp vanilla extract');

      expect(result.quantity?.value).toBe(1);
      expect(result.unit).toBe('teaspoon');
      expect(result.ingredient).toBe('vanilla extract');
    });

    it('handles weight units', () => {
      const result = parser.parseIngredient('8 oz cream cheese');

      expect(result.quantity?.value).toBe(8);
      expect(result.unit).toBe('ounce');
      expect(result.ingredient).toBe('cream cheese');
    });

    it('preserves original text', () => {
      const original = '2 1/2 cups all-purpose flour, sifted';
      const result = parser.parseIngredient(original);

      expect(result.original).toBe(original);
    });
  });

  describe('parseIngredients', () => {
    it('parses an array of ingredients', async () => {
      const ingredients = [
        '2 cups flour',
        '1 cup sugar',
        '1/2 cup butter',
      ];

      const results = await parser.parseIngredients(ingredients);

      expect(results).toHaveLength(3);
      expect(results[0].quantity?.value).toBe(2);
      expect(results[1].quantity?.value).toBe(1);
      expect(results[2].quantity?.value).toBe(0.5);
    });

    it('assigns unique IDs to each ingredient', async () => {
      const ingredients = ['2 cups flour', '1 cup sugar'];
      const results = await parser.parseIngredients(ingredients);

      expect(results[0].id).not.toBe(results[1].id);
    });
  });
});
