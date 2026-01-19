/**
 * POST /api/recipes/scale
 * Scale a recipe by a given multiplier
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { scalingService } from '@/lib/scaling';
import { toApiError, getErrorStatusCode } from '@/lib/utils/errors';
import { ErrorCode, ScaleRecipeResponse, Recipe, ScalingOptions } from '@/types';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { recipe, options } = body as { recipe: Recipe; options: ScalingOptions };

    // Validate input
    if (!recipe || !options) {
      return NextResponse.json<ScaleRecipeResponse>(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Recipe and options are required',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
          },
        },
        { status: 400 }
      );
    }

    // Validate multiplier
    if (typeof options.multiplier !== 'number' || options.multiplier < 0.1 || options.multiplier > 10) {
      return NextResponse.json<ScaleRecipeResponse>(
        {
          success: false,
          error: {
            code: ErrorCode.INVALID_MULTIPLIER,
            message: 'Multiplier must be between 0.1 and 10',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
          },
        },
        { status: 400 }
      );
    }

    // Scale the recipe
    const scaledRecipe = await scalingService.scaleRecipe(recipe, options);

    return NextResponse.json<ScaleRecipeResponse>(
      {
        success: true,
        data: scaledRecipe,
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const apiError = toApiError(error);
    const statusCode = getErrorStatusCode(error);

    return NextResponse.json<ScaleRecipeResponse>(
      {
        success: false,
        error: apiError,
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
        },
      },
      { status: statusCode }
    );
  }
}
