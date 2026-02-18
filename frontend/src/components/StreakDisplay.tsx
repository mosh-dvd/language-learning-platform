/**
 * StreakDisplay Component
 * Displays user's daily streak, longest streak, daily goal progress, and XP earned
 * Requirements: 13.1, 13.4, 13.5
 */

import { useMemo } from 'react';

export interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
  currentProgress: number;
  xp: number;
  className?: string;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  longestStreak,
  dailyGoal,
  currentProgress,
  xp,
  className = '',
}) => {
  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (dailyGoal === 0) return 0;
    return Math.min(Math.round((currentProgress / dailyGoal) * 100), 100);
  }, [currentProgress, dailyGoal]);

  // Determine if daily goal is complete
  const isGoalComplete = currentProgress >= dailyGoal;

  return (
    <div 
      className={`streak-display bg-white rounded-lg shadow-lg p-6 ${className}`}
      role="region"
      aria-label="Learning progress and streak information"
    >
      {/* Header */}
      <h2 className="text-xl font-bold text-gray-900 mb-6">Your Progress</h2>

      {/* Streak Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full">
              <svg
                className="w-7 h-7 text-orange-500"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Streak</p>
              <p 
                className="text-2xl font-bold text-gray-900"
                aria-label={`Current streak: ${currentStreak} days`}
              >
                {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-600">Longest Streak</p>
            <p 
              className="text-xl font-semibold text-gray-700"
              aria-label={`Longest streak: ${longestStreak} days`}
            >
              {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>

        {/* Streak Indicator */}
        {currentStreak > 0 && (
          <div className="flex items-center space-x-1 text-orange-500">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
            </svg>
            <span className="text-sm font-medium">
              Keep it up! You're on fire!
            </span>
          </div>
        )}
      </div>

      {/* Daily Goal Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Daily Goal</p>
          <p className="text-sm font-semibold text-gray-900">
            {currentProgress} / {dailyGoal} exercises
          </p>
        </div>

        {/* Progress Bar */}
        <div 
          className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Daily goal progress: ${progressPercentage}%`}
        >
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
              isGoalComplete
                ? 'bg-green-500'
                : progressPercentage >= 75
                ? 'bg-blue-500'
                : progressPercentage >= 50
                ? 'bg-yellow-500'
                : 'bg-orange-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Progress Percentage */}
        <p className="text-xs text-gray-600 mt-1 text-right">
          {progressPercentage}% complete
        </p>

        {/* Goal Complete Message */}
        {isGoalComplete && (
          <div 
            className="mt-3 flex items-center space-x-2 text-green-600"
            role="status"
            aria-live="polite"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <span className="text-sm font-medium">Daily goal achieved!</span>
          </div>
        )}
      </div>

      {/* XP Section */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
              <svg
                className="w-6 h-6 text-purple-500"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total XP</p>
              <p 
                className="text-xl font-bold text-purple-600"
                aria-label={`Total experience points: ${xp}`}
              >
                {xp.toLocaleString()} XP
              </p>
            </div>
          </div>

          {/* XP Badge */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full shadow-lg">
              <span className="text-white font-bold text-lg">
                {xp >= 1000 ? `${Math.floor(xp / 1000)}K` : xp}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
