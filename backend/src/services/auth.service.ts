import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository.js';
import { PasswordResetTokenRepository } from '../repositories/passwordResetToken.repository.js';
import { User, CreateUserInput, CreateOAuthUserInput, UpdateUserInput } from '../models/user.model.js';
import { tokenBlacklist } from './tokenBlacklist.service.js';
import { cacheService } from './cache.service.js';
import pool from '../db/pool.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const RESET_TOKEN_EXPIRES_HOURS = 24;

export interface AuthToken {
  token: string;
  expiresAt: Date;
  user: Omit<User, 'passwordHash'>;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  private userRepository: UserRepository;
  private passwordResetTokenRepository: PasswordResetTokenRepository;

  constructor() {
    this.userRepository = new UserRepository(pool);
    this.passwordResetTokenRepository = new PasswordResetTokenRepository(pool);
  }

  async register(userData: CreateUserInput): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      passwordHash,
    });

    return user;
  }

  async login(email: string, password: string): Promise<AuthToken> {
    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user has a password (not OAuth-only)
    if (!user.passwordHash) {
      throw new Error('This account uses OAuth authentication');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    return this.generateAuthToken(user);
  }

  async loginWithOAuth(
    provider: 'google' | 'facebook',
    oauthId: string,
    email: string,
    name?: string,
    avatarUrl?: string,
    nativeLanguage?: string
  ): Promise<AuthToken> {
    // Try to find existing user by OAuth
    let user = await this.userRepository.findByOAuth(provider, oauthId);

    if (!user) {
      // Try to find by email
      user = await this.userRepository.findByEmail(email);

      if (user) {
        // User exists with email but not OAuth - this is a security concern
        // In production, you might want to link accounts or require verification
        throw new Error('An account with this email already exists. Please log in with your password.');
      }

      // Create new OAuth user
      const oauthUserData: CreateOAuthUserInput = {
        email,
        name,
        avatarUrl,
        nativeLanguage: nativeLanguage || 'en',
        oauthProvider: provider,
        oauthId,
      };

      user = await this.userRepository.createOAuth(oauthUserData);
    }

    // Generate JWT token
    return this.generateAuthToken(user);
  }

  async requestPasswordReset(email: string): Promise<string> {
    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      // But still return success to prevent email enumeration
      return 'reset-token-placeholder';
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRES_HOURS);

    // Save token
    await this.passwordResetTokenRepository.create({
      userId: user.id,
      token: resetToken,
      expiresAt,
    });

    // In production, send email here
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find token
    const resetToken = await this.passwordResetTokenRepository.findByToken(token);
    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token is used
    if (resetToken.used) {
      throw new Error('This reset token has already been used');
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      throw new Error('This reset token has expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update user password
    await this.userRepository.updatePassword(resetToken.userId, passwordHash);

    // Mark token as used
    await this.passwordResetTokenRepository.markAsUsed(resetToken.id);
  }

  async updateProfile(userId: string, updates: UpdateUserInput): Promise<User> {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update profile
    const updatedUser = await this.userRepository.update(userId, updates);
    return updatedUser;
  }

  async validateToken(token: string): Promise<User> {
    // Check if token is blacklisted in Redis
    const isBlacklisted = await cacheService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Token has been invalidated');
    }

    // Fallback to in-memory blacklist
    if (tokenBlacklist.isBlacklisted(token)) {
      throw new Error('Token has been invalidated');
    }

    try {
      // Verify JWT
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

      // Check cache for user session
      let user = await cacheService.getSession(payload.userId);
      
      if (!user) {
        // Get user from database
        user = await this.userRepository.findById(payload.userId);
        if (!user) {
          throw new Error('User not found');
        }
        
        // Cache user session
        await cacheService.setSession(payload.userId, user);
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // Decode token to get expiration
      const payload = jwt.decode(token) as JWTPayload;
      
      if (payload && payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        const ttl = payload.exp - now;
        
        if (ttl > 0) {
          // Add token to Redis blacklist with TTL
          await cacheService.blacklistToken(token, ttl);
        }
      }
      
      // Also add to in-memory blacklist as fallback
      tokenBlacklist.addToken(token);
      
      // Clear user session if we can get userId
      if (payload && payload.userId) {
        await cacheService.deleteSession(payload.userId);
      }
    } catch (error) {
      // If token is invalid, still add to in-memory blacklist
      tokenBlacklist.addToken(token);
    }
  }

  private generateAuthToken(user: User): AuthToken {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      token,
      expiresAt,
      user: userWithoutPassword,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
