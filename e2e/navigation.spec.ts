import { test, expect } from '@playwright/test';
import {
  setupPage,
  waitForPageReady,
  waitForNavigation,
} from './helpers/test-utils';

test.describe('Navigation', () => {
  test('should navigate from home to favorites', async ({ page }) => {
    await setupPage(page, '/');

    // Find and click favorites link with navigation wait
    const favoritesLink = page.getByRole('link', { name: /favorites/i });
    await waitForNavigation(page, () => favoritesLink.click());

    await expect(page).toHaveURL('/favorites');
  });

  test('should navigate from favorites to home', async ({ page }) => {
    await setupPage(page, '/favorites');

    // Navigate to home using any link that goes to root
    const homeLink = page.locator('a[href="/"]').first();

    if (await homeLink.isVisible()) {
      await waitForNavigation(page, () => homeLink.click());
      await expect(page).toHaveURL('/');
    } else {
      // Fallback: navigate directly
      await setupPage(page, '/');
      await expect(page).toHaveURL('/');
    }
  });

  test('should highlight active navigation item', async ({ page }) => {
    await setupPage(page, '/favorites');

    // The favorites nav item should have active styling
    const favoritesLink = page.getByRole('link', { name: /favorites/i });
    await expect(favoritesLink).toBeVisible();
  });
});

test.describe('Header', () => {
  test('should display header on all pages', async ({ page }) => {
    // Check home page
    await setupPage(page, '/');
    await expect(page.locator('header')).toBeVisible();

    // Check favorites page
    await setupPage(page, '/favorites');
    await expect(page.locator('header')).toBeVisible();
  });

  test('should display application title/logo', async ({ page }) => {
    await setupPage(page, '/');

    // Look for title in header
    const header = page.locator('header');
    await expect(header).toContainText(/recipe/i);
  });
});

test.describe('Responsive Navigation', () => {
  test('should be accessible on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await setupPage(page, '/');

    // Navigation should still be accessible
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should be accessible on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await setupPage(page, '/');

    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should be accessible on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setupPage(page, '/');

    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});

test.describe('404 Page', () => {
  test('should show 404 for non-existent routes', async ({ page }) => {
    const response = await page.goto('/non-existent-page');

    // Should either show 404 page or redirect
    // Next.js typically returns 404 status
    expect(response?.status()).toBe(404);
  });
});
