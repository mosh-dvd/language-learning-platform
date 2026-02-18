/**
 * STT Service - Wraps Web Speech API SpeechRecognition
 * Provides speech-to-text functionality with browser support detection,
 * microphone permission handling, language configuration, and error handling.
 */

import { logger } from './logger.service';

export interface STTOptions {
  languageCode: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export type STTResultCallback = (result: STTResult) => void;
export type STTErrorCallback = (error: Error) => void;

export class STTService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private resultCallbacks: STTResultCallback[] = [];
  private errorCallbacks: STTErrorCallback[] = [];
  private currentLanguageCode: string = '';
  private recognitionStartTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check for browser support (webkit prefix for Safari/Chrome)
      const SpeechRecognitionAPI = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI();
        this.setupEventHandlers();
      }
    }
  }

  /**
   * Check if STT is supported in the current browser
   */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Setup event handlers for the recognition instance
   */
  private setupEventHandlers(): void {
    if (!this.recognition) {
      return;
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      try {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          const isFinal = result.isFinal;

          const sttResult: STTResult = {
            transcript,
            confidence,
            isFinal
          };

          this.notifyResultCallbacks(sttResult);

          // Log successful recognition
          if (isFinal) {
            const duration = Date.now() - this.recognitionStartTime;
            logger.logSpeechAPIUsage({
              type: 'stt',
              text: transcript,
              languageCode: this.currentLanguageCode,
              success: true,
              duration,
            });
          }
        }
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error('Unknown recognition error'));
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = this.getErrorMessage(event.error);
      const error = new Error(errorMessage);
      
      // Log error
      const duration = Date.now() - this.recognitionStartTime;
      logger.logSpeechAPIUsage({
        type: 'stt',
        languageCode: this.currentLanguageCode,
        success: false,
        error: errorMessage,
        duration,
      });
      
      this.handleError(error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.onstart = () => {
      this.isListening = true;
    };
  }

  /**
   * Get user-friendly error message from error code
   */
  private getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech was detected. Please try again.',
      'audio-capture': 'No microphone was found or microphone access was denied.',
      'not-allowed': 'Microphone permission was denied. Please allow microphone access.',
      'network': 'Network error occurred during speech recognition.',
      'aborted': 'Speech recognition was aborted.',
      'bad-grammar': 'Speech recognition grammar error.',
      'language-not-supported': 'The specified language is not supported.',
      'service-not-allowed': 'Speech recognition service is not allowed.'
    };

    return errorMessages[errorCode] || `Speech recognition error: ${errorCode}`;
  }

  /**
   * Handle errors and notify error callbacks
   */
  private handleError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in STT error callback:', callbackError);
      }
    });
  }

  /**
   * Notify all result callbacks
   */
  private notifyResultCallbacks(result: STTResult): void {
    this.resultCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (callbackError) {
        console.error('Error in STT result callback:', callbackError);
      }
    });
  }

  /**
   * Start listening for speech input
   */
  async startListening(options: STTOptions): Promise<void> {
    if (!this.recognition) {
      const error = new Error('Speech recognition is not supported in this browser');
      logger.logSpeechAPIUsage({
        type: 'stt',
        languageCode: options.languageCode,
        success: false,
        error: error.message,
      });
      throw error;
    }

    if (this.isListening) {
      throw new Error('Speech recognition is already active');
    }

    // Store language code and start time for logging
    this.currentLanguageCode = options.languageCode;
    this.recognitionStartTime = Date.now();

    // Configure recognition
    this.recognition.lang = options.languageCode;
    this.recognition.continuous = options.continuous ?? false;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = options.maxAlternatives ?? 1;

    try {
      this.recognition.start();
      
      // Wait for the recognition to actually start
      return new Promise((resolve, reject) => {
        const startTimeout = setTimeout(() => {
          const error = new Error('Speech recognition failed to start within timeout');
          logger.logSpeechAPIUsage({
            type: 'stt',
            languageCode: options.languageCode,
            success: false,
            error: error.message,
          });
          reject(error);
        }, 5000);

        const onStart = () => {
          clearTimeout(startTimeout);
          if (this.recognition) {
            this.recognition.removeEventListener('start', onStart);
          }
          resolve();
        };

        const onError = (event: Event) => {
          clearTimeout(startTimeout);
          if (this.recognition) {
            this.recognition.removeEventListener('error', onError);
            this.recognition.removeEventListener('start', onStart);
          }
          const errorMsg = `Failed to start speech recognition: ${(event as any).error || 'unknown error'}`;
          logger.logSpeechAPIUsage({
            type: 'stt',
            languageCode: options.languageCode,
            success: false,
            error: errorMsg,
          });
          reject(new Error(errorMsg));
        };

        if (this.recognition) {
          this.recognition.addEventListener('start', onStart);
          this.recognition.addEventListener('error', onError, { once: true });
        }
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to start speech recognition');
      logger.logSpeechAPIUsage({
        type: 'stt',
        languageCode: options.languageCode,
        success: false,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Stop listening for speech input
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Abort speech recognition immediately
   */
  abort(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Register a callback for recognition results
   */
  onResult(callback: STTResultCallback): () => void {
    this.resultCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.resultCallbacks.indexOf(callback);
      if (index > -1) {
        this.resultCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register a callback for recognition errors
   */
  onError(callback: STTErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this.resultCallbacks = [];
    this.errorCallbacks = [];
  }
}

// Export singleton instance
export const sttService = new STTService();
