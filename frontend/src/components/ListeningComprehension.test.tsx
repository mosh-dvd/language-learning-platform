import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListeningComprehension } from './ListeningComprehension';

// Mock Audio API
class MockAudio {
  src: string;
  currentTime: number = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src: string) {
    this.src = src;
  }

  play() {
    return Promise.resolve();
  }

  pause() {}
}

global.Audio = MockAudio as any;

describe('ListeningComprehension', () => {
  const mockProps = {
    audioUrl: '/audio/cat.mp3',
    images: ['/images/cat.jpg', '/images/dog.jpg', '/images/bird.jpg'],
    correctImageIndex: 0,
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with instructions', () => {
    render(<ListeningComprehension {...mockProps} />);

    expect(screen.getByText('Listening Comprehension')).toBeInTheDocument();
    expect(
      screen.getByText(/Listen to the audio and select the matching image/i)
    ).toBeInTheDocument();
  });

  it('renders play audio button', () => {
    render(<ListeningComprehension {...mockProps} />);

    expect(screen.getByRole('button', { name: 'Play audio' })).toBeInTheDocument();
  });

  it('renders all image options', () => {
    render(<ListeningComprehension {...mockProps} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    expect(imageButtons).toHaveLength(3);
  });

  it('allows selecting an image', () => {
    render(<ListeningComprehension {...mockProps} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    fireEvent.click(imageButtons[0]);

    expect(imageButtons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(imageButtons[0].className).toContain('border-blue-500');
  });

  it('disables submit button when no image is selected', () => {
    render(<ListeningComprehension {...mockProps} />);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when an image is selected', () => {
    render(<ListeningComprehension {...mockProps} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    fireEvent.click(imageButtons[0]);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows correct feedback when answer is correct', () => {
    const onComplete = vi.fn();
    render(<ListeningComprehension {...mockProps} onComplete={onComplete} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    fireEvent.click(imageButtons[0]);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    expect(screen.getByText(/Correct! Well done!/)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('shows incorrect feedback when answer is wrong', () => {
    const onComplete = vi.fn();
    render(<ListeningComprehension {...mockProps} onComplete={onComplete} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    fireEvent.click(imageButtons[1]);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    expect(screen.getByText(/Incorrect. Try again!/)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it('shows retry button when answer is incorrect', () => {
    render(<ListeningComprehension {...mockProps} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    fireEvent.click(imageButtons[1]);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('allows retry after incorrect answer', () => {
    render(<ListeningComprehension {...mockProps} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    fireEvent.click(imageButtons[1]);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    const retryButton = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(retryButton);

    // Should reset to initial state
    expect(screen.queryByText(/Incorrect/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeInTheDocument();
  });

  it('highlights correct image after submission', () => {
    render(<ListeningComprehension {...mockProps} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    fireEvent.click(imageButtons[1]);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    expect(imageButtons[0].className).toContain('border-green-500');
  });

  it('disables image selection after submission', () => {
    render(<ListeningComprehension {...mockProps} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image option \d+/ });
    fireEvent.click(imageButtons[0]);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    imageButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('toggles play/stop button state', () => {
    render(<ListeningComprehension {...mockProps} />);

    const playButton = screen.getByRole('button', { name: 'Play audio' });
    fireEvent.click(playButton);

    expect(screen.getByRole('button', { name: 'Stop audio' })).toBeInTheDocument();
  });
});
