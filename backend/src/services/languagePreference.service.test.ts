import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { LanguagePreferenceService } from './languagePreference.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { User } from '../models/user.model.js';
import { v4 as uuidv4 } from 'uuid';

describe('LanguagePreferenceService', () => {
  let languageService: LanguagePreferenceService;
  let mockUserRepository: UserRepository;
  const mockUsers: Map<string, User> = new Map();

  beforeEach(() => {
    mockUsers.clear();

    mockUserRepository = {
      findById: vi.fn(async (id: string) => {
        const user = mockUsers.get(id);
        return user || null;
      }),
      update: vi.fn(async (id: string, updates: any) => {
        const user = mockUsers.get(id);
        if (!user) {
          throw new Error(`User not found for update: ${id}, available: ${Array.from(mockUsers.keys()).join(', ')}`);
        }
        const updated = { ...user, ...updates, updatedAt: new Date() };
        mockUsers.set(id, updated);
        return updated;
      }),
    } as any;

    languageService = new LanguagePreferenceService(mockUserRepository);
  });

  // Feature: language-learning-platform, Property 18: Language validation
  // Validates: Requirements 6.2
  describe('Property 18: Language validation', () => {
    it('should accept supported language codes and reject unsupported ones', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
            'ar', 'hi', 'he', 'nl', 'pl', 'sv', 'tr', 'vi', 'th', 'id',
            'en-US', 'es-ES', 'fr-FR' // Also test with region codes
          ),
          async (languageCode) => {
            // Supported languages should be accepted
            const isSupported = languageService.isLanguageSupported(languageCode);
            expect(isSupported).toBe(true);

            // Should be able to set preference for supported language
            const userId = uuidv4();
            const user: User = {
              id: userId,
              email: `test-${userId}@example.com`,
              nativeLanguage: 'en',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockUsers.set(userId, user);

            // Verify user was added
            const foundUser = mockUsers.get(userId);
            expect(foundUser).toBeDefined();

            await languageService.setLanguagePreference(userId, languageCode);
            
            // Verify user still exists after update
            const updatedUser = mockUsers.get(userId);
            expect(updatedUser).toBeDefined();
            
            const preference = await languageService.getLanguagePreference(userId);
            expect(preference).toBe(languageCode);
            
            // Clean up
            mockUsers.delete(userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject unsupported language codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 5 }).filter(
            s => !['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
                   'ar', 'hi', 'he', 'nl', 'pl', 'sv', 'tr', 'vi', 'th', 'id'].includes(s.split('-')[0].toLowerCase())
          ),
          async (unsupportedLanguage) => {
            const isSupported = languageService.isLanguageSupported(unsupportedLanguage);
            expect(isSupported).toBe(false);

            // Should throw error when trying to set unsupported language
            const userId = uuidv4();
            const user: User = {
              id: userId,
              email: 'test@example.com',
              nativeLanguage: 'en',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockUsers.set(userId, user);

            await expect(
              languageService.setLanguagePreference(userId, unsupportedLanguage)
            ).rejects.toThrow('not supported');

            mockUsers.delete(userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return list of supported languages', () => {
      const languages = languageService.getSupportedLanguages();
      expect(languages).toBeDefined();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
    });
  });
});
