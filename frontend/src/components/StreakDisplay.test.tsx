/**
 * StreakDisplay Component Tests
 * Tests for displaying streak, daily goal progress, and XP
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreakDisplay } from './StreakDisplay';

describe('StreakDisplay', () => {
  it('should render current streak and longest streak', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={3}
        xp={250}
      />
    );

    expect(screen.getByText(/5 days/i)).toBeInTheDocument();
    expect(screen.getByText(/10 days/i)).toBeInTheDocument();
  });

  it('should display singular "day" for streak of 1', () => {
    render(
      <StreakDisplay
        currentStreak={1}
        longestStreak={1}
        dailyGoal={10}
        currentProgress={3}
        xp={250}
      />
    );

    const dayElements = screen.getAllByText(/1 day/i);
    expect(dayElements.length).toBeGreaterThan(0);
  });

  it('should display daily goal progress correctly', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={7}
        xp={250}
      />
    );

    expect(screen.getByText(/7 \/ 10 exercises/i)).toBeInTheDocument();
    expect(screen.getByText(/70% complete/i)).toBeInTheDocument();
  });

  it('should calculate progress percentage correctly', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={20}
        currentProgress={5}
        xp={250}
      />
    );

    expect(screen.getByText(/25% complete/i)).toBeInTheDocument();
  });

  it('should show goal complete message when daily goal is achieved', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={10}
        xp={250}
      />
    );

    expect(screen.getByText(/daily goal achieved/i)).toBeInTheDocument();
  });

  it('should show goal complete message when progress exceeds goal', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={15}
        xp={250}
      />
    );

    expect(screen.getByText(/daily goal achieved/i)).toBeInTheDocument();
    expect(screen.getByText(/100% complete/i)).toBeInTheDocument();
  });

  it('should display XP correctly', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={3}
        xp={1250}
      />
    );

    expect(screen.getByText(/1,250 XP/i)).toBeInTheDocument();
  });

  it('should format large XP values with commas', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={3}
        xp={12500}
      />
    );

    expect(screen.getByText(/12,500 XP/i)).toBeInTheDocument();
  });

  it('should display abbreviated XP in badge for values >= 1000', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={3}
        xp={5500}
      />
    );

    expect(screen.getByText(/5K/)).toBeInTheDocument();
  });

  it('should display full XP in badge for values < 1000', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={3}
        xp={750}
      />
    );

    const badge = screen.getByText('750');
    expect(badge).toBeInTheDocument();
  });

  it('should show motivational message when streak is active', () => {
    render(
      <StreakDisplay
        currentStreak={3}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={3}
        xp={250}
      />
    );

    expect(screen.getByText(/keep it up! you're on fire!/i)).toBeInTheDocument();
  });

  it('should not show motivational message when streak is 0', () => {
    render(
      <StreakDisplay
        currentStreak={0}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={3}
        xp={250}
      />
    );

    expect(screen.queryByText(/keep it up! you're on fire!/i)).not.toBeInTheDocument();
  });

  it('should handle zero daily goal without crashing', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={0}
        currentProgress={0}
        xp={250}
      />
    );

    expect(screen.getByText(/0% complete/i)).toBeInTheDocument();
  });

  it('should have proper ARIA labels for accessibility', () => {
    render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={7}
        xp={250}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '70');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <StreakDisplay
        currentStreak={5}
        longestStreak={10}
        dailyGoal={10}
        currentProgress={3}
        xp={250}
        className="custom-class"
      />
    );

    const streakDisplay = container.querySelector('.streak-display');
    expect(streakDisplay).toHaveClass('custom-class');
  });
});
