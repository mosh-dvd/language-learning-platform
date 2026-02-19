/**
 * ImageCard Component Tests
 * Tests for audio playback state transitions and visual feedback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { ImageCard } from './ImageCard';
import * as ttsServiceModule from '../services/tts.service';

// Mock the TTS service
vi.mock('../services/tts.service', () => ({
  ttsService: {
    speak: vi.fn(),
    stop: vi.fn(),
    isSupported: vi.fn(() => true),
    isSpeaking: vi.fn(() => false),
  },
}));

describe('ImageCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Feature: language-learning-platform, Property 11: Audio playback state transitions
  // Validates: Requirements 3.3, 3.4
  describe('Property 11: Audio playback state transitions', () => {
    it('should transition from ready → playing → ready for any valid text and language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant('en-US'),
            fc.constant('es-ES'),
            fc.constant('fr-FR'),
            fc.constant('de-DE'),
            fc.constant('ja-JP'),
            fc.constant('zh-CN')
          ),
          async (text, languageCode) => {
            // Mock successful TTS playback with delay to simulate real audio
            const speakMock = vi.spyOn(ttsServiceModule.ttsService, 'speak');
            speakMock.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

            const { unmount } = render(
              <ImageCard
                imageUrl="https://example.com/image.jpg"
                text={text}
                languageCode={languageCode}
              />
            );

            try {
              // Initial state should be ready (button should be enabled and not pulsing)
              const button = screen.getByRole('button', { name: /play audio/i });
              expect(button).toBeEnabled();
              expect(button).not.toHaveClass('animate-pulse');

              // Click to start playback
              await userEvent.click(button);

              // Should transition to playing state (button should pulse and show "Audio playing")
              await waitFor(() => {
                const playingButton = screen.getByRole('button', { name: /audio playing/i });
                expect(playingButton).toBeInTheDocument();
                expect(playingButton).toHaveClass('animate-pulse');
              }, { timeout: 1000 });

              // Wait for playback to complete
              await waitFor(() => {
                const readyButton = screen.getByRole('button', { name: /play audio/i });
                expect(readyButton).toBeInTheDocument();
                expect(readyButton).not.toHaveClass('animate-pulse');
              }, { timeout: 1500 });

              // Verify TTS was called with correct parameters
              expect(speakMock).toHaveBeenCalledWith(text, { languageCode });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should show visual feedback during all state transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constant('en-US'),
          async (text, languageCode) => {
            const speakMock = vi.spyOn(ttsServiceModule.ttsService, 'speak');
            speakMock.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

            const { unmount } = render(
              <ImageCard
                imageUrl="https://example.com/image.jpg"
                text={text}
                languageCode={languageCode}
              />
            );

            try {
              const button = screen.getByRole('button', { name: /play audio/i });
              
              // Ready state: button should have specific styling
              expect(button).toHaveClass('bg-white');

              await userEvent.click(button);

              // Playing state: button should change appearance
              await waitFor(() => {
                const playingButton = screen.getByRole('button', { name: /audio playing/i });
                expect(playingButton).toHaveClass('bg-blue-600');
                expect(playingButton).toHaveClass('animate-pulse');
              }, { timeout: 1000 });

              // Visual indicator should be present
              await waitFor(() => {
                const indicator = screen.getByRole('status', { name: /audio is playing/i });
                expect(indicator).toBeInTheDocument();
              }, { timeout: 1000 });

              // Wait for return to ready state
              await waitFor(() => {
                const readyButton = screen.getByRole('button', { name: /play audio/i });
                expect(readyButton).toHaveClass('bg-white');
              }, { timeout: 1500 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should handle errors and return to ready state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constant('en-US'),
          async (text, languageCode) => {
            const speakMock = vi.spyOn(ttsServiceModule.ttsService, 'speak');
            speakMock.mockRejectedValue(new Error('TTS error'));

            const { unmount } = render(
              <ImageCard
                imageUrl="https://example.com/image.jpg"
                text={text}
                languageCode={languageCode}
              />
            );

            try {
              const button = screen.getByRole('button', { name: /play audio/i });
              await userEvent.click(button);

              // Should show error state
              await waitFor(() => {
                const errorButton = screen.getByRole('button', { name: /audio error/i });
                expect(errorButton).toBeInTheDocument();
                expect(errorButton).toHaveClass('bg-red-500');
              });

              // Should show error message
              const errorMessage = await screen.findByRole('alert');
              expect(errorMessage).toHaveTextContent(/TTS error/i);

              // Should eventually return to ready state (after 3 seconds)
              await waitFor(
                () => {
                  const readyButton = screen.getByRole('button', { name: /play audio/i });
                  expect(readyButton).toBeInTheDocument();
                },
                { timeout: 4000 }
              );
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: language-learning-platform, Property 45: Audio visual feedback
  // Validates: Requirements 15.6
  describe('Property 45: Audio visual feedback', () => {
    it('should display visual indicators during audio playback for accessibility', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constant('en-US'),
          async (text, languageCode) => {
            const speakMock = vi.spyOn(ttsServiceModule.ttsService, 'speak');
            speakMock.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

            const { unmount } = render(
              <ImageCard
                imageUrl="https://example.com/image.jpg"
                text={text}
                languageCode={languageCode}
              />
            );

            try {
              const button = screen.getByRole('button', { name: /play audio/i });
              await userEvent.click(button);

              // Visual indicator should appear during playback
              await waitFor(() => {
                const indicator = screen.getByRole('status', { name: /audio is playing/i });
                expect(indicator).toBeInTheDocument();
                
                // Should have animated elements (bouncing bars)
                const animatedElements = indicator.querySelectorAll('.animate-bounce');
                expect(animatedElements.length).toBeGreaterThan(0);
              }, { timeout: 1000 });

              // Button should have visual feedback (pulsing animation)
              const playingButton = screen.getByRole('button', { name: /audio playing/i });
              expect(playingButton).toHaveClass('animate-pulse');

              // Wait for playback to complete
              await waitFor(() => {
                const readyButton = screen.getByRole('button', { name: /play audio/i });
                expect(readyButton).toBeInTheDocument();
              }, { timeout: 1500 });

              // Visual indicator should be removed after playback
              expect(screen.queryByRole('status', { name: /audio is playing/i })).not.toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should provide aria-live announcements for state changes', async () => {
      const speakMock = vi.spyOn(ttsServiceModule.ttsService, 'speak');
      speakMock.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { unmount } = render(
        <ImageCard
          imageUrl="https://example.com/image.jpg"
          text="Hello"
          languageCode="en-US"
        />
      );

      try {
        const button = screen.getByRole('button', { name: /play audio/i });
        
        // Button should have aria-live for screen readers
        expect(button).toHaveAttribute('aria-live', 'polite');

        await userEvent.click(button);

        // Playing state should be announced
        await waitFor(() => {
          const playingButton = screen.getByRole('button', { name: /audio playing/i });
          expect(playingButton).toHaveAttribute('aria-live', 'polite');
        }, { timeout: 1000 });
      } finally {
        unmount();
      }
    });
  });

  describe('Image loading states', () => {
    it('should show loading state while image loads', () => {
      const { unmount } = render(
        <ImageCard
          imageUrl="https://example.com/image.jpg"
          text="Test"
          languageCode="en-US"
        />
      );

      try {
        // Loading indicator should be present (it has role="status" but no accessible name)
        const loadingIndicator = screen.getByText(/loading image/i);
        expect(loadingIndicator).toBeInTheDocument();
      } finally {
        unmount();
      }
    });

    it('should show error state when image fails to load', async () => {
      const { unmount } = render(
        <ImageCard
          imageUrl="invalid-url"
          text="Test"
          languageCode="en-US"
        />
      );

      try {
        const img = screen.getByRole('img');
        
        // Simulate image load error
        img.dispatchEvent(new Event('error'));

        await waitFor(() => {
          const errorMessage = screen.getByRole('alert');
          expect(errorMessage).toHaveTextContent(/failed to load image/i);
        });

        // Audio button should be disabled when image fails
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      } finally {
        unmount();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { unmount } = render(
        <ImageCard
          imageUrl="https://example.com/image.jpg"
          text="Test text"
          languageCode="en-US"
          altText="Test alt text"
        />
      );

      try {
        // Card should have article role with label
        const card = screen.getByRole('article');
        expect(card).toHaveAttribute('aria-label', 'Image card: Test text');

        // Image should have alt text
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('alt', 'Test alt text');

        // Button should have descriptive label
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label');
      } finally {
        unmount();
      }
    });

    it('should support keyboard navigation', async () => {
      const speakMock = vi.spyOn(ttsServiceModule.ttsService, 'speak');
      speakMock.mockResolvedValue(undefined);

      const { unmount } = render(
        <ImageCard
          imageUrl="https://example.com/image.jpg"
          text="Test"
          languageCode="en-US"
        />
      );

      try {
        const button = screen.getByRole('button');
        
        // Button should be focusable
        button.focus();
        expect(button).toHaveFocus();

        // Should have focus ring styles
        expect(button).toHaveClass('focus:ring-2');
      } finally {
        unmount();
      }
    });
  });
});
