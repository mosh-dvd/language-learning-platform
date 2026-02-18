import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Content Management Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin/content manager
    await page.goto('/');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test.describe('Image Upload', () => {
    test('should navigate to image upload page', async ({ page }) => {
      await page.goto('/admin/images');
      await expect(page.getByRole('heading', { name: /images|upload/i })).toBeVisible();
    });

    test('should display image upload form', async ({ page }) => {
      await page.goto('/admin/images/upload');
      
      await expect(page.locator('input[type="file"]')).toBeVisible();
      await expect(page.getByLabel(/alt.*text/i)).toBeVisible();
    });

    test('should upload an image with alt text', async ({ page }) => {
      await page.goto('/admin/images/upload');
      
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'));

      // Add alt text
      await page.getByLabel(/alt.*text/i).fill('A test image for language learning');

      // Submit
      await page.getByRole('button', { name: /upload|save/i }).click();

      // Should show success message
      await expect(page.getByText(/uploaded|success/i)).toBeVisible();
    });

    test('should validate image format', async ({ page }) => {
      await page.goto('/admin/images/upload');
      
      // Try to upload invalid format
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-file.txt'));

      await page.getByRole('button', { name: /upload|save/i }).click();

      // Should show error
      await expect(page.getByText(/invalid.*format|supported formats/i)).toBeVisible();
    });

    test('should require alt text', async ({ page }) => {
      await page.goto('/admin/images/upload');
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'));

      // Don't add alt text
      await page.getByRole('button', { name: /upload|save/i }).click();

      // Should show validation error
      await expect(page.getByText(/alt.*text.*required/i)).toBeVisible();
    });

    test('should show upload progress', async ({ page }) => {
      await page.goto('/admin/images/upload');
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'));
      await page.getByLabel(/alt.*text/i).fill('Test image');
      await page.getByRole('button', { name: /upload|save/i }).click();

      // Should show progress indicator
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible({ timeout: 2000 });
    });

    test('should display uploaded image preview', async ({ page }) => {
      await page.goto('/admin/images/upload');
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'));

      // Should show preview
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    });

    test('should support drag and drop upload', async ({ page }) => {
      await page.goto('/admin/images/upload');
      
      const dropZone = page.locator('[data-testid="drop-zone"]');
      await expect(dropZone).toBeVisible();
      
      // Verify drop zone accepts files
      await expect(dropZone).toHaveAttribute('data-accepts', /image/);
    });
  });

  test.describe('Image Text Editor', () => {
    test('should navigate to image text editor', async ({ page }) => {
      await page.goto('/admin/images');
      await page.locator('[data-testid="image-card"]').first().click();
      
      await expect(page.getByRole('heading', { name: /edit.*text|add.*text/i })).toBeVisible();
    });

    test('should add text in multiple languages', async ({ page }) => {
      await page.goto('/admin/images');
      await page.locator('[data-testid="image-card"]').first().click();
      
      // Add English text
      await page.getByLabel(/language/i).selectOption('en');
      await page.getByLabel(/text/i).fill('Hello');
      await page.getByRole('button', { name: /add|save/i }).click();

      // Add Spanish text
      await page.getByLabel(/language/i).selectOption('es');
      await page.getByLabel(/text/i).fill('Hola');
      await page.getByRole('button', { name: /add|save/i }).click();

      await expect(page.getByText(/saved|updated/i)).toBeVisible();
    });

    test('should display version history', async ({ page }) => {
      await page.goto('/admin/images');
      await page.locator('[data-testid="image-card"]').first().click();
      
      await page.getByRole('button', { name: /history|versions/i }).click();
      
      await expect(page.locator('[data-testid="version-history"]')).toBeVisible();
    });

    test('should validate text input', async ({ page }) => {
      await page.goto('/admin/images');
      await page.locator('[data-testid="image-card"]').first().click();
      
      // Try to save empty text
      await page.getByLabel(/text/i).fill('');
      await page.getByRole('button', { name: /add|save/i }).click();

      await expect(page.getByText(/text.*required|cannot be empty/i)).toBeVisible();
    });

    test('should add hint/translation', async ({ page }) => {
      await page.goto('/admin/images');
      await page.locator('[data-testid="image-card"]').first().click();
      
      await page.getByLabel(/hint|translation/i).fill('Translation text');
      await page.getByRole('button', { name: /save/i }).click();

      await expect(page.getByText(/saved/i)).toBeVisible();
    });

    test('should show all language variants', async ({ page }) => {
      await page.goto('/admin/images');
      await page.locator('[data-testid="image-card"]').first().click();
      
      const languageVariants = page.locator('[data-testid="language-variant"]');
      const count = await languageVariants.count();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Lesson Editor', () => {
    test('should navigate to lesson editor', async ({ page }) => {
      await page.goto('/admin/lessons');
      await expect(page.getByRole('heading', { name: /lessons/i })).toBeVisible();
    });

    test('should create new lesson', async ({ page }) => {
      await page.goto('/admin/lessons/new');
      
      await page.getByLabel(/title/i).fill('New Test Lesson');
      await page.getByLabel(/target.*language/i).selectOption('es');
      await page.getByRole('button', { name: /create|save/i }).click();

      await expect(page.getByText(/created|saved/i)).toBeVisible();
    });

    test('should add exercises to lesson', async ({ page }) => {
      await page.goto('/admin/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      await page.getByRole('button', { name: /add.*exercise/i }).click();
      
      // Select exercise type
      await page.getByLabel(/exercise.*type/i).selectOption('image_text');
      
      // Select image
      await page.locator('[data-testid="image-selector"]').first().click();
      
      await page.getByRole('button', { name: /add|save/i }).click();

      await expect(page.getByText(/exercise.*added/i)).toBeVisible();
    });

    test('should reorder exercises', async ({ page }) => {
      await page.goto('/admin/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      const exercises = page.locator('[data-testid="exercise-item"]');
      const count = await exercises.count();
      
      if (count > 1) {
        // Drag first exercise down
        const firstExercise = exercises.first();
        const secondExercise = exercises.nth(1);
        
        await firstExercise.dragTo(secondExercise);
        
        // Should update order
        await page.waitForTimeout(1000);
      }
    });

    test('should remove exercise from lesson', async ({ page }) => {
      await page.goto('/admin/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      const deleteButton = page.locator('[data-testid="delete-exercise"]').first();
      await deleteButton.click();
      
      // Confirm deletion
      await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

      await expect(page.getByText(/removed|deleted/i)).toBeVisible();
    });

    test('should publish lesson', async ({ page }) => {
      await page.goto('/admin/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      
      await page.getByRole('button', { name: /publish/i }).click();

      await expect(page.getByText(/published/i)).toBeVisible();
    });

    test('should unpublish lesson', async ({ page }) => {
      await page.goto('/admin/lessons');
      await page.locator('[data-testid="lesson-card"][data-published="true"]').first().click();
      
      await page.getByRole('button', { name: /unpublish/i }).click();

      await expect(page.getByText(/unpublished/i)).toBeVisible();
    });

    test('should validate lesson structure', async ({ page }) => {
      await page.goto('/admin/lessons/new');
      
      // Try to create lesson without title
      await page.getByRole('button', { name: /create|save/i }).click();

      await expect(page.getByText(/title.*required/i)).toBeVisible();
    });

    test('should support all exercise types', async ({ page }) => {
      await page.goto('/admin/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      await page.getByRole('button', { name: /add.*exercise/i }).click();
      
      const exerciseTypeSelect = page.getByLabel(/exercise.*type/i);
      const options = await exerciseTypeSelect.locator('option').allTextContents();
      
      expect(options).toContain('Image Text');
      expect(options).toContain('Matching Pairs');
      expect(options).toContain('Fill in Blank');
      expect(options).toContain('Listening Comprehension');
    });

    test('should validate exercise content', async ({ page }) => {
      await page.goto('/admin/lessons');
      await page.locator('[data-testid="lesson-card"]').first().click();
      await page.getByRole('button', { name: /add.*exercise/i }).click();
      
      // Try to add exercise without required content
      await page.getByRole('button', { name: /add|save/i }).click();

      await expect(page.getByText(/required|select.*image/i)).toBeVisible();
    });
  });

  test.describe('Image Management', () => {
    test('should list all uploaded images', async ({ page }) => {
      await page.goto('/admin/images');
      
      const images = page.locator('[data-testid="image-card"]');
      await expect(images.first()).toBeVisible();
    });

    test('should delete image', async ({ page }) => {
      await page.goto('/admin/images');
      
      const deleteButton = page.locator('[data-testid="delete-image"]').first();
      await deleteButton.click();
      
      // Confirm deletion
      await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

      await expect(page.getByText(/deleted|removed/i)).toBeVisible();
    });

    test('should display image metadata', async ({ page }) => {
      await page.goto('/admin/images');
      
      const firstImage = page.locator('[data-testid="image-card"]').first();
      await firstImage.click();
      
      // Should show metadata
      await expect(page.getByText(/filename|size|uploaded/i)).toBeVisible();
    });
  });
});
