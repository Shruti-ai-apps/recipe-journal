'use client';

/**
 * Save/Unsave button component for recipes
 */

import { useContext, useEffect, useState } from 'react';
import { Recipe } from '@/types';
import { isFavorite, saveFavorite, removeFavoriteByUrl } from '../../services/favorites';
import FavoritesContext from '@/contexts/FavoritesContext';
import './SaveButton.css';

interface SaveButtonProps {
  recipe: Recipe;
  multiplier?: number;
  onSaveChange?: (isSaved: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

function SaveButton({
  recipe,
  multiplier,
  onSaveChange,
  size = 'medium',
  showLabel = true,
}: SaveButtonProps) {
  const favoritesContext = useContext(FavoritesContext);
  const [saved, setSaved] = useState<boolean>(false);
  const [animating, setAnimating] = useState<boolean>(false);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      if (favoritesContext) {
        const isSaved = await favoritesContext.isFavorite(recipe.source.url);
        if (!canceled) setSaved(isSaved);
        return;
      }

      setSaved(isFavorite(recipe.source.url));
    };

    run();

    return () => {
      canceled = true;
    };
  }, [recipe.source.url, favoritesContext]);

  const handleClick = async () => {
    setAnimating(true);

    const nextSaved = !saved;
    setSaved(nextSaved);
    onSaveChange?.(nextSaved);

    try {
      if (favoritesContext) {
        if (nextSaved) {
          const result = await favoritesContext.addFavorite(recipe, { multiplier });
          if (!result) {
            setSaved(false);
            onSaveChange?.(false);
          }
        } else {
          const ok = await favoritesContext.removeFavoriteByUrl(recipe.source.url);
          if (!ok) {
            setSaved(true);
            onSaveChange?.(true);
          }
        }
      } else {
        if (nextSaved) {
          saveFavorite(recipe, { multiplier });
        } else {
          removeFavoriteByUrl(recipe.source.url);
        }
      }
    } catch {
      // Revert optimistic update on unexpected failure.
      setSaved(saved);
      onSaveChange?.(saved);
    }

    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <button
      className={`save-button save-button--${size} ${saved ? 'save-button--saved' : ''} ${animating ? 'save-button--animating' : ''}`}
      onClick={handleClick}
      title={saved ? 'Remove from favorites' : 'Save to favorites'}
      aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="save-button__icon"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {showLabel && (
        <span className="save-button__label">{saved ? 'Saved' : 'Save'}</span>
      )}
    </button>
  );
}

export default SaveButton;
