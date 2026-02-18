import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementBadge } from './AchievementBadge';

describe('AchievementBadge', () => {
  const mockAchievement = {
    id: '1',
    name: 'First Lesson',
    description: 'Complete your first lesson',
    iconUrl: '/icons/first-lesson.png',
    criteria: { lessonsCompleted: 1 },
  };

  it('displays achievement name and description', () => {
    render(
      <AchievementBadge achievement={mockAchievement} earned={false} />
    );

    expect(screen.getByText('First Lesson')).toBeInTheDocument();
    expect(
      screen.getByText('Complete your first lesson')
    ).toBeInTheDocument();
  });

  it('shows earned state with checkmark when earned is true', () => {
    render(<AchievementBadge achievement={mockAchievement} earned={true} />);

    expect(screen.getByLabelText('Earned badge')).toBeInTheDocument();
  });

  it('shows unearned state when earned is false', () => {
    render(<AchievementBadge achievement={mockAchievement} earned={false} />);

    expect(screen.getByText('Not yet earned')).toBeInTheDocument();
    expect(screen.queryByLabelText('Earned badge')).not.toBeInTheDocument();
  });

  it('displays earned date when provided', () => {
    const earnedDate = new Date('2024-01-15');
    render(
      <AchievementBadge
        achievement={mockAchievement}
        earned={true}
        earnedAt={earnedDate}
      />
    );

    expect(screen.getByText(/Earned:/)).toBeInTheDocument();
  });

  it('applies different styling for earned vs unearned achievements', () => {
    const { container: earnedContainer } = render(
      <AchievementBadge achievement={mockAchievement} earned={true} />
    );
    const earnedBadge = earnedContainer.querySelector('[role="article"]');
    expect(earnedBadge?.className).toContain('border-yellow-400');

    const { container: unearnedContainer } = render(
      <AchievementBadge achievement={mockAchievement} earned={false} />
    );
    const unearnedBadge = unearnedContainer.querySelector('[role="article"]');
    expect(unearnedBadge?.className).toContain('border-gray-300');
    expect(unearnedBadge?.className).toContain('opacity-60');
  });

  it('has proper accessibility attributes', () => {
    render(<AchievementBadge achievement={mockAchievement} earned={true} />);

    const badge = screen.getByRole('article');
    expect(badge).toHaveAttribute(
      'aria-label',
      'Achievement: First Lesson - Earned'
    );
  });

  it('displays icon with grayscale filter when not earned', () => {
    const { container } = render(
      <AchievementBadge achievement={mockAchievement} earned={false} />
    );

    const icon = container.querySelector('img');
    expect(icon?.className).toContain('grayscale');
  });

  it('displays icon without grayscale filter when earned', () => {
    const { container } = render(
      <AchievementBadge achievement={mockAchievement} earned={true} />
    );

    const icon = container.querySelector('img');
    expect(icon?.className).not.toContain('grayscale');
  });
});
