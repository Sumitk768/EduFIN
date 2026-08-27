import { z } from 'zod';

export interface BaseAIOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  maxRetries?: number;
  operationName?: string;
}

export interface GenerateTextOptions extends BaseAIOptions {
  fallback?: () => Promise<string> | string;
}

export interface AITextResult {
  text: string;
  model: string;
  latencyMs: number;
  isFallback: boolean;
}

export interface GenerateStructuredOptions<T> extends BaseAIOptions {
  /**
   * Expected Zod schema for runtime response validation and type inference.
   */
  schema: z.ZodType<T>;
  /**
   * Optional provider-level JSON schema (e.g. from @google/genai Type)
   * to guide the model directly during generation.
   */
  responseSchema?: Record<string, unknown>;
  /**
   * Optional fallback factory invoked if the provider call, parsing, or validation fails.
   */
  fallback?: () => Promise<T> | T;
}

export interface AIStructuredResult<T> {
  data: T;
  rawText: string;
  model: string;
  latencyMs: number;
  isFallback: boolean;
}

/**
 * Standard AI Provider interface decoupling services from provider-specific SDK logic.
 */
export interface IAIProvider {
  /**
   * Generates freeform text.
   */
  generateText(options: GenerateTextOptions): Promise<AITextResult>;

  /**
   * Generates structured output validated against a Zod schema.
   */
  generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<AIStructuredResult<T>>;

  /**
   * Checks whether the underlying provider credentials (e.g. GEMINI_API_KEY) are configured and available.
   */
  isAvailable(): boolean;

  /**
   * Returns the provider identifier name (e.g. 'gemini', 'mock').
   */
  getProviderName(): string;
}
