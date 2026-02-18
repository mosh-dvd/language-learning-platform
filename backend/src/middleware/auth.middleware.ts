import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { tokenBlacklist } from '../services/tokenBlacklist.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  // Check if token is blacklisted
  if (tokenBlacklist.isBlacklisted(token)) {
    res.status(401).json({ error: 'Token has been invalidated' });
    return;
  }

  try {
    // Verify token
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token has expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  if (tokenBlacklist.isBlacklisted(token)) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.user = payload;
  } catch (error) {
    // Ignore errors for optional auth
  }

  next();
};
