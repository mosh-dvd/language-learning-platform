# Speech-to-Text (STT) and Pronunciation Validation Services

This document describes the STT service and pronunciation validator implementations for the language learning platform.

## Overview

The platform provides two key services for speech-based learning:

1. **STT Service** - Wraps the Web Speech API SpeechRecognition for speech-to-text conversion
2. **Pronunciation Validator** - Compares recognized speech with expected text and calculates pronunciation scores

## STT Service

### Features

- Browser support detection for Web Speech API
- Microphone permission handling
- Language configuration
- Real-time and final result callbacks
- Comprehensive error handling
- Event-based architecture with callbacks

### Usage Example

```typescript
import { sttService } from './services/stt.service';

// Check if STT is supported
if (sttService.isSupported()) {
  // Register callbacks
  const unsubscribeResult = sttService.onResult((result) => {
    console.log('Transcript:', result.transcript);
    console.log('Confidence:', result.confidence);
    console.log('Is Final:', result.isFinal);
  });

  const unsubscribeError = sttService.onError((error) => {
    console.error('STT Error:', error.message);
  });

  // Start listening
  try {
    await sttService.startListening({
      languageCode: 'en-US',
      continuous: false,
      interimResults: true,
      maxAlternatives: 1
    });
  } catch (error) {
    console.error('Failed to start listening:', error);
  }

  // Stop listening when done
  sttService.stopListening();

  // Clean up callbacks
  unsubscribeResult();
  unsubscribeError();
}
```

### Configuration Options

```typescript
interface STTOptions {
  languageCode: string;      // Required: Language code (e.g., 'en-US', 'es-ES')
  continuous?: boolean;      // Optional: Continue listening after recognition (default: false)
  interimResults?: boolean;  // Optional: Return interim results (default: true)
  maxAlternatives?: number;  // Optional: Max alternative transcripts (default: 1)
}
```

### Error Handling

The service provides user-friendly error messages for common issues:

- `no-speech`: No speech was detected
- `audio-capture`: No microphone found or access denied
- `not-allowed`: Microphone permission denied
- `network`: Network error during recognition
- `aborted`: Recognition was aborted
- `language-not-supported`: Language not supported

### Browser Support

- **Chrome/Edge**: Full support with high-quality recognition
- **Firefox**: Limited support
- **Safari**: Requires user gesture to start
- **Mobile**: Varying support, test thoroughly

## Pronunciation Validator Service

### Features

- Text normalization (case, punctuation, diacritics)
- Levenshtein distance calculation
- Pronunciation score (0-100 scale)
- Configurable passing threshold
- Feedback level classification

### Usage Example

```typescript
import { pronunciationValidator } from './services/pronunciationValidator.service';

// Calculate pronunciation score
const score = pronunciationValidator.calculateScore(
  'Hello world',  // Expected text
  'hello world'   // Recognized text
);

console.log('Score:', score); // 100 (perfect match)

// Get detailed score information
const detailedScore = pronunciationValidator.calculateDetailedScore(
  'Hello world',
  'helo world'
);

console.log('Score:', detailedScore.score);
console.log('Distance:', detailedScore.distance);
console.log('Normalized Expected:', detailedScore.normalizedExpected);
console.log('Normalized Recognized:', detailedScore.normalizedRecognized);

// Check if pronunciation passes threshold
const passes = pronunciationValidator.isPassing(
  'Hello world',
  'helo world',
  70  // Threshold (default: 70)
);

console.log('Passes:', passes); // true or false

// Get feedback level
const feedbackLevel = pronunciationValidator.getFeedbackLevel(score);
console.log('Feedback:', feedbackLevel); // 'excellent', 'good', 'fair', or 'poor'
```

### Score Calculation

The pronunciation score is calculated using the Levenshtein distance algorithm:

1. Both texts are normalized (lowercase, remove punctuation, remove diacritics)
2. Levenshtein distance is calculated (minimum edits needed to transform one string to another)
3. Score = 100 * (1 - distance / maxLength)

**Score Ranges:**
- 90-100: Excellent pronunciation
- 70-89: Good pronunciation
- 50-69: Fair pronunciation
- 0-49: Poor pronunciation

### Text Normalization

The validator normalizes text by:
- Converting to lowercase
- Removing punctuation
- Removing diacritics (café → cafe)
- Normalizing whitespace
- Trimming leading/trailing spaces

This ensures that case, punctuation, and accents don't affect the pronunciation score.

### Levenshtein Distance

The Levenshtein distance measures the minimum number of single-character edits (insertions, deletions, substitutions) needed to change one string into another.

**Properties:**
- Symmetric: distance(a, b) = distance(b, a)
- Triangle inequality: distance(a, c) ≤ distance(a, b) + distance(b, c)
- Zero for identical strings

## Integration Example

Here's how to use both services together for pronunciation practice:

```typescript
import { sttService } from './services/stt.service';
import { pronunciationValidator } from './services/pronunciationValidator.service';

async function practicePronunciation(expectedText: string, languageCode: string) {
  if (!sttService.isSupported()) {
    throw new Error('Speech recognition not supported');
  }

  return new Promise((resolve, reject) => {
    // Register result callback
    const unsubscribeResult = sttService.onResult((result) => {
      if (result.isFinal) {
        // Calculate pronunciation score
        const score = pronunciationValidator.calculateScore(
          expectedText,
          result.transcript
        );

        // Get feedback level
        const feedback = pronunciationValidator.getFeedbackLevel(score);

        // Stop listening
        sttService.stopListening();
        unsubscribeResult();
        unsubscribeError();

        // Resolve with results
        resolve({
          transcript: result.transcript,
          score,
          feedback,
          passes: score >= 70
        });
      }
    });

    // Register error callback
    const unsubscribeError = sttService.onError((error) => {
      sttService.stopListening();
      unsubscribeResult();
      unsubscribeError();
      reject(error);
    });

    // Start listening
    sttService.startListening({
      languageCode,
      continuous: false,
      interimResults: true
    }).catch(reject);
  });
}

// Usage
try {
  const result = await practicePronunciation('Hello world', 'en-US');
  console.log('Transcript:', result.transcript);
  console.log('Score:', result.score);
  console.log('Feedback:', result.feedback);
  console.log('Passes:', result.passes);
} catch (error) {
  console.error('Pronunciation practice failed:', error);
}
```

## Testing

Both services have comprehensive test coverage including:

- Unit tests for core functionality
- Property-based tests for correctness properties
- Error handling tests
- Edge case tests

### Running Tests

```bash
# Run all frontend tests
npm test

# Run specific service tests
npm test -- stt.service.test.ts
npm test -- pronunciationValidator.service.test.ts
```

## Requirements Validation

These services implement the following requirements:

**STT Service:**
- Requirement 4.1: Microphone access and speech capture
- Requirement 4.2: Speech recognition processing
- Requirement 10.2: Web Speech API usage
- Requirement 10.3: Browser support detection
- Requirement 10.4: Error handling

**Pronunciation Validator:**
- Requirement 4.3: Text comparison
- Requirement 4.4: Score calculation (Property 13)

## Future Enhancements

Potential improvements for future iterations:

1. **Cloud STT Fallback**: Integrate Google Cloud Speech-to-Text or AWS Transcribe for better quality
2. **Phonetic Analysis**: Use phonetic algorithms (Soundex, Metaphone) for better pronunciation matching
3. **Language-Specific Scoring**: Adjust scoring algorithms based on language characteristics
4. **Real-time Feedback**: Provide word-by-word feedback during continuous recognition
5. **Pronunciation Hints**: Suggest specific improvements based on common errors
