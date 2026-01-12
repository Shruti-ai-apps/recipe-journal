import { Page, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Test utilities implementing the "reconnaissance-then-action" pattern
 * Based on web app testing best practices for dynamic applications
 */

// Ensure screenshots directory exists
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'screenshots');

/**
 * Wait for the page to be fully loaded (network idle)
 * Critical for dynamic Next.js apps where JS needs to hydrate
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a URL and wait for the page to be fully ready
 */
export async function gotoAndWait(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForPageReady(page);
}

/**
 * Reconnaissance-then-action pattern
 * 1. Wait for network idle (JS execution complete)
 * 2. Optionally capture screenshot for debugging
 * 3. Execute the action
 *
 * @param page - Playwright page object
 * @param action - The action to perform after reconnaissance
 * @param options - Configuration options
 */
export async function reconThenAct(
  page: Page,
  action: () => Promise<void>,
  options: {
    screenshotName?: string;
    captureScreenshot?: boolean;
  } = {}
): Promise<void> {
  // Step 1: Wait for network idle - ensures React/Next.js has hydrated
  await waitForPageReady(page);

  // Step 2: Optional screenshot for debugging
  if (options.captureScreenshot && options.screenshotName) {
    await captureDebugScreenshot(page, options.screenshotName);
  }

  // Step 3: Execute the action
  await action();
}

/**
 * Capture a debug screenshot
 * Useful for understanding page state before assertions
 */
export async function captureDebugScreenshot(
  page: Page,
  name: string
): Promise<string> {
  // Ensure directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const filename = `${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.screenshot({ path: filepath, fullPage: true });

  return filepath;
}

/**
 * Wait for an element to be ready (visible and stable)
 * Better than arbitrary timeouts for dynamic content
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; state?: 'visible' | 'attached' | 'hidden' } = {}
): Promise<void> {
  const { timeout = 10000, state = 'visible' } = options;
  await page.locator(selector).waitFor({ state, timeout });
}

/**
 * Wait for navigation to complete after an action
 */
export async function waitForNavigation(
  page: Page,
  action: () => Promise<void>
): Promise<void> {
  await Promise.all([
    page.waitForLoadState('networkidle'),
    action(),
  ]);
}

/**
 * Fill input and wait for any debounced effects
 * Replaces arbitrary waitForTimeout calls
 */
export async function fillAndSettle(
  page: Page,
  selector: string,
  value: string,
  options: { waitForSelector?: string } = {}
): Promise<void> {
  await page.locator(selector).fill(value);

  if (options.waitForSelector) {
    // Wait for a specific element to appear (e.g., filtered results)
    await waitForElement(page, options.waitForSelector);
  } else {
    // Wait for network to settle (handles debounced API calls)
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Click and wait for the page to settle
 */
export async function clickAndSettle(
  page: Page,
  selector: string
): Promise<void> {
  await page.locator(selector).click();
  await waitForPageReady(page);
}

/**
 * Assert element is visible after page is ready
 * Prevents flaky tests on dynamic content
 */
export async function assertVisibleAfterReady(
  page: Page,
  selector: string
): Promise<void> {
  await waitForPageReady(page);
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Setup helper for beforeEach hooks
 * Navigates and waits for full page load
 */
export async function setupPage(page: Page, url: string = '/'): Promise<void> {
  await gotoAndWait(page, url);
}

/**
 * Clear application state (localStorage, sessionStorage)
 * and reload the page
 */
export async function clearStateAndReload(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await waitForPageReady(page);
}
