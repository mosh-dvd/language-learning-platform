import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createNetworkError,
  isRetryableError,
  calculateBackoffDelay,
  retryWithBackoff,
  isOnline,
  getErrorMessage,
  offlineCache,
} from './networkResilience';

describe('networkResilience', () => {
  describe('createNetworkError', () => {
    it('creates a network error with correct properties', () => {
      const error = createNetworkError('Test error', 500);

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.isServerError).toBe(true);
      expect(error.isNetworkError).toBe(true);
    });

    it('identifies timeout errors', () => {
      const error = createNetworkError('Request timeout', 408);

      expect(error.isTimeout).toBe(true);
    });

    it('identifies client errors', () => {
      const error = createNetworkError('Bad request', 400);

      expect(error.isClientError).toBe(true);
      expect(error.isServerError).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('returns true for network errors without status', () => {
      const error = createNetworkError('Network error');
      expect(isRetryableError(error, [500, 502, 503])).toBe(true);
    });

    it('returns true for timeout errors', () => {
      const error = createNetworkError('Timeout', 408);
      expect(isRetryableError(error, [500, 502, 503])).toBe(true);
    });

    it('returns true for retryable status codes', () => {
      const error = createNetworkError('Server error', 503);
      expect(isRetryableError(error, [500, 502, 503])).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      const error = createNetworkError('Bad request', 400);
      expect(isRetryableError(error, [500, 502, 503])).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('calculates exponential backoff correctly', () => {
      const delay1 = calculateBackoffDelay(1, 1000, 10000, 2);
      const delay2 = calculateBackoffDelay(2, 1000, 10000, 2);
      const delay3 = calculateBackoffDelay(3, 1000, 10000, 2);

      // First attempt should be around 1000ms (with jitter)
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1300);

      // Second attempt should be around 2000ms (with jitter)
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2600);

      // Third attempt should be around 4000ms (with jitter)
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(5200);
    });

    it('respects max delay', () => {
      const delay = calculateBackoffDelay(10, 1000, 5000, 2);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('retryWithBackoff', () => {
    it('succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors', async () => {
      vi.useFakeTimers();
      
      const fn = vi
        .fn()
        .mockRejectedValueOnce(createNetworkError('Network error', 503))
        .mockResolvedValue('success');

      const promise = retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelay: 100,
      });

      // Fast-forward through the retry delay
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });

    it('calls onRetry callback', async () => {
      vi.useFakeTimers();
      
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(createNetworkError('Network error', 503))
        .mockResolvedValue('success');

      const promise = retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelay: 100,
        onRetry,
      });

      await vi.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      
      vi.useRealTimers();
    });
  });

  describe('isOnline', () => {
    it('returns navigator.onLine value', () => {
      const result = isOnline();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getErrorMessage', () => {
    it('returns offline message when not online', () => {
      const error = createNetworkError('Network error');
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const message = getErrorMessage(error);
      expect(message).toContain('No internet connection');

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    it('returns timeout message for timeout errors', () => {
      const error = createNetworkError('Timeout', 408);
      const message = getErrorMessage(error);
      expect(message).toContain('timed out');
    });

    it('returns server error message for 5xx errors', () => {
      const error = createNetworkError('Server error', 500);
      const message = getErrorMessage(error);
      expect(message).toContain('Server error');
    });

    it('returns rate limit message for 429 errors', () => {
      const error = createNetworkError('Too many requests', 429);
      const message = getErrorMessage(error);
      expect(message).toContain('Too many requests');
    });
  });

  describe('offlineCache', () => {
    beforeEach(() => {
      offlineCache.clear();
    });

    it('stores and retrieves data', () => {
      offlineCache.set('key1', { data: 'value1' });
      const result = offlineCache.get('key1');
      expect(result).toEqual({ data: 'value1' });
    });

    it('returns null for non-existent keys', () => {
      const result = offlineCache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('checks if key exists', () => {
      offlineCache.set('key1', 'value1');
      expect(offlineCache.has('key1')).toBe(true);
      expect(offlineCache.has('key2')).toBe(false);
    });

    it('clears all data', () => {
      offlineCache.set('key1', 'value1');
      offlineCache.set('key2', 'value2');
      offlineCache.clear();
      expect(offlineCache.has('key1')).toBe(false);
      expect(offlineCache.has('key2')).toBe(false);
    });
  });
});
