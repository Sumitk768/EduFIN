import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger.util';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    logger.warn('GEMINI_API_KEY is not configured in process.env. AI-generated features will use structured fallback logic.');
    return null;
  }

  if (!geminiClient) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey,
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
