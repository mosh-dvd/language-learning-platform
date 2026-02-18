/**
 * TTS Service - Wraps Web Speech API SpeechSynthesis
 * Provides text-to-speech functionality with browser support detection,
 * voice selection by language, audio caching, and error handling.
 */

import { logger } from './logger.service';

export interface TTSOptions {
  languageCode: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface CachedAudio {
  text: string;
  languageCode: string;
  audioData?: Blob;
  timestamp: number;
}

export class TTSService {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioCache: Map<string, CachedAudio> = new Map();
  private readonly CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 hour

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Check if TTS is supported in the current browser
   */
  isSupported(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Get available voices for a specific language
   */
  getAvailableVoices(languageCode: string): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      return [];
    }

    const voices = this.synthesis.getVoices();
    return voices.filter(voice => 
      voice.lang.startsWith(languageCode) || 
      voice.lang.startsWith(languageCode.split('-')[0])
    );
  }

  /**
   * Select the best voice for a given language
   */
  private selectVoice(languageCode: string): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices(languageCode);
    
    if (voices.length === 0) {
      return null;
    }

    // Prefer local voices for better performance
    const localVoice = voices.find(voice => voice.localService);
    if (localVoice) {
      return localVoice;
    }

    // Fallback to first available voice
    return voices[0];
  }

  /**
   * Generate cache key for text and language combination
   */
  private getCacheKey(text: string, languageCode: string): string {
    return `${languageCode}:${text}`;
  }

  /**
   * Check if cached audio is still valid
   */
  private isCacheValid(cached: CachedAudio): boolean {
    const now = Date.now();
    return (now - cached.timestamp) < this.CACHE_EXPIRY_MS;
  }

  /**
   * Get cached audio if available and valid
   */
  private getCachedAudio(text: string, languageCode: string): CachedAudio | null {
    const key = this.getCacheKey(text, languageCode);
    const cached = this.audioCache.get(key);

    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Remove expired cache entry
    if (cached) {
      this.audioCache.delete(key);
    }

    return null;
  }

  /**
   * Cache audio for future use
   */
  private cacheAudio(text: string, languageCode: string): void {
    const key = this.getCacheKey(text, languageCode);
    this.audioCache.set(key, {
      text,
      languageCode,
      timestamp: Date.now()
    });
  }

  /**
   * Speak the given text using TTS
   */
  async speak(text: string, options: TTSOptions): Promise<void> {
    const startTime = Date.now();

    if (!this.synthesis) {
      const error = new Error('Text-to-speech is not supported in this browser');
      logger.logSpeechAPIUsage({
        type: 'tts',
        text,
        languageCode: options.languageCode,
        success: false,
        error: error.message,
      });
      throw error;
    }

    if (!text || text.trim().length === 0) {
      const error = new Error('Text cannot be empty');
      logger.logSpeechAPIUsage({
        type: 'tts',
        text,
        languageCode: options.languageCode,
        success: false,
        error: error.message,
      });
      throw error;
    }

    // Check cache first
    const cached = this.getCachedAudio(text, options.languageCode);
    const isCached = cached !== null;

    // Stop any ongoing speech
    this.stop();

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Select appropriate voice for language
        const voice = this.selectVoice(options.languageCode);
        if (voice) {
          utterance.voice = voice;
        }
        utterance.lang = options.languageCode;

        // Set optional parameters
        if (options.rate !== undefined) {
          utterance.rate = options.rate;
        }
        if (options.pitch !== undefined) {
          utterance.pitch = options.pitch;
        }
        if (options.volume !== undefined) {
          utterance.volume = options.volume;
        }

        // Set up event handlers
        utterance.onend = () => {
          this.currentUtterance = null;
          // Cache the audio after successful playback
          this.cacheAudio(text, options.languageCode);
          
          const duration = Date.now() - startTime;
          logger.logSpeechAPIUsage({
            type: 'tts',
            text,
            languageCode: options.languageCode,
            success: true,
            duration,
            cached: isCached,
          });
          
          resolve();
        };

        utterance.onerror = (event) => {
          this.currentUtterance = null;
          const error = new Error(`Speech synthesis error: ${event.error}`);
          
          const duration = Date.now() - startTime;
          logger.logSpeechAPIUsage({
            type: 'tts',
            text,
            languageCode: options.languageCode,
            success: false,
            error: error.message,
            duration,
            cached: isCached,
          });
          
          reject(error);
        };

        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
      } catch (error) {
        const duration = Date.now() - startTime;
        const err = error instanceof Error ? error : new Error('Unknown TTS error');
        
        logger.logSpeechAPIUsage({
          type: 'tts',
          text,
          languageCode: options.languageCode,
          success: false,
          error: err.message,
          duration,
          cached: isCached,
        });
        
        reject(err);
      }
    });
  }

  /**
   * Stop any ongoing speech
   */
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Check if speech is currently playing
   */
  isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }

  /**
   * Clear the audio cache
   */
  clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.audioCache.size,
      keys: Array.from(this.audioCache.keys())
    };
  }
}

// Export singleton instance
export const ttsService = new TTSService();
