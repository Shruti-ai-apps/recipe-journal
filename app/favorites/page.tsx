'use client';

/**
 * Favorites page - displays all saved recipes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/favorites/SearchBar';
import FavoritesList from '@/components/favorites/FavoritesList';
import { useFavorites } from '@/contexts/FavoritesContext';
import { SavedRecipe } from '@/services/favorites';
import './page.css';

type ConfirmRemoveState =
  | { kind: 'single'; recipe: SavedRecipe }
  | { kind: 'bulk'; ids: string[] }
  | { kind: 'all'; ids: string[] };

export default function FavoritesPage() {
  const router = useRouter();
  const {
    favorites,
    loading,
    searchFavorites: searchFavoritesContext,
    removeFavorite: removeFavoriteContext,
  } = useFavorites();

  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmRemove, setConfirmRemove] = useState<ConfirmRemoveState | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const favoritesRef = useRef<SavedRecipe[]>([]);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  // Update recipes when favorites change
  useEffect(() => {
    if (!loading) {
      // Don't clobber search results while the user is filtering.
      if (!searchQuery.trim()) {
        setRecipes(favorites);
      }
    }
  }, [favorites, loading, searchQuery]);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      setActionMessage(null);

      if (query.trim()) {
        const results = await searchFavoritesContext(query);
        setRecipes(results);
      } else {
        setRecipes(favoritesRef.current);
      }
    },
    [searchFavoritesContext]
  );

  const handleSelect = (recipe: SavedRecipe) => {
    if (selectionMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (recipe.id && next.has(recipe.id)) next.delete(recipe.id);
        else if (recipe.id) next.add(recipe.id);
        return next;
      });
      return;
    }
    // Store recipe in sessionStorage for the home page to pick up
    sessionStorage.setItem('selectedRecipe', JSON.stringify(recipe));
    router.push('/');
  };

  const handleRemove = (recipe: SavedRecipe) => {
    setConfirmRemove({ kind: 'single', recipe });
  };

  // Clear selections that are no longer visible.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (!selectionMode) return prev;
      const visible = new Set(recipes.map((r) => r.id).filter(Boolean) as string[]);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next;
    });
  }, [recipes, selectionMode]);

  const startBulkRemove = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setConfirmRemove({ kind: 'bulk', ids });
  };

  const startRemoveAll = () => {
    const ids = favorites.map((r) => r.id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    setConfirmRemove({ kind: 'all', ids });
  };

  const performRemove = async (ids: string[]) => {
    if (ids.length === 0) return;

    setIsRemoving(true);
    setActionMessage(null);

    // Optimistically remove from the currently visible list to keep UI snappy.
    setRecipes((prev) => prev.filter((r) => !ids.includes(r.id ?? '')));
    setSelectedIds(new Set());

    const results = await Promise.all(ids.map((id) => removeFavoriteContext(id)));
    const failed = ids.filter((_, idx) => !results[idx]);

    if (failed.length > 0) {
      setActionMessage({
        type: 'error',
        text: `Could not remove ${failed.length} recipe${failed.length === 1 ? '' : 's'}. Please try again.`,
      });

      // Refresh current view on partial failure.
      if (searchQuery.trim()) {
        const refreshed = await searchFavoritesContext(searchQuery);
        setRecipes(refreshed);
      } else {
        setRecipes(favoritesRef.current);
      }
    } else {
      setActionMessage({
        type: 'success',
        text: `Removed ${ids.length} recipe${ids.length === 1 ? '' : 's'} from favorites.`,
      });
    }

    setIsRemoving(false);
  };

  const confirmRemoveRecipe = async () => {
    if (!confirmRemove) return;

    const ids =
      confirmRemove.kind === 'single'
        ? confirmRemove.recipe.id
          ? [confirmRemove.recipe.id]
          : []
        : confirmRemove.ids;

    setConfirmRemove(null);
    await performRemove(ids);
  };

  const cancelRemove = () => {
    setConfirmRemove(null);
  };

  const toggleSelectionMode = () => {
    setActionMessage(null);
    setConfirmRemove(null);
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const selectAllVisible = () => {
    setSelectedIds(
      new Set(recipes.map((r) => r.id).filter(Boolean) as string[])
    );
  };

  const clearSelection = () => setSelectedIds(new Set());

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="favorites-page__header">
          <h1>My Saved Recipes</h1>
          <p className="favorites-page__count">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="favorites-page__header">
        <h1>My Saved Recipes</h1>
        <p className="favorites-page__count">
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} saved
        </p>
      </div>

      <div className="favorites-page__actions">
        <button
          type="button"
          className="favorites-page__action"
          onClick={toggleSelectionMode}
          aria-pressed={selectionMode}
        >
          {selectionMode ? 'Done' : 'Select'}
        </button>

        {selectionMode && (
          <div className="favorites-page__bulk-actions" aria-label="Bulk actions">
            <span className="favorites-page__selected-count">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              className="favorites-page__action"
              onClick={selectAllVisible}
              disabled={recipes.length === 0}
            >
              Select all
            </button>
            <button
              type="button"
              className="favorites-page__action"
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
            >
              Clear
            </button>
            <button
              type="button"
              className="favorites-page__action favorites-page__action--danger"
              onClick={startBulkRemove}
              disabled={selectedIds.size === 0 || isRemoving}
            >
              Remove selected
            </button>

            {!searchQuery.trim() && (
              <button
                type="button"
                className="favorites-page__action favorites-page__action--danger"
                onClick={startRemoveAll}
                disabled={favorites.length === 0 || isRemoving}
              >
                Remove all
              </button>
            )}
          </div>
        )}
      </div>

      {actionMessage && (
        <div
          className={[
            'favorites-page__message',
            actionMessage.type === 'error'
              ? 'favorites-page__message--error'
              : 'favorites-page__message--success',
          ].join(' ')}
          role={actionMessage.type === 'error' ? 'alert' : 'status'}
        >
          {actionMessage.text}
        </div>
      )}

      <div className="favorites-page__search">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search by title, ingredient, or tag..."
        />
      </div>

      <FavoritesList
        recipes={recipes}
        onSelect={handleSelect}
        onRemove={handleRemove}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelected={handleSelect}
        emptyMessage={
          searchQuery
            ? `No recipes found for "${searchQuery}"`
            : 'No saved recipes yet'
        }
      />

      {/* Confirmation Modal */}
      {confirmRemove && (
        <div className="favorites-page__modal-overlay" onClick={cancelRemove}>
          <div
            className="favorites-page__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {confirmRemove.kind === 'single'
                ? 'Remove Recipe?'
                : confirmRemove.kind === 'all'
                  ? 'Remove All Recipes?'
                  : 'Remove Selected Recipes?'}
            </h3>
            <p>
              {confirmRemove.kind === 'single' ? (
                <>
                  Are you sure you want to remove &ldquo;{confirmRemove.recipe.title}&rdquo; from
                  your favorites?
                </>
              ) : (
                <>
                  Are you sure you want to remove{' '}
                  <strong>{confirmRemove.ids.length}</strong>{' '}
                  {confirmRemove.ids.length === 1 ? 'recipe' : 'recipes'} from your favorites?
                </>
              )}
            </p>
            <div className="favorites-page__modal-actions">
              <button
                className="favorites-page__modal-cancel"
                onClick={cancelRemove}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                className="favorites-page__modal-confirm"
                onClick={confirmRemoveRecipe}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
