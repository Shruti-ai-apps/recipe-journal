import {
  getAllFavorites,
  getFavoriteById,
  isFavorite,
  getFavoriteByUrl,
  saveFavorite,
  removeFavorite,
  removeFavoriteByUrl,
  updateNotes,
  updateUserTags,
  updateLastViewed,
  searchFavorites,
  getRecentFavorites,
  getFavoritesCount,
  clearAllFavorites,
  exportFavorites,
  importFavorites,
  SavedRecipe,
} from './favorites';
import { Recipe } from '@/types';

describe('Favorites Service', () => {
  const mockRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A delicious test recipe',
    servings: { amount: 4, unit: 'servings', originalText: '4 servings' },
    ingredients: [
      {
        id: 'ing-1',
        original: '2 cups flour',
        quantity: { type: 'single', value: 2, displayValue: '2' },
        unit: 'cup',
        ingredient: 'flour',
        parseConfidence: 0.9,
      },
    ],
    instructions: [{ step: 1, text: 'Mix ingredients' }],
    source: {
      url: 'https://example.com/recipe-1',
      domain: 'example.com',
      scrapedAt: new Date(),
      scrapeMethod: 'schema-org',
    },
    author: 'Test Chef',
    tags: ['dessert', 'easy'],
  };

  const mockRecipe2: Recipe = {
    ...mockRecipe,
    id: 'recipe-2',
    title: 'Another Recipe',
    description: 'Another test recipe with chocolate',
    source: {
      ...mockRecipe.source,
      url: 'https://example.com/recipe-2',
    },
    tags: ['chocolate', 'dessert'],
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('getAllFavorites', () => {
    it('returns empty array when no favorites exist', () => {
      expect(getAllFavorites()).toEqual([]);
    });

    it('returns saved favorites', () => {
      saveFavorite(mockRecipe);
      const favorites = getAllFavorites();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].title).toBe('Test Recipe');
    });

    it('handles corrupted localStorage data', () => {
      localStorage.setItem('recipe-journal-favorites', 'invalid json');
      expect(getAllFavorites()).toEqual([]);
    });
  });

  describe('saveFavorite', () => {
    it('saves a new recipe to favorites', () => {
      const saved = saveFavorite(mockRecipe);

      expect(saved.title).toBe('Test Recipe');
      expect(saved.savedAt).toBeDefined();
      expect(saved.lastViewedAt).toBeDefined();
      expect(saved.userTags).toEqual([]);
      expect(getAllFavorites()).toHaveLength(1);
    });

    it('updates an existing favorite by URL', () => {
      saveFavorite(mockRecipe);
      const updated = saveFavorite(mockRecipe, { notes: 'Updated notes' });

      expect(getAllFavorites()).toHaveLength(1);
      expect(updated.notes).toBe('Updated notes');
    });

    it('saves with custom options', () => {
      const saved = saveFavorite(mockRecipe, {
        notes: 'My notes',
        userTags: ['favorite', 'quick'],
        multiplier: 2,
      });

      expect(saved.notes).toBe('My notes');
      expect(saved.userTags).toEqual(['favorite', 'quick']);
      expect(saved.lastScaledMultiplier).toBe(2);
    });

    it('adds new recipes to beginning of list', () => {
      saveFavorite(mockRecipe);
      saveFavorite(mockRecipe2);

      const favorites = getAllFavorites();
      expect(favorites[0].title).toBe('Another Recipe');
    });
  });

  describe('getFavoriteById', () => {
    it('returns recipe by ID', () => {
      const saved = saveFavorite(mockRecipe);
      const found = getFavoriteById(saved.id);

      expect(found?.title).toBe('Test Recipe');
    });

    it('returns null for non-existent ID', () => {
      expect(getFavoriteById('nonexistent')).toBeNull();
    });
  });

  describe('isFavorite', () => {
    it('returns true for saved recipe URL', () => {
      saveFavorite(mockRecipe);
      expect(isFavorite('https://example.com/recipe-1')).toBe(true);
    });

    it('returns false for unsaved recipe URL', () => {
      expect(isFavorite('https://example.com/unsaved')).toBe(false);
    });
  });

  describe('getFavoriteByUrl', () => {
    it('returns recipe by source URL', () => {
      saveFavorite(mockRecipe);
      const found = getFavoriteByUrl('https://example.com/recipe-1');

      expect(found?.title).toBe('Test Recipe');
    });

    it('returns null for non-existent URL', () => {
      expect(getFavoriteByUrl('https://example.com/nonexistent')).toBeNull();
    });
  });

  describe('removeFavorite', () => {
    it('removes a recipe by ID', () => {
      const saved = saveFavorite(mockRecipe);
      expect(getAllFavorites()).toHaveLength(1);

      const result = removeFavorite(saved.id);
      expect(result).toBe(true);
      expect(getAllFavorites()).toHaveLength(0);
    });

    it('returns false for non-existent ID', () => {
      expect(removeFavorite('nonexistent')).toBe(false);
    });
  });

  describe('removeFavoriteByUrl', () => {
    it('removes a recipe by URL', () => {
      saveFavorite(mockRecipe);
      const result = removeFavoriteByUrl('https://example.com/recipe-1');

      expect(result).toBe(true);
      expect(getAllFavorites()).toHaveLength(0);
    });

    it('returns false for non-existent URL', () => {
      expect(removeFavoriteByUrl('https://nonexistent.com')).toBe(false);
    });
  });

  describe('updateNotes', () => {
    it('updates notes for a recipe', () => {
      const saved = saveFavorite(mockRecipe);
      const updated = updateNotes(saved.id, 'New notes');

      expect(updated?.notes).toBe('New notes');
    });

    it('returns null for non-existent recipe', () => {
      expect(updateNotes('nonexistent', 'notes')).toBeNull();
    });
  });

  describe('updateUserTags', () => {
    it('updates user tags for a recipe', () => {
      const saved = saveFavorite(mockRecipe);
      const updated = updateUserTags(saved.id, ['tag1', 'tag2']);

      expect(updated?.userTags).toEqual(['tag1', 'tag2']);
    });

    it('returns null for non-existent recipe', () => {
      expect(updateUserTags('nonexistent', ['tag'])).toBeNull();
    });
  });

  describe('updateLastViewed', () => {
    it('updates lastViewedAt timestamp', async () => {
      const saved = saveFavorite(mockRecipe);
      const originalViewed = saved.lastViewedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      updateLastViewed(saved.id);

      const updated = getFavoriteById(saved.id);
      expect(new Date(updated!.lastViewedAt).getTime()).toBeGreaterThan(
        new Date(originalViewed).getTime()
      );
    });

    it('does nothing for non-existent ID', () => {
      // Should not throw
      updateLastViewed('nonexistent');
      expect(true).toBe(true);
    });
  });

  describe('searchFavorites', () => {
    beforeEach(() => {
      saveFavorite(mockRecipe);
      saveFavorite(mockRecipe2);
    });

    it('returns all favorites for empty query', () => {
      expect(searchFavorites('')).toHaveLength(2);
      expect(searchFavorites('  ')).toHaveLength(2);
    });

    it('searches by title', () => {
      const results = searchFavorites('Another');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Another Recipe');
    });

    it('searches by description', () => {
      const results = searchFavorites('chocolate');
      expect(results).toHaveLength(1);
    });

    it('searches by ingredient', () => {
      const results = searchFavorites('flour');
      expect(results).toHaveLength(2); // Both have flour
    });

    it('searches by tags', () => {
      const results = searchFavorites('easy');
      expect(results).toHaveLength(1);
    });

    it('searches by author', () => {
      const results = searchFavorites('Chef');
      expect(results).toHaveLength(2);
    });

    it('searches by user tags', () => {
      const saved = saveFavorite(mockRecipe, { userTags: ['weeknight'] });
      updateUserTags(saved.id, ['weeknight']);

      const results = searchFavorites('weeknight');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('searches by notes', () => {
      const saved = saveFavorite(mockRecipe, { notes: 'great for parties' });
      updateNotes(saved.id, 'great for parties');

      const results = searchFavorites('parties');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('is case insensitive', () => {
      const results = searchFavorites('TEST');
      expect(results).toHaveLength(2);
    });
  });

  describe('getRecentFavorites', () => {
    it('returns most recently viewed favorites', async () => {
      saveFavorite(mockRecipe);
      await new Promise((resolve) => setTimeout(resolve, 10));
      saveFavorite(mockRecipe2);

      const recent = getRecentFavorites(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].title).toBe('Another Recipe');
    });

    it('respects limit parameter', () => {
      saveFavorite(mockRecipe);
      saveFavorite(mockRecipe2);

      expect(getRecentFavorites(1)).toHaveLength(1);
      expect(getRecentFavorites(5)).toHaveLength(2);
    });

    it('uses default limit of 5', () => {
      const recent = getRecentFavorites();
      expect(recent).toHaveLength(0); // No recipes saved yet
    });
  });

  describe('getFavoritesCount', () => {
    it('returns correct count', () => {
      expect(getFavoritesCount()).toBe(0);

      saveFavorite(mockRecipe);
      expect(getFavoritesCount()).toBe(1);

      saveFavorite(mockRecipe2);
      expect(getFavoritesCount()).toBe(2);
    });
  });

  describe('clearAllFavorites', () => {
    it('removes all favorites', () => {
      saveFavorite(mockRecipe);
      saveFavorite(mockRecipe2);
      expect(getFavoritesCount()).toBe(2);

      clearAllFavorites();
      expect(getFavoritesCount()).toBe(0);
    });
  });

  describe('exportFavorites', () => {
    it('exports favorites as JSON string', () => {
      saveFavorite(mockRecipe);
      const exported = exportFavorites();

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Test Recipe');
    });
  });

  describe('importFavorites', () => {
    it('imports favorites from JSON (merge mode)', () => {
      saveFavorite(mockRecipe);

      const toImport: SavedRecipe[] = [
        {
          ...mockRecipe2,
          savedAt: new Date().toISOString(),
          lastViewedAt: new Date().toISOString(),
          userTags: [],
        },
      ];

      const count = importFavorites(JSON.stringify(toImport), true);
      expect(count).toBe(1);
      expect(getFavoritesCount()).toBe(2);
    });

    it('does not duplicate existing recipes in merge mode', () => {
      saveFavorite(mockRecipe);

      const toImport: SavedRecipe[] = [
        {
          ...mockRecipe,
          savedAt: new Date().toISOString(),
          lastViewedAt: new Date().toISOString(),
          userTags: [],
        },
      ];

      const count = importFavorites(JSON.stringify(toImport), true);
      expect(count).toBe(0);
      expect(getFavoritesCount()).toBe(1);
    });

    it('replaces all favorites in replace mode', () => {
      saveFavorite(mockRecipe);

      const toImport: SavedRecipe[] = [
        {
          ...mockRecipe2,
          savedAt: new Date().toISOString(),
          lastViewedAt: new Date().toISOString(),
          userTags: [],
        },
      ];

      const count = importFavorites(JSON.stringify(toImport), false);
      expect(count).toBe(1);
      expect(getFavoritesCount()).toBe(1);
      expect(getAllFavorites()[0].title).toBe('Another Recipe');
    });

    it('throws error for invalid JSON', () => {
      expect(() => importFavorites('invalid json')).toThrow('Failed to import favorites');
    });

    it('throws error for non-array JSON', () => {
      expect(() => importFavorites('{"key": "value"}')).toThrow('Failed to import favorites');
    });
  });
});
