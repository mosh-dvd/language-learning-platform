import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

interface Exercise {
  id: string;
  lessonId: string;
  imageId: string;
  exerciseType: 'image_text' | 'matching_pairs' | 'fill_in_blank' | 'listening_comprehension';
  orderIndex: number;
  metadata?: any;
}

interface Lesson {
  id?: string;
  title: string;
  targetLanguage: string;
  published: boolean;
  exercises: Exercise[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface LessonEditorProps {
  lessonId?: string;
  onSave?: (lesson: Lesson) => void;
  onError?: (error: string) => void;
  userId: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

const EXERCISE_TYPES = [
  { value: 'image_text', label: 'Image with Text' },
  { value: 'matching_pairs', label: 'Matching Pairs' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
  { value: 'listening_comprehension', label: 'Listening Comprehension' },
];

export const LessonEditor: React.FC<LessonEditorProps> = ({
  lessonId,
  onSave,
  onError,
  userId,
}) => {
  const [lesson, setLesson] = useState<Lesson>({
    title: '',
    targetLanguage: 'en',
    published: false,
    exercises: [],
  });
  const [isLoading, setIsLoading] = useState(!!lessonId);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [draggedExerciseIndex, setDraggedExerciseIndex] = useState<number | null>(null);

  // Load lesson if editing
  useEffect(() => {
    if (lessonId) {
      loadLesson();
    }
  }, [lessonId]);

  const loadLesson = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/lessons/${lessonId}`);
      setLesson(response.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load lesson';
      setValidationError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const validateLesson = (): string | null => {
    if (!lesson.title.trim()) {
      return 'Lesson title is required';
    }

    if (lesson.exercises.length === 0) {
      return 'Lesson must have at least one exercise';
    }

    // Validate each exercise has required content
    for (const exercise of lesson.exercises) {
      if (!exercise.imageId) {
        return `Exercise at position ${exercise.orderIndex + 1} must have an image`;
      }

      // Type-specific validation
      if (exercise.exerciseType === 'matching_pairs') {
        if (!exercise.metadata?.pairs || exercise.metadata.pairs.length === 0) {
          return `Matching pairs exercise at position ${exercise.orderIndex + 1} must have pairs`;
        }
      } else if (exercise.exerciseType === 'fill_in_blank') {
        if (!exercise.metadata?.sentence || !exercise.metadata?.correctAnswer) {
          return `Fill in blank exercise at position ${exercise.orderIndex + 1} must have sentence and answer`;
        }
      } else if (exercise.exerciseType === 'listening_comprehension') {
        if (!exercise.metadata?.audioTextId || !exercise.metadata?.imageOptions) {
          return `Listening comprehension exercise at position ${exercise.orderIndex + 1} must have audio and image options`;
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    const error = validateLesson();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      const body = lessonId
        ? { title: lesson.title, targetLanguage: lesson.targetLanguage }
        : { ...lesson, createdBy: userId };

      let savedLesson;
      if (lessonId) {
        const response = await apiClient.put(`/lessons/${lessonId}`, body);
        savedLesson = response.data;
      } else {
        const response = await apiClient.post('/lessons', body);
        savedLesson = response.data;
      }

      setLesson(savedLesson);
      onSave?.(savedLesson);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to save lesson';
      setValidationError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!lessonId) {
      setValidationError('Please save the lesson before publishing');
      return;
    }

    const error = validateLesson();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiClient.put(`/lessons/${lessonId}/publish`);
      setLesson(response.data);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to publish lesson';
      setValidationError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!lessonId) return;

    setIsSaving(true);
    try {
      const response = await apiClient.put(`/lessons/${lessonId}/unpublish`);
      setLesson(response.data);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to unpublish lesson';
      setValidationError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExercise = () => {
    const newExercise: Exercise = {
      id: `temp-${Date.now()}`,
      lessonId: lessonId || '',
      imageId: '',
      exerciseType: 'image_text',
      orderIndex: lesson.exercises.length,
      metadata: {},
    };

    setLesson({
      ...lesson,
      exercises: [...lesson.exercises, newExercise],
    });
  };

  const handleRemoveExercise = (index: number) => {
    const updatedExercises = lesson.exercises.filter((_, i) => i !== index);
    // Update order indices
    updatedExercises.forEach((ex, i) => {
      ex.orderIndex = i;
    });

    setLesson({
      ...lesson,
      exercises: updatedExercises,
    });
  };

  const handleExerciseChange = (index: number, field: keyof Exercise, value: any) => {
    const updatedExercises = [...lesson.exercises];
    updatedExercises[index] = {
      ...updatedExercises[index],
      [field]: value,
    };

    setLesson({
      ...lesson,
      exercises: updatedExercises,
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedExerciseIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedExerciseIndex === null || draggedExerciseIndex === dropIndex) {
      return;
    }

    const updatedExercises = [...lesson.exercises];
    const [draggedExercise] = updatedExercises.splice(draggedExerciseIndex, 1);
    updatedExercises.splice(dropIndex, 0, draggedExercise);

    // Update order indices
    updatedExercises.forEach((ex, i) => {
      ex.orderIndex = i;
    });

    setLesson({
      ...lesson,
      exercises: updatedExercises,
    });

    setDraggedExerciseIndex(null);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-600">Loading lesson...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">
        {lessonId ? 'Edit Lesson' : 'Create New Lesson'}
      </h2>

      {/* Lesson Details */}
      <div className="mb-6 space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Lesson Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={lesson.title}
            onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
            placeholder="Enter lesson title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSaving}
            required
          />
        </div>

        <div>
          <label
            htmlFor="targetLanguage"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Target Language <span className="text-red-500">*</span>
          </label>
          <select
            id="targetLanguage"
            value={lesson.targetLanguage}
            onChange={(e) => setLesson({ ...lesson, targetLanguage: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSaving}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {lessonId && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                lesson.published
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {lesson.published ? 'Published' : 'Draft'}
            </span>
          </div>
        )}
      </div>

      {/* Exercises Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            Exercises ({lesson.exercises.length})
          </h3>
          <button
            type="button"
            onClick={handleAddExercise}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            disabled={isSaving}
          >
            + Add Exercise
          </button>
        </div>

        {lesson.exercises.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            No exercises yet. Click "Add Exercise" to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {lesson.exercises.map((exercise, index) => (
              <div
                key={exercise.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className="border border-gray-300 rounded-lg p-4 bg-gray-50 cursor-move hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Exercise Type
                        </label>
                        <select
                          value={exercise.exerciseType}
                          onChange={(e) =>
                            handleExerciseChange(index, 'exerciseType', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        >
                          {EXERCISE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image ID
                        </label>
                        <input
                          type="text"
                          value={exercise.imageId}
                          onChange={(e) =>
                            handleExerciseChange(index, 'imageId', e.target.value)
                          }
                          placeholder="Enter image ID"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(index)}
                    className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={isSaving}
                    aria-label="Remove exercise"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"
          role="alert"
        >
          <p className="text-sm text-red-800">{validationError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !lesson.title.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Lesson'}
        </button>

        {lessonId && !lesson.published && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={isSaving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Publish
          </button>
        )}

        {lessonId && lesson.published && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isSaving}
            className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Unpublish
          </button>
        )}
      </div>
    </div>
  );
};
