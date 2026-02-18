import { test, expect } from '@playwright/test';

test.describe('TTS Audio Playback', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    
    // Login and navigate to lesson
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();
  });

  test('should display audio playback button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /play|speak|audio/i })).toBeVisible();
  });

  test('should play audio when button is clicked', async ({ page }) => {
    const playButton = page.getByRole('button', { name: /play|speak|audio/i });
    await playButton.click();

    // Should show playing state
    await expect(playButton).toHaveAttribute('data-playing', 'true', { timeout: 2000 });
  });

  test('should show visual feedback during audio playback', async ({ page }) => {
    const playButton = page.getByRole('button', { name: /play|speak|audio/i });
    await playButton.click();

    // Should have visual indicator
    await expect(page.locator('[data-testid="audio-indicator"]')).toBeVisible();
  });

  test('should return to ready state after audio completes', async ({ page }) => {
    const playButton = page.getByRole('button', { name: /play|speak|audio/i });
    await playButton.click();

    // Wait for audio to complete
    await page.waitForTimeout(3000);

    // Should return to ready state
    await expect(playButton).not.toHaveAttribute('data-playing', 'true');
  });

  test('should use correct language for TTS', async ({ page }) => {
    // The audio should be in the target language
    // This is verified by the backend, but we can check the request
    await page.route('**/api/tts/**', route => {
      const url = route.request().url();
      expect(url).toContain('language=');
      route.continue();
    });

    await page.getByRole('button', { name: /play|speak|audio/i }).click();
  });

  test('should cache audio for repeated playback', async ({ page }) => {
    const playButton = page.getByRole('button', { name: /play|speak|audio/i });
    
    let requestCount = 0;
    await page.route('**/api/tts/**', route => {
      requestCount++;
      route.continue();
    });

    // Play audio twice
    await playButton.click();
    await page.waitForTimeout(2000);
    await playButton.click();
    await page.waitForTimeout(2000);

    // Should only make one request (cached)
    expect(requestCount).toBeLessThanOrEqual(1);
  });

  test('should handle TTS errors gracefully', async ({ page }) => {
    // Mock TTS error
    await page.route('**/api/tts/**', route => {
      route.abort('failed');
    });

    await page.getByRole('button', { name: /play|speak|audio/i }).click();

    // Should show error message
    await expect(page.getByText(/audio.*error|unable to play/i)).toBeVisible();
  });

  test('should provide visual indicators for accessibility', async ({ page }) => {
    const playButton = page.getByRole('button', { name: /play|speak|audio/i });
    
    // Should have aria-label
    await expect(playButton).toHaveAttribute('aria-label');
    
    await playButton.click();
    
    // Should update aria-label during playback
    const ariaLabel = await playButton.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/playing|stop/i);
  });
});

test.describe('STT Pronunciation Practice', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    
    // Login and navigate to speech practice
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto('/lessons');
    await page.locator('[data-testid="lesson-card"]').first().click();
  });

  test('should display microphone button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /microphone|record|speak/i })).toBeVisible();
  });

  test('should request microphone permission', async ({ page, context }) => {
    // Clear permissions
    await context.clearPermissions();
    
    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    await micButton.click();

    // Should show permission request or message
    await page.waitForTimeout(1000);
  });

  test('should show recording state when microphone is active', async ({ page }) => {
    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    await micButton.click();

    // Should show recording indicator
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
  });

  test('should display recognized text', async ({ page }) => {
    // Mock speech recognition
    await page.evaluate(() => {
      // @ts-ignore
      window.SpeechRecognition = class {
        start() {
          setTimeout(() => {
            // @ts-ignore
            this.onresult({
              results: [[{ transcript: 'hello', confidence: 0.9 }]]
            });
          }, 1000);
        }
        stop() {}
        addEventListener() {}
      };
    });

    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    await micButton.click();

    // Should display recognized text
    await expect(page.locator('[data-testid="recognized-text"]')).toBeVisible({ timeout: 3000 });
  });

  test('should calculate and display pronunciation score', async ({ page }) => {
    // Mock speech recognition with correct text
    await page.evaluate(() => {
      // @ts-ignore
      window.SpeechRecognition = class {
        start() {
          setTimeout(() => {
            // @ts-ignore
            this.onresult({
              results: [[{ transcript: 'hello', confidence: 0.95 }]]
            });
          }, 1000);
        }
        stop() {}
        addEventListener() {}
      };
    });

    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    await micButton.click();

    // Should display score
    await expect(page.locator('[data-testid="pronunciation-score"]')).toBeVisible({ timeout: 3000 });
  });

  test('should show positive feedback for high scores', async ({ page }) => {
    // Mock high score
    await page.evaluate(() => {
      // @ts-ignore
      window.SpeechRecognition = class {
        start() {
          setTimeout(() => {
            // @ts-ignore
            this.onresult({
              results: [[{ transcript: 'hello', confidence: 0.95 }]]
            });
          }, 1000);
        }
        stop() {}
        addEventListener() {}
      };
    });

    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    await micButton.click();

    await page.waitForTimeout(2000);

    // Should show positive feedback
    await expect(page.getByText(/excellent|great|perfect/i)).toBeVisible();
  });

  test('should show retry option for low scores', async ({ page }) => {
    // Mock low score
    await page.evaluate(() => {
      // @ts-ignore
      window.SpeechRecognition = class {
        start() {
          setTimeout(() => {
            // @ts-ignore
            this.onresult({
              results: [[{ transcript: 'wrong', confidence: 0.5 }]]
            });
          }, 1000);
        }
        stop() {}
        addEventListener() {}
      };
    });

    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    await micButton.click();

    await page.waitForTimeout(2000);

    // Should show retry button
    await expect(page.getByRole('button', { name: /try again|retry/i })).toBeVisible();
  });

  test('should allow retrying pronunciation', async ({ page }) => {
    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    
    // First attempt
    await micButton.click();
    await page.waitForTimeout(2000);

    // Retry
    const retryButton = page.getByRole('button', { name: /try again|retry/i });
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
    }
  });

  test('should handle STT errors gracefully', async ({ page }) => {
    // Mock STT error
    await page.evaluate(() => {
      // @ts-ignore
      window.SpeechRecognition = class {
        start() {
          setTimeout(() => {
            // @ts-ignore
            this.onerror({ error: 'network' });
          }, 1000);
        }
        stop() {}
        addEventListener() {}
      };
    });

    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    await micButton.click();

    // Should show error message
    await expect(page.getByText(/error|unable to recognize/i)).toBeVisible({ timeout: 3000 });
  });

  test('should display expected text for comparison', async ({ page }) => {
    await expect(page.locator('[data-testid="expected-text"]')).toBeVisible();
  });

  test('should use correct language for STT', async ({ page }) => {
    // Mock to verify language setting
    let languageUsed = '';
    await page.evaluate(() => {
      // @ts-ignore
      window.SpeechRecognition = class {
        set lang(value) {
          // @ts-ignore
          window.sttLanguage = value;
        }
        start() {}
        stop() {}
        addEventListener() {}
      };
    });

    const micButton = page.getByRole('button', { name: /microphone|record|speak/i });
    await micButton.click();

    languageUsed = await page.evaluate(() => {
      // @ts-ignore
      return window.sttLanguage;
    });

    expect(languageUsed).toBeTruthy();
  });
});
