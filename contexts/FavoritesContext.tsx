'use client';

/**
 * Favorites Context - manages saved recipes
 * Uses localStorage for guests, Supabase for logged-in users
 * Includes offline support with sync capabilities
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { Recipe } from '@/types';
import {
  SavedRecipe,
  getAllFavorites as getLocalFavorites,
  saveFavorite as saveLocalFavorite,
  removeFavorite as removeLocalFavorite,
  removeFavoriteByUrl as removeLocalFavoriteByUrl,
  getFavoriteByUrl as getLocalFavoriteByUrl,
  searchFavorites as searchLocalFavorites,
  updateNotes as updateLocalNotes,
  isFavorite as isLocalFavorite,
} from '@/services/favorites';
import {
  getFavorites as getCloudFavorites,
  searchRecipes,
  getRecipeBySourceUrl,
} from '@/lib/supabase/recipes';
import type { DbRecipe } from '@/lib/supabase/types';
import {
  hasLocalRecipesToMigrate,
  getLocalRecipesCount,
  getMigrationStatus,
} from '@/services/migration';
import {
  isOnline,
  addSyncListener,
  createRecipeWithSync,
  updateRecipeWithSync,
  deleteRecipeWithSync,
  getAllFromOffline,
  saveAllToOffline,
  getPendingCount,
} from '@/services/sync';
import { isIndexedDBAvailable } from '@/lib/offline';

interface FavoritesContextType {
  // State
  favorites: SavedRecipe[];
  loading: boolean;
  error: string | null;

  // Offline state
  isOffline: boolean;
  pendingChanges: number;

  // Migration state
  showMigrationPrompt: boolean;
  localRecipesCount: number;
  dismissMigrationPrompt: () => void;

  // Actions
  loadFavorites: () => Promise<void>;
  addFavorite: (
    recipe: Recipe,
    options?: { notes?: string; userTags?: string[]; multiplier?: number }
  ) => Promise<SavedRecipe | null>;
  removeFavorite: (id: string) => Promise<boolean>;
  removeFavoriteByUrl: (url: string) => Promise<boolean>;
  isFavorite: (sourceUrl: string) => Promise<boolean>;
  getFavoriteByUrl: (sourceUrl: string) => Promise<SavedRecipe | null>;
  searchFavorites: (query: string) => Promise<SavedRecipe[]>;
  updateNotes: (id: string, notes: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

/**
 * Convert a DbRecipe to SavedRecipe format for UI consistency
 */
function dbRecipeToSavedRecipe(dbRecipe: DbRecipe): SavedRecipe {
  return {
    id: dbRecipe.id,
    title: dbRecipe.title,
    source: {
      url: dbRecipe.source_url || '',
      domain: dbRecipe.source_domain || '',
      scrapedAt: new Date(dbRecipe.created_at),
      scrapeMethod: 'schema-org',
    },
    description: dbRecipe.description || undefined,
    image: dbRecipe.image_url || undefined,
    author: dbRecipe.author || undefined,
    prepTime: dbRecipe.prep_time ? parseInt(dbRecipe.prep_time) : undefined,
    cookTime: dbRecipe.cook_time ? parseInt(dbRecipe.cook_time) : undefined,
    totalTime: dbRecipe.total_time ? parseInt(dbRecipe.total_time) : undefined,
    servings: {
      amount: dbRecipe.servings_amount || 1,
      unit: dbRecipe.servings_unit || 'servings',
      originalText: `${dbRecipe.servings_amount || 1} ${dbRecipe.servings_unit || 'servings'}`,
    },
    ingredients: dbRecipe.ingredients,
    instructions: dbRecipe.instructions,
    nutrition: dbRecipe.nutrition || undefined,
    tags: dbRecipe.tags,
    savedAt: dbRecipe.created_at,
    lastViewedAt: dbRecipe.last_viewed_at || dbRecipe.updated_at,
    notes: dbRecipe.notes || undefined,
    userTags: [], // Tags are combined in DB
    lastScaledMultiplier: dbRecipe.last_scale_multiplier,
  };
}

/**
 * Convert a Recipe to cloud format for saving
 */
function recipeToDbFormat(recipe: Recipe, multiplier?: number): {
  title: string;
  source_url: string;
  source_domain: string;
  image_url: string | null;
  description: string | null;
  author: string | null;
  prep_time: string | null;
  cook_time: string | null;
  total_time: string | null;
  servings_amount: number;
  servings_unit: string;
  original_servings_amount: number;
  ingredients: typeof recipe.ingredients;
  instructions: typeof recipe.instructions;
  nutrition: Record<string, string | number | undefined> | null;
  notes: string | null;
  tags: string[];
  is_favorite: boolean;
  last_scale_multiplier: number;
  last_viewed_at: string;
} {
  return {
    title: recipe.title,
    source_url: recipe.source.url,
    source_domain: recipe.source.domain,
    image_url: recipe.image || null,
    description: recipe.description || null,
    author: recipe.author || null,
    prep_time: recipe.prepTime ? `${recipe.prepTime} minutes` : null,
    cook_time: recipe.cookTime ? `${recipe.cookTime} minutes` : null,
    total_time: recipe.totalTime ? `${recipe.totalTime} minutes` : null,
    servings_amount: recipe.servings.amount,
    servings_unit: recipe.servings.unit || 'servings',
    original_servings_amount: recipe.servings.amount,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    nutrition: recipe.nutrition || null,
    notes: null,
    tags: recipe.tags || [],
    is_favorite: true,
    last_scale_multiplier: multiplier ?? 1,
    last_viewed_at: new Date().toISOString(),
  };
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [localRecipesCount, setLocalRecipesCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);

  const isLoggedIn = !!user;

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending changes count
  const updatePendingCount = useCallback(async () => {
    if (user && isIndexedDBAvailable()) {
      const count = await getPendingCount(user.id);
      setPendingChanges(count);
    } else {
      setPendingChanges(0);
    }
  }, [user]);

  // Check for migration prompt when user logs in
  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      const migrationStatus = getMigrationStatus();
      const hasLocalRecipes = hasLocalRecipesToMigrate();

      if (hasLocalRecipes && !migrationStatus.hasMigrated) {
        setLocalRecipesCount(getLocalRecipesCount());
        setShowMigrationPrompt(true);
      }
    }
  }, [authLoading, isLoggedIn]);

  // Load favorites when auth state changes
  useEffect(() => {
    if (!authLoading) {
      loadFavorites();
    }
  }, [authLoading, isLoggedIn]);

  // Keep UI state consistent when offline-created IDs are remapped to cloud IDs.
  useEffect(() => {
    if (!isLoggedIn) return;

    const unsubscribe = addSyncListener((event, data) => {
      if (event !== 'id-remapped' || !data) return;

      const oldId = data.oldId;
      const recipe = data.recipe as DbRecipe | undefined;

      if (typeof oldId !== 'string' || !recipe) return;

      const saved = dbRecipeToSavedRecipe(recipe);

      setFavorites((prev) => {
        const existingIndex = prev.findIndex((r) => r.id === oldId);
        if (existingIndex < 0) return prev;

        // If the new id already exists, drop the old entry.
        const alreadyHasNew = prev.some((r) => r.id === saved.id);
        const next = prev.filter((r) => r.id !== oldId);
        if (!alreadyHasNew) {
          next.unshift(saved);
        }
        return next;
      });
    });

    return unsubscribe;
  }, [isLoggedIn]);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isLoggedIn && user) {
        // Try to load from cloud first
        if (isOnline()) {
          const result = await getCloudFavorites(user.id);
          if (result.error) {
            throw result.error;
          }
          const savedRecipes = result.data.map(dbRecipeToSavedRecipe);
          setFavorites(savedRecipes);

          // Cache to offline storage
          if (isIndexedDBAvailable()) {
            await saveAllToOffline(result.data);
          }
        } else {
          // Offline - load from IndexedDB
          if (isIndexedDBAvailable()) {
            const offlineRecipes = await getAllFromOffline(user.id);
            const savedRecipes = offlineRecipes.map(dbRecipeToSavedRecipe);
            setFavorites(savedRecipes);
          }
        }

        // Update pending changes count
        await updatePendingCount();
      } else {
        // Load from localStorage for guests
        const localFavorites = getLocalFavorites();
        setFavorites(localFavorites);
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load favorites');

      // Fallback to offline storage or localStorage
      if (isLoggedIn && user && isIndexedDBAvailable()) {
        try {
          const offlineRecipes = await getAllFromOffline(user.id);
          const savedRecipes = offlineRecipes.map(dbRecipeToSavedRecipe);
          setFavorites(savedRecipes);
        } catch {
          setFavorites(getLocalFavorites());
        }
      } else {
        setFavorites(getLocalFavorites());
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user, updatePendingCount]);

  const addFavorite = useCallback(
    async (
      recipe: Recipe,
      options?: { notes?: string; userTags?: string[]; multiplier?: number }
    ): Promise<SavedRecipe | null> => {
      try {
        if (isLoggedIn && user) {
          // Save with sync support (handles online/offline)
          const dbRecipe = recipeToDbFormat(recipe, options?.multiplier);
          if (options?.notes) {
            dbRecipe.notes = options.notes;
          }
          if (options?.userTags) {
            dbRecipe.tags = [...dbRecipe.tags, ...options.userTags];
          }

          const result = await createRecipeWithSync(user.id, dbRecipe);
          if (result) {
            const savedRecipe = dbRecipeToSavedRecipe(result);
            setFavorites((prev) => [savedRecipe, ...prev]);
            await updatePendingCount();
            return savedRecipe;
          }
          return null;
        } else {
          // Save to localStorage for guests
          const savedRecipe = saveLocalFavorite(recipe, {
            notes: options?.notes,
            userTags: options?.userTags,
            multiplier: options?.multiplier,
          });
          setFavorites((prev) => {
            const exists = prev.some((r) => r.source.url === recipe.source.url);
            if (exists) {
              return prev.map((r) =>
                r.source.url === recipe.source.url ? savedRecipe : r
              );
            }
            return [savedRecipe, ...prev];
          });
          return savedRecipe;
        }
      } catch (err) {
        console.error('Failed to add favorite:', err);
        setError(err instanceof Error ? err.message : 'Failed to save recipe');
        return null;
      }
    },
    [isLoggedIn, user, updatePendingCount]
  );

  const removeFavorite = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);

      let removed: SavedRecipe | undefined;
      let removedIndex = -1;

      // Optimistically remove from UI for snappy interactions.
      setFavorites((prev) => {
        removedIndex = prev.findIndex((r) => r.id === id);
        if (removedIndex >= 0) {
          removed = prev[removedIndex];
        }
        return prev.filter((r) => r.id !== id);
      });

      try {
        if (isLoggedIn && user) {
          // Delete with sync support
          const success = await deleteRecipeWithSync(id, user.id);
          if (success) {
            await updatePendingCount();
            return true;
          }

          // Restore on failure.
          if (removed) {
            setFavorites((prev) => {
              if (prev.some((r) => r.id === id)) return prev;
              const next = [...prev];
              const insertAt = Math.min(
                removedIndex >= 0 ? removedIndex : 0,
                next.length
              );
              next.splice(insertAt, 0, removed!);
              return next;
            });
          }

          setError('Failed to remove recipe');
          return false;
        } else {
          // Remove from localStorage
          const success = removeLocalFavorite(id);
          if (!success && removed) {
            setFavorites((prev) => {
              if (prev.some((r) => r.id === id)) return prev;
              const next = [...prev];
              const insertAt = Math.min(
                removedIndex >= 0 ? removedIndex : 0,
                next.length
              );
              next.splice(insertAt, 0, removed!);
              return next;
            });
          }
          return success;
        }
      } catch (err) {
        console.error('Failed to remove favorite:', err);

        if (removed) {
          setFavorites((prev) => {
            if (prev.some((r) => r.id === id)) return prev;
            const next = [...prev];
            const insertAt = Math.min(
              removedIndex >= 0 ? removedIndex : 0,
              next.length
            );
            next.splice(insertAt, 0, removed!);
            return next;
          });
        }

        setError(err instanceof Error ? err.message : 'Failed to remove recipe');
        return false;
      }
    },
    [isLoggedIn, user, updatePendingCount]
  );

  const removeFavoriteByUrl = useCallback(
    async (url: string): Promise<boolean> => {
      try {
        if (isLoggedIn && user) {
          // Find the recipe first
          const recipe = favorites.find((r) => r.source.url === url);
          if (recipe && recipe.id) {
            return removeFavorite(recipe.id);
          }

          // If not in local state, try to find in cloud
          if (isOnline()) {
            const existing = await getRecipeBySourceUrl(user.id, url);
            if (existing.data) {
              return removeFavorite(existing.data.id);
            }
          }
          return false;
        } else {
          // Remove from localStorage
          const success = removeLocalFavoriteByUrl(url);
          if (success) {
            setFavorites((prev) => prev.filter((r) => r.source.url !== url));
          }
          return success;
        }
      } catch (err) {
        console.error('Failed to remove favorite by URL:', err);
        return false;
      }
    },
    [isLoggedIn, user, favorites, removeFavorite]
  );

  const isFavorite = useCallback(
    async (sourceUrl: string): Promise<boolean> => {
      // Check local state first (fastest)
      if (favorites.some((r) => r.source.url === sourceUrl)) {
        return true;
      }

      if (isLoggedIn && user) {
        // Only check cloud if online
        if (isOnline()) {
          const existing = await getRecipeBySourceUrl(user.id, sourceUrl);
          return !!existing.data;
        }
        return false;
      } else {
        return isLocalFavorite(sourceUrl);
      }
    },
    [isLoggedIn, user, favorites]
  );

  const getFavoriteByUrl = useCallback(
    async (sourceUrl: string): Promise<SavedRecipe | null> => {
      // Check local state first
      const localMatch = favorites.find((r) => r.source.url === sourceUrl);
      if (localMatch) {
        return localMatch;
      }

      try {
        if (isLoggedIn && user && isOnline()) {
          const result = await getRecipeBySourceUrl(user.id, sourceUrl);
          if (result.data) {
            return dbRecipeToSavedRecipe(result.data);
          }
          return null;
        } else {
          return getLocalFavoriteByUrl(sourceUrl);
        }
      } catch (err) {
        console.error('Failed to get favorite by URL:', err);
        return null;
      }
    },
    [isLoggedIn, user, favorites]
  );

  const searchFavoritesHandler = useCallback(
    async (query: string): Promise<SavedRecipe[]> => {
      try {
        if (!query.trim()) {
          return favorites;
        }

        if (isLoggedIn && user && isOnline()) {
          const result = await searchRecipes(user.id, query);
          if (result.error) {
            throw result.error;
          }
          return result.data.map(dbRecipeToSavedRecipe);
        } else {
          // Search locally (either localStorage or cached favorites)
          const q = query.toLowerCase().trim();
          return favorites.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              r.description?.toLowerCase().includes(q) ||
              r.author?.toLowerCase().includes(q) ||
              r.tags?.some((t) => t.toLowerCase().includes(q))
          );
        }
      } catch (err) {
        console.error('Failed to search favorites:', err);
        return [];
      }
    },
    [isLoggedIn, user, favorites]
  );

  const updateNotesHandler = useCallback(
    async (id: string, notes: string): Promise<boolean> => {
      try {
        if (isLoggedIn && user) {
          // Update with sync support
          const result = await updateRecipeWithSync(id, user.id, { notes });
          if (result) {
            setFavorites((prev) =>
              prev.map((r) => (r.id === id ? { ...r, notes } : r))
            );
            await updatePendingCount();
            return true;
          }
          return false;
        } else {
          const updated = updateLocalNotes(id, notes);
          if (updated) {
            setFavorites((prev) =>
              prev.map((r) => (r.id === id ? { ...r, notes } : r))
            );
            return true;
          }
          return false;
        }
      } catch (err) {
        console.error('Failed to update notes:', err);
        return false;
      }
    },
    [isLoggedIn, user, updatePendingCount]
  );

  const dismissMigrationPrompt = useCallback(() => {
    setShowMigrationPrompt(false);
  }, []);

  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  const value: FavoritesContextType = {
    favorites,
    loading,
    error,
    isOffline,
    pendingChanges,
    showMigrationPrompt,
    localRecipesCount,
    dismissMigrationPrompt,
    loadFavorites,
    addFavorite,
    removeFavorite,
    removeFavoriteByUrl,
    isFavorite,
    getFavoriteByUrl,
    searchFavorites: searchFavoritesHandler,
    updateNotes: updateNotesHandler,
    refreshFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

export default FavoritesContext;
