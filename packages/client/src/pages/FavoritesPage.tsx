/**
 * Favorites page - displays all saved recipes
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/favorites/SearchBar';
import FavoritesList from '../components/favorites/FavoritesList';
import {
  SavedRecipe,
  getAllFavorites,
  searchFavorites,
  removeFavorite,
} from '../services/favorites';
import './FavoritesPage.css';

function FavoritesPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmRemove, setConfirmRemove] = useState<SavedRecipe | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const allFavorites = getAllFavorites();
    setRecipes(allFavorites);
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = searchFavorites(query);
      setRecipes(results);
    } else {
      loadFavorites();
    }
  }, []);

  const handleSelect = (recipe: SavedRecipe) => {
    // Navigate to home with the recipe to load
    navigate('/', { state: { recipe } });
  };

  const handleRemove = (recipe: SavedRecipe) => {
    setConfirmRemove(recipe);
  };

  const confirmRemoveRecipe = () => {
    if (confirmRemove) {
      removeFavorite(confirmRemove.id!);
      setConfirmRemove(null);
      // Reload the list
      if (searchQuery.trim()) {
        setRecipes(searchFavorites(searchQuery));
      } else {
        loadFavorites();
      }
    }
  };

  const cancelRemove = () => {
    setConfirmRemove(null);
  };

  return (
    <div className="favorites-page">
      <div className="favorites-page__header">
        <h1>My Saved Recipes</h1>
        <p className="favorites-page__count">
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} saved
        </p>
      </div>

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
            <h3>Remove Recipe?</h3>
            <p>
              Are you sure you want to remove "{confirmRemove.title}" from your
              favorites?
            </p>
            <div className="favorites-page__modal-actions">
              <button
                className="favorites-page__modal-cancel"
                onClick={cancelRemove}
              >
                Cancel
              </button>
              <button
                className="favorites-page__modal-confirm"
                onClick={confirmRemoveRecipe}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FavoritesPage;
