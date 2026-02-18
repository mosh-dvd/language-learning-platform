import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LearningView, Lesson } from './LearningView';

describe('LearningView', () => {
  const mockLesson: Lesson = {
    id: 'lesson-1',
    title: 'Test Lesson',
    targetLanguage: 'es',
    exercises: [
      {
        id: 'ex-1',
        lessonId: 'lesson-1',
        imageUrl: 'https://example.com/image1.jpg',
        text: 'Hello',
        languageCode: 'es',
        exerciseType: 'image_text',
        orderIndex: 0,
      },
      {
        id: 'ex-2',
        lessonId: 'lesson-1',
        imageUrl: 'https://example.com/image2.jpg',
        text: 'World',
        languageCode: 'es',
        exerciseType: 'image_text',
        orderIndex: 1,
      },
    ],
  };

  it('renders lesson title and progress', () => {
    const onComplete = vi.fn();
    render(<LearningView lesson={mockLesson} onComplete={onComplete} />);

    expect(screen.getByText('Test Lesson')).toBeInTheDocument();
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument();
  });

  it('displays the first exercise initially', () => {
    const onComplete = vi.fn();
    render(<LearningView lesson={mockLesson} onComplete={onComplete} />);

    // Should show the first exercise's text
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows continue button for image_text exercises', () => {
    const onComplete = vi.fn();
    render(<LearningView lesson={mockLesson} onComplete={onComplete} />);

    expect(screen.getByRole('button', { name: /mark as complete/i })).toBeInTheDocument();
  });

  it('advances to next exercise when continue is clicked', () => {
    const onComplete = vi.fn();
    render(<LearningView lesson={mockLesson} onComplete={onComplete} />);

    // Click continue on first exercise
    const continueButton = screen.getByRole('button', { name: /mark as complete/i });
    fireEvent.click(continueButton);

    // Should show navigation buttons
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    
    // Click next
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Should show second exercise
    expect(screen.getByText('Exercise 2 of 2')).toBeInTheDocument();
  });

  it('calls onComplete when all exercises are finished', () => {
    const onComplete = vi.fn();
    render(<LearningView lesson={mockLesson} onComplete={onComplete} />);

    // Complete first exercise
    const continueButton1 = screen.getByRole('button', { name: /mark as complete/i });
    fireEvent.click(continueButton1);

    // Navigate to second exercise
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Complete second exercise
    const continueButton2 = screen.getByRole('button', { name: /mark as complete/i });
    fireEvent.click(continueButton2);

    // Should call onComplete with lesson ID
    expect(onComplete).toHaveBeenCalledWith('lesson-1');
  });

  it('shows completion screen when lesson is finished', () => {
    const onComplete = vi.fn();
    render(<LearningView lesson={mockLesson} onComplete={onComplete} />);

    // Complete first exercise
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Complete second exercise
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));

    // Should show completion message
    expect(screen.getByText('Lesson Complete!')).toBeInTheDocument();
    expect(screen.getByText(/You've completed all 2 exercises/i)).toBeInTheDocument();
  });

  it('calls onProgress callback when provided', () => {
    const onComplete = vi.fn();
    const onProgress = vi.fn();
    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        onProgress={onProgress}
      />
    );

    // Should call onProgress with initial state
    expect(onProgress).toHaveBeenCalledWith(1, 2);
  });

  it('calls onExerciseComplete callback when exercise is completed', () => {
    const onComplete = vi.fn();
    const onExerciseComplete = vi.fn();
    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        onExerciseComplete={onExerciseComplete}
      />
    );

    // Complete first exercise
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));

    // Should call onExerciseComplete
    expect(onExerciseComplete).toHaveBeenCalledWith('ex-1', true);
  });

  it('starts at specified initial exercise index', () => {
    const onComplete = vi.fn();
    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        initialExerciseIndex={1}
      />
    );

    // Should show second exercise
    expect(screen.getByText('Exercise 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  it('disables previous button on first exercise', () => {
    const onComplete = vi.fn();
    render(<LearningView lesson={mockLesson} onComplete={onComplete} />);

    // Complete first exercise to show navigation
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));

    // Previous button should be disabled
    const previousButton = screen.getByRole('button', { name: /previous/i });
    expect(previousButton).toBeDisabled();
  });

  it('navigation bar only shows after completing an exercise', () => {
    const onComplete = vi.fn();
    const mockLessonWithThreeExercises: Lesson = {
      ...mockLesson,
      exercises: [
        ...mockLesson.exercises,
        {
          id: 'ex-3',
          lessonId: 'lesson-1',
          imageUrl: 'https://example.com/image3.jpg',
          text: 'Third',
          languageCode: 'es',
          exerciseType: 'image_text',
          orderIndex: 2,
        },
      ],
    };
    
    render(
      <LearningView
        lesson={mockLessonWithThreeExercises}
        onComplete={onComplete}
      />
    );

    // Initially, no navigation bar
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    
    // Complete first exercise
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));
    
    // Now navigation bar should appear
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    
    // Navigate to second exercise
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Navigation bar disappears because second exercise is not completed yet
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    
    // Complete second exercise
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));
    
    // Navigation bar reappears
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    
    // Navigate to third exercise
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Complete last exercise - should show completion screen
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));
    
    expect(screen.getByText('Lesson Complete!')).toBeInTheDocument();
  });

  it('allows reviewing lesson after completion', () => {
    const onComplete = vi.fn();
    render(<LearningView lesson={mockLesson} onComplete={onComplete} />);

    // Complete all exercises
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark as complete/i }));

    // Click review button
    const reviewButton = screen.getByRole('button', { name: /review lesson/i });
    fireEvent.click(reviewButton);

    // Should go back to first exercise
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('loads progress on mount when onLoadProgress is provided', async () => {
    const onComplete = vi.fn();
    const onLoadProgress = vi.fn().mockResolvedValue(1); // Resume from exercise 2

    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        onLoadProgress={onLoadProgress}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading your progress...')).toBeInTheDocument();

    // Wait for progress to load
    await waitFor(() => {
      expect(onLoadProgress).toHaveBeenCalledWith('lesson-1');
    });

    // Should start at exercise 2 (index 1)
    await waitFor(() => {
      expect(screen.getByText('Exercise 2 of 2')).toBeInTheDocument();
      expect(screen.getByText('World')).toBeInTheDocument();
    });
  });

  it('starts from beginning when onLoadProgress returns null', async () => {
    const onComplete = vi.fn();
    const onLoadProgress = vi.fn().mockResolvedValue(null); // No saved progress

    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        onLoadProgress={onLoadProgress}
      />
    );

    // Wait for progress to load
    await waitFor(() => {
      expect(onLoadProgress).toHaveBeenCalledWith('lesson-1');
    });

    // Should start at exercise 1
    await waitFor(() => {
      expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  it('handles corrupted progress data gracefully', async () => {
    const onComplete = vi.fn();
    const onLoadProgress = vi.fn().mockRejectedValue(new Error('Database error'));

    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        onLoadProgress={onLoadProgress}
      />
    );

    // Wait for error handling
    await waitFor(() => {
      expect(onLoadProgress).toHaveBeenCalledWith('lesson-1');
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Could not load previous progress/i)).toBeInTheDocument();
    });

    // Should still start at exercise 1 (fallback)
    expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('ignores invalid progress index (negative)', async () => {
    const onComplete = vi.fn();
    const onLoadProgress = vi.fn().mockResolvedValue(-1); // Invalid index

    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        onLoadProgress={onLoadProgress}
      />
    );

    await waitFor(() => {
      expect(onLoadProgress).toHaveBeenCalledWith('lesson-1');
    });

    // Should start at exercise 1 (ignore invalid index)
    await waitFor(() => {
      expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument();
    });
  });

  it('ignores invalid progress index (out of bounds)', async () => {
    const onComplete = vi.fn();
    const onLoadProgress = vi.fn().mockResolvedValue(10); // Index beyond exercises

    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        onLoadProgress={onLoadProgress}
      />
    );

    await waitFor(() => {
      expect(onLoadProgress).toHaveBeenCalledWith('lesson-1');
    });

    // Should start at exercise 1 (ignore invalid index)
    await waitFor(() => {
      expect(screen.getByText('Exercise 1 of 2')).toBeInTheDocument();
    });
  });

  it('can dismiss progress load error notification', async () => {
    const onComplete = vi.fn();
    const onLoadProgress = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <LearningView
        lesson={mockLesson}
        onComplete={onComplete}
        onLoadProgress={onLoadProgress}
      />
    );

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Could not load previous progress/i)).toBeInTheDocument();
    });

    // Click dismiss button
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Error should be removed
    expect(screen.queryByText(/Could not load previous progress/i)).not.toBeInTheDocument();
  });
});
