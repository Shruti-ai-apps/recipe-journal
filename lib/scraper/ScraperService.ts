/**
 * Main scraper service that orchestrates recipe scraping
 */

import { Recipe, ErrorCode } from '@/types';
import { createError, logger } from '@/lib/utils';
import { SchemaOrgScraper } from './strategies/SchemaOrgScraper';
import { GenericDomScraper } from './strategies/GenericDomScraper';
import { fetchPage, FetchResult } from './utils/fetcher';
import { CacheService } from '@/lib/cache';

export interface ScrapeResult {
  recipe: Recipe;
  method: 'schema-org' | 'dom' | 'puppeteer';
}

export class ScraperService {
  private cache: CacheService;
  private schemaOrgScraper: SchemaOrgScraper;
  private genericDomScraper: GenericDomScraper;

  constructor() {
    this.cache = new CacheService();
    this.schemaOrgScraper = new SchemaOrgScraper();
    this.genericDomScraper = new GenericDomScraper();
  }

  /**
   * Scrape a recipe from the given URL
   */
  async scrapeRecipe(url: string): Promise<Recipe> {
    // Validate URL
    const parsedUrl = this.validateUrl(url);

    // Check cache first
    const cached = this.cache.get<Recipe>(url);
    if (cached) {
      logger.debug('Cache hit for URL', { url });
      return cached;
    }

    logger.info('Scraping recipe', { url, domain: parsedUrl.hostname });

    // Fetch the page
    const fetchResult = await fetchPage(url);

    // Try scraping strategies in order
    const recipe = await this.tryScrapingStrategies(fetchResult, parsedUrl);

    // Cache the result
    this.cache.set(url, recipe);

    return recipe;
  }

  /**
   * Validate and parse URL
   */
  private validateUrl(url: string): URL {
    try {
      const parsed = new URL(url);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw createError(ErrorCode.INVALID_URL, 'URL must use HTTP or HTTPS protocol');
      }

      return parsed;
    } catch (error) {
      if (error instanceof Error && error.name === 'AppError') {
        throw error;
      }
      throw createError(ErrorCode.INVALID_URL, 'Invalid URL format');
    }
  }

  /**
   * Try different scraping strategies in order of preference
   */
  private async tryScrapingStrategies(fetchResult: FetchResult, url: URL): Promise<Recipe> {
    const { html, finalUrl } = fetchResult;
    const domain = url.hostname.replace('www.', '');

    // Strategy 1: Try Schema.org JSON-LD (most reliable)
    logger.debug('Trying Schema.org scraper');
    const schemaRecipe = await this.schemaOrgScraper.scrape(html, finalUrl, domain);
    if (schemaRecipe) {
      logger.info('Successfully scraped with Schema.org', { url: finalUrl });
      return schemaRecipe;
    }

    // Strategy 2: Try generic DOM parsing
    logger.debug('Trying generic DOM scraper');
    const domRecipe = await this.genericDomScraper.scrape(html, finalUrl, domain);
    if (domRecipe) {
      logger.info('Successfully scraped with DOM parser', { url: finalUrl });
      return domRecipe;
    }

    // All strategies failed
    logger.warn('All scraping strategies failed', { url: finalUrl });
    throw createError(
      ErrorCode.RECIPE_NOT_FOUND,
      'Could not find recipe data on this page. The page may not contain a recipe or uses an unsupported format.',
      { url: finalUrl }
    );
  }
}

// Export singleton instance
export const scraperService = new ScraperService();
