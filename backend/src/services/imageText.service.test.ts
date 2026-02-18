import { describe, test, expect, beforeAll, vi } from 'vitest';
import fc from 'fast-check';
import { ImageTextService } from './imageText.service.js';
import { ImageTextRepository } from '../repositories/imageText.repository.js';
import { ImageRepository } from '../repositories/image.repository.js';
import { ImageText } from '../models/imageText.model.js';
import { Image } from '../models/image.model.js';
import { v4 as uuidv4 } from 'uuid';

describe('ImageTextService', () => {
  let imageTextService: ImageTextService;
  let mockImageTextRepository: ImageTextRepository;
  let mockImageRepository: ImageRepository;
  const mockImageTexts: Map<string, ImageText> = new Map();
  const mockImages: Map<string, Image> = new Map();

  beforeAll(() => {
    // Create mock image repository
    mockImageRepository = {
      findById: vi.fn(async (id: string) => {
        return mockImages.get(id) || null;
      }),
      create: vi.fn(async (input: any) => {
        const image: Image = {
          id: uuidv4(),
          filename: input.filename,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          altText: input.altText,
          createdAt: new Date(),
          createdBy: input.createdBy,
        };
        mockImages.set(image.id, image);
        return image;
      }),
    } as any;

    // Create mock image text repository
    mockImageTextRepository = {
      create: vi.fn(async (input: any) => {
        // Get next version for this image+language combination
        const existingVersions = Array.from(mockImageTexts.values()).filter(
          (it) => it.imageId === input.imageId && it.languageCode === input.languageCode
        );
        const nextVersion = existingVersions.length > 0
          ? Math.max(...existingVersions.map((it) => it.version)) + 1
          : 1;

        const imageText: ImageText = {
          id: uuidv4(),
          imageId: input.imageId,
          languageCode: input.languageCode,
          text: input.text,
          version: nextVersion,
          createdAt: new Date(),
        };
        mockImageTexts.set(imageText.id, imageText);
        return imageText;
      }),
      findLatestByImageAndLanguage: vi.fn(async (imageId: string, languageCode: string) => {
        const texts = Array.from(mockImageTexts.values()).filter(
          (it) => it.imageId === imageId && it.languageCode === languageCode
        );
        if (texts.length === 0) return null;
        return texts.reduce((latest, current) =>
          current.version > latest.version ? current : latest
        );
      }),
      findVersionHistory: vi.fn(async (imageId: string, languageCode: string) => {
        return Array.from(mockImageTexts.values())
          .filter((it) => it.imageId === imageId && it.languageCode === languageCode)
          .sort((a, b) => a.version - b.version);
      }),
      findByImageLanguageAndVersion: vi.fn(
        async (imageId: string, languageCode: string, version: number) => {
          return (
            Array.from(mockImageTexts.values()).find(
              (it) =>
                it.imageId === imageId &&
                it.languageCode === languageCode &&
                it.version === version
            ) || null
          );
        }
      ),
      findLanguagesByImage: vi.fn(async (imageId: string) => {
        const languages = new Set(
          Array.from(mockImageTexts.values())
            .filter((it) => it.imageId === imageId)
            .map((it) => it.languageCode)
        );
        return Array.from(languages).sort();
      }),
    } as any;

    imageTextService = new ImageTextService(mockImageTextRepository, mockImageRepository);
  });

  // Feature: language-learning-platform, Property 5: Multi-language text independence
  // Validates: Requirements 2.2
  test('updating text in one language does not affect text in other languages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          imageId: fc.uuid(),
          languages: fc.array(
            fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ar', 'he'),
            { minLength: 2, maxLength: 5 }
          ).map(langs => Array.from(new Set(langs))), // Ensure unique languages
          texts: fc.array(
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ),
          updatedText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        }),
        async ({ imageId, languages, texts, updatedText }) => {
          // Ensure we have at least 2 unique languages
          if (languages.length < 2) return;

          // Clear previous test data
          mockImageTexts.clear();
          mockImages.clear();

          // Create mock image
          const mockImage: Image = {
            id: imageId,
            filename: 'test.jpg',
            storagePath: '/test/test.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1000,
            altText: 'Test image',
            createdAt: new Date(),
            createdBy: uuidv4(),
          };
          mockImages.set(imageId, mockImage);

          // Add text for each language
          const addedTexts: Map<string, ImageText> = new Map();
          for (let i = 0; i < languages.length; i++) {
            const lang = languages[i];
            const text = texts[i % texts.length];
            const imageText = await imageTextService.addText({
              imageId,
              languageCode: lang,
              text,
            });
            addedTexts.set(lang, imageText);
          }

          // Select one language to update
          const languageToUpdate = languages[0];
          const otherLanguages = languages.slice(1);

          // Store the original texts for other languages
          const originalTexts: Map<string, string> = new Map();
          for (const lang of otherLanguages) {
            const text = addedTexts.get(lang);
            if (text) {
              originalTexts.set(lang, text.text);
            }
          }

          // Update text for the selected language
          await imageTextService.updateText(imageId, languageToUpdate, {
            text: updatedText,
          });

          // Verify that texts in other languages remain unchanged
          for (const lang of otherLanguages) {
            const currentText = await imageTextService.getTextByLanguage(imageId, lang);
            const originalText = originalTexts.get(lang);

            expect(currentText).toBeDefined();
            expect(currentText?.text).toBe(originalText);
            expect(currentText?.languageCode).toBe(lang);
          }

          // Verify that the updated language has the new text
          const updatedTextResult = await imageTextService.getTextByLanguage(
            imageId,
            languageToUpdate
          );
          expect(updatedTextResult).toBeDefined();
          expect(updatedTextResult?.text).toBe(updatedText);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('adding text in one language does not affect existing texts in other languages', async () => {
    mockImageTexts.clear();
    mockImages.clear();

    const imageId = uuidv4();
    const mockImage: Image = {
      id: imageId,
      filename: 'test.jpg',
      storagePath: '/test/test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      altText: 'Test image',
      createdAt: new Date(),
      createdBy: uuidv4(),
    };
    mockImages.set(imageId, mockImage);

    // Add English text
    const englishText = await imageTextService.addText({
      imageId,
      languageCode: 'en',
      text: 'Hello',
    });

    // Add Spanish text
    const spanishText = await imageTextService.addText({
      imageId,
      languageCode: 'es',
      text: 'Hola',
    });

    // Verify English text is unchanged
    const retrievedEnglish = await imageTextService.getTextByLanguage(imageId, 'en');
    expect(retrievedEnglish?.text).toBe('Hello');
    expect(retrievedEnglish?.version).toBe(1);

    // Verify Spanish text exists
    const retrievedSpanish = await imageTextService.getTextByLanguage(imageId, 'es');
    expect(retrievedSpanish?.text).toBe('Hola');
    expect(retrievedSpanish?.version).toBe(1);
  });

  test('updating text in one language multiple times does not affect other languages', async () => {
    mockImageTexts.clear();
    mockImages.clear();

    const imageId = uuidv4();
    const mockImage: Image = {
      id: imageId,
      filename: 'test.jpg',
      storagePath: '/test/test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      altText: 'Test image',
      createdAt: new Date(),
      createdBy: uuidv4(),
    };
    mockImages.set(imageId, mockImage);

    // Add texts in multiple languages
    await imageTextService.addText({
      imageId,
      languageCode: 'en',
      text: 'Hello',
    });

    await imageTextService.addText({
      imageId,
      languageCode: 'fr',
      text: 'Bonjour',
    });

    await imageTextService.addText({
      imageId,
      languageCode: 'de',
      text: 'Hallo',
    });

    // Update English text multiple times
    await imageTextService.updateText(imageId, 'en', { text: 'Hi' });
    await imageTextService.updateText(imageId, 'en', { text: 'Hey' });
    await imageTextService.updateText(imageId, 'en', { text: 'Greetings' });

    // Verify French and German texts remain unchanged
    const frenchText = await imageTextService.getTextByLanguage(imageId, 'fr');
    expect(frenchText?.text).toBe('Bonjour');
    expect(frenchText?.version).toBe(1);

    const germanText = await imageTextService.getTextByLanguage(imageId, 'de');
    expect(germanText?.text).toBe('Hallo');
    expect(germanText?.version).toBe(1);

    // Verify English text has been updated
    const englishText = await imageTextService.getTextByLanguage(imageId, 'en');
    expect(englishText?.text).toBe('Greetings');
    expect(englishText?.version).toBe(4);
  });

  // Feature: language-learning-platform, Property 6: Version history preservation
  // Validates: Requirements 2.3
  test('all previous versions are preserved and retrievable in chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          imageId: fc.uuid(),
          languageCode: fc.constantFrom('en', 'es', 'fr', 'de', 'it'),
          textUpdates: fc.array(
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 10 }
          ),
        }),
        async ({ imageId, languageCode, textUpdates }) => {
          // Clear previous test data
          mockImageTexts.clear();
          mockImages.clear();

          // Create mock image
          const mockImage: Image = {
            id: imageId,
            filename: 'test.jpg',
            storagePath: '/test/test.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1000,
            altText: 'Test image',
            createdAt: new Date(),
            createdBy: uuidv4(),
          };
          mockImages.set(imageId, mockImage);

          // Add initial text
          const initialText = await imageTextService.addText({
            imageId,
            languageCode,
            text: textUpdates[0],
          });

          // Update text multiple times
          const allTexts = [textUpdates[0]];
          for (let i = 1; i < textUpdates.length; i++) {
            await imageTextService.updateText(imageId, languageCode, {
              text: textUpdates[i],
            });
            allTexts.push(textUpdates[i]);
          }

          // Retrieve version history
          const history = await imageTextService.getVersionHistory(imageId, languageCode);

          // Verify all versions are present
          expect(history.length).toBe(textUpdates.length);

          // Verify versions are in chronological order (ascending)
          for (let i = 0; i < history.length; i++) {
            expect(history[i].version).toBe(i + 1);
            expect(history[i].text).toBe(allTexts[i]);
            expect(history[i].languageCode).toBe(languageCode);
            expect(history[i].imageId).toBe(imageId);
          }

          // Verify each version is individually retrievable
          for (let i = 0; i < history.length; i++) {
            const version = i + 1;
            const retrievedVersion = await imageTextService.getTextVersion(
              imageId,
              languageCode,
              version
            );
            expect(retrievedVersion).toBeDefined();
            expect(retrievedVersion?.version).toBe(version);
            expect(retrievedVersion?.text).toBe(allTexts[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('version history is preserved after multiple updates', async () => {
    mockImageTexts.clear();
    mockImages.clear();

    const imageId = uuidv4();
    const mockImage: Image = {
      id: imageId,
      filename: 'test.jpg',
      storagePath: '/test/test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      altText: 'Test image',
      createdAt: new Date(),
      createdBy: uuidv4(),
    };
    mockImages.set(imageId, mockImage);

    // Add initial text
    await imageTextService.addText({
      imageId,
      languageCode: 'en',
      text: 'Version 1',
    });

    // Update text multiple times
    await imageTextService.updateText(imageId, 'en', { text: 'Version 2' });
    await imageTextService.updateText(imageId, 'en', { text: 'Version 3' });
    await imageTextService.updateText(imageId, 'en', { text: 'Version 4' });

    // Get version history
    const history = await imageTextService.getVersionHistory(imageId, 'en');

    // Verify all versions are present
    expect(history.length).toBe(4);
    expect(history[0].text).toBe('Version 1');
    expect(history[0].version).toBe(1);
    expect(history[1].text).toBe('Version 2');
    expect(history[1].version).toBe(2);
    expect(history[2].text).toBe('Version 3');
    expect(history[2].version).toBe(3);
    expect(history[3].text).toBe('Version 4');
    expect(history[3].version).toBe(4);
  });

  test('can retrieve specific version from history', async () => {
    mockImageTexts.clear();
    mockImages.clear();

    const imageId = uuidv4();
    const mockImage: Image = {
      id: imageId,
      filename: 'test.jpg',
      storagePath: '/test/test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      altText: 'Test image',
      createdAt: new Date(),
      createdBy: uuidv4(),
    };
    mockImages.set(imageId, mockImage);

    // Add and update text
    await imageTextService.addText({
      imageId,
      languageCode: 'en',
      text: 'First version',
    });
    await imageTextService.updateText(imageId, 'en', { text: 'Second version' });
    await imageTextService.updateText(imageId, 'en', { text: 'Third version' });

    // Retrieve specific versions
    const version1 = await imageTextService.getTextVersion(imageId, 'en', 1);
    const version2 = await imageTextService.getTextVersion(imageId, 'en', 2);
    const version3 = await imageTextService.getTextVersion(imageId, 'en', 3);

    expect(version1?.text).toBe('First version');
    expect(version2?.text).toBe('Second version');
    expect(version3?.text).toBe('Third version');
  });

  // Feature: language-learning-platform, Property 8: Language-specific text display
  // Validates: Requirements 2.5
  test('displaying image with specific target language shows only text for that language', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          imageId: fc.uuid(),
          languages: fc.array(
            fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ar', 'he'),
            { minLength: 2, maxLength: 5 }
          ).map(langs => Array.from(new Set(langs))), // Ensure unique languages
          texts: fc.array(
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ),
        }),
        async ({ imageId, languages, texts }) => {
          // Ensure we have at least 2 unique languages
          if (languages.length < 2) return;

          // Clear previous test data
          mockImageTexts.clear();
          mockImages.clear();

          // Create mock image
          const mockImage: Image = {
            id: imageId,
            filename: 'test.jpg',
            storagePath: '/test/test.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1000,
            altText: 'Test image',
            createdAt: new Date(),
            createdBy: uuidv4(),
          };
          mockImages.set(imageId, mockImage);

          // Add text for each language
          const languageTexts: Map<string, string> = new Map();
          for (let i = 0; i < languages.length; i++) {
            const lang = languages[i];
            const text = texts[i % texts.length];
            await imageTextService.addText({
              imageId,
              languageCode: lang,
              text,
            });
            languageTexts.set(lang, text);
          }

          // For each language, verify that retrieving text returns only that language's text
          for (const targetLanguage of languages) {
            const retrievedText = await imageTextService.getTextByLanguage(
              imageId,
              targetLanguage
            );

            // Verify the text is for the correct language
            expect(retrievedText).toBeDefined();
            expect(retrievedText?.languageCode).toBe(targetLanguage);
            expect(retrievedText?.text).toBe(languageTexts.get(targetLanguage));

            // Verify it's not text from another language
            for (const otherLang of languages) {
              if (otherLang !== targetLanguage) {
                const otherText = languageTexts.get(otherLang);
                // If texts are different, verify we didn't get the wrong one
                if (otherText !== languageTexts.get(targetLanguage)) {
                  expect(retrievedText?.text).not.toBe(otherText);
                }
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('retrieving text for specific language returns only that language', async () => {
    mockImageTexts.clear();
    mockImages.clear();

    const imageId = uuidv4();
    const mockImage: Image = {
      id: imageId,
      filename: 'test.jpg',
      storagePath: '/test/test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      altText: 'Test image',
      createdAt: new Date(),
      createdBy: uuidv4(),
    };
    mockImages.set(imageId, mockImage);

    // Add texts in multiple languages
    await imageTextService.addText({
      imageId,
      languageCode: 'en',
      text: 'Hello',
    });

    await imageTextService.addText({
      imageId,
      languageCode: 'es',
      text: 'Hola',
    });

    await imageTextService.addText({
      imageId,
      languageCode: 'fr',
      text: 'Bonjour',
    });

    // Retrieve English text
    const englishText = await imageTextService.getTextByLanguage(imageId, 'en');
    expect(englishText?.languageCode).toBe('en');
    expect(englishText?.text).toBe('Hello');

    // Retrieve Spanish text
    const spanishText = await imageTextService.getTextByLanguage(imageId, 'es');
    expect(spanishText?.languageCode).toBe('es');
    expect(spanishText?.text).toBe('Hola');

    // Retrieve French text
    const frenchText = await imageTextService.getTextByLanguage(imageId, 'fr');
    expect(frenchText?.languageCode).toBe('fr');
    expect(frenchText?.text).toBe('Bonjour');
  });

  test('returns null when requesting text for language that does not exist', async () => {
    mockImageTexts.clear();
    mockImages.clear();

    const imageId = uuidv4();
    const mockImage: Image = {
      id: imageId,
      filename: 'test.jpg',
      storagePath: '/test/test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      altText: 'Test image',
      createdAt: new Date(),
      createdBy: uuidv4(),
    };
    mockImages.set(imageId, mockImage);

    // Add only English text
    await imageTextService.addText({
      imageId,
      languageCode: 'en',
      text: 'Hello',
    });

    // Try to retrieve Spanish text (which doesn't exist)
    const spanishText = await imageTextService.getTextByLanguage(imageId, 'es');
    expect(spanishText).toBeNull();
  });
});
