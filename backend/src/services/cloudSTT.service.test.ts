import { describe, it, expect, beforeEach } from 'vitest';
import { CloudSTTService } from './cloudSTT.service.js';

describe('CloudSTTService', () => {
  let service: CloudSTTService;

  beforeEach(() => {
    service = new CloudSTTService();
  });

  describe('transcribe', () => {
    it('should transcribe audio successfully', async () => {
      const request = {
        audioData: Buffer.from('fake audio data'),
        languageCode: 'en-US',
      };

      const result = await service.transcribe(request);

      expect(result).toHaveProperty('transcript');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('provider');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should use configured cloud provider', async () => {
      const config = {
        provider: 'google_cloud' as const,
        apiKey: 'test-key',
      };

      const serviceWithConfig = new CloudSTTService(config);

      const request = {
        audioData: Buffer.from('fake audio data'),
        languageCode: 'en-US',
      };

      const result = await serviceWithConfig.transcribe(request);

      expect(result.provider).toBe('google_cloud');
    });

    it('should handle base64 audio data', async () => {
      const request = {
        audioData: Buffer.from('fake audio data').toString('base64'),
        languageCode: 'en-US',
      };

      const result = await service.transcribe(request);

      expect(result).toHaveProperty('transcript');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('transcribeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const request = {
        audioData: Buffer.from('fake audio data'),
        languageCode: 'en-US',
      };

      const result = await service.transcribeWithRetry(request);

      expect(result).toHaveProperty('transcript');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('validateAudioRequest', () => {
    it('should validate valid request', () => {
      const request = {
        audioData: Buffer.from('fake audio data'),
        languageCode: 'en-US',
      };

      const result = service.validateAudioRequest(request);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject request without audio data', () => {
      const request = {
        audioData: null as any,
        languageCode: 'en-US',
      };

      const result = service.validateAudioRequest(request);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Audio data is required');
    });

    it('should reject request without language code', () => {
      const request = {
        audioData: Buffer.from('fake audio data'),
        languageCode: '',
      };

      const result = service.validateAudioRequest(request);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Language code is required');
    });

    it('should validate base64 audio data', () => {
      const request = {
        audioData: Buffer.from('fake audio data').toString('base64'),
        languageCode: 'en-US',
      };

      const result = service.validateAudioRequest(request);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid base64 audio data', () => {
      const request = {
        audioData: 'not-valid-base64!!!',
        languageCode: 'en-US',
      };

      const result = service.validateAudioRequest(request);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid base64 audio data');
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
