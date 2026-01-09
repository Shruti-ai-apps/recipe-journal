/**
 * Save/Unsave button component for recipes
 */

import { useState, useEffect } from 'react';
import { Recipe } from '@recipe-journal/shared';
import { isFavorite, saveFavorite, removeFavoriteByUrl } from '../../services/favorites';
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
  const [saved, setSaved] = useState<boolean>(false);
  const [animating, setAnimating] = useState<boolean>(false);

  useEffect(() => {
    setSaved(isFavorite(recipe.source.url));
  }, [recipe.source.url]);

  const handleClick = () => {
    setAnimating(true);

    if (saved) {
      removeFavoriteByUrl(recipe.source.url);
      setSaved(false);
      onSaveChange?.(false);
    } else {
      saveFavorite(recipe, { multiplier });
      setSaved(true);
      onSaveChange?.(true);
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
