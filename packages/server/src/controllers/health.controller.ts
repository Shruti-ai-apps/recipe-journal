/**
 * Health check controller
 */

import { Request, Response } from 'express';
import { HealthResponse } from '@recipe-journal/shared';

const startTime = Date.now();
const version = '1.0.0';

/**
 * Health check endpoint handler
 */
export function getHealth(_req: Request, res: Response): void {
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  res.json(response);
}
