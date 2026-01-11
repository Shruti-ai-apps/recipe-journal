/**
 * GET /api/health
 * Health check endpoint
 */

import { NextResponse } from 'next/server';
import { HealthResponse } from '@/types';

const startTime = Date.now();

export async function GET() {
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  return NextResponse.json(response, { status: 200 });
}
