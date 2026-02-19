import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileManagement, User } from './ProfileManagement';

describe('ProfileManagement', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    nativeLanguage: 'en',
  };

  const mockToken = 'mock-jwt-token';
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Profile Display', () => {
    it('renders current profile information', () => {
      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Profile Management')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getAllByText('test@example.com')).toHaveLength(2); // Appears in profile and account info
      expect(screen.getByText(/Native Language: en/i)).toBeInTheDocument();
    });

    it('displays avatar image when avatarUrl is provided', () => {
      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const avatar = screen.getByAltText('Profile avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('displays initials when no avatar is provided', () => {
      const userWithoutAvatar = { ...mockUser, avatarUrl: undefined };

      render(
        <ProfileManagement
          user={userWithoutAvatar}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of name
    });

    it('displays account information section', () => {
      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Account Information')).toBeInTheDocument();
      expect(screen.getByText('Email:')).toBeInTheDocument();
      expect(screen.getByText('User ID:')).toBeInTheDocument();
      expect(screen.getByText('user-123')).toBeInTheDocument();
    });
  });

  describe('Profile Form', () => {
    it('renders form with pre-filled values', () => {
      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
      const avatarInput = screen.getByLabelText(/Avatar URL/i) as HTMLInputElement;

      expect(nameInput.value).toBe('Test User');
      expect(avatarInput.value).toBe('https://example.com/avatar.jpg');
    });

    it('disables save button when form is not dirty', () => {
      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when form is modified', async () => {
      const user = userEvent.setup();

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeEnabled();
    });

    it('validates name is required', async () => {
      const user = userEvent.setup();

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('validates avatar URL format', async () => {
      const user = userEvent.setup();

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const avatarInput = screen.getByLabelText(/Avatar URL/i);
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      
      await user.clear(avatarInput);
      await user.type(avatarInput, 'not-a-valid-url');
      
      // Try to submit with invalid URL
      await user.click(submitButton);

      // Should not call onSuccess with invalid URL
      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('Profile Update', () => {
    it('successfully updates profile', async () => {
      const user = userEvent.setup();
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Profile updated successfully',
          user: updatedUser,
        }),
      });

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedUser);
      });

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/profile',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify({
            name: 'Updated Name',
            avatarUrl: 'https://example.com/avatar.jpg',
          }),
        })
      );
    });

    it('updates avatar URL', async () => {
      const user = userEvent.setup();
      const newAvatarUrl = 'https://example.com/new-avatar.jpg';
      const updatedUser = { ...mockUser, avatarUrl: newAvatarUrl };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Profile updated successfully',
          user: updatedUser,
        }),
      });

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const avatarInput = screen.getByLabelText(/Avatar URL/i);
      await user.clear(avatarInput);
      await user.type(avatarInput, newAvatarUrl);
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedUser);
      });
    });

    it('handles update errors', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      });

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Unauthorized')).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('disables form during submission', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Name')).toBeDisabled();
        expect(screen.getByLabelText(/Avatar URL/i)).toBeDisabled();
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      });
    });
  });

  describe('Cancel Button', () => {
    it('shows cancel button when form is dirty', async () => {
      const user = userEvent.setup();

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('resets form when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      expect(nameInput.value).toBe('Updated Name');

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(nameInput.value).toBe('Test User');
    });
  });

  describe('Avatar Preview', () => {
    it('updates avatar preview when URL changes', async () => {
      const user = userEvent.setup();

      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const avatarInput = screen.getByLabelText(/Avatar URL/i);
      const newUrl = 'https://example.com/new-avatar.jpg';

      await user.clear(avatarInput);
      await user.type(avatarInput, newUrl);

      const avatar = screen.getByAltText('Profile avatar');
      expect(avatar).toHaveAttribute('src', newUrl);
    });

    it('handles avatar load error gracefully', async () => {
      render(
        <ProfileManagement
          user={mockUser}
          token={mockToken}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const avatar = screen.getByAltText('Profile avatar');
      
      // Simulate image load error by firing the error event
      const errorEvent = new Event('error', { bubbles: true });
      Object.defineProperty(errorEvent, 'target', { value: avatar, enumerable: true });
      avatar.dispatchEvent(errorEvent);

      // Wait for state update
      await waitFor(() => {
        // After error, avatar should be removed and initials shown
        expect(screen.queryByAltText('Profile avatar')).not.toBeInTheDocument();
        expect(screen.getByText('T')).toBeInTheDocument(); // First letter of name
      });
    });
  });
});
