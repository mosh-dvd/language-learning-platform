import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordReset } from './PasswordReset';

describe('PasswordReset', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Request Reset Step', () => {
    it('renders password reset request form', () => {
      render(<PasswordReset onSuccess={mockOnSuccess} onError={mockOnError} />);

      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();

      render(<PasswordReset onSuccess={mockOnSuccess} onError={mockOnError} />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.type(emailInput, 'invalid-email');
      
      // Blur to trigger validation
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });

    it('submits password reset request successfully', async () => {
      const user = userEvent.setup();
      const mockToken = 'reset-token-123';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Reset link sent',
          token: mockToken,
        }),
      });

      render(<PasswordReset onSuccess={mockOnSuccess} onError={mockOnError} />);

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/if an account exists with this email/i)).toBeInTheDocument();
        expect(screen.getByText('Set New Password')).toBeInTheDocument();
      });
    });

    it('handles request error gracefully', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Service unavailable' }),
      });

      render(<PasswordReset onSuccess={mockOnSuccess} onError={mockOnError} />);

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText('Service unavailable')).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('disables form during submission', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PasswordReset onSuccess={mockOnSuccess} onError={mockOnError} />);

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Email Address')).toBeDisabled();
        expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
      });
    });
  });

  describe('Confirm Reset Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Reset link sent',
          token: 'reset-token-123',
        }),
      });

      render(<PasswordReset onSuccess={mockOnSuccess} onError={mockOnError} />);

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText('Set New Password')).toBeInTheDocument();
      });
    });

    it('renders password confirmation form', () => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('validates password length', async () => {
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('New Password'), 'short');
      await user.type(screen.getByLabelText('Confirm Password'), 'short');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });

    it('validates passwords match', async () => {
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('New Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'different123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('successfully resets password', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password reset successful' }),
      });

      await user.type(screen.getByLabelText('New Password'), 'newpassword123');
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('handles invalid token error', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid or expired reset token' }),
      });

      await user.type(screen.getByLabelText('New Password'), 'newpassword123');
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset token')).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('handles used token error', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'This reset token has already been used' }),
      });

      await user.type(screen.getByLabelText('New Password'), 'newpassword123');
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('This reset token has already been used')).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('allows navigation back to request step', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Back to email entry'));

      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });
  });

  describe('Manual Token Entry', () => {
    it('allows manual token entry when not auto-filled', async () => {
      const user = userEvent.setup();

      // Mock request without token in response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Reset link sent',
        }),
      });

      render(<PasswordReset onSuccess={mockOnSuccess} onError={mockOnError} />);

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Reset Token')).toBeInTheDocument();
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password reset successful' }),
      });

      await user.type(screen.getByLabelText('Reset Token'), 'manual-token-123');
      await user.type(screen.getByLabelText('New Password'), 'newpassword123');
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
