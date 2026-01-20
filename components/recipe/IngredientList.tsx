'use client';

/**
 * Ingredient list component
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ScaledIngredient } from '@/types';
import { SmartScaledIngredient } from '@/types/api.types';
import AIBadge from './AIBadge';
import './IngredientList.css';

interface IngredientListProps {
  ingredients: ScaledIngredient[] | SmartScaledIngredient[];
  showAIBadges?: boolean;
}

function isSmartScaledIngredient(
  ingredient: ScaledIngredient | SmartScaledIngredient
): ingredient is SmartScaledIngredient {
  return 'aiAdjusted' in ingredient;
}

function IngredientList({ ingredients, showAIBadges = false }: IngredientListProps) {
  const rootRef = useRef<HTMLUListElement | null>(null);
  const [openOriginalId, setOpenOriginalId] = useState<string | null>(null);

  const parseWarningTitle = useMemo(
    () => 'Parsing is uncertain — please double-check this ingredient.',
    []
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;

      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpenOriginalId(null);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  return (
    <ul className="ingredient-list" ref={rootRef}>
      {ingredients.map((ingredient) => {
        const isAIAdjusted =
          showAIBadges &&
          isSmartScaledIngredient(ingredient) &&
          ingredient.aiAdjusted;
        const adjustmentReason =
          isSmartScaledIngredient(ingredient) && ingredient.aiAdjusted
            ? ingredient.adjustmentReason
            : undefined;

        const showParseWarning =
          typeof (ingredient as ScaledIngredient).parseError === 'string' ||
          ingredient.parseConfidence === 0;

        return (
          <li key={ingredient.id} className="ingredient-item">
            <span className="ingredient-text">{ingredient.displayText}</span>

            {isAIAdjusted && (
              <AIBadge reason={adjustmentReason} size="small" />
            )}

            {showParseWarning && (
              <span className="ingredient-warning" title={parseWarningTitle}>
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
                onClick={() =>
                  setOpenOriginalId((prev) => (prev === ingredient.id ? null : ingredient.id))
                }
                title="Show original"
                aria-expanded={openOriginalId === ingredient.id}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span
                  className={`original-tooltip ${openOriginalId === ingredient.id ? 'visible' : ''}`}
                >
                  Original: {ingredient.original}
                </span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default IngredientList;
