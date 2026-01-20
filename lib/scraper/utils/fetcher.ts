/**
 * HTTP fetcher utility for scraping pages
 */

import { ErrorCode } from '@/types';
import { createError, logger } from '@/lib/utils';
import { promises as dns } from 'dns';
import net from 'net';

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

// Redirect and size limits to reduce SSRF/resource-exhaustion risk
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES =
  Number.parseInt(process.env.SCRAPER_MAX_HTML_BYTES || '', 10) || 2_000_000; // 2MB

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) return true;

  const [a, b] = parts;

  // 0.0.0.0/8, 127.0.0.0/8
  if (a === 0 || a === 127) return true;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (link-local, includes cloud metadata IPs)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // Multicast/reserved: 224.0.0.0/4, 240.0.0.0/4
  if (a >= 224) return true;

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  // Loopback / unspecified
  if (normalized === '::1' || normalized === '::') return true;

  // Unique local addresses fc00::/7
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local fe80::/10
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // Multicast ff00::/8
  if (normalized.startsWith('ff')) return true;

  // IPv4-mapped IPv6 addresses ::ffff:127.0.0.1 etc.
  const mappedMatch = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedMatch) {
    return isPrivateIpv4(mappedMatch[1]);
  }

  return false;
}

function isPrivateAddress(address: string): boolean {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) return isPrivateIpv4(address);
  if (ipVersion === 6) return isPrivateIpv6(address);
  return true;
}

async function assertSafeTargetUrl(url: URL): Promise<void> {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw createError(ErrorCode.INVALID_URL, 'URL must use HTTP or HTTPS protocol');
  }

  // Disallow credentials in URLs to avoid leaking secrets to third-party requests
  if (url.username || url.password) {
    throw createError(ErrorCode.INVALID_URL, 'URL must not include credentials');
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname) {
    throw createError(ErrorCode.INVALID_URL, 'Invalid URL hostname');
  }

  // Block obvious local targets
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw createError(ErrorCode.INVALID_URL, 'URL hostname is not allowed');
  }

  // If the hostname is an IP literal, validate it directly
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw createError(ErrorCode.INVALID_URL, 'URL resolves to a private or local address');
    }
    return;
  }

  // Resolve DNS and reject any private/local addresses (mitigates basic DNS rebinding)
  let lookups: Array<{ address: string }>;
  try {
    lookups = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw createError(ErrorCode.NETWORK_ERROR, 'Failed to resolve hostname');
  }

  if (!lookups.length) {
    throw createError(ErrorCode.NETWORK_ERROR, 'Hostname did not resolve to an address');
  }

  for (const { address } of lookups) {
    if (isPrivateAddress(address)) {
      throw createError(ErrorCode.INVALID_URL, 'URL resolves to a private or local address');
    }
  }
}

async function readTextWithLimit(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsed) && parsed > maxBytes) {
      throw createError(ErrorCode.SCRAPE_FAILED, 'Response is too large to process');
    }
  }

  if (!response.body) {
    return await response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let received = 0;
  const chunks: string[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    received += value.byteLength;
    if (received > maxBytes) {
      try {
        reader.cancel();
      } catch {
        // ignore
      }
      throw createError(ErrorCode.SCRAPE_FAILED, 'Response is too large to process');
    }

    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());
  return chunks.join('');
}

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
    const initialUrl = new URL(url);
    await assertSafeTargetUrl(initialUrl);

    logger.debug('Fetching page', { url, userAgent: userAgent.substring(0, 50) });

    let currentUrl = initialUrl;
    let response: Response | null = null;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      response = await fetch(currentUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'max-age=0',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      const isRedirect =
        response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308;

      if (!isRedirect) break;

      if (redirectCount === MAX_REDIRECTS) {
        throw createError(ErrorCode.SCRAPE_FAILED, 'Too many redirects');
      }

      const location = response.headers.get('location');
      if (!location) {
        throw createError(ErrorCode.SCRAPE_FAILED, `Redirect missing location header (HTTP ${response.status})`);
      }

      currentUrl = new URL(location, currentUrl);
      await assertSafeTargetUrl(currentUrl);
    }

    if (!response) {
      throw createError(ErrorCode.SCRAPE_FAILED, 'Failed to fetch page');
    }

    clearTimeout(timeoutId);

    // Get final URL after redirects
    const finalUrl = response.url || currentUrl.toString();

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

    if (response.status >= 500) {
      throw createError(ErrorCode.SCRAPE_FAILED, `Server error: HTTP ${response.status}`);
    }

    if (response.status >= 400) {
      throw createError(ErrorCode.SCRAPE_FAILED, `Failed to fetch page: HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw createError(
        ErrorCode.SCRAPE_FAILED,
        'The URL does not point to an HTML page'
      );
    }

    const html = await readTextWithLimit(response, MAX_HTML_BYTES);

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
