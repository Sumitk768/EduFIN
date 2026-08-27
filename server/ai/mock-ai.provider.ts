import {
  IAIProvider,
  GenerateTextOptions,
  GenerateStructuredOptions,
  AITextResult,
  AIStructuredResult,
} from './ai-provider.interface';
import { AIError, AIErrorCategory } from './ai.errors';

export class MockAIProvider implements IAIProvider {
  private available = true;
  private providerName = 'mock';
  public callHistory: {
    type: 'text' | 'structured';
    options: any;
    timestamp: number;
  }[] = [];

  private queuedTextResponses: (string | Error)[] = [];
  private queuedStructuredResponses: (any | Error)[] = [];

  constructor(options?: { available?: boolean; providerName?: string }) {
    if (options?.available !== undefined) this.available = options.available;
    if (options?.providerName) this.providerName = options.providerName;
  }

  getProviderName(): string {
    return this.providerName;
  }

  isAvailable(): boolean {
    return this.available;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  queueTextResponse(response: string | Error): void {
    this.queuedTextResponses.push(response);
  }

  queueStructuredResponse(response: any | Error): void {
    this.queuedStructuredResponses.push(response);
  }

  reset(): void {
    this.callHistory = [];
    this.queuedTextResponses = [];
    this.queuedStructuredResponses = [];
    this.available = true;
  }

  async generateText(options: GenerateTextOptions): Promise<AITextResult> {
    this.callHistory.push({
      type: 'text',
      options,
      timestamp: Date.now(),
    });

    if (!this.available) {
      if (options.fallback) {
        const text = await options.fallback();
        return { text, model: 'fallback', latencyMs: 5, isFallback: true };
      }
      throw new AIError({
        message: 'Mock AI provider marked as unavailable and no fallback provided.',
        category: AIErrorCategory.AUTH_ERROR,
      });
    }

    if (this.queuedTextResponses.length > 0) {
      const next = this.queuedTextResponses.shift()!;
      if (next instanceof Error) {
        if (options.fallback) {
          const text = await options.fallback();
          return { text, model: 'fallback', latencyMs: 5, isFallback: true };
        }
        throw AIError.from(next);
      }
      return {
        text: next,
        model: options.model || 'mock-model',
        latencyMs: 10,
        isFallback: false,
      };
    }

    // Default mock behavior
    return {
      text: `Mock AI response to: ${options.prompt.slice(0, 50)}...`,
      model: options.model || 'mock-model',
      latencyMs: 10,
      isFallback: false,
    };
  }

  async generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<AIStructuredResult<T>> {
    this.callHistory.push({
      type: 'structured',
      options,
      timestamp: Date.now(),
    });

    if (!this.available) {
      if (options.fallback) {
        const fallbackData = await options.fallback();
        const data = options.schema.parse(fallbackData);
        return {
          data,
          rawText: JSON.stringify(data),
          model: 'fallback',
          latencyMs: 5,
          isFallback: true,
        };
      }
      throw new AIError({
        message: 'Mock AI provider marked as unavailable and no fallback provided.',
        category: AIErrorCategory.AUTH_ERROR,
      });
    }

    if (this.queuedStructuredResponses.length > 0) {
      const next = this.queuedStructuredResponses.shift()!;
      if (next instanceof Error) {
        if (options.fallback) {
          const fallbackData = await options.fallback();
          const data = options.schema.parse(fallbackData);
          return {
            data,
            rawText: JSON.stringify(data),
            model: 'fallback',
            latencyMs: 5,
            isFallback: true,
          };
        }
        throw AIError.from(next);
      }

      // If string, parse and validate
      let parsed = next;
      if (typeof next === 'string') {
        try {
          parsed = JSON.parse(next);
        } catch (e) {
          if (options.fallback) {
            const fallbackData = await options.fallback();
            const data = options.schema.parse(fallbackData);
            return {
              data,
              rawText: JSON.stringify(data),
              model: 'fallback',
              latencyMs: 5,
              isFallback: true,
            };
          }
          throw new AIError({
            message: `Mock AI response is not valid JSON string`,
            category: AIErrorCategory.MALFORMED_OUTPUT,
          });
        }
      }

      const validated = options.schema.safeParse(parsed);
      if (!validated.success) {
        if (options.fallback) {
          const fallbackData = await options.fallback();
          const data = options.schema.parse(fallbackData);
          return {
            data,
            rawText: JSON.stringify(data),
            model: 'fallback',
            latencyMs: 5,
            isFallback: true,
          };
        }
        throw new AIError({
          message: `Mock AI response failed schema validation: ${validated.error.message}`,
          category: AIErrorCategory.VALIDATION_FAILED,
        });
      }

      return {
        data: validated.data,
        rawText: typeof next === 'string' ? next : JSON.stringify(next),
        model: options.model || 'mock-model',
        latencyMs: 10,
        isFallback: false,
      };
    }

    // If no queue, attempt fallback if available or throw
    if (options.fallback) {
      const fallbackData = await options.fallback();
      const data = options.schema.parse(fallbackData);
      return {
        data,
        rawText: JSON.stringify(data),
        model: 'fallback',
        latencyMs: 5,
        isFallback: true,
      };
    }

    throw new AIError({
      message: 'No queued mock response and no fallback handler defined.',
      category: AIErrorCategory.UNKNOWN,
    });
  }
}
