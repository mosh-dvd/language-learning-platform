# E2E Tests

End-to-end tests for the Language Learning Platform using Playwright.

## Test Coverage

### Authentication (`auth.spec.ts`)
- User registration with email/password
- Login with existing credentials
- OAuth authentication (Google, Facebook)
- Password reset flow
- Profile management
- Logout functionality
- Validation and error handling

### Language Selection (`language-selection.spec.ts`)
- Native and target language selection
- Language preference persistence
- Interface language display
- Language validation

### Lesson Navigation (`lesson-navigation.spec.ts`)
- Lesson listing and filtering
- Starting and completing lessons
- Exercise navigation (forward/backward)
- Progress tracking
- Resume from last position
- Lesson completion status

### Exercise Types (`exercise-types.spec.ts`)
- Image-Text exercises with hints
- Matching Pairs exercises
- Fill in the Blank exercises
- Listening Comprehension exercises
- Exercise validation and feedback

### Speech Features (`speech-features.spec.ts`)
- TTS audio playback
- Visual feedback during playback
- Audio caching
- STT pronunciation practice
- Pronunciation scoring
- Microphone permission handling
- Error handling for speech APIs

### Gamification (`gamification.spec.ts`)
- Daily streak tracking
- XP earning and display
- Daily progress indicators
- Achievement earning
- Achievement display and history
- Milestone celebrations

### Content Management (`content-management.spec.ts`)
- Image upload with validation
- Alt-text requirements
- Multi-language text management
- Version history
- Lesson creation and editing
- Exercise management (add, remove, reorder)
- Publish/unpublish lessons

### Accessibility (`accessibility.spec.ts`)
- Keyboard navigation
- Focus indicators
- ARIA labels and roles
- Color contrast compliance
- Screen reader support
- Visual indicators for audio
- Form accessibility

### Responsive Design (`responsive.spec.ts`)
- Desktop layout (1920x1080)
- Tablet layout (iPad Pro)
- Mobile layout (iPhone 12)
- Touch interactions
- Viewport breakpoints
- Orientation changes
- Text scaling

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test auth.spec.ts
```

### Run tests on specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run tests on mobile devices
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

Each test file follows this structure:
- `test.describe()` - Groups related tests
- `test.beforeEach()` - Setup before each test (usually login)
- `test()` - Individual test cases
- `expect()` - Assertions

## Helper Functions

Common helper functions are available in `e2e/helpers.ts`:
- `login()` - Login with credentials
- `logout()` - Logout user
- `register()` - Register new user
- `navigateToLesson()` - Navigate to a lesson
- `completeExercise()` - Complete an exercise
- `completeLesson()` - Complete all exercises in a lesson
- `waitForAPIResponse()` - Wait for API call
- `mockAPIResponse()` - Mock API responses
- `isInViewport()` - Check if element is visible
- `getContrastRatio()` - Calculate color contrast
- `simulateSlowNetwork()` - Test with slow connection
- `simulateOffline()` - Test offline behavior

## Test Data

Test fixtures (images, files) should be placed in `e2e/fixtures/`.

## CI/CD Integration

Tests are configured to run in CI with:
- Retries on failure (2 retries)
- Single worker for stability
- HTML report generation
- Screenshots on failure
- Trace on first retry

## Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Wait for navigation** after actions that change pages
3. **Use role-based selectors** when possible (accessibility)
4. **Mock external services** to avoid flakiness
5. **Clean up test data** after tests
6. **Use helper functions** for common operations
7. **Test across browsers** and devices
8. **Check accessibility** in all tests

## Debugging

### Visual debugging
```bash
npm run test:e2e:ui
```

### Step through tests
```bash
npm run test:e2e:debug
```

### View traces
After a test failure, traces are saved. View them with:
```bash
npx playwright show-trace trace.zip
```

### Screenshots
Screenshots are automatically taken on failure and saved to `test-results/`.

## Requirements Coverage

These E2E tests validate all requirements from the specification:
- ✅ Requirement 1: Image upload and management
- ✅ Requirement 2: Multi-language text management
- ✅ Requirement 3: TTS audio playback
- ✅ Requirement 4: STT pronunciation practice
- ✅ Requirement 5: Lesson navigation
- ✅ Requirement 6: Language selection
- ✅ Requirement 7: Lesson organization
- ✅ Requirement 8: Responsive design
- ✅ Requirement 9: Progress tracking
- ✅ Requirement 10: Error handling
- ✅ Requirement 11: Authentication
- ✅ Requirement 12: Spaced Repetition System
- ✅ Requirement 13: Gamification
- ✅ Requirement 14: Exercise variety
- ✅ Requirement 15: Accessibility
