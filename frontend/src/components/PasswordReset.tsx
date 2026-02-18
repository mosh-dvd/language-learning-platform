import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export interface PasswordResetProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

type ResetStep = 'request' | 'confirm';

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const confirmSchema = z.object({
  token: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
});

type RequestFormData = z.infer<typeof requestSchema>;
type ConfirmFormData = z.infer<typeof confirmSchema>;

export const PasswordReset: React.FC<PasswordResetProps> = ({ onSuccess, onError }) => {
  const [step, setStep] = useState<ResetStep>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string>('');

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: requestErrors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  const {
    register: registerConfirm,
    handleSubmit: handleSubmitConfirm,
    formState: { errors: confirmErrors },
    watch,
  } = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
  });

  const newPassword = watch('newPassword');

  const handleRequestReset = async (data: RequestFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to request password reset');
      }

      // In development, the token is returned in the response
      // In production, it would be sent via email
      if (result.token) {
        setResetToken(result.token);
      }

      setSuccessMessage(
        'If an account exists with this email, a password reset link has been sent. Check your email.'
      );
      setStep('confirm');
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

  const handleConfirmReset = async (data: ConfirmFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate passwords match
    if (data.newPassword !== data.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (data.newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const tokenToUse = data.token || resetToken;

      if (!tokenToUse) {
        throw new Error('Reset token is required');
      }

      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenToUse,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setSuccessMessage('Password reset successful! You can now log in with your new password.');
      
      if (onSuccess) {
        onSuccess();
      }
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

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {step === 'request' ? 'Reset Password' : 'Set New Password'}
        </h2>

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

        {step === 'request' ? (
          <form onSubmit={handleSubmitRequest(handleRequestReset)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...registerRequest('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {requestErrors.email && (
                <p className="text-red-500 text-xs italic mt-1">{requestErrors.email.message}</p>
              )}
            </div>

            <p className="text-sm text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitConfirm(handleConfirmReset)} className="space-y-4">
            {!resetToken && (
              <div>
                <label htmlFor="token" className="block text-gray-700 text-sm font-bold mb-2">
                  Reset Token
                </label>
                <input
                  id="token"
                  type="text"
                  {...registerConfirm('token', { required: 'Reset token is required' })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the token from your email"
                  disabled={isLoading}
                />
                {confirmErrors.token && (
                  <p className="text-red-500 text-xs italic mt-1">{confirmErrors.token.message}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                {...registerConfirm('newPassword', {
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                disabled={isLoading}
              />
              {confirmErrors.newPassword && (
                <p className="text-red-500 text-xs italic mt-1">{confirmErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...registerConfirm('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === newPassword || 'Passwords do not match',
                })}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                disabled={isLoading}
              />
              {confirmErrors.confirmPassword && (
                <p className="text-red-500 text-xs italic mt-1">
                  {confirmErrors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => setStep('request')}
              disabled={isLoading}
              className="w-full text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              Back to email entry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
