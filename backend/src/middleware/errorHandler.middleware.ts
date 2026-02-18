import { Request, Response, NextFunction } from 'express';
import logger, { logApiError } from '../utils/logger.js';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, any>;
  validationErrors?: Record<string, string[]>;
}

/**
 * Custom error class for API errors
 */
export class HttpError extends Error implements ApiError {
  status: number;
  code?: string;
  details?: Record<string, any>;
  validationErrors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends HttpError {
  validationErrors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>, message = 'Validation failed') {
    super(422, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.validationErrors = errors;
  }
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Log error with structured logging
  const userId = (req as any).user?.id;
  logApiError(req.method, req.path, err, userId);

  // Default error response
  let status = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let details: Record<string, any> | undefined;
  let validationErrors: Record<string, string[]> | undefined;

  // Handle known error types
  if (err instanceof ValidationError) {
    status = err.status;
    message = err.message;
    code = err.code;
    validationErrors = err.validationErrors;
  } else if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if ('status' in err && typeof err.status === 'number') {
    status = err.status;
    message = err.message;
    code = (err as ApiError).code;
    details = (err as ApiError).details;
    validationErrors = (err as ApiError).validationErrors;
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Internal server error';
    details = undefined;
  }

  // Send error response
  res.status(status).json({
    error: true,
    message,
    ...(code && { code }),
    ...(details && { details }),
    ...(validationErrors && { errors: validationErrors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new HttpError(
    404,
    `Route ${req.method} ${req.url} not found`,
    'NOT_FOUND'
  );
  next(error);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Helper functions to create common errors
 */
export const createError = {
  badRequest: (message: string, code?: string, details?: Record<string, any>) =>
    new HttpError(400, message, code || 'BAD_REQUEST', details),

  unauthorized: (message = 'Unauthorized', code?: string) =>
    new HttpError(401, message, code || 'UNAUTHORIZED'),

  forbidden: (message = 'Forbidden', code?: string) =>
    new HttpError(403, message, code || 'FORBIDDEN'),

  notFound: (message = 'Not found', code?: string) =>
    new HttpError(404, message, code || 'NOT_FOUND'),

  conflict: (message: string, code?: string, details?: Record<string, any>) =>
    new HttpError(409, message, code || 'CONFLICT', details),

  validation: (errors: Record<string, string[]>, message?: string) =>
    new ValidationError(errors, message),

  internal: (message = 'Internal server error', code?: string) =>
    new HttpError(500, message, code || 'INTERNAL_ERROR'),
};
