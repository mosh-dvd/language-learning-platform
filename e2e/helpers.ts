import { Page } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

/**
 * Login helper function
 */
export async function login(page: Page, email: string = 'test@example.com', password: string = 'password123') {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL(/\/dashboard/);
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  await page.getByRole('button', { name: /logout|sign out/i }).click();
  await page.waitForURL(/\/(login|auth)?/);
}

/**
 * Register a new user
 */
export async function register(page: Page, email?: string, password: string = 'SecurePassword123!') {
  const timestamp = Date.now();
  const userEmail = email || `test${timestamp}@example.com`;

  await page.goto('/');
  await page.getByRole('button', { name: /sign up|register/i }).click();
  await page.getByLabel(/email/i).fill(userEmail);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  await page.getByLabel(/native language/i).selectOption('en');
  await page.getByRole('button', { name: /create account|register/i }).click();

  return { email: userEmail, password };
}

/**
 * Navigate to a specific lesson
 */
export async function navigateToLesson(page: Page, lessonIndex: number = 0) {
  await page.goto('/lessons');
  await page.locator('[data-testid="lesson-card"]').nth(lessonIndex).click();
}

/**
 * Complete an exercise
 */
export async function completeExercise(page: Page) {
  const nextButton = page.getByRole('button', { name: /next|continue/i });
  if (await nextButton.isVisible()) {
    await nextButton.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Complete all exercises in a lesson
 */
export async function completeLesson(page: Page) {
  let hasNext = true;
  let attempts = 0;
  const maxAttempts = 20; // Prevent infinite loops

  while (hasNext && attempts < maxAttempts) {
    const nextButton = page.getByRole('button', { name: /next|continue/i });
    hasNext = await nextButton.isVisible();
    if (hasNext) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
    attempts++;
  }
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(response => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  });
}

/**
 * Mock API response
 */
export async function mockAPIResponse(page: Page, urlPattern: string | RegExp, response: any) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate(el => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  });
}

/**
 * Get color contrast ratio
 */
export async function getContrastRatio(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate(el => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = style.backgroundColor;

    // Parse RGB values
    const parseRGB = (rgb: string) => {
      const match = rgb.match(/\d+/g);
      return match ? match.map(Number) : [0, 0, 0];
    };

    const [r1, g1, b1] = parseRGB(color);
    const [r2, g2, b2] = parseRGB(bgColor);

    // Calculate relative luminance
    const getLuminance = (r: number, g: number, b: number) => {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(r1, g1, b1);
    const l2 = getLuminance(r2, g2, b2);

    // Calculate contrast ratio
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  });
}

/**
 * Take a screenshot with a custom name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

/**
 * Wait for element to be stable (not animating)
 */
export async function waitForStable(page: Page, selector: string, timeout: number = 5000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  
  // Wait for animations to complete
  await page.waitForTimeout(300);
}

/**
 * Simulate slow network
 */
export async function simulateSlowNetwork(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 50 * 1024, // 50kb/s
    uploadThroughput: 20 * 1024, // 20kb/s
    latency: 500, // 500ms
  });
}

/**
 * Simulate offline mode
 */
export async function simulateOffline(page: Page) {
  await page.context().setOffline(true);
}

/**
 * Restore online mode
 */
export async function restoreOnline(page: Page) {
  await page.context().setOffline(false);
}
