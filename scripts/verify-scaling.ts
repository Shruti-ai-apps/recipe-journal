/* eslint-disable no-console */
/**
 * Verify scaling correctness across a corpus of recipe URLs by calling local API routes.
 *
 * Usage:
 *   npm run dev
 *   npm run verify:scaling -- urls.txt
 *
 * Optional flags:
 *   --baseUrl=http://localhost:3000
 *   --multipliers=0.5,1,2,3,1.7
 *   --smart            (also call /api/recipes/scale-smart if configured)
 *   --delayMs=250      (delay between URLs)
 */

import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

type Json = Record<string, unknown>;

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq === -1) {
        args[a.slice(2)] = true;
      } else {
        args[a.slice(2, eq)] = a.slice(eq + 1);
      }
    } else {
      positional.push(a);
    }
  }

  return { args, positional };
}

function parseMultipliers(input: string | undefined): number[] {
  if (!input) return [0.5, 1, 2, 3, 1.7];
  return input
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function loadUrls(filePath: string): string[] {
  const raw = readFileSync(filePath, 'utf-8');
  return raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

async function postJson<T>(baseUrl: string, path: string, body: Json): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { success: boolean; data?: T; error?: { message?: string } };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }
  return json.data;
}

function approxEqual(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) <= tol;
}

function containsBadDecimal(displayValue: string): boolean {
  // We care about the common fractions we explicitly want to show as friendly text.
  // (0.5 -> 1/2, 0.25 -> 1/4, 0.75 -> 3/4, etc.)
  return /(^|[–-])0\.(5|25|75|125|375|625|875)($|[–-])/.test(displayValue);
}

function hasUnitWords(text: string): boolean {
  return /\b(teaspoon|tablespoon|cup|ounce|pound|gram|milliliter|liter)s?\b/i.test(text);
}

type ParsedIngredient = {
  original: string;
  quantity: null | { type: 'single' | 'range'; value: number; valueTo?: number };
};

type Recipe = {
  title: string;
  source: { url: string; domain: string };
  ingredients: ParsedIngredient[];
};

type ScaledIngredient = {
  original: string;
  displayText: string;
  scaledUnit: string | null;
  scaledQuantity: null | {
    value: number;
    valueTo?: number;
    displayValue: string;
    displayModifier?: string;
    originalValue: number;
    originalValueTo?: number;
  };
};

type ScaledRecipe = {
  scaling: { multiplier: number };
  scaledIngredients: ScaledIngredient[];
};

type SmartScaleData = {
  ingredients: Array<{
    original: string;
    displayText: string;
    scaledQuantity: null | { value: number; valueTo?: number; originalValue: number; originalValueTo?: number };
  }>;
  success: boolean;
};

async function main() {
  const { args, positional } = parseArgs(process.argv.slice(2));
  const urlsFile = positional[0];
  if (!urlsFile) {
    console.error('Usage: npm run verify:scaling -- urls.txt');
    process.exit(2);
  }

  const baseUrl = (args.baseUrl as string) || 'http://localhost:3000';
  const multipliers = parseMultipliers(args.multipliers as string | undefined);
  const delayMs = Number(args.delayMs || 150);
  const alsoSmart = Boolean(args.smart);

  const urls = loadUrls(urlsFile);
  if (urls.length === 0) {
    console.error('No URLs found in file');
    process.exit(2);
  }

  console.log(`Base URL: ${baseUrl}`);
  console.log(`URLs: ${urls.length}`);
  console.log(`Multipliers: ${multipliers.join(', ')}`);
  console.log(`Smart: ${alsoSmart}`);
  console.log('');

  const failures: Array<{ url: string; title?: string; issues: string[] }> = [];
  let passed = 0;

  for (const url of urls) {
    const issues: string[] = [];
    let recipe: Recipe | null = null;
    try {
      recipe = await postJson<Recipe>(baseUrl, '/api/recipes/parse', { url });
    } catch (e) {
      failures.push({ url, issues: [`parse failed: ${(e as Error).message}`] });
      console.log(`FAIL parse: ${url}`);
      if (delayMs > 0) await sleep(delayMs);
      continue;
    }

    for (const multiplier of multipliers) {
      let scaled: ScaledRecipe;
      try {
        scaled = await postJson<ScaledRecipe>(baseUrl, '/api/recipes/scale', {
          recipe,
          options: { multiplier },
        });
      } catch (e) {
        issues.push(`scale ${multiplier}x failed: ${(e as Error).message}`);
        continue;
      }

      if (!approxEqual(scaled.scaling.multiplier, multiplier)) {
        issues.push(`scale ${multiplier}x: response multiplier mismatch (${scaled.scaling.multiplier})`);
      }

      scaled.scaledIngredients.forEach((ing, idx) => {
        const sq = ing.scaledQuantity;
        if (!sq) return;

        // Friendly fractions
        if (containsBadDecimal(sq.displayValue)) {
          issues.push(`scale ${multiplier}x: non-friendly displayValue='${sq.displayValue}' for '${ing.original}'`);
        }

        // Pinch output should not include unit words in displayText
        if (sq.displayValue === 'a pinch') {
          if (hasUnitWords(ing.displayText)) {
            issues.push(`scale ${multiplier}x: pinch still shows unit in '${ing.displayText}'`);
          }
        } else {
          // Multiplier correctness (single)
          if (sq.originalValue > 0) {
            const ratio = sq.value / sq.originalValue;
            if (!approxEqual(ratio, multiplier)) {
              issues.push(`scale ${multiplier}x: ratio=${ratio} for '${ing.original}'`);
            }
          }

          // Multiplier correctness (range upper)
          if (typeof sq.valueTo === 'number' && typeof sq.originalValueTo === 'number' && sq.originalValueTo > 0) {
            const ratioTo = sq.valueTo / sq.originalValueTo;
            if (!approxEqual(ratioTo, multiplier)) {
              issues.push(`scale ${multiplier}x: range ratioTo=${ratioTo} for '${ing.original}'`);
            }
            if (!/[–-]/.test(sq.displayValue)) {
              issues.push(`scale ${multiplier}x: missing range dash for '${ing.original}'`);
            }
          }
        }

        // Cross-check: if the original ingredient was a range, scaled should keep it
        const originalIng = recipe?.ingredients?.[idx];
        if (originalIng?.quantity?.type === 'range' && typeof originalIng.quantity.valueTo === 'number') {
          if (typeof sq.valueTo !== 'number') {
            issues.push(`scale ${multiplier}x: lost range for '${ing.original}'`);
          }
        }
      });

      if (alsoSmart) {
        try {
          const smart = await postJson<{ ingredients: SmartScaleData['ingredients']; tips: string[]; success: boolean }>(
            baseUrl,
            '/api/recipes/scale-smart',
            { recipe, multiplier, recipeId: recipe.source.url }
          );

          // Ensure smart scaling remains multiplier-correct (numeric), per ingredient
          smart.ingredients.forEach((ing, idx) => {
            const sq = ing.scaledQuantity;
            if (!sq) return;
            if (sq.originalValue > 0) {
              const ratio = sq.value / sq.originalValue;
              if (!approxEqual(ratio, multiplier)) {
                issues.push(`smart ${multiplier}x: ratio=${ratio} for '${ing.original}'`);
              }
            }
            const originalIng = recipe?.ingredients?.[idx];
            if (originalIng?.quantity?.type === 'range' && typeof originalIng.quantity.valueTo === 'number') {
              if (typeof sq.valueTo !== 'number') {
                issues.push(`smart ${multiplier}x: lost range for '${ing.original}'`);
              }
            }
          });
        } catch (e) {
          issues.push(`smart ${multiplier}x failed: ${(e as Error).message}`);
        }
      }
    }

    if (issues.length) {
      failures.push({ url, title: recipe.title, issues: Array.from(new Set(issues)) });
      console.log(`FAIL: ${recipe.title} (${url})`);
    } else {
      passed++;
      console.log(`PASS: ${recipe.title} (${url})`);
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  console.log('');
  console.log(`Passed: ${passed}/${urls.length}`);
  console.log(`Failed: ${failures.length}/${urls.length}`);

  if (failures.length) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log(`- ${f.title ? `${f.title} - ` : ''}${f.url}`);
      for (const i of f.issues) console.log(`  - ${i}`);
    }
    process.exitCode = 1;
  }
}

void main();
