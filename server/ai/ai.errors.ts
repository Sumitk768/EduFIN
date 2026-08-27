/**
 * Error classifications and structured error representations for the EduFIN AI Layer.
 */

export enum AIErrorCategory {
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MALFORMED_OUTPUT = 'MALFORMED_OUTPUT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  CONTENT_FILTER = 'CONTENT_FILTER',
  UNKNOWN = 'UNKNOWN',
}

export class AIError extends Error {
  public readonly category: AIErrorCategory;
  public readonly isRetryable: boolean;
  public readonly originalError?: unknown;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    message: string;
    category: AIErrorCategory;
    isRetryable?: boolean;
    originalError?: unknown;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'AIError';
    this.category = params.category;
    this.isRetryable = params.isRetryable ?? AIError.determineRetryable(params.category);
    this.originalError = params.originalError;
    this.details = params.details;

    Object.setPrototypeOf(this, AIError.prototype);
  }

  private static determineRetryable(category: AIErrorCategory): boolean {
    switch (category) {
      case AIErrorCategory.RATE_LIMIT:
      case AIErrorCategory.TIMEOUT:
      case AIErrorCategory.PROVIDER_UNAVAILABLE:
        return true;
      case AIErrorCategory.AUTH_ERROR:
      case AIErrorCategory.INVALID_REQUEST:
      case AIErrorCategory.CONTENT_FILTER:
      case AIErrorCategory.MALFORMED_OUTPUT:
      case AIErrorCategory.VALIDATION_FAILED:
      case AIErrorCategory.UNKNOWN:
      default:
        return false;
    }
  }

  /**
   * Classify any thrown unknown error from the provider into a typed AIError.
   */
  public static from(err: unknown): AIError {
    if (err instanceof AIError) {
      return err;
    }

    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();

    if (lower.includes('api_key') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('401') || lower.includes('403')) {
      return new AIError({
        message: 'AI Provider Authentication failed. Check GEMINI_API_KEY configuration.',
        category: AIErrorCategory.AUTH_ERROR,
        isRetryable: false,
        originalError: err,
      });
    }

    if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429') || lower.includes('resource_exhausted')) {
      return new AIError({
        message: 'AI Provider rate limit or quota exceeded.',
        category: AIErrorCategory.RATE_LIMIT,
        isRetryable: true,
        originalError: err,
      });
    }

    if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
      return new AIError({
        message: 'AI request timed out.',
        category: AIErrorCategory.TIMEOUT,
        isRetryable: true,
        originalError: err,
      });
    }

    if (lower.includes('safety') || lower.includes('blocked') || lower.includes('filter')) {
      return new AIError({
        message: 'AI response was filtered by provider safety settings.',
        category: AIErrorCategory.CONTENT_FILTER,
        isRetryable: false,
        originalError: err,
      });
    }

    if (lower.includes('invalid_argument') || lower.includes('invalid argument') || lower.includes('bad request') || lower.includes('400')) {
      return new AIError({
        message: 'Invalid argument or request payload provided to AI provider.',
        category: AIErrorCategory.INVALID_REQUEST,
        isRetryable: false,
        originalError: err,
      });
    }

    if (lower.includes('503') || lower.includes('502') || lower.includes('500') || lower.includes('unavailable') || lower.includes('overloaded')) {
      return new AIError({
        message: 'AI Provider is temporarily unavailable or overloaded.',
        category: AIErrorCategory.PROVIDER_UNAVAILABLE,
        isRetryable: true,
        originalError: err,
      });
    }

    return new AIError({
      message: message || 'Unknown AI execution error',
      category: AIErrorCategory.UNKNOWN,
      isRetryable: false,
      originalError: err,
    });
  }
}
