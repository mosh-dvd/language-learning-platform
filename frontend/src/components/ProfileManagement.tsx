import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  nativeLanguage: string;
}

export interface ProfileManagementProps {
  user: User;
  token: string;
  onSuccess?: (updatedUser: User) => void;
  onError?: (error: Error) => void;
}

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  avatarUrl: z.string().regex(/^https?:\/\/.+/, 'Please enter a valid URL').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileManagement: React.FC<ProfileManagementProps> = ({
  user,
  token,
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user.avatarUrl);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      avatarUrl: user.avatarUrl || '',
    },
  });

  const avatarUrl = watch('avatarUrl');

  useEffect(() => {
    setAvatarPreview(avatarUrl);
  }, [avatarUrl]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          avatarUrl: data.avatarUrl || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setSuccessMessage('Profile updated successfully!');
      
      if (onSuccess) {
        onSuccess(result.user);
      }

      // Reset form with new values to clear dirty state
      reset({
        name: result.user.name || '',
        avatarUrl: result.user.avatarUrl || '',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('An unexpected error occurred');
      setErrorMessage(err.message);
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarError = () => {
    setAvatarPreview(undefined);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Profile Management</h2>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
            {successMessage}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Current Profile</h3>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile avatar"
                  className="w-16 h-16 rounded-full object-cover"
                  onError={handleAvatarError}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-gray-900 font-medium">{user.name || 'No name set'}</p>
              <p className="text-gray-600 text-sm">{user.email}</p>
              <p className="text-gray-500 text-xs mt-1">Native Language: {user.nativeLanguage}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleProfileUpdate)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 1,
                  message: 'Name must not be empty',
                },
              })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-red-500 text-xs italic mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="avatarUrl" className="block text-gray-700 text-sm font-bold mb-2">
              Avatar URL (optional)
            </label>
            <input
              id="avatarUrl"
              type="url"
              {...register('avatarUrl', {
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Please enter a valid URL',
                },
              })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/avatar.jpg"
              disabled={isLoading}
            />
            {errors.avatarUrl && (
              <p className="text-red-500 text-xs italic mt-1">{errors.avatarUrl.message}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Enter a URL to an image to use as your profile picture
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={() => reset()}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded focus:outline-none"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="text-gray-900 font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="text-gray-900 font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Native Language:</span>
              <span className="text-gray-900 font-medium">{user.nativeLanguage}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
