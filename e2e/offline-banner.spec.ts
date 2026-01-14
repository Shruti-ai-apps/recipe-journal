import { test, expect } from '@playwright/test';
import { setupPage, waitForPageReady } from './helpers/test-utils';

test.describe('Offline Banner', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/');
  });

  test('should not show banner when online and never was offline', async ({ page }) => {
    // Banner should not be visible on initial load when online
    const offlineBanner = page.locator('.offline-banner');
    await expect(offlineBanner).not.toBeVisible();
  });

  test('should show offline banner when network goes offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Wait for the banner to appear
    await waitForPageReady(page);

    const offlineBanner = page.locator('.offline-banner--offline');
    await expect(offlineBanner).toBeVisible();

    // Check the message text
    const bannerText = page.locator('.offline-banner__text');
    await expect(bannerText).toContainText("You're offline");
    await expect(bannerText).toContainText('sync when you reconnect');
  });

  test('should show reconnected banner when coming back online', async ({ page, context }) => {
    // First go offline
    await context.setOffline(true);
    await waitForPageReady(page);

    // Verify offline banner is shown
    const offlineBanner = page.locator('.offline-banner--offline');
    await expect(offlineBanner).toBeVisible();

    // Come back online
    await context.setOffline(false);
    await waitForPageReady(page);

    // Should show reconnected message
    const reconnectedBanner = page.locator('.offline-banner--reconnected');
    await expect(reconnectedBanner).toBeVisible();

    const bannerText = page.locator('.offline-banner__text');
    await expect(bannerText).toContainText('Back online');
  });

  test('should display offline icon in banner', async ({ page, context }) => {
    await context.setOffline(true);
    await waitForPageReady(page);

    const icon = page.locator('.offline-banner--offline .offline-banner__icon');
    await expect(icon).toBeVisible();
  });

  test('offline banner should remain visible after state change', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await waitForPageReady(page);

    // Verify banner is visible
    await expect(page.locator('.offline-banner--offline')).toBeVisible();

    // Interact with the page (e.g., search) while offline
    // The banner should remain visible
    const searchInput = page.getByLabel('Recipe URL');
    if (await searchInput.isVisible()) {
      await searchInput.fill('https://example.com');
      await waitForPageReady(page);
    }

    // Banner should still be visible after interaction
    await expect(page.locator('.offline-banner--offline')).toBeVisible();
  });
});

test.describe('Offline Banner - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display offline banner on mobile viewport', async ({ page, context }) => {
    await setupPage(page, '/');

    await context.setOffline(true);
    await waitForPageReady(page);

    const offlineBanner = page.locator('.offline-banner--offline');
    await expect(offlineBanner).toBeVisible();
  });
});
