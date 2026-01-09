/**
 * Global error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ErrorCode } from '@recipe-journal/shared';
import logger from '../utils/logger.js';

/**
 * Custom error class for API errors
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Map error codes to HTTP status codes
 */
const errorStatusMap: Record<ErrorCode, number> = {
  [ErrorCode.INVALID_URL]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_MULTIPLIER]: 400,
  [ErrorCode.RECIPE_NOT_FOUND]: 404,
  [ErrorCode.UNSUPPORTED_SITE]: 400,
  [ErrorCode.SCRAPE_FAILED]: 502,
  [ErrorCode.BLOCKED_BY_SITE]: 403,
  [ErrorCode.PARSE_FAILED]: 422,
  [ErrorCode.NO_INGREDIENTS_FOUND]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.NETWORK_ERROR]: 502,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
    },
  };

  res.status(500).json(response);
}

/**
 * Create an AppError with appropriate status code
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): AppError {
  const statusCode = errorStatusMap[code] || 500;
  return new AppError(code, message, statusCode, details);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;
