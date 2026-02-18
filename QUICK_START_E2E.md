# Quick Start Guide - E2E Tests

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

### Quick Test Run
```bash
# Run all E2E tests
npm run test:e2e
```

### Interactive Mode (Recommended for Development)
```bash
# Open Playwright UI for interactive testing
npm run test:e2e:ui
```

### Watch Tests Run
```bash
# Run tests in headed mode (see browser)
npm run test:e2e:headed
```

### Debug Specific Test
```bash
# Debug mode with step-through
npm run test:e2e:debug
```

## Running Specific Tests

### By File
```bash
npx playwright test auth.spec.ts
npx playwright test accessibility.spec.ts
```

### By Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### By Device
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### By Test Name
```bash
npx playwright test -g "should login"
npx playwright test -g "keyboard navigation"
```

## View Results

### HTML Report
```bash
npm run test:e2e:report
```

### View Traces (After Failure)
```bash
npx playwright show-trace trace.zip
```

## Test Structure

```
e2e/
├── auth.spec.ts              # Authentication tests
├── language-selection.spec.ts # Language selection tests
├── lesson-navigation.spec.ts  # Lesson navigation tests
├── exercise-types.spec.ts     # Exercise type tests
├── speech-features.spec.ts    # TTS/STT tests
├── gamification.spec.ts       # Streak/XP/Achievement tests
├── content-management.spec.ts # Admin/content tests
├── accessibility.spec.ts      # Accessibility tests
├── responsive.spec.ts         # Responsive design tests
├── helpers.ts                 # Test utilities
└── README.md                  # Detailed documentation
```

## Common Issues

### Tests Fail to Start
- Ensure backend is running: `npm run dev:backend`
- Ensure frontend is running: `npm run dev:frontend`
- Or let Playwright start them automatically (configured in playwright.config.ts)

### Browser Not Found
```bash
npx playwright install
```

### Port Already in Use
- Stop other instances of the app
- Or change ports in playwright.config.ts

## Tips

1. **Use UI Mode for Development**: `npm run test:e2e:ui`
2. **Run Single Test**: Click on test in UI mode
3. **Debug Failures**: Use trace viewer for failed tests
4. **Check Screenshots**: Failures automatically capture screenshots
5. **Update Selectors**: Use Playwright Inspector to find selectors

## Next Steps

1. Run tests: `npm run test:e2e:ui`
2. Review results
3. Fix any failures
4. Add to CI/CD pipeline

## Documentation

- Full documentation: `e2e/README.md`
- Test summary: `E2E_TEST_SUMMARY.md`
- Playwright docs: https://playwright.dev
