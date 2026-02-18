import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioCacheService } from './audioCache.service.js';
import { CachedAudioRepository } from '../repositories/cachedAudio.repository.js';
import { CachedAudio } from '../models/cachedAudio.model.js';

describe('AudioCacheService', () => {
  let service: AudioCacheService;
  let mockRepository: CachedAudioRepository;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findByTextHash: vi.fn(),
      updateAccessInfo: vi.fn(),
      deleteOldEntries: vi.fn(),
      findOldEntries: vi.fn(),
    } as any;

    service = new AudioCacheService(mockRepository);
  });

  describe('generateHash', () => {
    it('should generate consistent SHA-256 hash for same input', () => {
      const text = 'Hello world';
      const languageCode = 'en-US';

      const hash1 = service.generateHash(text, languageCode);
      const hash2 = service.generateHash(text, languageCode);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should generate different hashes for different text', () => {
      const languageCode = 'en-US';

      const hash1 = service.generateHash('Hello', languageCode);
      const hash2 = service.generateHash('World', languageCode);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different language codes', () => {
      const text = 'Hello';

      const hash1 = service.generateHash(text, 'en-US');
      const hash2 = service.generateHash(text, 'es-ES');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('lookup', () => {
    it('should return cached audio if found', async () => {
      const text = 'Hello';
      const languageCode = 'en-US';
      const provider = 'web_speech_api';
      const textHash = service.generateHash(text, languageCode);

      const mockCached: CachedAudio = {
        id: '123',
        imageTextId: null,
        languageCode,
        textHash,
        audioUrl: 'https://example.com/audio.mp3',
        provider,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 5,
      };

      vi.mocked(mockRepository.findByTextHash).mockResolvedValue(mockCached);
      vi.mocked(mockRepository.updateAccessInfo).mockResolvedValue(undefined);

      const result = await service.lookup(text, languageCode, provider);

      expect(result).toEqual(mockCached);
      expect(mockRepository.findByTextHash).toHaveBeenCalledWith(textHash, languageCode, provider);
      expect(mockRepository.updateAccessInfo).toHaveBeenCalledWith('123');
    });

    it('should return null if not found in cache', async () => {
      const text = 'Hello';
      const languageCode = 'en-US';
      const provider = 'web_speech_api';

      vi.mocked(mockRepository.findByTextHash).mockResolvedValue(null);

      const result = await service.lookup(text, languageCode, provider);

      expect(result).toBeNull();
      expect(mockRepository.updateAccessInfo).not.toHaveBeenCalled();
    });
  });

  describe('store', () => {
    it('should store audio in cache with correct hash', async () => {
      const text = 'Hello';
      const languageCode = 'en-US';
      const audioUrl = 'https://example.com/audio.mp3';
      const provider = 'web_speech_api';
      const textHash = service.generateHash(text, languageCode);

      const mockCached: CachedAudio = {
        id: '123',
        imageTextId: null,
        languageCode,
        textHash,
        audioUrl,
        provider,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
      };

      vi.mocked(mockRepository.create).mockResolvedValue(mockCached);

      const result = await service.store(text, languageCode, audioUrl, { provider });

      expect(result).toEqual(mockCached);
      expect(mockRepository.create).toHaveBeenCalledWith({
        imageTextId: undefined,
        languageCode,
        textHash,
        audioUrl,
        provider,
      });
    });

    it('should store audio with imageTextId when provided', async () => {
      const text = 'Hello';
      const languageCode = 'en-US';
      const audioUrl = 'https://example.com/audio.mp3';
      const provider = 'google_cloud';
      const imageTextId = 'image-123';
      const textHash = service.generateHash(text, languageCode);

      const mockCached: CachedAudio = {
        id: '123',
        imageTextId,
        languageCode,
        textHash,
        audioUrl,
        provider,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
      };

      vi.mocked(mockRepository.create).mockResolvedValue(mockCached);

      const result = await service.store(text, languageCode, audioUrl, { provider, imageTextId });

      expect(result).toEqual(mockCached);
      expect(mockRepository.create).toHaveBeenCalledWith({
        imageTextId,
        languageCode,
        textHash,
        audioUrl,
        provider,
      });
    });
  });

  describe('cleanup', () => {
    it('should delete old entries with default TTL of 90 days', async () => {
      vi.mocked(mockRepository.deleteOldEntries).mockResolvedValue(10);

      const result = await service.cleanup();

      expect(result).toBe(10);
      expect(mockRepository.deleteOldEntries).toHaveBeenCalledWith(90);
    });

    it('should delete old entries with custom TTL', async () => {
      vi.mocked(mockRepository.deleteOldEntries).mockResolvedValue(5);

      const result = await service.cleanup(30);

      expect(result).toBe(5);
      expect(mockRepository.deleteOldEntries).toHaveBeenCalledWith(30);
    });
  });

  describe('getOldEntries', () => {
    it('should return old entries with default TTL', async () => {
      const mockEntries: CachedAudio[] = [
        {
          id: '1',
          imageTextId: null,
          languageCode: 'en-US',
          textHash: 'hash1',
          audioUrl: 'url1',
          provider: 'web_speech_api',
          createdAt: new Date(),
          lastAccessed: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          accessCount: 1,
        },
      ];

      vi.mocked(mockRepository.findOldEntries).mockResolvedValue(mockEntries);

      const result = await service.getOldEntries();

      expect(result).toEqual(mockEntries);
      expect(mockRepository.findOldEntries).toHaveBeenCalledWith(90);
    });
  });
});
