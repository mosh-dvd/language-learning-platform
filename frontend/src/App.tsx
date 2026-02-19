import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import ErrorBoundary from './components/ErrorBoundary'
import { NetworkStatusBanner } from './components/NetworkStatusBanner'
import { AuthenticationForm, User } from './components/AuthenticationForm'
import { LanguageSelector } from './components/LanguageSelector'
import { LessonsList } from './components/LessonsList'
import { LearningView } from './components/LearningView'
import { LessonEditor } from './components/LessonEditor'
import { useLesson } from './hooks/api/useLessons'

// Wrapper component for lesson page
function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { data: lesson, isLoading, error } = useLesson(lessonId || '');
  const [exercisesWithText, setExercisesWithText] = React.useState<any[]>([]);
  const [loadingTexts, setLoadingTexts] = React.useState(true);

  // Load image texts for all exercises
  React.useEffect(() => {
    if (!lesson || !lesson.exercises) return;

    const loadTexts = async () => {
      setLoadingTexts(true);
      try {
        const exercisesWithTexts = await Promise.all(
          lesson.exercises!.map(async (ex) => {
            try {
              // Fetch image texts for this exercise
              const response = await fetch(
                `http://localhost:3000/api/image-texts/${ex.imageId}`
              );
              if (!response.ok) {
                console.error(`Failed to load texts for image ${ex.imageId}`);
                return {
                  ...ex,
                  imageUrl: `http://localhost:3000/api/images/${ex.imageId}`,
                  text: '',
                  languageCode: lesson.targetLanguage,
                };
              }
              const texts = await response.json();
              const targetText = texts.find(
                (t: any) => t.languageCode === lesson.targetLanguage
              );
              return {
                ...ex,
                imageUrl: `http://localhost:3000/api/images/${ex.imageId}`,
                text: targetText?.text || '',
                languageCode: lesson.targetLanguage,
              };
            } catch (err) {
              console.error(`Error loading texts for exercise ${ex.id}:`, err);
              return {
                ...ex,
                imageUrl: `http://localhost:3000/api/images/${ex.imageId}`,
                text: '',
                languageCode: lesson.targetLanguage,
              };
            }
          })
        );
        setExercisesWithText(exercisesWithTexts);
      } catch (err) {
        console.error('Error loading exercise texts:', err);
      } finally {
        setLoadingTexts(false);
      }
    };

    loadTexts();
  }, [lesson]);

  if (isLoading || loadingTexts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
          <p className="text-lg text-gray-600">טוען שיעור...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">שגיאה בטעינת השיעור</p>
          <button
            onClick={() => navigate('/learn')}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            חזור לבחירת שיעורים
          </button>
        </div>
      </div>
    );
  }

  // Transform lesson data to match LearningView expectations
  const transformedLesson = {
    ...lesson,
    exercises: exercisesWithText,
  };

  return (
    <LearningView
      lesson={transformedLesson as any}
      onComplete={(lessonId) => {
        console.log('Lesson completed:', lessonId);
        navigate('/learn');
      }}
      onExerciseComplete={(exerciseId, correct) => {
        console.log('Exercise completed:', exerciseId, correct);
      }}
    />
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    return !!localStorage.getItem('authToken')
  })
  const [user, setUser] = React.useState<User | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login')

  const handleAuthSuccess = (userData: User, token: string) => {
    localStorage.setItem('authToken', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setIsAuthenticated(true)
  }

  const handleAuthError = (error: Error) => {
    console.error('Authentication error:', error)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setUser(null)
    setIsAuthenticated(false)
  }

  const [selectedLanguages, setSelectedLanguages] = React.useState<{
    native: string;
    target: string;
  } | null>(null);

  const handleLanguageSelect = (nativeLanguage: string, targetLanguage: string) => {
    setSelectedLanguages({ native: nativeLanguage, target: targetLanguage });
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <NetworkStatusBanner />
          <div className="min-h-screen bg-gray-50">
            {isAuthenticated && user && (
              <nav className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-6">
                      <Link to="/" className="text-xl font-bold text-blue-600">
                        Language Learning
                      </Link>
                      <Link to="/learn" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                        Learn
                      </Link>
                      <Link to="/admin" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                        ניהול שיעורים
                      </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {user.name || user.email}
                      </span>
                      <button
                        onClick={handleLogout}
                        className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </nav>
            )}
            
            <Routes>
              <Route 
                path="/auth" 
                element={
                  isAuthenticated ? 
                    <Navigate to="/learn" replace /> : 
                    <div className="container mx-auto px-4 py-8">
                      <AuthenticationForm 
                        mode={authMode}
                        onSuccess={handleAuthSuccess}
                        onError={handleAuthError}
                        onModeChange={setAuthMode}
                      />
                    </div>
                } 
              />
              <Route 
                path="/learn" 
                element={
                  isAuthenticated ? 
                    selectedLanguages ? (
                      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="mb-6 flex items-center justify-between">
                          <h1 className="text-3xl font-bold text-gray-900">
                            שיעורים זמינים
                          </h1>
                          <button
                            onClick={() => setSelectedLanguages(null)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            שנה שפה
                          </button>
                        </div>
                        <LessonsList
                          targetLanguage={selectedLanguages.target}
                        />
                      </div>
                    ) : (
                      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-6">
                          בחר שפה ללימוד
                        </h1>
                        <LanguageSelector
                          initialNativeLanguage={user?.nativeLanguage || 'he'}
                          onLanguageSelect={handleLanguageSelect}
                        />
                      </div>
                    ) : 
                    <Navigate to="/auth" replace />
                } 
              />
              <Route 
                path="/lesson/:lessonId" 
                element={
                  isAuthenticated ? 
                    <LessonPage /> : 
                    <Navigate to="/auth" replace />
                } 
              />
              <Route 
                path="/admin" 
                element={
                  isAuthenticated ? 
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <h1 className="text-3xl font-bold text-gray-900 mb-6">
                        ניהול שיעורים
                      </h1>
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <LessonEditor
                          userId={user?.id || ''}
                          onSave={(lesson) => {
                            console.log('Lesson saved:', lesson);
                            alert('השיעור נשמר בהצלחה!');
                          }}
                          onError={(error) => {
                            console.error('Error saving lesson:', error);
                            alert('שגיאה בשמירת השיעור: ' + error);
                          }}
                        />
                      </div>
                    </div> : 
                    <Navigate to="/auth" replace />
                } 
              />
              <Route 
                path="/" 
                element={
                  <Navigate to={isAuthenticated ? "/learn" : "/auth"} replace />
                } 
              />
            </Routes>
          </div>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}

export default App
