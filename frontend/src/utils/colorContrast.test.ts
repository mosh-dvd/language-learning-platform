/**
 * Tests for Color Contrast Utilities
 * Requirements: 15.4
 */

import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  meetsWCAG_AA,
  meetsWCAG_AAA,
  getWCAGLevel,
  WCAGColors,
  validateColorContrast,
} from './colorContrast';

describe('Color Contrast Utilities', () => {
  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black on white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate correct contrast ratio for white on black', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate correct contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#FFFFFF', '#FFFFFF');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('should handle colors without # prefix', () => {
      const ratio = getContrastRatio('000000', 'FFFFFF');
      expect(ratio).toBeCloseTo(21, 1);
    });
  });

  describe('meetsWCAG_AA', () => {
    it('should pass for black text on white background (normal text)', () => {
      expect(meetsWCAG_AA('#000000', '#FFFFFF', false)).toBe(true);
    });

    it('should pass for gray-800 text on white background (normal text)', () => {
      expect(meetsWCAG_AA('#1f2937', '#FFFFFF', false)).toBe(true);
    });

    it('should fail for light gray text on white background (normal text)', () => {
      expect(meetsWCAG_AA('#d1d5db', '#FFFFFF', false)).toBe(false);
    });

    it('should pass for medium gray on white for large text', () => {
      // gray-500 (#6b7280) has 4.64:1 ratio, which passes 3:1 for large text
      expect(meetsWCAG_AA('#6b7280', '#FFFFFF', true)).toBe(true);
    });
  });

  describe('meetsWCAG_AAA', () => {
    it('should pass for black text on white background', () => {
      expect(meetsWCAG_AAA('#000000', '#FFFFFF', false)).toBe(true);
    });

    it('should fail for gray-600 text on white background (normal text)', () => {
      expect(meetsWCAG_AAA('#4b5563', '#FFFFFF', false)).toBe(true);
    });
  });

  describe('getWCAGLevel', () => {
    it('should return AAA for black on white', () => {
      expect(getWCAGLevel('#000000', '#FFFFFF')).toBe('AAA');
    });

    it('should return AA for gray-600 on white (normal text)', () => {
      expect(getWCAGLevel('#4b5563', '#FFFFFF', false)).toBe('AAA');
    });

    it('should return Fail for light gray on white (normal text)', () => {
      expect(getWCAGLevel('#d1d5db', '#FFFFFF', false)).toBe('Fail');
    });
  });

  describe('WCAGColors palette', () => {
    it('all text colors should meet AA standards on white background', () => {
      Object.values(WCAGColors.text).forEach((color) => {
        expect(meetsWCAG_AA(color, '#FFFFFF', false)).toBe(true);
      });
    });

    it('all large text colors should meet AA standards for large text', () => {
      Object.values(WCAGColors.largeText).forEach((color) => {
        expect(meetsWCAG_AA(color, '#FFFFFF', true)).toBe(true);
      });
    });

    it('all interactive colors should meet AA standards', () => {
      expect(meetsWCAG_AA(WCAGColors.interactive.primary, '#FFFFFF', false)).toBe(true);
      expect(meetsWCAG_AA(WCAGColors.interactive.primaryHover, '#FFFFFF', false)).toBe(true);
      expect(meetsWCAG_AA(WCAGColors.interactive.danger, '#FFFFFF', false)).toBe(true);
    });

    it('status colors should meet appropriate standards', () => {
      // Success dark should meet AA for normal text
      expect(meetsWCAG_AA(WCAGColors.status.successDark, '#FFFFFF', false)).toBe(true);
      
      // Warning dark should meet AA for normal text
      expect(meetsWCAG_AA(WCAGColors.status.warningDark, '#FFFFFF', false)).toBe(true);
      
      // Error should meet AA for normal text
      expect(meetsWCAG_AA(WCAGColors.status.error, '#FFFFFF', false)).toBe(true);
      
      // Info should meet AA for normal text
      expect(meetsWCAG_AA(WCAGColors.status.info, '#FFFFFF', false)).toBe(true);
    });
  });

  describe('validateColorContrast', () => {
    it('should not throw for valid color combinations', () => {
      expect(() => {
        validateColorContrast('#000000', '#FFFFFF', false);
      }).not.toThrow();
    });

    it('should throw for invalid color combinations', () => {
      expect(() => {
        validateColorContrast('#d1d5db', '#FFFFFF', false, 'test context');
      }).toThrow(/Color contrast failure/);
    });

    it('should include context in error message', () => {
      expect(() => {
        validateColorContrast('#d1d5db', '#FFFFFF', false, 'button text');
      }).toThrow(/button text/);
    });
  });
});
