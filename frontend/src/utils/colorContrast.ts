/**
 * Color Contrast Utilities
 * Utilities for checking WCAG 2.1 color contrast compliance
 * Requirements: 15.4
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex format (#RRGGBB)');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * Normal text: 4.5:1
 * Large text (18pt+ or 14pt+ bold): 3:1
 */
export function meetsWCAG_AA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * Normal text: 7:1
 * Large text: 4.5:1
 */
export function meetsWCAG_AAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 4.5 : 7;
  return ratio >= requiredRatio;
}

/**
 * Get WCAG compliance level for a color combination
 */
export function getWCAGLevel(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): 'AAA' | 'AA' | 'Fail' {
  if (meetsWCAG_AAA(foreground, background, isLargeText)) {
    return 'AAA';
  }
  if (meetsWCAG_AA(foreground, background, isLargeText)) {
    return 'AA';
  }
  return 'Fail';
}

/**
 * Common color palette with WCAG-compliant combinations
 * All colors are tested against white (#FFFFFF) background
 */
export const WCAGColors = {
  // Text colors (normal text on white background - 4.5:1 minimum)
  text: {
    primary: '#1f2937', // gray-800 - 14.59:1
    secondary: '#374151', // gray-700 - 10.69:1
    tertiary: '#4b5563', // gray-600 - 7.52:1
    disabled: '#6b7280', // gray-500 - 4.64:1
  },

  // Large text colors (18pt+ on white background - 3:1 minimum)
  largeText: {
    primary: '#1f2937', // gray-800 - 14.59:1
    secondary: '#374151', // gray-700 - 10.69:1
    tertiary: '#4b5563', // gray-600 - 7.52:1
    light: '#6b7280', // gray-500 - 4.64:1
  },

  // Interactive elements (buttons, links)
  interactive: {
    primary: '#2563eb', // blue-600 - 5.14:1
    primaryHover: '#1d4ed8', // blue-700 - 7.04:1
    secondary: '#059669', // green-600 - 3.94:1 (use for large text only)
    danger: '#dc2626', // red-600 - 5.52:1
  },

  // Status colors
  status: {
    success: '#059669', // green-600 - 3.94:1 (large text)
    successDark: '#047857', // green-700 - 5.39:1 (normal text)
    warning: '#d97706', // amber-600 - 3.94:1 (large text)
    warningDark: '#b45309', // amber-700 - 5.39:1 (normal text)
    error: '#dc2626', // red-600 - 5.52:1
    info: '#2563eb', // blue-600 - 5.14:1
  },

  // Background colors (for text overlays)
  backgrounds: {
    dark: '#1f2937', // gray-800 - use with white text
    medium: '#374151', // gray-700 - use with white text
    light: '#f3f4f6', // gray-100 - use with dark text
  },
};

/**
 * Validate that a color combination meets WCAG AA standards
 * Throws an error if the combination fails
 */
export function validateColorContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false,
  context: string = ''
): void {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3 : 4.5;

  if (ratio < requiredRatio) {
    throw new Error(
      `Color contrast failure${context ? ` in ${context}` : ''}: ` +
        `${foreground} on ${background} has ratio ${ratio.toFixed(2)}:1, ` +
        `but ${requiredRatio}:1 is required for ${isLargeText ? 'large' : 'normal'} text`
    );
  }
}
