/**
 * Server configuration
 */

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  allowedOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  scraper: {
    timeout: number;
    userAgent: string;
    cacheEnabled: boolean;
    cacheTtlSeconds: number;
  };
}

function parseAllowedOrigins(envValue: string | undefined): string[] {
  if (!envValue) {
    return ['http://localhost:3000', 'http://localhost:5173'];
  }
  return envValue.split(',').map((origin) => origin.trim());
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10),
  },
  scraper: {
    timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '30000', 10),
    userAgent:
      process.env.SCRAPER_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10),
  },
};

export default config;
