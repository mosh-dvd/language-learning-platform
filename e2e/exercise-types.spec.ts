import { test, expect } from '@playwright/test';

test.describe('Exercise Types', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a lesson
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();
  });

  test.describe('Image-Text Exercise', () => {
    test('should display image with text', async ({ page }) => {
      // Navigate to an image-text exercise
      await expect(page.locator('[data-testid="image-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="image-card"] img')).toBeVisible();
      await expect(page.locator('[data-testid="image-text"]')).toBeVisible();
    });

    test('should show text in target language', async ({ page }) => {
      const imageText = page.locator('[data-testid="image-text"]');
      await expect(imageText).toBeVisible();
      await expect(imageText).not.toBeEmpty();
    });

    test('should display hint button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /hint|show translation/i })).toBeVisible();
    });

    test('should show native language translation when hint is clicked', async ({ page }) => {
      const hintButton = page.getByRole('button', { name: /hint|show translation/i });
      await hintButton.click();

      await expect(page.locator('[data-testid="hint-text"]')).toBeVisible();
    });

    test('should hide hint when clicked again', async ({ page }) => {
      const hintButton = page.getByRole('button', { name: /hint|show translation/i });
      
      // Show hint
      await hintButton.click();
      await expect(page.locator('[data-testid="hint-text"]')).toBeVisible();

      // Hide hint
      await hintButton.click();
      await expect(page.locator('[data-testid="hint-text"]')).not.toBeVisible();
    });
  });

  test.describe('Matching Pairs Exercise', () => {
    test('should display matching pairs interface', async ({ page }) => {
      // Navigate to matching pairs exercise
      await page.goto('/lesson/matching-pairs-lesson');
      
      await expect(page.getByText(/match|pair/i)).toBeVisible();
      await expect(page.locator('[data-testid="matching-item"]')).toHaveCount(4, { timeout: 5000 });
    });

    test('should allow selecting items to match', async ({ page }) => {
      await page.goto('/lesson/matching-pairs-lesson');
      
      const firstItem = page.locator('[data-testid="matching-item"]').first();
      await firstItem.click();
      
      await expect(firstItem).toHaveClass(/selected|active/);
    });

    test('should validate correct matches', async ({ page }) => {
      await page.goto('/lesson/matching-pairs-lesson');
      
      // Select two matching items
      await page.locator('[data-testid="matching-item"]').nth(0).click();
      await page.locator('[data-testid="matching-item"]').nth(1).click();

      // Should show feedback
      await expect(page.getByText(/correct|match/i)).toBeVisible({ timeout: 2000 });
    });

    test('should show feedback for incorrect matches', async ({ page }) => {
      await page.goto('/lesson/matching-pairs-lesson');
      
      // Select two non-matching items
      await page.locator('[data-testid="matching-item"]').nth(0).click();
      await page.locator('[data-testid="matching-item"]').nth(3).click();

      // Should show feedback
      await expect(page.getByText(/incorrect|try again/i)).toBeVisible({ timeout: 2000 });
    });

    test('should complete when all pairs are matched', async ({ page }) => {
      await page.goto('/lesson/matching-pairs-lesson');
      
      // Match all pairs (simplified - assumes 2 pairs)
      const items = page.locator('[data-testid="matching-item"]');
      const count = await items.count();
      
      for (let i = 0; i < count; i += 2) {
        await items.nth(i).click();
        await items.nth(i + 1).click();
        await page.waitForTimeout(500);
      }

      // Should show completion
      await expect(page.getByText(/complete|well done/i)).toBeVisible();
    });
  });

  test.describe('Fill in the Blank Exercise', () => {
    test('should display sentence with blank', async ({ page }) => {
      await page.goto('/lesson/fill-blank-lesson');
      
      await expect(page.locator('[data-testid="sentence"]')).toBeVisible();
      await expect(page.locator('[data-testid="blank-input"]')).toBeVisible();
    });

    test('should display word options', async ({ page }) => {
      await page.goto('/lesson/fill-blank-lesson');
      
      const options = page.locator('[data-testid="word-option"]');
      await expect(options).toHaveCount(3, { timeout: 5000 });
    });

    test('should allow selecting a word option', async ({ page }) => {
      await page.goto('/lesson/fill-blank-lesson');
      
      const firstOption = page.locator('[data-testid="word-option"]').first();
      await firstOption.click();

      await expect(page.locator('[data-testid="blank-input"]')).not.toBeEmpty();
    });

    test('should validate correct answer', async ({ page }) => {
      await page.goto('/lesson/fill-blank-lesson');
      
      // Select correct option (assuming first is correct)
      await page.locator('[data-testid="word-option"]').first().click();
      await page.getByRole('button', { name: /check|submit/i }).click();

      await expect(page.getByText(/correct|right/i)).toBeVisible();
    });

    test('should show feedback for incorrect answer', async ({ page }) => {
      await page.goto('/lesson/fill-blank-lesson');
      
      // Select incorrect option
      await page.locator('[data-testid="word-option"]').last().click();
      await page.getByRole('button', { name: /check|submit/i }).click();

      await expect(page.getByText(/incorrect|try again/i)).toBeVisible();
    });

    test('should allow retry after incorrect answer', async ({ page }) => {
      await page.goto('/lesson/fill-blank-lesson');
      
      // Submit incorrect answer
      await page.locator('[data-testid="word-option"]').last().click();
      await page.getByRole('button', { name: /check|submit/i }).click();
      await expect(page.getByText(/incorrect/i)).toBeVisible();

      // Should allow retry
      await expect(page.getByRole('button', { name: /try again|retry/i })).toBeVisible();
    });
  });

  test.describe('Listening Comprehension Exercise', () => {
    test('should display listening comprehension interface', async ({ page }) => {
      await page.goto('/lesson/listening-lesson');
      
      await expect(page.getByText(/listen|audio/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /play|listen/i })).toBeVisible();
    });

    test('should display multiple image options', async ({ page }) => {
      await page.goto('/lesson/listening-lesson');
      
      const imageOptions = page.locator('[data-testid="image-option"]');
      await expect(imageOptions).toHaveCount(4, { timeout: 5000 });
    });

    test('should play audio when play button is clicked', async ({ page }) => {
      await page.goto('/lesson/listening-lesson');
      
      const playButton = page.getByRole('button', { name: /play|listen/i });
      await playButton.click();

      // Should show playing state
      await expect(playButton).toHaveAttribute('data-playing', 'true', { timeout: 2000 });
    });

    test('should allow selecting an image option', async ({ page }) => {
      await page.goto('/lesson/listening-lesson');
      
      const firstImage = page.locator('[data-testid="image-option"]').first();
      await firstImage.click();

      await expect(firstImage).toHaveClass(/selected|active/);
    });

    test('should validate correct image selection', async ({ page }) => {
      await page.goto('/lesson/listening-lesson');
      
      // Play audio
      await page.getByRole('button', { name: /play|listen/i }).click();
      await page.waitForTimeout(1000);

      // Select correct image (assuming first is correct)
      await page.locator('[data-testid="image-option"]').first().click();
      await page.getByRole('button', { name: /check|submit/i }).click();

      await expect(page.getByText(/correct|right/i)).toBeVisible();
    });

    test('should show feedback for incorrect selection', async ({ page }) => {
      await page.goto('/lesson/listening-lesson');
      
      // Select incorrect image
      await page.locator('[data-testid="image-option"]').last().click();
      await page.getByRole('button', { name: /check|submit/i }).click();

      await expect(page.getByText(/incorrect|try again/i)).toBeVisible();
    });

    test('should allow replaying audio', async ({ page }) => {
      await page.goto('/lesson/listening-lesson');
      
      const playButton = page.getByRole('button', { name: /play|listen/i });
      
      // Play once
      await playButton.click();
      await page.waitForTimeout(2000);

      // Play again
      await playButton.click();
      await expect(playButton).toHaveAttribute('data-playing', 'true');
    });
  });
});
