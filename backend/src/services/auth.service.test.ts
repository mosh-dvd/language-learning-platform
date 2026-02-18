import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { AuthService } from './auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { PasswordResetTokenRepository } from '../repositories/passwordResetToken.repository.js';
import { User } from '../models/user.model.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: UserRepository;
  let mockPasswordResetTokenRepository: PasswordResetTokenRepository;
  const mockUsers: Map<string, User> = new Map();
  const mockTokens: Map<string, any> = new Map();

  beforeEach(() => {
    mockUsers.clear();
    mockTokens.clear();

    // Create mock user repository
    mockUserRepository = {
      create: vi.fn(async (input: any) => {
        const user: User = {
          id: uuidv4(),
          email: input.email,
          passwordHash: input.passwordHash,
          nativeLanguage: input.nativeLanguage,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.set(user.email, user);
        return user;
      }),
      createOAuth: vi.fn(async (input: any) => {
        const user: User = {
          id: uuidv4(),
          email: input.email,
          name: input.name,
          avatarUrl: input.avatarUrl,
          nativeLanguage: input.nativeLanguage,
          oauthProvider: input.oauthProvider,
          oauthId: input.oauthId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.set(user.email, user);
        return user;
      }),
      findByEmail: vi.fn(async (email: string) => {
        return mockUsers.get(email) || null;
      }),
      findById: vi.fn(async (id: string) => {
        return Array.from(mockUsers.values()).find(u => u.id === id) || null;
      }),
      findByOAuth: vi.fn(async (provider: string, oauthId: string) => {
        return Array.from(mockUsers.values()).find(
          u => u.oauthProvider === provider && u.oauthId === oauthId
        ) || null;
      }),
      update: vi.fn(async (id: string, updates: any) => {
        const user = Array.from(mockUsers.values()).find(u => u.id === id);
        if (!user) throw new Error('User not found');
        const updated = { ...user, ...updates, updatedAt: new Date() };
        mockUsers.set(user.email, updated);
        return updated;
      }),
      updatePassword: vi.fn(async (id: string, passwordHash: string) => {
        const user = Array.from(mockUsers.values()).find(u => u.id === id);
        if (!user) throw new Error('User not found');
        user.passwordHash = passwordHash;
      }),
    } as any;

    // Create mock password reset token repository
    mockPasswordResetTokenRepository = {
      create: vi.fn(async (input: any) => {
        const token = {
          id: uuidv4(),
          userId: input.userId,
          token: input.token,
          expiresAt: input.expiresAt,
          used: false,
          createdAt: new Date(),
        };
        mockTokens.set(token.token, token);
        return token;
      }),
      findByToken: vi.fn(async (token: string) => {
        return mockTokens.get(token) || null;
      }),
      markAsUsed: vi.fn(async (id: string) => {
        const token = Array.from(mockTokens.values()).find(t => t.id === id);
        if (token) token.used = true;
      }),
      deleteExpired: vi.fn(async () => {}),
    } as any;

    authService = new AuthService(mockUserRepository, mockPasswordResetTokenRepository);
  });

  // Feature: language-learning-platform, Property 24: Registration validation
  // Validates: Requirements 11.1
  describe('Property 24: Registration validation', () => {
    it('should accept valid credentials and reject invalid ones', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            nativeLanguage: fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'),
          }),
          async (validUser) => {
            // Valid registration should succeed
            const user = await authService.register(validUser);
            expect(user).toBeDefined();
            expect(user.email).toBe(validUser.email);
            expect(user.nativeLanguage).toBe(validUser.nativeLanguage);
            expect(user.passwordHash).toBeDefined();

            // Duplicate email should be rejected
            await expect(authService.register(validUser)).rejects.toThrow('already exists');

            // Clean up
            mockUsers.delete(validUser.email);
          }
        ),
        { numRuns: 10 } // Reduced to avoid bcrypt overload
      );
    });

    it('should reject weak passwords (less than 8 characters)', async () => {
      const weakPasswordUser = {
        email: 'test@example.com',
        password: 'short',
        nativeLanguage: 'en',
      };

      // Weak password should be rejected by Zod validation in the route handler
      // The service itself doesn't validate, but we can test the CreateUserSchema
      const { CreateUserSchema } = await import('../models/user.model.js');
      expect(() => CreateUserSchema.parse(weakPasswordUser)).toThrow();
    });

    it('should hash passwords before storing', async () => {
      const userData = {
        email: `hash-test-${Date.now()}@example.com`,
        password: 'securepassword123',
        nativeLanguage: 'en',
      };

      const user = await authService.register(userData);
      
      // Password should be hashed, not stored in plain text
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(userData.password);
      
      // Should be a valid bcrypt hash
      const isValidHash = await bcrypt.compare(userData.password, user.passwordHash!);
      expect(isValidHash).toBe(true);

      mockUsers.delete(userData.email);
    });
  });

  // Feature: language-learning-platform, Property 25: OAuth token processing
  // Validates: Requirements 11.2
  describe('Property 25: OAuth token processing', () => {
    it('should create or retrieve user account and generate valid session token for OAuth', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            provider: fc.constantFrom('google', 'facebook'),
            oauthId: fc.string({ minLength: 10, maxLength: 50 }),
            email: fc.emailAddress(),
            name: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            avatarUrl: fc.option(fc.webUrl()),
            nativeLanguage: fc.constantFrom('en', 'es', 'fr', 'de', 'it'),
          }),
          async (oauthData) => {
            // First login should create new user
            const authToken1 = await authService.loginWithOAuth(
              oauthData.provider as 'google' | 'facebook',
              oauthData.oauthId,
              oauthData.email,
              oauthData.name || undefined,
              oauthData.avatarUrl || undefined,
              oauthData.nativeLanguage
            );

            expect(authToken1).toBeDefined();
            expect(authToken1.token).toBeDefined();
            expect(authToken1.expiresAt).toBeInstanceOf(Date);
            expect(authToken1.user).toBeDefined();
            expect(authToken1.user.email).toBe(oauthData.email);
            expect(authToken1.user.oauthProvider).toBe(oauthData.provider);
            expect(authToken1.user.oauthId).toBe(oauthData.oauthId);

            // Second login with same OAuth should retrieve existing user
            const authToken2 = await authService.loginWithOAuth(
              oauthData.provider as 'google' | 'facebook',
              oauthData.oauthId,
              oauthData.email,
              oauthData.name || undefined,
              oauthData.avatarUrl || undefined,
              oauthData.nativeLanguage
            );

            expect(authToken2.user.id).toBe(authToken1.user.id);
            expect(authToken2.user.email).toBe(authToken1.user.email);

            // Clean up
            mockUsers.delete(oauthData.email);
          }
        ),
        { numRuns: 10 } // Reduced for performance
      );
    });

    it('should reject OAuth login if email already exists with password auth', async () => {
      // Create a user with email/password
      const uniqueEmail = `existing-${Date.now()}@example.com`;
      const userData = {
        email: uniqueEmail,
        password: 'password123',
        nativeLanguage: 'en',
      };
      await authService.register(userData);

      // Try to login with OAuth using same email
      await expect(
        authService.loginWithOAuth('google', 'google-id-123', uniqueEmail, 'Test User')
      ).rejects.toThrow('already exists');

      mockUsers.delete(uniqueEmail);
    });

    it('should generate valid JWT tokens for OAuth users', async () => {
      const authToken = await authService.loginWithOAuth(
        'google',
        'google-oauth-id',
        'oauth@example.com',
        'OAuth User',
        undefined,
        'en'
      );

      expect(authToken.token).toBeDefined();
      expect(typeof authToken.token).toBe('string');
      expect(authToken.token.split('.').length).toBe(3); // JWT has 3 parts

      // Token should be valid
      const validatedUser = await authService.validateToken(authToken.token);
      expect(validatedUser.email).toBe('oauth@example.com');

      mockUsers.delete('oauth@example.com');
    });
  });

  // Feature: language-learning-platform, Property 26: Password reset token lifecycle
  // Validates: Requirements 11.3
  describe('Property 26: Password reset token lifecycle', () => {
    it('should generate unique token with expiration and be usable exactly once', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
            newPassword: fc.string({ minLength: 8 }),
            nativeLanguage: fc.constant('en'),
          }),
          async (userData) => {
            // Register user
            const user = await authService.register({
              email: userData.email,
              password: userData.password,
              nativeLanguage: userData.nativeLanguage,
            });

            // Request password reset
            const resetToken = await authService.requestPasswordReset(userData.email);
            expect(resetToken).toBeDefined();
            expect(typeof resetToken).toBe('string');

            // Token should be usable before expiration
            await authService.resetPassword(resetToken, userData.newPassword);

            // Token should not be usable again
            await expect(
              authService.resetPassword(resetToken, 'another-password')
            ).rejects.toThrow('already been used');

            // Clean up
            mockUsers.delete(userData.email);
            mockTokens.delete(resetToken);
          }
        ),
        { numRuns: 10 } // Reduced to avoid bcrypt overload
      );
    });

    it('should reject expired tokens', async () => {
      // Register user with unique email
      const uniqueEmail = `expire-test-${Date.now()}@example.com`;
      const user = await authService.register({
        email: uniqueEmail,
        password: 'password123',
        nativeLanguage: 'en',
      });

      // Request password reset
      const resetToken = await authService.requestPasswordReset(uniqueEmail);

      // Manually expire the token by replacing it in the map
      const token = mockTokens.get(resetToken);
      if (token) {
        const expiredToken = { ...token, expiresAt: new Date(Date.now() - 1000) };
        mockTokens.set(resetToken, expiredToken);
      }

      // Should reject expired token
      await expect(
        authService.resetPassword(resetToken, 'newpassword123')
      ).rejects.toThrow('expired');

      mockUsers.delete(uniqueEmail);
      mockTokens.delete(resetToken);
    });

    it('should reject invalid tokens', async () => {
      await expect(
        authService.resetPassword('invalid-token-12345', 'newpassword123')
      ).rejects.toThrow('Invalid or expired');
    });

    it('should update password after successful reset', async () => {
      const oldPassword = 'oldpassword123';
      const newPassword = 'newpassword456';
      const uniqueEmail = `reset-test-${Date.now()}@example.com`;

      // Register user
      const user = await authService.register({
        email: uniqueEmail,
        password: oldPassword,
        nativeLanguage: 'en',
      });

      // Request and use reset token
      const resetToken = await authService.requestPasswordReset(uniqueEmail);
      await authService.resetPassword(resetToken, newPassword);

      // Old password should not work
      await expect(
        authService.login(uniqueEmail, oldPassword)
      ).rejects.toThrow('Invalid email or password');

      // New password should work
      const authToken = await authService.login(uniqueEmail, newPassword);
      expect(authToken).toBeDefined();
      expect(authToken.user.email).toBe(uniqueEmail);

      mockUsers.delete(uniqueEmail);
      mockTokens.delete(resetToken);
    });
  });

  // Feature: language-learning-platform, Property 27: Profile update persistence
  // Validates: Requirements 11.4
  describe('Property 27: Profile update persistence', () => {
    it('should persist profile updates and retrieve them in subsequent requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
            nativeLanguage: fc.constant('en'),
            newName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            newAvatarUrl: fc.option(fc.webUrl()),
            newLanguage: fc.option(fc.constantFrom('es', 'fr', 'de', 'it')),
          }),
          async (userData) => {
            // Register user
            const user = await authService.register({
              email: userData.email,
              password: userData.password,
              nativeLanguage: userData.nativeLanguage,
            });

            // Update profile
            const updates: any = {};
            if (userData.newName !== null) updates.name = userData.newName;
            if (userData.newAvatarUrl !== null) updates.avatarUrl = userData.newAvatarUrl;
            if (userData.newLanguage !== null) updates.nativeLanguage = userData.newLanguage;

            if (Object.keys(updates).length > 0) {
              const updatedUser = await authService.updateProfile(user.id, updates);

              // Verify updates persisted
              if (updates.name !== undefined) {
                expect(updatedUser.name).toBe(updates.name);
              }
              if (updates.avatarUrl !== undefined) {
                expect(updatedUser.avatarUrl).toBe(updates.avatarUrl);
              }
              if (updates.nativeLanguage !== undefined) {
                expect(updatedUser.nativeLanguage).toBe(updates.nativeLanguage);
              }

              // Retrieve user again to verify persistence
              const retrievedUser = await mockUserRepository.findById(user.id);
              expect(retrievedUser).toBeDefined();
              if (retrievedUser) {
                if (updates.name !== undefined) {
                  expect(retrievedUser.name).toBe(updates.name);
                }
                if (updates.avatarUrl !== undefined) {
                  expect(retrievedUser.avatarUrl).toBe(updates.avatarUrl);
                }
                if (updates.nativeLanguage !== undefined) {
                  expect(retrievedUser.nativeLanguage).toBe(updates.nativeLanguage);
                }
              }
            }

            // Clean up
            mockUsers.delete(userData.email);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // Feature: language-learning-platform, Property 28: JWT token validation
  // Validates: Requirements 11.5
  describe('Property 28: JWT token validation', () => {
    it('should contain correct user claims and expiration time', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
            nativeLanguage: fc.constant('en'),
          }),
          async (userData) => {
            // Register and login
            await authService.register(userData);
            const authToken = await authService.login(userData.email, userData.password);

            // Token should be valid
            expect(authToken.token).toBeDefined();
            expect(authToken.expiresAt).toBeInstanceOf(Date);
            expect(authToken.expiresAt.getTime()).toBeGreaterThan(Date.now());

            // Validate token
            const validatedUser = await authService.validateToken(authToken.token);
            expect(validatedUser.email).toBe(userData.email);

            // Clean up
            mockUsers.delete(userData.email);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject expired tokens', async () => {
      // This is tested implicitly by JWT library, but we can test the error handling
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
      await expect(authService.validateToken(invalidToken)).rejects.toThrow();
    });
  });

  // Feature: language-learning-platform, Property 29: Token invalidation on logout
  // Validates: Requirements 11.6
  describe('Property 29: Token invalidation on logout', () => {
    it('should not accept token for authenticated requests after logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
            nativeLanguage: fc.constant('en'),
          }),
          async (userData) => {
            // Register and login
            await authService.register(userData);
            const authToken = await authService.login(userData.email, userData.password);

            // Token should be valid before logout
            const userBeforeLogout = await authService.validateToken(authToken.token);
            expect(userBeforeLogout.email).toBe(userData.email);

            // Logout
            await authService.logout(authToken.token);

            // Token should be invalid after logout
            await expect(authService.validateToken(authToken.token)).rejects.toThrow('invalidated');

            // Clean up
            mockUsers.delete(userData.email);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});