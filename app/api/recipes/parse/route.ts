/**
 * POST /api/recipes/parse
 * Parse a recipe from a URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { scraperService } from '@/lib/scraper';
import { ingredientParser } from '@/lib/ingredient';
import { toApiError, getErrorStatusCode } from '@/lib/utils/errors';
import { ErrorCode, ParseRecipeResponse } from '@/types';

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ParseRecipeResponse>(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid JSON body',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
          },
        },
        { status: 400 }
      );
    }

    const { url } = body as { url?: unknown };

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json<ParseRecipeResponse>(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'URL is required',
          },
          meta: {
            requestId,
            processingTime: Date.now() - startTime,
          },
        },
        { status: 400 }
      );
    }

    // Scrape the recipe
    const recipe = await scraperService.scrapeRecipe(url);

    // Parse ingredients for better structured data
    const parsedIngredients = await ingredientParser.parseIngredients(
      recipe.rawData?.ingredients || recipe.ingredients.map((i) => i.original)
    );

    // Update recipe with parsed ingredients
    const enrichedRecipe = {
      ...recipe,
      ingredients: parsedIngredients,
    };

    return NextResponse.json<ParseRecipeResponse>(
      {
        success: true,
        data: enrichedRecipe,
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

    return NextResponse.json<ParseRecipeResponse>(
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
