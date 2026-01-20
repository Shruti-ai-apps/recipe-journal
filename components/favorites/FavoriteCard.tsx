'use client';

/**
 * Favorite card component for displaying saved recipes
 */

import { SavedRecipe } from '@/services/favorites';
import './FavoriteCard.css';

interface FavoriteCardProps {
  recipe: SavedRecipe;
  onSelect: (recipe: SavedRecipe) => void;
  onRemove: (recipe: SavedRecipe) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: (recipe: SavedRecipe) => void;
}

function FavoriteCard({
  recipe,
  onSelect,
  onRemove,
  selectionMode = false,
  selected = false,
  onToggleSelected,
}: FavoriteCardProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const formatTime = (minutes: number | undefined): string => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(recipe);
  };

  const handleToggleSelected = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelected?.(recipe);
  };

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelected?.(recipe);
      return;
    }
    onSelect(recipe);
  };

  return (
    <article
      className={[
        'favorite-card',
        selectionMode ? 'favorite-card--selectable' : '',
        selectionMode && selected ? 'favorite-card--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleCardClick}
    >
      {selectionMode && (
        <button
          type="button"
          className="favorite-card__select"
          onClick={handleToggleSelected}
          aria-pressed={selected}
          aria-label={selected ? 'Deselect recipe' : 'Select recipe'}
          title={selected ? 'Deselect' : 'Select'}
        >
          <span className="favorite-card__select-box" aria-hidden="true">
            {selected && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        </button>
      )}

      {recipe.image ? (
        <div className="favorite-card__image">
          <img src={recipe.image} alt={recipe.title} loading="lazy" />
        </div>
      ) : (
        <div className="favorite-card__image favorite-card__image--placeholder">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}

      <div className="favorite-card__content">
        <h3 className="favorite-card__title">{recipe.title}</h3>

        <div className="favorite-card__meta">
          <span className="favorite-card__source">{recipe.source.domain}</span>
          {recipe.totalTime && (
            <span className="favorite-card__time">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatTime(recipe.totalTime)}
            </span>
          )}
          <span className="favorite-card__servings">
            {recipe.servings.amount} {recipe.servings.unit || 'servings'}
          </span>
        </div>

        <div className="favorite-card__footer">
          <span className="favorite-card__date">Saved {formatDate(recipe.savedAt)}</span>

          {recipe.notes && (
            <span className="favorite-card__has-notes" title="Has notes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
          )}
        </div>

        {recipe.userTags.length > 0 && (
          <div className="favorite-card__tags">
            {recipe.userTags.slice(0, 3).map((tag) => (
              <span key={tag} className="favorite-card__tag">
                {tag}
              </span>
            ))}
            {recipe.userTags.length > 3 && (
              <span className="favorite-card__tag favorite-card__tag--more">
                +{recipe.userTags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        className="favorite-card__remove"
        onClick={handleRemove}
        title="Remove from favorites"
        aria-label="Remove from favorites"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </article>
  );
}

export default FavoriteCard;
