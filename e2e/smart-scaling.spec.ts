import { test, expect, Page } from '@playwright/test';
import {
  setupPage,
  waitForPageReady,
  reconThenAct,
  clearStateAndReload,
} from './helpers/test-utils';

/**
 * Smart Scaling E2E Tests
 *
 * Tests AI-powered recipe scaling functionality with mocked LLM responses.
 * These tests verify the UI flows without making actual Gemini API calls.
 */

// Mock data for smart scale API responses
const mockSmartScaleResponse = {
  success: true,
  data: {
    ingredients: [
      {
        id: '1',
        original: '2 cups all-purpose flour',
        displayText: '4 cups all-purpose flour',
        quantity: 2,
        unit: 'cups',
        name: 'all-purpose flour',
        scaledQuantity: { value: 4, displayValue: '4', wasRounded: false, originalValue: 2 },
        scaledUnit: 'cups',
        parseConfidence: 0.95,
        aiAdjusted: false,
        category: 'linear' as const,
      },
      {
        id: '2',
        original: '2 eggs',
        displayText: '4 eggs',
        quantity: 2,
        unit: '',
        name: 'eggs',
        scaledQuantity: { value: 4, displayValue: '4', wasRounded: false, originalValue: 2 },
        scaledUnit: '',
        parseConfidence: 0.98,
        aiAdjusted: true,
        adjustmentReason: 'Rounded to whole number for discrete ingredient',
        category: 'discrete' as const,
      },
      {
        id: '3',
        original: '1 tsp baking powder',
        displayText: '1.5 tsp baking powder',
        quantity: 1,
        unit: 'tsp',
        name: 'baking powder',
        scaledQuantity: { value: 1.5, displayValue: '1.5', wasRounded: false, originalValue: 1 },
        scaledUnit: 'tsp',
        parseConfidence: 0.92,
        aiAdjusted: true,
        adjustmentReason: 'Reduced to 75% for large batch - leavening agents become more potent',
        category: 'leavening' as const,
      },
      {
        id: '4',
        original: '1 tsp salt',
        displayText: '1.5 tsp salt',
        quantity: 1,
        unit: 'tsp',
        name: 'salt',
        scaledQuantity: { value: 1.5, displayValue: '1.5', wasRounded: false, originalValue: 1 },
        scaledUnit: 'tsp',
        parseConfidence: 0.95,
        aiAdjusted: true,
        adjustmentReason: 'Scaled conservatively - seasonings intensify in larger batches',
        category: 'seasoning' as const,
      },
    ],
    tips: [
      'When doubling this recipe, mix dry ingredients thoroughly before adding wet ingredients.',
      'Baking time may increase by 5-10 minutes for larger batch.',
      'Consider using two pans instead of one larger pan for more even baking.',
    ],
    cookingTimeAdjustment: 'Increase baking time by 5-10 minutes',
    success: true,
  },
  meta: {
    requestId: 'test-request-123',
    processingTime: 150,
    aiPowered: true,
    cached: false,
  },
};

const mockSmartScaleResponse3x = {
  success: true,
  data: {
    ingredients: [
      {
        id: '1',
        original: '2 cups all-purpose flour',
        displayText: '6 cups all-purpose flour',
        quantity: 2,
        unit: 'cups',
        name: 'all-purpose flour',
        scaledQuantity: { value: 6, displayValue: '6', wasRounded: false, originalValue: 2 },
        scaledUnit: 'cups',
        parseConfidence: 0.95,
        aiAdjusted: false,
        category: 'linear' as const,
      },
      {
        id: '2',
        original: '2 eggs',
        displayText: '6 eggs',
        quantity: 2,
        unit: '',
        name: 'eggs',
        scaledQuantity: { value: 6, displayValue: '6', wasRounded: false, originalValue: 2 },
        scaledUnit: '',
        parseConfidence: 0.98,
        aiAdjusted: true,
        adjustmentReason: 'Rounded to whole number for discrete ingredient',
        category: 'discrete' as const,
      },
      {
        id: '3',
        original: '1 tsp baking powder',
        displayText: '2 tsp baking powder',
        quantity: 1,
        unit: 'tsp',
        name: 'baking powder',
        scaledQuantity: { value: 2, displayValue: '2', wasRounded: false, originalValue: 1 },
        scaledUnit: 'tsp',
        parseConfidence: 0.92,
        aiAdjusted: true,
        adjustmentReason: 'Significantly reduced for 3x batch - leavening becomes much more potent',
        category: 'leavening' as const,
      },
      {
        id: '4',
        original: '1 tsp salt',
        displayText: '2 tsp salt',
        quantity: 1,
        unit: 'tsp',
        name: 'salt',
        scaledQuantity: { value: 2, displayValue: '2', wasRounded: false, originalValue: 1 },
        scaledUnit: 'tsp',
        parseConfidence: 0.95,
        aiAdjusted: true,
        adjustmentReason: 'Reduced to 67% - seasonings intensify significantly in large batches',
        category: 'seasoning' as const,
      },
    ],
    tips: [
      'For tripling recipes, consider making in two separate batches for better results.',
      'Large batches require more thorough mixing - use a stand mixer if available.',
      'Monitor closely as baking times vary significantly with larger quantities.',
    ],
    cookingTimeAdjustment: 'Increase baking time by 15-20 minutes for triple batch',
    success: true,
  },
  meta: {
    requestId: 'test-request-456',
    processingTime: 180,
    aiPowered: true,
    cached: false,
  },
};

const mockSmartScaleErrorResponse = {
  success: false,
  data: {
    ingredients: [
      {
        id: '1',
        original: '2 cups flour',
        displayText: '4 cups flour',
        quantity: 2,
        unit: 'cups',
        name: 'flour',
        scaledQuantity: { value: 4, displayValue: '4', wasRounded: false, originalValue: 2 },
        scaledUnit: 'cups',
        parseConfidence: 0.95,
        aiAdjusted: false,
        category: 'linear' as const,
      },
    ],
    tips: ['Scale ingredients proportionally for best results.'],
    success: false,
    error: 'AI scaling failed - using linear fallback',
  },
  meta: {
    requestId: 'test-request-error',
    processingTime: 50,
    aiPowered: false,
    cached: false,
  },
};

// Mock recipe parse response for testing
const mockRecipeParseResponse = {
  success: true,
  data: {
    id: 'test-recipe-123',
    title: 'Test Chocolate Cake',
    source: {
      url: 'https://example.com/chocolate-cake',
      domain: 'example.com',
      scrapedAt: new Date().toISOString(),
      scrapeMethod: 'schema-org',
    },
    servings: { amount: 8, unit: 'servings', originalText: '8 servings' },
    ingredients: [
      {
        id: '1',
        original: '2 cups all-purpose flour',
        quantity: 2,
        unit: 'cups',
        name: 'all-purpose flour',
        parseConfidence: 0.95,
      },
      {
        id: '2',
        original: '2 eggs',
        quantity: 2,
        unit: '',
        name: 'eggs',
        parseConfidence: 0.98,
      },
      {
        id: '3',
        original: '1 tsp baking powder',
        quantity: 1,
        unit: 'tsp',
        name: 'baking powder',
        parseConfidence: 0.92,
      },
      {
        id: '4',
        original: '1 tsp salt',
        quantity: 1,
        unit: 'tsp',
        name: 'salt',
        parseConfidence: 0.95,
      },
    ],
    instructions: [
      { step: 1, text: 'Preheat oven to 350°F.' },
      { step: 2, text: 'Mix dry ingredients.' },
      { step: 3, text: 'Add wet ingredients and mix until smooth.' },
      { step: 4, text: 'Bake for 30-35 minutes.' },
    ],
  },
  meta: {
    requestId: 'parse-123',
    processingTime: 500,
  },
};

// Mock scale response (regular, non-AI)
const mockScaleResponse = {
  success: true,
  data: {
    id: 'test-recipe-123',
    title: 'Test Chocolate Cake',
    source: {
      url: 'https://example.com/chocolate-cake',
      domain: 'example.com',
      scrapedAt: new Date().toISOString(),
      scrapeMethod: 'schema-org',
    },
    servings: { amount: 8, unit: 'servings', originalText: '8 servings' },
    scaling: {
      originalServings: { amount: 8, unit: 'servings', originalText: '8 servings' },
      scaledServings: { amount: 16, unit: 'servings', originalText: '16 servings' },
      multiplier: 2,
      appliedAt: new Date().toISOString(),
    },
    originalIngredients: [
      {
        id: '1',
        original: '2 cups all-purpose flour',
        quantity: 2,
        unit: 'cups',
        name: 'all-purpose flour',
        parseConfidence: 0.95,
      },
      {
        id: '2',
        original: '2 eggs',
        quantity: 2,
        unit: '',
        name: 'eggs',
        parseConfidence: 0.98,
      },
      {
        id: '3',
        original: '1 tsp baking powder',
        quantity: 1,
        unit: 'tsp',
        name: 'baking powder',
        parseConfidence: 0.92,
      },
      {
        id: '4',
        original: '1 tsp salt',
        quantity: 1,
        unit: 'tsp',
        name: 'salt',
        parseConfidence: 0.95,
      },
    ],
    scaledIngredients: [
      {
        id: '1',
        original: '2 cups all-purpose flour',
        displayText: '4 cups all-purpose flour',
        quantity: 2,
        unit: 'cups',
        name: 'all-purpose flour',
        scaledQuantity: { value: 4, displayValue: '4', wasRounded: false, originalValue: 2 },
        scaledUnit: 'cups',
        parseConfidence: 0.95,
      },
      {
        id: '2',
        original: '2 eggs',
        displayText: '4 eggs',
        quantity: 2,
        unit: '',
        name: 'eggs',
        scaledQuantity: { value: 4, displayValue: '4', wasRounded: false, originalValue: 2 },
        scaledUnit: '',
        parseConfidence: 0.98,
      },
      {
        id: '3',
        original: '1 tsp baking powder',
        displayText: '2 tsp baking powder',
        quantity: 1,
        unit: 'tsp',
        name: 'baking powder',
        scaledQuantity: { value: 2, displayValue: '2', wasRounded: false, originalValue: 1 },
        scaledUnit: 'tsp',
        parseConfidence: 0.92,
      },
      {
        id: '4',
        original: '1 tsp salt',
        displayText: '2 tsp salt',
        quantity: 1,
        unit: 'tsp',
        name: 'salt',
        scaledQuantity: { value: 2, displayValue: '2', wasRounded: false, originalValue: 1 },
        scaledUnit: 'tsp',
        parseConfidence: 0.95,
      },
    ],
    instructions: [
      { step: 1, text: 'Preheat oven to 350°F.' },
      { step: 2, text: 'Mix dry ingredients.' },
      { step: 3, text: 'Add wet ingredients and mix until smooth.' },
      { step: 4, text: 'Bake for 30-35 minutes.' },
    ],
    scalingTips: [
      'Consider extending cook time by 10-15 minutes for baked goods.',
      'You may need to use a larger pan or multiple pans.',
    ],
  },
  meta: {
    requestId: 'scale-123',
    processingTime: 50,
  },
};

/**
 * Setup API mocks for a test page
 */
async function setupMockedAPIs(page: Page, options: { smartScaleResponse?: object } = {}) {
  const smartScaleResp = options.smartScaleResponse || mockSmartScaleResponse;

  // Mock recipe parse API
  await page.route('**/api/recipes/parse', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRecipeParseResponse),
    });
  });

  // Mock regular scale API
  await page.route('**/api/recipes/scale', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockScaleResponse),
    });
  });

  // Mock smart scale API
  await page.route('**/api/recipes/scale-smart', async (route) => {
    // Add a small delay to simulate API latency for loading state tests
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(smartScaleResp),
    });
  });
}

/**
 * Helper to load a recipe with mocked APIs
 */
async function loadMockedRecipe(page: Page) {
  const urlInput = page.getByLabel('Recipe URL');
  await urlInput.fill('https://example.com/chocolate-cake');

  await reconThenAct(page, async () => {
    await page.getByRole('button', { name: /get recipe/i }).click();
  });

  // Wait for recipe to load
  await page.waitForSelector('.recipe-section', { timeout: 10000 });
  await waitForPageReady(page);
}

test.describe('Smart Scaling: Toggle Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks BEFORE navigating
    await setupMockedAPIs(page);
    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);
  });

  test('should display smart scale toggle when recipe is loaded', async ({ page }) => {
    // Smart scale toggle should be visible
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await expect(smartScaleToggle).toBeVisible();

    // Should have AI badge
    const aiBadge = page.locator('.smart-scale-ai-badge');
    await expect(aiBadge).toBeVisible();
    await expect(aiBadge).toHaveText('AI');
  });

  test('should be disabled by default', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });

    // Toggle should be off by default
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'false');
  });

  test('should enable smart scaling when toggled on', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });

    // Click toggle to enable
    await smartScaleToggle.click();

    // Wait for API call to complete
    await waitForPageReady(page);

    // Toggle should now be on
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'true');

    // Hint text should appear
    const hint = page.getByText(/AI will intelligently adjust/i);
    await expect(hint).toBeVisible();
  });

  test('should show loading state while fetching smart scale data', async ({ page }) => {
    // Change to 2x first (smart scale only triggers for multiplier !== 1)
    const multiplier2x = page.getByRole('button', { name: /2x/i });
    await multiplier2x.click();
    await waitForPageReady(page);

    // Override with a slower mock to catch loading state
    await page.unroute('**/api/recipes/scale-smart');
    await page.route('**/api/recipes/scale-smart', async (route) => {
      // Use a longer delay to reliably catch loading state
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSmartScaleResponse),
      });
    });

    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });

    // Click and immediately check for loading state
    await smartScaleToggle.click();

    // Should show loading hint - wait with a short timeout since it should appear quickly
    const loadingHint = page.getByText(/AI is scaling your recipe/i);
    await expect(loadingHint).toBeVisible({ timeout: 1000 });

    // Wait for loading to complete
    await waitForPageReady(page);
  });

  test('should disable smart scaling when toggled off', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });

    // Enable first
    await smartScaleToggle.click();
    await waitForPageReady(page);
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'true');

    // Disable
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Should be off
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'false');

    // AI hint should not be visible
    const hint = page.getByText(/AI will intelligently adjust/i);
    await expect(hint).not.toBeVisible();
  });
});

test.describe('Smart Scaling: AI Badges and Adjustments', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedAPIs(page);
    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);
  });

  test('should display AI badges on adjusted ingredients when smart scale is enabled', async ({
    page,
  }) => {
    // First change multiplier to 2x (smart scale only triggers for multiplier !== 1)
    const multiplier2x = page.getByRole('button', { name: /2x/i });
    await multiplier2x.click();
    await waitForPageReady(page);

    // Now enable smart scale
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();

    // Wait for smart scale API call and UI update
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/recipes/scale-smart') && response.status() === 200
    );
    await waitForPageReady(page);

    // AI badges should appear on adjusted ingredients
    // Look for the "AI" text badges within ingredient list items
    const ingredientList = page.locator('.ingredient-list');
    await expect(ingredientList).toBeVisible();

    // Get all list items and check for AI badge text
    const ingredientItems = ingredientList.locator('.ingredient-item');
    const itemCount = await ingredientItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Wait for and verify at least one ingredient shows AI badge
    const aiBadges = page.locator('.ingredient-list .ai-badge');
    await expect(aiBadges.first()).toBeVisible({ timeout: 5000 });
    const aiBadgeCount = await aiBadges.count();
    expect(aiBadgeCount).toBeGreaterThanOrEqual(1);
  });

  test('should not display AI badges when smart scale is disabled', async ({ page }) => {
    // Verify no AI badges initially
    const aiBadges = page.locator('.ingredient-list .ai-badge');
    const initialCount = await aiBadges.count();
    expect(initialCount).toBe(0);
  });

  test('should show adjustment reason on AI badge hover/click', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Find an AI badge and hover over it
    const aiBadge = page.locator('.ingredient-list .ai-badge').first();

    if ((await aiBadge.count()) > 0) {
      await aiBadge.hover();

      // Tooltip or reason text should appear
      const tooltip = page.locator('[class*="tooltip"], [role="tooltip"]');
      const reasonText = page.getByText(/rounded|reduced|scaled/i);

      const hasTooltip = await tooltip.isVisible().catch(() => false);
      const hasReason = await reasonText.isVisible().catch(() => false);

      expect(hasTooltip || hasReason).toBe(true);
    }
  });
});

test.describe('Smart Scaling: Scaling Tips', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedAPIs(page);
    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);
    // Change multiplier to 2x to enable smart scale functionality
    const multiplier2x = page.getByRole('button', { name: /2x/i });
    await multiplier2x.click();
    await waitForPageReady(page);
  });

  test('should display scaling tips when smart scale is enabled', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Scaling tips section should be visible
    const tipsSection = page.locator('.scaling-tips');
    await expect(tipsSection).toBeVisible();

    // Should have AI badge on tips title
    const tipsAIBadge = page.locator('.scaling-tips-ai-badge');
    await expect(tipsAIBadge).toBeVisible();
  });

  test('should display cooking time adjustment when provided', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Cooking time adjustment should be visible
    const timeAdjustment = page.locator('.scaling-tips-time');
    await expect(timeAdjustment).toBeVisible();

    // Should contain the time adjustment text
    await expect(timeAdjustment).toContainText(/increase|baking time/i);
  });

  test('should display multiple tips from AI', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Tips list should have multiple items
    const tipItems = page.locator('.scaling-tips-item');
    const tipCount = await tipItems.count();

    // Our mock has 3 tips
    expect(tipCount).toBeGreaterThanOrEqual(1);
  });

  test('should hide AI tips when smart scale is disabled', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });

    // Enable smart scale
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Verify tips are visible
    const tipsAIBadge = page.locator('.scaling-tips-ai-badge');
    await expect(tipsAIBadge).toBeVisible();

    // Disable smart scale
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // AI badge on tips should not be visible
    await expect(tipsAIBadge).not.toBeVisible();
  });
});

test.describe('Smart Scaling: Multiplier Changes', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedAPIs(page);
    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);
  });

  test('should fetch new smart scale data when multiplier changes', async ({ page }) => {
    // Track API calls
    const smartScaleCalls: number[] = [];
    await page.unroute('**/api/recipes/scale-smart');
    await page.route('**/api/recipes/scale-smart', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      smartScaleCalls.push(postData?.multiplier || 0);

      const response = postData?.multiplier >= 3 ? mockSmartScaleResponse3x : mockSmartScaleResponse;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    // First change to 2x (smart scale only triggers for multiplier !== 1)
    const multiplier2x = page.getByRole('button', { name: /2x/i });
    await multiplier2x.click();
    await waitForPageReady(page);

    // Enable smart scale - this should trigger first API call
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Verify call was made with multiplier 2
    expect(smartScaleCalls).toContain(2);

    // Change multiplier to 3x - need extra wait for state to settle
    const multiplier3x = page.getByRole('button', { name: /3x/i });
    await multiplier3x.click();

    // Wait for the API call to complete
    await page.waitForResponse((response) =>
      response.url().includes('/api/recipes/scale-smart') && response.status() === 200
    );
    await waitForPageReady(page);

    // Verify API was called with multiplier 3
    expect(smartScaleCalls).toContain(3);
  });

  test('should update ingredients when multiplier changes with smart scale enabled', async ({
    page,
  }) => {
    // Setup mock that returns different responses for different multipliers
    await page.unroute('**/api/recipes/scale-smart');
    await page.route('**/api/recipes/scale-smart', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      const multiplier = postData?.multiplier || 2;

      const response = multiplier >= 3 ? mockSmartScaleResponse3x : mockSmartScaleResponse;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    // First change to 2x (smart scale only triggers for multiplier !== 1)
    const multiplier2x = page.getByRole('button', { name: /2x/i });
    await multiplier2x.click();
    await waitForPageReady(page);

    // Enable smart scale
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Verify initial 2x values
    const flourIngredient = page.getByText(/4 cups all-purpose flour/i);
    await expect(flourIngredient).toBeVisible();

    // Change to 3x
    const multiplier3x = page.getByRole('button', { name: /3x/i });
    await multiplier3x.click();
    await waitForPageReady(page);

    // Verify updated 3x values
    const flourIngredient3x = page.getByText(/6 cups all-purpose flour/i);
    await expect(flourIngredient3x).toBeVisible();
  });

  test('should update cooking tips when multiplier changes', async ({ page }) => {
    await page.unroute('**/api/recipes/scale-smart');
    await page.route('**/api/recipes/scale-smart', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      const multiplier = postData?.multiplier || 2;

      const response = multiplier >= 3 ? mockSmartScaleResponse3x : mockSmartScaleResponse;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    // First change to 2x (smart scale only triggers for multiplier !== 1)
    const multiplier2x = page.getByRole('button', { name: /2x/i });
    await multiplier2x.click();
    await waitForPageReady(page);

    // Enable smart scale
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Verify initial 2x cooking time - use more specific selector
    const timeAdjust2x = page.locator('.scaling-tips-time-text').filter({ hasText: /5-10 minutes/i });
    await expect(timeAdjust2x).toBeVisible();

    // Change to 3x
    const multiplier3x = page.getByRole('button', { name: /3x/i });
    await multiplier3x.click();
    await waitForPageReady(page);

    // Verify updated 3x cooking time
    const timeAdjust3x = page.locator('.scaling-tips-time-text').filter({ hasText: /15-20 minutes/i });
    await expect(timeAdjust3x).toBeVisible();
  });
});

test.describe('Smart Scaling: Error Handling', () => {
  test('should fallback to linear scaling when AI fails', async ({ page }) => {
    await setupMockedAPIs(page, { smartScaleResponse: mockSmartScaleErrorResponse });
    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);

    // Enable smart scale
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Page should still display ingredients (fallback worked)
    const ingredientList = page.locator('.ingredient-list');
    await expect(ingredientList).toBeVisible();

    // Should show scaled ingredients even with fallback
    const ingredients = page.locator('.ingredient-item');
    const count = await ingredients.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle API timeout gracefully', async ({ page }) => {
    // Setup a mock that times out
    await page.route('**/api/recipes/parse', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRecipeParseResponse),
      });
    });

    await page.route('**/api/recipes/scale', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockScaleResponse),
      });
    });

    await page.route('**/api/recipes/scale-smart', async (route) => {
      // Simulate network error
      await route.abort('timedout');
    });

    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);

    // Enable smart scale
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();

    // Wait a bit for error handling
    await page.waitForTimeout(1000);

    // Page should not crash - either show error or fallback
    await expect(page.locator('body')).toBeVisible();

    // Toggle should be accessible
    await expect(smartScaleToggle).toBeVisible();
  });

  test('should handle 503 API configuration error', async ({ page }) => {
    await page.route('**/api/recipes/parse', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRecipeParseResponse),
      });
    });

    await page.route('**/api/recipes/scale', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockScaleResponse),
      });
    });

    await page.route('**/api/recipes/scale-smart', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'AI_CONFIG_ERROR',
            message: 'AI service is not configured',
          },
        }),
      });
    });

    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);

    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Page should handle error gracefully
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Smart Scaling: Compare Smart vs Regular Scaling', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedAPIs(page);
    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);
    // Change multiplier to 2x to enable smart scale functionality
    const multiplier2x = page.getByRole('button', { name: /2x/i });
    await multiplier2x.click();
    await waitForPageReady(page);
  });

  test('should show different values between smart and regular scaling', async ({ page }) => {
    // First check regular scaling values (no smart scale) - at 2x, baking powder is 2 tsp
    const regularBakingPowder = page.getByText(/2 tsp baking powder/i);
    await expect(regularBakingPowder).toBeVisible();

    // Enable smart scale
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Smart scale should show reduced baking powder (1.5 tsp instead of 2 tsp)
    const smartBakingPowder = page.getByText(/1\.5 tsp baking powder/i);
    await expect(smartBakingPowder).toBeVisible();
  });

  test('should toggle between smart and regular scaling values', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });

    // Enable smart scale
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Verify AI adjusted value
    let bakingPowder = page.getByText(/1\.5 tsp baking powder/i);
    await expect(bakingPowder).toBeVisible();

    // Disable smart scale
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Should show regular scaled value
    bakingPowder = page.getByText(/2 tsp baking powder/i);
    await expect(bakingPowder).toBeVisible();

    // Re-enable smart scale
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Should show AI adjusted value again
    bakingPowder = page.getByText(/1\.5 tsp baking powder/i);
    await expect(bakingPowder).toBeVisible();
  });
});

test.describe('Smart Scaling: Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedAPIs(page);
    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);
    // Change to 2x for smart scale functionality
    const multiplier2x = page.getByRole('button', { name: /2x/i });
    await multiplier2x.click();
    await waitForPageReady(page);
  });

  test('should have proper ARIA attributes on toggle', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });

    // Should have role="switch"
    await expect(smartScaleToggle).toHaveAttribute('role', 'switch');

    // Should have aria-checked initially false
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'false');

    // Enable and check aria-checked changes
    await smartScaleToggle.click();
    // Wait for the hint text that confirms toggle is enabled
    await expect(page.getByText(/AI will intelligently adjust/i)).toBeVisible();
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'true');
  });

  test('should be keyboard accessible', async ({ page }) => {
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });

    // Focus the toggle
    await smartScaleToggle.focus();
    await expect(smartScaleToggle).toBeFocused();

    // Activate with Enter key
    await page.keyboard.press('Enter');
    // Wait for hint text to confirm toggle is enabled
    await expect(page.getByText(/AI will intelligently adjust/i)).toBeVisible();

    // Should be enabled
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'true');

    // Re-focus toggle (it may have lost focus after state update)
    await smartScaleToggle.focus();
    await expect(smartScaleToggle).toBeFocused();

    // Deactivate with Enter key again
    await page.keyboard.press('Enter');

    // Wait for hint text to disappear (confirms toggle is disabled)
    await expect(page.getByText(/AI will intelligently adjust/i)).not.toBeVisible();

    // Should be disabled
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'false');
  });

  test('should have accessible labels', async ({ page }) => {
    // Smart Scale label should be visible
    const label = page.getByText('Smart Scale');
    await expect(label).toBeVisible();

    // AI badge should be present
    const aiBadge = page.locator('.smart-scale-ai-badge');
    await expect(aiBadge).toBeVisible();
  });
});

test.describe('Smart Scaling: State Persistence', () => {
  test('should clear smart scale state when recipe changes', async ({ page }) => {
    await setupMockedAPIs(page);
    await page.goto('/');
    await waitForPageReady(page);
    await loadMockedRecipe(page);

    // Enable smart scale
    const smartScaleToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await smartScaleToggle.click();
    await waitForPageReady(page);

    // Verify enabled
    await expect(smartScaleToggle).toHaveAttribute('aria-checked', 'true');

    // Clear state and reload (simulates loading new recipe)
    await clearStateAndReload(page);

    // Load new recipe
    await loadMockedRecipe(page);

    // Smart scale should be off for new recipe
    const newToggle = page.getByRole('switch', { name: /toggle smart scaling/i });
    await expect(newToggle).toHaveAttribute('aria-checked', 'false');
  });
});
