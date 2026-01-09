/**
 * Recipe routes
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { parseRecipe, scaleRecipe } from '../controllers/recipe.controller.js';

const router = Router();

/**
 * @route POST /api/recipes/parse
 * @description Parse a recipe from a URL
 */
router.post('/parse', asyncHandler(parseRecipe));

/**
 * @route POST /api/recipes/scale
 * @description Scale a parsed recipe
 */
router.post('/scale', asyncHandler(scaleRecipe));

export default router;
