/**
 * Gemini AI Client
 *
 * Singleton client for Google's Gemini 2.5 Flash-Lite model
 */

import { GoogleGenAI } from '@google/genai';

/** Singleton Gemini client instance */
let geminiClient: GoogleGenAI | null = null;

/** Model to use for smart scaling */
export const GEMINI_MODEL = 'gemini-2.5-flash-lite';

/**
 * Get or create the Gemini client singleton
 * @throws Error if GEMINI_API_KEY is not set
 */
export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY environment variable is not set. ' +
        'Get your API key from https://aistudio.google.com/'
      );
    }

    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Default generation config for scaling tasks
 */
export const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.3,        // Low for consistent, predictable output
  maxOutputTokens: 2048,   // Sufficient for ingredient list + tips
  topP: 0.8,
  topK: 40,
};
