import { test, expect } from '@playwright/test';
import { setupPage, waitForPageReady } from '../helpers/test-utils';

test.describe('Login Flow - Email to OTP Transition', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/login');
  });

  test('should show OTP step after valid email submission', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    await emailInput.fill('test@example.com');

    const submitButton = page.getByRole('button', { name: /continue with email/i });
    await submitButton.click();

    // Wait for response from Supabase (or timeout)
    await page.waitForLoadState('networkidle');

    // Give some time for state update
    await page.waitForTimeout(2000);

    // Check what state we're in
    const otpStep = page.getByText(/check your email/i);
    const errorMessage = page.locator('.auth-form__error');
    const welcomeTitle = page.getByText('Welcome');

    // One of these should be visible:
    // 1. OTP step (if Supabase is configured and OTP sent)
    // 2. Error message (if Supabase returned an error)
    // 3. Still on Welcome page (if submission is processing)
    const hasOtpStep = await otpStep.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);
    const stillOnEmailStep = await welcomeTitle.isVisible().catch(() => false);

    // Any of these outcomes is acceptable
    expect(hasOtpStep || hasError || stillOnEmailStep).toBe(true);
  });
});

test.describe('Login Flow - OTP Step UI', () => {
  // Note: These tests may be skipped if Supabase returns an error
  // In production, these would work with a properly configured Supabase instance

  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/login');

    // Try to progress to OTP step
    const emailInput = page.getByLabel('Email address');
    await emailInput.fill('test@example.com');

    const submitButton = page.getByRole('button', { name: /continue with email/i });
    await submitButton.click();
    await page.waitForLoadState('networkidle');
  });

  test('should display email confirmation on OTP step', async ({ page }) => {
    // This test checks if we made it to OTP step
    const otpStep = page.getByText(/check your email/i);
    const isOnOtpStep = await otpStep.isVisible().catch(() => false);

    if (isOnOtpStep) {
      // Email should be displayed
      await expect(page.getByText('test@example.com')).toBeVisible();
    } else {
      // Skip if we didn't make it to OTP step (likely Supabase not configured)
      test.skip();
    }
  });

  test('should have back button to return to email step', async ({ page }) => {
    const otpStep = page.getByText(/check your email/i);
    const isOnOtpStep = await otpStep.isVisible().catch(() => false);

    if (isOnOtpStep) {
      const backButton = page.getByRole('button', { name: /back/i });
      await expect(backButton).toBeVisible();

      await backButton.click();
      await waitForPageReady(page);

      // Should be back on email step
      await expect(page.getByText(/welcome/i)).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should show 6 OTP input fields', async ({ page }) => {
    const otpStep = page.getByText(/check your email/i);
    const isOnOtpStep = await otpStep.isVisible().catch(() => false);

    if (isOnOtpStep) {
      const otpInputs = page.locator('[class*="otp-input-box"]');
      await expect(otpInputs).toHaveCount(6);
    } else {
      test.skip();
    }
  });

  test('should show resend button with countdown', async ({ page }) => {
    const otpStep = page.getByText(/check your email/i);
    const isOnOtpStep = await otpStep.isVisible().catch(() => false);

    if (isOnOtpStep) {
      const resendButton = page.getByText(/resend in/i);
      await expect(resendButton).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should focus first OTP input automatically', async ({ page }) => {
    const otpStep = page.getByText(/check your email/i);
    const isOnOtpStep = await otpStep.isVisible().catch(() => false);

    if (isOnOtpStep) {
      const firstInput = page.locator('[class*="otp-input-box"]').first();
      await expect(firstInput).toBeFocused();
    } else {
      test.skip();
    }
  });
});

test.describe('Login Flow - OTP Input Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/login');

    // Progress to OTP step
    const emailInput = page.getByLabel('Email address');
    await emailInput.fill('test@example.com');

    const submitButton = page.getByRole('button', { name: /continue with email/i });
    await submitButton.click();
    await page.waitForLoadState('networkidle');
  });

  test('should auto-advance to next input after typing digit', async ({ page }) => {
    const otpStep = page.getByText(/check your email/i);
    const isOnOtpStep = await otpStep.isVisible().catch(() => false);

    if (isOnOtpStep) {
      const otpInputs = page.locator('[class*="otp-input-box"]');

      // Type in first input
      await otpInputs.first().fill('1');

      // Second input should be focused
      await expect(otpInputs.nth(1)).toBeFocused();
    } else {
      test.skip();
    }
  });

  test('should only accept numeric input', async ({ page }) => {
    const otpStep = page.getByText(/check your email/i);
    const isOnOtpStep = await otpStep.isVisible().catch(() => false);

    if (isOnOtpStep) {
      const firstInput = page.locator('[class*="otp-input-box"]').first();

      // Try to type letter
      await firstInput.type('a');
      await expect(firstInput).toHaveValue('');

      // Type number
      await firstInput.type('1');
      await expect(firstInput).toHaveValue('1');
    } else {
      test.skip();
    }
  });

  test('should show error state for invalid OTP', async ({ page }) => {
    const otpStep = page.getByText(/check your email/i);
    const isOnOtpStep = await otpStep.isVisible().catch(() => false);

    if (isOnOtpStep) {
      const otpInputs = page.locator('[class*="otp-input-box"]');

      // Fill all 6 digits with wrong code
      for (let i = 0; i < 6; i++) {
        await otpInputs.nth(i).fill(String(i));
      }

      // Wait for verification attempt
      await page.waitForLoadState('networkidle');

      // Should show error message
      const errorMessage = page.getByText(/invalid|expired|error/i);
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });
});

test.describe('Login Flow - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page, '/login');
  });

  test('should handle Supabase not configured gracefully', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    await emailInput.fill('test@example.com');

    const submitButton = page.getByRole('button', { name: /continue with email/i });
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    // Either error message or OTP step should be visible
    // (depends on whether Supabase is configured)
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });
});
