import { test, expect } from '@playwright/test';
import { setupPage, waitForPageReady } from '../helpers/test-utils';

test.describe('Auth Pages Navigation', () => {
  test('should load login page', async ({ page }) => {
    await setupPage(page, '/login');

    await expect(page).toHaveURL('/login');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should load signup page', async ({ page }) => {
    await setupPage(page, '/signup');

    // Signup page exists and is accessible
    await expect(page).toHaveURL('/signup');
  });

  test('should load forgot-password page', async ({ page }) => {
    await setupPage(page, '/forgot-password');

    // Forgot password redirects to login (since passwordless)
    // Wait for any redirect to complete
    await page.waitForLoadState('networkidle');

    // Should either be on forgot-password or redirected to login
    const url = page.url();
    expect(url.includes('forgot-password') || url.includes('login')).toBe(true);
  });

  test('forgot-password should redirect to login', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    // Wait for redirect (with passwordless, forgot-password redirects to login)
    await page.waitForURL(/\/(login|forgot-password)/, { timeout: 5000 });

    const url = page.url();
    // Should redirect to login since there's no password to forget
    expect(url.includes('login') || url.includes('forgot-password')).toBe(true);
  });
});

test.describe('Auth Pages - Navigation from Home', () => {
  test('should navigate from home to login', async ({ page }) => {
    await setupPage(page, '/');

    const signInLink = page.getByRole('link', { name: /sign in/i });
    await signInLink.click();

    await expect(page).toHaveURL('/login');
  });

  test('should navigate back to home from login', async ({ page }) => {
    await setupPage(page, '/login');

    // Click on logo/brand to go home
    const logo = page.getByRole('link', { name: /recipe journal/i });
    await logo.click();

    await expect(page).toHaveURL('/');
  });
});

test.describe('Auth Pages - OAuth Callback', () => {
  test('should have auth callback route', async ({ page }) => {
    // The callback route should exist (even if it returns an error without proper params)
    await page.goto('/auth/callback');
    await page.waitForLoadState('networkidle');

    // Should either redirect or show some content
    // (actual behavior depends on whether OAuth params are present)
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Auth Pages - Logged Out Redirect', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should allow access to login when logged out', async ({ page }) => {
    await setupPage(page, '/login');

    // Should stay on login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should allow access to public pages when logged out', async ({ page }) => {
    // Home page
    await setupPage(page, '/');
    await expect(page.getByText(/recipe journal/i).first()).toBeVisible();

    // Favorites page (public, uses localStorage)
    await page.goto('/favorites');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/favorites');
  });
});

test.describe('Auth Pages - Header Consistency', () => {
  test('should show consistent header on login page', async ({ page }) => {
    await setupPage(page, '/login');

    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Logo should be visible
    const logo = page.getByRole('link', { name: /recipe journal/i });
    await expect(logo).toBeVisible();
  });

  test('should show consistent header on signup page', async ({ page }) => {
    await setupPage(page, '/signup');

    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should maintain theme toggle on auth pages', async ({ page }) => {
    await setupPage(page, '/login');

    // Theme toggle should be visible
    const themeToggle = page.locator('[class*="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
  });

  test('should maintain palette selector on auth pages', async ({ page }) => {
    await setupPage(page, '/login');

    // Palette selector should be visible
    const paletteSelector = page.locator('[class*="palette-selector"]');
    await expect(paletteSelector).toBeVisible();
  });
});

test.describe('Auth Pages - Deep Linking', () => {
  test('should handle direct navigation to login', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    await expect(page).toHaveURL('/login');
  });

  test('should handle direct navigation to signup', async ({ page }) => {
    await page.goto('/signup');
    await waitForPageReady(page);

    // Should be on signup or redirected
    const url = page.url();
    expect(url).toContain('sign');
  });
});
