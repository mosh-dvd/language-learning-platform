import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateText, validateImageFormat, isLanguageSupported } from './validation';

describe('Text Validation', () => {
  // Feature: language-learning-platform, Property 7: Text validation
  // Validates: Requirements 2.4
  describe('Property 7: Text validation', () => {
    it('should reject empty strings and whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(' '),
            fc.constant('  '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant('   \t\n  ')
          ),
          (text) => {
            const result = validateText(text);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all valid non-empty Unicode strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            fc.unicodeString({ minLength: 1 }).filter(s => s.trim().length > 0),
            fc.fullUnicodeString({ minLength: 1 }).filter(s => s.trim().length > 0)
          ),
          (text) => {
            const result = validateText(text);
            // Valid Unicode strings that are not empty should be accepted
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various Unicode categories correctly', () => {
      const validTexts = [
        'Hello World',
        'שלום עולם', // Hebrew
        'مرحبا بالعالم', // Arabic
        '你好世界', // Chinese
        'こんにちは世界', // Japanese
        '안녕하세요 세계', // Korean
        'Привет мир', // Russian
        'Γεια σου κόσμε', // Greek
        'Emoji test 🌍🎉',
        'Mixed 文字 test',
        'Numbers 123 and symbols !@#',
      ];

      validTexts.forEach((text) => {
        const result = validateText(text);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject strings with only whitespace variations', () => {
      const invalidTexts = [
        '',
        ' ',
        '  ',
        '\t',
        '\n',
        '\r',
        '\r\n',
        '   \t\n\r   ',
      ];

      invalidTexts.forEach((text) => {
        const result = validateText(text);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});
