import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import apiClient from '../../utils/apiClient';

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  nativeLanguage: string;
  oauthProvider?: 'google' | 'facebook';
  createdAt: string;
  updatedAt: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nativeLanguage: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface OAuthLoginData {
  provider: 'google' | 'facebook';
  oauthId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  nativeLanguage?: string;
}

export interface AuthToken {
  token: string;
  expiresAt: string;
  user: User;
}

export interface ProfileUpdate {
  name?: string;
  avatarUrl?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Hook to register a new user
 */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiClient.post<{ user: User; message: string }>('/auth/register', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate auth queries
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
  });
}

/**
 * Hook to login
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiClient.post<AuthToken & { message: string }>('/auth/login', data);
      // Store token in localStorage
      localStorage.setItem('authToken', response.data.token);
      return response.data;
    },
    onSuccess: (data) => {
      // Set user data in cache
      queryClient.setQueryData(queryKeys.auth.profile, { user: data.user });
    },
  });
}

/**
 * Hook to login with OAuth
 */
export function useOAuthLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OAuthLoginData) => {
      const { provider, ...oauthData } = data;
      const response = await apiClient.post<AuthToken & { message: string }>(
        `/auth/oauth/${provider}`,
        oauthData
      );
      // Store token in localStorage
      localStorage.setItem('authToken', response.data.token);
      return response.data;
    },
    onSuccess: (data) => {
      // Set user data in cache
      queryClient.setQueryData(queryKeys.auth.profile, { user: data.user });
    },
  });
}

/**
 * Hook to logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ message: string }>('/auth/logout');
      // Remove token from localStorage
      localStorage.removeItem('authToken');
      return response.data;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
    },
  });
}

/**
 * Hook to get current user profile
 */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: async () => {
      const response = await apiClient.get<{ user: User }>('/auth/profile');
      return response.data.user;
    },
    enabled: !!localStorage.getItem('authToken'),
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const response = await apiClient.patch<{ user: User; message: string }>('/auth/profile', data);
      return response.data.user;
    },
    onSuccess: (updatedUser) => {
      // Update user in cache with optimistic update
      queryClient.setQueryData(queryKeys.auth.profile, updatedUser);
    },
  });
}

/**
 * Hook to request password reset
 */
export function usePasswordResetRequest() {
  return useMutation({
    mutationFn: async (data: PasswordResetRequest) => {
      const response = await apiClient.post<{ message: string; token?: string }>(
        '/auth/password-reset/request',
        data
      );
      return response.data;
    },
  });
}

/**
 * Hook to confirm password reset
 */
export function usePasswordResetConfirm() {
  return useMutation({
    mutationFn: async (data: PasswordResetConfirm) => {
      const response = await apiClient.post<{ message: string }>(
        '/auth/password-reset/confirm',
        data
      );
      return response.data;
    },
  });
}

/**
 * Hook to validate token
 */
export function useValidateToken() {
  return useQuery({
    queryKey: queryKeys.auth.validate,
    queryFn: async () => {
      const response = await apiClient.get<{ valid: boolean; user: any }>('/auth/validate');
      return response.data;
    },
    enabled: !!localStorage.getItem('authToken'),
    retry: false,
  });
}
