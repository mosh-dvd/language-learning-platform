import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLessonsByLanguage } from '../hooks/api/useLessons';

interface LessonsListProps {
  targetLanguage: string;
}

export const LessonsList: React.FC<LessonsListProps> = ({ targetLanguage }) => {
  const navigate = useNavigate();
  const { data: lessons, isLoading, error } = useLessonsByLanguage(targetLanguage);

  // Debug logging
  React.useEffect(() => {
    console.log('LessonsList - targetLanguage:', targetLanguage);
    console.log('LessonsList - lessons:', lessons);
    console.log('LessonsList - lessons type:', typeof lessons);
    console.log('LessonsList - is array:', Array.isArray(lessons));
    console.log('LessonsList - isLoading:', isLoading);
    console.log('LessonsList - error:', error);
  }, [targetLanguage, lessons, isLoading, error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="animate-spin h-12 w-12 mx-auto text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-lg text-gray-600">טוען שיעורים...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('LessonsList error:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">שגיאה בטעינת השיעורים</p>
        <p className="text-sm text-red-600 mt-2">{(error as any)?.message || String(error)}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  // Ensure lessons is defined and is an array
  if (!lessons) {
    console.log('LessonsList - lessons is undefined/null, showing loading...');
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-lg text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  const lessonsArray = Array.isArray(lessons) ? lessons : [];
  console.log('LessonsList - lessonsArray length:', lessonsArray.length);

  if (lessonsArray.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">אין שיעורים זמינים עבור שפה זו</p>
        <p className="text-sm text-gray-600 mt-2">שפת יעד: {targetLanguage}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lessonsArray.map((lesson) => (
          <div
            key={lesson.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer"
            onClick={() => navigate(`/lesson/${lesson.id}`)}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {lesson.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {lesson.exercises?.length || 0} תרגילים
            </p>
            <button
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/lesson/${lesson.id}`);
              }}
            >
              התחל שיעור
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
