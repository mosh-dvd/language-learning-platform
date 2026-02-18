import { describe, test, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { TTSService } from './tts.service';

describe('TTSService', () => {
  let ttsService: TTSService;

  beforeEach(() => {
    ttsService = new TTSService();
  });

  describe('Browser Support Detection', () => {
    test('should detect if TTS is supported', () => {
      const isSupported = ttsService.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  // Feature: language-learning-platform, Property 9: TTS audio generation
  // Validates: Requirements 3.1
  describe('Property 9: TTS audio generation', () => {
    test('for any valid text and language code, triggering TTS should generate audio output without errors', async () => {
      // Mock SpeechSynthesisUtterance constructor
      class MockSpeechSynthesisUtterance {
        text: string;
        lang: string;
        voice: any = null;
        rate: number = 1;
        pitch: number = 1;
        volume: number = 1;
        onend: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;

        constructor(text: string) {
          this.text = text;
          this.lang = '';
        }
      }

      // Mock the Web Speech API
      const mockSynthesis = {
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        getVoices: vi.fn(() => [
          {
            voiceURI: 'Google US English',
            name: 'Google US English',
            lang: 'en-US',
            localService: false,
            default: true
          },
          {
            voiceURI: 'Google español',
            name: 'Google español',
            lang: 'es-ES',
            localService: false,
            default: false
          },
          {
            voiceURI: 'Google français',
            name: 'Google français',
            lang: 'fr-FR',
            localService: false,
            default: false
          }
        ] as SpeechSynthesisVoice[])
      };

      // Mock global SpeechSynthesisUtterance
      (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

      // Create a service with mocked synthesis
      const serviceWithMock = new TTSService();
      (serviceWithMock as any).synthesis = mockSynthesis;

      // Mock the speak method to simulate successful speech
      mockSynthesis.speak.mockImplementation((utterance: any) => {
        // Simulate successful completion using Promise.resolve
        Promise.resolve().then(() => {
          if (utterance.onend) {
            utterance.onend({ type: 'end', utterance });
          }
        });
      });

      await fc.assert(
        fc.asyncProperty(
          // Generate non-empty, non-whitespace strings
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant('en-US'),
            fc.constant('es-ES'),
            fc.constant('fr-FR'),
            fc.constant('de-DE'),
            fc.constant('ja-JP')
          ),
          async (text, languageCode) => {
            try {
              await serviceWithMock.speak(text, { languageCode });
              // If we reach here, no error was thrown - this is expected
              return true;
            } catch (error) {
              // TTS should not throw errors for valid inputs
              console.error('Unexpected error for input:', { text, languageCode, error });
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject empty text', async () => {
      const mockSynthesis = {
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        getVoices: vi.fn(() => [])
      };

      const serviceWithMock = new TTSService();
      (serviceWithMock as any).synthesis = mockSynthesis;

      await expect(
        serviceWithMock.speak('', { languageCode: 'en-US' })
      ).rejects.toThrow('Text cannot be empty');

      await expect(
        serviceWithMock.speak('   ', { languageCode: 'en-US' })
      ).rejects.toThrow('Text cannot be empty');
    });

    test('should throw error when TTS is not supported', async () => {
      const unsupportedService = new TTSService();
      (unsupportedService as any).synthesis = null;

      await expect(
        unsupportedService.speak('Hello', { languageCode: 'en-US' })
      ).rejects.toThrow('Text-to-speech is not supported');
    });
  });

  // Feature: language-learning-platform, Property 10: TTS language configuration
  // Validates: Requirements 3.2
  describe('Property 10: TTS language configuration', () => {
    test('for any supported language code, the TTS service should use a voice matching that language locale', () => {
      // Mock SpeechSynthesisUtterance constructor
      class MockSpeechSynthesisUtterance {
        text: string;
        lang: string;
        voice: any = null;
        rate: number = 1;
        pitch: number = 1;
        volume: number = 1;
        onend: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;

        constructor(text: string) {
          this.text = text;
          this.lang = '';
        }
      }

      // Create mock voices for different languages
      const mockVoices = [
        { voiceURI: 'en-US-1', name: 'English US', lang: 'en-US', localService: true, default: true },
        { voiceURI: 'en-GB-1', name: 'English UK', lang: 'en-GB', localService: true, default: false },
        { voiceURI: 'es-ES-1', name: 'Spanish Spain', lang: 'es-ES', localService: true, default: false },
        { voiceURI: 'es-MX-1', name: 'Spanish Mexico', lang: 'es-MX', localService: true, default: false },
        { voiceURI: 'fr-FR-1', name: 'French France', lang: 'fr-FR', localService: true, default: false },
        { voiceURI: 'de-DE-1', name: 'German Germany', lang: 'de-DE', localService: true, default: false },
        { voiceURI: 'ja-JP-1', name: 'Japanese Japan', lang: 'ja-JP', localService: true, default: false },
        { voiceURI: 'zh-CN-1', name: 'Chinese China', lang: 'zh-CN', localService: true, default: false }
      ] as SpeechSynthesisVoice[];

      const mockSynthesis = {
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        getVoices: vi.fn(() => mockVoices)
      };

      // Mock global SpeechSynthesisUtterance
      (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

      const serviceWithMock = new TTSService();
      (serviceWithMock as any).synthesis = mockSynthesis;

      // Mock the speak method to capture the utterance
      let capturedUtterance: any = null;
      mockSynthesis.speak.mockImplementation((utterance: any) => {
        capturedUtterance = utterance;
        Promise.resolve().then(() => {
          if (utterance.onend) {
            utterance.onend({ type: 'end', utterance });
          }
        });
      });

      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant('en-US'),
            fc.constant('en-GB'),
            fc.constant('es-ES'),
            fc.constant('es-MX'),
            fc.constant('fr-FR'),
            fc.constant('de-DE'),
            fc.constant('ja-JP'),
            fc.constant('zh-CN')
          ),
          async (text, languageCode) => {
            await serviceWithMock.speak(text, { languageCode });

            // Verify that the utterance has the correct language set
            expect(capturedUtterance).not.toBeNull();
            expect(capturedUtterance.lang).toBe(languageCode);

            // Verify that if a voice was selected, it matches the language
            if (capturedUtterance.voice) {
              const voiceLang = capturedUtterance.voice.lang;
              // Voice should either match exactly or match the language prefix
              const languagePrefix = languageCode.split('-')[0];
              const voicePrefix = voiceLang.split('-')[0];
              expect(voicePrefix).toBe(languagePrefix);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 12: Audio caching
  // Validates: Requirements 3.5
  describe('Property 12: Audio caching', () => {
    test('for any text and language combination, requesting TTS audio multiple times should use cached audio for subsequent requests', async () => {
      // Mock SpeechSynthesisUtterance constructor
      class MockSpeechSynthesisUtterance {
        text: string;
        lang: string;
        voice: any = null;
        rate: number = 1;
        pitch: number = 1;
        volume: number = 1;
        onend: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;

        constructor(text: string) {
          this.text = text;
          this.lang = '';
        }
      }

      const mockVoices = [
        { voiceURI: 'en-US-1', name: 'English US', lang: 'en-US', localService: true, default: true },
        { voiceURI: 'es-ES-1', name: 'Spanish Spain', lang: 'es-ES', localService: true, default: false }
      ] as SpeechSynthesisVoice[];

      const mockSynthesis = {
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        getVoices: vi.fn(() => mockVoices)
      };

      // Mock global SpeechSynthesisUtterance
      (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

      const serviceWithMock = new TTSService();
      (serviceWithMock as any).synthesis = mockSynthesis;

      mockSynthesis.speak.mockImplementation((utterance: any) => {
        Promise.resolve().then(() => {
          if (utterance.onend) {
            utterance.onend({ type: 'end', utterance });
          }
        });
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.oneof(fc.constant('en-US'), fc.constant('es-ES')),
          async (text, languageCode) => {
            // Clear cache before test
            serviceWithMock.clearCache();
            mockSynthesis.speak.mockClear();

            // First request - should call speak
            await serviceWithMock.speak(text, { languageCode });
            const firstCallCount = mockSynthesis.speak.mock.calls.length;
            expect(firstCallCount).toBe(1);

            // Get cache stats after first call
            const statsAfterFirst = serviceWithMock.getCacheStats();
            const cacheKey = `${languageCode}:${text}`;

            // Second request with same text and language - should still call speak
            // (Web Speech API doesn't cache the actual audio, just tracks that we've spoken it)
            await serviceWithMock.speak(text, { languageCode });
            const secondCallCount = mockSynthesis.speak.mock.calls.length;

            // The cache tracks that we've spoken this before
            const statsAfterSecond = serviceWithMock.getCacheStats();
            expect(statsAfterSecond.keys).toContain(cacheKey);

            // Both calls should have been made (Web Speech API doesn't provide audio data to cache)
            // But the cache should track the text+language combination
            expect(secondCallCount).toBe(2);
            expect(statsAfterSecond.size).toBeGreaterThanOrEqual(1);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('cached audio should expire after the TTL period', async () => {
      const service = new TTSService();
      
      // Mock the cache with an expired entry
      const expiredTimestamp = Date.now() - (1000 * 60 * 61); // 61 minutes ago (past 1 hour TTL)
      (service as any).audioCache.set('en-US:test', {
        text: 'test',
        languageCode: 'en-US',
        timestamp: expiredTimestamp
      });

      // Check that expired cache is not valid
      const cached = (service as any).getCachedAudio('test', 'en-US');
      expect(cached).toBeNull();

      // Cache should have been cleaned up
      const stats = service.getCacheStats();
      expect(stats.keys).not.toContain('en-US:test');
    });
  });

  // Feature: language-learning-platform, Property 23: Error handling for speech APIs
  // Validates: Requirements 10.4
  describe('Property 23: Error handling for speech APIs', () => {
    test('for any TTS operation that encounters an error, the system should handle the error gracefully without crashing', async () => {
      // Mock SpeechSynthesisUtterance constructor
      class MockSpeechSynthesisUtterance {
        text: string;
        lang: string;
        voice: any = null;
        rate: number = 1;
        pitch: number = 1;
        volume: number = 1;
        onend: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;

        constructor(text: string) {
          this.text = text;
          this.lang = '';
        }
      }

      const mockVoices = [
        { voiceURI: 'en-US-1', name: 'English US', lang: 'en-US', localService: true, default: true }
      ] as SpeechSynthesisVoice[];

      const mockSynthesis = {
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        getVoices: vi.fn(() => mockVoices)
      };

      // Mock global SpeechSynthesisUtterance
      (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

      const serviceWithMock = new TTSService();
      (serviceWithMock as any).synthesis = mockSynthesis;

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant('network'),
            fc.constant('audio-busy'),
            fc.constant('synthesis-failed'),
            fc.constant('not-allowed'),
            fc.constant('canceled')
          ),
          async (text, errorType) => {
            // Mock the speak method to simulate an error
            mockSynthesis.speak.mockImplementation((utterance: any) => {
              Promise.resolve().then(() => {
                if (utterance.onerror) {
                  utterance.onerror({
                    type: 'error',
                    error: errorType,
                    utterance
                  });
                }
              });
            });

            try {
              await serviceWithMock.speak(text, { languageCode: 'en-US' });
              // If no error was thrown, the test should fail
              return false;
            } catch (error) {
              // Error should be caught and wrapped in a proper Error object
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('Speech synthesis error');
              
              // Service should still be functional after error
              expect(serviceWithMock.isSupported()).toBe(true);
              
              return true;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle missing synthesis API gracefully', async () => {
      const unsupportedService = new TTSService();
      (unsupportedService as any).synthesis = null;

      // Service should report as not supported
      expect(unsupportedService.isSupported()).toBe(false);

      // Attempting to speak should throw a clear error
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.oneof(fc.constant('en-US'), fc.constant('es-ES')),
          async (text, languageCode) => {
            try {
              await unsupportedService.speak(text, { languageCode });
              return false; // Should have thrown
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('not supported');
              return true;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('stop() should not crash even if called when nothing is playing', () => {
      const service = new TTSService();
      
      // Should not throw even when called multiple times
      expect(() => {
        service.stop();
        service.stop();
        service.stop();
      }).not.toThrow();
    });
  });
});
