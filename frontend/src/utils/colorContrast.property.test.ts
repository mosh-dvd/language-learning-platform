/**
 * Property-Based Tests for Color Contrast Compliance
 * Feature: language-learning-platform, Property 44: Color contrast compliance
 * Validates: Requirements 15.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getContrastRatio,
  meetsWCAG_AA,
  getWCAGLevel,
  WCAGColors,
} from './colorContrast';

describe('Property 44: Color contrast compliance', () => {
  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('contrast ratio should be symmetric', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (color1, color2) => {
          const ratio1 = getContrastRatio(`#${color1}`, `#${color2}`);
          const ratio2 = getContrastRatio(`#${color2}`, `#${color1}`);
          
          // Property: Contrast ratio should be the same regardless of order
          expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('contrast ratio should always be between 1 and 21', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (color1, color2) => {
          const ratio = getContrastRatio(`#${color1}`, `#${color2}`);
          
          // Property: Contrast ratio must be within valid range
          expect(ratio).toBeGreaterThanOrEqual(1);
          expect(ratio).toBeLessThanOrEqual(21);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('same colors should always have ratio of 1', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (color) => {
          const ratio = getContrastRatio(`#${color}`, `#${color}`);
          
          // Property: Same colors have minimum contrast
          expect(ratio).toBeCloseTo(1, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('black and white should have maximum contrast', () => {
    const ratio = getContrastRatio('#000000', '#FFFFFF');
    
    // Property: Black and white have maximum contrast ratio
    expect(ratio).toBeCloseTo(21, 0);
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('WCAG AA compliance should be transitive for normal text', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (foreground, background) => {
          const meetsAA = meetsWCAG_AA(`#${foreground}`, `#${background}`, false);
          const ratio = getContrastRatio(`#${foreground}`, `#${background}`);
          
          // Property: If meets AA, ratio must be >= 4.5
          if (meetsAA) {
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          } else {
            expect(ratio).toBeLessThan(4.5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('WCAG AA compliance should be transitive for large text', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (foreground, background) => {
          const meetsAA = meetsWCAG_AA(`#${foreground}`, `#${background}`, true);
          const ratio = getContrastRatio(`#${foreground}`, `#${background}`);
          
          // Property: If meets AA for large text, ratio must be >= 3
          if (meetsAA) {
            expect(ratio).toBeGreaterThanOrEqual(3);
          } else {
            expect(ratio).toBeLessThan(3);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('WCAG level should be consistent with ratio thresholds', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        fc.boolean(),
        (foreground, background, isLargeText) => {
          const level = getWCAGLevel(`#${foreground}`, `#${background}`, isLargeText);
          const ratio = getContrastRatio(`#${foreground}`, `#${background}`);
          
          const normalThresholdAAA = 7;
          const normalThresholdAA = 4.5;
          const largeThresholdAAA = 4.5;
          const largeThresholdAA = 3;
          
          const thresholdAAA = isLargeText ? largeThresholdAAA : normalThresholdAAA;
          const thresholdAA = isLargeText ? largeThresholdAA : normalThresholdAA;
          
          // Property: WCAG level should match ratio thresholds
          if (ratio >= thresholdAAA) {
            expect(level).toBe('AAA');
          } else if (ratio >= thresholdAA) {
            expect(level).toBe('AA');
          } else {
            expect(level).toBe('Fail');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('all predefined WCAG colors should meet AA standards', () => {
    // Property: All colors in WCAGColors palette meet their intended standards
    
    // Test text colors (normal text on white)
    Object.entries(WCAGColors.text).forEach(([name, color]) => {
      const ratio = getContrastRatio(color, '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAG_AA(color, '#FFFFFF', false)).toBe(true);
    });

    // Test large text colors
    Object.entries(WCAGColors.largeText).forEach(([name, color]) => {
      const ratio = getContrastRatio(color, '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(3);
      expect(meetsWCAG_AA(color, '#FFFFFF', true)).toBe(true);
    });

    // Test interactive colors (should meet AA for normal text)
    expect(meetsWCAG_AA(WCAGColors.interactive.primary, '#FFFFFF', false)).toBe(true);
    expect(meetsWCAG_AA(WCAGColors.interactive.primaryHover, '#FFFFFF', false)).toBe(true);
    expect(meetsWCAG_AA(WCAGColors.interactive.danger, '#FFFFFF', false)).toBe(true);

    // Test status colors
    expect(meetsWCAG_AA(WCAGColors.status.successDark, '#FFFFFF', false)).toBe(true);
    expect(meetsWCAG_AA(WCAGColors.status.warningDark, '#FFFFFF', false)).toBe(true);
    expect(meetsWCAG_AA(WCAGColors.status.error, '#FFFFFF', false)).toBe(true);
    expect(meetsWCAG_AA(WCAGColors.status.info, '#FFFFFF', false)).toBe(true);
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('increasing luminance difference should increase contrast ratio', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        (brightness1, brightness2) => {
          // Create grayscale colors
          const color1 = `#${brightness1.toString(16).padStart(2, '0').repeat(3)}`;
          const color2 = `#${brightness2.toString(16).padStart(2, '0').repeat(3)}`;
          
          const ratio = getContrastRatio(color1, color2);
          
          // Property: Contrast ratio increases with luminance difference
          const luminanceDiff = Math.abs(brightness1 - brightness2);
          
          if (luminanceDiff === 0) {
            expect(ratio).toBeCloseTo(1, 1);
          } else if (luminanceDiff > 200) {
            // Large luminance difference should have high contrast
            expect(ratio).toBeGreaterThan(10);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: language-learning-platform, Property 44: Color contrast compliance
  // Validates: Requirements 15.4
  it('meeting AAA should imply meeting AA', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        fc.boolean(),
        (foreground, background, isLargeText) => {
          const levelAAA = getWCAGLevel(`#${foreground}`, `#${background}`, isLargeText);
          const meetsAA = meetsWCAG_AA(`#${foreground}`, `#${background}`, isLargeText);
          
          // Property: AAA compliance implies AA compliance
          if (levelAAA === 'AAA') {
            expect(meetsAA).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
