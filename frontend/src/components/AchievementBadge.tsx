import React from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  criteria: Record<string, any>;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: Date;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  earned,
  earnedAt,
}) => {
  return (
    <div
      className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
        earned
          ? 'border-yellow-400 bg-yellow-50'
          : 'border-gray-300 bg-gray-100 opacity-60'
      }`}
      role="article"
      aria-label={`Achievement: ${achievement.name}${earned ? ' - Earned' : ' - Not earned yet'}`}
    >
      <div className="relative mb-2">
        <img
          src={achievement.iconUrl}
          alt={achievement.name}
          className={`w-16 h-16 rounded-full ${earned ? '' : 'grayscale'}`}
        />
        {earned && (
          <div
            className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
            aria-label="Earned badge"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 text-center">
        {achievement.name}
      </h3>
      <p className="text-sm text-gray-600 text-center mt-1">
        {achievement.description}
      </p>
      {earned && earnedAt && (
        <p className="text-xs text-gray-500 mt-2">
          Earned: {new Date(earnedAt).toLocaleDateString()}
        </p>
      )}
      {!earned && (
        <p className="text-xs text-gray-500 mt-2 italic">Not yet earned</p>
      )}
    </div>
  );
};
