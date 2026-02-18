import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudTTSService } from './cloudTTS.service.js';
import { AudioCacheService } from './audioCache.service.js';
import { CachedAudio } from '../models/cachedAudio.model.js';

describe('CloudTTSService', () => {
  let service: CloudTTSService;
  let mockAudioCacheService: AudioCacheService;

  beforeEach(() => {
    mockAudioCacheService = {
      lookup: vi.fn(),
      store: vi.fn(),
      generateHash: vi.fn(),
    } as any;

    service = new CloudTTSService(mockAudioCacheService);
  });

  describe('generateAudio', () => {
    it('should return cached audio if available', async () => {
      const request = {
        text: 'Hello world',
        languageCode: 'en-US',
      };

      const mockCached: CachedAudio = {
        id: '123',
        imageTextId: null,
        languageCode: 'en-US',
        textHash: 'hash123',
        audioUrl: 'https://example.com/cached.mp3',
        provider: 'web_speech_api',
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 5,
      };

      vi.mocked(mockAudioCacheService.lookup).mockResolvedValueOnce(mockCached);

      const result = await service.generateAudio(request);

      expect(result).toEqual({
        audioUrl: 'https://example.com/cached.mp3',
        provider: 'web_speech_api',
        cached: true,
      });
      expect(mockAudioCacheService.lookup).toHaveBeenCalledWith(
        'Hello world',
        'en-US',
        'web_speech_api'
      );
    });

    it('should generate new audio if not cached', async () => {
      const request = {
        text: 'Hello world',
        languageCode: 'en-US',
      };

      vi.mocked(mockAudioCacheService.lookup).mockResolvedValue(null);
      vi.mocked(mockAudioCacheService.generateHash).mockReturnValue('hash123');
      vi.mocked(mockAudioCacheService.store).mockResolvedValue({} as any);

      const result = await service.generateAudio(request);

      expect(result.cached).toBe(false);
      expect(result.provider).toBe('web_speech_api');
      expect(result.audioUrl).toContain('hash123');
      expect(mockAudioCacheService.store).toHaveBeenCalled();
    });

    it('should use configured cloud provider', async () => {
      const config = {
        provider: 'google_cloud' as const,
        apiKey: 'test-key',
      };

      const serviceWithConfig = new CloudTTSService(mockAudioCacheService, config);

      const request = {
        text: 'Hello world',
        languageCode: 'en-US',
      };

      vi.mocked(mockAudioCacheService.lookup).mockResolvedValue(null);
      vi.mocked(mockAudioCacheService.generateHash).mockReturnValue('hash123');
      vi.mocked(mockAudioCacheService.store).mockResolvedValue({} as any);

      const result = await serviceWithConfig.generateAudio(request);

      expect(result.provider).toBe('google_cloud');
      expect(result.audioUrl).toContain('google_cloud');
    });

    it('should include imageTextId when provided', async () => {
      const request = {
        text: 'Hello world',
        languageCode: 'en-US',
        imageTextId: 'image-123',
      };

      vi.mocked(mockAudioCacheService.lookup).mockResolvedValue(null);
      vi.mocked(mockAudioCacheService.generateHash).mockReturnValue('hash123');
      vi.mocked(mockAudioCacheService.store).mockResolvedValue({} as any);

      await service.generateAudio(request);

      expect(mockAudioCacheService.store).toHaveBeenCalledWith(
        'Hello world',
        'en-US',
        expect.any(String),
        expect.objectContaining({
          imageTextId: 'image-123',
        })
      );
    });
  });

  describe('generateWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const request = {
        text: 'Hello world',
        languageCode: 'en-US',
      };

      vi.mocked(mockAudioCacheService.lookup).mockResolvedValue(null);
      vi.mocked(mockAudioCacheService.generateHash).mockReturnValue('hash123');
      vi.mocked(mockAudioCacheService.store).mockResolvedValue({} as any);

      const result = await service.generateWithRetry(request);

      expect(result.cached).toBe(false);
      expect(mockAudioCacheService.lookup).toHaveBeenCalledTimes(4); // Once per provider
    });

    it('should retry on failure', async () => {
      const request = {
        text: 'Hello world',
        languageCode: 'en-US',
      };

      let attempts = 0;
      vi.mocked(mockAudioCacheService.lookup).mockResolvedValue(null);
      vi.mocked(mockAudioCacheService.generateHash).mockReturnValue('hash123');
      vi.mocked(mockAudioCacheService.store).mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Network error');
        }
        return {} as any;
      });

      const result = await service.generateWithRetry(request, 3);

      expect(result.cached).toBe(false);
      expect(attempts).toBe(2);
    });

    it('should throw after max retries', async () => {
      const request = {
        text: 'Hello world',
        languageCode: 'en-US',
      };

      vi.mocked(mockAudioCacheService.lookup).mockResolvedValue(null);
      vi.mocked(mockAudioCacheService.generateHash).mockReturnValue('hash123');
      vi.mocked(mockAudioCacheService.store).mockRejectedValue(new Error('Network error'));

      await expect(service.generateWithRetry(request, 2)).rejects.toThrow(
        'Failed to generate TTS audio after 2 attempts'
      );
    });
  });

  describe('checkRateLimit', () => {
    it('should return rate limit information', async () => {
      const result = await service.checkRateLimit();

      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetAt');
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('isWebSpeechAPIAvailable', () => {
    it('should return availability status', () => {
      const result = service.isWebSpeechAPIAvailable();
      expect(typeof result).toBe('boolean');
    });
  });
});
