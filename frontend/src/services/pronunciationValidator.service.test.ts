import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { PronunciationValidator } from './pronunciationValidator.service';

describe('PronunciationValidator', () => {
  let validator: PronunciationValidator;

  beforeEach(() => {
    validator = new PronunciationValidator();
  });

  describe('Text Normalization', () => {
    test('should normalize text consistently', () => {
      expect(validator.normalizeText('Hello World!')).toBe('hello world');
      expect(validator.normalizeText('  Multiple   Spaces  ')).toBe('multiple spaces');
      expect(validator.normalizeText('UPPERCASE')).toBe('uppercase');
      expect(validator.normalizeText('café')).toBe('cafe');
      expect(validator.normalizeText('naïve')).toBe('naive');
    });

    test('should handle empty and whitespace strings', () => {
      expect(validator.normalizeText('')).toBe('');
      expect(validator.normalizeText('   ')).toBe('');
      expect(validator.normalizeText('\t\n')).toBe('');
    });

    test('should remove punctuation', () => {
      expect(validator.normalizeText('Hello, World!')).toBe('hello world');
      expect(validator.normalizeText("It's a test.")).toBe('its a test');
      expect(validator.normalizeText('Question?')).toBe('question');
    });
  });

  describe('Levenshtein Distance', () => {
    test('should calculate correct distance for known examples', () => {
      expect(validator.calculateLevenshteinDistance('', '')).toBe(0);
      expect(validator.calculateLevenshteinDistance('abc', 'abc')).toBe(0);
      expect(validator.calculateLevenshteinDistance('abc', 'ab')).toBe(1);
      expect(validator.calculateLevenshteinDistance('abc', 'abcd')).toBe(1);
      expect(validator.calculateLevenshteinDistance('abc', 'adc')).toBe(1);
      expect(validator.calculateLevenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(validator.calculateLevenshteinDistance('saturday', 'sunday')).toBe(3);
    });

    test('should be symmetric', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 50 }),
          (str1, str2) => {
            const dist1 = validator.calculateLevenshteinDistance(str1, str2);
            const dist2 = validator.calculateLevenshteinDistance(str2, str1);
            expect(dist1).toBe(dist2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should satisfy triangle inequality', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 30 }),
          fc.string({ minLength: 0, maxLength: 30 }),
          fc.string({ minLength: 0, maxLength: 30 }),
          (str1, str2, str3) => {
            const dist12 = validator.calculateLevenshteinDistance(str1, str2);
            const dist23 = validator.calculateLevenshteinDistance(str2, str3);
            const dist13 = validator.calculateLevenshteinDistance(str1, str3);
            
            // Triangle inequality: d(a,c) <= d(a,b) + d(b,c)
            expect(dist13).toBeLessThanOrEqual(dist12 + dist23);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Score Calculation', () => {
    test('should return 100 for identical texts', () => {
      expect(validator.calculateScore('hello', 'hello')).toBe(100);
      expect(validator.calculateScore('Hello World', 'hello world')).toBe(100);
      expect(validator.calculateScore('Test!', 'test')).toBe(100);
    });

    test('should return 0 for empty strings', () => {
      expect(validator.calculateScore('', '')).toBe(0);
      expect(validator.calculateScore('hello', '')).toBe(0);
      expect(validator.calculateScore('', 'hello')).toBe(0);
    });

    test('should return values between 0 and 100', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (expected, recognized) => {
            const score = validator.calculateScore(expected, recognized);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 13: Pronunciation score calculation
  // Validates: Requirements 4.4
  describe('Property 13: Pronunciation score calculation', () => {
    test('for any pair of expected and recognized text, the pronunciation score should be between 0 and 100, with identical texts scoring 100 and completely different texts scoring near 0', () => {
      // Generator for strings that have content after normalization
      const meaningfulString = fc.string({ minLength: 1, maxLength: 100 })
        .filter(s => {
          const normalized = validator.normalizeText(s);
          return normalized.length > 0;
        });

      fc.assert(
        fc.property(
          meaningfulString,
          meaningfulString,
          (expected, recognized) => {
            const score = validator.calculateScore(expected, recognized);
            
            // Score must be in valid range
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            
            // Identical texts (after normalization) should score 100
            const normalizedExpected = validator.normalizeText(expected);
            const normalizedRecognized = validator.normalizeText(recognized);
            
            if (normalizedExpected === normalizedRecognized) {
              expect(score).toBe(100);
            }
            
            // Score should be inversely related to distance
            const distance = validator.calculateLevenshteinDistance(
              normalizedExpected,
              normalizedRecognized
            );
            const maxLength = Math.max(normalizedExpected.length, normalizedRecognized.length);
            
            if (maxLength > 0) {
              const expectedScore = Math.max(0, Math.min(100, (1 - distance / maxLength) * 100));
              // Allow small rounding differences
              expect(Math.abs(score - expectedScore)).toBeLessThan(0.1);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('identical texts should always score 100', () => {
      // Generator for strings that have content after normalization
      const meaningfulString = fc.string({ minLength: 1, maxLength: 100 })
        .filter(s => {
          const normalized = validator.normalizeText(s);
          return normalized.length > 0;
        });

      fc.assert(
        fc.property(
          meaningfulString,
          (text) => {
            const score = validator.calculateScore(text, text);
            expect(score).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('completely different texts should score near 0', () => {
      // Generate pairs of strings with no common characters
      fc.assert(
        fc.property(
          fc.constantFrom('aaaaaaa', 'bbbbbbb', 'ccccccc', 'ddddddd'),
          fc.constantFrom('xxxxxxx', 'yyyyyyy', 'zzzzzzz', 'wwwwwww'),
          (text1, text2) => {
            const score = validator.calculateScore(text1, text2);
            // Completely different strings should have very low scores
            expect(score).toBeLessThan(30);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('score should be symmetric', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (text1, text2) => {
            const score1 = validator.calculateScore(text1, text2);
            const score2 = validator.calculateScore(text2, text1);
            expect(score1).toBe(score2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('small changes should result in high scores', () => {
      // Generator for strings with meaningful content after normalization
      const meaningfulString = fc.string({ minLength: 10, maxLength: 50 })
        .filter(s => {
          const normalized = validator.normalizeText(s);
          return normalized.length >= 10; // Ensure at least 10 chars after normalization
        });

      fc.assert(
        fc.property(
          meaningfulString,
          fc.integer({ min: 0, max: 9 }),
          fc.char(),
          (text, position, replacement) => {
            // Make a small change to the text
            const modifiedText = text.substring(0, position) + replacement + text.substring(position + 1);
            const score = validator.calculateScore(text, modifiedText);
            
            // A single character change in a longer string should still score high
            expect(score).toBeGreaterThan(80);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('case and punctuation should not affect score', () => {
      // Generator for strings with meaningful content after normalization
      const meaningfulString = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => {
          const normalized = validator.normalizeText(s);
          return normalized.length > 0;
        });

      fc.assert(
        fc.property(
          meaningfulString,
          (text) => {
            const uppercase = text.toUpperCase();
            const lowercase = text.toLowerCase();
            const withPunctuation = text + '!!!';
            
            const score1 = validator.calculateScore(text, uppercase);
            const score2 = validator.calculateScore(text, lowercase);
            const score3 = validator.calculateScore(text, withPunctuation);
            
            expect(score1).toBe(100);
            expect(score2).toBe(100);
            expect(score3).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Detailed Score', () => {
    test('should return complete score information', () => {
      const result = validator.calculateDetailedScore('Hello World', 'hello world');
      
      expect(result.score).toBe(100);
      expect(result.expectedText).toBe('Hello World');
      expect(result.recognizedText).toBe('hello world');
      expect(result.normalizedExpected).toBe('hello world');
      expect(result.normalizedRecognized).toBe('hello world');
      expect(result.distance).toBe(0);
    });

    test('should calculate distance correctly', () => {
      const result = validator.calculateDetailedScore('cat', 'bat');
      
      expect(result.distance).toBe(1);
      expect(result.score).toBeGreaterThan(60);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('Passing Threshold', () => {
    test('should correctly determine if score passes threshold', () => {
      expect(validator.isPassing('hello', 'hello', 70)).toBe(true);
      expect(validator.isPassing('hello', 'helo', 70)).toBe(true);
      expect(validator.isPassing('hello', 'xyz', 70)).toBe(false);
    });

    test('should use default threshold of 70', () => {
      expect(validator.isPassing('hello', 'hello')).toBe(true);
      expect(validator.isPassing('hello', 'xyz')).toBe(false);
    });
  });

  describe('Feedback Level', () => {
    test('should return correct feedback levels', () => {
      expect(validator.getFeedbackLevel(95)).toBe('excellent');
      expect(validator.getFeedbackLevel(90)).toBe('excellent');
      expect(validator.getFeedbackLevel(85)).toBe('good');
      expect(validator.getFeedbackLevel(70)).toBe('good');
      expect(validator.getFeedbackLevel(60)).toBe('fair');
      expect(validator.getFeedbackLevel(50)).toBe('fair');
      expect(validator.getFeedbackLevel(40)).toBe('poor');
      expect(validator.getFeedbackLevel(0)).toBe('poor');
    });
  });
});
