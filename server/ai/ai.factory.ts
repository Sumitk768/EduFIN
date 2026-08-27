import { IAIProvider } from './ai-provider.interface';
import { geminiAIProvider } from './gemini-ai.provider';

let activeAIProvider: IAIProvider = geminiAIProvider;

/**
 * Retrieves the currently active AI provider.
 */
export function getAIProvider(): IAIProvider {
  return activeAIProvider;
}

/**
 * Overrides the active AI provider (useful for tests or custom provider injection).
 */
export function setAIProvider(provider: IAIProvider): void {
  activeAIProvider = provider;
}

/**
 * Resets the active AI provider to the standard Gemini implementation.
 */
export function resetAIProvider(): void {
  activeAIProvider = geminiAIProvider;
}
