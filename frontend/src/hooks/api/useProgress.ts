import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import apiClient from '../../utils/apiClient';

// Types
export interface UserProgress {
  id: string;
  userId: string;
  exerciseId: string;
  completed: boolean;
  completedAt?: string;
  lastAccessed: string;
}

export interface PronunciationScore {
  id: string;
  userId: string;
  exerciseId: string;
  score: number;
  recognizedText: string;
  createdAt: string;
}

export interface RecordCompletionData {
  exerciseId: string;
}

export interface RecordPronunciationData {
  exerciseId: string;
  score: number;
  recognizedText: string;
}

export interface ProgressUpdate {
  exerciseId: string;
  completed: boolean;
  completedAt?: string;
}

export interface SyncProgressData {
  progressUpdates: ProgressUpdate[];
}

/**
 * Hook to get user's overall progress
 */
export function useUserProgress() {
  return useQuery({
    queryKey: queryKeys.progress.all,
    queryFn: async () => {
      const response = await apiClient.get<{ progress: UserProgress[] }>('/progress');
      return response.data.progress;
    },
    enabled: !!localStorage.getItem('authToken'),
  });
}

/**
 * Hook to get progress for a specific lesson
 */
export function useLessonProgress(lessonId: string) {
  return useQuery({
    queryKey: queryKeys.progress.byLesson(lessonId),
    queryFn: async () => {
      const response = await apiClient.get<{ progress: UserProgress[] }>(`/progress/lesson/${lessonId}`);
      return response.data.progress;
    },
    enabled: !!lessonId && !!localStorage.getItem('authToken'),
  });
}

/**
 * Hook to get progress for a specific exercise
 */
export function useExerciseProgress(exerciseId: string) {
  return useQuery({
    queryKey: queryKeys.progress.byExercise(exerciseId),
    queryFn: async () => {
      const response = await apiClient.get<{ progress: UserProgress }>(`/progress/exercise/${exerciseId}`);
      return response.data.progress;
    },
    enabled: !!exerciseId && !!localStorage.getItem('authToken'),
  });
}

/**
 * Hook to get last accessed exercise in a lesson
 */
export function useLastAccessedExercise(lessonId: string) {
  return useQuery({
    queryKey: queryKeys.progress.lastAccessed(lessonId),
    queryFn: async () => {
      const response = await apiClient.get<{ lessonId: string; lastAccessedExerciseIndex: number }>(
        `/progress/lesson/${lessonId}/last-accessed`
      );
      return response.data;
    },
    enabled: !!lessonId && !!localStorage.getItem('authToken'),
  });
}

/**
 * Hook to record exercise completion
 */
export function useRecordCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecordCompletionData) => {
      const response = await apiClient.post<{ progress: UserProgress; message: string }>(
        '/progress/complete',
        data
      );
      return response.data.progress;
    },
    onSuccess: (newProgress) => {
      // Invalidate progress queries
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.byExercise(newProgress.exerciseId) });
      
      // Update exercise progress in cache
      queryClient.setQueryData(queryKeys.progress.byExercise(newProgress.exerciseId), newProgress);
    },
  });
}

/**
 * Hook to record pronunciation score
 */
export function useRecordPronunciation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecordPronunciationData) => {
      const response = await apiClient.post<{ pronunciationScore: PronunciationScore; message: string }>(
        '/progress/pronunciation',
        data
      );
      return response.data.pronunciationScore;
    },
    onSuccess: (newScore) => {
      // Invalidate pronunciation queries
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.pronunciation.all });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.progress.pronunciation.byExercise(newScore.exerciseId) 
      });
    },
  });
}

/**
 * Hook to get pronunciation scores for an exercise
 */
export function usePronunciationScores(exerciseId: string) {
  return useQuery({
    queryKey: queryKeys.progress.pronunciation.byExercise(exerciseId),
    queryFn: async () => {
      const response = await apiClient.get<{ scores: PronunciationScore[] }>(
        `/progress/pronunciation/exercise/${exerciseId}`
      );
      return response.data.scores;
    },
    enabled: !!exerciseId && !!localStorage.getItem('authToken'),
  });
}

/**
 * Hook to get all pronunciation scores
 */
export function useAllPronunciationScores() {
  return useQuery({
    queryKey: queryKeys.progress.pronunciation.all,
    queryFn: async () => {
      const response = await apiClient.get<{ scores: PronunciationScore[] }>('/progress/pronunciation');
      return response.data.scores;
    },
    enabled: !!localStorage.getItem('authToken'),
  });
}

/**
 * Hook to sync progress across devices
 */
export function useSyncProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SyncProgressData) => {
      const response = await apiClient.post<{ 
        message: string; 
        syncedCount: number; 
        progress: UserProgress[] 
      }>('/progress/sync', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all progress queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.all });
    },
  });
}
