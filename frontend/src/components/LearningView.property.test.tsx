/**
 * Property-Based Tests for LearningView Component
 * Feature: language-learning-platform, Property 15: Lesson navigation
 * Validates: Requirements 5.1, 5.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { LearningView, Lesson, Exercise } from './LearningView';

describe('LearningView Property-Based Tests', () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  // Generator for exercise IDs
  const exerciseIdArb = fc.uuid();

  // Generator for image URLs
  const imageUrlArb = fc.webUrl();

  // Generator for text content (non-whitespace, trimmed, single spaces)
  const textArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => s.trim().length > 0)
    .map(s => s.trim().replace(/\s+/g, ' '));

  // Generator for language codes
  const languageCodeArb = fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh');

  // Generator for a single exercise
  const exerciseArb = (lessonId: string, orderIndex: number): fc.Arbitrary<Exercise> =>
    fc.record({
      id: exerciseIdArb,
      lessonId: fc.constant(lessonId),
      imageUrl: imageUrlArb,
      text: textArb,
      languageCode: languageCodeArb,
      exerciseType: fc.constant('image_text' as const),
      orderIndex: fc.constant(orderIndex),
    });

  // Generator for a lesson with N exercises (with unique text per exercise)
  const lessonArb = fc
    .integer({ min: 1, max: 10 })
    .chain((numExercises) => {
      const lessonId = fc.sample(fc.uuid(), 1)[0];
      
      // Generate unique texts for each exercise by appending index
      return fc.record({
        id: fc.constant(lessonId),
        title: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 1).map(s => s.trim()),
        targetLanguage: languageCodeArb,
        exercises: fc.constant(
          Array.from({ length: numExercises }, (_, i) => {
            const baseText = fc.sample(textArb, 1)[0];
            return {
              id: fc.sample(exerciseIdArb, 1)[0],
              lessonId,
              imageUrl: fc.sample(imageUrlArb, 1)[0],
              text: `${baseText}-${i}`, // Make text unique by appending index
              languageCode: fc.sample(languageCodeArb, 1)[0],
              exerciseType: 'image_text' as const,
              orderIndex: i,
            };
          })
        ),
      });
    });

  /**
   * Feature: language-learning-platform, Property 15: Lesson navigation
   * Validates: Requirements 5.1, 5.2
   * 
   * Property: For any lesson with N exercises, starting the lesson should display exercise 1,
   * and completing exercise i (where i < N) should display exercise i+1.
   */
  it('Property 15: Lesson navigation - starting displays exercise 1, completing i displays i+1', () => {
    fc.assert(
      fc.property(lessonArb, (lesson) => {
        // Clean up any previous render
        if (cleanup) {
          cleanup();
          cleanup = null;
        }

        const onComplete = vi.fn();
        const { unmount } = render(<LearningView lesson={lesson} onComplete={onComplete} />);
        cleanup = unmount;

        try {
          // Property: Starting the lesson should display exercise 1
          const firstExerciseText = lesson.exercises[0].text;
          expect(screen.getByText(firstExerciseText)).toBeInTheDocument();
          expect(screen.getByText(`Exercise 1 of ${lesson.exercises.length}`)).toBeInTheDocument();

          // Property: Completing exercise i (where i < N) should display exercise i+1
          for (let i = 0; i < lesson.exercises.length - 1; i++) {
            // Complete current exercise
            const continueButton = screen.getByRole('button', { name: /mark as complete/i });
            fireEvent.click(continueButton);

            // Navigate to next exercise
            const nextButton = screen.getByRole('button', { name: /next/i });
            fireEvent.click(nextButton);

            // Verify we're now on exercise i+2 (since i is 0-indexed)
            const nextExerciseText = lesson.exercises[i + 1].text;
            expect(screen.getByText(nextExerciseText)).toBeInTheDocument();
            expect(screen.getByText(`Exercise ${i + 2} of ${lesson.exercises.length}`)).toBeInTheDocument();
          }
        } finally {
          // Don't unmount here, let afterEach handle it
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: language-learning-platform, Property 15: Lesson navigation (inverse)
   * Validates: Requirements 5.1, 5.2
   * 
   * Property: For any lesson, the previous button should navigate backwards through exercises.
   */
  it('Property 15 (inverse): Previous button navigates backwards through completed exercises', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 10 }).chain((numExercises) => {
          const lessonId = fc.sample(fc.uuid(), 1)[0];
          
          // Generate unique texts for each exercise by appending index
          return fc.record({
            id: fc.constant(lessonId),
            title: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 1).map(s => s.trim()),
            targetLanguage: languageCodeArb,
            exercises: fc.constant(
              Array.from({ length: numExercises }, (_, i) => {
                const baseText = fc.sample(textArb, 1)[0];
                return {
                  id: fc.sample(exerciseIdArb, 1)[0],
                  lessonId,
                  imageUrl: fc.sample(imageUrlArb, 1)[0],
                  text: `${baseText}-${i}`, // Make text unique by appending index
                  languageCode: fc.sample(languageCodeArb, 1)[0],
                  exerciseType: 'image_text' as const,
                  orderIndex: i,
                };
              })
            ),
          });
        }),
        (lesson) => {
          // Clean up any previous render
          if (cleanup) {
            cleanup();
            cleanup = null;
          }

          const onComplete = vi.fn();
          const { unmount } = render(<LearningView lesson={lesson} onComplete={onComplete} />);
          cleanup = unmount;

          try {
            // Complete first two exercises and navigate forward
            fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));
            fireEvent.click(screen.getByRole('button', { name: /next/i }));
            fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));
            fireEvent.click(screen.getByRole('button', { name: /next/i }));

            // Now we're on exercise 3
            expect(screen.getByText(`Exercise 3 of ${lesson.exercises.length}`)).toBeInTheDocument();

            // Complete exercise 3 to show navigation bar
            fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));

            // Navigate backwards
            const previousButton = screen.getByRole('button', { name: /previous/i });
            fireEvent.click(previousButton);

            // Should be on exercise 2
            expect(screen.getByText(`Exercise 2 of ${lesson.exercises.length}`)).toBeInTheDocument();
            expect(screen.getByText(lesson.exercises[1].text)).toBeInTheDocument();

            // Navigate backwards again
            fireEvent.click(screen.getByRole('button', { name: /previous/i }));

            // Should be on exercise 1
            expect(screen.getByText(`Exercise 1 of ${lesson.exercises.length}`)).toBeInTheDocument();
            expect(screen.getByText(lesson.exercises[0].text)).toBeInTheDocument();
          } finally {
            // Don't unmount here, let afterEach handle it
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: language-learning-platform, Property 15: Lesson navigation (boundary)
   * Validates: Requirements 5.1, 5.2
   * 
   * Property: For any lesson with more than 1 exercise, the previous button should be disabled on the first exercise,
   * and navigation should not go below exercise 1.
   */
  it('Property 15 (boundary): Previous button disabled on first exercise', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }).chain((numExercises) => {
          const lessonId = fc.sample(fc.uuid(), 1)[0];
          
          // Generate unique texts for each exercise by appending index
          return fc.record({
            id: fc.constant(lessonId),
            title: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 1).map(s => s.trim()),
            targetLanguage: languageCodeArb,
            exercises: fc.constant(
              Array.from({ length: numExercises }, (_, i) => {
                const baseText = fc.sample(textArb, 1)[0];
                return {
                  id: fc.sample(exerciseIdArb, 1)[0],
                  lessonId,
                  imageUrl: fc.sample(imageUrlArb, 1)[0],
                  text: `${baseText}-${i}`, // Make text unique by appending index
                  languageCode: fc.sample(languageCodeArb, 1)[0],
                  exerciseType: 'image_text' as const,
                  orderIndex: i,
                };
              })
            ),
          });
        }),
        (lesson) => {
          // Clean up any previous render
          if (cleanup) {
            cleanup();
            cleanup = null;
          }

          const onComplete = vi.fn();
          const { unmount } = render(<LearningView lesson={lesson} onComplete={onComplete} />);
          cleanup = unmount;

          try {
            // Complete first exercise to show navigation
            fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));

            // Previous button should be disabled on first exercise
            const previousButton = screen.getByRole('button', { name: /previous/i });
            expect(previousButton).toBeDisabled();

            // Verify we're still on exercise 1
            expect(screen.getByText(`Exercise 1 of ${lesson.exercises.length}`)).toBeInTheDocument();
          } finally {
            // Don't unmount here, let afterEach handle it
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: language-learning-platform, Property 16: Lesson completion tracking
   * Validates: Requirements 5.3
   * 
   * Property: For any lesson with N exercises, completing all N exercises should mark the lesson as complete.
   */
  it('Property 16: Lesson completion tracking - completing all N exercises marks lesson as complete', () => {
    fc.assert(
      fc.property(lessonArb, (lesson) => {
        // Clean up any previous render
        if (cleanup) {
          cleanup();
          cleanup = null;
        }

        const onComplete = vi.fn();
        const { unmount } = render(<LearningView lesson={lesson} onComplete={onComplete} />);
        cleanup = unmount;

        try {
          // Complete all N exercises
          for (let i = 0; i < lesson.exercises.length; i++) {
            // Complete current exercise
            const completeButton = screen.getByRole('button', { name: /mark as complete/i });
            fireEvent.click(completeButton);

            // If not the last exercise, navigate to next
            if (i < lesson.exercises.length - 1) {
              const nextButton = screen.getByRole('button', { name: /next/i });
              fireEvent.click(nextButton);
            }
          }

          // Property: Completing all N exercises should mark the lesson as complete
          // Verify onComplete callback was called with the lesson ID
          expect(onComplete).toHaveBeenCalledWith(lesson.id);
          expect(onComplete).toHaveBeenCalledTimes(1);

          // Verify completion screen is displayed
          expect(screen.getByText('Lesson Complete!')).toBeInTheDocument();
          expect(screen.getByText(new RegExp(`You've completed all ${lesson.exercises.length} exercises`, 'i'))).toBeInTheDocument();
        } finally {
          // Don't unmount here, let afterEach handle it
        }
      }),
      { numRuns: 100 }
    );
  });
});
