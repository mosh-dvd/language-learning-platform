/**
 * Property-Based Tests for SpeechPractice Component
 * Feature: language-learning-platform, Property 14: Score-based feedback
 * Validates: Requirements 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { SpeechPractice } from './SpeechPractice';
import * as sttServiceModule from '../services/stt.service';
import * as pronunciationValidatorModule from '../services/pronunciationValidator.service';

// Mock the services
vi.mock('../services/stt.service', () => {
  const mockCallbacks: {
    result: Array<(result: any) => void>;
    error: Array<(error: Error) => void>;
  } = {
    result: [],
    error: []
  };

  return {
    sttService: {
      isSupported: vi.fn(() => true),
      startListening: vi.fn(() => Promise.resolve()),
      stopListening: vi.fn(),
      onResult: vi.fn((callback) => {
        mockCallbacks.result.push(callback);
        return () => {
          const index = mockCallbacks.result.indexOf(callback);
          if (index > -1) mockCallbacks.result.splice(index, 1);
        };
      }),
      onError: vi.fn((callback) => {
        mockCallbacks.error.push(callback);
        return () => {
          const index = mockCallbacks.error.indexOf(callback);
          if (index > -1) mockCallbacks.error.splice(index, 1);
        };
      }),
      _triggerResult: (result: any) => {
        mockCallbacks.result.forEach(cb => cb(result));
      },
      _clearCallbacks: () => {
        mockCallbacks.result = [];
        mockCallbacks.error = [];
      }
    }
  };
});

vi.mock('../services/pronunciationValidator.service', () => ({
  pronunciationValidator: {
    calculateScore: vi.fn()
  }
}));

describe('SpeechPractice Property-Based Tests', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (sttServiceModule.sttService as any)._clearCallbacks();
    vi.spyOn(sttServiceModule.sttService, 'isSupported').mockReturnValue(true);
    vi.spyOn(sttServiceModule.sttService, 'startListening').mockResolvedValue();
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  // Feature: language-learning-platform, Property 14: Score-based feedback
  // Validates: Requirements 4.5, 4.6
  describe('Property 14: Score-based feedback', () => {
    it('should provide positive feedback when score exceeds threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }), // threshold
          fc.integer({ min: 0, max: 100 }), // score
          async (threshold, score) => {
            // Clean up any previous render
            if (cleanup) {
              cleanup();
              cleanup = null;
            }

            // Mock the pronunciation validator to return the generated score
            vi.spyOn(pronunciationValidatorModule.pronunciationValidator, 'calculateScore')
              .mockReturnValue(score);

            const mockOnScore = vi.fn();
            const user = userEvent.setup();

            const { unmount } = render(
              <SpeechPractice
                expectedText="Test text"
                languageCode="en-US"
                onScore={mockOnScore}
                threshold={threshold}
              />
            );
            cleanup = unmount;

            // Start recording
            const button = screen.getByRole('button', { name: /start recording/i });
            await user.click(button);

            // Trigger final result
            (sttServiceModule.sttService as any)._triggerResult({
              transcript: 'Test text',
              confidence: 0.9,
              isFinal: true
            });

            // Wait for score to be displayed
            await waitFor(() => {
              expect(screen.getByText('Pronunciation Score:')).toBeInTheDocument();
            });

            // Property: If score >= threshold, positive feedback should be shown and no retry button
            if (score >= threshold) {
              // Should show positive feedback
              const feedbackText = screen.getByText(/excellent pronunciation|good job/i);
              expect(feedbackText).toBeInTheDocument();
              
              // Should NOT show retry button
              expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
            } else {
              // Should show negative feedback
              const feedbackText = screen.getByText(/try again to improve your pronunciation/i);
              expect(feedbackText).toBeInTheDocument();
              
              // Should show retry button
              expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow retry functionality when score is below threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // threshold (min 1 to ensure we can test below)
          fc.integer({ min: 0, max: 99 }),  // score (max 99 to ensure we can test below threshold)
          async (threshold, score) => {
            // Only test cases where score is below threshold
            fc.pre(score < threshold);

            // Clean up any previous render
            if (cleanup) {
              cleanup();
              cleanup = null;
            }

            // Mock the pronunciation validator
            vi.spyOn(pronunciationValidatorModule.pronunciationValidator, 'calculateScore')
              .mockReturnValue(score);

            const mockOnScore = vi.fn();
            const user = userEvent.setup();

            const { unmount } = render(
              <SpeechPractice
                expectedText="Test text"
                languageCode="en-US"
                onScore={mockOnScore}
                threshold={threshold}
              />
            );
            cleanup = unmount;

            // Start recording
            const button = screen.getByRole('button', { name: /start recording/i });
            await user.click(button);

            // Trigger final result
            (sttServiceModule.sttService as any)._triggerResult({
              transcript: 'Different text',
              confidence: 0.8,
              isFinal: true
            });

            // Wait for retry button to appear
            await waitFor(() => {
              expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
            });

            // Click retry button
            const retryButton = screen.getByRole('button', { name: /try again/i });
            await user.click(retryButton);

            // Property: After retry, score should be cleared and component should reset
            await waitFor(() => {
              expect(screen.queryByText('Pronunciation Score:')).not.toBeInTheDocument();
              expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should correctly classify feedback levels based on score ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }), // score
          async (score) => {
            // Clean up any previous render
            if (cleanup) {
              cleanup();
              cleanup = null;
            }

            // Mock the pronunciation validator
            vi.spyOn(pronunciationValidatorModule.pronunciationValidator, 'calculateScore')
              .mockReturnValue(score);

            const mockOnScore = vi.fn();
            const user = userEvent.setup();
            const threshold = 70; // Standard threshold

            const { unmount } = render(
              <SpeechPractice
                expectedText="Test text"
                languageCode="en-US"
                onScore={mockOnScore}
                threshold={threshold}
              />
            );
            cleanup = unmount;

            // Start recording
            const button = screen.getByRole('button', { name: /start recording/i });
            await user.click(button);

            // Trigger final result
            (sttServiceModule.sttService as any)._triggerResult({
              transcript: 'Test text',
              confidence: 0.9,
              isFinal: true
            });

            // Wait for score to be displayed
            await waitFor(() => {
              expect(screen.getByText('Pronunciation Score:')).toBeInTheDocument();
            });

            // Property: Feedback should match score range
            if (score >= 90) {
              // Excellent feedback
              expect(screen.getByText(/excellent pronunciation/i)).toBeInTheDocument();
            } else if (score >= threshold) {
              // Good feedback
              expect(screen.getByText(/good job/i)).toBeInTheDocument();
            } else {
              // Needs improvement feedback
              expect(screen.getByText(/try again to improve your pronunciation/i)).toBeInTheDocument();
            }

            // Clean up after this iteration
            cleanup();
            cleanup = null;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent feedback for the same score across multiple renders', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }), // score
          fc.integer({ min: 0, max: 100 }), // threshold
          async (score, threshold) => {
            // Mock the pronunciation validator
            vi.spyOn(pronunciationValidatorModule.pronunciationValidator, 'calculateScore')
              .mockReturnValue(score);

            const mockOnScore = vi.fn();
            const user = userEvent.setup();

            // Render twice with same props
            const results: boolean[] = [];

            for (let i = 0; i < 2; i++) {
              // Clean up any previous render
              if (cleanup) {
                cleanup();
                cleanup = null;
              }

              const { unmount } = render(
                <SpeechPractice
                  expectedText="Test text"
                  languageCode="en-US"
                  onScore={mockOnScore}
                  threshold={threshold}
                />
              );
              cleanup = unmount;

              // Start recording
              const button = screen.getByRole('button', { name: /start recording/i });
              await user.click(button);

              // Trigger final result
              (sttServiceModule.sttService as any)._triggerResult({
                transcript: 'Test text',
                confidence: 0.9,
                isFinal: true
              });

              // Wait for score to be displayed
              await waitFor(() => {
                expect(screen.getByText('Pronunciation Score:')).toBeInTheDocument();
              });

              // Check if retry button is present
              const hasRetryButton = screen.queryByRole('button', { name: /try again/i }) !== null;
              results.push(hasRetryButton);

              cleanup();
              cleanup = null;
            }

            // Property: Both renders should show the same feedback (retry button presence)
            expect(results[0]).toBe(results[1]);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
