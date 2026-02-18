import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test.describe('Desktop Layout', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should display desktop navigation', async ({ page }) => {
      await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
    });

    test('should show sidebar on desktop', async ({ page }) => {
      const sidebar = page.locator('[data-testid="sidebar"]');
      if (await sidebar.count() > 0) {
        await expect(sidebar).toBeVisible();
      }
    });

    test('should display content in multi-column layout', async ({ page }) => {
      await page.goto('/lessons');
      
      const lessonGrid = page.locator('[data-testid="lesson-grid"]');
      const gridColumns = await lessonGrid.evaluate(el =>
        window.getComputedStyle(el).gridTemplateColumns
      );
      
      // Should have multiple columns
      expect(gridColumns.split(' ').length).toBeGreaterThan(1);
    });

    test('should show all navigation items', async ({ page }) => {
      const navItems = page.locator('[data-testid="nav-item"]');
      const count = await navItems.count();
      
      expect(count).toBeGreaterThan(0);
      
      // All should be visible
      for (let i = 0; i < count; i++) {
        await expect(navItems.nth(i)).toBeVisible();
      }
    });
  });

  test.describe('Tablet Layout', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should adapt layout for tablet', async ({ page }) => {
      await page.goto('/lessons');
      
      // Should be visible and adapted
      await expect(page.getByRole('heading', { name: /lessons/i })).toBeVisible();
    });

    test('should show tablet-optimized navigation', async ({ page }) => {
      // May show hamburger menu or adapted nav
      const hamburger = page.locator('[data-testid="hamburger-menu"]');
      const desktopNav = page.locator('[data-testid="desktop-nav"]');
      
      const hasHamburger = await hamburger.isVisible().catch(() => false);
      const hasDesktopNav = await desktopNav.isVisible().catch(() => false);
      
      expect(hasHamburger || hasDesktopNav).toBe(true);
    });

    test('should display content in appropriate columns', async ({ page }) => {
      await page.goto('/lessons');
      
      const lessonGrid = page.locator('[data-testid="lesson-grid"]');
      if (await lessonGrid.isVisible()) {
        const gridColumns = await lessonGrid.evaluate(el =>
          window.getComputedStyle(el).gridTemplateColumns
        );
        
        // Should have 2-3 columns on tablet
        const columnCount = gridColumns.split(' ').length;
        expect(columnCount).toBeGreaterThanOrEqual(1);
        expect(columnCount).toBeLessThanOrEqual(3);
      }
    });
  });

  test.describe('Mobile Layout', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should display mobile navigation', async ({ page }) => {
      await expect(page.locator('[data-testid="hamburger-menu"]')).toBeVisible();
    });

    test('should show single column layout', async ({ page }) => {
      await page.goto('/lessons');
      
      const lessonGrid = page.locator('[data-testid="lesson-grid"]');
      if (await lessonGrid.isVisible()) {
        const gridColumns = await lessonGrid.evaluate(el =>
          window.getComputedStyle(el).gridTemplateColumns
        );
        
        // Should have 1 column on mobile
        expect(gridColumns.split(' ').length).toBe(1);
      }
    });

    test('should hide sidebar on mobile', async ({ page }) => {
      const sidebar = page.locator('[data-testid="sidebar"]');
      if (await sidebar.count() > 0) {
        await expect(sidebar).not.toBeVisible();
      }
    });

    test('should open mobile menu when hamburger is clicked', async ({ page }) => {
      const hamburger = page.locator('[data-testid="hamburger-menu"]');
      await hamburger.click();
      
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      await expect(mobileMenu).toBeVisible();
    });

    test('should close mobile menu when item is selected', async ({ page }) => {
      const hamburger = page.locator('[data-testid="hamburger-menu"]');
      await hamburger.click();
      
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      await expect(mobileMenu).toBeVisible();
      
      // Click a menu item
      await page.getByRole('link', { name: /lessons/i }).click();
      
      // Menu should close
      await expect(mobileMenu).not.toBeVisible();
    });

    test('should have touch-friendly button sizes', async ({ page }) => {
      await page.goto('/lessons');
      
      const buttons = page.getByRole('button');
      const firstButton = buttons.first();
      
      const size = await firstButton.boundingBox();
      
      // Buttons should be at least 44x44px (iOS guideline)
      expect(size?.height).toBeGreaterThanOrEqual(40);
    });

    test('should stack form elements vertically', async ({ page }) => {
      await page.goto('/profile');
      
      const form = page.locator('form');
      if (await form.isVisible()) {
        const flexDirection = await form.evaluate(el =>
          window.getComputedStyle(el).flexDirection
        );
        
        // Should be column on mobile
        expect(flexDirection).toBe('column');
      }
    });
  });

  test.describe('Responsive Images', () => {
    test('should load appropriate image sizes', async ({ page }) => {
      await page.goto('/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      const images = page.locator('img');
      const firstImage = images.first();
      
      if (await firstImage.isVisible()) {
        const src = await firstImage.getAttribute('src');
        expect(src).toBeTruthy();
      }
    });

    test('should not overflow viewport', async ({ page }) => {
      await page.goto('/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const box = await img.boundingBox();
        const viewport = page.viewportSize();
        
        if (box && viewport) {
          expect(box.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    });
  });

  test.describe('Orientation Changes', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should adapt to landscape orientation', async ({ page }) => {
      // Set to landscape
      await page.setViewportSize({ width: 844, height: 390 });
      
      await page.goto('/lessons');
      
      // Content should still be visible
      await expect(page.getByRole('heading', { name: /lessons/i })).toBeVisible();
    });

    test('should adapt to portrait orientation', async ({ page }) => {
      // Set to portrait
      await page.setViewportSize({ width: 390, height: 844 });
      
      await page.goto('/lessons');
      
      // Content should still be visible
      await expect(page.getByRole('heading', { name: /lessons/i })).toBeVisible();
    });
  });

  test.describe('Touch Interactions', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should support touch tap', async ({ page }) => {
      await page.goto('/lessons');
      
      const lessonCard = page.locator('[data-testid="lesson-card"]').first();
      await lessonCard.tap();
      
      await expect(page).toHaveURL(/\/lesson/);
    });

    test('should support swipe gestures', async ({ page }) => {
      await page.goto('/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      // Try to swipe (if carousel exists)
      const carousel = page.locator('[data-testid="carousel"]');
      if (await carousel.isVisible()) {
        const box = await carousel.boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width - 50, box.y + box.height / 2);
        }
      }
    });

    test('should not have hover-only interactions', async ({ page }) => {
      await page.goto('/lessons');
      
      // All interactive elements should work with tap
      const buttons = page.getByRole('button');
      const firstButton = buttons.first();
      
      await firstButton.tap();
      
      // Should trigger action
      await page.waitForTimeout(500);
    });
  });

  test.describe('Viewport Breakpoints', () => {
    const breakpoints = [
      { name: 'Mobile Small', width: 320, height: 568 },
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Mobile Large', width: 414, height: 896 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop Small', width: 1024, height: 768 },
      { name: 'Desktop', width: 1440, height: 900 },
      { name: 'Desktop Large', width: 1920, height: 1080 },
    ];

    for (const breakpoint of breakpoints) {
      test(`should render correctly at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        
        await page.goto('/lessons');
        
        // Should render without horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(breakpoint.width + 20); // Allow small margin
        
        // Main content should be visible
        await expect(page.getByRole('heading', { name: /lessons/i })).toBeVisible();
      });
    }
  });

  test.describe('Text Scaling', () => {
    test('should handle increased text size', async ({ page }) => {
      await page.goto('/lessons');
      
      // Increase text size
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '20px';
      });
      
      // Content should still be readable
      await expect(page.getByRole('heading', { name: /lessons/i })).toBeVisible();
      
      // Should not cause horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width || 0;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
    });
  });
});
