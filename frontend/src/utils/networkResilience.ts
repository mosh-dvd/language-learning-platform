/**
 * Network resilience utilities for handling network errors and retries
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

export interface NetworkError extends Error {
  status?: number;
  isNetworkError: boolean;
  isTimeout: boolean;
  isServerError: boolean;
  isClientError: boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
};

/**
 * Creates a network error with additional metadata
 */
export function createNetworkError(
  message: string,
  status?: number,
  originalError?: Error
): NetworkError {
  const error = new Error(message) as NetworkError;
  error.name = 'NetworkError';
  error.status = status;
  error.isNetworkError = !status || status >= 500;
  error.isTimeout = status === 408 || message.includes('timeout');
  error.isServerError = status ? status >= 500 && status < 600 : false;
  error.isClientError = status ? status >= 400 && status < 500 : false;

  if (originalError) {
    error.stack = originalError.stack;
  }

  return error;
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: NetworkError, retryableStatuses: number[]): boolean {
  // Network errors (no connection)
  if (error.isNetworkError && !error.status) {
    return true;
  }

  // Timeout errors
  if (error.isTimeout) {
    return true;
  }

  // Specific status codes
  if (error.status && retryableStatuses.includes(error.status)) {
    return true;
  }

  return false;
}

/**
 * Calculates delay for exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Sleeps for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: NetworkError;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const networkError =
        error instanceof Error
          ? createNetworkError(error.message, undefined, error)
          : createNetworkError('Unknown error');

      lastError = networkError;

      // Don't retry if this is the last attempt
      if (attempt > opts.maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(networkError, opts.retryableStatuses)) {
        throw networkError;
      }

      // Calculate delay and wait
      const delay = calculateBackoffDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      opts.onRetry(attempt, networkError);

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Checks if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Waits for the browser to come online
 */
export function waitForOnline(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      reject(new Error('Timeout waiting for network connection'));
    }, timeout);

    const handleOnline = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}

/**
 * Gets a user-friendly error message based on the error type
 */
export function getErrorMessage(error: NetworkError): string {
  if (!isOnline()) {
    return 'No internet connection. Please check your network and try again.';
  }

  if (error.isTimeout) {
    return 'Request timed out. Please try again.';
  }

  if (error.isServerError) {
    return 'Server error. Please try again later.';
  }

  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (error.isClientError) {
    return error.message || 'Request failed. Please check your input and try again.';
  }

  return 'Network error. Please check your connection and try again.';
}

/**
 * Cache for offline content
 */
class OfflineCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private maxAge: number = 24 * 60 * 60 * 1000; // 24 hours

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  setMaxAge(ms: number): void {
    this.maxAge = ms;
  }
}

export const offlineCache = new OfflineCache();
