import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { STTService } from './stt.service';

describe('STTService', () => {
  let sttService: STTService;

  beforeEach(() => {
    sttService = new STTService();
  });

  afterEach(() => {
    // Clean up callbacks
    sttService.clearCallbacks();
  });

  describe('Browser Support Detection', () => {
    test('should detect if STT is supported', () => {
      const isSupported = sttService.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    test('should return false when SpeechRecognition is not available', () => {
      const unsupportedService = new STTService();
      (unsupportedService as any).recognition = null;
      expect(unsupportedService.isSupported()).toBe(false);
    });
  });

  describe('Callback Management', () => {
    test('should register and unregister result callbacks', () => {
      const callback = vi.fn();
      const unsubscribe = sttService.onResult(callback);

      expect(typeof unsubscribe).toBe('function');
      
      // Unsubscribe
      unsubscribe();
      
      // Callback should be removed
      expect((sttService as any).resultCallbacks).not.toContain(callback);
    });

    test('should register and unregister error callbacks', () => {
      const callback = vi.fn();
      const unsubscribe = sttService.onError(callback);

      expect(typeof unsubscribe).toBe('function');
      
      // Unsubscribe
      unsubscribe();
      
      // Callback should be removed
      expect((sttService as any).errorCallbacks).not.toContain(callback);
    });

    test('should clear all callbacks', () => {
      const resultCallback = vi.fn();
      const errorCallback = vi.fn();
      
      sttService.onResult(resultCallback);
      sttService.onError(errorCallback);
      
      sttService.clearCallbacks();
      
      expect((sttService as any).resultCallbacks).toHaveLength(0);
      expect((sttService as any).errorCallbacks).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when starting without support', async () => {
      const unsupportedService = new STTService();
      (unsupportedService as any).recognition = null;

      await expect(
        unsupportedService.startListening({ languageCode: 'en-US' })
      ).rejects.toThrow('Speech recognition is not supported');
    });

    test('should throw error when already listening', async () => {
      // Mock recognition
      const mockRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
        abort: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        lang: '',
        continuous: false,
        interimResults: false,
        maxAlternatives: 1
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).isListening = true;

      await expect(
        serviceWithMock.startListening({ languageCode: 'en-US' })
      ).rejects.toThrow('Speech recognition is already active');
    });

    test('should provide user-friendly error messages', () => {
      const service = new STTService();
      
      const getMessage = (service as any).getErrorMessage.bind(service);
      
      expect(getMessage('no-speech')).toContain('No speech was detected');
      expect(getMessage('audio-capture')).toContain('No microphone');
      expect(getMessage('not-allowed')).toContain('permission was denied');
      expect(getMessage('network')).toContain('Network error');
      expect(getMessage('unknown-error')).toContain('Speech recognition error');
    });
  });

  describe('Configuration', () => {
    test('should configure recognition with provided options', async () => {
      const mockRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
        abort: vi.fn(),
        addEventListener: vi.fn((event: string, handler: any) => {
          if (event === 'start') {
            // Simulate immediate start
            setTimeout(() => handler(), 0);
          }
        }),
        removeEventListener: vi.fn(),
        lang: '',
        continuous: false,
        interimResults: false,
        maxAlternatives: 1
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;

      const options = {
        languageCode: 'es-ES',
        continuous: true,
        interimResults: false,
        maxAlternatives: 3
      };

      await serviceWithMock.startListening(options);

      expect(mockRecognition.lang).toBe('es-ES');
      expect(mockRecognition.continuous).toBe(true);
      expect(mockRecognition.interimResults).toBe(false);
      expect(mockRecognition.maxAlternatives).toBe(3);
    });

    test('should use default values for optional parameters', async () => {
      const mockRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
        abort: vi.fn(),
        addEventListener: vi.fn((event: string, handler: any) => {
          if (event === 'start') {
            setTimeout(() => handler(), 0);
          }
        }),
        removeEventListener: vi.fn(),
        lang: '',
        continuous: false,
        interimResults: false,
        maxAlternatives: 1
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;

      await serviceWithMock.startListening({ languageCode: 'en-US' });

      expect(mockRecognition.continuous).toBe(false);
      expect(mockRecognition.interimResults).toBe(true);
      expect(mockRecognition.maxAlternatives).toBe(1);
    });
  });

  describe('Listening State', () => {
    test('should track listening state', () => {
      expect(sttService.getIsListening()).toBe(false);
      
      (sttService as any).isListening = true;
      expect(sttService.getIsListening()).toBe(true);
    });

    test('should stop listening when stop is called', () => {
      const mockRecognition = {
        stop: vi.fn(),
        abort: vi.fn()
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).isListening = true;

      serviceWithMock.stopListening();

      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    test('should not call stop when not listening', () => {
      const mockRecognition = {
        stop: vi.fn(),
        abort: vi.fn()
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).isListening = false;

      serviceWithMock.stopListening();

      expect(mockRecognition.stop).not.toHaveBeenCalled();
    });

    test('should abort recognition immediately', () => {
      const mockRecognition = {
        stop: vi.fn(),
        abort: vi.fn()
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).isListening = true;

      serviceWithMock.abort();

      expect(mockRecognition.abort).toHaveBeenCalled();
      expect(serviceWithMock.getIsListening()).toBe(false);
    });
  });

  describe('Result Processing', () => {
    test('should notify callbacks with recognition results', () => {
      const mockRecognition = {
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        onstart: null as any
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).setupEventHandlers();

      const resultCallback = vi.fn();
      serviceWithMock.onResult(resultCallback);

      // Simulate recognition result
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            0: {
              transcript: 'hello world',
              confidence: 0.95
            },
            isFinal: true,
            length: 1
          }
        ]
      };

      mockRecognition.onresult(mockEvent as any);

      expect(resultCallback).toHaveBeenCalledWith({
        transcript: 'hello world',
        confidence: 0.95,
        isFinal: true
      });
    });

    test('should handle multiple results in one event', () => {
      const mockRecognition = {
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        onstart: null as any
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).setupEventHandlers();

      const resultCallback = vi.fn();
      serviceWithMock.onResult(resultCallback);

      // Simulate multiple results
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            0: { transcript: 'hello', confidence: 0.9 },
            isFinal: false,
            length: 1
          },
          {
            0: { transcript: 'hello world', confidence: 0.95 },
            isFinal: true,
            length: 1
          }
        ]
      };

      mockRecognition.onresult(mockEvent as any);

      expect(resultCallback).toHaveBeenCalledTimes(2);
    });

    test('should handle errors in result callbacks gracefully', () => {
      const mockRecognition = {
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        onstart: null as any
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).setupEventHandlers();

      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      serviceWithMock.onResult(errorCallback);

      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            0: { transcript: 'test', confidence: 0.9 },
            isFinal: true,
            length: 1
          }
        ]
      };

      // Should not throw
      expect(() => {
        mockRecognition.onresult(mockEvent as any);
      }).not.toThrow();
    });
  });

  describe('Error Callbacks', () => {
    test('should notify error callbacks on recognition error', () => {
      const mockRecognition = {
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        onstart: null as any
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).setupEventHandlers();

      const errorCallback = vi.fn();
      serviceWithMock.onError(errorCallback);

      // Simulate error
      const mockErrorEvent = {
        error: 'no-speech'
      };

      mockRecognition.onerror(mockErrorEvent as any);

      expect(errorCallback).toHaveBeenCalled();
      const error = errorCallback.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('No speech was detected');
    });

    test('should handle errors in error callbacks gracefully', () => {
      const mockRecognition = {
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        onstart: null as any
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).setupEventHandlers();

      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      serviceWithMock.onError(errorCallback);

      const mockErrorEvent = {
        error: 'network'
      };

      // Should not throw
      expect(() => {
        mockRecognition.onerror(mockErrorEvent as any);
      }).not.toThrow();
    });
  });

  describe('State Transitions', () => {
    test('should update listening state on start', () => {
      const mockRecognition = {
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        onstart: null as any
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).setupEventHandlers();

      expect(serviceWithMock.getIsListening()).toBe(false);

      mockRecognition.onstart();

      expect(serviceWithMock.getIsListening()).toBe(true);
    });

    test('should update listening state on end', () => {
      const mockRecognition = {
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        onstart: null as any
      };

      const serviceWithMock = new STTService();
      (serviceWithMock as any).recognition = mockRecognition;
      (serviceWithMock as any).setupEventHandlers();
      (serviceWithMock as any).isListening = true;

      mockRecognition.onend();

      expect(serviceWithMock.getIsListening()).toBe(false);
    });
  });
});
