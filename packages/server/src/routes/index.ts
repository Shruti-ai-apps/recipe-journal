/**
 * Routes index - combines all route modules
 */

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import recipeRoutes from './recipe.routes.js';

const router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/recipes', recipeRoutes);

export default router;
