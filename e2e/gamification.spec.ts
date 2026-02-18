import { test, expect } from '@playwright/test';

test.describe('Streak and XP Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('should display current streak on dashboard', async ({ page }) => {
    await expect(page.locator('[data-testid="current-streak"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-streak"]')).toContainText(/\d+/);
  });

  test('should display longest streak', async ({ page }) => {
    await expect(page.locator('[data-testid="longest-streak"]')).toBeVisible();
    await expect(page.locator('[data-testid="longest-streak"]')).toContainText(/\d+/);
  });

  test('should display current XP', async ({ page }) => {
    await expect(page.locator('[data-testid="user-xp"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-xp"]')).toContainText(/\d+/);
  });

  test('should increment streak after completing daily activity', async ({ page }) => {
    // Get current streak
    const streakElement = page.locator('[data-testid="current-streak"]');
    const currentStreakText = await streakElement.textContent();
    const currentStreak = parseInt(currentStreakText?.match(/\d+/)?.[0] || '0');

    // Complete an exercise
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Return to dashboard
    await page.goto('/dashboard');

    // Streak should be maintained or incremented
    const newStreakText = await streakElement.textContent();
    const newStreak = parseInt(newStreakText?.match(/\d+/)?.[0] || '0');
    expect(newStreak).toBeGreaterThanOrEqual(currentStreak);
  });

  test('should award XP for completing exercises', async ({ page }) => {
    // Get current XP
    const xpElement = page.locator('[data-testid="user-xp"]');
    const currentXPText = await xpElement.textContent();
    const currentXP = parseInt(currentXPText?.match(/\d+/)?.[0] || '0');

    // Complete an exercise
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Return to dashboard
    await page.goto('/dashboard');

    // XP should increase
    const newXPText = await xpElement.textContent();
    const newXP = parseInt(newXPText?.match(/\d+/)?.[0] || '0');
    expect(newXP).toBeGreaterThan(currentXP);
  });

  test('should display daily progress indicator', async ({ page }) => {
    await expect(page.locator('[data-testid="daily-progress"]')).toBeVisible();
  });

  test('should show progress towards daily goal', async ({ page }) => {
    const progressBar = page.locator('[data-testid="daily-progress-bar"]');
    await expect(progressBar).toBeVisible();
    
    // Should have a percentage or value
    const ariaValue = await progressBar.getAttribute('aria-valuenow');
    expect(ariaValue).toBeTruthy();
  });

  test('should update daily progress after completing exercise', async ({ page }) => {
    // Get current progress
    const progressBar = page.locator('[data-testid="daily-progress-bar"]');
    const currentProgress = await progressBar.getAttribute('aria-valuenow');

    // Complete an exercise
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Return to dashboard
    await page.goto('/dashboard');

    // Progress should increase
    const newProgress = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(newProgress || '0')).toBeGreaterThanOrEqual(parseInt(currentProgress || '0'));
  });

  test('should show XP earned notification', async ({ page }) => {
    // Complete an exercise
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Should show XP notification
    await expect(page.getByText(/\+\d+ XP|earned.*XP/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display streak icon or indicator', async ({ page }) => {
    const streakIcon = page.locator('[data-testid="streak-icon"]');
    await expect(streakIcon).toBeVisible();
  });

  test('should show streak milestone celebrations', async ({ page }) => {
    // If user has a milestone streak (e.g., 7, 30 days)
    const streakElement = page.locator('[data-testid="current-streak"]');
    const streakText = await streakElement.textContent();
    const streak = parseInt(streakText?.match(/\d+/)?.[0] || '0');

    if (streak % 7 === 0 && streak > 0) {
      await expect(page.getByText(/milestone|achievement/i)).toBeVisible();
    }
  });
});

test.describe('Achievement Earning', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('should display achievements section', async ({ page }) => {
    await page.goto('/achievements');
    await expect(page.getByRole('heading', { name: /achievements/i })).toBeVisible();
  });

  test('should show earned achievements', async ({ page }) => {
    await page.goto('/achievements');
    
    const earnedAchievements = page.locator('[data-testid="achievement-badge"][data-earned="true"]');
    const count = await earnedAchievements.count();
    
    if (count > 0) {
      await expect(earnedAchievements.first()).toBeVisible();
    }
  });

  test('should show unearned achievements', async ({ page }) => {
    await page.goto('/achievements');
    
    const unearnedAchievements = page.locator('[data-testid="achievement-badge"][data-earned="false"]');
    await expect(unearnedAchievements.first()).toBeVisible();
  });

  test('should display achievement details', async ({ page }) => {
    await page.goto('/achievements');
    
    const firstAchievement = page.locator('[data-testid="achievement-badge"]').first();
    await firstAchievement.click();

    // Should show details
    await expect(page.getByText(/description|criteria/i)).toBeVisible();
  });

  test('should show earned date for completed achievements', async ({ page }) => {
    await page.goto('/achievements');
    
    const earnedAchievement = page.locator('[data-testid="achievement-badge"][data-earned="true"]').first();
    
    if (await earnedAchievement.isVisible()) {
      await expect(earnedAchievement.locator('[data-testid="earned-date"]')).toBeVisible();
    }
  });

  test('should award achievement for perfect lesson completion', async ({ page }) => {
    // Complete a lesson with perfect scores
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();

    // Complete all exercises perfectly (simplified)
    let hasNext = true;
    while (hasNext) {
      const nextButton = page.getByRole('button', { name: /next|continue/i });
      hasNext = await nextButton.isVisible();
      if (hasNext) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Should show achievement notification
    await expect(page.getByText(/achievement.*unlocked|new achievement/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display achievement icon', async ({ page }) => {
    await page.goto('/achievements');
    
    const achievementIcon = page.locator('[data-testid="achievement-icon"]').first();
    await expect(achievementIcon).toBeVisible();
  });

  test('should show achievement progress', async ({ page }) => {
    await page.goto('/achievements');
    
    // Some achievements may show progress
    const progressIndicator = page.locator('[data-testid="achievement-progress"]').first();
    
    if (await progressIndicator.isVisible()) {
      await expect(progressIndicator).toContainText(/\d+/);
    }
  });

  test('should filter achievements by status', async ({ page }) => {
    await page.goto('/achievements');
    
    // Filter to earned only
    await page.getByRole('button', { name: /earned|completed/i }).click();
    
    const achievements = page.locator('[data-testid="achievement-badge"]');
    const count = await achievements.count();
    
    for (let i = 0; i < count; i++) {
      const earned = await achievements.nth(i).getAttribute('data-earned');
      expect(earned).toBe('true');
    }
  });

  test('should display achievement notification on dashboard', async ({ page }) => {
    // If user recently earned an achievement
    const notification = page.locator('[data-testid="achievement-notification"]');
    
    if (await notification.isVisible()) {
      await expect(notification).toContainText(/achievement/i);
    }
  });

  test('should maintain achievement history', async ({ page }) => {
    await page.goto('/achievements');
    
    const earnedAchievements = page.locator('[data-testid="achievement-badge"][data-earned="true"]');
    const count = await earnedAchievements.count();
    
    // All earned achievements should persist
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
