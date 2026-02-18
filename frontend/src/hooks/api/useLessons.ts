import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import apiClient from '../../utils/apiClient';

// Types
export interface Exercise {
  id: string;
  lessonId: string;
  imageId: string;
  exerciseType: 'image_text' | 'matching_pairs' | 'fill_in_blank' | 'listening_comprehension';
  orderIndex: number;
  metadata?: any;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  targetLanguage: string;
  published: boolean;
  exercises?: Exercise[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateLessonData {
  title: string;
  targetLanguage: string;
  published?: boolean;
}

export interface UpdateLessonData {
  title?: string;
  targetLanguage?: string;
  published?: boolean;
}

/**
 * Hook to get all lessons
 */
export function useLessons() {
  return useQuery({
    queryKey: queryKeys.lessons.all,
    queryFn: async () => {
      const response = await apiClient.get<Lesson[]>('/lessons');
      return response.data;
    },
  });
}

/**
 * Hook to get lessons by language
 */
export function useLessonsByLanguage(language: string) {
  return useQuery({
    queryKey: queryKeys.lessons.byLanguage(language),
    queryFn: async () => {
      const response = await apiClient.get<Lesson[]>(`/lessons?language=${language}`);
      return response.data;
    },
    enabled: !!language,
  });
}

/**
 * Hook to get a single lesson by ID
 */
export function useLesson(id: string) {
  return useQuery({
    queryKey: queryKeys.lessons.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Lesson>(`/lessons/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new lesson
 */
export function useCreateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLessonData) => {
      const response = await apiClient.post<Lesson>('/lessons', data);
      return response.data;
    },
    onSuccess: (newLesson) => {
      // Invalidate lessons list
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.byLanguage(newLesson.targetLanguage) });
      // Set the new lesson in cache
      queryClient.setQueryData(queryKeys.lessons.detail(newLesson.id), newLesson);
    },
  });
}

/**
 * Hook to update a lesson
 */
export function useUpdateLesson(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateLessonData) => {
      const response = await apiClient.put<Lesson>(`/lessons/${id}`, data);
      return response.data;
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.lessons.detail(id) });

      // Snapshot previous value
      const previousLesson = queryClient.getQueryData<Lesson>(queryKeys.lessons.detail(id));

      // Optimistically update
      if (previousLesson) {
        queryClient.setQueryData(queryKeys.lessons.detail(id), {
          ...previousLesson,
          ...newData,
        });
      }

      return { previousLesson };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousLesson) {
        queryClient.setQueryData(queryKeys.lessons.detail(id), context.previousLesson);
      }
    },
    onSuccess: (updatedLesson) => {
      // Update cache
      queryClient.setQueryData(queryKeys.lessons.detail(id), updatedLesson);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.byLanguage(updatedLesson.targetLanguage) });
    },
  });
}

/**
 * Hook to delete a lesson
 */
export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/lessons/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.lessons.detail(deletedId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
    },
  });
}

/**
 * Hook to publish a lesson
 */
export function usePublishLesson(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.put<Lesson>(`/lessons/${id}/publish`);
      return response.data;
    },
    onMutate: async () => {
      // Optimistically update
      await queryClient.cancelQueries({ queryKey: queryKeys.lessons.detail(id) });
      const previousLesson = queryClient.getQueryData<Lesson>(queryKeys.lessons.detail(id));

      if (previousLesson) {
        queryClient.setQueryData(queryKeys.lessons.detail(id), {
          ...previousLesson,
          published: true,
        });
      }

      return { previousLesson };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousLesson) {
        queryClient.setQueryData(queryKeys.lessons.detail(id), context.previousLesson);
      }
    },
    onSuccess: (updatedLesson) => {
      queryClient.setQueryData(queryKeys.lessons.detail(id), updatedLesson);
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.byLanguage(updatedLesson.targetLanguage) });
    },
  });
}

/**
 * Hook to unpublish a lesson
 */
export function useUnpublishLesson(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.put<Lesson>(`/lessons/${id}/unpublish`);
      return response.data;
    },
    onMutate: async () => {
      // Optimistically update
      await queryClient.cancelQueries({ queryKey: queryKeys.lessons.detail(id) });
      const previousLesson = queryClient.getQueryData<Lesson>(queryKeys.lessons.detail(id));

      if (previousLesson) {
        queryClient.setQueryData(queryKeys.lessons.detail(id), {
          ...previousLesson,
          published: false,
        });
      }

      return { previousLesson };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousLesson) {
        queryClient.setQueryData(queryKeys.lessons.detail(id), context.previousLesson);
      }
    },
    onSuccess: (updatedLesson) => {
      queryClient.setQueryData(queryKeys.lessons.detail(id), updatedLesson);
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.byLanguage(updatedLesson.targetLanguage) });
    },
  });
}
