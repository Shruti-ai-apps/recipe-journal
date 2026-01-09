/**
 * Health check routes
 */

import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get('/', getHealth);

export default router;
