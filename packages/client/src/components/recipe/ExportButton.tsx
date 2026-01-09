/**
 * Export button component for copying recipe to clipboard
 */

import { useState } from 'react';
import { ScaledRecipe } from '@recipe-journal/shared';
import './ExportButton.css';

interface ExportButtonProps {
  recipe: ScaledRecipe;
}

function ExportButton({ recipe }: ExportButtonProps) {
  const [copied, setCopied] = useState(false);

  const formatRecipeForClipboard = (): string => {
    const lines: string[] = [];

    // Title
    lines.push(recipe.title);
    lines.push('='.repeat(recipe.title.length));
    lines.push('');

    // Source
    lines.push(`Source: ${recipe.source.url}`);
    lines.push('');

    // Servings
    lines.push(
      `Servings: ${recipe.scaling.scaledServings.amount} ${recipe.scaling.scaledServings.unit || 'servings'} (scaled ${recipe.scaling.multiplier}x)`
    );
    lines.push('');

    // Ingredients
    lines.push('INGREDIENTS');
    lines.push('-'.repeat(11));
    recipe.scaledIngredients.forEach((ingredient) => {
      lines.push(`- ${ingredient.displayText}`);
    });
    lines.push('');

    // Instructions
    lines.push('INSTRUCTIONS');
    lines.push('-'.repeat(12));
    recipe.instructions.forEach((instruction) => {
      lines.push(`${instruction.step}. ${instruction.text}`);
      lines.push('');
    });

    // Scaling tips
    if (recipe.scalingTips && recipe.scalingTips.length > 0) {
      lines.push('COOKING TIPS');
      lines.push('-'.repeat(12));
      recipe.scalingTips.forEach((tip) => {
        lines.push(`* ${tip}`);
      });
    }

    lines.push('');
    lines.push('---');
    lines.push('Scaled with Recipe Journal');

    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      const text = formatRecipeForClipboard();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="export-section">
      <button className={`export-button ${copied ? 'export-button--success' : ''}`} onClick={handleCopy}>
        {copied ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy to Clipboard
          </>
        )}
      </button>
    </div>
  );
}

export default ExportButton;
