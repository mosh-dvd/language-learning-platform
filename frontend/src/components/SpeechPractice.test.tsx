/**
 * SpeechPractice Component Tests
 * Tests for microphone input and pronunciation validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      _triggerError: (error: Error) => {
        mockCallbacks.error.forEach(cb => cb(error));
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
    calculateScore: vi.fn((expected: string, recognized: string) => {
      // Simple mock: return 100 for exact match, 50 otherwise
      return expected.toLowerCase() === recognized.toLowerCase() ? 100 : 50;
    })
  }
}));

describe('SpeechPractice Component', () => {
  const mockOnScore = vi.fn();
  const defaultProps = {
    expectedText: 'Hello world',
    languageCode: 'en-US',
    onScore: mockOnScore,
    threshold: 70
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (sttServiceModule.sttService as any)._clearCallbacks();
    // Ensure isSupported returns true by default
    vi.spyOn(sttServiceModule.sttService, 'isSupported').mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with expected text', () => {
      render(<SpeechPractice {...defaultProps} />);
      
      expect(screen.getByText('Practice saying:')).toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('should render microphone button', () => {
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      expect(button).toBeInTheDocument();
    });

    it('should show unsupported message when STT is not supported', () => {
      vi.spyOn(sttServiceModule.sttService, 'isSupported').mockReturnValue(false);
      
      render(<SpeechPractice {...defaultProps} />);
      
      expect(screen.getByText(/speech recognition is not supported/i)).toBeInTheDocument();
    });
  });

  describe('Microphone Permission Handling (Requirement 4.1)', () => {
    it('should request microphone access when button is clicked', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      expect(sttServiceModule.sttService.startListening).toHaveBeenCalledWith({
        languageCode: 'en-US',
        continuous: false,
        interimResults: true,
        maxAlternatives: 1
      });
    });

    it('should handle permission denied error', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      // Trigger permission denied error
      (sttServiceModule.sttService as any)._triggerError(
        new Error('Microphone permission was denied. Please allow microphone access.')
      );
      
      await waitFor(() => {
        expect(screen.getByText(/microphone permission was denied/i)).toBeInTheDocument();
        expect(screen.getByText(/please allow microphone access in your browser settings/i)).toBeInTheDocument();
      });
    });
  });

  describe('Speech Recognition (Requirement 4.2)', () => {
    it('should capture and display recognized text', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      // Trigger interim result
      (sttServiceModule.sttService as any)._triggerResult({
        transcript: 'Hello',
        confidence: 0.9,
        isFinal: false
      });
      
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
    });

    it('should show listening state when recording', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Listening...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
      });
    });
  });

  describe('Pronunciation Score Display (Requirement 4.4)', () => {
    it('should calculate and display pronunciation score', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      // Trigger final result
      (sttServiceModule.sttService as any)._triggerResult({
        transcript: 'Hello world',
        confidence: 0.95,
        isFinal: true
      });
      
      await waitFor(() => {
        expect(screen.getByText('Pronunciation Score:')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
      
      expect(mockOnScore).toHaveBeenCalledWith(100);
    });

    it('should show score with visual feedback', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      // Trigger final result with lower score
      (sttServiceModule.sttService as any)._triggerResult({
        transcript: 'Different text',
        confidence: 0.8,
        isFinal: true
      });
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar', { name: /pronunciation score/i });
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  describe('Score-based Feedback (Requirements 4.5, 4.6)', () => {
    it('should provide positive feedback when score exceeds threshold', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} threshold={70} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      // Mock high score
      vi.spyOn(pronunciationValidatorModule.pronunciationValidator, 'calculateScore')
        .mockReturnValue(95);
      
      (sttServiceModule.sttService as any)._triggerResult({
        transcript: 'Hello world',
        confidence: 0.95,
        isFinal: true
      });
      
      await waitFor(() => {
        expect(screen.getByText(/excellent pronunciation/i)).toBeInTheDocument();
      });
    });

    it('should show retry option when score is below threshold', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} threshold={70} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      // Mock low score
      vi.spyOn(pronunciationValidatorModule.pronunciationValidator, 'calculateScore')
        .mockReturnValue(50);
      
      (sttServiceModule.sttService as any)._triggerResult({
        transcript: 'Different text',
        confidence: 0.8,
        isFinal: true
      });
      
      await waitFor(() => {
        expect(screen.getByText(/try again to improve your pronunciation/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should allow retry after low score', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} threshold={70} />);
      
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      await user.click(recordButton);
      
      // Mock low score
      vi.spyOn(pronunciationValidatorModule.pronunciationValidator, 'calculateScore')
        .mockReturnValue(50);
      
      (sttServiceModule.sttService as any)._triggerResult({
        transcript: 'Different text',
        confidence: 0.8,
        isFinal: true
      });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);
      
      // Score should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Pronunciation Score:')).not.toBeInTheDocument();
      });
    });

    it('should not show retry button when score exceeds threshold', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} threshold={70} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      // Mock high score
      vi.spyOn(pronunciationValidatorModule.pronunciationValidator, 'calculateScore')
        .mockReturnValue(85);
      
      (sttServiceModule.sttService as any)._triggerResult({
        transcript: 'Hello world',
        confidence: 0.95,
        isFinal: true
      });
      
      await waitFor(() => {
        expect(screen.getByText(/good job/i)).toBeInTheDocument();
      });
      
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      (sttServiceModule.sttService as any)._triggerError(
        new Error('Network error occurred during speech recognition.')
      );
      
      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });
    });

    it('should handle start listening failure', async () => {
      const user = userEvent.setup();
      vi.spyOn(sttServiceModule.sttService, 'startListening')
        .mockRejectedValue(new Error('Failed to start'));
      
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to start/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      expect(button).toHaveAttribute('aria-label');
    });

    it('should update ARIA pressed state when listening', async () => {
      const user = userEvent.setup();
      // Ensure startListening resolves successfully
      vi.spyOn(sttServiceModule.sttService, 'startListening').mockResolvedValue();
      
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      expect(button).toHaveAttribute('aria-pressed', 'false');
      
      await user.click(button);
      
      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: /stop recording/i });
        expect(stopButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should have progress bar with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<SpeechPractice {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /start recording/i });
      await user.click(button);
      
      (sttServiceModule.sttService as any)._triggerResult({
        transcript: 'Hello world',
        confidence: 0.95,
        isFinal: true
      });
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup listeners on unmount', () => {
      const { unmount } = render(<SpeechPractice {...defaultProps} />);
      
      unmount();
      
      expect(sttServiceModule.sttService.stopListening).toHaveBeenCalled();
    });
  });
});
