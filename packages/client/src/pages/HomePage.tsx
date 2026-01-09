/**
 * Home page - URL input and recipe display
 */

import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Recipe, ScaledRecipe, ScalingOptions } from '@recipe-journal/shared';
import UrlInput from '../components/recipe/UrlInput';
import RecipeCard from '../components/recipe/RecipeCard';
import ScalingControls from '../components/recipe/ScalingControls';
import IngredientList from '../components/recipe/IngredientList';
import InstructionsList from '../components/recipe/InstructionsList';
import ExportButton from '../components/recipe/ExportButton';
import SaveButton from '../components/recipe/SaveButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import FavoriteCard from '../components/favorites/FavoriteCard';
import { parseRecipe, scaleRecipe } from '../services/api';
import {
  SavedRecipe,
  getRecentFavorites,
  removeFavorite,
} from '../services/favorites';
import './HomePage.css';

interface LocationState {
  recipe?: SavedRecipe;
}

function HomePage() {
  const location = useLocation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [scaledRecipe, setScaledRecipe] = useState<ScaledRecipe | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentFavorites, setRecentFavorites] = useState<SavedRecipe[]>([]);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Load recent favorites on mount
  useEffect(() => {
    loadRecentFavorites();
  }, []);

  // Handle recipe passed from favorites page
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.recipe) {
      loadSavedRecipe(state.recipe);
      // Clear the state so it doesn't reload on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadRecentFavorites = () => {
    const recent = getRecentFavorites(4);
    setRecentFavorites(recent);
  };

  const loadSavedRecipe = async (savedRecipe: SavedRecipe) => {
    setRecipe(savedRecipe);
    setLoading(true);
    setError(null);

    try {
      const initialMultiplier = savedRecipe.lastScaledMultiplier || 1;
      setMultiplier(initialMultiplier);
      const scaled = await scaleRecipe(savedRecipe, { multiplier: initialMultiplier });
      setScaledRecipe(scaled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scale recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    setLoading(true);
    setError(null);
    setRecipe(null);
    setScaledRecipe(null);
    setMultiplier(1);

    try {
      const parsedRecipe = await parseRecipe(url);
      setRecipe(parsedRecipe);

      // Apply initial scaling (1x)
      const scaled = await scaleRecipe(parsedRecipe, { multiplier: 1 });
      setScaledRecipe(scaled);

      // Refresh recent favorites
      loadRecentFavorites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleScale = async (newMultiplier: number) => {
    if (!recipe) return;

    setMultiplier(newMultiplier);
    setLoading(true);
    setError(null);

    try {
      const options: ScalingOptions = { multiplier: newMultiplier };
      const scaled = await scaleRecipe(recipe, options);
      setScaledRecipe(scaled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scale recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChange = (isSaved: boolean) => {
    setSaveNotification(isSaved ? 'Recipe saved!' : 'Recipe removed');
    setTimeout(() => setSaveNotification(null), 2000);
    loadRecentFavorites();
  };

  const handleSelectRecent = (savedRecipe: SavedRecipe) => {
    loadSavedRecipe(savedRecipe);
  };

  const handleRemoveRecent = (savedRecipe: SavedRecipe) => {
    removeFavorite(savedRecipe.id!);
    loadRecentFavorites();
  };

  return (
    <div className="home-page">
      <section className="url-section">
        <h2>Paste a recipe URL to get started</h2>
        <UrlInput onSubmit={handleUrlSubmit} disabled={loading} />
      </section>

      {loading && <LoadingSpinner />}

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {saveNotification && (
        <div className="home-page__notification">{saveNotification}</div>
      )}

      {recipe && scaledRecipe && (
        <section className="recipe-section">
          <div className="recipe-header">
            <RecipeCard
              recipe={recipe}
              scaledServings={scaledRecipe.scaling.scaledServings}
              multiplier={multiplier}
            />
            <div className="recipe-actions">
              <SaveButton
                recipe={recipe}
                multiplier={multiplier}
                onSaveChange={handleSaveChange}
              />
              <ExportButton recipe={scaledRecipe} />
            </div>
          </div>

          <div className="scaling-section">
            <ScalingControls
              currentMultiplier={multiplier}
              onScale={handleScale}
              disabled={loading}
            />

            {scaledRecipe.scalingTips && scaledRecipe.scalingTips.length > 0 && (
              <div className="scaling-tips">
                <h4>Cooking Tips</h4>
                <ul>
                  {scaledRecipe.scalingTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="recipe-content">
            <div className="ingredients-panel">
              <h3>
                Ingredients
                <span className="servings">
                  ({scaledRecipe.scaling.scaledServings.amount}{' '}
                  {scaledRecipe.scaling.scaledServings.unit || 'servings'})
                </span>
              </h3>
              <IngredientList ingredients={scaledRecipe.scaledIngredients} />
            </div>

            <div className="instructions-panel">
              <h3>Instructions</h3>
              <InstructionsList instructions={scaledRecipe.instructions} />
            </div>
          </div>
        </section>
      )}

      {/* Recent favorites section - only show when no recipe is loaded */}
      {!recipe && recentFavorites.length > 0 && (
        <section className="recent-section">
          <div className="recent-section__header">
            <h3>Recent Favorites</h3>
            <Link to="/favorites" className="recent-section__view-all">
              View all
            </Link>
          </div>
          <div className="recent-section__list">
            {recentFavorites.map((fav) => (
              <FavoriteCard
                key={fav.id}
                recipe={fav}
                onSelect={handleSelectRecent}
                onRemove={handleRemoveRecent}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;
