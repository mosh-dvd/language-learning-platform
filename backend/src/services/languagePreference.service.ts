import { UserRepository } from '../repositories/user.repository.js';
import pool from '../db/pool.js';

// Supported languages (ISO 639-1 codes)
const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
  'ar', 'hi', 'he', 'nl', 'pl', 'sv', 'tr', 'vi', 'th', 'id'
];

export class LanguagePreferenceService {
  private userRepository: UserRepository;

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository(pool);
  }

  isLanguageSupported(languageCode: string): boolean {
    // Support both "en" and "en-US" formats
    const baseLanguage = languageCode.split('-')[0].toLowerCase();
    return SUPPORTED_LANGUAGES.includes(baseLanguage);
  }

  async setLanguagePreference(userId: string, languageCode: string): Promise<void> {
    // Validate language code
    if (!this.isLanguageSupported(languageCode)) {
      throw new Error(`Language '${languageCode}' is not supported`);
    }

    // Update user's native language preference
    await this.userRepository.update(userId, {
      nativeLanguage: languageCode,
    });
  }

  async getLanguagePreference(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.nativeLanguage;
  }

  getSupportedLanguages(): string[] {
    return [...SUPPORTED_LANGUAGES];
  }
}

// Export singleton instance
export const languagePreferenceService = new LanguagePreferenceService();
