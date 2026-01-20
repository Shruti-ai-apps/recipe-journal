'use client';

/**
 * Home page - URL input and recipe display
 */

import { useEffect, useRef, useState } from 'react';
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

  // Guards against async smart-scale responses updating state for a different recipe.
  const smartScaleRequestTokenRef = useRef(0);
  const activeRecipeUrlRef = useRef<string | null>(null);
  const smartScaleDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smartScaleAbortRef = useRef<AbortController | null>(null);

  // Load recent favorites on mount
  useEffect(() => {
    loadRecentFavorites();
  }, []);

  const cancelPendingSmartScale = () => {
    if (smartScaleDebounceTimerRef.current) {
      clearTimeout(smartScaleDebounceTimerRef.current);
      smartScaleDebounceTimerRef.current = null;
    }
    if (smartScaleAbortRef.current) {
      smartScaleAbortRef.current.abort();
      smartScaleAbortRef.current = null;
    }
  };

  const resetSmartScaleState = (tips: string[] = []) => {
    // Invalidate any in-flight smart scale requests so late responses are ignored
    smartScaleRequestTokenRef.current += 1;

    cancelPendingSmartScale();
    setSmartScaleLoading(false);
    setSmartScaledIngredients(null);
    setScalingTips(tips);
    setCookingTimeAdjustment(undefined);
    setIsAIPowered(false);
  };

  const scheduleSmartScale = (
    recipeToScale: Recipe,
    multiplierToScale: number,
    fallbackTips: string[],
    delayMs: number = 250
  ) => {
    cancelPendingSmartScale();

    const requestToken = smartScaleRequestTokenRef.current + 1;
    smartScaleRequestTokenRef.current = requestToken;
    const recipeUrlAtRequest = recipeToScale.source.url;

    smartScaleDebounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      smartScaleAbortRef.current = controller;

      setSmartScaleLoading(true);
      try {
        const smartResult = await smartScaleRecipe(
          recipeToScale,
          multiplierToScale,
          recipeToScale.id,
          controller.signal
        );

        // Ignore late responses for a previous recipe or superseded request.
        if (
          smartScaleRequestTokenRef.current !== requestToken ||
          activeRecipeUrlRef.current !== recipeUrlAtRequest
        ) {
          return;
        }

        setSmartScaledIngredients(smartResult.ingredients);
        setScalingTips(smartResult.tips);
        setCookingTimeAdjustment(smartResult.cookingTimeAdjustment);
        setIsAIPowered(smartResult.success);
      } catch (err) {
        // Aborted due to debounce/new request; ignore.
        if (controller.signal.aborted) return;

        console.warn('Smart scaling failed, using regular scaling:', err);

        if (
          smartScaleRequestTokenRef.current !== requestToken ||
          activeRecipeUrlRef.current !== recipeUrlAtRequest
        ) {
          return;
        }

        setSmartScaledIngredients(null);
        setScalingTips(fallbackTips);
        setCookingTimeAdjustment(undefined);
        setIsAIPowered(false);
      } finally {
        if (
          smartScaleRequestTokenRef.current === requestToken &&
          activeRecipeUrlRef.current === recipeUrlAtRequest
        ) {
          setSmartScaleLoading(false);
        }
      }
    }, delayMs);
  };

  const loadRecentFavorites = () => {
    const recent = getRecentFavorites(4);
    setRecentFavorites(recent);
  };

  const loadSavedRecipe = async (savedRecipe: SavedRecipe) => {
    activeRecipeUrlRef.current = savedRecipe.source.url;
    setRecipe(savedRecipe);
    setLoading(true);
    setError(null);
    resetSmartScaleState([]);

    try {
      const initialMultiplier = savedRecipe.lastScaledMultiplier || 1;
      setMultiplier(initialMultiplier);
      const scaled = await scaleRecipe(savedRecipe, { multiplier: initialMultiplier });
      setScaledRecipe(scaled);
      setScalingTips(scaled.scalingTips || []);
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
    activeRecipeUrlRef.current = null;
    resetSmartScaleState([]);

    try {
      const parsedRecipe = await parseRecipe(url);
      activeRecipeUrlRef.current = parsedRecipe.source.url;
      setRecipe(parsedRecipe);

      // Apply initial scaling (1x)
      const scaled = await scaleRecipe(parsedRecipe, { multiplier: 1 });
      setScaledRecipe(scaled);
      setScalingTips(scaled.scalingTips || []);

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
        scheduleSmartScale(recipe, newMultiplier, scaled.scalingTips || []);
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
      scheduleSmartScale(recipe, multiplier, scaledRecipe?.scalingTips || [], 0);
    } else if (!enabled) {
      // Clear smart scaling data when disabling
      cancelPendingSmartScale();
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
