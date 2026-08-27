import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger.util';
import { config } from '../config/env';

let geminiClient: GoogleGenAI | null = null;

/**
 * Returns true if GEMINI_API_KEY is configured in the environment.
 */
export function hasGeminiApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Retrieves or lazily initializes the centralized GoogleGenAI SDK client.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    logger.warn('GEMINI_API_KEY is not configured in process.env. AI features will use structured fallback logic.');
    return null;
  }

  if (!geminiClient) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      logger.info('Google GenAI client initialized successfully with User-Agent telemetry.');
    } catch (err: any) {
      logger.error('Failed to initialize Google GenAI client:', err.message);
      return null;
    }
  }

  return geminiClient;
}

/**
 * Utility for resetting the cached client instance in tests.
 */
export function resetGeminiClientForTesting(): void {
  geminiClient = null;
}
