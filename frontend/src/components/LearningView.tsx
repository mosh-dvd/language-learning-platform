/**
 * LearningView Component
 * Main learning interface that displays exercises and handles navigation
 * Implements Requirements: 5.1, 5.2, 5.3, 12.4
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageCard } from './ImageCard';
import { MatchingPairs } from './MatchingPairs';
import { FillInBlank } from './FillInBlank';
import { ListeningComprehension } from './ListeningComprehension';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useSwipeGesture } from '../hooks/useDeviceInput';

// Exercise types
export type ExerciseType = 'image_text' | 'matching_pairs' | 'fill_in_blank' | 'listening_comprehension';

// Exercise metadata types
export interface MatchingPairsMetadata {
  pairs: Array<{
    image: string;
    text: string;
  }>;
}

export interface FillInBlankMetadata {
  sentence: string;
  blankIndex: number;
  correctAnswer: string;
  distractors: string[];
}

export interface ListeningComprehensionMetadata {
  audioUrl: string;
  imageOptions: string[];
  correctImageIndex: number;
}

// Exercise interface
export interface Exercise {
  id: string;
  lessonId: string;
  imageUrl: string;
  text: string;
  languageCode: string;
  exerciseType: ExerciseType;
  orderIndex: number;
  metadata?: MatchingPairsMetadata | FillInBlankMetadata | ListeningComprehensionMetadata;
}

// Lesson interface
export interface Lesson {
  id: string;
  title: string;
  targetLanguage: string;
  exercises: Exercise[];
}

export interface LearningViewProps {
  lesson: Lesson;
  onComplete: (lessonId: string) => void;
  onExerciseComplete?: (exerciseId: string, correct: boolean) => void;
  onProgress?: (current: number, total: number) => void;
  initialExerciseIndex?: number;
  onLoadProgress?: (lessonId: string) => Promise<number | null>;
}

export const LearningView: React.FC<LearningViewProps> = ({
  lesson,
  onComplete,
  onExerciseComplete,
  onProgress,
  initialExerciseIndex = 0,
  onLoadProgress,
}) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(initialExerciseIndex);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isLessonComplete, setIsLessonComplete] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressLoadError, setProgressLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentExercise = lesson.exercises[currentExerciseIndex];
  const totalExercises = lesson.exercises.length;

  // Keyboard shortcuts for navigation
  useKeyboardNavigation({
    shortcuts: [
      {
        key: 'ArrowLeft',
        handler: () => {
          if (completedExercises.has(currentExercise?.id) && currentExerciseIndex > 0) {
            handlePrevious();
          }
        },
        description: 'Previous exercise',
      },
      {
        key: 'ArrowRight',
        handler: () => {
          if (completedExercises.has(currentExercise?.id) && currentExerciseIndex < totalExercises - 1) {
            handleNext();
          }
        },
        description: 'Next exercise',
      },
    ],
    enabled: !isLessonComplete && !isLoadingProgress,
  });

  // Swipe gestures for mobile navigation
  useSwipeGesture(containerRef, {
    onSwipeLeft: () => {
      if (completedExercises.has(currentExercise?.id) && currentExerciseIndex < totalExercises - 1) {
        handleNext();
      }
    },
    onSwipeRight: () => {
      if (completedExercises.has(currentExercise?.id) && currentExerciseIndex > 0) {
        handlePrevious();
      }
    },
    threshold: 50,
  });

  // Load progress on mount if onLoadProgress is provided
  useEffect(() => {
    const loadProgress = async () => {
      if (!onLoadProgress) return;

      setIsLoadingProgress(true);
      setProgressLoadError(null);

      try {
        const savedIndex = await onLoadProgress(lesson.id);
        
        // Only restore if we got a valid index and it's different from initial
        if (savedIndex !== null && savedIndex >= 0 && savedIndex < totalExercises) {
          setCurrentExerciseIndex(savedIndex);
        }
      } catch (error) {
        // Handle corrupted or missing progress data gracefully
        console.error('Failed to load progress:', error);
        setProgressLoadError('Could not load previous progress. Starting from beginning.');
        // Continue with initialExerciseIndex (already set)
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [lesson.id, onLoadProgress, totalExercises]);

  // Update progress when exercise index changes
  useEffect(() => {
    if (onProgress && !isLoadingProgress) {
      onProgress(currentExerciseIndex + 1, totalExercises);
    }
  }, [currentExerciseIndex, totalExercises, onProgress, isLoadingProgress]);

  // Handle exercise completion
  const handleExerciseComplete = useCallback((correct: boolean) => {
    if (!currentExercise) return;

    // Mark exercise as completed
    setCompletedExercises(prev => new Set(prev).add(currentExercise.id));

    // Notify parent
    if (onExerciseComplete) {
      onExerciseComplete(currentExercise.id, correct);
    }

    // Check if this was the last exercise
    if (currentExerciseIndex === totalExercises - 1) {
      setIsLessonComplete(true);
      onComplete(lesson.id);
    }
  }, [currentExercise, currentExerciseIndex, totalExercises, lesson.id, onComplete, onExerciseComplete]);

  // Navigate to next exercise
  const handleNext = useCallback(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  }, [currentExerciseIndex, totalExercises]);

  // Navigate to previous exercise
  const handlePrevious = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  }, [currentExerciseIndex]);

  // Render the appropriate exercise component based on type
  const renderExercise = () => {
    if (!currentExercise) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No exercises available</p>
        </div>
      );
    }

    const isCompleted = completedExercises.has(currentExercise.id);

    switch (currentExercise.exerciseType) {
      case 'image_text':
        return (
          <div className="flex flex-col items-center">
            <ImageCard
              imageUrl={currentExercise.imageUrl}
              text={currentExercise.text}
              languageCode={currentExercise.languageCode}
              className="max-w-2xl w-full"
            />
            {!isCompleted && (
              <button
                onClick={() => handleExerciseComplete(true)}
                className="mt-6 px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                aria-label="Mark as complete"
              >
                Continue
              </button>
            )}
          </div>
        );

      case 'matching_pairs':
        if (!currentExercise.metadata || !('pairs' in currentExercise.metadata)) {
          return <div className="text-red-500">Invalid matching pairs exercise</div>;
        }
        return (
          <MatchingPairs
            pairs={currentExercise.metadata.pairs}
            onComplete={handleExerciseComplete}
          />
        );

      case 'fill_in_blank':
        if (!currentExercise.metadata || !('sentence' in currentExercise.metadata)) {
          return <div className="text-red-500">Invalid fill in blank exercise</div>;
        }
        const fillInBlankMeta = currentExercise.metadata as FillInBlankMetadata;
        return (
          <FillInBlank
            sentence={fillInBlankMeta.sentence}
            blankIndex={fillInBlankMeta.blankIndex}
            options={[fillInBlankMeta.correctAnswer, ...fillInBlankMeta.distractors]}
            correctAnswer={fillInBlankMeta.correctAnswer}
            onComplete={handleExerciseComplete}
          />
        );

      case 'listening_comprehension':
        if (!currentExercise.metadata || !('audioUrl' in currentExercise.metadata)) {
          return <div className="text-red-500">Invalid listening comprehension exercise</div>;
        }
        const listeningMeta = currentExercise.metadata as ListeningComprehensionMetadata;
        return (
          <ListeningComprehension
            audioUrl={listeningMeta.audioUrl}
            images={listeningMeta.imageOptions}
            correctImageIndex={listeningMeta.correctImageIndex}
            onComplete={handleExerciseComplete}
          />
        );

      default:
        return <div className="text-red-500">Unknown exercise type</div>;
    }
  };

  if (isLessonComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-green-50 to-white">
        <div className="text-center max-w-md w-full px-4">
          <div className="mb-4 sm:mb-6">
            <svg
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Lesson Complete!
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
            You've completed all {totalExercises} exercises in "{lesson.title}"
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setCurrentExerciseIndex(0);
                setCompletedExercises(new Set());
                setIsLessonComplete(false);
              }}
              className="w-full sm:w-auto px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
              aria-label="Review lesson"
            >
              Review Lesson
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while restoring progress
  if (isLoadingProgress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="animate-spin h-10 w-10 sm:h-12 sm:w-12 mx-auto text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-base sm:text-lg text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" ref={containerRef}>
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      
      {/* Progress load error notification */}
      {progressLoadError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{progressLoadError}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setProgressLoadError(null)}
                className="inline-flex text-yellow-400 hover:text-yellow-600"
                aria-label="Dismiss"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with progress */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{lesson.title}</h1>
            <span className="text-xs sm:text-sm text-gray-600">
              Exercise {currentExerciseIndex + 1} of {totalExercises}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentExerciseIndex + 1) / totalExercises) * 100}%` }}
              role="progressbar"
              aria-valuenow={currentExerciseIndex + 1}
              aria-valuemin={0}
              aria-valuemax={totalExercises}
              aria-label={`Progress: ${currentExerciseIndex + 1} of ${totalExercises} exercises`}
            />
          </div>
        </div>
      </div>

      {/* Exercise content */}
      <div id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 sm:pb-28" tabIndex={-1}>
        {/* Keyboard navigation hint */}
        <div className="mb-4 text-center text-xs sm:text-sm text-gray-600" role="note">
          <p className="hidden sm:block">
            <span className="kbd">←</span> Previous | <span className="kbd">→</span> Next
            {completedExercises.has(currentExercise?.id) ? '' : ' (complete exercise first)'}
          </p>
          <p className="sm:hidden text-gray-500">
            Swipe left/right to navigate
          </p>
        </div>
        {renderExercise()}
      </div>

      {/* Navigation buttons */}
      {completedExercises.has(currentExercise?.id) && !isLessonComplete && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentExerciseIndex === 0}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg font-semibold transition-all ${
                currentExerciseIndex === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400 shadow-md hover:shadow-lg'
              }`}
              aria-label="Previous exercise"
            >
              <span className="hidden sm:inline">← Previous</span>
              <span className="sm:hidden">←</span>
            </button>
            
            <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
              {completedExercises.size} / {totalExercises}
            </span>
            
            <button
              onClick={handleNext}
              disabled={currentExerciseIndex === totalExercises - 1}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg font-semibold transition-all ${
                currentExerciseIndex === totalExercises - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
              }`}
              aria-label="Next exercise"
            >
              <span className="hidden sm:inline">Next →</span>
              <span className="sm:hidden">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
