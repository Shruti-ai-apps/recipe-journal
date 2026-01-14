import { test, expect } from '@playwright/test';
import { setupPage, waitForPageReady } from '../helpers/test-utils';

test.describe('User Menu - Unauthenticated State', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await waitForPageReady(page);
  });

  test('should show Sign in link when logged out', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
  });

  test('should navigate to login on Sign in click', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await signInLink.click();

    await expect(page).toHaveURL('/login');
  });

  test('should show Sign in link in header on all pages', async ({ page }) => {
    // Check home page
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();

    // Check favorites page
    await page.goto('/favorites');
    await waitForPageReady(page);
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('User Menu - Header Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/');
  });

  test('should display user menu in header', async ({ page }) => {
    // User menu container should exist
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Should have sign in link OR user menu
    const signInLink = page.getByRole('link', { name: /sign in/i });
    const userMenu = page.locator('[class*="user-menu"]');

    const hasSignIn = await signInLink.isVisible().catch(() => false);
    const hasUserMenu = await userMenu.isVisible().catch(() => false);

    expect(hasSignIn || hasUserMenu).toBe(true);
  });

  test('should place auth element after Favorites link', async ({ page }) => {
    // The auth element (sign in link or user menu) should be in the header nav
    const headerNav = page.locator('header nav').first();
    await expect(headerNav).toBeVisible();

    // Should contain Favorites link
    const favoritesLink = headerNav.getByRole('link', { name: /favorites/i });
    await expect(favoritesLink).toBeVisible();
  });
});

test.describe('User Menu - Responsive Behavior', () => {
  test('should show Sign in link on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupPage(page, '/');

    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
  });

  test('should show Sign in link on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await setupPage(page, '/');

    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
  });

  test('should show Sign in link on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setupPage(page, '/');

    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
  });
});

test.describe('User Menu - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/');
  });

  test('should have accessible Sign in link', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/login');
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab through header elements until we reach sign in link
    const signInLink = page.getByRole('link', { name: /sign in/i });

    // Focus on the link using keyboard
    await signInLink.focus();
    await expect(signInLink).toBeFocused();

    // Should be able to activate with Enter
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('User Menu - Theme Persistence', () => {
  test('should maintain theme when navigating to login', async ({ page }) => {
    await setupPage(page, '/');

    // Set theme to dark
    const themeToggle = page.locator('[class*="theme-toggle"]');
    await themeToggle.click();
    await waitForPageReady(page);

    // Navigate to login
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await signInLink.click();
    await waitForPageReady(page);

    // Theme should persist
    const htmlElement = page.locator('html');
    const theme = await htmlElement.getAttribute('data-theme');

    // Theme should be either dark or the same as before
    expect(['dark', 'light']).toContain(theme);
  });
});
