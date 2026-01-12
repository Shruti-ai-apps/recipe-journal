import { test, expect } from '@playwright/test';
import { setupPage, waitForPageReady } from './helpers/test-utils';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/');
  });

  test('should load the home page successfully', async ({ page }) => {
    await expect(page).toHaveURL('/');
  });

  test('should display the application header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should display the URL input form', async ({ page }) => {
    const urlInput = page.getByLabel('Recipe URL');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute('placeholder', /https:\/\//);
  });

  test('should display the Get Recipe button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /get recipe/i });
    await expect(submitButton).toBeVisible();
  });

  test('should display supported sites hint text', async ({ page }) => {
    const hintText = page.getByText(/supports/i);
    await expect(hintText).toBeVisible();
  });

  test('should have paste button for clipboard functionality', async ({ page }) => {
    const pasteButton = page.getByTitle('Paste from clipboard');
    await expect(pasteButton).toBeVisible();
  });
});
