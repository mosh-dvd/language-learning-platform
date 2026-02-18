# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize monorepo with frontend and backend workspaces
  - Configure TypeScript for both frontend and backend
  - Set up Vite for frontend build
  - Configure ESLint and Prettier
  - Set up testing frameworks (Vitest, fast-check)
  - Create basic folder structure for components, services, and utilities
  - _Requirements: 10.1, 10.2_

- [x] 2. Set up database and core data models
  - [x] 2.1 Create PostgreSQL database schema
    - Write migration scripts for all tables (users, images, image_texts, lessons, exercises, user_progress, pronunciation_scores, user_streaks, user_xp, achievements, user_achievements, weak_words, password_reset_tokens, cached_audio)
    - Add indexes on foreign keys and frequently queried columns
    - Set up database connection pooling
    - _Requirements: 1.2, 2.1, 7.1, 9.1, 11.1, 12.1, 13.1_
  
  - [ ] 2.2 Write property test for unique identifier generation
    - **Property 2: Unique identifier generation**
    - **Validates: Requirements 1.2, 7.1**
  
  - [x] 2.3 Create TypeScript data models and validation schemas
    - Define Zod schemas for all data models
    - Create TypeScript interfaces matching database schema
    - Implement validation functions
    - _Requirements: 2.4, 6.2_
  
  - [x] 2.4 Write property test for text validation
    - **Property 7: Text validation**
    - **Validates: Requirements 2.4**

- [x] 3. Implement image upload and management service
  - [x] 3.1 Create image storage service
    - Implement file upload handling with Multer
    - Add file format and size validation
    - Require alt-text for accessibility
    - Set up local file storage or S3-compatible storage
    - Generate unique identifiers for uploaded images
    - _Requirements: 1.1, 1.2, 1.5, 15.2_
  
  - [ ] 3.2 Write property test for image format validation
    - **Property 1: Image format validation**
    - **Validates: Requirements 1.1, 1.5**
  
  - [x] 3.3 Implement image CRUD operations
    - Create API endpoints for upload, retrieve, list, and delete
    - Implement database operations for image metadata
    - Add error handling for storage failures
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [x] 3.4 Write property test for image retrieval completeness
    - **Property 3: Image retrieval completeness**
    - **Validates: Requirements 1.3**
  
  - [x] 3.5 Write property test for referential integrity on deletion
    - **Property 4: Referential integrity on deletion**
    - **Validates: Requirements 1.4**
  
  - [x] 3.6 Write property test for alt-text requirement
    - **Property 42: Alt-text requirement**
    - **Validates: Requirements 15.2**

- [x] 4. Implement multi-language text management
  - [x] 4.1 Create image text service
    - Implement API endpoints for adding/updating text to images
    - Store text with language codes
    - Implement version history tracking
    - Add hint functionality (optional translation display)
    - _Requirements: 2.1, 2.2, 2.3, 2.6_
  
  - [x] 4.2 Write property test for multi-language text independence
    - **Property 5: Multi-language text independence**
    - **Validates: Requirements 2.2**
  
  - [x] 4.3 Write property test for version history preservation
    - **Property 6: Version history preservation**
    - **Validates: Requirements 2.3**
  
  - [x] 4.4 Implement text retrieval by language
    - Create endpoint to get text for specific language
    - Add filtering logic for language-specific queries
    - _Requirements: 2.5_
  
  - [x] 4.5 Write property test for language-specific text display
    - **Property 8: Language-specific text display**
    - **Validates: Requirements 2.5**

- [x] 5. Implement lesson and exercise management
  - [x] 5.1 Create lesson service
    - Implement CRUD operations for lessons
    - Add lesson metadata management
    - Implement publish/unpublish functionality
    - _Requirements: 7.1, 7.5_
  
  - [x] 5.2 Create exercise service
    - Implement exercise creation with image associations
    - Support multiple exercise types (image_text, matching_pairs, fill_in_blank, listening_comprehension)
    - Define and validate metadata structure for each exercise type
    - Add exercise ordering logic
    - Implement reordering functionality
    - Validate exercise has required content for its type
    - _Requirements: 7.2, 7.3, 7.4, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  
  - [x] 5.3 Write property test for exercise ordering
    - **Property 19: Exercise ordering**
    - **Validates: Requirements 7.2, 7.3**
  
  - [x] 5.4 Write property test for exercise validation
    - **Property 20: Exercise validation**
    - **Validates: Requirements 7.4**
  
  - [x] 5.5 Write property test for lesson visibility by language
    - **Property 21: Lesson visibility by language**
    - **Validates: Requirements 7.5**
  
  - [x] 5.6 Write property test for exercise type support
    - **Property 40: Exercise type support**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**
  
  - [x] 5.7 Write property test for exercise content validation
    - **Property 41: Exercise content validation**
    - **Validates: Requirements 14.6**

- [x] 6. Implement user authentication and session management
  - [x] 6.1 Create authentication service
    - Implement user registration with email/password and password hashing
    - Implement OAuth authentication (Google, Facebook) using Passport
    - Create login endpoint with JWT token generation
    - Add middleware for JWT validation
    - Implement session management
    - Add password reset functionality with email tokens
    - Implement profile management (name, avatar updates)
    - Add logout with token invalidation
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [x] 6.2 Write property test for registration validation
    - **Property 24: Registration validation**
    - **Validates: Requirements 11.1**
  
  - [x] 6.3 Write property test for OAuth token processing
    - **Property 25: OAuth token processing**
    - **Validates: Requirements 11.2**
  
  - [x] 6.4 Write property test for password reset token lifecycle
    - **Property 26: Password reset token lifecycle**
    - **Validates: Requirements 11.3**
  
  - [x] 6.5 Write property test for profile update persistence
    - **Property 27: Profile update persistence**
    - **Validates: Requirements 11.4**
  
  - [x] 6.6 Write property test for JWT token validation
    - **Property 28: JWT token validation**
    - **Validates: Requirements 11.5**
  
  - [x] 6.7 Write property test for token invalidation on logout
    - **Property 29: Token invalidation on logout**
    - **Validates: Requirements 11.6**
  
  - [x] 6.8 Implement language preference management
    - Create endpoint for language selection
    - Validate language codes against supported languages
    - Store preferences in user session
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 6.9 Write property test for language validation
    - **Property 18: Language validation**
    - **Validates: Requirements 6.2**

- [x] 7. Implement Spaced Repetition System (SRS)
  - [x] 7.1 Create SRS service
    - Implement success rate tracking for words/phrases
    - Implement weak word identification (< 70% success rate or repeated errors)
    - Implement SM-2 or Leitner algorithm for review scheduling
    - Create daily review generation combining new content and weak words
    - Implement word graduation logic (remove from queue after successful reviews)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [x] 7.2 Write property test for success rate tracking
    - **Property 30: Success rate tracking**
    - **Validates: Requirements 12.1**
  
  - [x] 7.3 Write property test for weak word identification
    - **Property 31: Weak word identification**
    - **Validates: Requirements 12.2, 12.3**
  
  - [x] 7.4 Write property test for daily review composition
    - **Property 32: Daily review composition**
    - **Validates: Requirements 12.4**
  
  - [x] 7.5 Write property test for spaced repetition intervals
    - **Property 33: Spaced repetition intervals**
    - **Validates: Requirements 12.5**
  
  - [x] 7.6 Write property test for word graduation
    - **Property 34: Word graduation**
    - **Validates: Requirements 12.6**

- [ ] 8. Implement gamification system
  - [x] 8.1 Create gamification service
    - Implement daily streak tracking (increment for consecutive days, reset on miss)
    - Track longest streak
    - Implement XP award system based on difficulty and performance
    - Create achievement system with criteria checking
    - Implement daily progress tracking towards goals
    - Award special achievements for perfect lesson completion
    - Maintain achievement history
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  
  - [x ] 8.2 Write property test for streak calculation
    - **Property 35: Streak calculation**
    - **Validates: Requirements 13.1, 13.2, 13.3**
  
  - [x] 8.3 Write property test for XP award calculation
    - **Property 36: XP award calculation**
    - **Validates: Requirements 13.4**
  
  - [x] 8.4 Write property test for daily progress calculation
    - **Property 37: Daily progress calculation**
    - **Validates: Requirements 13.5**
  
  - [x] 8.5 Write property test for achievement triggering
    - **Property 38: Achievement triggering**
    - **Validates: Requirements 13.6**
  
  - [x] 8.6 Write property test for achievement persistence
    - **Property 39: Achievement persistence**
    - **Validates: Requirements 13.7**

- [x] 9. Implement audio caching and cloud TTS/STT fallback
  - [x] 9.1 Create audio caching service
    - Generate hash for text + language code
    - Store generated audio in S3 or compatible storage
    - Save audio URL and metadata in cached_audio table
    - Implement cache lookup before generation
    - Track access count and last accessed time
    - Implement TTL-based cache cleanup
    - _Requirements: 3.5, 10.6_
  
  - [x] 9.2 Implement cloud TTS/STT fallback
    - Detect Web Speech API quality
    - Integrate Google Cloud TTS/STT or AWS Polly as fallback
    - Implement provider selection logic
    - Handle API errors and rate limiting
    - _Requirements: 10.6_

- [ ] 10. Implement Redis caching layer
  - [x] 10.1 Set up Redis connection
    - Configure Redis client with connection pooling
    - Implement error handling and reconnection logic
    - _Requirements: 9.5_
  
  - [x] 10.2 Implement caching for performance
    - Cache user sessions and JWT tokens
    - Cache daily review queues (pre-computed)
    - Cache frequently accessed lesson data
    - Cache SRS calculation results
    - Implement cache invalidation strategies
    - _Requirements: 9.5_

- [x] 11. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement progress tracking service
  - [x] 12.1 Create progress tracking endpoints
    - Implement exercise completion recording
    - Add pronunciation score storage
    - Create progress retrieval endpoints
    - Implement progress synchronization logic
    - _Requirements: 5.4, 9.1, 9.2, 9.3, 9.4_
  
  - [x] 12.2 Write property test for progress persistence
    - **Property 17: Progress persistence**
    - **Validates: Requirements 5.5, 9.1**
  
  - [x] 12.3 Write property test for progress synchronization
    - **Property 22: Progress synchronization**
    - **Validates: Requirements 9.4**

- [x] 13. Implement frontend TTS service
  - [x] 13.1 Create TTS service wrapper
    - Wrap Web Speech API SpeechSynthesis
    - Implement browser support detection
    - Add voice selection by language
    - Implement audio caching mechanism
    - Handle TTS errors gracefully
    - _Requirements: 3.1, 3.2, 3.5, 10.1, 10.3, 10.4_
  
  - [x] 13.2 Write property test for TTS audio generation
    - **Property 9: TTS audio generation**
    - **Validates: Requirements 3.1**
  
  - [x] 13.3 Write property test for TTS language configuration
    - **Property 10: TTS language configuration**
    - **Validates: Requirements 3.2**
  
  - [x] 13.4 Write property test for audio caching
    - **Property 12: Audio caching**
    - **Validates: Requirements 3.5**
  
  - [x] 13.5 Write property test for speech API error handling
    - **Property 23: Error handling for speech APIs**
    - **Validates: Requirements 10.4**

- [-] 14. Implement frontend STT service
  - [x] 14.1 Create STT service wrapper
    - Wrap Web Speech API SpeechRecognition
    - Implement browser support detection
    - Handle microphone permission requests
    - Add language configuration
    - Implement error handling
    - _Requirements: 4.1, 4.2, 10.2, 10.3, 10.4_
  
  - [x] 14.2 Create pronunciation validator
    - Implement text comparison algorithm (Levenshtein distance)
    - Create score calculation function (0-100 scale)
    - Add text normalization utilities
    - _Requirements: 4.3, 4.4_
  
  - [x] 14.3 Write property test for pronunciation score calculation
    - **Property 13: Pronunciation score calculation**
    - **Validates: Requirements 4.4**

- [x] 15. Implement core UI components
  - [x] 15.1 Create ImageCard component
    - Display image with text overlay
    - Add audio playback button
    - Implement visual feedback for audio playing state
    - Provide visual indicators for audio (accessibility)
    - Handle loading and error states
    - _Requirements: 3.3, 3.4, 15.6_
  
  - [x] 15.2 Write property test for audio playback state transitions
    - **Property 11: Audio playback state transitions**
    - **Validates: Requirements 3.3, 3.4**
  
  - [x] 15.3 Write property test for audio visual feedback
    - **Property 45: Audio visual feedback**
    - **Validates: Requirements 15.6**
  
  - [x] 15.4 Create SpeechPractice component
    - Add microphone button with permission handling
    - Display recognized text
    - Show pronunciation score with visual feedback
    - Implement retry functionality
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6_
  
  - [x] 15.5 Write property test for score-based feedback
    - **Property 14: Score-based feedback**
    - **Validates: Requirements 4.5, 4.6**
  
  - [x] 15.6 Create LanguageSelector component
    - Display language selection interface
    - Validate selected languages
    - Store preferences on selection
    - Show interface in native language
    - _Requirements: 6.1, 6.4, 6.5_
  
  - [x] 15.7 Create StreakDisplay component
    - Display current streak and longest streak
    - Show daily goal progress
    - Display XP earnedRedis is not installed. Let me check if there's a Docker setup or if we need to install it:


    - _Requirements: 13.1, 13.4, 13.5_
  
  - [x] 15.8 Create AchievementBadge component
    - Display achievement icon and name
    - Show earned/unearned state
    - Display earned date
    - _Requirements: 13.6, 13.7_
  
  - [x] 15.9 Create exercise variety components
    - Implement MatchingPairs component
    - Implement FillInBlank component
    - Implement ListeningComprehension component
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 16. Implement learning view and navigation
  - [x] 16.1 Create LearningView component
    - Display current exercise based on type
    - Implement navigation between exercises
    - Track exercise completion
    - Handle lesson completion
    - Show progress indicator
    - Integrate SRS review exercises
    - _Requirements: 5.1, 5.2, 5.3, 12.4_
  
  - [x] 16.2 Write property test for lesson navigation
    - **Property 15: Lesson navigation**
    - **Validates: Requirements 5.1, 5.2**
  
  - [x] 16.3 Write property test for lesson completion tracking
    - **Property 16: Lesson completion tracking**
    - **Validates: Requirements 5.3**
  
  - [x] 16.4 Implement progress restoration
    - Load user progress on app start
    - Resume from last accessed lesson/exercise
    - Handle missing or corrupted progress data
    - _Requirements: 5.5_

- [x] 17. Implement authentication UI
  - [x] 17.1 Create AuthenticationForm component
    - Implement registration form with validation
    - Implement login form
    - Add OAuth buttons (Google, Facebook)
    - Handle authentication errors
    - _Requirements: 11.1, 11.2_
  
  - [x] 17.2 Create PasswordReset component
    - Implement password reset request form
    - Implement password reset confirmation form
    - Handle token validation
    - _Requirements: 11.3_
  
  - [x] 17.3 Create ProfileManagement component
    - Allow name and avatar updates
    - Display current profile information
    - Handle update errors
    - _Requirements: 11.4_

- [x] 18. Implement content management UI
  - [x] 18.1 Create ImageUpload component
    - Implement drag-and-drop file upload
    - Require alt-text input for accessibility
    - Show upload progress
    - Display validation errors
    - Show uploaded image preview
    - _Requirements: 1.1, 1.2, 15.2_
  
  - [x] 18.2 Create ImageTextEditor component
    - Allow adding/editing text in multiple languages
    - Show version history
    - Validate text input
    - Add hint toggle option
    - _Requirements: 2.1, 2.3, 2.4, 2.6_
  
  - [x] 18.3 Create LessonEditor component
    - Allow creating and editing lessons
    - Support all exercise types
    - Implement exercise management (add, remove, reorder)
    - Add publish/unpublish controls
    - Validate lesson structure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.5, 14.6_

- [x] 19. Implement accessibility features
  - [x] 19.1 Add keyboard navigation
    - Implement tab order for all interactive elements
    - Add visible focus indicators
    - Support keyboard shortcuts
    - Add ARIA labels and roles
    - _Requirements: 15.3, 15.5_
  
  - [x] 19.2 Write property test for keyboard navigation completeness
    - **Property 43: Keyboard navigation completeness**
    - **Validates: Requirements 15.3, 15.5**
  
  - [x] 19.3 Ensure color contrast compliance
    - Audit all text elements for contrast ratios
    - Fix any contrast issues
    - Test with automated tools
    - _Requirements: 15.4_
  
  - [x] 19.4 Write property test for color contrast compliance
    - **Property 44: Color contrast compliance**
    - **Validates: Requirements 15.4**

- [x] 20. Implement responsive design and device support
  - [x] 20.1 Add responsive layouts
    - Implement mobile-first responsive design with Tailwind
    - Create breakpoint-specific layouts
    - Test on various screen sizes
    - _Requirements: 8.1, 8.2_
  
  - [x] 20.2 Add input handling for different devices
    - Implement touch event handlers for mobile
    - Add keyboard shortcuts for desktop
    - Ensure mouse interactions work properly
    - _Requirements: 8.3, 8.4_
  
  - [x] 20.3 Write property tests for input handling
    - Test touch interactions on mobile
    - Test keyboard/mouse interactions on desktop
    - _Requirements: 8.3, 8.4_

- [x] 21. Implement error handling and network resilience
  - [x] 21.1 Add global error boundaries
    - Create React error boundaries for component errors
    - Implement fallback UI for errors
    - Add error logging
    - _Requirements: 10.4_
  
  - [x] 21.2 Implement network error handling
    - Add retry logic with exponential backoff
    - Show appropriate error messages
    - Implement graceful degradation for poor connectivity
    - Cache content for offline access
    - _Requirements: 8.5_
  
  - [x] 21.3 Add API error handling
    - Handle validation errors from backend
    - Display user-friendly error messages
    - Implement proper HTTP status code handling
    - _Requirements: 10.4_

- [x] 22. Implement logging and monitoring
  - [x] 22.1 Add backend logging
    - Log TTS/STT usage
    - Log API requests and errors
    - Implement structured logging
    - _Requirements: 10.5_
  
  - [x] 22.2 Add frontend error tracking
    - Log client-side errors
    - Track speech API usage and errors
    - Implement performance monitoring
    - _Requirements: 10.5_

- [x] 23. Set up API integration and state management
  - [x] 23.1 Configure React Query
    - Set up query client with caching configuration
    - Create API hooks for all endpoints
    - Implement optimistic updates
    - Add error handling and retry logic
    - _Requirements: 9.5_
  
  - [x] 23.2 Create API client
    - Set up Axios with interceptors
    - Add authentication token handling
    - Implement request/response logging
    - _Requirements: All API-related requirements_

- [x] 24. Add API documentation
  - [x] 24.1 Set up Swagger/OpenAPI
    - Configure swagger-ui-express
    - Add JSDoc comments to API endpoints
    - Generate OpenAPI specification
    - Test API documentation interface
    - _Requirements: All API requirements_

- [-] 25. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 26. Write integration tests
  - Test complete user flows (registration, lesson completion, progress tracking)
  - Test SRS and gamification workflows
  - Test content management workflows
  - Test authentication and authorization
  - Test file upload and retrieval
  - _Requirements: All_

- [ ] 27. Write E2E tests with Playwright
  - Test user registration and login flow
  - Test OAuth authentication
  - Test language selection
  - Test lesson navigation and completion
  - Test all exercise types
  - Test TTS audio playback
  - Test STT pronunciation practice
  - Test streak and XP tracking
  - Test achievement earning
  - Test content management interface
  - Test accessibility features
  - Test responsive behavior on different devices
  - _Requirements: All_

- [ ] 28. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

