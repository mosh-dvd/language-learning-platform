import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchingPairs } from './MatchingPairs';

describe('MatchingPairs', () => {
  const mockPairs = [
    { image: '/images/cat.jpg', text: 'Cat' },
    { image: '/images/dog.jpg', text: 'Dog' },
  ];

  it('renders all images and text options', () => {
    const onComplete = vi.fn();
    render(<MatchingPairs pairs={mockPairs} onComplete={onComplete} />);

    expect(screen.getByText('Match the Images with Text')).toBeInTheDocument();
    expect(screen.getByText('Images')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(screen.getByText('Dog')).toBeInTheDocument();
  });

  it('allows selecting images and text', () => {
    const onComplete = vi.fn();
    render(<MatchingPairs pairs={mockPairs} onComplete={onComplete} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image \d+/ });
    const textButtons = screen.getAllByRole('button', { name: /Text option \d+/ });

    fireEvent.click(imageButtons[0]);
    expect(imageButtons[0].className).toContain('border-blue-500');

    fireEvent.click(textButtons[0]);
    // After clicking both, they should be checked for match
  });

  it('marks correct matches as matched', () => {
    const onComplete = vi.fn();
    render(<MatchingPairs pairs={mockPairs} onComplete={onComplete} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image \d+/ });
    const textButtons = screen.getAllByRole('button', { name: /Text option \d+/ });

    // Match first pair correctly
    fireEvent.click(imageButtons[0]);
    fireEvent.click(textButtons[0]);

    // Check if matched count increased
    expect(screen.getByText(/Matched: 1 \/ 2/)).toBeInTheDocument();
  });

  it('calls onComplete when all pairs are matched', () => {
    const onComplete = vi.fn();
    render(<MatchingPairs pairs={mockPairs} onComplete={onComplete} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image \d+/ });
    const textButtons = screen.getAllByRole('button', { name: /Text option \d+/ });

    // Match first pair
    fireEvent.click(imageButtons[0]);
    fireEvent.click(textButtons[0]);

    // Match second pair
    fireEvent.click(imageButtons[1]);
    fireEvent.click(textButtons[1]);

    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('tracks number of attempts', () => {
    const onComplete = vi.fn();
    render(<MatchingPairs pairs={mockPairs} onComplete={onComplete} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image \d+/ });
    const textButtons = screen.getAllByRole('button', { name: /Text option \d+/ });

    // Make an incorrect match
    fireEvent.click(imageButtons[0]);
    fireEvent.click(textButtons[1]);

    expect(screen.getByText(/Attempts: 1/)).toBeInTheDocument();

    // Make a correct match
    fireEvent.click(imageButtons[0]);
    fireEvent.click(textButtons[0]);

    expect(screen.getByText(/Attempts: 2/)).toBeInTheDocument();
  });

  it('disables matched items', () => {
    const onComplete = vi.fn();
    render(<MatchingPairs pairs={mockPairs} onComplete={onComplete} />);

    const imageButtons = screen.getAllByRole('button', { name: /Image \d+/ });
    const textButtons = screen.getAllByRole('button', { name: /Text option \d+/ });

    // Match first pair
    fireEvent.click(imageButtons[0]);
    fireEvent.click(textButtons[0]);

    // Check if buttons are disabled
    expect(imageButtons[0]).toBeDisabled();
    expect(textButtons[0]).toBeDisabled();
  });
});
