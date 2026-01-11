import { IngredientParser, ingredientParser } from './IngredientParser';

describe('IngredientParser', () => {
  let parser: IngredientParser;

  beforeEach(() => {
    parser = new IngredientParser();
  });

  describe('parseIngredient', () => {
    describe('basic parsing', () => {
      it('parses a simple ingredient with quantity, unit, and name', () => {
        const result = parser.parseIngredient('2 cups flour');

        expect(result.quantity).not.toBeNull();
        expect(result.quantity?.value).toBe(2);
        expect(result.quantity?.type).toBe('single');
        expect(result.unit).toBe('cup');
        expect(result.ingredient).toBe('flour');
        expect(result.parseConfidence).toBeGreaterThan(0.5);
      });

      it('parses ingredient with tablespoon abbreviation', () => {
        const result = parser.parseIngredient('3 tbsp olive oil');

        expect(result.quantity?.value).toBe(3);
        expect(result.unit).toBe('tablespoon');
        expect(result.ingredient).toBe('olive oil');
      });

      it('parses ingredient with teaspoon abbreviation', () => {
        const result = parser.parseIngredient('1 tsp salt');

        expect(result.quantity?.value).toBe(1);
        expect(result.unit).toBe('teaspoon');
        expect(result.ingredient).toBe('salt');
      });

      it('parses ingredient without unit (count-based)', () => {
        const result = parser.parseIngredient('3 eggs');

        expect(result.quantity?.value).toBe(3);
        expect(result.unit).toBeNull();
        expect(result.ingredient).toBe('eggs');
      });
    });

    describe('fraction handling', () => {
      it('parses unicode fractions', () => {
        const result = parser.parseIngredient('½ cup sugar');

        expect(result.quantity?.value).toBe(0.5);
        expect(result.unit).toBe('cup');
        expect(result.ingredient).toBe('sugar');
      });

      it('parses text fractions in mixed numbers', () => {
        // Note: Standalone text fractions like "1/2" are captured via the mixed number pattern
        // The regex matches digits followed by optional space and fraction
        const result = parser.parseIngredient('2 1/4 cups butter');

        expect(result.quantity?.value).toBe(2.25);
        expect(result.unit).toBe('cup');
        expect(result.ingredient).toBe('butter');
      });

      it('parses mixed numbers with unicode fractions', () => {
        const result = parser.parseIngredient('2½ cups milk');

        expect(result.quantity?.value).toBe(2.5);
        expect(result.unit).toBe('cup');
        expect(result.ingredient).toBe('milk');
      });

      it('parses mixed numbers with text fractions', () => {
        const result = parser.parseIngredient('1 1/2 cups water');

        expect(result.quantity?.value).toBe(1.5);
        expect(result.unit).toBe('cup');
        expect(result.ingredient).toBe('water');
      });

      it('parses quarter fractions', () => {
        const result = parser.parseIngredient('¼ tsp vanilla');

        expect(result.quantity?.value).toBe(0.25);
        expect(result.unit).toBe('teaspoon');
        expect(result.ingredient).toBe('vanilla');
      });

      it('parses three-quarter fractions', () => {
        const result = parser.parseIngredient('¾ cup brown sugar');

        expect(result.quantity?.value).toBe(0.75);
        expect(result.unit).toBe('cup');
        expect(result.ingredient).toBe('brown sugar');
      });
    });

    describe('range quantities', () => {
      it('parses quantity ranges with dash', () => {
        const result = parser.parseIngredient('2-3 cups chicken broth');

        expect(result.quantity?.type).toBe('range');
        expect(result.quantity?.value).toBe(2);
        expect(result.quantity?.valueTo).toBe(3);
        expect(result.unit).toBe('cup');
        expect(result.ingredient).toBe('chicken broth');
      });

      it('parses quantity ranges with en-dash', () => {
        const result = parser.parseIngredient('1–2 tbsp honey');

        expect(result.quantity?.type).toBe('range');
        expect(result.quantity?.value).toBe(1);
        expect(result.quantity?.valueTo).toBe(2);
        expect(result.unit).toBe('tablespoon');
        expect(result.ingredient).toBe('honey');
      });
    });

    describe('preparation instructions', () => {
      it('extracts preparation at end after comma', () => {
        const result = parser.parseIngredient('2 cups onions, diced');

        expect(result.quantity?.value).toBe(2);
        expect(result.unit).toBe('cup');
        expect(result.ingredient).toBe('onions');
        expect(result.preparation).toBe('diced');
      });

      it('extracts preparation with chopped', () => {
        const result = parser.parseIngredient('1 cup parsley, chopped');

        expect(result.ingredient).toBe('parsley');
        expect(result.preparation).toBe('chopped');
      });

      it('extracts preparation with minced', () => {
        const result = parser.parseIngredient('3 cloves garlic, minced');

        expect(result.ingredient).toBe('cloves garlic');
        expect(result.preparation).toBe('minced');
      });
    });

    describe('notes extraction', () => {
      it('extracts notes in parentheses', () => {
        const result = parser.parseIngredient('1 cup cheese (shredded)');

        expect(result.ingredient).toBe('cheese');
        expect(result.notes).toBe('shredded');
      });

      it('extracts "optional" note', () => {
        const result = parser.parseIngredient('1 tbsp nuts, optional');

        expect(result.notes).toContain('optional');
      });

      it('extracts "to taste" note', () => {
        const result = parser.parseIngredient('salt, to taste');

        expect(result.notes).toContain('to taste');
      });

      it('extracts "divided" note', () => {
        const result = parser.parseIngredient('2 cups sugar, divided');

        expect(result.notes).toContain('divided');
      });
    });

    describe('unit variations', () => {
      it('handles pound abbreviations', () => {
        const result = parser.parseIngredient('2 lbs chicken breast');

        expect(result.quantity?.value).toBe(2);
        expect(result.unit).toBe('pound');
        expect(result.ingredient).toBe('chicken breast');
      });

      it('extracts ground as preparation for meat', () => {
        const result = parser.parseIngredient('2 lbs ground beef');

        expect(result.quantity?.value).toBe(2);
        expect(result.unit).toBe('pound');
        expect(result.ingredient).toBe('beef');
        expect(result.preparation).toBe('ground');
      });

      it('handles ounce abbreviations', () => {
        const result = parser.parseIngredient('8 oz cream cheese');

        expect(result.quantity?.value).toBe(8);
        expect(result.unit).toBe('ounce');
        expect(result.ingredient).toBe('cream cheese');
      });

      it('handles gram abbreviations', () => {
        const result = parser.parseIngredient('250g flour');

        expect(result.quantity?.value).toBe(250);
        expect(result.unit).toBe('gram');
        expect(result.ingredient).toBe('flour');
      });

      it('handles milliliter abbreviations', () => {
        const result = parser.parseIngredient('500 ml water');

        expect(result.quantity?.value).toBe(500);
        expect(result.unit).toBe('milliliter');
        expect(result.ingredient).toBe('water');
      });
    });

    describe('edge cases', () => {
      it('handles empty string', () => {
        const result = parser.parseIngredient('');

        expect(result.parseConfidence).toBe(0);
        expect(result.parseError).toBeDefined();
      });

      it('handles very short string', () => {
        const result = parser.parseIngredient('a');

        expect(result.parseConfidence).toBe(0);
        expect(result.parseError).toBeDefined();
      });

      it('handles ingredient without quantity', () => {
        const result = parser.parseIngredient('salt and pepper');

        expect(result.quantity).toBeNull();
        expect(result.ingredient).toBe('salt and pepper');
      });

      it('strips "of" from ingredient names', () => {
        const result = parser.parseIngredient('2 cups of flour');

        expect(result.ingredient).toBe('flour');
      });

      it('preserves original text', () => {
        const original = '2 cups flour, sifted';
        const result = parser.parseIngredient(original);

        expect(result.original).toBe(original);
      });

      it('generates unique IDs', () => {
        const result1 = parser.parseIngredient('1 cup flour');
        const result2 = parser.parseIngredient('1 cup flour');

        expect(result1.id).not.toBe(result2.id);
      });
    });
  });

  describe('parseIngredients (batch)', () => {
    it('parses multiple ingredients', async () => {
      const ingredients = ['2 cups flour', '1 tsp salt', '3 eggs'];
      const results = await parser.parseIngredients(ingredients);

      expect(results).toHaveLength(3);
      expect(results[0].ingredient).toBe('flour');
      expect(results[1].ingredient).toBe('salt');
      expect(results[2].ingredient).toBe('eggs');
    });
  });

  describe('singleton instance', () => {
    it('exports a singleton instance', () => {
      expect(ingredientParser).toBeInstanceOf(IngredientParser);
    });
  });
});
