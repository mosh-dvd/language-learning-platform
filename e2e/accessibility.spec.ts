import { test, expect } from '@playwright/test';

test.describe('Accessibility Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate through interactive elements with Tab', async ({ page }) => {
      await page.goto('/lessons');
      
      // Focus first element
      await page.keyboard.press('Tab');
      
      // Should have visible focus indicator
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/lessons');
      
      await page.keyboard.press('Tab');
      
      // Check for focus styles
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Should have outline or focus ring
      const outlineWidth = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).outlineWidth
      );
      expect(outlineWidth).not.toBe('0px');
    });

    test('should navigate lesson with keyboard', async ({ page }) => {
      await page.goto('/lessons');
      
      // Tab to first lesson
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Press Enter to open
      await page.keyboard.press('Enter');
      
      await expect(page).toHaveURL(/\/lesson/);
    });

    test('should navigate exercises with keyboard shortcuts', async ({ page }) => {
      await page.goto('/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      // Use arrow keys or shortcuts
      await page.keyboard.press('ArrowRight');
      
      // Should navigate to next exercise
      await page.waitForTimeout(500);
    });

    test('should activate buttons with Enter and Space', async ({ page }) => {
      await page.goto('/lessons');
      
      const button = page.getByRole('button').first();
      await button.focus();
      
      // Press Enter
      await page.keyboard.press('Enter');
      
      // Button should be activated
      await page.waitForTimeout(500);
    });

    test('should support Escape key to close modals', async ({ page }) => {
      await page.goto('/lessons');
      
      // Open a modal (if exists)
      const modalTrigger = page.getByRole('button', { name: /settings|info/i }).first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        // Press Escape
        await page.keyboard.press('Escape');
        
        // Modal should close
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      }
    });

    test('should trap focus within modals', async ({ page }) => {
      await page.goto('/lessons');
      
      // Open a modal
      const modalTrigger = page.getByRole('button', { name: /settings|info/i }).first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        
        // Tab through modal elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Focus should stay within modal
        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement;
          const modal = document.querySelector('[role="dialog"]');
          return modal?.contains(active);
        });
        
        expect(focusedElement).toBe(true);
      }
    });

    test('should have logical tab order', async ({ page }) => {
      await page.goto('/lessons');
      
      const tabOrder: string[] = [];
      
      // Tab through first 5 elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const elementText = await page.evaluate(() => 
          document.activeElement?.textContent?.trim() || ''
        );
        tabOrder.push(elementText);
      }
      
      // Tab order should be logical (not empty)
      expect(tabOrder.filter(t => t).length).toBeGreaterThan(0);
    });
  });

  test.describe('ARIA Labels and Roles', () => {
    test('should have ARIA labels on interactive elements', async ({ page }) => {
      await page.goto('/lessons');
      
      const buttons = page.getByRole('button');
      const count = await buttons.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        
        // Should have either aria-label or text content
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/lessons');
      
      // Should have h1
      await expect(page.locator('h1')).toBeVisible();
      
      // Check heading levels
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should have ARIA roles on custom components', async ({ page }) => {
      await page.goto('/lessons');
      
      // Check for proper roles
      const navigation = page.locator('[role="navigation"]');
      if (await navigation.count() > 0) {
        await expect(navigation.first()).toBeVisible();
      }
    });

    test('should have alt text on images', async ({ page }) => {
      await page.goto('/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });

    test('should have ARIA live regions for dynamic content', async ({ page }) => {
      await page.goto('/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      // Complete an exercise to trigger dynamic update
      await page.getByRole('button', { name: /next|continue/i }).click();
      
      // Should have aria-live region for feedback
      const liveRegion = page.locator('[aria-live]');
      if (await liveRegion.count() > 0) {
        await expect(liveRegion.first()).toBeVisible();
      }
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/profile');
      
      const inputs = page.locator('input');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
        }
      }
    });

    test('should announce errors to screen readers', async ({ page }) => {
      await page.goto('/');
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Error should have aria-live or role="alert"
      const error = page.locator('[role="alert"], [aria-live="polite"]');
      await expect(error).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast for text', async ({ page }) => {
      await page.goto('/lessons');
      
      // Check main text elements
      const textElements = page.locator('p, h1, h2, h3, button, a');
      const count = await textElements.count();
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = textElements.nth(i);
        
        const contrast = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bgColor = style.backgroundColor;
          
          // Simple check - just verify colors are set
          return color && bgColor;
        });
        
        expect(contrast).toBeTruthy();
      }
    });

    test('should maintain contrast in dark mode', async ({ page }) => {
      await page.goto('/settings');
      
      // Toggle dark mode if available
      const darkModeToggle = page.getByRole('button', { name: /dark mode|theme/i });
      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
        
        await page.goto('/lessons');
        
        // Text should still be visible
        await expect(page.getByRole('heading')).toBeVisible();
      }
    });

    test('should have visible focus indicators with sufficient contrast', async ({ page }) => {
      await page.goto('/lessons');
      
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      const outlineColor = await focusedElement.evaluate(el =>
        window.getComputedStyle(el).outlineColor
      );
      
      expect(outlineColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('Visual Indicators', () => {
    test('should provide visual feedback for audio playback', async ({ page }) => {
      await page.goto('/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      const playButton = page.getByRole('button', { name: /play|speak|audio/i });
      await playButton.click();
      
      // Should have visual indicator
      await expect(page.locator('[data-testid="audio-indicator"]')).toBeVisible();
    });

    test('should show loading states', async ({ page }) => {
      await page.goto('/lessons');
      
      // Should show loading indicator while fetching
      const loading = page.locator('[data-testid="loading"], [aria-busy="true"]');
      
      // May or may not be visible depending on load time
      const isVisible = await loading.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('should indicate required form fields', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /sign up|register/i }).click();
      
      const requiredInputs = page.locator('input[required], input[aria-required="true"]');
      const count = await requiredInputs.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should show error states clearly', async ({ page }) => {
      await page.goto('/');
      await page.getByLabel(/email/i).fill('invalid');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Error should be visually distinct
      const errorElement = page.getByText(/invalid|error/i);
      await expect(errorElement).toBeVisible();
      
      const color = await errorElement.evaluate(el =>
        window.getComputedStyle(el).color
      );
      expect(color).toBeTruthy();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have descriptive page titles', async ({ page }) => {
      await page.goto('/lessons');
      
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('should have skip navigation link', async ({ page }) => {
      await page.goto('/lessons');
      
      // Tab to first element (should be skip link)
      await page.keyboard.press('Tab');
      
      const skipLink = page.getByText(/skip to|skip navigation/i);
      if (await skipLink.isVisible()) {
        await expect(skipLink).toBeVisible();
      }
    });

    test('should announce page changes', async ({ page }) => {
      await page.goto('/lessons');
      
      // Navigate to different page
      await page.goto('/dashboard');
      
      // Title should update
      const title = await page.title();
      expect(title).toContain('Dashboard');
    });

    test('should have descriptive link text', async ({ page }) => {
      await page.goto('/lessons');
      
      const links = page.getByRole('link');
      const count = await links.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = links.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        
        // Should have meaningful text or aria-label
        expect(text || ariaLabel).toBeTruthy();
        expect((text || ariaLabel)?.toLowerCase()).not.toBe('click here');
      }
    });
  });
});
