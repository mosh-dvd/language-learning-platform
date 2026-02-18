import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { CreateUserSchema, LoginSchema, UpdateUserSchema } from '../models/user.model.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - nativeLanguage
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: User password (minimum 8 characters)
 *               name:
 *                 type: string
 *                 description: User display name
 *               nativeLanguage:
 *                 type: string
 *                 description: User's native language code (e.g., en, es, fr)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
      const userData = CreateUserSchema.parse(req.body);
      const user = await authService.register(userData);

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      res.status(201).json({
        message: 'User registered successfully',
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login with email and password
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 format: password
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 token:
   *                   type: string
   *                   description: JWT authentication token
   *                 expiresAt:
   *                   type: string
   *                   format: date-time
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Login
  router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const authToken = await authService.login(email, password);

      res.json({
        message: 'Login successful',
        ...authToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(401).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/oauth/{provider}:
   *   post:
   *     summary: OAuth authentication
   *     tags: [Authentication]
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [google, facebook]
   *         description: OAuth provider
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - oauthId
   *               - email
   *             properties:
   *               oauthId:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               name:
   *                 type: string
   *               avatarUrl:
   *                 type: string
   *                 format: uri
   *               nativeLanguage:
   *                 type: string
   *     responses:
   *       200:
   *         description: OAuth login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 token:
   *                   type: string
   *                 expiresAt:
   *                   type: string
   *                   format: date-time
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid provider or missing required fields
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // OAuth login (simplified - in production, use Passport.js)
  router.post('/oauth/:provider', async (req: Request, res: Response): Promise<void> => {
    try {
      const { provider } = req.params;
      if (provider !== 'google' && provider !== 'facebook') {
        res.status(400).json({ error: 'Invalid OAuth provider' });
        return;
      }

      const { oauthId, email, name, avatarUrl, nativeLanguage } = req.body;

      if (!oauthId || !email) {
        res.status(400).json({ error: 'OAuth ID and email are required' });
        return;
      }

      const authToken = await authService.loginWithOAuth(
        provider,
        oauthId,
        email,
        name,
        avatarUrl,
        nativeLanguage
      );

      res.json({
        message: 'OAuth login successful',
        ...authToken,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/password-reset/request:
   *   post:
   *     summary: Request password reset
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Password reset email sent (if account exists)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 token:
   *                   type: string
   *                   description: Reset token (only in development)
   */
  // Request password reset
  router.post('/password-reset/request', async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const token = await authService.requestPasswordReset(email);

      // In production, don't return the token - send it via email
      res.json({
        message: 'If an account exists with this email, a password reset link has been sent',
        // Remove this in production:
        token,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/password-reset/confirm:
   *   post:
   *     summary: Confirm password reset with token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *               - newPassword
   *             properties:
   *               token:
   *                 type: string
   *                 description: Password reset token
   *               newPassword:
   *                 type: string
   *                 format: password
   *                 minLength: 8
   *     responses:
   *       200:
   *         description: Password reset successful
   *       400:
   *         description: Invalid token or password
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Reset password
  router.post('/password-reset/confirm', async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and new password are required' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      await authService.resetPassword(token, newPassword);

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Get current user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Get current user profile
  router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/profile:
   *   patch:
   *     summary: Update user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               avatarUrl:
   *                 type: string
   *                 format: uri
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Update profile
  router.patch('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updates = UpdateUserSchema.parse(req.body);
      const updatedUser = await authService.updateProfile(req.user.userId, updates);

      const { passwordHash, ...userWithoutPassword } = updatedUser;
      res.json({
        message: 'Profile updated successfully',
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Logout and invalidate token
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   */
  // Logout
  router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        await authService.logout(token);
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/validate:
   *   get:
   *     summary: Validate JWT token
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Token is valid
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 valid:
   *                   type: boolean
   *                 user:
   *                   type: object
   *                   properties:
   *                     userId:
   *                       type: string
   *                       format: uuid
   *       401:
   *         description: Token is invalid or expired
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Validate token (for client-side token validation)
  router.get('/validate', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      res.json({ valid: true, user: req.user });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

export default router;
