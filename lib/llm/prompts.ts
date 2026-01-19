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
    // Use 0-based indices to match the required JSON "index" field
    .map((ing, i) => `${i}. ${ing.original}`)
    .join('\n');

  const servingsInfo = originalServings
    ? ` (from ${originalServings} to ${Math.round(originalServings * multiplier)} servings)`
    : '';

  return `Scale this recipe by ${multiplier}x${servingsInfo}.

## Ingredients:
${ingredientsList}

## Task:
- Identify ingredients that need special handling when scaling (e.g., eggs/discrete items, leavening, seasonings).
- Provide practical guidance and 1-3 concise tips for this scale.
- Do NOT output scaled quantities or rewritten ingredient strings. Quantities and display formatting are handled deterministically by the app.

## Output Format:
Respond with ONLY this JSON structure (no markdown, no backticks, no extra text):
{
  "ingredients": [
    {
      "index": 0,
      "aiAdjusted": true,
      "adjustmentReason": "Practical guidance for fractional eggs (beat and use portion)",
      "category": "discrete"
    }
  ],
  "tips": [
    "If eggs scale to a fraction, beat the egg and measure out the needed portion."
  ],
  "cookingTimeAdjustment": "Optional: adjust bake time when scaling up"
}

Rules for the JSON:
- "index" must match the ingredient number (0-indexed)
- "aiAdjusted" is true only when special handling or practical guidance is needed
- "adjustmentReason" is required when aiAdjusted is true
- "category" is one of: linear, discrete, leavening, seasoning, fat, liquid
- "tips" should have 1-3 practical tips for this scale (empty array allowed)
- "cookingTimeAdjustment" is optional; omit when not relevant

Return JSON now:`;
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

  return `Scale by ${multiplier}x. Focus only on ingredients that need special handling (e.g., eggs/discrete items).

Ingredients:
${ingredientsList}

Respond with JSON only:
{
  "ingredients": [{"index": 0, "aiAdjusted": false, "category": "discrete"}],
  "tips": []
}`;
}
