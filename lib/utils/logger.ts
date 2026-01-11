/* eslint-disable no-console */
/**
 * Simple logger utility for Next.js
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Set minimum log level based on environment
const MIN_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, meta));
    }
  },

  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, meta));
    }
  },

  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta));
    }
  },

  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, meta));
    }
  },
};

export default logger;
