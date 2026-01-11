/**
 * HTTP fetcher utility for scraping pages
 */

import { ErrorCode } from '@/types';
import { createError, logger } from '@/lib/utils';

export interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// Default timeout: 15 seconds
const DEFAULT_TIMEOUT = 15000;

/**
 * Get a random user agent
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Fetch a web page and return its HTML content
 */
export async function fetchPage(url: string, retries = 2): Promise<FetchResult> {
  const userAgent = getRandomUserAgent();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    logger.debug('Fetching page', { url, userAgent: userAgent.substring(0, 50) });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Get final URL after redirects
    const finalUrl = response.url || url;

    // Check for blocked responses
    if (response.status === 403 || response.status === 429) {
      throw createError(
        ErrorCode.BLOCKED_BY_SITE,
        'The website blocked the request. Please try again later.',
        { statusCode: response.status }
      );
    }

    if (response.status === 404) {
      throw createError(ErrorCode.RECIPE_NOT_FOUND, 'The recipe page was not found.');
    }

    if (response.status >= 400) {
      throw createError(ErrorCode.SCRAPE_FAILED, `Failed to fetch page: HTTP ${response.status}`);
    }

    if (response.status >= 500) {
      throw createError(ErrorCode.SCRAPE_FAILED, `Server error: HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw createError(
        ErrorCode.SCRAPE_FAILED,
        'The URL does not point to an HTML page'
      );
    }

    const html = await response.text();

    return {
      html,
      finalUrl,
      statusCode: response.status,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw createError(
        ErrorCode.NETWORK_ERROR,
        'Request timed out. The website may be slow or unavailable.'
      );
    }

    // Handle fetch errors
    if (error instanceof TypeError) {
      // Network errors in fetch throw TypeError
      if (retries > 0) {
        logger.debug('Retrying fetch', { url, retriesLeft: retries - 1 });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchPage(url, retries - 1);
      }

      throw createError(
        ErrorCode.NETWORK_ERROR,
        `Network error: ${error.message}`
      );
    }

    // Re-throw AppErrors
    if (error instanceof Error && error.name === 'AppError') {
      throw error;
    }

    throw createError(
      ErrorCode.SCRAPE_FAILED,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}
