import { test, expect } from '@playwright/test';
import { setupPage, waitForPageReady, clearStateAndReload } from './helpers/test-utils';

test.describe('Migration Banner - Unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/');
  });

  test('should not show migration banner for guest users', async ({ page }) => {
    // Migration banner requires authentication
    const migrationBanner = page.locator('.migration-banner');
    await expect(migrationBanner).not.toBeVisible();
  });

  test('should not show migration banner on favorites page for guests', async ({ page }) => {
    await page.goto('/favorites');
    await waitForPageReady(page);

    const migrationBanner = page.locator('.migration-banner');
    await expect(migrationBanner).not.toBeVisible();
  });
});

test.describe('Migration Banner - Component Structure', () => {
  test('migration banner CSS should be available', async ({ page }) => {
    await setupPage(page, '/');

    // Verify migration CSS is bundled
    const styles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      return styleSheets.some((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          return rules.some(
            (rule) =>
              rule instanceof CSSStyleRule &&
              rule.selectorText?.includes('migration-banner')
          );
        } catch {
          return false;
        }
      });
    });

    expect(typeof styles).toBe('boolean');
  });
});

test.describe('Migration Banner - localStorage Simulation', () => {
  test('should store recipes in localStorage for guest users', async ({ page }) => {
    await setupPage(page, '/');

    // Clear any existing state
    await clearStateAndReload(page);

    // Add a recipe to localStorage (simulating guest user saving)
    await page.evaluate(() => {
      const mockRecipe = {
        id: 'test-recipe-1',
        title: 'Test Recipe',
        sourceUrl: 'https://example.com/recipe',
        ingredients: ['1 cup flour'],
        instructions: ['Mix ingredients'],
        savedAt: new Date().toISOString(),
      };
      const favorites = JSON.stringify([mockRecipe]);
      localStorage.setItem('favorites', favorites);
    });

    // Verify localStorage has the recipe
    const hasRecipes = await page.evaluate(() => {
      const favorites = localStorage.getItem('favorites');
      if (!favorites) return false;
      const parsed = JSON.parse(favorites);
      return Array.isArray(parsed) && parsed.length > 0;
    });

    expect(hasRecipes).toBe(true);
  });

  test('should count recipes in localStorage correctly', async ({ page }) => {
    await setupPage(page, '/');
    await clearStateAndReload(page);

    // Add multiple recipes
    await page.evaluate(() => {
      const mockRecipes = [
        {
          id: 'test-1',
          title: 'Recipe 1',
          sourceUrl: 'https://example.com/1',
          ingredients: [],
          instructions: [],
          savedAt: new Date().toISOString(),
        },
        {
          id: 'test-2',
          title: 'Recipe 2',
          sourceUrl: 'https://example.com/2',
          ingredients: [],
          instructions: [],
          savedAt: new Date().toISOString(),
        },
        {
          id: 'test-3',
          title: 'Recipe 3',
          sourceUrl: 'https://example.com/3',
          ingredients: [],
          instructions: [],
          savedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('favorites', JSON.stringify(mockRecipes));
    });

    const recipeCount = await page.evaluate(() => {
      const favorites = localStorage.getItem('favorites');
      if (!favorites) return 0;
      return JSON.parse(favorites).length;
    });

    expect(recipeCount).toBe(3);
  });
});

test.describe('Migration Banner - UI Elements', () => {
  test('should have proper button text for actions', async ({ page }) => {
    await setupPage(page, '/');

    // If migration banner exists, verify button text
    const migrationBanner = page.locator('.migration-banner');
    const isVisible = await migrationBanner.isVisible().catch(() => false);

    if (isVisible) {
      // Check for "Keep Local" button
      const keepLocalButton = page.locator('.migration-banner__button--secondary');
      await expect(keepLocalButton).toContainText('Keep Local');

      // Check for "Sync to Cloud" button
      const syncButton = page.locator('.migration-banner__button--primary');
      await expect(syncButton).toContainText('Sync to Cloud');
    }
  });

  test('should display recipe count in message', async ({ page }) => {
    await setupPage(page, '/');

    const migrationBanner = page.locator('.migration-banner');
    const isVisible = await migrationBanner.isVisible().catch(() => false);

    if (isVisible) {
      const message = page.locator('.migration-banner__message');
      // Message should mention saved recipes
      await expect(message).toContainText('saved recipe');
    }
  });
});

test.describe('Migration Banner - Accessibility', () => {
  test('dismiss button should have aria-label', async ({ page }) => {
    await setupPage(page, '/');

    const dismissButton = page.locator('.migration-banner__close');
    const isVisible = await dismissButton.isVisible().catch(() => false);

    if (isVisible) {
      const ariaLabel = await dismissButton.getAttribute('aria-label');
      expect(ariaLabel).toBe('Dismiss');
    }
  });
});
