/**
 * Prompts for Gemini Smart Scaling
 */

import { ParsedIngredient } from '@/types';

/**
 * System instruction for the scaling AI
 */
export const SYSTEM_INSTRUCTION = `You are a professional chef and culinary expert specializing in recipe scaling.
You understand the science of cooking and how ingredients interact differently at various quantities.
Always provide practical, actionable advice.

IMPORTANT: Respond ONLY with valid JSON. No markdown formatting, no code blocks, no explanations outside the JSON structure.`;

/**
 * Build the scaling prompt for ingredients
 */
export function buildScalingPrompt(
  ingredients: ParsedIngredient[],
  multiplier: number,
  originalServings?: number
): string {
  const ingredientsList = ingredients
    .map((ing, i) => `${i + 1}. ${ing.original}`)
    .join('\n');

  const servingsInfo = originalServings
    ? ` (from ${originalServings} to ${Math.round(originalServings * multiplier)} servings)`
    : '';

  return `Scale this recipe by ${multiplier}x${servingsInfo}.

## Ingredients to Scale:
${ingredientsList}

## Scaling Rules:
1. **Discrete items** (eggs, lemons, avocados, bananas): Round to nearest whole number. Never use fractions of eggs.
2. **Leavening agents** (baking powder, baking soda, yeast): Scale at 75% for multipliers > 2x to prevent over-rising.
3. **Seasonings & spices** (salt, pepper, cumin, chili, cinnamon): Scale at 80% for multipliers > 2x - can always add more to taste.
4. **Fats** (butter, oil, ghee): Scale linearly but note if amount seems excessive for large batches.
5. **Liquids** (water, broth, milk): Scale linearly but may need 5-10% reduction for 3x+ batches.
6. **Everything else** (flour, sugar, vegetables): Scale linearly by the exact multiplier.

## Output Format:
Respond with ONLY this JSON structure (no markdown, no backticks, no extra text):
{
  "ingredients": [
    {
      "index": 0,
      "originalText": "2 large eggs",
      "scaledQuantity": 4,
      "scaledUnit": "",
      "displayText": "4 large eggs",
      "aiAdjusted": true,
      "adjustmentReason": "Rounded to whole eggs",
      "category": "discrete"
    }
  ],
  "tips": [
    "When doubling eggs, beat them together before adding to ensure even distribution"
  ],
  "cookingTimeAdjustment": "Increase baking time by 10-15 minutes for doubled batch"
}

Rules for the JSON:
- "index" must match the ingredient number (0-indexed)
- "scaledQuantity" is the numeric value after scaling
- "scaledUnit" is the unit (empty string if none, like for eggs)
- "displayText" is the human-readable scaled ingredient text
- "aiAdjusted" is true if you modified beyond simple multiplication
- "adjustmentReason" explains why (only if aiAdjusted is true)
- "category" is one of: linear, discrete, leavening, seasoning, fat, liquid
- "tips" array should have 1-3 practical cooking tips for this scale
- "cookingTimeAdjustment" is optional, include only if relevant

Scale each ingredient now:`;
}

/**
 * Build a simpler prompt for small multipliers (0.5x to 1.5x)
 * where less AI intelligence is needed
 */
export function buildSimpleScalingPrompt(
  ingredients: ParsedIngredient[],
  multiplier: number
): string {
  const ingredientsList = ingredients
    .map((ing, i) => `${i}. ${ing.original}`)
    .join('\n');

  return `Scale by ${multiplier}x. Focus only on discrete items (eggs) that need rounding.

Ingredients:
${ingredientsList}

Respond with JSON only:
{
  "ingredients": [{"index": 0, "scaledQuantity": 2, "scaledUnit": "", "displayText": "2 eggs", "aiAdjusted": false, "category": "discrete"}],
  "tips": []
}`;
}
