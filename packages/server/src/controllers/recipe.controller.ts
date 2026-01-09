/**
 * Recipe controller
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  ParseRecipeRequest,
  ScaleRecipeRequest,
  ParseRecipeResponse,
  ScaleRecipeResponse,
  ErrorCode,
} from '@recipe-journal/shared';
import { scraperService } from '../services/scraper/index.js';
import { ingredientParser } from '../services/ingredient/index.js';
import { scalingService } from '../services/scaling/index.js';
import { createError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Parse a recipe from URL
 */
export async function parseRecipe(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const requestId = uuidv4();
  const { url } = req.body as ParseRecipeRequest;

  logger.info('Parse recipe request', { requestId, url });

  // Validate input
  if (!url || typeof url !== 'string') {
    throw createError(ErrorCode.VALIDATION_ERROR, 'URL is required');
  }

  // Scrape the recipe
  const recipe = await scraperService.scrapeRecipe(url);

  // Parse ingredients
  recipe.ingredients = await ingredientParser.parseIngredients(
    recipe.rawData?.ingredients || recipe.ingredients.map((i) => i.original)
  );

  const response: ParseRecipeResponse = {
    success: true,
    data: recipe,
    meta: {
      requestId,
      processingTime: Date.now() - startTime,
    },
  };

  logger.info('Parse recipe success', {
    requestId,
    ingredientCount: recipe.ingredients.length,
    processingTime: response.meta?.processingTime,
  });

  res.json(response);
}

/**
 * Scale a recipe
 */
export async function scaleRecipe(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const requestId = uuidv4();
  const { recipe, options } = req.body as ScaleRecipeRequest;

  logger.info('Scale recipe request', {
    requestId,
    multiplier: options.multiplier,
    title: recipe?.title,
  });

  // Validate input
  if (!recipe) {
    throw createError(ErrorCode.VALIDATION_ERROR, 'Recipe is required');
  }

  if (!options || typeof options.multiplier !== 'number') {
    throw createError(ErrorCode.VALIDATION_ERROR, 'Scaling options with multiplier are required');
  }

  if (options.multiplier <= 0 || options.multiplier > 10) {
    throw createError(
      ErrorCode.INVALID_MULTIPLIER,
      'Multiplier must be between 0.1 and 10'
    );
  }

  // Scale the recipe
  const scaledRecipe = await scalingService.scaleRecipe(recipe, options);

  const response: ScaleRecipeResponse = {
    success: true,
    data: scaledRecipe,
    meta: {
      requestId,
      processingTime: Date.now() - startTime,
    },
  };

  logger.info('Scale recipe success', {
    requestId,
    multiplier: options.multiplier,
    processingTime: response.meta?.processingTime,
  });

  res.json(response);
}
