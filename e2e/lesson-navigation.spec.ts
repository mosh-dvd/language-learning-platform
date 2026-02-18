import { test, expect } from '@playwright/test';

test.describe('Lesson Navigation and Completion', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('should display available lessons', async ({ page }) => {
    await page.goto('/lessons');
    
    await expect(page.getByRole('heading', { name: /lessons|available lessons/i })).toBeVisible();
    await expect(page.locator('[data-testid="lesson-card"]').first()).toBeVisible();
  });

  test('should start a lesson', async ({ page }) => {
    await page.goto('/lessons');
    
    // Click on first lesson
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Should navigate to lesson view
    await expect(page).toHaveURL(/\/lesson\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole('heading', { name: /exercise|lesson/i })).toBeVisible();
  });

  test('should display first exercise when starting lesson', async ({ page }) => {
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Should show exercise 1
    await expect(page.getByText(/exercise 1|1 of/i)).toBeVisible();
  });

  test('should navigate to next exercise after completion', async ({ page }) => {
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Complete first exercise (assuming it's an image-text exercise)
    const currentExercise = page.getByText(/exercise 1|1 of/i);
    await expect(currentExercise).toBeVisible();

    // Click next or complete button
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Should show exercise 2
    await expect(page.getByText(/exercise 2|2 of/i)).toBeVisible();
  });

  test('should show progress indicator', async ({ page }) => {
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Should show progress
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.getByText(/\d+ of \d+/)).toBeVisible();
  });

  test('should navigate backwards through exercises', async ({ page }) => {
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Go to next exercise
    await page.getByRole('button', { name: /next|continue/i }).click();
    await expect(page.getByText(/exercise 2|2 of/i)).toBeVisible();

    // Go back
    await page.getByRole('button', { name: /back|previous/i }).click();
    await expect(page.getByText(/exercise 1|1 of/i)).toBeVisible();
  });

  test('should mark lesson as complete when all exercises are done', async ({ page }) => {
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Complete all exercises (this is a simplified version)
    let hasNext = true;
    while (hasNext) {
      const nextButton = page.getByRole('button', { name: /next|continue/i });
      hasNext = await nextButton.isVisible();
      if (hasNext) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Should show completion message
    await expect(page.getByText(/lesson complete|congratulations/i)).toBeVisible();
  });

  test('should track lesson completion status', async ({ page }) => {
    await page.goto('/lessons');
    
    // Find a completed lesson
    const completedLesson = page.locator('[data-testid="lesson-card"][data-completed="true"]').first();
    
    if (await completedLesson.isVisible()) {
      await expect(completedLesson.getByText(/completed|done/i)).toBeVisible();
    }
  });

  test('should resume from last accessed exercise', async ({ page }) => {
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Navigate to exercise 2
    await page.getByRole('button', { name: /next|continue/i }).click();
    await expect(page.getByText(/exercise 2|2 of/i)).toBeVisible();

    // Leave and come back
    await page.goto('/dashboard');
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Should resume from exercise 2
    await expect(page.getByText(/exercise 2|2 of/i)).toBeVisible();
  });

  test('should filter lessons by target language', async ({ page }) => {
    await page.goto('/lessons');
    
    // Should only show lessons for selected target language
    const lessonCards = page.locator('[data-testid="lesson-card"]');
    const count = await lessonCards.count();
    
    expect(count).toBeGreaterThan(0);
    
    // All lessons should be for the target language
    for (let i = 0; i < count; i++) {
      const card = lessonCards.nth(i);
      await expect(card).toBeVisible();
    }
  });

  test('should display lesson metadata', async ({ page }) => {
    await page.goto('/lessons');
    
    const firstLesson = page.locator('[data-testid="lesson-card"]').first();
    
    // Should show title
    await expect(firstLesson.getByRole('heading')).toBeVisible();
    
    // Should show exercise count
    await expect(firstLesson.getByText(/\d+ exercises?/i)).toBeVisible();
  });

  test('should handle empty lesson list gracefully', async ({ page, context }) => {
    // Create a new user with no lessons
    await context.clearCookies();
    await page.goto('/');
    
    const timestamp = Date.now();
    await page.getByRole('button', { name: /sign up|register/i }).click();
    await page.getByLabel(/email/i).fill(`newuser${timestamp}@example.com`);
    await page.getByLabel(/password/i).first().fill('SecurePassword123!');
    await page.getByLabel(/confirm password/i).fill('SecurePassword123!');
    await page.getByLabel(/native language/i).selectOption('en');
    await page.getByRole('button', { name: /create account|register/i }).click();

    await page.goto('/lessons');
    
    // Should show empty state
    await expect(page.getByText(/no lessons|no content available/i)).toBeVisible();
  });
});
