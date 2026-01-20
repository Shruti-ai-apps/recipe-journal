'use client';

/**
 * List of favorite recipes
 */

import { SavedRecipe } from '@/services/favorites';
import FavoriteCard from './FavoriteCard';
import './FavoritesList.css';

interface FavoritesListProps {
  recipes: SavedRecipe[];
  onSelect: (recipe: SavedRecipe) => void;
  onRemove: (recipe: SavedRecipe) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelected?: (recipe: SavedRecipe) => void;
  emptyMessage?: string;
}

function FavoritesList({
  recipes,
  onSelect,
  onRemove,
  selectionMode = false,
  selectedIds,
  onToggleSelected,
  emptyMessage = 'No saved recipes yet',
}: FavoritesListProps) {
  if (recipes.length === 0) {
    return (
      <div className="favorites-list__empty">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="favorites-list__empty-icon"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <p>{emptyMessage}</p>
        <span className="favorites-list__empty-hint">
          Import a recipe and save it to see it here
        </span>
      </div>
    );
  }

  return (
    <div className="favorites-list">
      {recipes.map((recipe) => (
        <FavoriteCard
          key={recipe.id}
          recipe={recipe}
          onSelect={onSelect}
          onRemove={onRemove}
          selectionMode={selectionMode}
          selected={selectedIds?.has(recipe.id ?? '') ?? false}
          onToggleSelected={onToggleSelected}
        />
      ))}
    </div>
  );
}

export default FavoritesList;
