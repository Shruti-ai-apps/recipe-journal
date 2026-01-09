/**
 * Favorites service for managing saved recipes in localStorage
 */

import { Recipe } from '@recipe-journal/shared';

const STORAGE_KEY = 'recipe-journal-favorites';

/**
 * Extended recipe type for saved favorites
 */
export interface SavedRecipe extends Recipe {
  savedAt: string;
  lastViewedAt: string;
  notes?: string;
  userTags: string[];
  lastScaledMultiplier?: number;
}

/**
 * Generate a unique ID for a recipe
 */
function generateId(): string {
  return `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all saved recipes from localStorage
 */
export function getAllFavorites(): SavedRecipe[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load favorites:', error);
    return [];
  }
}

/**
 * Get a single recipe by ID
 */
export function getFavoriteById(id: string): SavedRecipe | null {
  const favorites = getAllFavorites();
  return favorites.find((r) => r.id === id) || null;
}

/**
 * Check if a recipe is already saved (by source URL)
 */
export function isFavorite(sourceUrl: string): boolean {
  const favorites = getAllFavorites();
  return favorites.some((r) => r.source.url === sourceUrl);
}

/**
 * Get a favorite by source URL
 */
export function getFavoriteByUrl(sourceUrl: string): SavedRecipe | null {
  const favorites = getAllFavorites();
  return favorites.find((r) => r.source.url === sourceUrl) || null;
}

/**
 * Save a recipe to favorites
 */
export function saveFavorite(
  recipe: Recipe,
  options?: { notes?: string; userTags?: string[]; multiplier?: number }
): SavedRecipe {
  const favorites = getAllFavorites();
  const now = new Date().toISOString();

  // Check if already exists
  const existingIndex = favorites.findIndex((r) => r.source.url === recipe.source.url);

  const savedRecipe: SavedRecipe = {
    ...recipe,
    id: recipe.id || generateId(),
    savedAt: existingIndex >= 0 ? favorites[existingIndex].savedAt : now,
    lastViewedAt: now,
    notes: options?.notes || (existingIndex >= 0 ? favorites[existingIndex].notes : undefined),
    userTags: options?.userTags || (existingIndex >= 0 ? favorites[existingIndex].userTags : []),
    lastScaledMultiplier: options?.multiplier,
  };

  if (existingIndex >= 0) {
    // Update existing
    favorites[existingIndex] = savedRecipe;
  } else {
    // Add to beginning
    favorites.unshift(savedRecipe);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  return savedRecipe;
}

/**
 * Remove a recipe from favorites
 */
export function removeFavorite(id: string): boolean {
  const favorites = getAllFavorites();
  const filteredFavorites = favorites.filter((r) => r.id !== id);

  if (filteredFavorites.length === favorites.length) {
    return false; // Nothing was removed
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFavorites));
  return true;
}

/**
 * Remove a favorite by source URL
 */
export function removeFavoriteByUrl(sourceUrl: string): boolean {
  const favorites = getAllFavorites();
  const filteredFavorites = favorites.filter((r) => r.source.url !== sourceUrl);

  if (filteredFavorites.length === favorites.length) {
    return false;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFavorites));
  return true;
}

/**
 * Update a saved recipe's notes
 */
export function updateNotes(id: string, notes: string): SavedRecipe | null {
  const favorites = getAllFavorites();
  const index = favorites.findIndex((r) => r.id === id);

  if (index < 0) return null;

  favorites[index].notes = notes;
  favorites[index].lastViewedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  return favorites[index];
}

/**
 * Update a saved recipe's user tags
 */
export function updateUserTags(id: string, userTags: string[]): SavedRecipe | null {
  const favorites = getAllFavorites();
  const index = favorites.findIndex((r) => r.id === id);

  if (index < 0) return null;

  favorites[index].userTags = userTags;
  favorites[index].lastViewedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  return favorites[index];
}

/**
 * Update last viewed timestamp
 */
export function updateLastViewed(id: string): void {
  const favorites = getAllFavorites();
  const index = favorites.findIndex((r) => r.id === id);

  if (index >= 0) {
    favorites[index].lastViewedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }
}

/**
 * Search favorites by title, ingredients, or tags
 */
export function searchFavorites(query: string): SavedRecipe[] {
  if (!query.trim()) return getAllFavorites();

  const favorites = getAllFavorites();
  const q = query.toLowerCase().trim();

  return favorites.filter((recipe) => {
    // Search in title
    if (recipe.title.toLowerCase().includes(q)) return true;

    // Search in description
    if (recipe.description?.toLowerCase().includes(q)) return true;

    // Search in ingredients
    if (recipe.ingredients.some((ing) => ing.ingredient.toLowerCase().includes(q))) return true;

    // Search in tags
    if (recipe.tags?.some((tag) => tag.toLowerCase().includes(q))) return true;

    // Search in user tags
    if (recipe.userTags.some((tag) => tag.toLowerCase().includes(q))) return true;

    // Search in notes
    if (recipe.notes?.toLowerCase().includes(q)) return true;

    // Search in author
    if (recipe.author?.toLowerCase().includes(q)) return true;

    return false;
  });
}

/**
 * Get recent favorites (last N)
 */
export function getRecentFavorites(limit: number = 5): SavedRecipe[] {
  const favorites = getAllFavorites();
  return favorites
    .sort((a, b) => new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime())
    .slice(0, limit);
}

/**
 * Get favorites count
 */
export function getFavoritesCount(): number {
  return getAllFavorites().length;
}

/**
 * Clear all favorites (use with caution)
 */
export function clearAllFavorites(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export favorites as JSON
 */
export function exportFavorites(): string {
  const favorites = getAllFavorites();
  return JSON.stringify(favorites, null, 2);
}

/**
 * Import favorites from JSON
 */
export function importFavorites(json: string, merge: boolean = true): number {
  try {
    const imported: SavedRecipe[] = JSON.parse(json);
    if (!Array.isArray(imported)) throw new Error('Invalid format');

    if (merge) {
      const existing = getAllFavorites();
      const existingUrls = new Set(existing.map((r) => r.source.url));

      const newRecipes = imported.filter((r) => !existingUrls.has(r.source.url));
      const merged = [...existing, ...newRecipes];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return newRecipes.length;
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      return imported.length;
    }
  } catch (error) {
    console.error('Failed to import favorites:', error);
    throw new Error('Failed to import favorites: Invalid format');
  }
}
