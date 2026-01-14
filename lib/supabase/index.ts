// Browser client - use in Client Components
export { createClient, isSupabaseConfigured } from './client';

// Server client - use in Server Components
export { createClient as createServerClient } from './server';

// Middleware helper - use in middleware.ts
export { updateSession } from './middleware';

// Database types
export type {
  DbRecipe,
  NewDbRecipe,
  DbRecipeUpdate,
  DbQueryResult,
  DbListResult,
} from './types';

// Recipe CRUD operations
export {
  getRecipes,
  getRecipeById,
  getFavorites,
  searchRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  hardDeleteRecipe,
  updateLastViewed,
  toggleFavorite,
  updateNotes,
  updateTags,
  upsertRecipes,
  getRecipeCount,
  getRecipeBySourceUrl,
} from './recipes';
