'use client';

/**
 * Recipe card component displaying recipe metadata
 */

import { Recipe, ServingInfo } from '@/types';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  scaledServings?: ServingInfo;
  multiplier?: number;
}

function RecipeCard({ recipe, scaledServings, multiplier = 1 }: RecipeCardProps) {
  const formatTime = (minutes: number | undefined): string => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <article className="recipe-card">
      {recipe.image && (
        <div className="recipe-image-wrapper">
          <img src={recipe.image} alt={recipe.title} className="recipe-image" />
        </div>
      )}

      <div className="recipe-info">
        <h1 className="recipe-title">{recipe.title}</h1>

        {recipe.author && <p className="recipe-author">By {recipe.author}</p>}

        {recipe.description && <p className="recipe-description">{recipe.description}</p>}

        <div className="recipe-meta">
          {recipe.prepTime && (
            <div className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                <strong>Prep:</strong> {formatTime(recipe.prepTime)}
              </span>
            </div>
          )}

          {recipe.cookTime && (
            <div className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <span>
                <strong>Cook:</strong> {formatTime(recipe.cookTime)}
              </span>
            </div>
          )}

          {recipe.totalTime && (
            <div className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>
                <strong>Total:</strong> {formatTime(recipe.totalTime)}
              </span>
            </div>
          )}

          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>
              <strong>Servings:</strong>{' '}
              {scaledServings
                ? `${scaledServings.amount} ${scaledServings.unit || 'servings'}`
                : recipe.servings.originalText}
              {multiplier !== 1 && (
                <span className="scale-badge">({multiplier}x)</span>
              )}
            </span>
          </div>
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="recipe-tags">
            {recipe.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        <a
          href={recipe.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          View original on {recipe.source.domain}
        </a>
      </div>
    </article>
  );
}

export default RecipeCard;
