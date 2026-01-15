'use client';

/**
 * Home page - URL input and recipe display
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Recipe, ScaledRecipe, ScalingOptions } from '@/types';
import UrlInput from '@/components/recipe/UrlInput';
import RecipeCard from '@/components/recipe/RecipeCard';
import ScalingControls from '@/components/recipe/ScalingControls';
import IngredientList from '@/components/recipe/IngredientList';
import InstructionsList from '@/components/recipe/InstructionsList';
import ExportButton from '@/components/recipe/ExportButton';
import SaveButton from '@/components/recipe/SaveButton';
import SmartScaleToggle from '@/components/recipe/SmartScaleToggle';
import ScalingTips from '@/components/recipe/ScalingTips';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import FavoriteCard from '@/components/favorites/FavoriteCard';
import { parseRecipe, scaleRecipe, smartScaleRecipe } from '@/services/api';
import { SmartScaledIngredient } from '@/types/api.types';
import {
  SavedRecipe,
  getRecentFavorites,
  removeFavorite,
} from '@/services/favorites';
import './page.css';

export default function HomePage() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [scaledRecipe, setScaledRecipe] = useState<ScaledRecipe | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentFavorites, setRecentFavorites] = useState<SavedRecipe[]>([]);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Smart scaling state
  const [smartScaleEnabled, setSmartScaleEnabled] = useState(false);
  const [smartScaleLoading, setSmartScaleLoading] = useState(false);
  const [smartScaledIngredients, setSmartScaledIngredients] = useState<SmartScaledIngredient[] | null>(null);
  const [scalingTips, setScalingTips] = useState<string[]>([]);
  const [cookingTimeAdjustment, setCookingTimeAdjustment] = useState<string | undefined>(undefined);
  const [isAIPowered, setIsAIPowered] = useState(false);

  // Load recent favorites on mount
  useEffect(() => {
    loadRecentFavorites();
  }, []);

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

      // If smart scaling is enabled, also get AI-powered scaling
      if (smartScaleEnabled) {
        setSmartScaleLoading(true);
        try {
          const smartResult = await smartScaleRecipe(recipe, newMultiplier, recipe.id);
          setSmartScaledIngredients(smartResult.ingredients);
          setScalingTips(smartResult.tips);
          setCookingTimeAdjustment(smartResult.cookingTimeAdjustment);
          setIsAIPowered(smartResult.success);
        } catch (smartErr) {
          // Fallback to regular scaling - don't show error since regular scaling worked
          console.warn('Smart scaling failed, using regular scaling:', smartErr);
          setSmartScaledIngredients(null);
          setScalingTips(scaled.scalingTips || []);
          setCookingTimeAdjustment(undefined);
          setIsAIPowered(false);
        } finally {
          setSmartScaleLoading(false);
        }
      } else {
        // Clear smart scaling data when disabled
        setSmartScaledIngredients(null);
        setScalingTips(scaled.scalingTips || []);
        setCookingTimeAdjustment(undefined);
        setIsAIPowered(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scale recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartScaleToggle = async (enabled: boolean) => {
    setSmartScaleEnabled(enabled);

    // If enabling and we have a recipe with non-1x multiplier, fetch smart scaling
    if (enabled && recipe && multiplier !== 1) {
      setSmartScaleLoading(true);
      try {
        const smartResult = await smartScaleRecipe(recipe, multiplier, recipe.id);
        setSmartScaledIngredients(smartResult.ingredients);
        setScalingTips(smartResult.tips);
        setCookingTimeAdjustment(smartResult.cookingTimeAdjustment);
        setIsAIPowered(smartResult.success);
      } catch (err) {
        console.warn('Smart scaling failed:', err);
        setSmartScaledIngredients(null);
        setIsAIPowered(false);
      } finally {
        setSmartScaleLoading(false);
      }
    } else if (!enabled) {
      // Clear smart scaling data when disabling
      setSmartScaledIngredients(null);
      setScalingTips(scaledRecipe?.scalingTips || []);
      setCookingTimeAdjustment(undefined);
      setIsAIPowered(false);
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
            <div className="scaling-controls-row">
              <ScalingControls
                currentMultiplier={multiplier}
                onScale={handleScale}
                disabled={loading}
              />
              <SmartScaleToggle
                enabled={smartScaleEnabled}
                onToggle={handleSmartScaleToggle}
                disabled={loading}
                loading={smartScaleLoading}
              />
            </div>

            <ScalingTips
              tips={scalingTips}
              cookingTimeAdjustment={cookingTimeAdjustment}
              isAIPowered={isAIPowered}
            />
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
              <IngredientList
                ingredients={smartScaledIngredients || scaledRecipe.scaledIngredients}
                showAIBadges={smartScaleEnabled && !!smartScaledIngredients}
              />
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
            <Link href="/favorites" className="recent-section__view-all">
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
