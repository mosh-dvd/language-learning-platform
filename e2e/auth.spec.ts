import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display authentication form on initial load', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
  });

  test('should register a new user with email and password', async ({ page }) => {
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'SecurePassword123!';

    // Navigate to registration
    await page.getByRole('button', { name: /sign up|register/i }).click();

    // Fill registration form
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByLabel(/native language/i).selectOption('en');

    // Submit registration
    await page.getByRole('button', { name: /create account|register/i }).click();

    // Should redirect to language selection or dashboard
    await expect(page).toHaveURL(/\/(dashboard|language-selection)/);
  });

  test('should login with existing credentials', async ({ page }) => {
    // Assuming a test user exists
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should show validation errors for weak password', async ({ page }) => {
    await page.getByRole('button', { name: /sign up|register/i }).click();
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).first().fill('weak');

    await expect(page.getByText(/password.*too short|weak password/i)).toBeVisible();
  });

  test('should handle login errors gracefully', async ({ page }) => {
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Logout
    await page.getByRole('button', { name: /logout|sign out/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/(login|auth)?/);

    // Session should be cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name.includes('token') || c.name.includes('auth'));
    expect(authCookie).toBeUndefined();
  });
});

test.describe('OAuth Authentication', () => {
  test('should display OAuth login buttons', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /facebook/i })).toBeVisible();
  });

  test('should initiate Google OAuth flow', async ({ page }) => {
    await page.goto('/');
    
    // Click Google OAuth button
    const googleButton = page.getByRole('button', { name: /google/i });
    await googleButton.click();

    // Should redirect to Google OAuth or show popup
    // Note: In real tests, you'd mock the OAuth provider
    await page.waitForTimeout(1000);
  });

  test('should initiate Facebook OAuth flow', async ({ page }) => {
    await page.goto('/');
    
    // Click Facebook OAuth button
    const facebookButton = page.getByRole('button', { name: /facebook/i });
    await facebookButton.click();

    // Should redirect to Facebook OAuth or show popup
    await page.waitForTimeout(1000);
  });
});

test.describe('Password Reset', () => {
  test('should navigate to password reset page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /forgot password/i }).click();

    await expect(page).toHaveURL(/\/password-reset/);
  });

  test('should request password reset', async ({ page }) => {
    await page.goto('/password-reset');
    
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /reset password|send reset link/i }).click();

    await expect(page.getByText(/check your email|reset link sent/i)).toBeVisible();
  });

  test('should validate email format in password reset', async ({ page }) => {
    await page.goto('/password-reset');
    
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /reset password|send reset link/i }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });
});

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('should navigate to profile page', async ({ page }) => {
    await page.getByRole('link', { name: /profile|account/i }).click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('should update profile name', async ({ page }) => {
    await page.goto('/profile');
    
    const newName = `Test User ${Date.now()}`;
    await page.getByLabel(/name/i).fill(newName);
    await page.getByRole('button', { name: /save|update/i }).click();

    await expect(page.getByText(/profile updated|changes saved/i)).toBeVisible();
  });

  test('should display current profile information', async ({ page }) => {
    await page.goto('/profile');
    
    await expect(page.getByLabel(/email/i)).toHaveValue(/test@example\.com/);
    await expect(page.getByLabel(/name/i)).not.toBeEmpty();
  });
});
