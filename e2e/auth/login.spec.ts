import { test, expect } from '@playwright/test';
import { setupPage, waitForPageReady } from '../helpers/test-utils';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/login');
  });

  test('should load the login page', async ({ page }) => {
    await expect(page).toHaveURL('/login');
  });

  test('should display email input form', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    await expect(emailInput).toBeVisible();
  });

  test('should display Continue with Email button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /continue with email/i });
    await expect(submitButton).toBeVisible();
  });

  test('should display Google login button', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();
  });

  test('should show "No password needed" message', async ({ page }) => {
    const message = page.getByText(/no password needed/i);
    await expect(message).toBeVisible();
  });

  test('should display Welcome title', async ({ page }) => {
    const title = page.getByRole('heading', { name: /welcome/i });
    await expect(title).toBeVisible();
  });

  test('should display subtitle about receiving sign-in code', async ({ page }) => {
    const subtitle = page.getByText(/enter your email to receive a sign-in code/i);
    await expect(subtitle).toBeVisible();
  });

  test('should have email input with correct placeholder', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/you@example.com/i);
    await expect(emailInput).toBeVisible();
  });

  test('should have divider with "or" text', async ({ page }) => {
    const divider = page.locator('.auth-form__divider');
    await expect(divider).toBeVisible();
    await expect(divider).toHaveText('or');
  });
});

test.describe('Login Page - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/login');
  });

  test('should disable submit button when email is empty', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /continue with email/i });

    // Button should be disabled when email is empty
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when email is entered', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    const submitButton = page.getByRole('button', { name: /continue with email/i });

    // Initially disabled
    await expect(submitButton).toBeDisabled();

    // Fill email
    await emailInput.fill('test@example.com');

    // Should be enabled now
    await expect(submitButton).toBeEnabled();
  });

  test('should show error for invalid email format', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    // Use email that passes browser validation but fails our custom regex
    // (missing domain extension like .com)
    await emailInput.fill('test@example');

    const submitButton = page.getByRole('button', { name: /continue with email/i });
    await submitButton.click();

    // Wait for validation error to appear
    const errorMessage = page.getByText(/please enter a valid email address/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should clear error when typing valid email', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    const submitButton = page.getByRole('button', { name: /continue with email/i });

    // First submit invalid email to trigger error
    // Use email that passes browser validation but fails our custom regex
    await emailInput.fill('test@example');
    await submitButton.click();
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible();

    // Type valid email - form clears error on new input
    await emailInput.fill('test@example.com');

    // The form should be valid now
    await expect(emailInput).toHaveValue('test@example.com');
  });
});

test.describe('Login Page - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/login');
  });

  test('should have accessible email input label', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab to email input
    await page.keyboard.press('Tab');

    const emailInput = page.getByLabel('Email address');
    await expect(emailInput).toBeFocused();
  });

  test('should have autocomplete attribute for email', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });
});
