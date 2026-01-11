import { ErrorCode } from '@/types';
import { AppError, createError, toApiError, getErrorStatusCode } from './errors';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('creates an error with correct properties', () => {
      const error = new AppError(ErrorCode.INVALID_URL, 'Invalid URL provided');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AppError');
      expect(error.code).toBe(ErrorCode.INVALID_URL);
      expect(error.message).toBe('Invalid URL provided');
      expect(error.statusCode).toBe(400);
    });

    it('includes details when provided', () => {
      const details = { field: 'url', received: 'not-a-url' };
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('createError', () => {
    it('creates an AppError instance', () => {
      const error = createError(ErrorCode.SCRAPE_FAILED, 'Could not scrape recipe');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.SCRAPE_FAILED);
      expect(error.statusCode).toBe(502);
    });
  });

  describe('toApiError', () => {
    it('converts AppError to API error format', () => {
      const error = new AppError(ErrorCode.RECIPE_NOT_FOUND, 'Recipe not found', { url: 'test.com' });
      const apiError = toApiError(error);

      expect(apiError).toEqual({
        code: ErrorCode.RECIPE_NOT_FOUND,
        message: 'Recipe not found',
        details: { url: 'test.com' },
      });
    });

    it('converts generic Error to API error format', () => {
      const error = new Error('Something went wrong');
      const apiError = toApiError(error);

      expect(apiError).toEqual({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Something went wrong',
      });
    });

    it('handles unknown error types', () => {
      const apiError = toApiError('string error');

      expect(apiError).toEqual({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
      });
    });
  });

  describe('getErrorStatusCode', () => {
    it('returns status code from AppError', () => {
      const error = new AppError(ErrorCode.RATE_LIMITED, 'Too many requests');

      expect(getErrorStatusCode(error)).toBe(429);
    });

    it('returns 500 for non-AppError', () => {
      expect(getErrorStatusCode(new Error('generic'))).toBe(500);
      expect(getErrorStatusCode('string')).toBe(500);
      expect(getErrorStatusCode(null)).toBe(500);
    });
  });
});
