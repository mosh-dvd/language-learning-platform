import { test, expect } from '@playwright/test';

test.describe('Language Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('should display language selector on first login', async ({ page, context }) => {
    // Clear cookies to simulate first login
    await context.clearCookies();
    await page.goto('/');
    
    // Login
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should show language selection
    await expect(page.getByText(/select.*language|choose.*language/i)).toBeVisible();
  });

  test('should select native language', async ({ page }) => {
    await page.goto('/language-selection');
    
    await page.getByLabel(/native language/i).selectOption('en');
    await expect(page.getByLabel(/native language/i)).toHaveValue('en');
  });

  test('should select target language', async ({ page }) => {
    await page.goto('/language-selection');
    
    await page.getByLabel(/target language|learning language/i).selectOption('es');
    await expect(page.getByLabel(/target language|learning language/i)).toHaveValue('es');
  });

  test('should validate that native and target languages are different', async ({ page }) => {
    await page.goto('/language-selection');
    
    await page.getByLabel(/native language/i).selectOption('en');
    await page.getByLabel(/target language|learning language/i).selectOption('en');
    await page.getByRole('button', { name: /continue|save/i }).click();

    await expect(page.getByText(/different language|cannot be the same/i)).toBeVisible();
  });

  test('should save language preferences', async ({ page }) => {
    await page.goto('/language-selection');
    
    await page.getByLabel(/native language/i).selectOption('en');
    await page.getByLabel(/target language|learning language/i).selectOption('es');
    await page.getByRole('button', { name: /continue|save/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should persist language preferences across sessions', async ({ page, context }) => {
    await page.goto('/language-selection');
    
    await page.getByLabel(/native language/i).selectOption('en');
    await page.getByLabel(/target language|learning language/i).selectOption('fr');
    await page.getByRole('button', { name: /continue|save/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Reload page
    await page.reload();

    // Navigate back to language selection
    await page.goto('/language-selection');

    // Should show previously selected languages
    await expect(page.getByLabel(/native language/i)).toHaveValue('en');
    await expect(page.getByLabel(/target language|learning language/i)).toHaveValue('fr');
  });

  test('should display interface in native language', async ({ page }) => {
    await page.goto('/language-selection');
    
    await page.getByLabel(/native language/i).selectOption('en');
    await page.getByLabel(/target language|learning language/i).selectOption('es');
    await page.getByRole('button', { name: /continue|save/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Interface should be in English
    await expect(page.getByText(/dashboard|home|lessons/i)).toBeVisible();
  });

  test('should allow changing language preferences from settings', async ({ page }) => {
    await page.goto('/settings');
    
    await page.getByLabel(/target language|learning language/i).selectOption('de');
    await page.getByRole('button', { name: /save|update/i }).click();

    await expect(page.getByText(/settings saved|preferences updated/i)).toBeVisible();
  });

  test('should display supported languages', async ({ page }) => {
    await page.goto('/language-selection');
    
    const targetLanguageSelect = page.getByLabel(/target language|learning language/i);
    const options = await targetLanguageSelect.locator('option').allTextContents();

    // Should have multiple language options
    expect(options.length).toBeGreaterThan(1);
    expect(options).toContain('Spanish');
    expect(options).toContain('French');
  });
});
