# Design Document - Language Learning Platform

## Overview

The Language Learning Platform is a web-based application that provides an immersive language learning experience similar to Rosetta Stone. The platform uses visual learning through images paired with text in multiple languages, combined with Text-to-Speech (TTS) for pronunciation and Speech-to-Text (STT) for pronunciation validation.

The system follows a modern web architecture with a React-based frontend and a Node.js backend. The platform leverages the Web Speech API for TTS and STT capabilities, with cloud-based fallback options for consistent quality across browsers.

**Key Features:**
- User authentication with OAuth support (Google, Facebook)
- Spaced Repetition System (SRS) for vocabulary retention
- Gamification elements (streaks, XP, achievements)
- Multiple exercise types (matching, fill-in-blank, listening comprehension)
- WCAG 2.1 Level AA accessibility compliance
- Immersion-based learning with optional hints

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Learning   │  │   Content    │  │    Speech    │      │
│  │      UI      │  │  Management  │  │   Services   │      │
│  │  Components  │  │      UI      │  │  (TTS/STT)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │ Gamification │  │ Accessibility│      │
│  │      UI      │  │      UI      │  │   Features   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  State Manager │                        │
│                    │   (React Query)│                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼──────────────────────────────────┐
│                     Backend (Node.js/Express)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Content    │  │   Progress   │  │    Image     │       │
│  │   Service    │  │   Service    │  │   Service    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │     Auth     │  │     SRS      │  │ Gamification │       │
│  │   Service    │  │   Service    │  │   Service    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │               │
│         └──────────────────┴──────────────────┘               │
│                            │                                  │
│                    ┌───────▼────────┐                         │
│                    │   Data Layer   │                         │
│                    └───────┬────────┘                         │
└────────────────────────────┼───────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   PostgreSQL DB  │
                    │   + File Storage │
                    └──────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- React Router for navigation
- React Query (TanStack Query) for state management and API caching
- Tailwind CSS for styling
- Web Speech API for TTS/STT

**Backend:**
- Node.js with Express
- TypeScript
- PostgreSQL for structured data
- Local file system or S3-compatible storage for images
- JWT for authentication

**Testing:**
- Vitest for unit testing
- fast-check for property-based testing
- React Testing Library for component testing
- Playwright for E2E testing

## Components and Interfaces

### Frontend Components

#### 1. LearningView Component
Displays exercises to users with image cards, text, and interactive elements.

**Interface:**
```typescript
interface LearningViewProps {
  lessonId: string;
  onComplete: (lessonId: string) => void;
}

interface Exercise {
  id: string;
  imageUrl: string;
  text: string;
  languageCode: string;
  order: number;
}
```

#### 2. ImageCard Component
Displays an image with associated text and audio playback button.

**Interface:**
```typescript
interface ImageCardProps {
  imageUrl: string;
  text: string;
  languageCode: string;
  onSpeak: () => void;
  isPlaying: boolean;
}
```

#### 3. SpeechPractice Component
Handles microphone input and pronunciation validation.

**Interface:**
```typescript
interface SpeechPracticeProps {
  expectedText: string;
  languageCode: string;
  onScore: (score: number) => void;
}

interface SpeechResult {
  recognizedText: string;
  confidence: number;
  score: number;
}
```

#### 4. ContentManager Component
Admin interface for creating and managing lessons.

**Interface:**
```typescript
interface ContentManagerProps {
  onSave: (lesson: Lesson) => Promise<void>;
}

interface Lesson {
  id: string;
  title: string;
  targetLanguage: string;
  exercises: Exercise[];
  published: boolean;
}
```

#### 5. AuthenticationForm Component
Handles user registration and login.

**Interface:**
```typescript
interface AuthenticationFormProps {
  mode: 'login' | 'register';
  onSuccess: (user: User) => void;
  onError: (error: Error) => void;
}

interface AuthCredentials {
  email: string;
  password: string;
}

interface OAuthProvider {
  name: 'google' | 'facebook';
  authenticate: () => Promise<User>;
}
```

#### 6. StreakDisplay Component
Shows user's daily streak and progress.

**Interface:**
```typescript
interface StreakDisplayProps {
  currentStreak: number;
  dailyGoal: number;
  currentProgress: number;
  xp: number;
}
```

#### 7. AchievementBadge Component
Displays earned achievements.

**Interface:**
```typescript
interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: Date;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  criteria: string;
}
```

#### 8. ExerciseVariety Components
Different exercise type implementations.

**Interface:**
```typescript
interface MatchingPairsProps {
  pairs: Array<{ image: string; text: string }>;
  onComplete: (correct: boolean) => void;
}

interface FillInBlankProps {
  sentence: string;
  blankIndex: number;
  options: string[];
  correctAnswer: string;
  onComplete: (correct: boolean) => void;
}

interface ListeningComprehensionProps {
  audioUrl: string;
  images: string[];
  correctImageIndex: number;
  onComplete: (correct: boolean) => void;
}
```

### Backend Services

#### 1. ContentService
Manages lessons, exercises, and image-text associations.

**Interface:**
```typescript
interface ContentService {
  createLesson(lesson: CreateLessonDto): Promise<Lesson>;
  updateLesson(id: string, updates: UpdateLessonDto): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  getLesson(id: string): Promise<Lesson>;
  getLessonsByLanguage(languageCode: string): Promise<Lesson[]>;
  addExercise(lessonId: string, exercise: CreateExerciseDto): Promise<Exercise>;
  reorderExercises(lessonId: string, exerciseIds: string[]): Promise<void>;
}
```

#### 2. ImageService
Handles image upload, storage, and retrieval.

**Interface:**
```typescript
interface ImageService {
  uploadImage(file: Buffer, metadata: ImageMetadata): Promise<Image>;
  getImage(id: string): Promise<Image>;
  deleteImage(id: string): Promise<void>;
  listImages(filters: ImageFilters): Promise<Image[]>;
  validateImageFormat(file: Buffer): boolean;
}

interface ImageMetadata {
  filename: string;
  mimeType: string;
  size: number;
}
```

#### 3. ProgressService
Tracks user progress and scores.

**Interface:**
```typescript
interface ProgressService {
  recordExerciseCompletion(userId: string, exerciseId: string): Promise<void>;
  recordPronunciationScore(userId: string, exerciseId: string, score: number): Promise<void>;
  getUserProgress(userId: string): Promise<UserProgress>;
  getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress>;
  syncProgress(userId: string, progress: UserProgress): Promise<void>;
}
```

#### 4. AuthService
Manages user authentication and authorization.

**Interface:**
```typescript
interface AuthService {
  register(email: string, password: string, nativeLanguage: string): Promise<User>;
  login(email: string, password: string): Promise<AuthToken>;
  loginWithOAuth(provider: 'google' | 'facebook', token: string): Promise<AuthToken>;
  logout(userId: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updateProfile(userId: string, updates: ProfileUpdates): Promise<User>;
  validateToken(token: string): Promise<User>;
}

interface AuthToken {
  token: string;
  expiresAt: Date;
  user: User;
}

interface ProfileUpdates {
  name?: string;
  avatar?: string;
}
```

#### 5. SRSService
Implements Spaced Repetition System for vocabulary review.

**Interface:**
```typescript
interface SRSService {
  identifyWeakWords(userId: string): Promise<WeakWord[]>;
  generateDailyReview(userId: string): Promise<Exercise[]>;
  scheduleReview(userId: string, wordId: string, performance: number): Promise<ReviewSchedule>;
  graduateWord(userId: string, wordId: string): Promise<void>;
  getReviewDue(userId: string): Promise<Exercise[]>;
}

interface WeakWord {
  wordId: string;
  text: string;
  languageCode: string;
  successRate: number;
  lastAttempt: Date;
  reviewCount: number;
}

interface ReviewSchedule {
  wordId: string;
  nextReview: Date;
  interval: number; // days
  easeFactor: number;
}
```

#### 6. GamificationService
Manages streaks, XP, and achievements.

**Interface:**
```typescript
interface GamificationService {
  updateStreak(userId: string): Promise<StreakInfo>;
  awardXP(userId: string, amount: number, reason: string): Promise<number>;
  checkAchievements(userId: string): Promise<Achievement[]>;
  awardAchievement(userId: string, achievementId: string): Promise<void>;
  getDailyProgress(userId: string): Promise<DailyProgress>;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
}

interface DailyProgress {
  exercisesCompleted: number;
  dailyGoal: number;
  xpEarned: number;
  percentComplete: number;
}
```

### Speech Services (Frontend)

#### 1. TTSService
Wraps Web Speech API for text-to-speech.

**Interface:**
```typescript
interface TTSService {
  speak(text: string, languageCode: string): Promise<void>;
  stop(): void;
  isSupported(): boolean;
  getAvailableVoices(languageCode: string): SpeechSynthesisVoice[];
  setVoice(voice: SpeechSynthesisVoice): void;
}
```

#### 2. STTService
Wraps Web Speech API for speech-to-text.

**Interface:**
```typescript
interface STTService {
  startListening(languageCode: string): Promise<void>;
  stopListening(): void;
  isSupported(): boolean;
  onResult(callback: (result: SpeechRecognitionResult) => void): void;
  onError(callback: (error: Error) => void): void;
}
```

#### 3. PronunciationValidator
Compares recognized speech with expected text.

**Interface:**
```typescript
interface PronunciationValidator {
  calculateScore(expected: string, recognized: string): number;
  normalizeText(text: string): string;
  calculateLevenshteinDistance(str1: string, str2: string): number;
}
```

## Data Models

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  native_language VARCHAR(10) NOT NULL,
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(oauth_provider, oauth_id)
);
```

#### Images Table
```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  size_bytes INTEGER NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);
```

#### Cached_Audio Table
```sql
CREATE TABLE cached_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_text_id UUID REFERENCES image_texts(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  audio_url VARCHAR(500) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  UNIQUE(text_hash, language_code, provider)
);
```

#### Image_Texts Table
```sql
CREATE TABLE image_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(image_id, language_code, version)
);
```

#### Lessons Table
```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);
```

#### Exercises Table
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  image_id UUID REFERENCES images(id),
  exercise_type VARCHAR(50) NOT NULL DEFAULT 'image_text',
  order_index INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lesson_id, order_index)
);
```

#### User_Progress Table
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, exercise_id)
);
```

#### Pronunciation_Scores Table
```sql
CREATE TABLE pronunciation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  recognized_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### User_Streaks Table
```sql
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### User_XP Table
```sql
CREATE TABLE user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Achievements Table
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  criteria JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### User_Achievements Table
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);
```

#### Weak_Words Table
```sql
CREATE TABLE weak_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_text_id UUID REFERENCES image_texts(id) ON DELETE CASCADE,
  success_rate DECIMAL(5,2) NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMP,
  next_review DATE,
  review_interval INTEGER DEFAULT 1,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, image_text_id)
);
```

#### Password_Reset_Tokens Table
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TypeScript Data Models

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  nativeLanguage: string;
  oauthProvider?: 'google' | 'facebook';
  oauthId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Image {
  id: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string;
  createdAt: Date;
  createdBy: string;
}

interface ImageText {
  id: string;
  imageId: string;
  languageCode: string;
  text: string;
  version: number;
  createdAt: Date;
}

interface Lesson {
  id: string;
  title: string;
  targetLanguage: string;
  published: boolean;
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface Exercise {
  id: string;
  lessonId: string;
  imageId: string;
  exerciseType: 'image_text' | 'matching_pairs' | 'fill_in_blank' | 'listening_comprehension';
  orderIndex: number;
  metadata?: ExerciseMetadata;
  image?: Image;
  text?: ImageText;
  createdAt: Date;
}

type ExerciseMetadata = 
  | MatchingPairsMetadata
  | FillInBlankMetadata
  | ListeningComprehensionMetadata
  | ImageTextMetadata;

interface MatchingPairsMetadata {
  pairs: Array<{
    imageId: string;
    textId: string;
  }>;
}

interface FillInBlankMetadata {
  sentence: string;
  blankIndex: number;
  correctAnswer: string;
  distractors: string[];
}

interface ListeningComprehensionMetadata {
  audioTextId: string;
  imageOptions: string[];
  correctImageIndex: number;
}

interface ImageTextMetadata {
  // Simple image-text pairing, no additional metadata needed
}

interface UserProgress {
  id: string;
  userId: string;
  exerciseId: string;
  completed: boolean;
  completedAt?: Date;
  lastAccessed: Date;
}

interface PronunciationScore {
  id: string;
  userId: string;
  exerciseId: string;
  score: number;
  recognizedText: string;
  createdAt: Date;
}

interface UserStreak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UserXP {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: Date;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  criteria: Record<string, any>;
  createdAt: Date;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement?: Achievement;
  earnedAt: Date;
}

interface WeakWord {
  id: string;
  userId: string;
  imageTextId: string;
  successRate: number;
  attemptCount: number;
  lastAttempt: Date;
  nextReview: Date;
  reviewInterval: number;
  easeFactor: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

interface CachedAudio {
  id: string;
  imageTextId: string;
  languageCode: string;
  textHash: string;
  audioUrl: string;
  provider: 'web_speech_api' | 'google_cloud' | 'aws_polly' | 'azure_speech';
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

**Original Properties (Requirements 1-10):**
- Properties 1.1 and 1.5 both test image format validation - these will be combined into a single comprehensive property
- Properties 1.2 and 7.1 both test unique ID generation - these can be combined into a general uniqueness property
- Properties 3.3 and 3.4 test UI state transitions during audio playback - these can be combined into a single state machine property
- Properties 4.5 and 4.6 both test feedback based on pronunciation scores - these can be combined into a single conditional feedback property

**New Properties (Requirements 11-15):**
- Properties 12.2 and 12.3 both test weak word identification - these can be combined into a single property
- Properties 13.1, 13.2, and 13.3 all test streak logic - these can be combined into a comprehensive streak property
- Properties 14.1-14.4 all test exercise type support - these can be combined into a single property about exercise type validation
- Properties 15.3 and 15.5 both test keyboard accessibility - these can be combined into a comprehensive keyboard navigation property

### Core Properties

**Property 1: Image format validation**
*For any* uploaded file, the validation function should accept files with JPEG, PNG, or WebP formats and reject all other formats, and should reject files exceeding the maximum size limit.
**Validates: Requirements 1.1, 1.5**

**Property 2: Unique identifier generation**
*For any* set of created entities (images, lessons, exercises), all generated identifiers should be unique with no collisions.
**Validates: Requirements 1.2, 7.1**

**Property 3: Image retrieval completeness**
*For any* set of uploaded images, retrieving all images should return exactly the same set with complete metadata.
**Validates: Requirements 1.3**

**Property 4: Referential integrity on deletion**
*For any* image that is referenced by lessons, deleting the image should remove it from storage and update all referencing lessons to remove the association.
**Validates: Requirements 1.4**

**Property 5: Multi-language text independence**
*For any* image with multiple language translations, updating the text in one language should not affect the text in any other language.
**Validates: Requirements 2.2**

**Property 6: Version history preservation**
*For any* sequence of text updates to an image, all previous versions should be preserved and retrievable in chronological order.
**Validates: Requirements 2.3**

**Property 7: Text validation**
*For any* text input, the validation function should reject empty strings and strings containing invalid Unicode characters, and accept all valid non-empty Unicode strings.
**Validates: Requirements 2.4**

**Property 8: Language-specific text display**
*For any* image card with multiple language texts, displaying the card with a specific target language should show only the text for that language.
**Validates: Requirements 2.5**

**Property 9: TTS audio generation**
*For any* valid text and language code, triggering TTS should generate audio output without errors.
**Validates: Requirements 3.1**

**Property 10: TTS language configuration**
*For any* supported language code, the TTS service should use a voice matching that language's locale.
**Validates: Requirements 3.2**

**Property 11: Audio playback state transitions**
*For any* audio playback, the UI state should transition from ready → playing → ready, with appropriate visual feedback at each stage.
**Validates: Requirements 3.3, 3.4**

**Property 12: Audio caching**
*For any* text and language combination, requesting TTS audio multiple times should use cached audio for subsequent requests after the first generation.
**Validates: Requirements 3.5**

**Property 13: Pronunciation score calculation**
*For any* pair of expected and recognized text, the pronunciation score should be between 0 and 100, with identical texts scoring 100 and completely different texts scoring near 0.
**Validates: Requirements 4.4**

**Property 14: Score-based feedback**
*For any* pronunciation score, if the score exceeds the threshold, positive feedback should be shown; if below the threshold, retry option should be available.
**Validates: Requirements 4.5, 4.6**

**Property 15: Lesson navigation**
*For any* lesson with N exercises, starting the lesson should display exercise 1, and completing exercise i (where i < N) should display exercise i+1.
**Validates: Requirements 5.1, 5.2**

**Property 16: Lesson completion tracking**
*For any* lesson with N exercises, completing all N exercises should mark the lesson as complete.
**Validates: Requirements 5.3**

**Property 17: Progress persistence**
*For any* completed exercise, the completion status should be immediately persisted and retrievable after session restart.
**Validates: Requirements 5.5, 9.1**

**Property 18: Language validation**
*For any* language selection, the system should accept supported language codes and reject unsupported ones.
**Validates: Requirements 6.2**

**Property 19: Exercise ordering**
*For any* lesson with exercises, adding exercises should maintain the specified order, and reordering should update the sequence correctly.
**Validates: Requirements 7.2, 7.3**

**Property 20: Exercise validation**
*For any* exercise creation attempt, the system should reject exercises without an associated image and text, and accept exercises with both.
**Validates: Requirements 7.4**

**Property 21: Lesson visibility by language**
*For any* published lesson with target language L, the lesson should be visible to users learning language L and not visible to users learning other languages.
**Validates: Requirements 7.5**

**Property 22: Progress synchronization**
*For any* authenticated user with progress on device A, the same progress should be retrievable on device B after synchronization.
**Validates: Requirements 9.4**

**Property 23: Error handling for speech APIs**
*For any* TTS or STT operation that encounters an error, the system should handle the error gracefully without crashing and provide appropriate user feedback.
**Validates: Requirements 10.4**

**Property 24: Registration validation**
*For any* email and password combination, the registration function should accept valid credentials and reject invalid ones (malformed email, weak password), and should prevent duplicate email registration.
**Validates: Requirements 11.1**

**Property 25: OAuth token processing**
*For any* valid OAuth token from supported providers (Google, Facebook), the authentication function should create or retrieve a user account and generate a valid session token.
**Validates: Requirements 11.2**

**Property 26: Password reset token lifecycle**
*For any* password reset request, the system should generate a unique token with expiration, and the token should be usable exactly once before the expiration time.
**Validates: Requirements 11.3**

**Property 27: Profile update persistence**
*For any* authenticated user and valid profile updates (name, avatar), the updates should persist correctly and be retrievable in subsequent requests.
**Validates: Requirements 11.4**

**Property 28: JWT token validation**
*For any* generated JWT token, it should contain correct user claims and expiration time, and expired tokens should be rejected by the validation function.
**Validates: Requirements 11.5**

**Property 29: Token invalidation on logout**
*For any* valid session token, after logout, the token should not be accepted for authenticated requests.
**Validates: Requirements 11.6**

**Property 30: Success rate tracking**
*For any* sequence of exercise attempts for a specific word, the calculated success rate should accurately reflect the proportion of successful attempts.
**Validates: Requirements 12.1**

**Property 31: Weak word identification**
*For any* word with success rate below 70% or repeated errors, the system should mark it as a weak word and include it in the review queue.
**Validates: Requirements 12.2, 12.3**

**Property 32: Daily review composition**
*For any* daily review generation, the resulting exercise set should contain both new content and weak words in appropriate proportions.
**Validates: Requirements 12.4**

**Property 33: Spaced repetition intervals**
*For any* word in the review system, successful reviews should increase the review interval, and failed reviews should decrease it, following the SRS algorithm.
**Validates: Requirements 12.5**

**Property 34: Word graduation**
*For any* weak word with sufficient consecutive successful reviews (e.g., 3+), the system should remove it from the weak words queue.
**Validates: Requirements 12.6**

**Property 35: Streak calculation**
*For any* sequence of user activity dates, the streak should increment for consecutive days with activity, reset to zero when a day is missed, and track the longest streak achieved.
**Validates: Requirements 13.1, 13.2, 13.3**

**Property 36: XP award calculation**
*For any* completed exercise, the awarded XP should be proportional to the exercise difficulty and user performance score.
**Validates: Requirements 13.4**

**Property 37: Daily progress calculation**
*For any* user's daily activity, the progress percentage should accurately reflect completed exercises relative to the daily goal.
**Validates: Requirements 13.5**

**Property 38: Achievement triggering**
*For any* user action that meets achievement criteria (e.g., perfect lesson completion), the system should award the corresponding achievement exactly once.
**Validates: Requirements 13.6**

**Property 39: Achievement persistence**
*For any* earned achievement, it should be stored with timestamp and retrievable in the user's achievement history.
**Validates: Requirements 13.7**

**Property 40: Exercise type support**
*For any* supported exercise type (matching_pairs, fill_in_blank, listening_comprehension, image_selection), the system should allow creation and validation of exercises of that type.
**Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

**Property 41: Exercise content validation**
*For any* exercise creation attempt, the system should validate that all required content elements for the specified exercise type are present before allowing publication.
**Validates: Requirements 14.6**

**Property 42: Alt-text requirement**
*For any* image upload attempt, the system should reject images without alt-text descriptions.
**Validates: Requirements 15.2**

**Property 43: Keyboard navigation completeness**
*For any* interactive element in the UI, it should be reachable via keyboard navigation with proper tab order and focus indicators, and should have appropriate ARIA labels.
**Validates: Requirements 15.3, 15.5**

**Property 44: Color contrast compliance**
*For any* text element in the UI, the color contrast ratio should meet or exceed 4.5:1 for normal text and 3:1 for large text.
**Validates: Requirements 15.4**

**Property 45: Audio visual feedback**
*For any* audio playback event, the system should display visual indicators (animation, icon change) that are visible without audio.
**Validates: Requirements 15.6**

## Error Handling

### Frontend Error Handling

**Speech API Errors:**
- Detect browser support for Web Speech API on initialization
- Fallback to cloud-based TTS/STT services when browser API quality is insufficient
- Display clear messaging when TTS/STT is not available
- Handle microphone permission denial gracefully
- Provide fallback UI when speech features are unavailable
- Implement retry logic for transient speech recognition errors

**Network Errors:**
- Implement exponential backoff for failed API requests
- Cache content locally for offline access
- Display appropriate error messages for different failure types
- Allow users to retry failed operations
- Show loading states during network operations

**Validation Errors:**
- Display inline validation errors for form inputs
- Prevent submission of invalid data
- Provide clear guidance on how to fix validation errors

### Backend Error Handling

**Database Errors:**
- Wrap all database operations in try-catch blocks
- Log errors with sufficient context for debugging
- Return appropriate HTTP status codes (400, 404, 500)
- Implement transaction rollback for failed multi-step operations
- Use connection pooling with retry logic

**File Storage Errors:**
- Validate file uploads before processing
- Handle storage quota exceeded errors
- Implement cleanup for failed uploads
- Provide meaningful error messages for storage failures

**Authentication Errors:**
- Return 401 for unauthenticated requests
- Return 403 for unauthorized access attempts
- Implement rate limiting for authentication endpoints
- Log suspicious authentication patterns
- Handle OAuth provider failures gracefully
- Validate JWT tokens and reject expired or invalid tokens
- Provide clear error messages for registration failures (duplicate email, weak password)

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases for individual functions and components:

**Frontend Unit Tests:**
- Component rendering with various props
- Event handler behavior
- State management logic
- Utility function correctness (text normalization, score calculation)
- Error boundary behavior

**Backend Unit Tests:**
- Service method behavior with valid inputs
- Database query construction
- File validation logic
- Authentication and authorization logic
- API endpoint request/response handling

**Testing Framework:** Vitest with React Testing Library for frontend, Vitest for backend

### Property-Based Testing

Property-based tests will verify universal properties across all valid inputs using the fast-check library:

**Configuration:**
- Each property test will run a minimum of 100 iterations
- Tests will use smart generators that constrain inputs to valid ranges
- Each test will be tagged with a comment referencing the design document property

**Tag Format:**
```typescript
// Feature: language-learning-platform, Property 1: Image format validation
// Validates: Requirements 1.1, 1.5
```

**Property Test Coverage:**
- All 23 correctness properties defined above will have corresponding property-based tests
- Tests will generate random valid inputs within domain constraints
- Tests will verify invariants hold across all generated inputs
- Tests will use appropriate generators for each data type (UUIDs, language codes, text, images)

**Example Property Test Structure:**
```typescript
import fc from 'fast-check';

// Feature: language-learning-platform, Property 1: Image format validation
// Validates: Requirements 1.1, 1.5
test('image format validation accepts valid formats and rejects invalid ones', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant('image/jpeg'),
        fc.constant('image/png'),
        fc.constant('image/webp')
      ),
      fc.integer({ min: 1, max: 10_000_000 }), // size in bytes
      (mimeType, size) => {
        const result = validateImageFormat({ mimeType, size });
        expect(result.valid).toBe(size <= MAX_FILE_SIZE);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify interactions between components:

- API endpoint integration with database
- Frontend component integration with API
- Authentication flow end-to-end
- File upload and retrieval flow
- Progress tracking across multiple operations

### End-to-End Testing

E2E tests using Playwright will verify complete user workflows:

- User registration and language selection
- Content manager creating a lesson
- User completing a lesson with TTS
- User practicing pronunciation with STT
- Progress persistence across sessions

**Testing Approach:**
- Implementation-first development: implement features before writing tests
- Property tests placed close to implementation to catch errors early
- Checkpoint tasks to ensure all tests pass at key milestones
- Tests should validate real functionality without mocks where possible

## Recommended Libraries

### Frontend Libraries

**Core Framework:**
- `react` (^18.2.0) - UI framework
- `react-dom` (^18.2.0) - React DOM rendering
- `react-router-dom` (^6.20.0) - Client-side routing
- `typescript` (^5.3.0) - Type safety

**State Management:**
- `@tanstack/react-query` (^5.0.0) - Server state management and caching
- `zustand` (^4.4.0) - Client state management (optional, for complex local state)

**Styling:**
- `tailwindcss` (^3.4.0) - Utility-first CSS framework
- `@headlessui/react` (^1.7.0) - Unstyled accessible UI components

**Forms & Validation:**
- `react-hook-form` (^7.48.0) - Form state management
- `zod` (^3.22.0) - Schema validation

**HTTP Client:**
- `axios` (^1.6.0) - HTTP requests with interceptors

**Testing:**
- `vitest` (^1.0.0) - Unit test framework
- `@testing-library/react` (^14.1.0) - React component testing
- `@testing-library/user-event` (^14.5.0) - User interaction simulation
- `fast-check` (^3.15.0) - Property-based testing
- `@playwright/test` (^1.40.0) - E2E testing

### Backend Libraries

**Core Framework:**
- `express` (^4.18.0) - Web framework
- `typescript` (^5.3.0) - Type safety
- `ts-node` (^10.9.0) - TypeScript execution

**Database:**
- `pg` (^8.11.0) - PostgreSQL client
- `@types/pg` (^8.10.0) - TypeScript types for pg

**Authentication:**
- `jsonwebtoken` (^9.0.0) - JWT token generation and validation
- `bcrypt` (^5.1.0) - Password hashing
- `@types/bcrypt` (^5.0.0) - TypeScript types
- `passport` (^0.7.0) - Authentication middleware
- `passport-google-oauth20` (^2.0.0) - Google OAuth strategy
- `passport-facebook` (^3.0.0) - Facebook OAuth strategy
- `nodemailer` (^6.9.0) - Email sending for password reset

**Validation:**
- `zod` (^3.22.0) - Schema validation (shared with frontend)

**File Upload:**
- `multer` (^1.4.0) - Multipart form data handling
- `@types/multer` (^1.4.0) - TypeScript types

**Utilities:**
- `uuid` (^9.0.0) - UUID generation
- `dotenv` (^16.3.0) - Environment variable management
- `cors` (^2.8.0) - CORS middleware
- `helmet` (^7.1.0) - Security headers
- `ioredis` (^5.3.0) - Redis client for caching and session management

**API Documentation:**
- `swagger-ui-express` (^5.0.0) - Swagger UI for API documentation
- `swagger-jsdoc` (^6.2.0) - Generate OpenAPI spec from JSDoc comments

**Testing:**
- `vitest` (^1.0.0) - Unit test framework
- `fast-check` (^3.15.0) - Property-based testing
- `supertest` (^6.3.0) - HTTP assertion library

### Development Tools

- `vite` (^5.0.0) - Frontend build tool
- `tsx` (^4.7.0) - TypeScript execution for backend
- `eslint` (^8.55.0) - Linting
- `prettier` (^3.1.0) - Code formatting
- `concurrently` (^8.2.0) - Run multiple commands

## Implementation Notes

### Web Speech API Considerations

**Browser Support:**
- Chrome/Edge: Full support for both TTS and STT with high quality
- Firefox: TTS supported, STT limited
- Safari: TTS supported, STT requires user gesture
- Mobile browsers: Varying support, test thoroughly

**Quality Considerations:**
- Chrome uses Google's cloud-based engines (high quality)
- Firefox and Safari use local engines (variable quality, often robotic)
- Quality differences can significantly impact learning experience

**Cloud Fallback Strategy:**
- Implement quality detection for Web Speech API
- Fallback to cloud services (Google Cloud TTS/STT, AWS Polly, Azure Speech) when:
  - Browser API is unavailable
  - Voice quality is below acceptable threshold
  - Language support is insufficient
- Consider cost implications of cloud services
- Implement caching to minimize API calls

**Audio Caching Strategy:**
- Generate hash of text + language code for cache key
- Store generated audio files in S3 or compatible storage
- Save audio URL and metadata in cached_audio table
- Check cache before generating new audio
- Track access count and last accessed time for cache eviction
- Implement TTL-based cache cleanup (e.g., remove audio not accessed in 90 days)
- Pre-generate audio for common phrases and lesson content
- Use CDN for audio file delivery

**Best Practices:**
- Always check for API availability before use
- Provide clear feedback when features are unavailable
- Implement fallback UI for unsupported browsers
- Handle permission requests gracefully
- Cache synthesized speech when possible
- Monitor API usage and costs for cloud services

### Gamification and SRS Implementation

**Spaced Repetition Algorithm:**
- Use SM-2 algorithm (SuperMemo 2) or Leitner system
- Track ease factor for each word (default 2.5)
- Calculate next review interval based on performance:
  - Perfect recall: interval × ease factor
  - Partial recall: interval × 0.6
  - Failed recall: reset to 1 day
- Adjust ease factor based on performance:
  - Increase for consistent success
  - Decrease for failures

**Streak Tracking:**
- Use server-side date comparison to prevent client-side manipulation
- Consider timezone handling for global users
- Implement streak freeze or recovery features for user retention
- Send notifications for streak maintenance

**XP and Achievement System:**
- Define clear XP values for different activities:
  - Exercise completion: 10-50 XP based on difficulty
  - Perfect pronunciation: bonus 20 XP
  - Daily goal completion: 100 XP
  - Streak milestones: 50-500 XP
- Achievement categories:
  - Streak achievements (7, 30, 100, 365 days)
  - Lesson completion (first lesson, 10 lessons, etc.)
  - Perfect scores (5, 25, 100 perfect exercises)
  - Language milestones (100, 500, 1000 words learned)

**Motivation Best Practices:**
- Balance challenge and achievability
- Provide immediate feedback
- Celebrate small wins
- Use progress visualization
- Implement social features (optional: leaderboards, friend challenges)

### Accessibility Implementation

**WCAG 2.1 Level AA Compliance:**

**Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Implement logical tab order
- Provide visible focus indicators (outline, highlight)
- Support standard keyboard shortcuts (Enter, Space, Escape, Arrow keys)
- Ensure no keyboard traps

**Screen Reader Support:**
- Use semantic HTML elements (button, nav, main, article)
- Provide ARIA labels for all interactive elements
- Use ARIA live regions for dynamic content updates
- Announce state changes (loading, error, success)
- Provide alt-text for all images (required in content management)

**Visual Accessibility:**
- Maintain 4.5:1 contrast ratio for normal text
- Maintain 3:1 contrast ratio for large text (18pt+)
- Support browser zoom up to 200%
- Avoid color as the only means of conveying information
- Provide visual indicators for audio events

**Audio Accessibility:**
- Provide visual feedback for all audio events
- Display waveform or animation during TTS playback
- Show visual confirmation for STT recognition
- Offer text alternatives for audio content

**Testing Tools:**
- Use axe-core for automated accessibility testing
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Use keyboard-only navigation for testing
- Check color contrast with automated tools
- Conduct user testing with people with disabilities

### Performance Considerations

**Image Optimization:**
- Resize images on upload to standard dimensions
- Generate multiple sizes for responsive images
- Use WebP format when supported
- Implement lazy loading for image lists

**Caching Strategy:**
- Cache TTS audio in browser storage
- Use React Query for API response caching
- Implement service worker for offline support
- Cache static assets aggressively
- Use Redis for server-side caching:
  - User sessions and JWT tokens
  - Daily review queues (pre-computed)
  - Frequently accessed lesson data
  - SRS calculation results
  - Leaderboard data (if implemented)

**Database Optimization:**
- Index foreign keys and frequently queried columns
- Use connection pooling
- Implement pagination for large result sets
- Consider read replicas for scaling

### Security Considerations

**Authentication:**
- Use HTTP-only cookies for JWT tokens
- Implement CSRF protection
- Use secure password hashing (bcrypt with appropriate rounds)
- Implement rate limiting on authentication endpoints

**File Upload:**
- Validate file types and sizes on both client and server
- Scan uploaded files for malware
- Store files outside web root
- Use signed URLs for file access

**API Security:**
- Implement input validation on all endpoints
- Use parameterized queries to prevent SQL injection
- Sanitize user-generated content
- Implement proper CORS configuration
- Use HTTPS in production

### Deployment Considerations

**Frontend:**
- Build optimized production bundle
- Configure CDN for static assets
- Implement proper error boundaries
- Set up monitoring and error tracking

**Backend:**
- Use environment variables for configuration
- Implement health check endpoints
- Set up logging and monitoring
- Use process manager (PM2) for Node.js
- Configure database connection pooling

**Database:**
- Regular backups
- Migration strategy for schema changes
- Monitoring for performance issues
- Proper indexing strategy
