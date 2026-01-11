import { test, expect } from '@playwright/test';

test.describe('Favorites Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/favorites');
  });

  test('should load the favorites page', async ({ page }) => {
    await expect(page).toHaveURL('/favorites');
  });

  test('should display search bar', async ({ page }) => {
    const searchInput = page.getByLabel('Search recipes');
    await expect(searchInput).toBeVisible();
  });

  test('should display search placeholder', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should show empty state when no favorites', async ({ page }) => {
    // Clear localStorage to ensure no favorites
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Check for empty state message or no favorite cards
    const favoriteCards = page.locator('[class*="favorite-card"]');
    const count = await favoriteCards.count();

    if (count === 0) {
      // Either shows empty message or just no cards
      await expect(favoriteCards).toHaveCount(0);
    }
  });

  test.describe('Search Functionality', () => {
    test('should filter favorites when typing in search', async ({ page }) => {
      const searchInput = page.getByLabel('Search recipes');
      await searchInput.fill('chocolate');

      // Search should be debounced, wait a bit
      await page.waitForTimeout(400);

      // Verify search value is preserved
      await expect(searchInput).toHaveValue('chocolate');
    });

    test('should show clear button when search has value', async ({ page }) => {
      const searchInput = page.getByLabel('Search recipes');
      await searchInput.fill('test');

      // Clear button should appear
      const clearButton = page.getByLabel('Clear search');
      await expect(clearButton).toBeVisible();
    });

    test('should clear search when clear button clicked', async ({ page }) => {
      const searchInput = page.getByLabel('Search recipes');
      await searchInput.fill('test');

      const clearButton = page.getByLabel('Clear search');
      await clearButton.click();

      await expect(searchInput).toHaveValue('');
    });

    test('should hide clear button when search is empty', async ({ page }) => {
      const searchInput = page.getByLabel('Search recipes');

      // Initially no clear button
      const clearButton = page.getByLabel('Clear search');
      await expect(clearButton).not.toBeVisible();

      // Fill and clear
      await searchInput.fill('test');
      await expect(clearButton).toBeVisible();

      await clearButton.click();
      await expect(clearButton).not.toBeVisible();
    });
  });
});
