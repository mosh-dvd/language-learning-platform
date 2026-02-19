import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthenticationForm } from './AuthenticationForm';

describe('AuthenticationForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Login Mode', () => {
    it('renders login form with email and password fields', () => {
      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('does not render name and native language fields in login mode', () => {
      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Native Language')).not.toBeInTheDocument();
    });

    it('submits login form with valid credentials', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', nativeLanguage: 'en' };
      const mockToken = 'mock-jwt-token';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: mockToken }),
      });

      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockUser, mockToken);
      });
    });

    it('displays error message on login failure', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid email or password' }),
      });

      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();

      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      
      // Try to submit with invalid email
      await user.click(submitButton);

      // Should not call onSuccess with invalid email
      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('Register Mode', () => {
    it('renders registration form with all required fields', () => {
      render(
        <AuthenticationForm
          mode="register"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Native Language')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('submits registration form and logs in automatically', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'newuser@example.com', name: 'New User', nativeLanguage: 'en' };
      const mockToken = 'mock-jwt-token';

      // Mock registration response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'User registered successfully', user: mockUser }),
      });

      // Mock login response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: mockToken }),
      });

      render(
        <AuthenticationForm
          mode="register"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      await user.type(screen.getByLabelText('Name'), 'New User');
      await user.type(screen.getByLabelText('Email'), 'newuser@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.selectOptions(screen.getByLabelText('Native Language'), 'en');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockUser, mockToken);
      });
    });

    it('validates password length', async () => {
      const user = userEvent.setup();

      render(
        <AuthenticationForm
          mode="register"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(screen.getByLabelText('Name'), 'Test User');
      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'short');
      await user.selectOptions(screen.getByLabelText('Native Language'), 'en');
      
      // Try to submit with short password
      await user.click(submitButton);

      // Should not call onSuccess with invalid password
      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('displays error when email already exists', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'User with this email already exists' }),
      });

      render(
        <AuthenticationForm
          mode="register"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      await user.type(screen.getByLabelText('Name'), 'Test User');
      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.selectOptions(screen.getByLabelText('Native Language'), 'en');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('User with this email already exists')).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });
  });

  describe('OAuth Buttons', () => {
    it('renders Google and Facebook OAuth buttons', () => {
      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /facebook/i })).toBeInTheDocument();
    });

    it('shows not configured message when OAuth button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByRole('button', { name: /google/i }));

      await waitFor(() => {
        expect(screen.getByText(/OAuth with google is not yet configured/i)).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });
  });

  describe('Mode Switching', () => {
    it('calls onModeChange when mode switch button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByText(/don't have an account\? sign up/i));

      expect(mockOnModeChange).toHaveBeenCalledWith('register');
    });

    it('does not render mode switch button when onModeChange is not provided', () => {
      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.queryByText(/don't have an account\? sign up/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('disables form inputs and button during submission', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <AuthenticationForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Email')).toBeDisabled();
        expect(screen.getByLabelText('Password')).toBeDisabled();
        expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
      });
    });
  });
});
