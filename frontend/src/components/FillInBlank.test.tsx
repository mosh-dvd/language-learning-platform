import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FillInBlank } from './FillInBlank';

describe('FillInBlank', () => {
  const mockProps = {
    sentence: 'The cat is on the mat',
    blankIndex: 2,
    options: ['on', 'in', 'at', 'under'],
    correctAnswer: 'on',
    onComplete: vi.fn(),
  };

  it('renders the sentence with a blank', () => {
    render(<FillInBlank {...mockProps} />);

    expect(screen.getByText('Fill in the Blank')).toBeInTheDocument();
    expect(screen.getByText(/The cat/)).toBeInTheDocument();
    expect(screen.getByText(/the mat/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Blank to fill' })).toBeInTheDocument();
  });

  it('renders all answer options', () => {
    render(<FillInBlank {...mockProps} />);

    expect(screen.getByText('Choose the correct word:')).toBeInTheDocument();
    mockProps.options.forEach((option) => {
      expect(screen.getByRole('button', { name: `Option: ${option}` })).toBeInTheDocument();
    });
  });

  it('allows selecting an option', () => {
    render(<FillInBlank {...mockProps} />);

    const option = screen.getByRole('button', { name: 'Option: on' });
    fireEvent.click(option);

    expect(option).toHaveAttribute('aria-pressed', 'true');
    // Check that the blank now shows the selected option
    const blank = screen.getByRole('textbox', { name: 'Blank to fill' });
    expect(blank.textContent).toBe('on');
  });

  it('shows correct feedback when answer is correct', () => {
    const onComplete = vi.fn();
    render(<FillInBlank {...mockProps} onComplete={onComplete} />);

    const option = screen.getByRole('button', { name: 'Option: on' });
    fireEvent.click(option);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    expect(screen.getByText(/Correct! Well done!/)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('shows incorrect feedback when answer is wrong', () => {
    const onComplete = vi.fn();
    render(<FillInBlank {...mockProps} onComplete={onComplete} />);

    const option = screen.getByRole('button', { name: 'Option: in' });
    fireEvent.click(option);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    expect(screen.getByText(/Incorrect/)).toBeInTheDocument();
    expect(screen.getByText(/The correct answer is "on"/)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it('disables submit button when no option is selected', () => {
    render(<FillInBlank {...mockProps} />);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when an option is selected', () => {
    render(<FillInBlank {...mockProps} />);

    const option = screen.getByRole('button', { name: 'Option: on' });
    fireEvent.click(option);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows retry button when answer is incorrect', () => {
    render(<FillInBlank {...mockProps} />);

    const option = screen.getByRole('button', { name: 'Option: in' });
    fireEvent.click(option);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('allows retry after incorrect answer', () => {
    render(<FillInBlank {...mockProps} />);

    const wrongOption = screen.getByRole('button', { name: 'Option: in' });
    fireEvent.click(wrongOption);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    const retryButton = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(retryButton);

    // Should reset to initial state
    expect(screen.queryByText(/Incorrect/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeInTheDocument();
  });

  it('highlights correct answer after submission', () => {
    render(<FillInBlank {...mockProps} />);

    const wrongOption = screen.getByRole('button', { name: 'Option: in' });
    fireEvent.click(wrongOption);

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    fireEvent.click(submitButton);

    const correctOption = screen.getByRole('button', { name: 'Option: on' });
    expect(correctOption.className).toContain('border-green-500');
  });
});
