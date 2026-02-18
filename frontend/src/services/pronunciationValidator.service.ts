/**
 * Pronunciation Validator Service
 * Compares recognized speech with expected text using Levenshtein distance
 * and calculates pronunciation scores on a 0-100 scale.
 */

export interface PronunciationScore {
  score: number;
  expectedText: string;
  recognizedText: string;
  normalizedExpected: string;
  normalizedRecognized: string;
  distance: number;
}

export class PronunciationValidator {
  /**
   * Normalize text for comparison
   * - Convert to lowercase
   * - Remove punctuation
   * - Trim whitespace
   * - Normalize Unicode characters
   * - Remove extra spaces
   */
  normalizeText(text: string): string {
    if (!text) {
      return '';
    }

    return text
      .toLowerCase()
      .normalize('NFD') // Decompose Unicode characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Returns the minimum number of single-character edits (insertions, deletions, substitutions)
   * required to change one string into the other.
   */
  calculateLevenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }

    // Fill the dp table
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          // Characters match, no operation needed
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          // Take minimum of insert, delete, or substitute
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    return dp[len1][len2];
  }

  /**
   * Calculate pronunciation score (0-100) based on similarity
   * - 100: Perfect match
   * - 0: Completely different
   * 
   * Score is calculated as: 100 * (1 - distance / maxLength)
   * where maxLength is the length of the longer string
   */
  calculateScore(expected: string, recognized: string): number {
    if (!expected || !recognized) {
      return 0;
    }

    // Normalize both texts
    const normalizedExpected = this.normalizeText(expected);
    const normalizedRecognized = this.normalizeText(recognized);

    // Handle empty strings after normalization
    if (!normalizedExpected || !normalizedRecognized) {
      return 0;
    }

    // Perfect match
    if (normalizedExpected === normalizedRecognized) {
      return 100;
    }

    // Calculate Levenshtein distance
    const distance = this.calculateLevenshteinDistance(
      normalizedExpected,
      normalizedRecognized
    );

    // Calculate similarity score
    const maxLength = Math.max(normalizedExpected.length, normalizedRecognized.length);
    const similarity = 1 - (distance / maxLength);
    const score = Math.max(0, Math.min(100, similarity * 100));

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate detailed pronunciation score with additional information
   */
  calculateDetailedScore(expected: string, recognized: string): PronunciationScore {
    const normalizedExpected = this.normalizeText(expected);
    const normalizedRecognized = this.normalizeText(recognized);
    
    const distance = this.calculateLevenshteinDistance(
      normalizedExpected,
      normalizedRecognized
    );
    
    const score = this.calculateScore(expected, recognized);

    return {
      score,
      expectedText: expected,
      recognizedText: recognized,
      normalizedExpected,
      normalizedRecognized,
      distance
    };
  }

  /**
   * Check if pronunciation passes a given threshold
   */
  isPassing(expected: string, recognized: string, threshold: number = 70): boolean {
    const score = this.calculateScore(expected, recognized);
    return score >= threshold;
  }

  /**
   * Get feedback level based on score
   */
  getFeedbackLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }
}

// Export singleton instance
export const pronunciationValidator = new PronunciationValidator();
