import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { ApiError, isApiError } from '../utils/apiClient';

/**
 * Default options for React Query
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache time: 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry failed requests
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (isApiError(error) && error.status && error.status >= 400 && error.status < 500) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Refetch on window focus for fresh data
    refetchOnWindowFocus: true,
    // Don't refetch on mount if data is fresh
    refetchOnMount: false,
    // Refetch on reconnect
    refetchOnReconnect: true,
  },
  mutations: {
    // Retry failed mutations
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (isApiError(error) && error.status && error.status >= 400 && error.status < 500) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
};

/**
 * Create and configure the React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  // Auth
  auth: {
    profile: ['auth', 'profile'] as const,
    validate: ['auth', 'validate'] as const,
  },
  // Lessons
  lessons: {
    all: ['lessons'] as const,
    byLanguage: (language: string) => ['lessons', 'language', language] as const,
    detail: (id: string) => ['lessons', id] as const,
  },
  // Exercises
  exercises: {
    byLesson: (lessonId: string) => ['exercises', 'lesson', lessonId] as const,
    detail: (id: string) => ['exercises', id] as const,
  },
  // Progress
  progress: {
    all: ['progress'] as const,
    byLesson: (lessonId: string) => ['progress', 'lesson', lessonId] as const,
    byExercise: (exerciseId: string) => ['progress', 'exercise', exerciseId] as const,
    lastAccessed: (lessonId: string) => ['progress', 'lesson', lessonId, 'last-accessed'] as const,
    pronunciation: {
      all: ['progress', 'pronunciation'] as const,
      byExercise: (exerciseId: string) => ['progress', 'pronunciation', 'exercise', exerciseId] as const,
    },
  },
  // Images
  images: {
    all: ['images'] as const,
    detail: (id: string) => ['images', id] as const,
  },
  // Image texts
  imageTexts: {
    byImage: (imageId: string) => ['image-texts', 'image', imageId] as const,
    byLanguage: (imageId: string, language: string) => ['image-texts', 'image', imageId, 'language', language] as const,
  },
  // Gamification
  gamification: {
    streak: ['gamification', 'streak'] as const,
    xp: ['gamification', 'xp'] as const,
    achievements: ['gamification', 'achievements'] as const,
    dailyProgress: ['gamification', 'daily-progress'] as const,
  },
  // SRS
  srs: {
    weakWords: ['srs', 'weak-words'] as const,
    dailyReview: ['srs', 'daily-review'] as const,
    reviewDue: ['srs', 'review-due'] as const,
  },
  // Language preferences
  languages: {
    supported: ['languages', 'supported'] as const,
    preference: ['languages', 'preference'] as const,
  },
} as const;
