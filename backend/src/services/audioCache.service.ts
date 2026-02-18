import crypto from 'crypto';
import { CachedAudioRepository } from '../repositories/cachedAudio.repository.js';
import { CachedAudio, CreateCachedAudio } from '../models/cachedAudio.model.js';
import logger from '../utils/logger.js';

export type AudioProvider = 'web_speech_api' | 'google_cloud' | 'aws_polly' | 'azure_speech';

export interface CacheOptions {
  imageTextId?: string;
  provider: AudioProvider;
}

export class AudioCacheService {
  constructor(private cachedAudioRepository: CachedAudioRepository) {}

  /**
   * Generate a SHA-256 hash for text + language code combination
   */
  generateHash(text: string, languageCode: string): string {
    const content = `${text}:${languageCode}`;
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Look up cached audio by text and language
   */
  async lookup(
    text: string,
    languageCode: string,
    provider: AudioProvider
  ): Promise<CachedAudio | null> {
    const textHash = this.generateHash(text, languageCode);
    const cached = await this.cachedAudioRepository.findByTextHash(textHash, languageCode, provider);

    if (cached) {
      // Update access info asynchronously
      this.cachedAudioRepository.updateAccessInfo(cached.id).catch((err) => {
        logger.error('Failed to update cache access info:', err);
      });
    }

    return cached;
  }

  /**
   * Store generated audio in cache
   */
  async store(
    text: string,
    languageCode: string,
    audioUrl: string,
    options: CacheOptions
  ): Promise<CachedAudio> {
    const textHash = this.generateHash(text, languageCode);

    const data: CreateCachedAudio = {
      imageTextId: options.imageTextId,
      languageCode,
      textHash,
      audioUrl,
      provider: options.provider,
    };

    return await this.cachedAudioRepository.create(data);
  }

  /**
   * Clean up old cache entries based on TTL
   * @param daysOld Number of days since last access to consider entry as old
   * @returns Number of entries deleted
   */
  async cleanup(daysOld: number = 90): Promise<number> {
    return await this.cachedAudioRepository.deleteOldEntries(daysOld);
  }

  /**
   * Get old cache entries for manual cleanup (e.g., deleting files from storage)
   */
  async getOldEntries(daysOld: number = 90): Promise<CachedAudio[]> {
    return await this.cachedAudioRepository.findOldEntries(daysOld);
  }
}
