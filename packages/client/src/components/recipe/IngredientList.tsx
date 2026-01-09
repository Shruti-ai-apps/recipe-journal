/**
 * Ingredient list component
 */

import { ScaledIngredient } from '@recipe-journal/shared';
import './IngredientList.css';

interface IngredientListProps {
  ingredients: ScaledIngredient[];
}

function IngredientList({ ingredients }: IngredientListProps) {
  return (
    <ul className="ingredient-list">
      {ingredients.map((ingredient) => (
        <li key={ingredient.id} className="ingredient-item">
          <span className="ingredient-text">{ingredient.displayText}</span>

          {ingredient.parseConfidence < 0.8 && (
            <span className="ingredient-warning" title="This ingredient may not have been parsed correctly">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
          )}

          {ingredient.original !== ingredient.displayText && (
            <button
              className="original-toggle"
              onClick={(e) => {
                const target = e.currentTarget;
                const tooltip = target.querySelector('.original-tooltip');
                if (tooltip) {
                  tooltip.classList.toggle('visible');
                }
              }}
              title="Show original"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span className="original-tooltip">Original: {ingredient.original}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default IngredientList;
