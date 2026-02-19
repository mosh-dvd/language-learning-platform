import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  nativeLanguage: z.string().min(2, 'Please select your native language'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  nativeLanguage: string;
}

export interface AuthenticationFormProps {
  mode: 'login' | 'register';
  onSuccess: (user: User, token: string) => void;
  onError: (error: Error) => void;
  onModeChange?: (mode: 'login' | 'register') => void;
}

export const AuthenticationForm: React.FC<AuthenticationFormProps> = ({
  mode,
  onSuccess,
  onError,
  onModeChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData | LoginFormData>({
    resolver: zodResolver(mode === 'register' ? registerSchema : loginSchema),
  });

  const handleFormSubmit = async (data: RegisterFormData | LoginFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const endpoint = mode === 'register' ? 'http://localhost:3000/api/auth/register' : 'http://localhost:3000/api/auth/login';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Authentication failed');
      }

      const result = await response.json();

      // Both register and login now return token directly
      onSuccess(result.user, result.token);
      reset();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('An unexpected error occurred');
      setErrorMessage(err.message);
      onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // In a real implementation, this would redirect to OAuth provider
      // For now, we'll simulate the OAuth flow
      setErrorMessage(`OAuth with ${provider} is not yet configured. Please use email/password.`);
      onError(new Error(`OAuth with ${provider} not configured`));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('OAuth authentication failed');
      setErrorMessage(err.message);
      onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <div className="bg-white shadow-md rounded-lg px-4 sm:px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-gray-800">
          {mode === 'register' ? 'Create Account' : 'Sign In'}
        </h2>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                {...register('name' as any, { required: 'Name is required' })}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-red-500 text-xs italic mt-1">{errors.name.message}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-500 text-xs italic mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register('password', { required: 'Password is required' })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-500 text-xs italic mt-1">{errors.password.message}</p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="nativeLanguage" className="block text-gray-700 text-sm font-bold mb-2">
                Native Language
              </label>
              <select
                id="nativeLanguage"
                {...register('nativeLanguage' as any, { required: 'Please select your native language' })}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Select your native language</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="ar">Arabic</option>
                <option value="he">Hebrew</option>
              </select>
              {errors.nativeLanguage && (
                <p className="text-red-500 text-xs italic mt-1">{errors.nativeLanguage.message}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="ml-2">Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin('facebook')}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="ml-2">Facebook</span>
            </button>
          </div>
        </div>

        {onModeChange && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
