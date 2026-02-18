# E2E Test Checklist

Use this checklist to verify all test scenarios are covered and working.

## Authentication Flow ✓

### User Registration
- [ ] Register with valid email and password
- [ ] Validate email format
- [ ] Validate password strength
- [ ] Prevent duplicate email registration
- [ ] Redirect to dashboard after registration

### Login
- [ ] Login with valid credentials
- [ ] Show error for invalid credentials
- [ ] Show error for non-existent user
- [ ] Redirect to dashboard after login

### OAuth
- [ ] Display Google OAuth button
- [ ] Display Facebook OAuth button
- [ ] Initiate OAuth flow on click

### Password Reset
- [ ] Navigate to password reset page
- [ ] Request password reset with valid email
- [ ] Validate email format
- [ ] Show confirmation message

### Profile Management
- [ ] Navigate to profile page
- [ ] Display current profile information
- [ ] Update profile name
- [ ] Show success message after update

### Logout
- [ ] Logout successfully
- [ ] Clear session/cookies
- [ ] Redirect to login page

## Language Selection ✓

- [ ] Display language selector on first login
- [ ] Select native language
- [ ] Select target language
- [ ] Validate languages are different
- [ ] Save language preferences
- [ ] Persist preferences across sessions
- [ ] Display interface in native language
- [ ] Change language from settings

## Lesson Navigation ✓

- [ ] Display available lessons
- [ ] Start a lesson
- [ ] Display first exercise
- [ ] Navigate to next exercise
- [ ] Navigate to previous exercise
- [ ] Show progress indicator
- [ ] Mark lesson as complete
- [ ] Track completion status
- [ ] Resume from last position
- [ ] Filter lessons by language
- [ ] Display lesson metadata
- [ ] Handle empty lesson list

## Exercise Types ✓

### Image-Text Exercise
- [ ] Display image with text
- [ ] Show text in target language
- [ ] Display hint button
- [ ] Show native language translation on hint
- [ ] Hide hint when clicked again

### Matching Pairs
- [ ] Display matching interface
- [ ] Allow selecting items
- [ ] Validate correct matches
- [ ] Show feedback for incorrect matches
- [ ] Complete when all pairs matched

### Fill in the Blank
- [ ] Display sentence with blank
- [ ] Display word options
- [ ] Allow selecting word
- [ ] Validate correct answer
- [ ] Show feedback for incorrect answer
- [ ] Allow retry

### Listening Comprehension
- [ ] Display listening interface
- [ ] Display image options
- [ ] Play audio on button click
- [ ] Show playing state
- [ ] Allow selecting image
- [ ] Validate correct selection
- [ ] Show feedback for incorrect selection
- [ ] Allow replaying audio

## Speech Features ✓

### TTS Audio Playback
- [ ] Display audio playback button
- [ ] Play audio on click
- [ ] Show visual feedback during playback
- [ ] Return to ready state after completion
- [ ] Use correct language for TTS
- [ ] Cache audio for repeated playback
- [ ] Handle TTS errors gracefully
- [ ] Provide visual indicators for accessibility

### STT Pronunciation Practice
- [ ] Display microphone button
- [ ] Request microphone permission
- [ ] Show recording state
- [ ] Display recognized text
- [ ] Calculate pronunciation score
- [ ] Show positive feedback for high scores
- [ ] Show retry option for low scores
- [ ] Allow retrying pronunciation
- [ ] Handle STT errors gracefully
- [ ] Display expected text
- [ ] Use correct language for STT

## Gamification ✓

### Streak Tracking
- [ ] Display current streak
- [ ] Display longest streak
- [ ] Increment streak after daily activity
- [ ] Display streak icon
- [ ] Show milestone celebrations

### XP System
- [ ] Display current XP
- [ ] Award XP for completing exercises
- [ ] Show XP earned notification
- [ ] Update XP display

### Daily Progress
- [ ] Display daily progress indicator
- [ ] Show progress towards goal
- [ ] Update progress after exercise completion

### Achievements
- [ ] Display achievements section
- [ ] Show earned achievements
- [ ] Show unearned achievements
- [ ] Display achievement details
- [ ] Show earned date
- [ ] Award achievement for perfect completion
- [ ] Display achievement icon
- [ ] Show achievement progress
- [ ] Filter achievements by status
- [ ] Display achievement notifications
- [ ] Maintain achievement history

## Content Management ✓

### Image Upload
- [ ] Navigate to image upload page
- [ ] Display upload form
- [ ] Upload image with alt text
- [ ] Validate image format
- [ ] Require alt text
- [ ] Show upload progress
- [ ] Display image preview
- [ ] Support drag and drop

### Image Text Editor
- [ ] Navigate to text editor
- [ ] Add text in multiple languages
- [ ] Display version history
- [ ] Validate text input
- [ ] Add hint/translation
- [ ] Show all language variants

### Lesson Editor
- [ ] Navigate to lesson editor
- [ ] Create new lesson
- [ ] Add exercises to lesson
- [ ] Reorder exercises
- [ ] Remove exercise from lesson
- [ ] Publish lesson
- [ ] Unpublish lesson
- [ ] Validate lesson structure
- [ ] Support all exercise types
- [ ] Validate exercise content

### Image Management
- [ ] List all uploaded images
- [ ] Delete image
- [ ] Display image metadata

## Accessibility ✓

### Keyboard Navigation
- [ ] Navigate with Tab key
- [ ] Visible focus indicators
- [ ] Navigate lesson with keyboard
- [ ] Use keyboard shortcuts for exercises
- [ ] Activate buttons with Enter/Space
- [ ] Close modals with Escape
- [ ] Trap focus within modals
- [ ] Logical tab order

### ARIA Labels and Roles
- [ ] ARIA labels on interactive elements
- [ ] Proper heading hierarchy
- [ ] ARIA roles on custom components
- [ ] Alt text on images
- [ ] ARIA live regions for dynamic content
- [ ] Proper form labels
- [ ] Announce errors to screen readers

### Color Contrast
- [ ] Sufficient contrast for text
- [ ] Maintain contrast in dark mode
- [ ] Visible focus indicators with contrast

### Visual Indicators
- [ ] Visual feedback for audio playback
- [ ] Show loading states
- [ ] Indicate required form fields
- [ ] Show error states clearly

### Screen Reader Support
- [ ] Descriptive page titles
- [ ] Skip navigation link
- [ ] Announce page changes
- [ ] Descriptive link text

## Responsive Design ✓

### Desktop Layout (1920x1080)
- [ ] Display desktop navigation
- [ ] Show sidebar
- [ ] Multi-column layout
- [ ] Show all navigation items

### Tablet Layout (iPad Pro)
- [ ] Adapt layout for tablet
- [ ] Show tablet-optimized navigation
- [ ] Appropriate column count

### Mobile Layout (iPhone 12)
- [ ] Display mobile navigation
- [ ] Single column layout
- [ ] Hide sidebar
- [ ] Open mobile menu on hamburger click
- [ ] Close menu on item selection
- [ ] Touch-friendly button sizes
- [ ] Stack form elements vertically

### Responsive Images
- [ ] Load appropriate image sizes
- [ ] No viewport overflow

### Orientation Changes
- [ ] Adapt to landscape
- [ ] Adapt to portrait

### Touch Interactions
- [ ] Support touch tap
- [ ] Support swipe gestures
- [ ] No hover-only interactions

### Viewport Breakpoints
- [ ] Mobile Small (320x568)
- [ ] Mobile (375x667)
- [ ] Mobile Large (414x896)
- [ ] Tablet (768x1024)
- [ ] Desktop Small (1024x768)
- [ ] Desktop (1440x900)
- [ ] Desktop Large (1920x1080)

### Text Scaling
- [ ] Handle increased text size
- [ ] No horizontal overflow

## Test Execution Status

- [ ] All tests written
- [ ] All tests passing
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] Mobile device tested (iOS, Android)
- [ ] Accessibility validated
- [ ] Performance acceptable
- [ ] Error handling verified
- [ ] CI/CD integrated

## Notes

Use this checklist to:
1. Verify test coverage
2. Manual testing reference
3. QA validation
4. Feature acceptance
5. Release readiness

Mark items as complete when:
- Test is written and passing
- Manual verification completed
- Feature is working as expected
