# Requirements Document

## Introduction

פלטפורמה ללימוד שפות אינטראקטיבית בסגנון Rosetta Stone המאפשרת למשתמשים ללמוד שפות חדשות באמצעות שילוב של תמונות, טקסט, קריינות (TTS) ובדיקת דיבור (STT). הפלטפורמה מספקת חוויית למידה אימרסיבית המבוססת על קישור ויזואלי בין תמונות למילים ומשפטים בשפת היעד.

**הערה פדגוגית חשובה:** הפלטפורמה מיושמת בגישת "Immersion" (הטמעה מלאה) בסגנון Rosetta Stone - כלומר, תרגומים לשפת האם מוצגים רק כ-"Hint" אופציונלי כאשר המשתמש נתקע, ולא כחלק קבוע מהממשק הלימודי.

## Glossary

- **Platform**: The language learning application system
- **User**: A person using the platform to learn a new language
- **Lesson**: A structured learning unit containing multiple exercises
- **Exercise**: A single learning activity combining images, text, and audio
- **TTS (Text-to-Speech)**: Technology that converts written text to spoken audio
- **STT (Speech-to-Text)**: Technology that converts spoken audio to written text
- **Target Language**: The language the User is learning
- **Native Language**: The User's primary language
- **Image Card**: A visual element displaying an image with associated text
- **Pronunciation Score**: A numerical assessment of speech accuracy
- **Content Manager**: An administrator who creates and manages learning content
- **Audio Playback**: The action of playing synthesized or recorded speech
- **Speech Recognition**: The process of analyzing and validating User pronunciation
- **Hint**: An optional translation or clue in the User's Native Language
- **Spaced Repetition System (SRS)**: An algorithm that schedules review of learned material at increasing intervals
- **Weak Word**: A vocabulary item that the User has difficulty with based on performance metrics
- **Daily Streak**: The number of consecutive days a User has engaged with learning activities
- **XP (Experience Points)**: Points awarded for completing learning activities
- **Achievement**: A reward or badge earned for specific accomplishments
- **Exercise Type**: The format of a learning activity (e.g., matching, fill-in-blank, listening comprehension)

## Requirements

### Requirement 1

**User Story:** As a Content Manager, I want to upload and manage images for lessons, so that I can create visual learning materials for different languages.

#### Acceptance Criteria

1. WHEN a Content Manager uploads an image file, THE Platform SHALL validate the file format and size
2. WHEN an image is successfully uploaded, THE Platform SHALL store the image with a unique identifier
3. WHEN a Content Manager requests to view uploaded images, THE Platform SHALL display all images with their metadata
4. WHEN a Content Manager deletes an image, THE Platform SHALL remove the image and update all associated lessons
5. THE Platform SHALL support common image formats including JPEG, PNG, and WebP

### Requirement 2

**User Story:** As a Content Manager, I want to associate text labels with images in multiple languages, so that learners can see translations and learn vocabulary.

#### Acceptance Criteria

1. WHEN a Content Manager adds text to an image, THE Platform SHALL store the text with its associated language code
2. WHEN multiple translations exist for an image, THE Platform SHALL maintain all language variants independently
3. WHEN a Content Manager updates text for an image, THE Platform SHALL preserve the previous version history
4. THE Platform SHALL validate that text content is not empty and contains valid Unicode characters
5. WHEN displaying an image card, THE Platform SHALL show the text in the User's selected Target Language
6. WHERE a User requests a Hint, THE Platform SHALL display the Native Language translation temporarily without making it permanently visible

### Requirement 3

**User Story:** As a User, I want to hear correct pronunciation of words and phrases, so that I can learn proper speaking patterns in my target language.

#### Acceptance Criteria

1. WHEN a User clicks on a text label, THE Platform SHALL generate speech audio using TTS technology
2. WHEN generating speech, THE Platform SHALL use the correct language and accent settings for the Target Language
3. WHEN Audio Playback begins, THE Platform SHALL provide visual feedback indicating audio is playing
4. WHEN Audio Playback completes, THE Platform SHALL return the interface to its ready state
5. THE Platform SHALL cache generated audio to improve performance for repeated requests

### Requirement 4

**User Story:** As a User, I want to practice speaking and receive feedback on my pronunciation, so that I can improve my speaking skills.

#### Acceptance Criteria

1. WHEN a User initiates speech practice, THE Platform SHALL request microphone access from the browser
2. WHEN the User speaks into the microphone, THE Platform SHALL capture and process the audio using STT technology
3. WHEN speech recognition completes, THE Platform SHALL compare the recognized text with the expected text
4. WHEN comparison completes, THE Platform SHALL calculate and display a Pronunciation Score
5. IF the Pronunciation Score exceeds a threshold, THEN THE Platform SHALL provide positive feedback to the User
6. IF the Pronunciation Score falls below a threshold, THEN THE Platform SHALL allow the User to retry

### Requirement 5

**User Story:** As a User, I want to navigate through structured lessons with progressive difficulty, so that I can learn systematically.

#### Acceptance Criteria

1. WHEN a User starts a Lesson, THE Platform SHALL display the first Exercise
2. WHEN a User completes an Exercise successfully, THE Platform SHALL advance to the next Exercise
3. WHEN a User completes all Exercises in a Lesson, THE Platform SHALL mark the Lesson as complete
4. THE Platform SHALL track User progress across multiple Lessons
5. WHEN a User returns to the Platform, THE Platform SHALL resume from their last position

### Requirement 6

**User Story:** As a User, I want to select my native language and target language, so that the platform can customize my learning experience.

#### Acceptance Criteria

1. WHEN a User first accesses the Platform, THE Platform SHALL prompt for Native Language and Target Language selection
2. WHEN a User selects languages, THE Platform SHALL validate that both languages are supported
3. WHEN language selection is complete, THE Platform SHALL store the preferences for the User session
4. WHEN displaying content, THE Platform SHALL use the Target Language for learning materials
5. WHERE interface instructions are needed, THE Platform SHALL display them in the User's Native Language

### Requirement 7

**User Story:** As a Content Manager, I want to organize images and text into structured lessons, so that learners have a coherent learning path.

#### Acceptance Criteria

1. WHEN a Content Manager creates a Lesson, THE Platform SHALL assign a unique identifier and metadata
2. WHEN adding Exercises to a Lesson, THE Platform SHALL maintain the specified order
3. WHEN a Content Manager reorders Exercises, THE Platform SHALL update the sequence immediately
4. THE Platform SHALL validate that each Exercise contains at least one Image Card with text
5. WHEN a Lesson is published, THE Platform SHALL make it available to Users learning the associated Target Language

### Requirement 8

**User Story:** As a User, I want the platform to work smoothly across different devices, so that I can learn anywhere.

#### Acceptance Criteria

1. WHEN a User accesses the Platform from a mobile device, THE Platform SHALL display a responsive interface
2. WHEN a User accesses the Platform from a desktop browser, THE Platform SHALL optimize the layout for larger screens
3. THE Platform SHALL support touch interactions on mobile devices
4. THE Platform SHALL support keyboard and mouse interactions on desktop devices
5. WHEN network connectivity is poor, THE Platform SHALL provide appropriate feedback and graceful degradation

### Requirement 9

**User Story:** As a User, I want my learning progress to be saved automatically, so that I don't lose my achievements.

#### Acceptance Criteria

1. WHEN a User completes an Exercise, THE Platform SHALL persist the completion status immediately
2. WHEN a User achieves a Pronunciation Score, THE Platform SHALL store the score with timestamp
3. WHEN a User's session ends unexpectedly, THE Platform SHALL retain all progress up to the last saved state
4. THE Platform SHALL synchronize User progress across multiple devices for authenticated Users
5. WHEN retrieving progress data, THE Platform SHALL load the most recent state within two seconds

### Requirement 10

**User Story:** As a developer, I want the platform to use modern, well-supported libraries for TTS and STT, so that the system is maintainable and reliable.

#### Acceptance Criteria

1. THE Platform SHALL use the Web Speech API for TTS functionality in supported browsers
2. THE Platform SHALL use the Web Speech API for STT functionality in supported browsers
3. WHERE the Web Speech API is not available, THE Platform SHALL provide fallback options or clear messaging
4. THE Platform SHALL handle TTS and STT errors gracefully without crashing
5. THE Platform SHALL log TTS and STT usage for monitoring and debugging purposes
6. IF the browser's native Web Speech API quality is below a defined standard or unavailable, THEN THE Platform SHALL fallback to a cloud-based service to ensure consistent learning experience

### Requirement 11

**User Story:** As a User, I want to create an account and log in, so that I can access my progress from any device and secure my data.

#### Acceptance Criteria

1. THE Platform SHALL allow Users to register using email and password
2. THE Platform SHALL support OAuth authentication using Google and Facebook providers
3. WHEN a User forgets their password, THE Platform SHALL provide password reset functionality via email
4. WHEN a User is authenticated, THE Platform SHALL allow them to manage their profile including name and avatar
5. THE Platform SHALL secure User sessions using JWT tokens with appropriate expiration times
6. WHEN a User logs out, THE Platform SHALL invalidate the session token immediately

### Requirement 12

**User Story:** As a User, I want the system to prompt me to review words I struggle with, so that I can retain vocabulary long-term.

#### Acceptance Criteria

1. THE Platform SHALL track the User's success rate for specific words and phrases across Exercises
2. WHEN a User's Pronunciation Score for a word falls below 70% consistently, THE Platform SHALL mark it as a Weak Word
3. WHEN a User makes repeated errors on specific vocabulary, THE Platform SHALL identify those items as Weak Words
4. THE Platform SHALL generate a Daily Review Exercise that combines new content with Weak Words
5. THE Platform SHALL use a Spaced Repetition algorithm to schedule reviews at optimal intervals
6. WHEN a User successfully reviews a Weak Word multiple times, THE Platform SHALL graduate it from the review queue

### Requirement 13

**User Story:** As a User, I want to earn rewards and track streaks, so that I stay motivated to learn every day.

#### Acceptance Criteria

1. THE Platform SHALL track a Daily Streak counting consecutive days of learning activity
2. WHEN a User completes at least one Exercise in a day, THE Platform SHALL increment the Daily Streak
3. WHEN a User misses a day, THE Platform SHALL reset the Daily Streak to zero
4. THE Platform SHALL award XP for completing Exercises based on difficulty and performance
5. THE Platform SHALL display a visual progress indicator showing advancement towards a daily learning goal
6. WHEN a User completes a Lesson with perfect scores, THE Platform SHALL award a special Achievement badge
7. THE Platform SHALL maintain a history of earned Achievements for each User

### Requirement 14

**User Story:** As a User, I want to engage with different types of exercises, so that the learning process remains interesting.

#### Acceptance Criteria

1. THE Platform SHALL support Matching Pairs Exercises where Users match images to text or audio
2. THE Platform SHALL support Fill in the Blank Exercises where Users complete sentences with missing words
3. THE Platform SHALL support Listening Comprehension Exercises where Users select the correct image from multiple options after hearing audio
4. THE Platform SHALL support Image Selection Exercises where Users identify the correct image based on spoken or written prompts
5. WHEN a Content Manager creates an Exercise, THE Platform SHALL allow selection of the Exercise Type
6. THE Platform SHALL validate that each Exercise Type has the required content elements before allowing publication

### Requirement 15

**User Story:** As a User with disabilities, I want to navigate the platform using a keyboard or screen reader, so that I can learn effectively.

#### Acceptance Criteria

1. THE Platform SHALL comply with WCAG 2.1 Level AA accessibility standards
2. WHEN a Content Manager uploads an image, THE Platform SHALL require alt-text descriptions for accessibility
3. THE Platform SHALL support full keyboard navigation for all interactive elements including tab order and focus indicators
4. THE Platform SHALL maintain color contrast ratios of at least 4.5:1 for normal text and 3:1 for large text
5. THE Platform SHALL provide ARIA labels and roles for all interactive components to support screen readers
6. WHEN audio content plays, THE Platform SHALL provide visual indicators for Users who cannot hear
