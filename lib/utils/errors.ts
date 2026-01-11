/**
 * Error handling utilities for Next.js API routes
 */

import { ErrorCode, ApiError } from '@/types';

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = getStatusCode(code);
  }
}

/**
 * Create an application error
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(code, message, details);
}

/**
 * Get HTTP status code from error code
 */
function getStatusCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.INVALID_URL:
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_MULTIPLIER:
      return 400;
    case ErrorCode.RECIPE_NOT_FOUND:
      return 404;
    case ErrorCode.BLOCKED_BY_SITE:
    case ErrorCode.RATE_LIMITED:
      return 429;
    case ErrorCode.UNSUPPORTED_SITE:
    case ErrorCode.SCRAPE_FAILED:
    case ErrorCode.PARSE_FAILED:
    case ErrorCode.NO_INGREDIENTS_FOUND:
    case ErrorCode.NETWORK_ERROR:
      return 502;
    case ErrorCode.INTERNAL_ERROR:
    default:
      return 500;
  }
}

/**
 * Convert error to API error response
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message,
    };
  }

  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
  };
}

/**
 * Get status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}
