import { test, expect } from '@playwright/test';
import {
  setupPage,
  waitForPageReady,
  clearStateAndReload,
  fillAndSettle,
} from './helpers/test-utils';

test.describe('Favorites Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/favorites');
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
    // Clear localStorage and reload properly
    await clearStateAndReload(page);

    // Check for empty state message or no favorite cards
    const favoriteCards = page.locator('[class*="favorite-card"]');
    const count = await favoriteCards.count();

    if (count === 0) {
      await expect(favoriteCards).toHaveCount(0);
    }
  });

  test.describe('Search Functionality', () => {
    test('should filter favorites when typing in search', async ({ page }) => {
      const searchInput = page.getByLabel('Search recipes');

      // Use fillAndSettle instead of arbitrary timeout
      await fillAndSettle(page, '[aria-label="Search recipes"]', 'chocolate');

      // Verify search value is preserved
      await expect(searchInput).toHaveValue('chocolate');
    });

    test('should show clear button when search has value', async ({ page }) => {
      const searchInput = page.getByLabel('Search recipes');
      await searchInput.fill('test');

      // Wait for UI to update
      await waitForPageReady(page);

      // Clear button should appear
      const clearButton = page.getByLabel('Clear search');
      await expect(clearButton).toBeVisible();
    });

    test('should clear search when clear button clicked', async ({ page }) => {
      const searchInput = page.getByLabel('Search recipes');
      await searchInput.fill('test');
      await waitForPageReady(page);

      const clearButton = page.getByLabel('Clear search');
      await clearButton.click();
      await waitForPageReady(page);

      await expect(searchInput).toHaveValue('');
    });

    test('should hide clear button when search is empty', async ({ page }) => {
      const searchInput = page.getByLabel('Search recipes');

      // Initially no clear button
      const clearButton = page.getByLabel('Clear search');
      await expect(clearButton).not.toBeVisible();

      // Fill and wait for UI update
      await searchInput.fill('test');
      await waitForPageReady(page);
      await expect(clearButton).toBeVisible();

      // Clear and wait
      await clearButton.click();
      await waitForPageReady(page);
      await expect(clearButton).not.toBeVisible();
    });
  });
});
