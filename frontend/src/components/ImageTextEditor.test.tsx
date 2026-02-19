import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageTextEditor } from './ImageTextEditor';

// Mock fetch
global.fetch = vi.fn();

describe('ImageTextEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnError = vi.fn();
  const imageId = 'test-image-id';

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  it('renders editor with language selector', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
    });
  });

  it('loads existing texts for the image', async () => {
    const mockTexts = [
      {
        id: '1',
        imageId,
        languageCode: 'en',
        text: 'Hello',
        version: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        imageId,
        languageCode: 'es',
        text: 'Hola',
        version: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTexts,
    });

    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
    });
  });

  it('validates that text is not empty', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const user = userEvent.setup();
    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();

    const textArea = screen.getByLabelText(/text/i);
    await user.type(textArea, 'Test text');

    expect(saveButton).not.toBeDisabled();
  });

  it('shows validation error for empty text', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const user = userEvent.setup();
    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
    });

    const textArea = screen.getByLabelText(/text/i);
    await user.type(textArea, 'Test');
    await user.clear(textArea);

    await waitFor(() => {
      expect(screen.getByText(/text cannot be empty/i)).toBeInTheDocument();
    });
  });

  it('saves new text for a language', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const savedText = {
      id: '1',
      imageId,
      languageCode: 'en',
      text: 'New text',
      version: 1,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => savedText,
    });

    const user = userEvent.setup();
    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
    });

    const textArea = screen.getByLabelText(/text/i);
    await user.type(textArea, 'New text');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(savedText);
    });
  });

  it('updates existing text and creates new version', async () => {
    const existingText = {
      id: '1',
      imageId,
      languageCode: 'en',
      text: 'Original text',
      version: 1,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [existingText],
    });

    const updatedText = {
      ...existingText,
      text: 'Updated text',
      version: 2,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedText,
    });

    const user = userEvent.setup();
    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Original text')).toBeInTheDocument();
    });

    const textArea = screen.getByLabelText(/text/i);
    await user.clear(textArea);
    await user.type(textArea, 'Updated text');

    const updateButton = screen.getByRole('button', { name: /update/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(updatedText);
    });
  });

  it('loads and displays version history', async () => {
    const existingText = {
      id: '1',
      imageId,
      languageCode: 'en',
      text: 'Current text',
      version: 2,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [existingText],
    });

    const history = [
      {
        id: '1',
        imageId,
        languageCode: 'en',
        text: 'Version 1 text',
        version: 1,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      existingText,
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => history,
    });

    const user = userEvent.setup();
    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view history/i })).toBeInTheDocument();
    });

    const historyButton = screen.getByRole('button', { name: /view history/i });
    await user.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText(/version history/i)).toBeInTheDocument();
      expect(screen.getByText('Version 1 text')).toBeInTheDocument();
    });
  });

  it('restores a previous version', async () => {
    const existingText = {
      id: '2',
      imageId,
      languageCode: 'en',
      text: 'Current text',
      version: 2,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [existingText],
    });

    const history = [
      {
        id: '1',
        imageId,
        languageCode: 'en',
        text: 'Version 1 text',
        version: 1,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      existingText,
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => history,
    });

    const user = userEvent.setup();
    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view history/i })).toBeInTheDocument();
    });

    const historyButton = screen.getByRole('button', { name: /view history/i });
    await user.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('Version 1 text')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Version 1 text')).toBeInTheDocument();
    });
  });

  it('switches between languages', async () => {
    const texts = [
      {
        id: '1',
        imageId,
        languageCode: 'en',
        text: 'Hello',
        version: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        imageId,
        languageCode: 'es',
        text: 'Hola',
        version: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => texts,
    });

    const user = userEvent.setup();
    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
    });

    const languageSelect = screen.getByLabelText(/language/i);
    await user.selectOptions(languageSelect, 'es');

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hola')).toBeInTheDocument();
    });
  });

  it('shows hint toggle option', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const user = userEvent.setup();
    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/show as hint/i)).toBeInTheDocument();
    });

    const hintCheckbox = screen.getByLabelText(/show as hint/i);
    await user.click(hintCheckbox);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter hint text/i)).toBeInTheDocument();
    });
  });

  it('displays available translations summary', async () => {
    const texts = [
      {
        id: '1',
        imageId,
        languageCode: 'en',
        text: 'Hello',
        version: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        imageId,
        languageCode: 'es',
        text: 'Hola',
        version: 2,
        createdAt: new Date().toISOString(),
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => texts,
    });

    render(
      <ImageTextEditor
        imageId={imageId}
        onSave={mockOnSave}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/available translations/i)).toBeInTheDocument();
      expect(screen.getByText(/english/i)).toBeInTheDocument();
      expect(screen.getByText(/spanish/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
