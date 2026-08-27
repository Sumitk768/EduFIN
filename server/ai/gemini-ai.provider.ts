import { GoogleGenAI } from '@google/genai';
import {
  IAIProvider,
  GenerateTextOptions,
  GenerateStructuredOptions,
  AITextResult,
  AIStructuredResult,
} from './ai-provider.interface';
import { getGeminiClient, hasGeminiApiKey } from './gemini.client';
import { AIError, AIErrorCategory } from './ai.errors';
import { safeJsonParse } from './json-parser.util';
import { recordAITelemetry } from './ai-telemetry.util';
import { config } from '../config/env';
import { logger } from '../utils/logger.util';

export class GeminiAIProvider implements IAIProvider {
  private defaultModel: string;
  private defaultTimeoutMs: number;
  private defaultMaxRetries: number;

  constructor(options?: {
    defaultModel?: string;
    defaultTimeoutMs?: number;
    defaultMaxRetries?: number;
  }) {
    this.defaultModel = options?.defaultModel || config.GEMINI_MODEL || 'gemini-3.7-flash';
    this.defaultTimeoutMs = options?.defaultTimeoutMs || config.AI_REQUEST_TIMEOUT_MS || 15000;
    this.defaultMaxRetries = options?.defaultMaxRetries ?? config.AI_MAX_RETRIES ?? 2;
  }

  getProviderName(): string {
    return 'gemini';
  }

  isAvailable(): boolean {
    return hasGeminiApiKey();
  }

  /**
   * Generates freeform text using Gemini models with timeout, retry, and fallback.
   */
  async generateText(options: GenerateTextOptions): Promise<AITextResult> {
    const startTime = Date.now();
    const operation = options.operationName || 'generateText';
    const model = options.model || this.defaultModel;
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries;

    if (!this.isAvailable()) {
      if (options.fallback) {
        const fallbackText = await options.fallback();
        const latencyMs = Date.now() - startTime;
        recordAITelemetry({
          operation,
          model,
          latencyMs,
          success: true,
          fallbackUsed: true,
        });
        return {
          text: fallbackText,
          model: 'fallback',
          latencyMs,
          isFallback: true,
        };
      }

      const authError = new AIError({
        message: 'GEMINI_API_KEY is not configured and no fallback was provided.',
        category: AIErrorCategory.AUTH_ERROR,
      });
      recordAITelemetry({
        operation,
        model,
        latencyMs: Date.now() - startTime,
        success: false,
        errorCategory: AIErrorCategory.AUTH_ERROR,
        errorMessage: authError.message,
      });
      throw authError;
    }

    const client = getGeminiClient();
    if (!client) {
      throw new AIError({
        message: 'Failed to obtain initialized Gemini client instance.',
        category: AIErrorCategory.AUTH_ERROR,
      });
    }

    let attempt = 0;
    let lastError: AIError | null = null;

    while (attempt <= maxRetries) {
      try {
        const rawResponse = await this.executeWithTimeout(
          client.models.generateContent({
            model,
            contents: options.prompt,
            config: {
              ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
              ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
            },
          }),
          timeoutMs
        );

        const text = rawResponse?.text?.trim() || '';
        const latencyMs = Date.now() - startTime;

        recordAITelemetry({
          operation,
          model,
          latencyMs,
          success: true,
          retryCount: attempt,
          promptLength: options.prompt.length,
          responseLength: text.length,
        });

        return {
          text,
          model,
          latencyMs,
          isFallback: false,
        };
      } catch (err: any) {
        lastError = AIError.from(err);
        attempt++;

        if (attempt <= maxRetries && lastError.isRetryable) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          logger.warn(`[GeminiAIProvider] ${operation} failed (${lastError.category}), retrying attempt ${attempt}/${maxRetries} in ${backoffDelay}ms...`);
          await this.delay(backoffDelay);
        } else {
          break;
        }
      }
    }

    // If we exhausted retries or got a non-retryable error, check for fallback
    if (options.fallback) {
      logger.warn(`[GeminiAIProvider] ${operation} failed permanently, invoking configured fallback handler.`);
      const fallbackText = await options.fallback();
      const latencyMs = Date.now() - startTime;

      recordAITelemetry({
        operation,
        model,
        latencyMs,
        success: true,
        fallbackUsed: true,
        errorCategory: lastError?.category,
        errorMessage: lastError?.message,
      });

      return {
        text: fallbackText,
        model: 'fallback',
        latencyMs,
        isFallback: true,
      };
    }

    const finalError = lastError || new AIError({
      message: 'Unknown failure during Gemini request.',
      category: AIErrorCategory.UNKNOWN,
    });

    recordAITelemetry({
      operation,
      model,
      latencyMs: Date.now() - startTime,
      success: false,
      errorCategory: finalError.category,
      errorMessage: finalError.message,
      retryCount: attempt - 1,
    });

    throw finalError;
  }

  /**
   * Generates structured output validated against a Zod schema.
   */
  async generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<AIStructuredResult<T>> {
    const startTime = Date.now();
    const operation = options.operationName || 'generateStructured';
    const model = options.model || this.defaultModel;
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries;

    if (!this.isAvailable()) {
      if (options.fallback) {
        const fallbackData = await options.fallback();
        // Validate fallback data against schema as well to guarantee contract integrity
        const validatedFallback = options.schema.parse(fallbackData);
        const latencyMs = Date.now() - startTime;

        recordAITelemetry({
          operation,
          model,
          latencyMs,
          success: true,
          fallbackUsed: true,
        });

        return {
          data: validatedFallback,
          rawText: JSON.stringify(validatedFallback),
          model: 'fallback',
          latencyMs,
          isFallback: true,
        };
      }

      const authError = new AIError({
        message: 'GEMINI_API_KEY is not configured and no fallback was provided for structured request.',
        category: AIErrorCategory.AUTH_ERROR,
      });
      recordAITelemetry({
        operation,
        model,
        latencyMs: Date.now() - startTime,
        success: false,
        errorCategory: AIErrorCategory.AUTH_ERROR,
        errorMessage: authError.message,
      });
      throw authError;
    }

    const client = getGeminiClient();
    if (!client) {
      throw new AIError({
        message: 'Failed to obtain initialized Gemini client instance.',
        category: AIErrorCategory.AUTH_ERROR,
      });
    }

    let attempt = 0;
    let lastError: AIError | null = null;

    while (attempt <= maxRetries) {
      try {
        const rawResponse = await this.executeWithTimeout(
          client.models.generateContent({
            model,
            contents: options.prompt,
            config: {
              ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
              ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
              responseMimeType: 'application/json',
              ...(options.responseSchema ? { responseSchema: options.responseSchema as any } : {}),
            },
          }),
          timeoutMs
        );

        const rawText = rawResponse?.text;
        if (!rawText || rawText.trim().length === 0) {
          throw new AIError({
            message: 'Empty response payload received from Gemini model.',
            category: AIErrorCategory.MALFORMED_OUTPUT,
            isRetryable: true,
          });
        }

        // 1. Safe JSON extraction & parsing
        const parsedJson = safeJsonParse<unknown>(rawText);

        // 2. Runtime Zod validation
        const validationResult = options.schema.safeParse(parsedJson);
        if (!validationResult.success) {
          const zodErrors = validationResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
          throw new AIError({
            message: `AI structured response failed Zod schema validation: ${zodErrors}`,
            category: AIErrorCategory.VALIDATION_FAILED,
            isRetryable: false,
            details: { zodIssues: validationResult.error.issues },
          });
        }

        const latencyMs = Date.now() - startTime;

        recordAITelemetry({
          operation,
          model,
          latencyMs,
          success: true,
          retryCount: attempt,
          promptLength: options.prompt.length,
          responseLength: rawText.length,
        });

        return {
          data: validationResult.data,
          rawText,
          model,
          latencyMs,
          isFallback: false,
        };
      } catch (err: any) {
        lastError = AIError.from(err);
        attempt++;

        if (attempt <= maxRetries && lastError.isRetryable) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          logger.warn(`[GeminiAIProvider] ${operation} failed (${lastError.category}), retrying attempt ${attempt}/${maxRetries} in ${backoffDelay}ms...`);
          await this.delay(backoffDelay);
        } else {
          break;
        }
      }
    }

    // If all attempts failed or error was fatal, check for fallback
    if (options.fallback) {
      logger.warn(`[GeminiAIProvider] ${operation} failed, falling back to deterministic handler. Reason: ${lastError?.message}`);
      const fallbackData = await options.fallback();
      const validatedFallback = options.schema.parse(fallbackData);
      const latencyMs = Date.now() - startTime;

      recordAITelemetry({
        operation,
        model,
        latencyMs,
        success: true,
        fallbackUsed: true,
        errorCategory: lastError?.category,
        errorMessage: lastError?.message,
      });

      return {
        data: validatedFallback,
        rawText: JSON.stringify(validatedFallback),
        model: 'fallback',
        latencyMs,
        isFallback: true,
      };
    }

    const finalError = lastError || new AIError({
      message: 'Unknown failure during structured AI request.',
      category: AIErrorCategory.UNKNOWN,
    });

    recordAITelemetry({
      operation,
      model,
      latencyMs: Date.now() - startTime,
      success: false,
      errorCategory: finalError.category,
      errorMessage: finalError.message,
      retryCount: attempt - 1,
    });

    throw finalError;
  }

  private executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new AIError({
            message: `AI request exceeded execution timeout threshold of ${timeoutMs}ms`,
            category: AIErrorCategory.TIMEOUT,
            isRetryable: true,
          })
        );
      }, timeoutMs);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timer);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const geminiAIProvider = new GeminiAIProvider();
