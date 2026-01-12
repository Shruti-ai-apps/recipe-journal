---
name: recipe-journal-e2e
description: Write and run Playwright E2E tests for Recipe Journal. Use when creating end-to-end tests, debugging test failures, or testing user flows like recipe import, scaling, and favorites.
---

# Recipe Journal E2E Testing Skill

## Overview

This skill helps you write robust Playwright E2E tests for the Recipe Journal Next.js application using the **reconnaissance-then-action** methodology.

## Project Testing Structure

```
e2e/
├── helpers/
│   └── test-utils.ts    # Shared utilities (waitForPageReady, reconThenAct, etc.)
├── home.spec.ts         # Home page tests
├── favorites.spec.ts    # Favorites page & search tests
├── navigation.spec.ts   # Navigation & header tests
├── recipe-flow.spec.ts  # Recipe URL submission & validation
├── theme.spec.ts        # Theme switching tests
└── user-flows.spec.ts   # Full user journey tests
```

## Key Testing Patterns

### 1. Always Wait for Page Ready (networkidle)

```typescript
import { setupPage, waitForPageReady } from './helpers/test-utils';

// In beforeEach - use setupPage instead of page.goto
test.beforeEach(async ({ page }) => {
  await setupPage(page, '/');  // Waits for networkidle
});

// After any action that triggers state change
await waitForPageReady(page);
```

### 2. Reconnaissance-Then-Action Pattern

```typescript
import { reconThenAct } from './helpers/test-utils';

// Wait for page to settle, optionally screenshot, then act
await reconThenAct(page, async () => {
  await page.getByLabel('Recipe URL').fill('https://example.com/recipe');
  await page.getByRole('button', { name: /get recipe/i }).click();
}, { captureScreenshot: true, screenshotName: 'before-submit' });
```

### 3. Avoid Arbitrary Timeouts

```typescript
// BAD - arbitrary timeout
await page.waitForTimeout(500);

// GOOD - wait for specific condition
await waitForPageReady(page);
// or
await page.locator('[data-loading="false"]').waitFor();
// or
await expect(element).toBeVisible({ timeout: 5000 });
```

### 4. Handle Dynamic Content

```typescript
import { fillAndSettle } from './helpers/test-utils';

// For inputs with debounced effects (like search)
await fillAndSettle(page, '[aria-label="Search recipes"]', 'chocolate');
```

## Available Test Helpers (e2e/helpers/test-utils.ts)

| Helper | Purpose |
|--------|---------|
| `setupPage(page, url)` | Navigate and wait for networkidle |
| `waitForPageReady(page)` | Wait for networkidle state |
| `reconThenAct(page, action, options)` | Reconnaissance-then-action pattern |
| `fillAndSettle(page, selector, value)` | Fill input and wait for effects |
| `clickAndSettle(page, selector)` | Click and wait for page to settle |
| `waitForNavigation(page, action)` | Wait for navigation after action |
| `clearStateAndReload(page)` | Clear localStorage/sessionStorage and reload |
| `captureDebugScreenshot(page, name)` | Take a debug screenshot |

## NPM Scripts

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:ui           # Run with Playwright UI
npm run test:e2e:headed       # Run in headed browser
npm run test:e2e:debug        # Debug mode
npm run test:e2e:chromium     # Run only Chromium tests
npm run test:e2e:report       # View HTML report
```

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { setupPage, waitForPageReady, reconThenAct } from './helpers/test-utils';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.getByRole('button', { name: /action/i });

    // Act (with reconnaissance)
    await reconThenAct(page, async () => {
      await element.click();
    });

    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## Recipe Journal Specific Selectors

### Home Page
- URL Input: `page.getByLabel('Recipe URL')`
- Submit Button: `page.getByRole('button', { name: /get recipe/i })`
- Paste Button: `page.getByTitle('Paste from clipboard')`

### Favorites Page
- Search Input: `page.getByLabel('Search recipes')`
- Clear Search: `page.getByLabel('Clear search')`
- Recipe Cards: `page.locator('[class*="favorite-card"]')`

### Navigation
- Favorites Link: `page.getByRole('link', { name: /favorites/i })`
- Home Link: `page.locator('a[href="/"]')`
- Header: `page.locator('header')`

### Theme
- Theme Toggle: `page.locator('button[aria-label*="theme" i]')`
- HTML Theme Attr: `page.locator('html').getAttribute('data-theme')`

## Debugging Tips

1. **Use UI mode for visual debugging:**
   ```bash
   npm run test:e2e:ui
   ```

2. **Capture screenshot before assertion:**
   ```typescript
   await captureDebugScreenshot(page, 'debug-state');
   ```

3. **Check test-results/ for failure artifacts:**
   - Screenshots on failure
   - Videos on retry
   - Traces for debugging

4. **Use Playwright Inspector:**
   ```bash
   npm run test:e2e:debug
   ```

## CI/CD Considerations

The `playwright.config.ts` is configured for CI:
- Single worker on CI (`workers: 1`)
- Retries on CI (`retries: 2`)
- Auto-starts dev server via `webServer` config
