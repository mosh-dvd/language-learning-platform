import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  createNetworkError,
  retryWithBackoff,
  getErrorMessage,
} from './networkResilience';
import { logger } from '../services/logger.service';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, any>;
  validationErrors?: Record<string, string[]>;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryConfig?: {
    maxRetries?: number;
    initialDelay?: number;
  };
}

/**
 * Creates an API client with error handling and retry logic
 */
export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (requestConfig) => {
      // Add auth token if available
      const token = localStorage.getItem('authToken');
      if (token && requestConfig.headers) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }

      // Store request start time for performance logging
      (requestConfig as any).startTime = Date.now();

      // Log outgoing request
      logger.info('API Request', {
        method: requestConfig.method?.toUpperCase(),
        url: requestConfig.url,
        baseURL: requestConfig.baseURL,
        params: requestConfig.params,
      });

      return requestConfig;
    },
    (error) => {
      logger.error('API Request Error', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      // Log successful API request
      const duration = Date.now() - ((response.config as any).startTime || 0);
      logger.logAPIRequest(
        response.config.method?.toUpperCase() || 'GET',
        response.config.url || '',
        response.status,
        duration
      );

      // Log response details
      logger.info('API Response', {
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        status: response.status,
        duration: `${duration}ms`,
      });
      
      return response;
    },
    async (error: AxiosError) => {
      const apiError = handleApiError(error);
      
      // Log failed API request
      const duration = Date.now() - ((error.config as any)?.startTime || 0);
      logger.logAPIRequest(
        error.config?.method?.toUpperCase() || 'GET',
        error.config?.url || '',
        apiError.status || 0,
        duration,
        error as Error
      );

      // Log error details
      logger.error('API Error', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: apiError.status,
        message: apiError.message,
        code: apiError.code,
        duration: `${duration}ms`,
      });
      
      // Handle 401 Unauthorized - redirect to login
      if (apiError.status === 401) {
        localStorage.removeItem('authToken');
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * Handles API errors and converts them to a standard format
 */
export function handleApiError(error: AxiosError): ApiError {
  // Network error (no response)
  if (!error.response) {
    return {
      message: getErrorMessage(
        createNetworkError(error.message || 'Network error')
      ),
      code: 'NETWORK_ERROR',
    };
  }

  const { status, data } = error.response;

  // Server returned an error response
  const apiError: ApiError = {
    message: 'An error occurred',
    status,
  };

  // Extract error details from response
  if (data && typeof data === 'object') {
    const errorData = data as any;

    // Standard error message
    if (errorData.message) {
      apiError.message = errorData.message;
    }

    // Error code
    if (errorData.code) {
      apiError.code = errorData.code;
    }

    // Validation errors
    if (errorData.errors && typeof errorData.errors === 'object') {
      apiError.validationErrors = errorData.errors;
      apiError.message = 'Validation failed';
    }

    // Additional details
    if (errorData.details) {
      apiError.details = errorData.details;
    }
  }

  // Provide user-friendly messages for common status codes
  if (!apiError.message || apiError.message === 'An error occurred') {
    apiError.message = getStatusMessage(status);
  }

  return apiError;
}

/**
 * Gets a user-friendly message for HTTP status codes
 */
function getStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data.';
    case 422:
      return 'The provided data is invalid.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Bad gateway. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    case 504:
      return 'Request timeout. Please try again.';
    default:
      return 'An unexpected error occurred.';
  }
}

/**
 * Makes an API request with retry logic
 */
export async function apiRequestWithRetry<T>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
  retryOptions?: {
    maxRetries?: number;
    initialDelay?: number;
  }
): Promise<T> {
  const response = await retryWithBackoff<AxiosResponse<T>>(
    () => client.request<T>(config),
    {
      maxRetries: retryOptions?.maxRetries || 3,
      initialDelay: retryOptions?.initialDelay || 1000,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
    }
  );

  return response.data;
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(
  validationErrors?: Record<string, string[]>
): string {
  if (!validationErrors) {
    return '';
  }

  return Object.entries(validationErrors)
    .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
    .join('\n');
}

/**
 * Checks if an error is an API error
 */
export function isApiError(error: any): error is ApiError {
  return (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

/**
 * Sets the authentication token
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
}

/**
 * Removes the authentication token
 */
export function removeAuthToken(): void {
  localStorage.removeItem('authToken');
}

/**
 * Gets the current authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// Default API client instance
let defaultApiClient: AxiosInstance | null = null;

export function getDefaultApiClient(): AxiosInstance {
  if (!defaultApiClient) {
    const baseURL = typeof import.meta !== 'undefined' && import.meta.env 
      ? (import.meta.env.VITE_API_BASE_URL as string) 
      : 'http://localhost:3000/api';
    
    defaultApiClient = createApiClient({
      baseURL,
      timeout: 30000,
    });
  }
  return defaultApiClient;
}

export default getDefaultApiClient();
