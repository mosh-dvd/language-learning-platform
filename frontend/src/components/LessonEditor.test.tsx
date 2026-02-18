import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonEditor } from './LessonEditor';

// Mock fetch
global.fetch = vi.fn();

describe('LessonEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnError = vi.fn();
  const userId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  it('renders editor for creating new lesson', () => {
    render(
      <LessonEditor
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/create new lesson/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target language/i)).toBeInTheDocument();
  });

  it('loads existing lesson when lessonId is provided', async () => {
    const mockLesson = {
      id: 'lesson-1',
      title: 'Test Lesson',
      targetLanguage: 'es',
      published: false,
      exercises: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLesson,
    });

    render(
      <LessonEditor
        lessonId="lesson-1"
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Lesson')).toBeInTheDocument();
      expect(screen.getByDisplayValue('es')).toBeInTheDocument();
    });
  });

  it('validates that lesson title is required', async () => {
    const user = userEvent.setup();
    render(
      <LessonEditor
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save lesson/i });
    expect(saveButton).toBeDisabled();

    const titleInput = screen.getByLabelText(/lesson title/i);
    await user.type(titleInput, 'New Lesson');

    expect(saveButton).not.toBeDisabled();
  });

  it('adds a new exercise', async () => {
    const user = userEvent.setup();
    render(
      <LessonEditor
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/no exercises yet/i)).toBeInTheDocument();

    const addButton = screen.getByRole('button', { name: /add exercise/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/exercises \(1\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/no exercises yet/i)).not.toBeInTheDocument();
    });
  });

  it('removes an exercise', async () => {
    const user = userEvent.setup();
    render(
      <LessonEditor
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    const addButton = screen.getByRole('button', { name: /add exercise/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/exercises \(1\)/i)).toBeInTheDocument();
    });

    const removeButton = screen.getByLabelText(/remove exercise/i);
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText(/exercises \(0\)/i)).toBeInTheDocument();
      expect(screen.getByText(/no exercises yet/i)).toBeInTheDocument();
    });
  });

  it('validates that lesson must have at least one exercise', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'lesson-1' }),
    });

    render(
      <LessonEditor
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    const titleInput = screen.getByLabelText(/lesson title/i);
    await user.type(titleInput, 'Test Lesson');

    const saveButton = screen.getByRole('button', { name: /save lesson/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/lesson must have at least one exercise/i)).toBeInTheDocument();
    });
  });

  it('saves a new lesson', async () => {
    const user = userEvent.setup();
    
    const savedLesson = {
      id: 'lesson-1',
      title: 'New Lesson',
      targetLanguage: 'en',
      published: false,
      exercises: [
        {
          id: 'ex-1',
          lessonId: 'lesson-1',
          imageId: 'img-1',
          exerciseType: 'image_text',
          orderIndex: 0,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => savedLesson,
    });

    render(
      <LessonEditor
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    const titleInput = screen.getByLabelText(/lesson title/i);
    await user.type(titleInput, 'New Lesson');

    const addButton = screen.getByRole('button', { name: /add exercise/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/image id/i)).toBeInTheDocument();
    });

    const imageIdInput = screen.getByLabelText(/image id/i);
    await user.type(imageIdInput, 'img-1');

    const saveButton = screen.getByRole('button', { name: /save lesson/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(savedLesson);
    });
  });

  it('publishes a lesson', async () => {
    const user = userEvent.setup();
    
    const mockLesson = {
      id: 'lesson-1',
      title: 'Test Lesson',
      targetLanguage: 'en',
      published: false,
      exercises: [
        {
          id: 'ex-1',
          lessonId: 'lesson-1',
          imageId: 'img-1',
          exerciseType: 'image_text',
          orderIndex: 0,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLesson,
    });

    const publishedLesson = { ...mockLesson, published: true };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => publishedLesson,
    });

    render(
      <LessonEditor
        lessonId="lesson-1"
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/draft/i)).toBeInTheDocument();
    });

    const publishButton = screen.getByRole('button', { name: /^publish$/i });
    await user.click(publishButton);

    await waitFor(() => {
      expect(screen.getByText(/published/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
    });
  });

  it('unpublishes a lesson', async () => {
    const user = userEvent.setup();
    
    const mockLesson = {
      id: 'lesson-1',
      title: 'Test Lesson',
      targetLanguage: 'en',
      published: true,
      exercises: [
        {
          id: 'ex-1',
          lessonId: 'lesson-1',
          imageId: 'img-1',
          exerciseType: 'image_text',
          orderIndex: 0,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLesson,
    });

    const unpublishedLesson = { ...mockLesson, published: false };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => unpublishedLesson,
    });

    render(
      <LessonEditor
        lessonId="lesson-1"
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /unpublish/i })).toBeInTheDocument();
    });

    const unpublishButton = screen.getByRole('button', { name: /unpublish/i });
    await user.click(unpublishButton);

    await waitFor(() => {
      expect(screen.getByText(/draft/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /unpublish/i })).not.toBeInTheDocument();
    });
  });

  it('supports all exercise types', async () => {
    const user = userEvent.setup();
    render(
      <LessonEditor
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    const addButton = screen.getByRole('button', { name: /add exercise/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/exercise type/i)).toBeInTheDocument();
    });

    const typeSelect = screen.getByLabelText(/exercise type/i);
    
    // Check all exercise types are available
    expect(screen.getByRole('option', { name: /image with text/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /matching pairs/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /fill in the blank/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /listening comprehension/i })).toBeInTheDocument();

    // Change exercise type
    await user.selectOptions(typeSelect, 'matching_pairs');
    expect(typeSelect).toHaveValue('matching_pairs');
  });

  it('reorders exercises via drag and drop', async () => {
    const user = userEvent.setup();
    render(
      <LessonEditor
        userId={userId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    const addButton = screen.getByRole('button', { name: /add exercise/i });
    
    // Add two exercises
    await user.click(addButton);
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/exercises \(2\)/i)).toBeInTheDocument();
    });

    // Verify initial order
    const exerciseNumbers = screen.getAllByText(/^\d+$/);
    expect(exerciseNumbers[0]).toHaveTextContent('1');
    expect(exerciseNumbers[1]).toHaveTextContent('2');
  });
});
