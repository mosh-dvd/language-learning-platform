import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  HttpError,
  ValidationError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
} from './errorHandler.middleware';
import * as logger from '../utils/logger';

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      url: '/test',
      method: 'GET',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();

    // Suppress console.error for tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('HttpError', () => {
    it('creates an HTTP error with correct properties', () => {
      const error = new HttpError(400, 'Bad request', 'BAD_REQUEST');

      expect(error.status).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.name).toBe('HttpError');
    });

    it('includes details if provided', () => {
      const details = { field: 'email' };
      const error = new HttpError(400, 'Bad request', 'BAD_REQUEST', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('creates a validation error with correct properties', () => {
      const errors = {
        email: ['Email is required'],
        password: ['Password is too short'],
      };
      const error = new ValidationError(errors);

      expect(error.status).toBe(422);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.validationErrors).toEqual(errors);
      expect(error.name).toBe('ValidationError');
    });

    it('accepts custom message', () => {
      const errors = { email: ['Invalid'] };
      const error = new ValidationError(errors, 'Custom message');

      expect(error.message).toBe('Custom message');
    });
  });

  describe('errorHandler', () => {
    it('handles HttpError correctly', () => {
      const error = new HttpError(400, 'Bad request', 'BAD_REQUEST');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: true,
        message: 'Bad request',
        code: 'BAD_REQUEST',
      });
    });

    it('handles ValidationError correctly', () => {
      const errors = { email: ['Email is required'] };
      const error = new ValidationError(errors);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: true,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors,
      });
    });

    it('handles generic Error as 500', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Internal server error',
        })
      );
    });

    it('includes error details when provided', () => {
      const details = { field: 'email', reason: 'duplicate' };
      const error = new HttpError(409, 'Conflict', 'CONFLICT', details);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details,
        })
      );
    });

    it('logs error information', () => {
      const error = new Error('Test error');
      const logSpy = vi.spyOn(logger, 'logApiError');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('creates a 404 error', () => {
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 404,
          code: 'NOT_FOUND',
          message: expect.stringContaining('not found'),
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('catches errors from async functions', async () => {
      const error = new Error('Async error');
      const asyncFn = async () => {
        throw error;
      };
      const handler = asyncHandler(asyncFn);

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('passes through successful async functions', async () => {
      const asyncFn = vi.fn().mockResolvedValue('success');
      const handler = asyncHandler(asyncFn);

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('createError helpers', () => {
    it('creates bad request error', () => {
      const error = createError.badRequest('Invalid input');

      expect(error.status).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('creates unauthorized error', () => {
      const error = createError.unauthorized();

      expect(error.status).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('creates forbidden error', () => {
      const error = createError.forbidden();

      expect(error.status).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('creates not found error', () => {
      const error = createError.notFound('Resource not found');

      expect(error.status).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('creates conflict error', () => {
      const error = createError.conflict('Duplicate entry');

      expect(error.status).toBe(409);
      expect(error.message).toBe('Duplicate entry');
      expect(error.code).toBe('CONFLICT');
    });

    it('creates validation error', () => {
      const errors = { email: ['Required'] };
      const error = createError.validation(errors);

      expect(error.status).toBe(422);
      expect(error.validationErrors).toEqual(errors);
    });

    it('creates internal error', () => {
      const error = createError.internal();

      expect(error.status).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });
});
